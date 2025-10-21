#!/bin/bash

# Setup Neon Database + AWS S3
# Best value combination: FREE database + cheap storage
# Total cost: $1-5/month

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[ℹ]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_header "Neon Database + AWS S3 Setup"
echo
print_info "This setup combines:"
echo "  ✓ Neon PostgreSQL (FREE - 0.5GB)"
echo "  ✓ AWS S3 (Cheap - ~\$1-2/month)"
echo "  ✓ Total cost: ~\$1-5/month"
echo

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_info "AWS CLI not found. Install it:"
    echo "  brew install awscli  # macOS"
    echo "  Visit: https://aws.amazon.com/cli/"
    exit 1
fi

# Check jq
if ! command -v jq &> /dev/null; then
    print_info "Installing jq..."
    brew install jq 2>/dev/null || echo "Please install jq: brew install jq"
fi

# ============================================
# STEP 1: NEON DATABASE SETUP
# ============================================

print_header "Step 1: Neon Database Setup"
echo
print_info "Creating FREE Neon database..."
echo
echo "1. Open this URL: https://neon.tech"
echo "2. Click 'Sign Up'"
echo "3. Sign in with GitHub (easiest)"
echo "4. Click 'Create Project'"
echo "   - Name: patient-portal"
echo "   - Region: US East (Ohio) or closest"
echo "5. Click the project to see connection details"
echo

read -p "Press ENTER when you've created your Neon project..."

echo
print_info "Get your connection string:"
echo "1. In Neon dashboard, find 'Connection Details'"
echo "2. Make sure 'Pooled connection' is UNCHECKED"
echo "3. Copy the connection string"
echo
echo "Example: postgresql://user:pass@ep-cool-name.us-east-2.aws.neon.tech/neondb"
echo

read -p "Paste your Neon connection string: " NEON_DATABASE_URL

if [ -z "$NEON_DATABASE_URL" ]; then
    print_info "No connection string provided. Skipping..."
    NEON_DATABASE_URL="postgresql://CHANGE_ME@ep-xxx.neon.tech/neondb"
else
    print_status "Connection string saved!"
fi

# ============================================
# STEP 2: AWS S3 SETUP
# ============================================

echo
print_header "Step 2: AWS S3 Bucket Setup"
echo

# Get AWS account info
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "unknown")
print_status "AWS Account ID: $ACCOUNT_ID"

# Create unique bucket name
TIMESTAMP=$(date +%s)
BUCKET_NAME="patient-portal-files-${TIMESTAMP}"
AWS_REGION="us-east-1"

print_info "Creating S3 bucket: $BUCKET_NAME"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION

print_status "S3 bucket created"

# Enable versioning
print_info "Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled \
  --region $AWS_REGION

# Enable encryption
print_info "Enabling encryption..."
aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --region $AWS_REGION

# Block public access
print_info "Blocking public access..."
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region $AWS_REGION

print_status "S3 bucket secured"

# ============================================
# STEP 3: IAM USER FOR S3
# ============================================

echo
print_header "Step 3: IAM User for S3 Access"
echo

IAM_USERNAME="patient-portal-s3"
POLICY_NAME="patient-portal-s3-policy"

print_info "Creating IAM user: $IAM_USERNAME"

# Create IAM user
aws iam create-user --user-name $IAM_USERNAME 2>/dev/null || print_info "User already exists"

# Create policy document
cat > /tmp/s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}",
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ]
    }
  ]
}
EOF

# Create policy
POLICY_ARN=$(aws iam create-policy \
  --policy-name $POLICY_NAME \
  --policy-document file:///tmp/s3-policy.json \
  --query 'Policy.Arn' \
  --output text 2>/dev/null || \
  aws iam list-policies \
    --query "Policies[?PolicyName=='${POLICY_NAME}'].Arn" \
    --output text)

print_status "Policy created: $POLICY_ARN"

# Attach policy to user
aws iam attach-user-policy \
  --user-name $IAM_USERNAME \
  --policy-arn $POLICY_ARN 2>/dev/null || true

# Create access keys
print_info "Creating access keys..."
ACCESS_KEYS=$(aws iam create-access-key \
  --user-name $IAM_USERNAME \
  --query 'AccessKey.{AccessKeyId:AccessKeyId,SecretAccessKey:SecretAccessKey}' \
  --output json)

AWS_ACCESS_KEY_ID=$(echo $ACCESS_KEYS | jq -r '.AccessKeyId')
AWS_SECRET_ACCESS_KEY=$(echo $ACCESS_KEYS | jq -r '.SecretAccessKey')

print_status "Access keys created"

# ============================================
# STEP 4: GENERATE CONFIGURATION
# ============================================

echo
print_header "Step 4: Generating Configuration Files"
echo

# Generate JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Create backend .env
cat > ../backend/.env.production <<EOF
# Neon + S3 Setup - Generated $(date)
NODE_ENV=production
PORT=5000

# Database (Neon - FREE)
DATABASE_URL=${NEON_DATABASE_URL}

# JWT Secrets
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 (~\$1-2/month)
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
S3_BUCKET_NAME=${BUCKET_NAME}

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5
EOF

print_status "Created backend/.env.production"

# Create frontend .env
cat > ../frontend/.env.production <<EOF
# Neon + S3 Setup - Generated $(date)
NEXT_PUBLIC_API_URL=http://localhost:5000
EOF

print_status "Created frontend/.env.production"

# ============================================
# STEP 5: TEST DATABASE CONNECTION
# ============================================

echo
print_header "Step 5: Testing Database Connection"
echo

if [[ "$NEON_DATABASE_URL" != "postgresql://CHANGE_ME"* ]]; then
    print_info "Testing Neon connection..."
    cd ../backend

    # Install dependencies quietly
    npm install > /dev/null 2>&1

    # Export database URL
    export DATABASE_URL="$NEON_DATABASE_URL"

    # Generate Prisma client
    npx prisma generate > /dev/null 2>&1

    # Test connection
    if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        print_status "✓ Successfully connected to Neon database!"
    else
        print_info "⚠️  Could not connect to database. Check your connection string."
    fi

    cd ../deploy-scripts
else
    print_info "Skipping connection test (no valid connection string)"
fi

# ============================================
# STEP 6: DEPLOYMENT SUMMARY
# ============================================

echo
print_header "Setup Complete!"
echo

# Calculate estimated cost
S3_COST=1
TOTAL_AWS_COST=$S3_COST

cat > neon-s3-deployment-summary.txt <<EOF
========================================
Neon + AWS S3 Deployment Summary
========================================
Generated: $(date)

💰 MONTHLY COST ESTIMATE:
- Neon Database:        \$0/month (FREE - 0.5GB)
- AWS S3 Storage:       ~\$1-2/month (5-10GB)
- Backups/Transfer:     ~\$0-1/month
──────────────────────────────────────
AWS Total:              ~\$1-3/month

+ Backend Hosting:      \$0-7/month (see options below)
+ Frontend:             \$0/month (Vercel - FREE)
══════════════════════════════════════
GRAND TOTAL:            ~\$1-10/month

vs AWS RDS quote:       \$335/month
SAVINGS:                ~\$325/month (97%!)

========================================
DATABASE (NEON - FREE)
========================================

Connection String:
${NEON_DATABASE_URL}

Dashboard: https://console.neon.tech

Free Tier Limits:
- Storage: 0.5GB (enough for 500+ patients)
- Compute: Unlimited (auto-pause after 5min idle)
- Always FREE

Upgrade Path:
- When >0.5GB: \$19/month (Launch plan - 10GB)

========================================
FILE STORAGE (AWS S3)
========================================

Bucket Name: ${BUCKET_NAME}
Region: ${AWS_REGION}

AWS Credentials:
- Access Key ID:     ${AWS_ACCESS_KEY_ID}
- Secret Access Key: ${AWS_SECRET_ACCESS_KEY}
- IAM User:          ${IAM_USERNAME}

S3 Dashboard:
https://s3.console.aws.amazon.com/s3/buckets/${BUCKET_NAME}

Cost Estimate:
- Storage: \$0.023/GB/month
- 10GB = ~\$0.23/month
- 50GB = ~\$1.15/month
- Requests: ~\$0.01/month

Features Enabled:
✓ Versioning (can restore old files)
✓ Encryption (AES256)
✓ Private bucket (presigned URLs only)
✓ Secure access (IAM user)

========================================
NEXT STEPS
========================================

1. Run Database Migrations
   ──────────────────────────────────
   cd backend
   export DATABASE_URL="${NEON_DATABASE_URL}"
   npx prisma migrate deploy

   # Create admin user
   npx ts-node -e "
   import { PrismaClient } from '@prisma/client';
   import bcrypt from 'bcryptjs';
   const prisma = new PrismaClient();
   (async () => {
     const hash = await bcrypt.hash('Admin@123', 12);
     await prisma.user.create({
       data: {
         email: 'admin@example.com',
         passwordHash: hash,
         firstName: 'Admin',
         lastName: 'User',
         role: 'ADMIN',
         isActive: true
       }
     });
   })().finally(() => prisma.\$disconnect());
   "

2. Deploy Backend (Choose One)
   ──────────────────────────────────

   Option A: Railway (\$5-10/month) - EASIEST ⭐
   ───────────────────────────────────────────
   1. Visit: https://railway.app
   2. Sign up with GitHub
   3. New Project → Deploy from GitHub
   4. Select: patient_protol repository
   5. Add environment variables:
      (Copy ALL from backend/.env.production)

   Cost: \$5-10/month
   Total with Neon+S3: ~\$6-13/month

   Option B: Fly.io (FREE tier) - CHEAPEST
   ───────────────────────────────────────
   1. Install: curl -L https://fly.io/install.sh | sh
   2. cd backend
   3. fly launch --no-deploy
   4. fly secrets set DATABASE_URL="${NEON_DATABASE_URL}"
   5. fly secrets set AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
   6. fly secrets set AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
   7. fly secrets set S3_BUCKET_NAME="${BUCKET_NAME}"
   8. fly secrets set JWT_SECRET="${JWT_SECRET}"
   9. fly secrets set JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
   10. fly deploy

   Cost: \$0/month (free tier)
   Total with Neon+S3: ~\$1-3/month

   Option C: Render (\$7/month) - RELIABLE
   ───────────────────────────────────────
   1. Visit: https://render.com
   2. New Web Service
   3. Connect GitHub repository
   4. Add environment variables from .env.production
   5. Deploy

   Cost: \$7/month
   Total with Neon+S3: ~\$8-10/month

3. Deploy Frontend (FREE)
   ──────────────────────────────────
   cd frontend
   npm install -g vercel
   vercel

   In Vercel dashboard:
   - Set NEXT_PUBLIC_API_URL to your backend URL
   - Example: https://patient-portal.fly.dev

   Cost: \$0/month

4. Test Your App
   ──────────────────────────────────
   - Backend health: https://your-backend-url/health
   - Frontend: https://your-app.vercel.app
   - Login with: admin@example.com / Admin@123
   - Upload a test audiogram file

========================================
MONITORING & MANAGEMENT
========================================

Neon Database:
- Dashboard: https://console.neon.tech
- Monitor storage usage
- Free up to 0.5GB

AWS S3:
- Console: https://console.aws.amazon.com/s3
- Monitor storage and costs
- Set up billing alerts

Billing Alert (RECOMMENDED):
aws budgets create-budget --account-id ${ACCOUNT_ID} \\
  --budget '{
    "BudgetName": "patient-portal-budget",
    "BudgetLimit": {"Amount": "10", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'

========================================
COST COMPARISON
========================================

Your Setup (Neon + S3 + Fly.io):
- Database:      \$0/month
- Storage:       \$2/month
- Backend:       \$0/month
- Frontend:      \$0/month
────────────────────────────
Total:           ~\$2/month ✅

AWS RDS Quote:
- Database:      \$280/month
- Storage:       \$55/month
────────────────────────────
Total:           \$335/month ❌

YOU SAVE:        \$333/month (99.4%)
Per year:        \$3,996/year saved!

========================================
CLEANUP (IF NEEDED)
========================================

To delete everything:

# Delete S3 bucket
aws s3 rb s3://${BUCKET_NAME} --force

# Delete IAM user
aws iam detach-user-policy \\
  --user-name ${IAM_USERNAME} \\
  --policy-arn ${POLICY_ARN}
aws iam delete-access-key \\
  --user-name ${IAM_USERNAME} \\
  --access-key-id ${AWS_ACCESS_KEY_ID}
aws iam delete-user --user-name ${IAM_USERNAME}
aws iam delete-policy --policy-arn ${POLICY_ARN}

# Delete Neon database
# Go to: https://console.neon.tech
# Delete project from dashboard

========================================
SUPPORT & RESOURCES
========================================

Neon Docs:     https://neon.tech/docs
AWS S3 Docs:   https://docs.aws.amazon.com/s3
Railway:       https://docs.railway.app
Fly.io:        https://fly.io/docs
Vercel:        https://vercel.com/docs

Project Docs:
- Full guide:       AWS_DEPLOYMENT_GUIDE.md
- Cost guide:       COST_OPTIMIZATION_GUIDE.md
- Easy databases:   EASY_DATABASE_SETUP.md
- API reference:    API.md

========================================
EOF

print_status "Deployment summary saved to: neon-s3-deployment-summary.txt"
echo

# Display summary
cat << EOF

${GREEN}✅ Setup Complete!${NC}

${BLUE}What you have:${NC}
  ✓ Neon PostgreSQL database (FREE)
  ✓ AWS S3 bucket for files (~\$1-2/month)
  ✓ Configuration files ready
  ✓ IAM credentials created

${BLUE}Your costs:${NC}
  • Neon:     \$0/month (FREE forever)
  • S3:       ~\$1-2/month (storage)
  • Backend:  \$0-7/month (your choice)
  • Frontend: \$0/month (Vercel)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Total:    ~\$1-10/month

  ${GREEN}vs \$335/month AWS quote = 97% savings!${NC}

${BLUE}Next steps:${NC}
  1. Run migrations:        cd ../backend && npx prisma migrate deploy
  2. Deploy backend:        Railway/Fly.io/Render (see summary)
  3. Deploy frontend:       cd ../frontend && vercel

${YELLOW}📄 Full details in: neon-s3-deployment-summary.txt${NC}

${YELLOW}⚠️  IMPORTANT: Save the summary file, then delete it (contains secrets)${NC}

EOF

print_info "Configuration saved to:"
echo "  • backend/.env.production"
echo "  • frontend/.env.production"
echo "  • neon-s3-deployment-summary.txt"

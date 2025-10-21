#!/bin/bash

# Coolify Setup Helper Script
# Giúp kiểm tra và chuẩn bị môi trường trước khi deploy lên Coolify

set -e

echo "🚀 Coolify Deployment Setup Helper"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if files exist
echo "📁 Checking required files..."

if [ -f "docker-compose.prod.yml" ]; then
    print_success "docker-compose.prod.yml exists"
else
    print_error "docker-compose.prod.yml not found!"
    exit 1
fi

if [ -f "backend/Dockerfile" ]; then
    print_success "backend/Dockerfile exists"
else
    print_error "backend/Dockerfile not found!"
    exit 1
fi

if [ -f "frontend/Dockerfile" ]; then
    print_success "frontend/Dockerfile exists"
else
    print_error "frontend/Dockerfile not found!"
    exit 1
fi

echo ""

# Generate secrets
echo "🔐 Generating secure secrets..."

JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24)

print_success "Secrets generated successfully"

echo ""
echo "📋 Copy these values to Coolify Environment Variables:"
echo "========================================================"
echo ""
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""
echo "⚠️  Save these values securely - you'll need them!"
echo ""

# Check Git repository
echo "🔍 Checking Git repository..."

if git rev-parse --git-dir > /dev/null 2>&1; then
    print_success "Git repository detected"
    
    CURRENT_BRANCH=$(git branch --show-current)
    print_success "Current branch: $CURRENT_BRANCH"
    
    if git diff-index --quiet HEAD --; then
        print_success "No uncommitted changes"
    else
        print_warning "You have uncommitted changes"
        echo "   Run: git add . && git commit -m 'prepare for coolify'"
    fi
    
    REMOTE_URL=$(git config --get remote.origin.url || echo "")
    if [ -n "$REMOTE_URL" ]; then
        print_success "Remote URL: $REMOTE_URL"
    else
        print_error "No remote repository configured"
        echo "   Run: git remote add origin <your-repo-url>"
    fi
else
    print_error "Not a Git repository!"
    echo "   Initialize with: git init && git add . && git commit -m 'initial commit'"
    exit 1
fi

echo ""

# Test local build (optional)
echo "🔨 Test Docker build locally? (optional)"
read -p "Run test build? This may take 5-10 minutes [y/N]: " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Building backend..."
    docker build -f backend/Dockerfile -t patient-portal-backend:test backend/
    print_success "Backend built successfully"
    
    echo "Building frontend..."
    docker build -f frontend/Dockerfile -t patient-portal-frontend:test frontend/
    print_success "Frontend built successfully"
    
    echo ""
    print_success "All images built successfully! Ready for Coolify deployment."
fi

echo ""

# Domain check
echo "🌐 Domain Configuration Checklist"
echo "=================================="
echo ""
echo "Before deploying to Coolify, ensure:"
echo "  1. You have a domain name (e.g., example.com)"
echo "  2. DNS A records point to your Coolify server:"
echo "     - example.com → <coolify-server-ip>"
echo "     - api.example.com → <coolify-server-ip>"
echo "     - www.example.com → <coolify-server-ip>"
echo "  3. Wait 5-10 minutes for DNS propagation"
echo ""

read -p "Enter your domain (e.g., example.com): " DOMAIN

if [ -n "$DOMAIN" ]; then
    echo ""
    echo "Checking DNS for $DOMAIN..."
    
    if command -v dig &> /dev/null; then
        DOMAIN_IP=$(dig +short "$DOMAIN" | head -n1)
        API_IP=$(dig +short "api.$DOMAIN" | head -n1)
        
        if [ -n "$DOMAIN_IP" ]; then
            print_success "$DOMAIN resolves to $DOMAIN_IP"
        else
            print_warning "$DOMAIN does not resolve yet"
        fi
        
        if [ -n "$API_IP" ]; then
            print_success "api.$DOMAIN resolves to $API_IP"
        else
            print_warning "api.$DOMAIN does not resolve yet"
        fi
    else
        print_warning "dig command not found, skipping DNS check"
    fi
    
    echo ""
    echo "📝 Use these domains in Coolify:"
    echo "  Frontend: $DOMAIN (and www.$DOMAIN)"
    echo "  Backend: api.$DOMAIN"
    echo ""
    echo "📝 Environment variables to set:"
    echo "  ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN"
    echo "  NEXT_PUBLIC_API_URL=https://api.$DOMAIN"
fi

echo ""

# AWS S3 Check
echo "☁️  AWS S3 Configuration"
echo "======================="
echo ""
read -p "Do you have AWS S3 configured? [y/N]: " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "You need to configure AWS S3 or MinIO for file storage"
    echo ""
    echo "Option 1: AWS S3 (Recommended for production)"
    echo "  1. Create S3 bucket in AWS Console"
    echo "  2. Create IAM user with S3 permissions"
    echo "  3. Get Access Key ID and Secret"
    echo ""
    echo "Option 2: MinIO (Self-hosted S3-compatible)"
    echo "  1. Add MinIO service in Coolify"
    echo "  2. Get credentials from MinIO Console"
    echo ""
fi

echo ""

# Summary
echo "✅ Pre-deployment Checklist"
echo "==========================="
echo ""
echo "Before deploying to Coolify, make sure you have:"
echo ""
echo "  [ ] Git repository pushed to GitHub/GitLab"
echo "  [ ] Domain configured and DNS pointing to Coolify"
echo "  [ ] AWS S3 bucket created (or MinIO ready)"
echo "  [ ] Secrets generated (shown above)"
echo "  [ ] docker-compose.prod.yml exists"
echo "  [ ] Backend and Frontend Dockerfiles exist"
echo ""
echo "Next steps:"
echo "  1. Login to Coolify Dashboard"
echo "  2. Create new Docker Compose resource"
echo "  3. Select your Git repository"
echo "  4. Choose docker-compose.prod.yml"
echo "  5. Add environment variables (use generated secrets above)"
echo "  6. Configure domains for frontend and backend"
echo "  7. Click Deploy!"
echo ""
echo "📚 For detailed instructions, see:"
echo "   - COOLIFY_QUICKSTART.md (quick 10-min guide)"
echo "   - COOLIFY_DEPLOYMENT.md (comprehensive guide)"
echo ""
print_success "Setup check complete! You're ready to deploy to Coolify 🎉"


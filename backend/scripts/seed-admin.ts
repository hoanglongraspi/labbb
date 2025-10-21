import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@123';

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      role: 'ADMIN',
      isActive: true,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User'
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true
    }
  });

  console.log('✅ Admin user ready');
  console.log(`📧 Email: ${admin.email}`);
  console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('Failed to seed admin user:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

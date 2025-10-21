-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'REQUEST_PASSWORD_RESET';
ALTER TYPE "AuditAction" ADD VALUE 'RESET_PASSWORD';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reset_token" TEXT,
ADD COLUMN     "reset_token_expiry" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_reset_token_idx" ON "users"("reset_token");

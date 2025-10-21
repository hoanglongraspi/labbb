-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_PREFERENCES';

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "interested_in_therapy" BOOLEAN NOT NULL DEFAULT false,
    "interested_in_consulting" BOOLEAN NOT NULL DEFAULT false,
    "interested_in_support_groups" BOOLEAN NOT NULL DEFAULT false,
    "interested_in_clinical_trials" BOOLEAN NOT NULL DEFAULT false,
    "interested_in_digital_tools" BOOLEAN NOT NULL DEFAULT false,
    "receive_email_updates" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

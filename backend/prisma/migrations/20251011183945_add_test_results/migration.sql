-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('BPPV', 'AUDIOMETRY', 'LOUDNESS', 'SPEECH_IN_NOISE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'UPLOAD_TEST_RESULT';
ALTER TYPE "AuditAction" ADD VALUE 'VIEW_TEST_RESULT';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_TEST_RESULT';

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "test_type" "TestType" NOT NULL,
    "test_date" TIMESTAMP(3) NOT NULL,
    "video_url" TEXT,
    "csv_url" TEXT,
    "questions_url" TEXT,
    "metadata" JSONB,
    "analysis" JSONB,
    "summary" TEXT,
    "evaluation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_results_test_id_key" ON "test_results"("test_id");

-- CreateIndex
CREATE INDEX "test_results_patient_id_idx" ON "test_results"("patient_id");

-- CreateIndex
CREATE INDEX "test_results_test_id_idx" ON "test_results"("test_id");

-- CreateIndex
CREATE INDEX "test_results_test_date_idx" ON "test_results"("test_date");

-- CreateIndex
CREATE INDEX "test_results_test_type_idx" ON "test_results"("test_type");

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

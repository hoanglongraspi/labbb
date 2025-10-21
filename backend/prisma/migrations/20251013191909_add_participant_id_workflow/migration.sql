-- AlterTable
ALTER TABLE "test_results" ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "assigned_by" TEXT,
ADD COLUMN     "participant_id" TEXT,
ALTER COLUMN "patient_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "test_results_participant_id_idx" ON "test_results"("participant_id");

-- CreateEnum
CREATE TYPE "ConditionCategory" AS ENUM ('GOOD_HEARING', 'HEARING_LOSS', 'TINNITUS', 'MISOPHONIA', 'HYPERACUSIS');

-- CreateEnum
CREATE TYPE "ConditionSeverity" AS ENUM ('NONE', 'MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PrimaryCondition" ADD VALUE 'MISOPHONIA';
ALTER TYPE "PrimaryCondition" ADD VALUE 'HYPERACUSIS';

-- AlterTable
ALTER TABLE "audiograms" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summary_generated_at" TIMESTAMP(3),
ADD COLUMN     "summary_generated_by" TEXT,
ADD COLUMN     "summary_prompt" TEXT;

-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN     "condition_category" "ConditionCategory",
ADD COLUMN     "condition_severity" "ConditionSeverity",
ADD COLUMN     "hearing_loss_severity" "ConditionSeverity" DEFAULT 'NONE',
ADD COLUMN     "hyperacusis_severity" "ConditionSeverity" DEFAULT 'NONE',
ADD COLUMN     "misophonia_severity" "ConditionSeverity" DEFAULT 'NONE',
ADD COLUMN     "tinnitus_severity" "ConditionSeverity" DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "user_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "audiograms_summary_generated_by_idx" ON "audiograms"("summary_generated_by");

-- AddForeignKey
ALTER TABLE "audiograms" ADD CONSTRAINT "audiograms_summary_generated_by_fkey" FOREIGN KEY ("summary_generated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

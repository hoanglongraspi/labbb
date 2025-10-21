-- AlterTable
ALTER TABLE "educational_content" ADD COLUMN     "pdf_file_name" TEXT,
ADD COLUMN     "pdf_url" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

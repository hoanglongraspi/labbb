-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PATIENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "PrimaryCondition" AS ENUM ('TINNITUS', 'HEARING_LOSS', 'BOTH', 'OTHER');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('INITIAL', 'FOLLOW_UP', 'ANNUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "EducationCategory" AS ENUM ('TINNITUS', 'HEARING_LOSS', 'PREVENTION', 'TREATMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'VIEW_PATIENT', 'CREATE_PATIENT', 'UPDATE_PATIENT', 'DELETE_PATIENT', 'UPLOAD_AUDIOGRAM', 'DOWNLOAD_AUDIOGRAM', 'DELETE_AUDIOGRAM', 'CREATE_EVALUATION', 'UPDATE_EVALUATION', 'DELETE_EVALUATION', 'CREATE_EDUCATION', 'UPDATE_EDUCATION', 'DELETE_EDUCATION', 'UPDATE_PROFILE', 'CHANGE_PASSWORD', 'CREATE_ACTIVATION_CODE', 'ACTIVATE_ACCOUNT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PATIENT',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" "Gender",
    "medical_record_number" TEXT NOT NULL,
    "primary_condition" "PrimaryCondition",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "evaluation_date" TIMESTAMP(3) NOT NULL,
    "evaluator_name" TEXT NOT NULL,
    "evaluation_type" "EvaluationType" NOT NULL,
    "results" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audiograms" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "evaluation_id" TEXT,
    "test_date" TIMESTAMP(3) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "left_ear_data" JSONB,
    "right_ear_data" JSONB,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audiograms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educational_content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "EducationCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educational_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_medical_record_number_key" ON "patients"("medical_record_number");

-- CreateIndex
CREATE INDEX "patients_user_id_idx" ON "patients"("user_id");

-- CreateIndex
CREATE INDEX "patients_medical_record_number_idx" ON "patients"("medical_record_number");

-- CreateIndex
CREATE INDEX "evaluations_patient_id_idx" ON "evaluations"("patient_id");

-- CreateIndex
CREATE INDEX "evaluations_evaluation_date_idx" ON "evaluations"("evaluation_date");

-- CreateIndex
CREATE INDEX "audiograms_patient_id_idx" ON "audiograms"("patient_id");

-- CreateIndex
CREATE INDEX "audiograms_evaluation_id_idx" ON "audiograms"("evaluation_id");

-- CreateIndex
CREATE INDEX "audiograms_test_date_idx" ON "audiograms"("test_date");

-- CreateIndex
CREATE UNIQUE INDEX "educational_content_slug_key" ON "educational_content"("slug");

-- CreateIndex
CREATE INDEX "educational_content_slug_idx" ON "educational_content"("slug");

-- CreateIndex
CREATE INDEX "educational_content_category_idx" ON "educational_content"("category");

-- CreateIndex
CREATE INDEX "educational_content_is_published_idx" ON "educational_content"("is_published");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "activation_codes_user_id_idx" ON "activation_codes"("user_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiograms" ADD CONSTRAINT "audiograms_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiograms" ADD CONSTRAINT "audiograms_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiograms" ADD CONSTRAINT "audiograms_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_content" ADD CONSTRAINT "educational_content_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

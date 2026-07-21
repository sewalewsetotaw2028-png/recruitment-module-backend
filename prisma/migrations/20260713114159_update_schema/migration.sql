/*
  Warnings:

  - The values [department_HEAD] on the enum `HiringMinuteSignatoryRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `certificates` on the `candidate_document` table. All the data in the column will be lost.
  - You are about to drop the column `experience_letters` on the `candidate_document` table. All the data in the column will be lost.
  - You are about to drop the column `national_id` on the `candidate_document` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "HiringMinuteSignatoryRole_new" AS ENUM ('HR_REPRESENTATIVE', 'HIRING_MANAGER', 'DEPARTMENT_HEAD', 'CEO');
ALTER TABLE "hiring_minute_signatory" ALTER COLUMN "role" TYPE "HiringMinuteSignatoryRole_new" USING ("role"::text::"HiringMinuteSignatoryRole_new");
ALTER TYPE "HiringMinuteSignatoryRole" RENAME TO "HiringMinuteSignatoryRole_old";
ALTER TYPE "HiringMinuteSignatoryRole_new" RENAME TO "HiringMinuteSignatoryRole";
DROP TYPE "public"."HiringMinuteSignatoryRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "recruitment_approval_history" DROP CONSTRAINT "approval_history_hm_fk";

-- DropForeignKey
ALTER TABLE "recruitment_approval_history" DROP CONSTRAINT "approval_history_rr_fk";

-- DropForeignKey
ALTER TABLE "recruitment_approval_history" DROP CONSTRAINT "approval_history_wp_fk";

-- AlterTable
ALTER TABLE "application" ADD COLUMN     "cover_letter_text" TEXT;

-- AlterTable
ALTER TABLE "candidate_document" DROP COLUMN "certificates",
DROP COLUMN "experience_letters",
DROP COLUMN "national_id",
ADD COLUMN     "id_documents" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "job_description" ADD COLUMN     "benefits" TEXT,
ADD COLUMN     "employment_terms" TEXT,
ADD COLUMN     "experience_required" TEXT,
ADD COLUMN     "skills" TEXT[];

-- AlterTable
ALTER TABLE "offer" ADD COLUMN     "allowances" JSONB,
ADD COLUMN     "employment_type" "EmploymentType",
ADD COLUMN     "template_id" TEXT;

-- AlterTable
ALTER TABLE "vacancy" ADD COLUMN     "previous_status" "VacancyStatus";

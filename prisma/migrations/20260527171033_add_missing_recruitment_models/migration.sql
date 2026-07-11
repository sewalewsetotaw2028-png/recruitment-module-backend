/*
  Warnings:

  - You are about to drop the column `location` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `replacementFor` on the `RecruitmentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `changesJson` on the `VersionHistory` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `Interview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position_name` to the `RecruitmentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `changes` to the `VersionHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Education" DROP CONSTRAINT "Education_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "Experience" DROP CONSTRAINT "Experience_candidateId_fkey";

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "totalMonths" INTEGER;

-- AlterTable
ALTER TABLE "Interview" DROP COLUMN "location",
ADD COLUMN     "googleMapsLocation" TEXT,
ADD COLUMN     "inOfficeEndTime" TIMESTAMP(3),
ADD COLUMN     "inOfficeStartTime" TIMESTAMP(3),
ADD COLUMN     "officeLocation" TEXT,
ADD COLUMN     "remoteEndTime" TIMESTAMP(3),
ADD COLUMN     "remoteStartTime" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "RecruitmentRequest" DROP COLUMN "replacementFor",
ADD COLUMN     "headcount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "position_name" TEXT NOT NULL,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "replacementForEmployeeId" TEXT,
ADD COLUMN     "replacementReason" TEXT;

-- AlterTable
ALTER TABLE "Vacancy" ADD COLUMN     "posted_at" TIMESTAMP(3),
ADD COLUMN     "posting_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "required_experience" INTEGER,
ADD COLUMN     "required_qualifications" TEXT,
ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "VersionHistory" DROP COLUMN "changesJson",
ADD COLUMN     "changedByuser_id" TEXT,
ADD COLUMN     "changes" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "InterviewPanel" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "panelMemberId" TEXT NOT NULL,

    CONSTRAINT "InterviewPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewEvaluation" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "comments" TEXT,
    "questionsJson" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningLog" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "screenedByuser_id" TEXT,
    "screenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortlistedCandidate" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "shortlistedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ShortlistedCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPanel_interviewId_panelMemberId_key" ON "InterviewPanel"("interviewId", "panelMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistedCandidate_vacancyId_candidateId_key" ON "ShortlistedCandidate"("vacancyId", "candidateId");

-- CreateIndex
CREATE INDEX "Education_candidateId_idx" ON "Education"("candidateId");

-- CreateIndex
CREATE INDEX "Experience_candidateId_idx" ON "Experience"("candidateId");

-- AddForeignKey
ALTER TABLE "InterviewPanel" ADD CONSTRAINT "InterviewPanel_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanel" ADD CONSTRAINT "InterviewPanel_panelMemberId_fkey" FOREIGN KEY ("panelMemberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningLog" ADD CONSTRAINT "ScreeningLog_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningLog" ADD CONSTRAINT "ScreeningLog_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistedCandidate" ADD CONSTRAINT "ShortlistedCandidate_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistedCandidate" ADD CONSTRAINT "ShortlistedCandidate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

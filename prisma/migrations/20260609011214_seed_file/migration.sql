/*
  Warnings:

  - You are about to drop the `ActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Application` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Candidate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CandidateDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomFieldValue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Education` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Experience` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Interview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InterviewEvaluation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InterviewPanel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganizationSubscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecruitmentRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RolePermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScreeningLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShortlistedCandidate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubscriptionPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vacancy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VersionHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkforcePlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkforcePlanItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "WorkforcePlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_HR_REVIEW', 'UNDER_CEO_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED_FOR_REVISION', 'CLOSED');

-- CreateEnum
CREATE TYPE "RecruitmentRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecruitmentRequestType" AS ENUM ('NEW_HEADCOUNT', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "RecruitmentClassification" AS ENUM ('PLANNED', 'UNPLANNED');

-- CreateEnum
CREATE TYPE "PlanningPeriod" AS ENUM ('ANNUAL', 'QUARTERLY', 'SEMI_ANNUAL', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PlanningQuarter" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PositionType" AS ENUM ('NEW', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('DRAFT', 'OPEN', 'PUBLISHED', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PostingStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'SUSPENDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_SCREENING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'UNDER_EVALUATION', 'SELECTED', 'OFFER_ISSUED', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'REJECTED', 'MOVED_TO_TALENT_ROSTER');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('SCREENING', 'SHORTLISTING', 'INTERVIEW', 'EVALUATION', 'OFFER', 'ONBOARDING', 'CLOSED');

-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('HIGH_SCHOOL', 'CERTIFICATE', 'DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('INTERNAL', 'EXTERNAL', 'BOTH');

-- CreateEnum
CREATE TYPE "ScreeningStatus" AS ENUM ('QUALIFIED', 'PARTIALLY_QUALIFIED', 'NOT_QUALIFIED', 'HOLD_FOR_REVIEW');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'EVALUATION_PENDING', 'FINALIZED');

-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('PHYSICAL', 'VIRTUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "EvaluationRecommendation" AS ENUM ('STRONGLY_RECOMMEND', 'RECOMMEND', 'HOLD', 'DO_NOT_RECOMMEND');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('IMMEDIATELY', 'TWO_WEEKS', 'ONE_MONTH', 'MORE_THAN_ONE_MONTH');

-- CreateEnum
CREATE TYPE "TalentRosterSourceStage" AS ENUM ('SCREENING', 'INTERVIEW', 'FINAL_SELECTION');

-- CreateEnum
CREATE TYPE "TalentRosterStatus" AS ENUM ('ACTIVE', 'PLACED', 'INACTIVE', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "HiringMinutePanelRecommendation" AS ENUM ('STRONGLY_RECOMMEND_HIRING', 'RECOMMEND_HIRING', 'HOLD_FOR_FURTHER_EVALUATION', 'DO_NOT_RECOMMEND_HIRING');

-- CreateEnum
CREATE TYPE "HiringMinuteFinalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED_FOR_FURTHER_REVIEW');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RECRUITMENT_REQUEST_SUBMITTED', 'RECRUITMENT_REQUEST_APPROVED', 'RECRUITMENT_REQUEST_REJECTED', 'VACANCY_CREATED', 'JOB_POSTED', 'APPLICATION_RECEIVED', 'APPLICATION_SHORTLISTED', 'APPLICATION_REJECTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_RESCHEDULED', 'CANDIDATE_SELECTED', 'CANDIDATE_REJECTED', 'OFFER_ISSUED', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'TALENT_ROSTER_ADDED', 'WORKFORCE_PLAN_SUBMITTED', 'WORKFORCE_PLAN_APPROVED', 'WORKFORCE_PLAN_REJECTED', 'GENERAL');

-- CreateEnum
CREATE TYPE "SubscriptionBillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL');

-- CreateEnum
CREATE TYPE "PhoneType" AS ENUM ('PRIVATE', 'WORK', 'EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "InstitutionCategory" AS ENUM ('Government', 'Private');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'RETURNED_FOR_REVISION', 'REVIEWED', 'FORWARDED');

-- CreateEnum
CREATE TYPE "HiringMinuteSignatoryRole" AS ENUM ('HR_REPRESENTATIVE', 'HIRING_MANAGER', 'department_HEAD', 'CEO');

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_company_id_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_vacancyId_fkey";

-- DropForeignKey
ALTER TABLE "Candidate" DROP CONSTRAINT "Candidate_company_id_fkey";

-- DropForeignKey
ALTER TABLE "CandidateDocument" DROP CONSTRAINT "CandidateDocument_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "CustomField" DROP CONSTRAINT "CustomField_company_id_fkey";

-- DropForeignKey
ALTER TABLE "CustomFieldValue" DROP CONSTRAINT "CustomFieldValue_customFieldId_fkey";

-- DropForeignKey
ALTER TABLE "department" DROP CONSTRAINT "department_managerId_fkey";

-- DropForeignKey
ALTER TABLE "department" DROP CONSTRAINT "department_company_id_fkey";

-- DropForeignKey
ALTER TABLE "department" DROP CONSTRAINT "department_parentdepartment_id_fkey";

-- DropForeignKey
ALTER TABLE "Education" DROP CONSTRAINT "Education_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "Experience" DROP CONSTRAINT "Experience_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "Interview" DROP CONSTRAINT "Interview_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewEvaluation" DROP CONSTRAINT "InterviewEvaluation_evaluatorId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewEvaluation" DROP CONSTRAINT "InterviewEvaluation_interviewId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewPanel" DROP CONSTRAINT "InterviewPanel_interviewId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewPanel" DROP CONSTRAINT "InterviewPanel_panelMemberId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationSubscription" DROP CONSTRAINT "OrganizationSubscription_company_id_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationSubscription" DROP CONSTRAINT "OrganizationSubscription_subscriptionPlanId_fkey";

-- DropForeignKey
ALTER TABLE "RecruitmentRequest" DROP CONSTRAINT "RecruitmentRequest_approved_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "RecruitmentRequest" DROP CONSTRAINT "RecruitmentRequest_department_id_fkey";

-- DropForeignKey
ALTER TABLE "RecruitmentRequest" DROP CONSTRAINT "RecruitmentRequest_company_id_fkey";

-- DropForeignKey
ALTER TABLE "RecruitmentRequest" DROP CONSTRAINT "RecruitmentRequest_requested_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "RecruitmentRequest" DROP CONSTRAINT "RecruitmentRequest_workforcePlanItemId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_company_id_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "ScreeningLog" DROP CONSTRAINT "ScreeningLog_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "ScreeningLog" DROP CONSTRAINT "ScreeningLog_vacancyId_fkey";

-- DropForeignKey
ALTER TABLE "ShortlistedCandidate" DROP CONSTRAINT "ShortlistedCandidate_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "ShortlistedCandidate" DROP CONSTRAINT "ShortlistedCandidate_vacancyId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_company_id_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Vacancy" DROP CONSTRAINT "Vacancy_department_id_fkey";

-- DropForeignKey
ALTER TABLE "Vacancy" DROP CONSTRAINT "Vacancy_company_id_fkey";

-- DropForeignKey
ALTER TABLE "Vacancy" DROP CONSTRAINT "Vacancy_recruitmentRequestId_fkey";

-- DropForeignKey
ALTER TABLE "WorkforcePlan" DROP CONSTRAINT "WorkforcePlan_approved_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkforcePlan" DROP CONSTRAINT "WorkforcePlan_createdByuser_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkforcePlan" DROP CONSTRAINT "WorkforcePlan_company_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkforcePlanItem" DROP CONSTRAINT "WorkforcePlanItem_department_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkforcePlanItem" DROP CONSTRAINT "WorkforcePlanItem_workforcePlanId_fkey";

-- DropTable
DROP TABLE "ActivityLog";

-- DropTable
DROP TABLE "Application";

-- DropTable
DROP TABLE "Candidate";

-- DropTable
DROP TABLE "CandidateDocument";

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "CustomField";

-- DropTable
DROP TABLE "CustomFieldValue";

-- DropTable
DROP TABLE "department";

-- DropTable
DROP TABLE "Education";

-- DropTable
DROP TABLE "Experience";

-- DropTable
DROP TABLE "Interview";

-- DropTable
DROP TABLE "InterviewEvaluation";

-- DropTable
DROP TABLE "InterviewPanel";

-- DropTable
DROP TABLE "OrganizationSubscription";

-- DropTable
DROP TABLE "Permission";

-- DropTable
DROP TABLE "RecruitmentRequest";

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "RolePermission";

-- DropTable
DROP TABLE "ScreeningLog";

-- DropTable
DROP TABLE "ShortlistedCandidate";

-- DropTable
DROP TABLE "SubscriptionPlan";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "UserRole";

-- DropTable
DROP TABLE "Vacancy";

-- DropTable
DROP TABLE "VersionHistory";

-- DropTable
DROP TABLE "WorkforcePlan";

-- DropTable
DROP TABLE "WorkforcePlanItem";

-- CreateTable
CREATE TABLE "company" (
    "id" SERIAL NOT NULL,
    "company_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT DEFAULT '#e55400',
    "secondary_color" TEXT DEFAULT '#ffda00',
    "stamp_url" TEXT,
    "industry" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "gender" "Gender",
    "date_of_birth" TIMESTAMP(3),
    "profile_picture_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "google_id" TEXT,
    "employee_id" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_role" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_role_permission" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "app_role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user_role" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_id" TEXT,

    CONSTRAINT "app_user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_workflow" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_workflow_stage" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "stage_name" TEXT NOT NULL,
    "approver_role_id" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_workflow_stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_template" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_sms" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_variable" (
    "id" TEXT NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "variable_key" TEXT NOT NULL,
    "description" TEXT,
    "example_value" TEXT,

    CONSTRAINT "notification_variable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "candidate_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "action_url" TEXT,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" TIMESTAMP(3),
    "sms_sent" BOOLEAN NOT NULL DEFAULT false,
    "sms_sent_at" TIMESTAMP(3),
    "delivery_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "parent_department_id" INTEGER,
    "manager_id" TEXT,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_plan" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "planning_period" "PlanningPeriod" NOT NULL,
    "status" "WorkforcePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" TEXT NOT NULL,
    "approved_by_user_id" TEXT,
    "approval_date" TIMESTAMP(3),
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "justification" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "planning_year" INTEGER,
    "planning_quarter" "PlanningQuarter",
    "planning_month" INTEGER,
    "business_unit" TEXT,
    "submitted_at" TIMESTAMP(3),
    "hr_comments" TEXT,
    "ceo_comments" TEXT,
    "supporting_documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "returned_comments" TEXT,
    "returned_at" TIMESTAMP(3),
    "returned_by_user_id" TEXT,

    CONSTRAINT "workforce_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_plan_item" (
    "id" TEXT NOT NULL,
    "workforce_plan_id" TEXT NOT NULL,
    "department_id" INTEGER NOT NULL,
    "job_title" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "headcount" INTEGER NOT NULL,
    "planned_start" TIMESTAMP(3) NOT NULL,
    "justification" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "job_grade" TEXT,
    "salary_budget" DECIMAL(12,2),
    "position_type" "PositionType" DEFAULT 'NEW',
    "replacement_employee_ref" TEXT,
    "priority" "PriorityLevel" DEFAULT 'MEDIUM',
    "expected_impact" TEXT,
    "required_qualifications" TEXT,
    "remarks" TEXT,

    CONSTRAINT "workforce_plan_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_approval_history" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruitment_approval_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_request" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "planning_type" "RecruitmentClassification" NOT NULL,
    "workforce_plan_item_id" TEXT,
    "requested_by_user_id" TEXT NOT NULL,
    "department_id" INTEGER NOT NULL,
    "job_title" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "request_type" "RecruitmentRequestType" NOT NULL,
    "is_replacement" BOOLEAN NOT NULL DEFAULT false,
    "replacement_for_employee_id" TEXT,
    "replacement_reason" TEXT,
    "justification" TEXT NOT NULL,
    "required_qualifications" TEXT,
    "expected_start_date" TIMESTAMP(3),
    "status" "RecruitmentRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_user_id" TEXT,
    "hr_comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "position_name" TEXT NOT NULL,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "request_number" TEXT,
    "job_grade" TEXT,

    CONSTRAINT "recruitment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_template" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "job_grade" TEXT,
    "summary" TEXT,
    "responsibilities" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_description" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "job_template_id" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "responsibilities" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "qualifications" TEXT,
    "employment_type" "EmploymentType",
    "job_grade" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_description_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "recruitment_request_id" TEXT NOT NULL,
    "job_description_id" TEXT,
    "title" TEXT NOT NULL,
    "department_id" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "application_type" "ApplicationType" NOT NULL DEFAULT 'EXTERNAL',
    "employment_type" "EmploymentType" NOT NULL,
    "status" "VacancyStatus" NOT NULL DEFAULT 'DRAFT',
    "open_positions" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "required_qualifications" TEXT,
    "required_experience" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "posted_at" TIMESTAMP(3),
    "posting_status" "PostingStatus" NOT NULL DEFAULT 'PENDING',
    "vacancy_number" TEXT,
    "opening_date" TIMESTAMP(3),
    "closing_date" TIMESTAMP(3),
    "stage_timeline" JSONB,
    "job_grade" TEXT,
    "business_unit" TEXT,
    "approved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "filled_at" TIMESTAMP(3),

    CONSTRAINT "vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "google_id" TEXT,
    "gender" "Gender",
    "date_of_birth" TIMESTAMP(3),
    "nationality" TEXT,
    "current_address" TEXT,
    "years_of_experience" INTEGER,
    "current_employer" TEXT,
    "current_position" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "portfolio_url" TEXT,
    "preferred_job_category" TEXT,
    "preferred_location" TEXT,
    "expected_salary" DECIMAL(12,2),
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'IMMEDIATELY',
    "remarks" TEXT,

    CONSTRAINT "candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "vacancy_id" TEXT NOT NULL,
    "cover_letter_url" TEXT,
    "expected_salary" DECIMAL(12,2),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "current_stage" "ApplicationStage" NOT NULL DEFAULT 'SCREENING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "recruitment_source_id" TEXT,
    "rejection_reason" TEXT,
    "sourced_from_roster" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stage_history" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "from_stage" "ApplicationStage",
    "to_stage" "ApplicationStage" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT,
    "notes" TEXT,

    CONSTRAINT "application_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_document" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "cv" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certificates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience_letters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "national_id" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "candidate_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_certification" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "issuing_organization" VARCHAR(150),
    "issue_date" DATE,
    "expiration_date" DATE,
    "credential_id" VARCHAR(100),
    "credential_url" VARCHAR(255),
    "document_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_log" (
    "id" TEXT NOT NULL,
    "vacancy_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "status" "ScreeningStatus" NOT NULL,
    "reason" TEXT,
    "scores_json" JSONB,
    "screening_criteria_json" JSONB,
    "screened_by_user_id" TEXT,
    "screened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screening_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_criteria" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "vacancy_id" TEXT,
    "job_template_id" TEXT,
    "criteria_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screening_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlisted_candidate" (
    "id" TEXT NOT NULL,
    "vacancy_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "application_id" TEXT,
    "shortlisted_by_user_id" TEXT,
    "shortlisted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "shortlisted_candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_category" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "interview_number" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "interview_category_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "meeting_link" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "mode" "InterviewMode" DEFAULT 'VIRTUAL',
    "google_maps_location" TEXT,
    "office_location" TEXT,
    "in_office_start_time" TIMESTAMP(3),
    "in_office_end_time" TIMESTAMP(3),
    "remote_start_time" TIMESTAMP(3),
    "remote_end_time" TIMESTAMP(3),
    "questions_json" JSONB,
    "rescheduled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_panel" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "panel_member_id" TEXT NOT NULL,

    CONSTRAINT "interview_panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_evaluation" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "interview_category_id" TEXT,
    "overall_score" INTEGER NOT NULL,
    "comments" TEXT,
    "questions_json" JSONB,
    "recommendation" "EvaluationRecommendation",
    "evaluation_template_id" TEXT,
    "scores_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_evaluation_template" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "interview_category_id" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_evaluation_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_criteria" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "max_score" INTEGER NOT NULL DEFAULT 10,
    "order" INTEGER NOT NULL,

    CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_question_bank" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "job_grade" TEXT,
    "interview_category_id" TEXT,
    "employment_type" "EmploymentType",
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_question_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_question" (
    "id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "interview_category_id" TEXT,
    "difficulty" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "application_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "salary" DECIMAL(12,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'SENT',
    "offer_notes" TEXT,
    "offer_letter_url" TEXT,
    "declined_reason" TEXT,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_roster" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "talent_category" TEXT NOT NULL,
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'IMMEDIATELY',
    "status" "TalentRosterStatus" NOT NULL DEFAULT 'ACTIVE',
    "source_stage" "TalentRosterSourceStage",
    "sourced_from_vacancy_id" TEXT,
    "expected_salary" DECIMAL(12,2),
    "recruitment_source_id" TEXT,
    "notes" TEXT,
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talent_roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_minute" (
    "id" TEXT NOT NULL,
    "vacancy_id" TEXT NOT NULL,
    "prepared_by_id" TEXT NOT NULL,
    "preparation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recruitment_request_type" "RecruitmentRequestType" NOT NULL,
    "recruitment_classification" "RecruitmentClassification" NOT NULL,
    "application_type" "ApplicationType" NOT NULL,
    "interview_date" TIMESTAMP(3),
    "interview_time" TEXT,
    "interview_place" TEXT,
    "advertisement_date" TIMESTAMP(3),
    "application_closing_date" TIMESTAMP(3),
    "total_applications" INTEGER NOT NULL DEFAULT 0,
    "total_screened" INTEGER NOT NULL DEFAULT 0,
    "total_shortlisted" INTEGER NOT NULL DEFAULT 0,
    "total_interviewed" INTEGER NOT NULL DEFAULT 0,
    "sources_used" JSONB,
    "screening_criteria_used" JSONB,
    "interview_method" "InterviewMode",
    "stages_conducted" JSONB,
    "candidate_evaluation_summary" JSONB,
    "selected_candidate_id" TEXT,
    "selected_candidate_score" DECIMAL(5,2),
    "expected_joining_date" TIMESTAMP(3),
    "recommended_position" TEXT,
    "expected_salary" DECIMAL(12,2),
    "reason_for_selection" TEXT,
    "alternative_candidate_id" TEXT,
    "alternative_candidate_score" DECIMAL(5,2),
    "reason_for_alternative" TEXT,
    "rejected_candidates_json" JSONB,
    "panel_recommendation" "HiringMinutePanelRecommendation",
    "recommendation_summary" TEXT,
    "hr_observation" TEXT,
    "final_decision" "HiringMinuteFinalDecision" NOT NULL DEFAULT 'PENDING',
    "decision_remarks" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hiring_minute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_minute_panel" (
    "id" TEXT NOT NULL,
    "hiring_minute_id" TEXT NOT NULL,
    "user_id" TEXT,
    "member_name" TEXT NOT NULL,
    "position_role" TEXT,
    "department" TEXT,
    "signature_url" TEXT,

    CONSTRAINT "hiring_minute_panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_minute_signatory" (
    "id" TEXT NOT NULL,
    "hiring_minute_id" TEXT NOT NULL,
    "role" "HiringMinuteSignatoryRole" NOT NULL,
    "user_id" TEXT,
    "signatory_name" TEXT,
    "position" TEXT,
    "signed_at" TIMESTAMP(3),
    "signature_url" TEXT,

    CONSTRAINT "hiring_minute_signatory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "billing_cycle" "SubscriptionBillingCycle" NOT NULL,
    "max_users" INTEGER NOT NULL,
    "max_vacancies" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_subscription" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "subscription_plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_feature" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subscription_plan_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "changes" JSONB,
    "description" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_history" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_user_id" TEXT,
    "changes" JSONB NOT NULL,

    CONSTRAINT "version_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "entity_type" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "custom_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_value" (
    "id" TEXT NOT NULL,
    "custom_field_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "custom_field_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "description" TEXT,
    "document_url" TEXT,
    "total_months" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "institution_id" INTEGER,
    "institution_name" TEXT,
    "degree" "DegreeLevel" NOT NULL,
    "field_of_study" TEXT NOT NULL,
    "graduation_year" INTEGER NOT NULL,
    "certificate_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InstitutionCategory" NOT NULL,

    CONSTRAINT "institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER,
    "user_id" TEXT,
    "candidate_id" TEXT,
    "region" TEXT,
    "city" TEXT,
    "sub_city" TEXT,
    "woreda" TEXT,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER,
    "user_id" TEXT,
    "candidate_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "phone_type" "PhoneType" DEFAULT 'PRIVATE',
    "is_primary" BOOLEAN DEFAULT false,

    CONSTRAINT "phone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_channel" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_automated" BOOLEAN NOT NULL DEFAULT false,
    "api_url" TEXT,
    "api_username" TEXT,
    "api_password" TEXT,
    "api_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "share_template" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruitment_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_job_posting" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "vacancy_id" TEXT NOT NULL,
    "recruitment_channel_id" TEXT NOT NULL,
    "posting_status" "PostingStatus" NOT NULL DEFAULT 'PENDING',
    "posted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "external_job_id" TEXT,
    "external_job_url" TEXT,
    "error_log" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancy_job_posting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_source" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruitment_source_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_company_code_key" ON "company"("company_code");

-- CreateIndex
CREATE UNIQUE INDEX "company_email_key" ON "company"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_role_company_id_slug_key" ON "app_role"("company_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "app_permission_slug_key" ON "app_permission"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "app_role_permission_role_id_permission_id_key" ON "app_role_permission"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_role_user_id_role_id_key" ON "app_user_role"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_workflow_stage_workflow_id_stage_order_key" ON "approval_workflow_stage"("workflow_id", "stage_order");

-- CreateIndex
CREATE UNIQUE INDEX "notification_template_company_id_type_key" ON "notification_template"("company_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_variable_notification_type_variable_key_key" ON "notification_variable"("notification_type", "variable_key");

-- CreateIndex
CREATE INDEX "notification_user_id_is_read_idx" ON "notification"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notification_candidate_id_is_read_idx" ON "notification"("candidate_id", "is_read");

-- CreateIndex
CREATE INDEX "notification_company_id_created_at_idx" ON "notification"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "department_company_id_name_key" ON "department"("company_id", "name");

-- CreateIndex
CREATE INDEX "recruitment_approval_history_entity_type_entity_id_idx" ON "recruitment_approval_history"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_request_request_number_key" ON "recruitment_request"("request_number");

-- CreateIndex
CREATE UNIQUE INDEX "vacancy_recruitment_request_id_key" ON "vacancy"("recruitment_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "vacancy_vacancy_number_key" ON "vacancy"("vacancy_number");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_email_key" ON "candidate"("email");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_document_candidate_id_key" ON "candidate_document"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_document_candidate_id_company_id_key" ON "candidate_document"("candidate_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "shortlisted_candidate_vacancy_id_candidate_id_key" ON "shortlisted_candidate"("vacancy_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_category_company_id_name_key" ON "interview_category"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "interview_interview_number_key" ON "interview"("interview_number");

-- CreateIndex
CREATE UNIQUE INDEX "interview_panel_interview_id_panel_member_id_key" ON "interview_panel"("interview_id", "panel_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_evaluation_template_company_id_name_key" ON "interview_evaluation_template"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_minute_vacancy_id_key" ON "hiring_minute"("vacancy_id");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_minute_signatory_hiring_minute_id_role_key" ON "hiring_minute_signatory"("hiring_minute_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_slug_key" ON "subscription_plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_feature_plan_id_feature_key_key" ON "subscription_plan_feature"("plan_id", "feature_key");

-- CreateIndex
CREATE INDEX "activity_log_entity_type_entity_id_idx" ON "activity_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_log_company_id_created_at_idx" ON "activity_log"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "experience_candidate_id_idx" ON "experience"("candidate_id");

-- CreateIndex
CREATE INDEX "education_candidate_id_idx" ON "education"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "institution_name_key" ON "institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_source_company_id_name_key" ON "recruitment_source"("company_id", "name");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_role" ADD CONSTRAINT "app_role_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_role_permission" ADD CONSTRAINT "app_role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "app_permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_role_permission" ADD CONSTRAINT "app_role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "app_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user_role" ADD CONSTRAINT "app_user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "app_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user_role" ADD CONSTRAINT "app_user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user_role" ADD CONSTRAINT "app_user_role_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflow" ADD CONSTRAINT "approval_workflow_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflow_stage" ADD CONSTRAINT "approval_workflow_stage_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "approval_workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_template" ADD CONSTRAINT "notification_template_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plan" ADD CONSTRAINT "workforce_plan_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plan" ADD CONSTRAINT "workforce_plan_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plan" ADD CONSTRAINT "workforce_plan_returned_by_user_id_fkey" FOREIGN KEY ("returned_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plan" ADD CONSTRAINT "workforce_plan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plan_item" ADD CONSTRAINT "workforce_plan_item_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plan_item" ADD CONSTRAINT "workforce_plan_item_workforce_plan_id_fkey" FOREIGN KEY ("workforce_plan_id") REFERENCES "workforce_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_approval_history" ADD CONSTRAINT "recruitment_approval_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_approval_history" ADD CONSTRAINT "approval_history_wp_fk" FOREIGN KEY ("entity_id") REFERENCES "workforce_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_approval_history" ADD CONSTRAINT "approval_history_rr_fk" FOREIGN KEY ("entity_id") REFERENCES "recruitment_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_approval_history" ADD CONSTRAINT "approval_history_hm_fk" FOREIGN KEY ("entity_id") REFERENCES "hiring_minute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_request" ADD CONSTRAINT "recruitment_request_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_request" ADD CONSTRAINT "recruitment_request_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_request" ADD CONSTRAINT "recruitment_request_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_request" ADD CONSTRAINT "recruitment_request_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_request" ADD CONSTRAINT "recruitment_request_workforce_plan_item_id_fkey" FOREIGN KEY ("workforce_plan_item_id") REFERENCES "workforce_plan_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_template" ADD CONSTRAINT "job_template_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_description" ADD CONSTRAINT "job_description_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_description" ADD CONSTRAINT "job_description_job_template_id_fkey" FOREIGN KEY ("job_template_id") REFERENCES "job_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy" ADD CONSTRAINT "vacancy_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy" ADD CONSTRAINT "vacancy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy" ADD CONSTRAINT "vacancy_recruitment_request_id_fkey" FOREIGN KEY ("recruitment_request_id") REFERENCES "recruitment_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy" ADD CONSTRAINT "vacancy_job_description_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_description"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_recruitment_source_id_fkey" FOREIGN KEY ("recruitment_source_id") REFERENCES "recruitment_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_document" ADD CONSTRAINT "candidate_document_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_document" ADD CONSTRAINT "candidate_document_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_certification" ADD CONSTRAINT "candidate_certification_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_log" ADD CONSTRAINT "screening_log_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_log" ADD CONSTRAINT "screening_log_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_log" ADD CONSTRAINT "screening_log_screened_by_user_id_fkey" FOREIGN KEY ("screened_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_criteria" ADD CONSTRAINT "screening_criteria_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_criteria" ADD CONSTRAINT "screening_criteria_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_criteria" ADD CONSTRAINT "screening_criteria_job_template_id_fkey" FOREIGN KEY ("job_template_id") REFERENCES "job_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlisted_candidate" ADD CONSTRAINT "shortlisted_candidate_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlisted_candidate" ADD CONSTRAINT "shortlisted_candidate_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlisted_candidate" ADD CONSTRAINT "shortlisted_candidate_shortlisted_by_user_id_fkey" FOREIGN KEY ("shortlisted_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_category" ADD CONSTRAINT "interview_category_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "interview_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "interview_interview_category_id_fkey" FOREIGN KEY ("interview_category_id") REFERENCES "interview_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_panel" ADD CONSTRAINT "interview_panel_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_panel" ADD CONSTRAINT "interview_panel_panel_member_id_fkey" FOREIGN KEY ("panel_member_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluation" ADD CONSTRAINT "interview_evaluation_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluation" ADD CONSTRAINT "interview_evaluation_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluation" ADD CONSTRAINT "interview_evaluation_interview_category_id_fkey" FOREIGN KEY ("interview_category_id") REFERENCES "interview_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluation" ADD CONSTRAINT "interview_evaluation_evaluation_template_id_fkey" FOREIGN KEY ("evaluation_template_id") REFERENCES "interview_evaluation_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluation_template" ADD CONSTRAINT "interview_evaluation_template_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluation_template" ADD CONSTRAINT "interview_evaluation_template_interview_category_id_fkey" FOREIGN KEY ("interview_category_id") REFERENCES "interview_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "interview_evaluation_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_bank" ADD CONSTRAINT "interview_question_bank_interview_category_id_fkey" FOREIGN KEY ("interview_category_id") REFERENCES "interview_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question" ADD CONSTRAINT "interview_question_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "interview_question_bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question" ADD CONSTRAINT "interview_question_interview_category_id_fkey" FOREIGN KEY ("interview_category_id") REFERENCES "interview_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_roster" ADD CONSTRAINT "talent_roster_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_roster" ADD CONSTRAINT "talent_roster_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_roster" ADD CONSTRAINT "talent_roster_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_roster" ADD CONSTRAINT "talent_roster_recruitment_source_id_fkey" FOREIGN KEY ("recruitment_source_id") REFERENCES "recruitment_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_minute" ADD CONSTRAINT "hiring_minute_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_minute" ADD CONSTRAINT "hiring_minute_prepared_by_id_fkey" FOREIGN KEY ("prepared_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_minute" ADD CONSTRAINT "hiring_minute_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_minute" ADD CONSTRAINT "hiring_minute_selected_candidate_id_fkey" FOREIGN KEY ("selected_candidate_id") REFERENCES "candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_minute" ADD CONSTRAINT "hiring_minute_alternative_candidate_id_fkey" FOREIGN KEY ("alternative_candidate_id") REFERENCES "candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_minute_panel" ADD CONSTRAINT "hiring_minute_panel_hiring_minute_id_fkey" FOREIGN KEY ("hiring_minute_id") REFERENCES "hiring_minute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_minute_signatory" ADD CONSTRAINT "hiring_minute_signatory_hiring_minute_id_fkey" FOREIGN KEY ("hiring_minute_id") REFERENCES "hiring_minute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_subscription" ADD CONSTRAINT "company_subscription_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_subscription" ADD CONSTRAINT "company_subscription_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_feature" ADD CONSTRAINT "subscription_plan_feature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field" ADD CONSTRAINT "custom_field_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_value" ADD CONSTRAINT "custom_field_value_custom_field_id_fkey" FOREIGN KEY ("custom_field_id") REFERENCES "custom_field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience" ADD CONSTRAINT "experience_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone" ADD CONSTRAINT "phone_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone" ADD CONSTRAINT "phone_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone" ADD CONSTRAINT "phone_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_channel" ADD CONSTRAINT "recruitment_channel_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_job_posting" ADD CONSTRAINT "vacancy_job_posting_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_job_posting" ADD CONSTRAINT "vacancy_job_posting_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_job_posting" ADD CONSTRAINT "vacancy_job_posting_recruitment_channel_id_fkey" FOREIGN KEY ("recruitment_channel_id") REFERENCES "recruitment_channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_source" ADD CONSTRAINT "recruitment_source_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

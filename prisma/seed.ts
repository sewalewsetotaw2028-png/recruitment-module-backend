import 'dotenv/config';
import {
  Prisma,
  NotificationType,
  WorkforcePlanStatus,
  RecruitmentRequestStatus,
  VacancyStatus,
  ApplicationStatus,
  ApplicationStage,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../src/config/database';
import bcryptjs from 'bcryptjs';
import {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLES,
  RoleSlug,
} from '../src/config/rolePermissions';

const formatLabel = (slug: string) =>
  slug.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

// ─── Permission descriptions ───────────────────────────────────────────────────
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'workforce_plan:read': 'View workforce plans and their details',
  'workforce_plan:create': 'Create new workforce plans',
  'workforce_plan:update': 'Edit existing workforce plans',
  'workforce_plan:submit': 'Submit a workforce plan for HR review',
  'workforce_plan:forward': 'Forward a workforce plan to CEO for approval',
  'workforce_plan:approve': 'Approve workforce plans at the HR or CEO stage',
  'workforce_plan:reject': 'Reject a workforce plan with comments',
  'workforce_plan:return': 'Return a workforce plan for revision',
  'recruitment_request:read': 'View recruitment requests',
  'recruitment_request:create': 'Create new recruitment requests',
  'recruitment_request:update': 'Edit existing recruitment requests',
  'recruitment_request:submit': 'Submit a recruitment request for HR review',
  'recruitment_request:forward': 'Forward a recruitment request for approval',
  'recruitment_request:approve': 'Approve a recruitment request',
  'recruitment_request:reject': 'Reject a recruitment request with comments',
  'vacancy:read': 'View vacancies and their applicant lists',
  'vacancy:create': 'Create new vacancies from approved recruitment requests',
  'vacancy:update': 'Edit vacancy details, requirements, and status',
  'vacancy:publish': 'Post a vacancy to external job channels',
  'vacancy:close': 'Close a vacancy and stop accepting applications',
  'application:read': 'View applications and their current status',
  'application:screen': 'Screen applications during initial review',
  'application:shortlist': 'Shortlist applications for interviews',
  'application:reject': 'Reject an application at any stage',
  'interview:read': 'View scheduled and completed interviews',
  'interview:view': 'View interviews list page and details',
  'interview:create': 'Schedule new interviews for shortlisted candidates',
  'interview:update': 'Reschedule or cancel an existing interview',
  'interview:evaluate': 'Submit an evaluation form after an interview',
  'offer:read': 'View employment offers issued to candidates',
  'offer:create': 'Issue a new employment offer to a selected candidate',
  'offer:update': 'Modify or withdraw an existing offer',
  'talent_roster:read': 'View the talent roster of stored candidate profiles',
  'talent_roster:manage':
    'Add/remove candidates and update talent roster entries',
  'hiring_minute:read': 'View hiring minutes and their decisions',
  'hiring_minute:create': 'Prepare a new hiring minute for a vacancy',
  'hiring_minute:update': 'Update or sign off on a hiring minute',
  'hiring_minute:approve': 'Approve a hiring minute as the final approver',
  'department:read': 'View department structure and details',
  'department:create': 'Create new departments',
  'report:read': 'View recruitment reports, KPIs, and analytics dashboards',
  'candidate_application:read':
    'View your own candidate applications and their status',
  'my_vacancy:read': 'View vacancies assigned to you as a hiring manager',
  'my_interview:read':
    'View interviews where you are assigned as a panel member',
  'my_evaluation:read': 'View pending interview evaluations assigned to you',
  'config:manage': 'Manage roles, permissions, templates, and system settings',
};

// ─── Database Clean ────────────────────────────────────────────────────────────
async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...');
  await prisma.evaluationCriteria.deleteMany({});
  await prisma.interviewEvaluationTemplate.deleteMany({});
  await prisma.screeningCriteria.deleteMany({});
  await prisma.subscriptionPlanFeature.deleteMany({});
  await prisma.notificationVariable.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.versionHistory.deleteMany({});
  await prisma.customFieldValue.deleteMany({});
  await prisma.customField.deleteMany({});
  await prisma.recruitmentApprovalHistory.deleteMany({});
  await prisma.hiringMinuteSignatory.deleteMany({});
  await prisma.hiringMinutePanel.deleteMany({});
  await prisma.hiringMinute.deleteMany({});
  await prisma.vacancyJobPosting.deleteMany({});
  await prisma.recruitmentChannel.deleteMany({});
  await prisma.shortlistedCandidate.deleteMany({});
  await prisma.screeningLog.deleteMany({});
  await prisma.interviewEvaluation.deleteMany({});
  await prisma.interviewPanel.deleteMany({});
  await prisma.interviewQuestion.deleteMany({});
  await prisma.interviewQuestionBank.deleteMany({});
  await prisma.interview.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.talentRoster.deleteMany({});
  await prisma.applicationStageHistory.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.candidateCertification.deleteMany({});
  await prisma.candidateDocument.deleteMany({});
  await prisma.experience.deleteMany({});
  await prisma.education.deleteMany({});
  await prisma.institution.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.vacancy.deleteMany({});
  await prisma.jobDescription.deleteMany({});
  await prisma.jobTemplate.deleteMany({});
  await prisma.recruitmentRequest.deleteMany({});
  await prisma.workforcePlanItem.deleteMany({});
  await prisma.workforcePlan.deleteMany({});
  await prisma.approvalWorkflowStage.deleteMany({});
  await prisma.approvalWorkflow.deleteMany({});
  await prisma.interviewCategory.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.appUserRole.deleteMany({});
  await prisma.appRolePermission.deleteMany({});
  await prisma.appRole.deleteMany({});
  await prisma.appPermission.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.notificationTemplate.deleteMany({});
  await prisma.companySubscription.deleteMany({});
  await prisma.subscriptionPlan.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.phone.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.recruitmentSource.deleteMany({});
  await prisma.company.deleteMany({});
  console.log('✓ Database cleaned');
}

async function main() {
  try {
    const passwordHash = await bcryptjs.hash('Password', 12);

    // Drop the problematic polymorphic foreign key constraints
    console.log(
      '🔗 Dropping polymorphic foreign key constraints from recruitment_approval_history...',
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "recruitment_approval_history" DROP CONSTRAINT IF EXISTS "approval_history_wp_fk"`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "recruitment_approval_history" DROP CONSTRAINT IF EXISTS "approval_history_rr_fk"`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "recruitment_approval_history" DROP CONSTRAINT IF EXISTS "approval_history_hm_fk"`,
    );
    console.log('✓ Polymorphic foreign key constraints dropped');

    await cleanDatabase();

    // ── 1. Company ──────────────────────────────────────────────────────────────
    const company = await prisma.company.create({
      data: {
        company_code: 'ADIU',
        name: 'Adiu Seed Company',
        email: 'admin@erms.com',
        phone: '+251 11 000 0000',
        address: '456 Recruiter Blvd, Addis Ababa',
        website: 'https://adiu.et',
        industry: 'Recruitment Technology',
      },
    });
    console.log('✓ Company created (id=%s)', company.id);

    // ── 2. Job Templates ────────────────────────────────────────────────────────
    const softwareEngineerTemplateId = '00000000-0000-4000-8000-000000000101';
    const hrSpecialistTemplateId = '00000000-0000-4000-8000-000000000102';
    const dataAnalystTemplateId = '00000000-0000-4000-8000-000000000103';
    const marketingManagerTemplateId = '00000000-0000-4000-8000-000000000104';

    const seTemplate = await prisma.jobTemplate.upsert({
      where: { id: softwareEngineerTemplateId },
      update: {
        company_id: company.id,
        title: 'Software Engineer',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 3',
        summary: 'Build and maintain the recruitment platform.',
        responsibilities:
          'Develop features, review code, and support production systems.',
        requirements:
          'Strong TypeScript, React, and API development experience.',
        is_active: true,
      },
      create: {
        id: softwareEngineerTemplateId,
        company_id: company.id,
        title: 'Software Engineer',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 3',
        summary: 'Build and maintain the recruitment platform.',
        responsibilities:
          'Develop features, review code, and support production systems.',
        requirements:
          'Strong TypeScript, React, and API development experience.',
        is_active: true,
      },
    });
    const hrTemplate2 = await prisma.jobTemplate.upsert({
      where: { id: hrSpecialistTemplateId },
      update: {
        company_id: company.id,
        title: 'HR Specialist',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 2',
        summary: 'Support HR operations and recruitment coordination.',
        responsibilities:
          'Coordinate hiring workflows, manage records, and support candidates.',
        requirements:
          'Experience with HR operations, communication, and process tracking.',
        is_active: true,
      },
      create: {
        id: hrSpecialistTemplateId,
        company_id: company.id,
        title: 'HR Specialist',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 2',
        summary: 'Support HR operations and recruitment coordination.',
        responsibilities:
          'Coordinate hiring workflows, manage records, and support candidates.',
        requirements:
          'Experience with HR operations, communication, and process tracking.',
        is_active: true,
      },
    });
    const daTemplate = await prisma.jobTemplate.upsert({
      where: { id: dataAnalystTemplateId },
      update: {
        company_id: company.id,
        title: 'Data Analyst',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 2',
        summary: 'Analyze recruitment data and support decision-making.',
        responsibilities:
          'Build dashboards, run reports, and provide data insights.',
        requirements: 'SQL, Python, and data visualization tools.',
        is_active: true,
      },
      create: {
        id: dataAnalystTemplateId,
        company_id: company.id,
        title: 'Data Analyst',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 2',
        summary: 'Analyze recruitment data and support decision-making.',
        responsibilities:
          'Build dashboards, run reports, and provide data insights.',
        requirements: 'SQL, Python, and data visualization tools.',
        is_active: true,
      },
    });
    const mmTemplate = await prisma.jobTemplate.upsert({
      where: { id: marketingManagerTemplateId },
      update: {
        company_id: company.id,
        title: 'Marketing Manager',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 4',
        summary: 'Lead marketing campaigns and employer branding.',
        responsibilities:
          'Plan campaigns, manage social media, and track KPIs.',
        requirements: 'Marketing degree with 5+ years of experience.',
        is_active: true,
      },
      create: {
        id: marketingManagerTemplateId,
        company_id: company.id,
        title: 'Marketing Manager',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 4',
        summary: 'Lead marketing campaigns and employer branding.',
        responsibilities:
          'Plan campaigns, manage social media, and track KPIs.',
        requirements: 'Marketing degree with 5+ years of experience.',
        is_active: true,
      },
    });
    console.log('✓ Job templates created (4)');

    // ── 3. Subscription Plans ───────────────────────────────────────────────────
    const basicPlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Basic',
        slug: 'basic',
        price: new Prisma.Decimal(29.99),
        billing_cycle: 'MONTHLY',
        max_users: 5,
        max_vacancies: 10,
        is_active: true,
      },
    });
    const proPlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Pro',
        slug: 'pro',
        price: new Prisma.Decimal(149.99),
        billing_cycle: 'MONTHLY',
        max_users: 100,
        max_vacancies: 200,
        is_active: true,
      },
    });
    const entPlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Enterprise',
        slug: 'enterprise',
        price: new Prisma.Decimal(499.99),
        billing_cycle: 'ANNUALLY',
        max_users: 9999,
        max_vacancies: 9999,
        is_active: true,
      },
    });

    await prisma.subscriptionPlanFeature.createMany({
      data: [
        {
          plan_id: basicPlan.id,
          feature_key: 'talent_roster',
          is_enabled: false,
        },
        {
          plan_id: basicPlan.id,
          feature_key: 'advanced_reporting',
          is_enabled: false,
        },
        {
          plan_id: basicPlan.id,
          feature_key: 'hris_integration',
          is_enabled: false,
        },
        { plan_id: proPlan.id, feature_key: 'talent_roster', is_enabled: true },
        {
          plan_id: proPlan.id,
          feature_key: 'advanced_reporting',
          is_enabled: false,
        },
        {
          plan_id: proPlan.id,
          feature_key: 'hris_integration',
          is_enabled: false,
        },
        { plan_id: entPlan.id, feature_key: 'talent_roster', is_enabled: true },
        {
          plan_id: entPlan.id,
          feature_key: 'advanced_reporting',
          is_enabled: true,
        },
        {
          plan_id: entPlan.id,
          feature_key: 'hris_integration',
          is_enabled: true,
        },
      ],
    });
    await prisma.companySubscription.create({
      data: {
        id: randomUUID(),
        company_id: company.id,
        subscription_plan_id: proPlan.id,
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('✓ Subscription plans created');

    // ── 3b. Recruitment Sources ──────────────────────────────────────────────────
    const recruitmentSourceMap: Record<string, string> = {};
    const defaultRecruitmentSources = [
      {
        name: 'Company Website',
        description: 'Applications via the company careers page',
      },
      { name: 'LinkedIn', description: 'LinkedIn Job Ads' },
      { name: 'Facebook', description: 'Facebook Job Postings' },
      { name: 'Telegram', description: 'Telegram Job Channels' },
      { name: 'Employee Referral', description: 'Internal Employee Referral' },
      { name: 'Indeed', description: 'Indeed Job Board' },
      { name: 'Glassdoor', description: 'Glassdoor Job Listings' },
      { name: 'CareerBuilder', description: 'CareerBuilder Job Board' },
      { name: 'Twitter/X', description: 'Twitter/X Job Posts' },
      { name: 'Instagram', description: 'Instagram Job Posts' },
      {
        name: 'University Career Fair',
        description: 'University Recruitment Events',
      },
      { name: 'Job Fair/Expo', description: 'Job Fair and Expo Events' },
      { name: 'Headhunter/Agency', description: 'External Recruitment Agency' },
      {
        name: 'Walk-in Application',
        description: 'Direct Office Applications',
      },
      { name: 'Newspaper Ad', description: 'Print Media Advertisement' },
      { name: 'Radio Ad', description: 'Radio Advertisement' },
    ];
    for (const source of defaultRecruitmentSources) {
      const src = await prisma.recruitmentSource.create({
        data: {
          company_id: company.id,
          name: source.name,
          description: source.description,
          is_active: true,
        },
      });
      recruitmentSourceMap[source.name] = src.id;
    }
    console.log('✓ Recruitment sources created');

    // ── 4. Notification Variables ────────────────────────────────────────────────
    const notificationVariables: Array<{
      notification_type: NotificationType;
      variable_key: string;
      description: string;
      example_value: string;
    }> = [
      {
        notification_type: 'APPLICATION_RECEIVED',
        variable_key: 'candidate_name',
        description: 'Full name of the candidate',
        example_value: 'Wendy Worku',
      },
      {
        notification_type: 'APPLICATION_RECEIVED',
        variable_key: 'vacancy_title',
        description: 'Title of the vacancy applied for',
        example_value: 'Software Engineer',
      },
      {
        notification_type: 'APPLICATION_RECEIVED',
        variable_key: 'company_name',
        description: 'Name of the company',
        example_value: 'Adiu Communication Service PLC',
      },
      {
        notification_type: 'APPLICATION_RECEIVED',
        variable_key: 'application_date',
        description: 'Date the application was submitted',
        example_value: '2026-06-09',
      },
      {
        notification_type: 'INTERVIEW_SCHEDULED',
        variable_key: 'candidate_name',
        description: 'Full name of the candidate',
        example_value: 'Wendy Worku',
      },
      {
        notification_type: 'INTERVIEW_SCHEDULED',
        variable_key: 'vacancy_title',
        description: 'Title of the vacancy',
        example_value: 'Software Engineer',
      },
      {
        notification_type: 'INTERVIEW_SCHEDULED',
        variable_key: 'interview_date',
        description: 'Date of the scheduled interview',
        example_value: '2026-06-15',
      },
      {
        notification_type: 'INTERVIEW_SCHEDULED',
        variable_key: 'interview_time',
        description: 'Time of the scheduled interview',
        example_value: '10:00 AM',
      },
      {
        notification_type: 'INTERVIEW_SCHEDULED',
        variable_key: 'interview_mode',
        description: 'Interview mode',
        example_value: 'Virtual',
      },
      {
        notification_type: 'INTERVIEW_SCHEDULED',
        variable_key: 'meeting_link',
        description: 'Virtual meeting link',
        example_value: 'https://meet.google.com/abc-defg-hij',
      },
      {
        notification_type: 'OFFER_ISSUED',
        variable_key: 'candidate_name',
        description: 'Full name of the candidate',
        example_value: 'Wendy Worku',
      },
      {
        notification_type: 'OFFER_ISSUED',
        variable_key: 'vacancy_title',
        description: 'Title of the position being offered',
        example_value: 'Software Engineer',
      },
      {
        notification_type: 'OFFER_ISSUED',
        variable_key: 'offer_expiry_date',
        description: 'Date by which the candidate must accept or decline',
        example_value: '2026-06-16',
      },
      {
        notification_type: 'OFFER_ISSUED',
        variable_key: 'expiry_date',
        description: 'Backward-compatible alias for the offer expiry date',
        example_value: '2026-06-16',
      },
      {
        notification_type: 'WORKFORCE_PLAN_APPROVED',
        variable_key: 'plan_title',
        description: 'Title of the approved workforce plan',
        example_value: '2026 Workforce Plan',
      },
      {
        notification_type: 'WORKFORCE_PLAN_APPROVED',
        variable_key: 'approved_by',
        description: 'Name of the approver',
        example_value: 'Alice Admasu',
      },
      {
        notification_type: 'WORKFORCE_PLAN_APPROVED',
        variable_key: 'approval_date',
        description: 'Date the plan was approved',
        example_value: '2026-06-11',
      },
      {
        notification_type: 'APPLICATION_SHORTLISTED',
        variable_key: 'candidate_name',
        description: 'Full name of the candidate',
        example_value: 'Wendy Worku',
      },
      {
        notification_type: 'APPLICATION_SHORTLISTED',
        variable_key: 'vacancy_title',
        description: 'Title of the vacancy',
        example_value: 'Software Engineer',
      },
      {
        notification_type: 'APPLICATION_REJECTED',
        variable_key: 'candidate_name',
        description: 'Full name of the candidate',
        example_value: 'Wendy Worku',
      },
      {
        notification_type: 'APPLICATION_REJECTED',
        variable_key: 'vacancy_title',
        description: 'Title of the vacancy',
        example_value: 'Software Engineer',
      },
    ];
    for (const v of notificationVariables) {
      await prisma.notificationVariable.upsert({
        where: {
          notification_type_variable_key: {
            notification_type: v.notification_type,
            variable_key: v.variable_key,
          },
        },
        update: { description: v.description, example_value: v.example_value },
        create: { ...v },
      });
    }
    console.log('✓ Notification variables created');

    // ── 5. Notification Templates ────────────────────────────────────────────────
    const notificationTemplates: Array<{
      type: NotificationType;
      subject: string;
      body_html: string;
      body_sms?: string;
    }> = [
      {
        type: 'APPLICATION_RECEIVED',
        subject: 'We received your application for {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>Thank you for submitting your application for <strong>{{vacancy_title}}</strong> at {{company_name}}.</p><p>We received your application on {{application_date}} and will review it carefully.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'Dear {{candidate_name}}, your application for {{vacancy_title}} has been received.',
      },
      {
        type: 'APPLICATION_SHORTLISTED',
        subject:
          'Congratulations — You have been shortlisted for {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>You have been shortlisted for <strong>{{vacancy_title}}</strong>.</p><p>We will contact you shortly.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'Dear {{candidate_name}}, you have been shortlisted for {{vacancy_title}}.',
      },
      {
        type: 'APPLICATION_REJECTED',
        subject: 'Recruitment Application Update — {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>Thank you for applying for <strong>{{vacancy_title}}</strong>. After careful review, we regret that you have not been shortlisted at this time.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'Dear {{candidate_name}}, your application for {{vacancy_title}} was not shortlisted at this time.',
      },
      {
        type: 'INTERVIEW_SCHEDULED',
        subject: 'Interview Invitation — {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>You are invited to an interview for <strong>{{vacancy_title}}</strong>.</p><p><strong>Date:</strong> {{interview_date}}<br/><strong>Time:</strong> {{interview_time}}<br/><strong>Mode:</strong> {{interview_mode}}</p><p>{{meeting_link}}</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'Dear {{candidate_name}}, your interview for {{vacancy_title}} is on {{interview_date}} at {{interview_time}}.',
      },
      {
        type: 'INTERVIEW_RESCHEDULED',
        subject: 'Interview Rescheduled — {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>Your interview for <strong>{{vacancy_title}}</strong> has been rescheduled to {{interview_date}} at {{interview_time}}.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'Your interview for {{vacancy_title}} has been rescheduled to {{interview_date}} at {{interview_time}}.',
      },
      {
        type: 'CANDIDATE_SELECTED',
        subject:
          'Congratulations — You have been selected for {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>We are delighted to inform you that you have been selected for <strong>{{vacancy_title}}</strong>.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'Congratulations {{candidate_name}}! You have been selected for {{vacancy_title}}.',
      },
      {
        type: 'CANDIDATE_REJECTED',
        subject: 'Interview Outcome Notification — {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>Thank you for participating in the interview for <strong>{{vacancy_title}}</strong>. After evaluation, we regret that another candidate has been selected.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'Dear {{candidate_name}}, thank you for interviewing for {{vacancy_title}}. Another candidate has been selected.',
      },
      {
        type: 'OFFER_ISSUED',
        subject: 'Employment Offer — {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>We are pleased to extend an employment offer for <strong>{{vacancy_title}}</strong>. Please review and confirm before <strong>{{offer_expiry_date}}</strong>.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'An employment offer for {{vacancy_title}} has been issued. Please respond before {{offer_expiry_date}}.',
      },
      {
        type: 'OFFER_ACCEPTED',
        subject: 'Offer Acceptance Confirmed — {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>We have received your acceptance for <strong>{{vacancy_title}}</strong>. Welcome to the team!</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'Your acceptance for {{vacancy_title}} has been confirmed. Welcome to the team!',
      },
      {
        type: 'OFFER_DECLINED',
        subject: 'Offer Declined — {{vacancy_title}}',
        body_html: `<p>Dear {{candidate_name}},</p><p>We have received your response regarding the offer for <strong>{{vacancy_title}}</strong>. We respect your decision.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'We acknowledge your decision regarding the offer for {{vacancy_title}}.',
      },
      {
        type: 'VACANCY_CREATED',
        subject: 'New Vacancy Created — {{vacancy_title}}',
        body_html: `<p>A new vacancy has been created: <strong>{{vacancy_title}}</strong>. Please review and proceed with posting.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms: 'New vacancy created: {{vacancy_title}}. Please review.',
      },
      {
        type: 'JOB_POSTED',
        subject: 'Job Posting Published — {{vacancy_title}}',
        body_html: `<p>The vacancy <strong>{{vacancy_title}}</strong> has been published. Applications are now open.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms: 'Vacancy {{vacancy_title}} is now live.',
      },
      {
        type: 'TALENT_ROSTER_ADDED',
        subject: 'Your Profile has been Added to Our Talent Roster',
        body_html: `<p>Dear {{candidate_name}},</p><p>Your profile has been added to our Talent Roster.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'Dear {{candidate_name}}, your profile has been added to our Talent Roster.',
      },
      {
        type: 'RECRUITMENT_REQUEST_SUBMITTED',
        subject: 'Recruitment Request Submitted for Review',
        body_html: `<p>A recruitment request has been submitted and is pending HR review.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms: 'A recruitment request is awaiting your review.',
      },
      {
        type: 'RECRUITMENT_REQUEST_APPROVED',
        subject: 'Recruitment Request Approved',
        body_html: `<p>Your recruitment request has been approved. You may now proceed with vacancy creation.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms: 'Your recruitment request has been approved.',
      },
      {
        type: 'RECRUITMENT_REQUEST_REJECTED',
        subject: 'Recruitment Request Rejected',
        body_html: `<p>Your recruitment request has been reviewed and rejected. Please log in for details.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms: 'Your recruitment request has been rejected.',
      },
      {
        type: 'WORKFORCE_PLAN_SUBMITTED',
        subject: 'Workforce Plan Submitted for Review',
        body_html: `<p>A workforce plan has been submitted and is pending review.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms: 'A workforce plan is awaiting your review.',
      },
      {
        type: 'WORKFORCE_PLAN_APPROVED',
        subject: 'Workforce Plan Approved — {{plan_title}}',
        body_html: `<p>The workforce plan <strong>{{plan_title}}</strong> has been approved by {{approved_by}} on {{approval_date}}.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms: 'Workforce plan {{plan_title}} has been approved.',
      },
      {
        type: 'WORKFORCE_PLAN_REJECTED',
        subject: 'Workforce Plan Rejected — {{plan_title}}',
        body_html: `<p>The workforce plan <strong>{{plan_title}}</strong> has been reviewed and rejected.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms: 'Workforce plan {{plan_title}} has been rejected.',
      },
      {
        type: 'GENERAL',
        subject: 'Notification from Adiu Communication Service PLC',
        body_html: `<p>You have a new notification from the recruitment system.</p><p>Best regards,<br/>HR Department</p>`,
        body_sms:
          'You have a new notification from Adiu Communication Service PLC.',
      },
    ];
    for (const template of notificationTemplates) {
      await prisma.notificationTemplate.upsert({
        where: {
          company_id_type: { company_id: company.id, type: template.type },
        },
        update: { is_active: true },
        create: {
          company_id: company.id,
          type: template.type,
          subject: template.subject,
          body_html: template.body_html,
          body_sms: template.body_sms ?? null,
          is_active: true,
        },
      });
    }
    console.log('✓ Notification templates created');

    // ── 6. Default Screening Criteria ───────────────────────────────────────────
    const defaultScreeningCriteria = [
      {
        field: 'Educational Qualification',
        operator: 'required',
        value: "Bachelor's degree or above",
        weight: 15,
      },
      {
        field: 'Relevant Work Experience',
        operator: 'min_years',
        value: 3,
        weight: 20,
      },
      {
        field: 'Technical Skills',
        operator: 'contains',
        value: 'Role-specific technical skills',
        weight: 20,
      },
      {
        field: 'Language Proficiency',
        operator: 'equals',
        value: 'English - professional proficiency',
        weight: 10,
      },
      {
        field: 'Communication Skills',
        operator: 'required',
        value: 'Clear written and verbal communication',
        weight: 10,
      },
      {
        field: 'Availability',
        operator: 'equals',
        value: 'Immediate or within notice period',
        weight: 5,
      },
      {
        field: 'Salary Expectation',
        operator: 'equals',
        value: 'Within approved budget range',
        weight: 5,
      },
      {
        field: 'Document Completeness',
        operator: 'required',
        value: 'CV and certificates uploaded',
        weight: 5,
      },
    ];
    await prisma.screeningCriteria.create({
      data: {
        company_id: company.id,
        vacancy_id: null,
        job_template_id: null,
        criteria_json: defaultScreeningCriteria,
        is_active: true,
      },
    });
    console.log('✓ Default screening criteria created');

    // ── 7. Permissions ──────────────────────────────────────────────────────────
    const permissionSlugs = Array.from(new Set(Object.values(PERMISSIONS)));
    const permissions = await Promise.all(
      permissionSlugs.map((permissionSlug) => {
        const [moduleName, action] = permissionSlug.split(':');
        return prisma.appPermission.upsert({
          where: { slug: permissionSlug },
          update: {
            name: formatLabel(permissionSlug),
            module: moduleName,
            action: action ?? '',
            description:
              PERMISSION_DESCRIPTIONS[permissionSlug] ??
              formatLabel(permissionSlug),
          },
          create: {
            name: formatLabel(permissionSlug),
            slug: permissionSlug,
            module: moduleName,
            action: action ?? '',
            description:
              PERMISSION_DESCRIPTIONS[permissionSlug] ??
              formatLabel(permissionSlug),
          },
        });
      }),
    );
    const permissionMap = permissions.reduce<Record<string, string>>(
      (map, perm) => {
        map[perm.slug] = perm.id;
        return map;
      },
      {},
    );
    console.log('✓ Permissions created');

    // ── 8. App Roles ────────────────────────────────────────────────────────────
    const roleDescriptions: Record<string, string> = {
      ceo: 'Final approver for workforce plans and recruitment requests',
      hr_admin: 'Full HR operations and system configuration access',
      hr: 'HR operations — recruitment, screening, interviews, offers',
      work_unit:
        'Operational unit user for workforce plans and recruitment requests',
      recruiter: 'Manages vacancies, applications, screening and shortlisting',
      hiring_manager:
        'Submits recruitment requests and participates in interviews',
      department_manager:
        'Initiates workforce planning and recruitment requests',
      interviewer: 'Conducts interviews and submits evaluations',
      candidate: 'External applicant — portal access only',
    };
    const appRoles: Record<string, any> = {};
    for (const [, slug] of Object.entries(ROLES)) {
      appRoles[slug] = await prisma.appRole.upsert({
        where: { company_id_slug: { company_id: company.id, slug } },
        update: {
          name: formatLabel(slug),
          description: roleDescriptions[slug] ?? '',
          is_system: true,
        },
        create: {
          company_id: company.id,
          name: formatLabel(slug),
          slug,
          description: roleDescriptions[slug] ?? '',
          is_system: true,
        },
      });
    }
    console.log('✓ App roles created');

    // ── 9. Role → Permission Assignments ────────────────────────────────────────
    const rolePermissionData = Object.entries(DEFAULT_ROLE_PERMISSIONS).flatMap(
      ([roleSlug, permissionSlugs]) => {
        const roleId = appRoles[roleSlug]?.id;
        if (!roleId) return [];
        return permissionSlugs
          .map((permSlug) => {
            const permissionId = permissionMap[permSlug];
            if (!permissionId) return null;
            return { role_id: roleId, permission_id: permissionId };
          })
          .filter(
            (x): x is { role_id: string; permission_id: string } => x !== null,
          );
      },
    );
    await prisma.appRolePermission.createMany({
      data: rolePermissionData,
      skipDuplicates: true,
    });
    console.log('✓ Role permissions assigned');

    // ── 10. Default Approval Workflows ──────────────────────────────────────────
    const hrRoleId = appRoles['hr']?.id ?? null;
    const ceoRoleId = appRoles['ceo']?.id ?? null;
    for (const wf of [
      {
        name: 'Workforce Plan Approval',
        entity_type: 'WorkforcePlan' as const,
        stages: [
          {
            stage_order: 0,
            stage_name: 'HR Review',
            approver_role_id: hrRoleId,
            is_mandatory: true,
          },
          {
            stage_order: 1,
            stage_name: 'CEO Approval',
            approver_role_id: ceoRoleId,
            is_mandatory: true,
          },
        ],
      },
      {
        name: 'Recruitment Request Approval',
        entity_type: 'RecruitmentRequest' as const,
        stages: [
          {
            stage_order: 0,
            stage_name: 'HR Review',
            approver_role_id: hrRoleId,
            is_mandatory: true,
          },
        ],
      },
    ]) {
      const existing = await prisma.approvalWorkflow.findFirst({
        where: {
          company_id: company.id,
          entity_type: wf.entity_type,
          name: wf.name,
        },
      });
      const workflow = existing
        ? await prisma.approvalWorkflow.update({
            where: { id: existing.id },
            data: { is_active: true },
          })
        : await prisma.approvalWorkflow.create({
            data: {
              company_id: company.id,
              name: wf.name,
              entity_type: wf.entity_type,
              is_active: true,
            },
          });
      await prisma.approvalWorkflowStage.deleteMany({
        where: { workflow_id: workflow.id },
      });
      await prisma.approvalWorkflowStage.createMany({
        data: wf.stages.map((s) => ({ ...s, workflow_id: workflow.id })),
      });
    }
    console.log('✓ Approval workflows created');

    // ── 11. Users ────────────────────────────────────────────────────────────────
    const userEntries = [
      {
        email: 'ceo1@erms.com',
        first_name: 'Alice',
        last_name: 'Admasu',
        roleSlugs: ['ceo'],
      },
      {
        email: 'ceo2@erms.com',
        first_name: 'Bob',
        last_name: 'Bekele',
        roleSlugs: ['ceo'],
      },
      {
        email: 'ceo3@erms.com',
        first_name: 'Charlie',
        last_name: 'Chala',
        roleSlugs: ['ceo'],
      },
      {
        email: 'hradmin1@erms.com',
        first_name: 'David',
        last_name: 'Daniel',
        roleSlugs: ['hr_admin'],
      },
      {
        email: 'hradmin2@erms.com',
        first_name: 'Emma',
        last_name: 'Eshatu',
        roleSlugs: ['hr_admin'],
      },
      {
        email: 'hradmin3@erms.com',
        first_name: 'Fiona',
        last_name: 'Fikru',
        roleSlugs: ['hr_admin'],
      },
      {
        email: 'hr1@erms.com',
        first_name: 'Grace',
        last_name: 'Girma',
        roleSlugs: ['hr'],
      },
      {
        email: 'hr2@erms.com',
        first_name: 'Henry',
        last_name: 'Hagos',
        roleSlugs: ['hr'],
      },
      {
        email: 'hr3@erms.com',
        first_name: 'Isabella',
        last_name: 'Ibrahim',
        roleSlugs: ['hr'],
      },
      {
        email: 'recruiter1@erms.com',
        first_name: 'Jack',
        last_name: 'Joseph',
        roleSlugs: ['recruiter'],
      },
      {
        email: 'recruiter2@erms.com',
        first_name: 'Karen',
        last_name: 'Kebede',
        roleSlugs: ['recruiter'],
      },
      {
        email: 'recruiter3@erms.com',
        first_name: 'Leo',
        last_name: 'Lema',
        roleSlugs: ['recruiter'],
      },
      {
        email: 'hm1@erms.com',
        first_name: 'Maya',
        last_name: 'Mulugeta',
        roleSlugs: ['hiring_manager'],
      },
      {
        email: 'hm2@erms.com',
        first_name: 'Noah',
        last_name: 'Negasi',
        roleSlugs: ['hiring_manager'],
      },
      {
        email: 'hm3@erms.com',
        first_name: 'Olivia',
        last_name: 'Oumer',
        roleSlugs: ['hiring_manager'],
      },
      {
        email: 'dm1@erms.com',
        first_name: 'Paul',
        last_name: 'Petros',
        roleSlugs: ['department_manager'],
      },
      {
        email: 'dm2@erms.com',
        first_name: 'Quinn',
        last_name: 'Qasile',
        roleSlugs: ['department_manager'],
      },
      {
        email: 'dm3@erms.com',
        first_name: 'Rachel',
        last_name: 'Rediet',
        roleSlugs: ['department_manager'],
      },
      {
        email: 'interviewer1@erms.com',
        first_name: 'Sam',
        last_name: 'Samuel',
        roleSlugs: ['interviewer'],
      },
      {
        email: 'interviewer2@erms.com',
        first_name: 'Tina',
        last_name: 'Tsegaye',
        roleSlugs: ['interviewer'],
      },
      {
        email: 'interviewer3@erms.com',
        first_name: 'Victor',
        last_name: 'Vasilis',
        roleSlugs: ['interviewer'],
      },
      {
        email: 'canduser1@erms.com',
        first_name: 'Wendy',
        last_name: 'Worku',
        roleSlugs: ['candidate'],
      },
      {
        email: 'canduser2@erms.com',
        first_name: 'Xavier',
        last_name: 'Xo',
        roleSlugs: ['candidate'],
      },
      {
        email: 'canduser3@erms.com',
        first_name: 'Yasmine',
        last_name: 'Yasin',
        roleSlugs: ['candidate'],
      },
    ];

    const seededUsers: Record<string, any> = {};
    for (const entry of userEntries) {
      const dbUser = await prisma.user.create({
        data: {
          company_id: company.id,
          first_name: entry.first_name,
          last_name: entry.last_name,
          email: entry.email,
          phone: '+251 911 000 000',
          password_hash: passwordHash,
          is_active: true,
          terms_accepted: true,
          is_email_verified: true,
        },
      });
      seededUsers[entry.email] = dbUser;
      await prisma.appUserRole.createMany({
        data: entry.roleSlugs.map((slug) => ({
          user_id: dbUser.id,
          role_id: appRoles[slug].id,
        })),
        skipDuplicates: true,
      });
      await prisma.phone.create({
        data: {
          company_id: company.id,
          user_id: dbUser.id,
          phone_number: '+251 911 000 000',
          phone_type: 'PRIVATE',
          is_primary: true,
        },
      });
      await prisma.address.create({
        data: {
          company_id: company.id,
          user_id: dbUser.id,
          region: 'Addis Ababa',
          city: 'Addis Ababa',
        },
      });
    }
    console.log('✓ Users created (3 per role + 3 candidate portal users)');

    // ── 12. Departments ─────────────────────────────────────────────────────────
    const departmentMap: Record<string, any> = {};
    for (const dept of [
      { name: 'Engineering', managerEmail: 'dm1@erms.com' },
      { name: 'Human Resources', managerEmail: 'hr1@erms.com' },
      { name: 'Sales', managerEmail: 'dm3@erms.com' },
      { name: 'Finance', managerEmail: 'dm2@erms.com' },
      { name: 'Marketing', managerEmail: 'hradmin1@erms.com' },
      { name: 'Customer Support', managerEmail: 'interviewer3@erms.com' },
    ]) {
      departmentMap[dept.name] = await prisma.department.create({
        data: {
          company_id: company.id,
          name: dept.name,
          manager_id: seededUsers[dept.managerEmail]?.id,
        },
      });
    }
    console.log('✓ Departments created (6)');

    // ── 13. Workforce Plans — 2 per status ──────────────────────────────────────
    const seededPlanItems: any[] = [];
    const wfpStatuses: WorkforcePlanStatus[] = [
      'DRAFT',
      'SUBMITTED',
      'UNDER_HR_REVIEW',
      'UNDER_CEO_REVIEW',
      'APPROVED',
      'REJECTED',
      'RETURNED_FOR_REVISION',
      'CLOSED',
    ];
    const planAssignments = [
      { creatorEmail: 'dm1@erms.com', deptName: 'Engineering' },
      { creatorEmail: 'hr1@erms.com', deptName: 'Human Resources' },
      { creatorEmail: 'dm3@erms.com', deptName: 'Sales' },
      { creatorEmail: 'dm2@erms.com', deptName: 'Finance' },
    ];
    const approvers = ['ceo1@erms.com', 'hradmin1@erms.com'];
    let planIndex = 1;

    for (const status of wfpStatuses) {
      for (let i = 1; i <= 2; i++) {
        const assignment = planAssignments[planIndex % planAssignments.length];
        const creatorUser = seededUsers[assignment.creatorEmail];
        const approverUser =
          seededUsers[approvers[planIndex % approvers.length]];
        const dept = departmentMap[assignment.deptName];

        const plan = await prisma.workforcePlan.create({
          data: {
            company_id: company.id,
            title: `FY2026 ${assignment.deptName} Workforce Plan — ${status} #${i}`,
            planning_period: 'QUARTERLY',
            planning_quarter: 'Q2',
            planning_year: 2026,
            status,
            created_by_user_id: creatorUser.id,
            approved_by_user_id: [
              'APPROVED',
              'CLOSED',
              'UNDER_CEO_REVIEW',
            ].includes(status)
              ? approverUser.id
              : null,
            approval_date: ['APPROVED', 'CLOSED'].includes(status)
              ? new Date()
              : null,
            justification: `Workforce expansion plan for ${assignment.deptName} — status: ${status}.`,
            version_number: 1,
            business_unit: `${assignment.deptName} Ops`,
            submitted_at: status !== 'DRAFT' ? new Date() : null,
            hr_comments:
              status === 'RETURNED_FOR_REVISION'
                ? 'Please align salary budget with HR guidelines before resubmitting.'
                : null,
            ceo_comments:
              status === 'REJECTED'
                ? 'Rejected due to quarterly budget overruns. Please revise headcount.'
                : null,
            returned_comments:
              status === 'RETURNED_FOR_REVISION'
                ? 'Budget figures need revision.'
                : null,
            returned_at: status === 'RETURNED_FOR_REVISION' ? new Date() : null,
            returned_by_user_id:
              status === 'RETURNED_FOR_REVISION'
                ? seededUsers['hr1@erms.com'].id
                : null,
          },
        });

        const item1 = await prisma.workforcePlanItem.create({
          data: {
            workforce_plan_id: plan.id,
            department_id: dept.id,
            job_title: `${assignment.deptName} Specialist`,
            employment_type: 'FULL_TIME',
            headcount: 2,
            planned_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            justification: 'Increased project roadmap requirements.',
            job_grade: 'Grade 8',
            salary_budget: new Prisma.Decimal(5000),
            priority: 'HIGH',
            position_type: 'NEW',
          },
        });
        const item2 = await prisma.workforcePlanItem.create({
          data: {
            workforce_plan_id: plan.id,
            department_id: dept.id,
            job_title: `Lead ${assignment.deptName} Consultant`,
            employment_type: 'CONTRACT',
            headcount: 1,
            planned_start: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            justification: 'Expert advisory support needed.',
            job_grade: 'Grade 10',
            salary_budget: new Prisma.Decimal(9500),
            priority: 'CRITICAL',
            position_type: 'REPLACEMENT',
          },
        });
        seededPlanItems.push(item1, item2);

        // Approval history
        if (status !== 'DRAFT') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'SUBMITTED',
              actor_user_id: creatorUser.id,
              comments: 'Submitted for review.',
            },
          });
        }
        if (
          [
            'UNDER_HR_REVIEW',
            'UNDER_CEO_REVIEW',
            'APPROVED',
            'REJECTED',
            'CLOSED',
          ].includes(status)
        ) {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'REVIEWED',
              actor_user_id: seededUsers['hr1@erms.com'].id,
              comments: 'HR reviewed and forwarded.',
            },
          });
        }
        if (['APPROVED', 'CLOSED'].includes(status)) {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'APPROVED',
              actor_user_id: approverUser.id,
              comments: 'Approved by CEO.',
            },
          });
        }
        if (status === 'REJECTED') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'REJECTED',
              actor_user_id: approverUser.id,
              comments: 'Rejected due to budget overruns.',
            },
          });
        }
        if (status === 'RETURNED_FOR_REVISION') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'RETURNED_FOR_REVISION',
              actor_user_id: seededUsers['hr1@erms.com'].id,
              comments: 'Budget figures need revision.',
            },
          });
        }
        planIndex++;
      }
    }
    console.log(
      '✓ Workforce plans created (2 per status × 8 statuses = 16 plans)',
    );

    // ── 14. Recruitment Requests — 2 per status ─────────────────────────────────
    const rrStatuses: RecruitmentRequestStatus[] = [
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ];
    const rrRequesterEmails = ['hm1@erms.com', 'hm2@erms.com', 'hm3@erms.com'];
    const rrDepts = ['Engineering', 'Sales', 'Human Resources', 'Finance'];
    let requestIndex = 1;

    for (const rrStatus of rrStatuses) {
      for (let i = 1; i <= 2; i++) {
        const requester =
          seededUsers[
            rrRequesterEmails[requestIndex % rrRequesterEmails.length]
          ];
        const deptName = rrDepts[requestIndex % rrDepts.length];
        const dept = departmentMap[deptName];
        const wpi = seededPlanItems[requestIndex % seededPlanItems.length];
        const job_title = `${deptName} Analyst #${requestIndex}`;

        const rr = await prisma.recruitmentRequest.create({
          data: {
            company_id: company.id,
            planning_type: 'PLANNED',
            workforce_plan_item_id: wpi.id,
            requested_by_user_id: requester.id,
            department_id: dept.id,
            job_title,
            position_name: job_title,
            employment_type: 'FULL_TIME',
            request_type: 'NEW_HEADCOUNT',
            justification: `Core headcount addition for ${deptName} team.`,
            status: rrStatus,
            priority: 'MEDIUM',
            request_number: `REQ-2026-${String(requestIndex).padStart(3, '0')}`,
            approved_by_user_id:
              rrStatus === 'APPROVED'
                ? seededUsers['hradmin1@erms.com'].id
                : null,
            hr_comments:
              rrStatus === 'REJECTED'
                ? 'Position already filled or lack of approved budget.'
                : null,
          },
        });

        if (rrStatus !== 'DRAFT' && rrStatus !== 'CANCELLED') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'RecruitmentRequest',
              entity_id: rr.id,
              action: 'SUBMITTED',
              actor_user_id: requester.id,
              comments: 'Submitted for HR review.',
            },
          });
        }
        if (rrStatus === 'APPROVED') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'RecruitmentRequest',
              entity_id: rr.id,
              action: 'APPROVED',
              actor_user_id: seededUsers['hradmin1@erms.com'].id,
              comments: 'Approved. Proceed with vacancy creation.',
            },
          });
        }
        if (rrStatus === 'REJECTED') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'RecruitmentRequest',
              entity_id: rr.id,
              action: 'REJECTED',
              actor_user_id: seededUsers['hr1@erms.com'].id,
              comments: 'Budget not available for this quarter.',
            },
          });
        }
        requestIndex++;
      }
    }
    console.log(
      '✓ Recruitment requests created (2 per status × 6 statuses = 12 requests)',
    );

    // ── 15. Vacancies — 2 per status + 6 dedicated PUBLISHED vacancies for Browse ─
    const vacancyStatuses: VacancyStatus[] = [
      'DRAFT',
      'OPEN',
      'PUBLISHED',
      'IN_PROGRESS',
      'ON_HOLD',
      'CLOSED',
      'CANCELLED',
    ];
    const seededVacancies: any[] = [];
    let vacIndex = 1;

    // Helper to create a backing recruitment request for a vacancy
    const makeBackingRR = async (
      deptName: string,
      jobTitle: string,
      idx: number,
    ) => {
      return await prisma.recruitmentRequest.create({
        data: {
          company_id: company.id,
          planning_type: 'PLANNED',
          requested_by_user_id: seededUsers['hm1@erms.com'].id,
          department_id: departmentMap[deptName].id,
          job_title: jobTitle,
          position_name: jobTitle,
          employment_type: 'FULL_TIME',
          request_type: 'NEW_HEADCOUNT',
          justification: 'Backing vacancy for seed data.',
          status: 'APPROVED',
          priority: 'HIGH',
          request_number: `REQ-VAC-2026-${String(idx).padStart(3, '0')}`,
          approved_by_user_id: seededUsers['ceo1@erms.com'].id,
        },
      });
    };

    // 2 per status
    for (const vacStatus of vacancyStatuses) {
      for (let v = 1; v <= 2; v++) {
        const deptName = rrDepts[vacIndex % rrDepts.length];
        const dept = departmentMap[deptName];
        const job_title = `${deptName} ${vacStatus === 'IN_PROGRESS' ? 'Engineer' : 'Specialist'} (${vacStatus} #${v})`;
        const isPublicFacing = ['PUBLISHED', 'IN_PROGRESS', 'OPEN'].includes(
          vacStatus,
        );

        const rr = await makeBackingRR(deptName, job_title, vacIndex);
        const vac = await prisma.vacancy.create({
          data: {
            company_id: company.id,
            recruitment_request_id: rr.id,
            title: job_title,
            department_id: dept.id,
            location: 'Addis Ababa',
            employment_type: 'FULL_TIME',
            status: vacStatus,
            posting_status: isPublicFacing ? 'PUBLISHED' : 'DRAFT',
            open_positions: 2,
            description: `We are looking for a qualified ${deptName} professional. This is a ${vacStatus.toLowerCase().replace(/_/g, ' ')} vacancy. Join our growing team and make an impact in a dynamic environment.`,
            responsibilities:
              'Participate in team meetings, deliver assigned work, and contribute to department goals.',
            requirements:
              'Bachelor degree in a relevant field and 3+ years of experience.',
            required_qualifications: 'BSc in relevant discipline.',
            required_experience: 3,
            vacancy_number: `VAC-2026-${String(vacIndex).padStart(3, '0')}`,
            posted_at: isPublicFacing
              ? new Date(Date.now() - vacIndex * 7 * 24 * 60 * 60 * 1000)
              : null,
            opening_date: isPublicFacing
              ? new Date(Date.now() - vacIndex * 7 * 24 * 60 * 60 * 1000)
              : null,
            closing_date: isPublicFacing
              ? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
              : null,
            approved_at: isPublicFacing ? new Date() : null,
            closed_at: vacStatus === 'CLOSED' ? new Date() : null,
          },
        });
        seededVacancies.push(vac);
        vacIndex++;
      }
    }
    // seededVacancies[0..1]  = DRAFT
    // seededVacancies[2..3]  = OPEN  (posting_status: PUBLISHED)
    // seededVacancies[4..5]  = PUBLISHED (posting_status: PUBLISHED)
    // seededVacancies[6..7]  = IN_PROGRESS (posting_status: PUBLISHED)
    // seededVacancies[8..9]  = ON_HOLD
    // seededVacancies[10..11] = CLOSED
    // seededVacancies[12..13] = CANCELLED

    // ── 6 dedicated "Browse Jobs" PUBLISHED vacancies for canduser1 to see ──────
    const browseVacancyDefs = [
      {
        title: 'Senior Software Engineer',
        dept: 'Engineering',
        employType: 'FULL_TIME' as const,
        exp: 5,
        salary: 8000,
        tag: 'SWE-Sr',
      },
      {
        title: 'Junior Frontend Developer',
        dept: 'Engineering',
        employType: 'FULL_TIME' as const,
        exp: 1,
        salary: 4500,
        tag: 'FE-Jr',
      },
      {
        title: 'Data Analyst',
        dept: 'Finance',
        employType: 'FULL_TIME' as const,
        exp: 3,
        salary: 6000,
        tag: 'DA',
      },
      {
        title: 'HR Coordinator',
        dept: 'Human Resources',
        employType: 'FULL_TIME' as const,
        exp: 2,
        salary: 5000,
        tag: 'HR-Coord',
      },
      {
        title: 'Marketing Specialist',
        dept: 'Marketing',
        employType: 'FULL_TIME' as const,
        exp: 3,
        salary: 5500,
        tag: 'MKT',
      },
      {
        title: 'Customer Support Lead',
        dept: 'Customer Support',
        employType: 'FULL_TIME' as const,
        exp: 2,
        salary: 4800,
        tag: 'CS-Lead',
      },
    ];

    const browseVacancies: any[] = [];
    for (const bv of browseVacancyDefs) {
      const rr = await makeBackingRR(bv.dept, bv.title, vacIndex);
      const vac = await prisma.vacancy.create({
        data: {
          company_id: company.id,
          recruitment_request_id: rr.id,
          title: bv.title,
          department_id: departmentMap[bv.dept].id,
          location: 'Addis Ababa',
          employment_type: bv.employType,
          status: 'PUBLISHED',
          posting_status: 'PUBLISHED',
          open_positions: 3,
          description: `We are seeking a talented ${bv.title} to join our ${bv.dept} team. You will work on challenging projects, collaborate with a talented team, and have the opportunity to grow your career in a fast-paced environment. We offer competitive salary, flexible working hours, and excellent benefits.`,
          responsibilities: `Lead ${bv.dept.toLowerCase()} initiatives, collaborate with cross-functional teams, and deliver high-quality work that meets organizational goals.`,
          requirements: `${bv.exp}+ years of relevant experience, strong communication skills, and a passion for continuous learning.`,
          required_qualifications: `Bachelor's degree in a relevant field. Master's degree is a plus.`,
          required_experience: bv.exp,
          vacancy_number: `VAC-BROWSE-2026-${String(vacIndex).padStart(3, '0')}`,
          posted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          opening_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          approved_at: new Date(),
        },
      });
      browseVacancies.push(vac);
      vacIndex++;
    }
    // Total vacancies: seededVacancies (14) + browseVacancies (6) = 20
    // PUBLISHED ones visible to candidates: indices 2,3,4,5,6,7 + all 6 browse = 12 vacancies
    console.log(
      `✓ Vacancies created (${seededVacancies.length} status-coverage + ${browseVacancies.length} browse-ready = ${seededVacancies.length + browseVacancies.length} total)`,
    );

    // ── 16. Candidates (anonymous 10) ───────────────────────────────────────────
    const candidateData = [
      {
        email: 'cand1@erms.com',
        first_name: 'Dawit',
        last_name: 'Abebe',
        expYears: 5,
        gender: 'MALE' as const,
      },
      {
        email: 'cand2@erms.com',
        first_name: 'Solomon',
        last_name: 'Kassa',
        expYears: 3,
        gender: 'MALE' as const,
      },
      {
        email: 'cand3@erms.com',
        first_name: 'Tigist',
        last_name: 'Bekele',
        expYears: 6,
        gender: 'FEMALE' as const,
      },
      {
        email: 'cand4@erms.com',
        first_name: 'Eleni',
        last_name: 'Tadesse',
        expYears: 2,
        gender: 'FEMALE' as const,
      },
      {
        email: 'cand5@erms.com',
        first_name: 'Yared',
        last_name: 'Getachew',
        expYears: 7,
        gender: 'MALE' as const,
      },
      {
        email: 'cand6@erms.com',
        first_name: 'Aster',
        last_name: 'Asefa',
        expYears: 4,
        gender: 'FEMALE' as const,
      },
      {
        email: 'cand7@erms.com',
        first_name: 'Mulu',
        last_name: 'Tesfaye',
        expYears: 8,
        gender: 'FEMALE' as const,
      },
      {
        email: 'cand8@erms.com',
        first_name: 'Zenebe',
        last_name: 'Negash',
        expYears: 1,
        gender: 'MALE' as const,
      },
      {
        email: 'cand9@erms.com',
        first_name: 'Fikre',
        last_name: 'Mariam',
        expYears: 10,
        gender: 'MALE' as const,
      },
      {
        email: 'cand10@erms.com',
        first_name: 'Tsige',
        last_name: 'Desta',
        expYears: 5,
        gender: 'FEMALE' as const,
      },
    ];

    const seededCandidates: any[] = [];
    for (const cand of candidateData) {
      const dbCand = await prisma.candidate.create({
        data: {
          company_id: company.id,
          first_name: cand.first_name,
          last_name: cand.last_name,
          email: cand.email,
          phone: '+251 912 000 000',
          password_hash: passwordHash,
          gender: cand.gender,
          nationality: 'Ethiopian',
          current_address: 'Addis Ababa, Ethiopia',
          years_of_experience: cand.expYears,
          current_employer: 'Tech Ethiopia PLC',
          current_position: 'Software Developer',
          skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
          languages: ['Amharic', 'English'],
          availability_status: 'IMMEDIATELY',
          expected_salary: new Prisma.Decimal(5000 + cand.expYears * 500),
          preferred_job_category: 'Software Engineering',
          preferred_location: 'Addis Ababa',
          is_email_verified: true,
          terms_accepted: true,
        },
      });
      seededCandidates.push(dbCand);

      await prisma.experience.create({
        data: {
          candidate_id: dbCand.id,
          company_name: 'Tech Ethiopia PLC',
          job_title: 'Software Developer',
          start_date: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000 * cand.expYears,
          ),
          end_date: new Date(),
          total_months: cand.expYears * 12,
          description: 'Designed API services and scaled databases.',
        },
      });
      await prisma.education.create({
        data: {
          candidate_id: dbCand.id,
          degree: 'BACHELOR',
          field_of_study: 'Software Engineering',
          graduation_year: 2021,
          institution_name: 'Addis Ababa University',
        },
      });
      await prisma.candidateCertification.create({
        data: {
          candidate_id: dbCand.id,
          name: 'AWS Certified Developer',
          issuing_organization: 'Amazon Web Services',
          issue_date: new Date('2023-01-15'),
          expiration_date: new Date('2026-01-15'),
        },
      });
      await prisma.candidateDocument.create({
        data: {
          candidate_id: dbCand.id,
          company_id: company.id,
          cv: ['https://storage.erms.com/cv/placeholder.pdf'],
        },
      });
      await prisma.phone.create({
        data: {
          company_id: company.id,
          candidate_id: dbCand.id,
          phone_number: '+251 912 000 000',
          phone_type: 'PRIVATE',
          is_primary: true,
        },
      });
      await prisma.address.create({
        data: {
          company_id: company.id,
          candidate_id: dbCand.id,
          region: 'Addis Ababa',
          city: 'Addis Ababa',
          sub_city: 'Bole',
        },
      });
    }
    console.log('✓ Background candidates created (10 with full profiles)');

    // ── 17. Candidate Portal Users ──────────────────────────────────────────────
    // canduser1 / canduser2 / canduser3: rich profiles with ALL data pre-seeded
    const candidatePortalDefs = [
      {
        email: 'canduser1@erms.com',
        nationality: 'Ethiopian',
        current_address: 'Bole, Addis Ababa',
        gender: 'FEMALE' as const,
        date_of_birth: new Date('1998-04-12'),
        years_of_experience: 4,
        current_employer: 'SoftSolutions Ltd',
        current_position: 'Junior Software Engineer',
        preferred_job_category: 'Software Engineering',
        preferred_location: 'Addis Ababa',
        expected_salary: 4500,
        skills: ['JavaScript', 'HTML5', 'CSS3', 'React', 'Git'],
        languages: ['Amharic', 'English'],
        phone_number: '+251 911 123 456',
        certifications: [
          {
            name: 'Google Cloud Associate',
            org: 'Google',
            issued: '2023-06-01',
            expires: '2026-06-01',
          },
          {
            name: 'React Developer Certificate',
            org: 'Meta',
            issued: '2022-09-01',
            expires: null,
          },
        ],
        experiences: [
          {
            company: 'SoftSolutions Ltd',
            title: 'Junior Software Engineer',
            startYearsAgo: 4,
            desc: 'Built React web applications and REST APIs.',
          },
          {
            company: 'Startup ET',
            title: 'Intern Developer',
            startYearsAgo: 5,
            desc: 'Frontend development and bug fixing.',
          },
        ],
        educations: [
          {
            degree: 'BACHELOR' as const,
            field: 'Computer Science',
            year: 2021,
            institution: 'Addis Ababa University',
          },
        ],
      },
      {
        email: 'canduser2@erms.com',
        nationality: 'Kenyan',
        current_address: 'Kilimani, Nairobi',
        gender: 'MALE' as const,
        date_of_birth: new Date('1994-08-20'),
        years_of_experience: 6,
        current_employer: 'FinTech East Africa',
        current_position: 'Backend Developer',
        preferred_job_category: 'Backend Engineering',
        preferred_location: 'Nairobi',
        expected_salary: 6000,
        skills: ['TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Redis'],
        languages: ['English', 'Swahili'],
        phone_number: '+254 700 123 456',
        certifications: [
          {
            name: 'AWS Solutions Architect',
            org: 'Amazon Web Services',
            issued: '2022-03-01',
            expires: '2025-03-01',
          },
        ],
        experiences: [
          {
            company: 'FinTech East Africa',
            title: 'Backend Developer',
            startYearsAgo: 6,
            desc: 'Designed microservices and payment gateway integrations.',
          },
        ],
        educations: [
          {
            degree: 'BACHELOR' as const,
            field: 'Information Technology',
            year: 2019,
            institution: 'University of Nairobi',
          },
        ],
      },
      {
        email: 'canduser3@erms.com',
        nationality: 'American',
        current_address: 'Seattle, WA',
        gender: 'OTHER' as const,
        date_of_birth: new Date('1991-11-03'),
        years_of_experience: 8,
        current_employer: 'CloudScale Inc',
        current_position: 'Senior DevOps Engineer',
        preferred_job_category: 'DevOps & Infrastructure',
        preferred_location: 'Remote',
        expected_salary: 9500,
        skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Python'],
        languages: ['English'],
        phone_number: '+1 206 555 0100',
        certifications: [
          {
            name: 'Certified Kubernetes Administrator',
            org: 'CNCF',
            issued: '2021-01-01',
            expires: '2024-01-01',
          },
          {
            name: 'AWS DevOps Professional',
            org: 'Amazon Web Services',
            issued: '2022-11-01',
            expires: '2025-11-01',
          },
        ],
        experiences: [
          {
            company: 'CloudScale Inc',
            title: 'Senior DevOps Engineer',
            startYearsAgo: 8,
            desc: 'Managed Kubernetes clusters and CI/CD pipelines at scale.',
          },
          {
            company: 'StartupX',
            title: 'DevOps Engineer',
            startYearsAgo: 11,
            desc: 'Set up infrastructure monitoring and deployment automation.',
          },
        ],
        educations: [
          {
            degree: 'MASTER' as const,
            field: 'Computer Science',
            year: 2016,
            institution: 'University of Washington',
          },
          {
            degree: 'BACHELOR' as const,
            field: 'Computer Engineering',
            year: 2014,
            institution: 'University of Washington',
          },
        ],
      },
    ];

    const seededPortalCandidates: Record<string, any> = {};
    for (const cpUser of candidatePortalDefs) {
      const user = seededUsers[cpUser.email];
      if (!user) continue;

      let candidate = await prisma.candidate.findUnique({
        where: { email: cpUser.email },
      });
      if (!candidate) {
        candidate = await prisma.candidate.create({
          data: {
            company_id: company.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: cpUser.email,
            password_hash: passwordHash,
            phone: cpUser.phone_number,
            is_email_verified: true,
            terms_accepted: true,
            nationality: cpUser.nationality,
            current_address: cpUser.current_address,
            gender: cpUser.gender,
            date_of_birth: cpUser.date_of_birth,
            years_of_experience: cpUser.years_of_experience,
            current_employer: cpUser.current_employer,
            current_position: cpUser.current_position,
            preferred_job_category: cpUser.preferred_job_category,
            preferred_location: cpUser.preferred_location,
            expected_salary: new Prisma.Decimal(cpUser.expected_salary),
            skills: cpUser.skills,
            languages: cpUser.languages,
            availability_status: 'IMMEDIATELY',
          },
        });
      }
      seededPortalCandidates[cpUser.email] = candidate;

      // Experiences
      for (const exp of cpUser.experiences) {
        await prisma.experience.create({
          data: {
            candidate_id: candidate.id,
            company_name: exp.company,
            job_title: exp.title,
            start_date: new Date(
              Date.now() - exp.startYearsAgo * 365 * 24 * 60 * 60 * 1000,
            ),
            description: exp.desc,
            total_months:
              (exp.startYearsAgo -
                (cpUser.experiences.indexOf(exp) === 0
                  ? 0
                  : cpUser.experiences[0].startYearsAgo -
                    cpUser.years_of_experience)) *
              12,
          },
        });
      }

      // Educations
      for (const edu of cpUser.educations) {
        await prisma.education.create({
          data: {
            candidate_id: candidate.id,
            degree: edu.degree,
            field_of_study: edu.field,
            graduation_year: edu.year,
            institution_name: edu.institution,
          },
        });
      }

      // Certifications
      for (const cert of cpUser.certifications) {
        await prisma.candidateCertification.create({
          data: {
            candidate_id: candidate.id,
            name: cert.name,
            issuing_organization: cert.org,
            issue_date: new Date(cert.issued),
            expiration_date: cert.expires ? new Date(cert.expires) : null,
          },
        });
      }

      // Documents
      await prisma.candidateDocument.upsert({
        where: { candidate_id: candidate.id },
        update: {},
        create: {
          candidate_id: candidate.id,
          company_id: company.id,
          cv: ['https://storage.erms.com/cv/portal-user.pdf'],
          id_documents: ['https://storage.erms.com/certs/gca.pdf'],
        },
      });

      // Phone
      await prisma.phone.create({
        data: {
          company_id: company.id,
          candidate_id: candidate.id,
          phone_number: cpUser.phone_number,
          phone_type: 'PRIVATE',
          is_primary: true,
        },
      });

      // Address
      await prisma.address.create({
        data: {
          company_id: company.id,
          candidate_id: candidate.id,
          region: cpUser.nationality,
          city: cpUser.current_address.split(',')[0].trim(),
        },
      });
    }
    console.log(
      '✓ Portal candidate profiles created (canduser1, canduser2, canduser3) with full profiles',
    );

    // ── 18. Interview Categories ─────────────────────────────────────────────────
    const seededCategories: Record<string, { id: string }> = {};
    for (const category of [
      {
        name: 'HR Interview',
        description: 'General HR stage',
        is_default: true,
      },
      {
        name: 'Technical Interview',
        description: 'Role-specific technical stage',
        is_default: false,
      },
      {
        name: 'Managerial Interview',
        description: 'Line manager/leadership panel',
        is_default: false,
      },
      {
        name: 'Final Interview',
        description: 'Final decision interview stage',
        is_default: false,
      },
    ]) {
      seededCategories[category.name] = await prisma.interviewCategory.upsert({
        where: {
          company_id_name: { company_id: company.id, name: category.name },
        },
        update: {
          description: category.description,
          is_default: category.is_default,
          is_active: true,
        },
        create: {
          company_id: company.id,
          name: category.name,
          description: category.description,
          is_default: category.is_default,
          is_active: true,
        },
      });
    }
    const catHR = seededCategories['HR Interview'];
    const catTech = seededCategories['Technical Interview'];
    const catMgr = seededCategories['Managerial Interview'];
    const catFinal = seededCategories['Final Interview'];
    console.log('✓ Interview categories created');

    // ── 19. Evaluation Templates ─────────────────────────────────────────────────
    const standardTemplate = await prisma.interviewEvaluationTemplate.create({
      data: {
        company_id: company.id,
        interview_category_id: null,
        name: 'Standard Interview',
        is_active: true,
      },
    });
    await prisma.evaluationCriteria.createMany({
      data: [
        {
          template_id: standardTemplate.id,
          name: 'Technical Skills',
          weight: new Prisma.Decimal(40),
          max_score: 10,
          order: 1,
        },
        {
          template_id: standardTemplate.id,
          name: 'Communication',
          weight: new Prisma.Decimal(30),
          max_score: 10,
          order: 2,
        },
        {
          template_id: standardTemplate.id,
          name: 'Cultural Fit',
          weight: new Prisma.Decimal(30),
          max_score: 10,
          order: 3,
        },
      ],
    });

    const hrEvalTemplate = await prisma.interviewEvaluationTemplate.create({
      data: {
        company_id: company.id,
        interview_category_id: catHR.id,
        name: 'HR Interview Template',
        is_active: true,
      },
    });
    await prisma.evaluationCriteria.createMany({
      data: [
        {
          template_id: hrEvalTemplate.id,
          name: 'Communication',
          weight: new Prisma.Decimal(30),
          max_score: 10,
          order: 1,
        },
        {
          template_id: hrEvalTemplate.id,
          name: 'Culture Fit',
          weight: new Prisma.Decimal(30),
          max_score: 10,
          order: 2,
        },
        {
          template_id: hrEvalTemplate.id,
          name: 'Motivation',
          weight: new Prisma.Decimal(40),
          max_score: 10,
          order: 3,
        },
      ],
    });

    const techEvalTemplate = await prisma.interviewEvaluationTemplate.create({
      data: {
        company_id: company.id,
        interview_category_id: catTech.id,
        name: 'Technical Interview Template',
        is_active: true,
      },
    });
    await prisma.evaluationCriteria.createMany({
      data: [
        {
          template_id: techEvalTemplate.id,
          name: 'Technical Skills',
          weight: new Prisma.Decimal(50),
          max_score: 10,
          order: 1,
        },
        {
          template_id: techEvalTemplate.id,
          name: 'Problem Solving',
          weight: new Prisma.Decimal(30),
          max_score: 10,
          order: 2,
        },
        {
          template_id: techEvalTemplate.id,
          name: 'Experience',
          weight: new Prisma.Decimal(20),
          max_score: 10,
          order: 3,
        },
      ],
    });

    const mgrEvalTemplate = await prisma.interviewEvaluationTemplate.create({
      data: {
        company_id: company.id,
        interview_category_id: catMgr.id,
        name: 'Managerial Interview Template',
        is_active: true,
      },
    });
    await prisma.evaluationCriteria.createMany({
      data: [
        {
          template_id: mgrEvalTemplate.id,
          name: 'Leadership',
          weight: new Prisma.Decimal(40),
          max_score: 10,
          order: 1,
        },
        {
          template_id: mgrEvalTemplate.id,
          name: 'Decision Making',
          weight: new Prisma.Decimal(35),
          max_score: 10,
          order: 2,
        },
        {
          template_id: mgrEvalTemplate.id,
          name: 'Communication',
          weight: new Prisma.Decimal(25),
          max_score: 10,
          order: 3,
        },
      ],
    });
    console.log('✓ Evaluation templates and criteria created');

    // ── 20. Question Banks ───────────────────────────────────────────────────────
    const techBank = await prisma.interviewQuestionBank.create({
      data: {
        company_id: company.id,
        title: 'Backend Core Questions',
        interview_category_id: catTech.id,
      },
    });
    await prisma.interviewQuestion.createMany({
      data: [
        {
          bank_id: techBank.id,
          question: 'What is database transaction isolation level?',
          interview_category_id: catTech.id,
        },
        {
          bank_id: techBank.id,
          question: 'Describe standard HTTP status codes.',
          interview_category_id: catTech.id,
        },
        {
          bank_id: techBank.id,
          question: 'Explain horizontal vs vertical scaling.',
          interview_category_id: catTech.id,
        },
        {
          bank_id: techBank.id,
          question: 'How do you handle N+1 query problems in ORM?',
          interview_category_id: catTech.id,
        },
        {
          bank_id: techBank.id,
          question: 'Describe your experience with CI/CD pipelines.',
          interview_category_id: catTech.id,
        },
      ],
    });
    const hrBank = await prisma.interviewQuestionBank.create({
      data: {
        company_id: company.id,
        title: 'HR & Behavioral Questions',
        interview_category_id: catHR.id,
      },
    });
    await prisma.interviewQuestion.createMany({
      data: [
        {
          bank_id: hrBank.id,
          question: 'Tell me about yourself.',
          interview_category_id: catHR.id,
        },
        {
          bank_id: hrBank.id,
          question: 'Why do you want to work for Adiu?',
          interview_category_id: catHR.id,
        },
        {
          bank_id: hrBank.id,
          question: 'Describe a time you resolved a conflict at work.',
          interview_category_id: catHR.id,
        },
        {
          bank_id: hrBank.id,
          question: 'What are your long-term career goals?',
          interview_category_id: catHR.id,
        },
      ],
    });
    console.log('✓ Question banks created');

    // ── 21. Applications ─────────────────────────────────────────────────────────
    const seededApplications: any[] = [];

    async function createApp(
      candId: string,
      vacId: string,
      status: ApplicationStatus,
      stage: ApplicationStage,
      daysAgo = 0,
      sourceChannel?: string,
    ) {
      const app = await prisma.application.create({
        data: {
          company_id: company.id,
          candidate_id: candId,
          vacancy_id: vacId,
          status,
          current_stage: stage,
          recruitment_source_id: sourceChannel
            ? (recruitmentSourceMap[sourceChannel] ?? null)
            : null,
          submitted_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.applicationStageHistory.create({
        data: {
          application_id: app.id,
          from_stage: null,
          to_stage: stage,
          notes: `Seeded at ${stage}`,
        },
      });
      seededApplications.push(app);
      return app;
    }

    // Background candidates — all statuses
    const appSubmitted1 = await createApp(
      seededCandidates[0].id,
      seededVacancies[4].id,
      'SUBMITTED',
      'SCREENING',
      30,
      'LinkedIn',
    );
    const appSubmitted2 = await createApp(
      seededCandidates[1].id,
      seededVacancies[5].id,
      'SUBMITTED',
      'SCREENING',
      28,
      'Company Website',
    );
    const appScreening1 = await createApp(
      seededCandidates[2].id,
      seededVacancies[4].id,
      'UNDER_SCREENING',
      'SCREENING',
      25,
      'Indeed',
    );
    const appScreening2 = await createApp(
      seededCandidates[3].id,
      seededVacancies[5].id,
      'UNDER_SCREENING',
      'SCREENING',
      23,
      'Telegram',
    );
    const appShort1 = await createApp(
      seededCandidates[4].id,
      seededVacancies[6].id,
      'SHORTLISTED',
      'SHORTLISTING',
      20,
      'Employee Referral',
    );
    const appShort2 = await createApp(
      seededCandidates[5].id,
      seededVacancies[7].id,
      'SHORTLISTED',
      'SHORTLISTING',
      18,
      'LinkedIn',
    );
    const appIntSched1 = await createApp(
      seededCandidates[6].id,
      seededVacancies[6].id,
      'INTERVIEW_SCHEDULED',
      'INTERVIEW',
      15,
      'Facebook',
    );
    const appIntSched2 = await createApp(
      seededCandidates[7].id,
      seededVacancies[7].id,
      'INTERVIEW_SCHEDULED',
      'INTERVIEW',
      14,
      'Glassdoor',
    );
    const appIntComp1 = await createApp(
      seededCandidates[8].id,
      seededVacancies[6].id,
      'INTERVIEW_COMPLETED',
      'EVALUATION',
      10,
      'LinkedIn',
    );
    const appIntComp2 = await createApp(
      seededCandidates[9].id,
      seededVacancies[7].id,
      'INTERVIEW_COMPLETED',
      'EVALUATION',
      9,
      'Company Website',
    );
    const appEval1 = await createApp(
      seededCandidates[0].id,
      seededVacancies[2].id,
      'UNDER_EVALUATION',
      'EVALUATION',
      8,
      'Indeed',
    );
    const appEval2 = await createApp(
      seededCandidates[1].id,
      seededVacancies[3].id,
      'UNDER_EVALUATION',
      'EVALUATION',
      7,
      'Telegram',
    );
    const appSelected1 = await createApp(
      seededCandidates[2].id,
      seededVacancies[8].id,
      'SELECTED',
      'OFFER',
      6,
      'Employee Referral',
    );
    const appSelected2 = await createApp(
      seededCandidates[3].id,
      seededVacancies[9].id,
      'SELECTED',
      'OFFER',
      5,
      'LinkedIn',
    );
    const appOfferIssued1 = await createApp(
      seededCandidates[4].id,
      seededVacancies[8].id,
      'OFFER_ISSUED',
      'OFFER',
      4,
      'Facebook',
    );
    const appOfferIssued2 = await createApp(
      seededCandidates[5].id,
      seededVacancies[9].id,
      'OFFER_ISSUED',
      'OFFER',
      3,
      'Company Website',
    );
    const appOfferAcc1 = await createApp(
      seededCandidates[6].id,
      seededVacancies[10].id,
      'OFFER_ACCEPTED',
      'ONBOARDING',
      2,
      'LinkedIn',
    );
    const appOfferAcc2 = await createApp(
      seededCandidates[7].id,
      seededVacancies[11].id,
      'OFFER_ACCEPTED',
      'ONBOARDING',
      2,
      'Telegram',
    );
    const appOfferDec1 = await createApp(
      seededCandidates[8].id,
      seededVacancies[10].id,
      'OFFER_DECLINED',
      'OFFER',
      1,
      'Glassdoor',
    );
    const appOfferDec2 = await createApp(
      seededCandidates[9].id,
      seededVacancies[11].id,
      'OFFER_DECLINED',
      'OFFER',
      1,
      'Indeed',
    );
    const appRej1 = await createApp(
      seededCandidates[0].id,
      seededVacancies[6].id,
      'REJECTED',
      'CLOSED',
      12,
      'Company Website',
    );
    const appRej2 = await createApp(
      seededCandidates[1].id,
      seededVacancies[7].id,
      'REJECTED',
      'CLOSED',
      11,
      'LinkedIn',
    );
    const appRoster1 = await createApp(
      seededCandidates[2].id,
      seededVacancies[6].id,
      'MOVED_TO_TALENT_ROSTER',
      'CLOSED',
      5,
      'Employee Referral',
    );
    const appRoster2 = await createApp(
      seededCandidates[3].id,
      seededVacancies[7].id,
      'MOVED_TO_TALENT_ROSTER',
      'CLOSED',
      4,
      'Telegram',
    );

    // ── canduser1 applications — 11 statuses, all visible in portal ───────────
    const cu1 = seededPortalCandidates['canduser1@erms.com'];
    const cu1AppSubmitted = await createApp(
      cu1.id,
      browseVacancies[0].id,
      'SUBMITTED',
      'SCREENING',
      20,
      'Company Website',
    );
    const cu1AppScreening = await createApp(
      cu1.id,
      browseVacancies[1].id,
      'UNDER_SCREENING',
      'SCREENING',
      18,
      'LinkedIn',
    );
    const cu1AppShort = await createApp(
      cu1.id,
      seededVacancies[4].id,
      'SHORTLISTED',
      'SHORTLISTING',
      16,
      'Indeed',
    );
    const cu1AppIntSched = await createApp(
      cu1.id,
      seededVacancies[6].id,
      'INTERVIEW_SCHEDULED',
      'INTERVIEW',
      14,
      'Employee Referral',
    );
    const cu1AppIntComp = await createApp(
      cu1.id,
      seededVacancies[7].id,
      'INTERVIEW_COMPLETED',
      'EVALUATION',
      10,
      'LinkedIn',
    );
    const cu1AppEval = await createApp(
      cu1.id,
      seededVacancies[2].id,
      'UNDER_EVALUATION',
      'EVALUATION',
      8,
      'Facebook',
    );
    const cu1AppSelected = await createApp(
      cu1.id,
      seededVacancies[3].id,
      'SELECTED',
      'OFFER',
      6,
      'Company Website',
    );
    // Main pending offer — visible in offers page
    const cu1AppOffer1 = await createApp(
      cu1.id,
      browseVacancies[2].id,
      'OFFER_ISSUED',
      'OFFER',
      3,
      'LinkedIn',
    );
    // Second pending offer
    const cu1AppOffer2 = await createApp(
      cu1.id,
      browseVacancies[3].id,
      'OFFER_ISSUED',
      'OFFER',
      5,
      'Indeed',
    );
    const cu1AppAccepted = await createApp(
      cu1.id,
      browseVacancies[4].id,
      'OFFER_ACCEPTED',
      'ONBOARDING',
      1,
      'Company Website',
    );
    const cu1AppRejected = await createApp(
      cu1.id,
      seededVacancies[12].id,
      'REJECTED',
      'CLOSED',
      5,
      'Telegram',
    );
    const cu1AppRoster = await createApp(
      cu1.id,
      seededVacancies[13].id,
      'MOVED_TO_TALENT_ROSTER',
      'CLOSED',
      3,
      'Employee Referral',
    );

    // ── canduser2 applications ────────────────────────────────────────────────
    const cu2 = seededPortalCandidates['canduser2@erms.com'];
    const cu2AppShort = await createApp(
      cu2.id,
      seededVacancies[4].id,
      'SHORTLISTED',
      'SHORTLISTING',
      15,
      'LinkedIn',
    );
    const cu2AppIntSched = await createApp(
      cu2.id,
      browseVacancies[0].id,
      'INTERVIEW_SCHEDULED',
      'INTERVIEW',
      12,
      'Company Website',
    );
    const cu2AppIntComp = await createApp(
      cu2.id,
      seededVacancies[6].id,
      'INTERVIEW_COMPLETED',
      'EVALUATION',
      8,
      'Indeed',
    );
    const cu2AppOffer = await createApp(
      cu2.id,
      browseVacancies[5].id,
      'OFFER_ISSUED',
      'OFFER',
      2,
      'LinkedIn',
    );
    const cu2AppDeclined = await createApp(
      cu2.id,
      seededVacancies[11].id,
      'OFFER_DECLINED',
      'OFFER',
      1,
      'Facebook',
    );

    // ── canduser3 applications ────────────────────────────────────────────────
    const cu3 = seededPortalCandidates['canduser3@erms.com'];
    const cu3AppIntSched = await createApp(
      cu3.id,
      seededVacancies[2].id,
      'INTERVIEW_SCHEDULED',
      'INTERVIEW',
      10,
      'Company Website',
    );
    const cu3AppOffer = await createApp(
      cu3.id,
      browseVacancies[2].id,
      'OFFER_ISSUED',
      'OFFER',
      3,
      'LinkedIn',
    );
    const cu3AppAccepted = await createApp(
      cu3.id,
      browseVacancies[3].id,
      'OFFER_ACCEPTED',
      'ONBOARDING',
      1,
      'Indeed',
    );
    const cu3AppRejected = await createApp(
      cu3.id,
      seededVacancies[12].id,
      'REJECTED',
      'CLOSED',
      5,
      'Telegram',
    );

    console.log(
      `✓ Applications created (${seededApplications.length} total, all statuses covered for all portal users)`,
    );

    // ── 22. Screening Logs ───────────────────────────────────────────────────────
    const screeningEntries = [
      {
        app: appScreening1,
        candId: seededCandidates[2].id,
        vacId: seededVacancies[4].id,
        status: 'QUALIFIED' as const,
        screenerId: 'hr1@erms.com',
      },
      {
        app: appScreening2,
        candId: seededCandidates[3].id,
        vacId: seededVacancies[5].id,
        status: 'PARTIALLY_QUALIFIED' as const,
        screenerId: 'hr2@erms.com',
      },
      {
        app: appRej1,
        candId: seededCandidates[0].id,
        vacId: seededVacancies[6].id,
        status: 'NOT_QUALIFIED' as const,
        screenerId: 'hr1@erms.com',
      },
      {
        app: appRoster1,
        candId: seededCandidates[2].id,
        vacId: seededVacancies[6].id,
        status: 'HOLD_FOR_REVIEW' as const,
        screenerId: 'hr3@erms.com',
      },
      {
        app: cu1AppScreening,
        candId: cu1.id,
        vacId: browseVacancies[1].id,
        status: 'QUALIFIED' as const,
        screenerId: 'hr1@erms.com',
      },
      {
        app: cu2AppShort,
        candId: cu2.id,
        vacId: seededVacancies[4].id,
        status: 'QUALIFIED' as const,
        screenerId: 'hr2@erms.com',
      },
    ];
    for (const s of screeningEntries) {
      await prisma.screeningLog.create({
        data: {
          vacancy_id: s.vacId,
          candidate_id: s.candId,
          status: s.status,
          reason:
            s.status === 'NOT_QUALIFIED'
              ? 'Does not meet minimum educational requirements.'
              : null,
          screened_by_user_id: seededUsers[s.screenerId].id,
          scores_json: [
            { field: 'Educational Qualification', score: 4 },
            { field: 'Relevant Work Experience', score: 3 },
            { field: 'Technical Skills', score: 4 },
          ],
        },
      });
    }
    console.log('✓ Screening logs created');

    // ── 23. Shortlisted Candidates ───────────────────────────────────────────────
    const shortlistEntries = [
      {
        vacId: seededVacancies[6].id,
        candId: seededCandidates[4].id,
        appId: appShort1.id,
      },
      {
        vacId: seededVacancies[7].id,
        candId: seededCandidates[5].id,
        appId: appShort2.id,
      },
      {
        vacId: seededVacancies[6].id,
        candId: seededCandidates[6].id,
        appId: appIntSched1.id,
      },
      {
        vacId: seededVacancies[7].id,
        candId: seededCandidates[7].id,
        appId: appIntSched2.id,
      },
      {
        vacId: seededVacancies[6].id,
        candId: seededCandidates[8].id,
        appId: appIntComp1.id,
      },
      {
        vacId: seededVacancies[7].id,
        candId: seededCandidates[9].id,
        appId: appIntComp2.id,
      },
      // cu1
      { vacId: seededVacancies[4].id, candId: cu1.id, appId: cu1AppShort.id },
      {
        vacId: seededVacancies[6].id,
        candId: cu1.id,
        appId: cu1AppIntSched.id,
      },
      { vacId: seededVacancies[7].id, candId: cu1.id, appId: cu1AppIntComp.id },
      // cu2
      { vacId: seededVacancies[4].id, candId: cu2.id, appId: cu2AppShort.id },
      {
        vacId: browseVacancies[0].id,
        candId: cu2.id,
        appId: cu2AppIntSched.id,
      },
      // cu3
      {
        vacId: seededVacancies[2].id,
        candId: cu3.id,
        appId: cu3AppIntSched.id,
      },
    ];
    for (const sl of shortlistEntries) {
      await prisma.shortlistedCandidate
        .create({
          data: {
            vacancy_id: sl.vacId,
            candidate_id: sl.candId,
            application_id: sl.appId,
            shortlisted_by_user_id: seededUsers['recruiter1@erms.com'].id,
            notes: 'Shortlisted during seeding.',
          },
        })
        .catch(() => {
          /* ignore duplicates */
        });
    }
    console.log('✓ Shortlisted candidates created');

    // ── 24. Interviews — all statuses, rich data for cu1 ────────────────────────
    let intNum = 1;
    const nextIntNum = () => `INT-2026-${String(intNum++).padStart(3, '0')}`;

    // Background candidate interviews (all 6 statuses)
    const intSched1 = await prisma.interview.create({
      data: {
        application_id: appIntSched1.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catHR.id,
        start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'SCHEDULED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/aaa-bbb-001',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: intSched1.id,
        panel_member_id: seededUsers['interviewer1@erms.com'].id,
      },
    });

    const intResch1 = await prisma.interview.create({
      data: {
        application_id: appIntSched2.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'RESCHEDULED',
        mode: 'PHYSICAL',
        office_location:
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.123456789!2d38.7456789!3d9.0123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMDAnNDQuNCJOIDM4wrA0NCczMC4wIkU!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus',
        rescheduled_reason: 'Panel member unavailability.',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: intResch1.id,
        panel_member_id: seededUsers['interviewer2@erms.com'].id,
      },
    });

    const intComp1 = await prisma.interview.create({
      data: {
        application_id: appIntComp1.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/xyz-uvw-comp',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: intComp1.id,
        panel_member_id: seededUsers['interviewer2@erms.com'].id,
      },
    });
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: intComp1.id,
        evaluator_id: seededUsers['interviewer2@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 4,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 5,
            comments: 'Strong fundamentals.',
          },
          {
            criteria_name: 'Problem Solving',
            score: 4,
            comments: 'Good analytical approach.',
          },
          {
            criteria_name: 'Experience',
            score: 4,
            comments: 'Solid background.',
          },
        ],
        comments: 'Excellent technical skills.',
        recommendation: 'RECOMMEND',
      },
    });

    const intCancel1 = await prisma.interview.create({
      data: {
        application_id: appIntComp2.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catHR.id,
        start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'CANCELLED',
        mode: 'VIRTUAL',
        rescheduled_reason: 'Candidate withdrew.',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: intCancel1.id,
        panel_member_id: seededUsers['interviewer3@erms.com'].id,
      },
    });

    const intEvalPending = await prisma.interview.create({
      data: {
        application_id: appEval1.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catMgr.id,
        start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'EVALUATION_PENDING',
        mode: 'HYBRID',
        office_location: 'Meeting Room B',
        meeting_link: 'https://meet.google.com/eval-pending',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: intEvalPending.id,
        panel_member_id: seededUsers['hm1@erms.com'].id,
      },
    });

    const intFinalized = await prisma.interview.create({
      data: {
        application_id: appEval2.id,
        interview_number: nextIntNum(),
        round: 2,
        interview_category_id: catFinal.id,
        start_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'FINALIZED',
        mode: 'PHYSICAL',
        office_location:
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.234567890!2d38.7567890!3d9.0234567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMDAnNDQuNCJOIDM4wrA0NCczMC4wIkU!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: intFinalized.id,
        panel_member_id: seededUsers['hm2@erms.com'].id,
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: intFinalized.id,
        panel_member_id: seededUsers['interviewer1@erms.com'].id,
      },
    });
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: intFinalized.id,
        evaluator_id: seededUsers['hm2@erms.com'].id,
        interview_category_id: catFinal.id,
        evaluation_template_id: standardTemplate.id,
        overall_score: 5,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 5,
            comments: 'Exceptional depth.',
          },
          {
            criteria_name: 'Communication',
            score: 5,
            comments: 'Outstanding.',
          },
          { criteria_name: 'Cultural Fit', score: 5, comments: 'Perfect fit.' },
        ],
        comments: 'Highly recommended.',
        recommendation: 'STRONGLY_RECOMMEND',
      },
    });

    // canduser1 — 6 interviews with all statuses
    // 1. SCHEDULED — upcoming HR interview (most important for the portal)
    const cu1IntHRSched = await prisma.interview.create({
      data: {
        application_id: cu1AppIntSched.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catHR.id,
        start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'SCHEDULED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/cu1-hr-sched',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: cu1IntHRSched.id,
        panel_member_id: seededUsers['interviewer1@erms.com'].id,
      },
    });

    // 2. SCHEDULED — second upcoming technical interview
    const cu1IntTechSched = await prisma.interview.create({
      data: {
        application_id: cu1AppIntSched.id,
        interview_number: nextIntNum(),
        round: 2,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'SCHEDULED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/cu1-tech-sched',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: cu1IntTechSched.id,
        panel_member_id: seededUsers['interviewer2@erms.com'].id,
      },
    });

    // 3. RESCHEDULED — technical interview (rescheduled once)
    const cu1IntTechResch = await prisma.interview.create({
      data: {
        application_id: cu1AppEval.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'RESCHEDULED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/cu1-tech-resch',
        rescheduled_reason: 'Requested time change by candidate.',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: cu1IntTechResch.id,
        panel_member_id: seededUsers['interviewer2@erms.com'].id,
      },
    });

    // 4. COMPLETED — HR interview (on the completed app)
    const cu1IntComp = await prisma.interview.create({
      data: {
        application_id: cu1AppIntComp.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catHR.id,
        start_time: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'PHYSICAL',
        office_location: 'Adiu HQ, Conference Room A',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: cu1IntComp.id,
        panel_member_id: seededUsers['hr1@erms.com'].id,
      },
    });
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: cu1IntComp.id,
        evaluator_id: seededUsers['hr1@erms.com'].id,
        interview_category_id: catHR.id,
        evaluation_template_id: hrEvalTemplate.id,
        overall_score: 4,
        scores_json: [
          {
            criteria_name: 'Communication',
            score: 4,
            comments: 'Clear and professional.',
          },
          {
            criteria_name: 'Culture Fit',
            score: 4,
            comments: 'Values alignment confirmed.',
          },
          {
            criteria_name: 'Motivation',
            score: 5,
            comments: 'Highly motivated.',
          },
        ],
        comments: 'Excellent candidate. Recommended to proceed.',
        recommendation: 'RECOMMEND',
      },
    });

    // 5. COMPLETED — Technical interview (round 2)
    const cu1IntTechComp = await prisma.interview.create({
      data: {
        application_id: cu1AppIntComp.id,
        interview_number: nextIntNum(),
        round: 2,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/cu1-tech-comp',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: cu1IntTechComp.id,
        panel_member_id: seededUsers['interviewer2@erms.com'].id,
      },
    });
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: cu1IntTechComp.id,
        evaluator_id: seededUsers['interviewer2@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 4,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 4,
            comments: 'Good React and API knowledge.',
          },
          {
            criteria_name: 'Problem Solving',
            score: 4,
            comments: 'Solved coding challenge well.',
          },
          {
            criteria_name: 'Experience',
            score: 3,
            comments: 'Limited backend exposure.',
          },
        ],
        comments: 'Good technical foundation.',
        recommendation: 'RECOMMEND',
      },
    });

    // 6. FINALIZED — final interview (on rejected app — shows rejection path)
    const cu1IntFinal = await prisma.interview.create({
      data: {
        application_id: cu1AppRejected.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catFinal.id,
        start_time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'FINALIZED',
        mode: 'PHYSICAL',
        office_location: 'Adiu HQ, Board Room',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: cu1IntFinal.id,
        panel_member_id: seededUsers['ceo1@erms.com'].id,
      },
    });
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: cu1IntFinal.id,
        evaluator_id: seededUsers['ceo1@erms.com'].id,
        interview_category_id: catFinal.id,
        evaluation_template_id: standardTemplate.id,
        overall_score: 2,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 2,
            comments: 'Does not meet seniority level.',
          },
          { criteria_name: 'Communication', score: 3, comments: 'Average.' },
          {
            criteria_name: 'Cultural Fit',
            score: 2,
            comments: 'Misaligned expectations.',
          },
        ],
        comments: 'Not suitable for this senior role at this time.',
        recommendation: 'DO_NOT_RECOMMEND',
      },
    });

    // canduser2 interviews
    const cu2IntSched = await prisma.interview.create({
      data: {
        application_id: cu2AppIntSched.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catHR.id,
        start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'SCHEDULED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/cu2-hr-sched',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: cu2IntSched.id,
        panel_member_id: seededUsers['hr2@erms.com'].id,
      },
    });
    const cu2IntComp = await prisma.interview.create({
      data: {
        application_id: cu2AppIntComp.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/cu2-tech-comp',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: cu2IntComp.id,
        panel_member_id: seededUsers['interviewer3@erms.com'].id,
      },
    });
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: cu2IntComp.id,
        evaluator_id: seededUsers['interviewer3@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 5,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 5,
            comments: 'Exceptional backend depth.',
          },
          {
            criteria_name: 'Problem Solving',
            score: 5,
            comments: 'Outstanding.',
          },
          {
            criteria_name: 'Experience',
            score: 5,
            comments: 'Highly relevant.',
          },
        ],
        comments: 'Outstanding candidate. Strongly recommend offer.',
        recommendation: 'STRONGLY_RECOMMEND',
      },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Prompt 3: Additional COMPLETED interviews with multiple evaluations
    // Create 3 more completed interviews demonstrating multi-panel evaluation scenarios
    // ─────────────────────────────────────────────────────────────────────────────

    // Create 3 new candidates for Prompt 3 testing
    const p3Candidate1 = await prisma.candidate.create({
      data: {
        company_id: company.id,
        first_name: 'Prompt3',
        last_name: 'TestOne',
        email: 'p3-test-1@example.com',
        phone: '+251 921 000 001',
        is_email_verified: true,
        password_hash: passwordHash,
      },
    });
    const p3Candidate2 = await prisma.candidate.create({
      data: {
        company_id: company.id,
        first_name: 'Prompt3',
        last_name: 'TestTwo',
        email: 'p3-test-2@example.com',
        phone: '+251 921 000 002',
        is_email_verified: true,
        password_hash: passwordHash,
      },
    });
    const p3Candidate3 = await prisma.candidate.create({
      data: {
        company_id: company.id,
        first_name: 'Prompt3',
        last_name: 'TestThree',
        email: 'p3-test-3@example.com',
        phone: '+251 921 000 003',
        is_email_verified: true,
        password_hash: passwordHash,
      },
    });

    // Create applications for Prompt 3 test candidates
    const p3App1 = await prisma.application.create({
      data: {
        company_id: company.id,
        candidate_id: p3Candidate1.id,
        vacancy_id: seededVacancies[6].id,
        status: 'INTERVIEW_COMPLETED',
        current_stage: 'EVALUATION',
        recruitment_source_id: recruitmentSourceMap['LinkedIn'],
      },
    });
    const p3App2 = await prisma.application.create({
      data: {
        company_id: company.id,
        candidate_id: p3Candidate2.id,
        vacancy_id: seededVacancies[6].id,
        status: 'INTERVIEW_COMPLETED',
        current_stage: 'EVALUATION',
        recruitment_source_id: recruitmentSourceMap['Company Website'],
      },
    });
    const p3App3 = await prisma.application.create({
      data: {
        company_id: company.id,
        candidate_id: p3Candidate3.id,
        vacancy_id: seededVacancies[6].id,
        status: 'INTERVIEW_COMPLETED',
        current_stage: 'EVALUATION',
        recruitment_source_id: recruitmentSourceMap['LinkedIn'],
      },
    });

    // Create 3 COMPLETED interviews with multiple panel members
    // Prompt 3 Demo: Interview 1 - 2 panelists, 1 evaluation submitted, 1 pending
    const p3Int1 = await prisma.interview.create({
      data: {
        application_id: p3App1.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/p3-int-1',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: p3Int1.id,
        panel_member_id: seededUsers['interviewer1@erms.com'].id,
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: p3Int1.id,
        panel_member_id: seededUsers['interviewer2@erms.com'].id,
      },
    });
    // Evaluation from interviewer1
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: p3Int1.id,
        evaluator_id: seededUsers['interviewer1@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 4,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 4,
            weight: 40,
            weighted_score: 1.6,
          },
          {
            criteria_name: 'Problem Solving',
            score: 5,
            weight: 35,
            weighted_score: 1.75,
          },
          {
            criteria_name: 'Experience',
            score: 3,
            weight: 25,
            weighted_score: 0.75,
          },
        ],
        comments: 'Good technical foundation. Problem-solving is strong.',
        recommendation: 'RECOMMEND',
      },
    });

    // Prompt 3 Demo: Interview 2 - 2 panelists, both have submitted evaluations
    const p3Int2 = await prisma.interview.create({
      data: {
        application_id: p3App2.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'PHYSICAL',
        office_location: 'Adiu HQ, Conference Room C',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: p3Int2.id,
        panel_member_id: seededUsers['interviewer2@erms.com'].id,
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: p3Int2.id,
        panel_member_id: seededUsers['interviewer3@erms.com'].id,
      },
    });
    // Evaluation from interviewer2
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: p3Int2.id,
        evaluator_id: seededUsers['interviewer2@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 5,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 5,
            weight: 40,
            weighted_score: 2.0,
          },
          {
            criteria_name: 'Problem Solving',
            score: 5,
            weight: 35,
            weighted_score: 1.75,
          },
          {
            criteria_name: 'Experience',
            score: 5,
            weight: 25,
            weighted_score: 1.25,
          },
        ],
        comments: 'Exceptional technical depth. Outstanding problem solver.',
        recommendation: 'STRONGLY_RECOMMEND',
      },
    });
    // Evaluation from interviewer3
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: p3Int2.id,
        evaluator_id: seededUsers['interviewer3@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 4,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 4,
            weight: 40,
            weighted_score: 1.6,
          },
          {
            criteria_name: 'Problem Solving',
            score: 4,
            weight: 35,
            weighted_score: 1.4,
          },
          {
            criteria_name: 'Experience',
            score: 4,
            weight: 25,
            weighted_score: 1.0,
          },
        ],
        comments:
          'Solid technical skills. Good problem-solving approach. Cultural fit excellent.',
        recommendation: 'RECOMMEND',
      },
    });

    // Prompt 3 Demo: Interview 3 - 3 panelists with all evaluations
    const p3Int3 = await prisma.interview.create({
      data: {
        application_id: p3App3.id,
        interview_number: nextIntNum(),
        round: 2,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'HYBRID',
        office_location: 'Adiu HQ, Board Room',
        meeting_link: 'https://meet.google.com/p3-int-3',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: p3Int3.id,
        panel_member_id: seededUsers['interviewer1@erms.com'].id,
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: p3Int3.id,
        panel_member_id: seededUsers['hm1@erms.com'].id,
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: p3Int3.id,
        panel_member_id: seededUsers['hr1@erms.com'].id,
      },
    });
    // All 3 panel members submit evaluations
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: p3Int3.id,
        evaluator_id: seededUsers['interviewer1@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 5,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 5,
            weight: 40,
            weighted_score: 2.0,
          },
          {
            criteria_name: 'Problem Solving',
            score: 5,
            weight: 35,
            weighted_score: 1.75,
          },
          {
            criteria_name: 'Experience',
            score: 5,
            weight: 25,
            weighted_score: 1.25,
          },
        ],
        comments: 'Exceptional candidate across all dimensions.',
        recommendation: 'STRONGLY_RECOMMEND',
      },
    });
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: p3Int3.id,
        evaluator_id: seededUsers['hm1@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 5,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 5,
            weight: 40,
            weighted_score: 2.0,
          },
          {
            criteria_name: 'Problem Solving',
            score: 4,
            weight: 35,
            weighted_score: 1.4,
          },
          {
            criteria_name: 'Experience',
            score: 5,
            weight: 25,
            weighted_score: 1.25,
          },
        ],
        comments: 'Leader material. Ready for immediate assignment.',
        recommendation: 'STRONGLY_RECOMMEND',
      },
    });
    await prisma.interviewEvaluation.create({
      data: {
        interview_id: p3Int3.id,
        evaluator_id: seededUsers['hr1@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 4,
        scores_json: [
          {
            criteria_name: 'Technical Skills',
            score: 4,
            weight: 40,
            weighted_score: 1.6,
          },
          {
            criteria_name: 'Problem Solving',
            score: 5,
            weight: 35,
            weighted_score: 1.75,
          },
          {
            criteria_name: 'Experience',
            score: 4,
            weight: 25,
            weighted_score: 1.0,
          },
        ],
        comments:
          'Excellent cultural and communication fit. HR approval confirmed.',
        recommendation: 'RECOMMEND',
      },
    });

    console.log(
      '✓ Prompt 3: 3 additional COMPLETED interviews with multi-panel evaluations',
    );

    // canduser3 interview
    const cu3IntSched = await prisma.interview.create({
      data: {
        application_id: cu3AppIntSched.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'SCHEDULED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/cu3-tech-sched',
      },
    });
    await prisma.interviewPanel.create({
      data: {
        interview_id: cu3IntSched.id,
        panel_member_id: seededUsers['interviewer1@erms.com'].id,
      },
    });

    console.log(
      '✓ Interviews created (all 6 statuses, rich data for canduser1)',
    );

    // ── 25. Offers — all statuses ────────────────────────────────────────────────
    // canduser1: 2 SENT (pending), 1 ACCEPTED
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: cu1AppOffer1.id,
        candidate_id: cu1.id,
        created_by_user_id: seededUsers['hr1@erms.com'].id,
        salary: new Prisma.Decimal(6500),
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        offer_notes:
          'Full-time position with standard benefits. Salary negotiable. Remote work 2 days/week.',
      },
    });
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: cu1AppOffer2.id,
        candidate_id: cu1.id,
        created_by_user_id: seededUsers['hr2@erms.com'].id,
        salary: new Prisma.Decimal(7200),
        start_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        offer_notes:
          'Senior role with leadership responsibilities. Includes performance bonus and health insurance.',
      },
    });
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: cu1AppAccepted.id,
        candidate_id: cu1.id,
        created_by_user_id: seededUsers['hr1@erms.com'].id,
        salary: new Prisma.Decimal(7000),
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'ACCEPTED',
        offer_notes: 'Candidate accepted. Onboarding scheduled.',
        accepted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    // canduser2: SENT + DECLINED
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: cu2AppOffer.id,
        candidate_id: cu2.id,
        created_by_user_id: seededUsers['hr2@erms.com'].id,
        salary: new Prisma.Decimal(8000),
        start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        offer_notes:
          'Senior backend role. Includes remote work flexibility and stock options.',
      },
    });
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: cu2AppDeclined.id,
        candidate_id: cu2.id,
        created_by_user_id: seededUsers['hr2@erms.com'].id,
        salary: new Prisma.Decimal(7500),
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'DECLINED',
        offer_notes: 'Initial offer extended.',
        declined_reason: 'Candidate accepted an offer from another company.',
        rejected_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    // canduser3: SENT + ACCEPTED
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: cu3AppOffer.id,
        candidate_id: cu3.id,
        created_by_user_id: seededUsers['hr1@erms.com'].id,
        salary: new Prisma.Decimal(9500),
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        offer_notes:
          'Senior DevOps Engineer — remote position with travel allowance.',
      },
    });
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: cu3AppAccepted.id,
        candidate_id: cu3.id,
        created_by_user_id: seededUsers['hr1@erms.com'].id,
        salary: new Prisma.Decimal(10000),
        start_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        status: 'ACCEPTED',
        offer_notes: 'Counter-offer agreed. Start confirmed.',
        accepted_at: new Date(),
      },
    });

    // Background: WITHDRAWN + EXPIRED
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: appOfferIssued1.id,
        candidate_id: seededCandidates[4].id,
        created_by_user_id: seededUsers['hr1@erms.com'].id,
        salary: new Prisma.Decimal(6000),
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'WITHDRAWN',
        offer_notes: 'Withdrawn — vacancy frozen due to budget review.',
      },
    });
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: appOfferIssued2.id,
        candidate_id: seededCandidates[5].id,
        created_by_user_id: seededUsers['hr2@erms.com'].id,
        salary: new Prisma.Decimal(5500),
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'EXPIRED',
        offer_notes: 'Offer expired without response.',
      },
    });
    await prisma.offer.create({
      data: {
        company_id: company.id,
        application_id: appOfferAcc1.id,
        candidate_id: seededCandidates[6].id,
        created_by_user_id: seededUsers['hr1@erms.com'].id,
        salary: new Prisma.Decimal(6800),
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'ACCEPTED',
        offer_notes: 'Candidate accepted and confirmed start date.',
        accepted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(
      '✓ Offers created (all 5 statuses: SENT, ACCEPTED, DECLINED, WITHDRAWN, EXPIRED)',
    );

    // ── 26. Notifications for canduser1 ─────────────────────────────────────────
    // These appear in the notification bell immediately after login
    const notifData = [
      {
        type: 'APPLICATION_RECEIVED' as NotificationType,
        title: 'Application Received',
        message: `Your application for "${browseVacancies[0].title}" has been received and is under review.`,
        is_read: false,
        daysAgo: 20,
      },
      {
        type: 'APPLICATION_RECEIVED' as NotificationType,
        title: 'Application Received',
        message: `Your application for "${browseVacancies[1].title}" has been received.`,
        is_read: true,
        daysAgo: 18,
      },
      {
        type: 'APPLICATION_SHORTLISTED' as NotificationType,
        title: 'You have been Shortlisted!',
        message: `Congratulations! You have been shortlisted for the "${seededVacancies[4].title}" position.`,
        is_read: false,
        daysAgo: 16,
      },
      {
        type: 'INTERVIEW_SCHEDULED' as NotificationType,
        title: 'Interview Scheduled',
        message: `Your interview for "${seededVacancies[6].title}" has been scheduled for ${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString()} at 10:00 AM. Mode: Virtual. Join link: https://meet.google.com/cu1-hr-sched`,
        is_read: false,
        daysAgo: 14,
      },
      {
        type: 'INTERVIEW_SCHEDULED' as NotificationType,
        title: 'Second Interview Scheduled',
        message: `Round 2 Technical Interview for "${seededVacancies[6].title}" scheduled for ${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
        is_read: false,
        daysAgo: 12,
      },
      {
        type: 'OFFER_ISSUED' as NotificationType,
        title: 'Employment Offer Received!',
        message: `You have received an employment offer for "${browseVacancies[2].title}". Salary: ETB 6,500/month. Please respond before ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
        is_read: false,
        daysAgo: 3,
      },
      {
        type: 'OFFER_ISSUED' as NotificationType,
        title: 'Second Offer Received!',
        message: `You have received another employment offer for "${browseVacancies[3].title}". Salary: ETB 7,200/month. Please respond before ${new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
        is_read: false,
        daysAgo: 5,
      },
      {
        type: 'OFFER_ACCEPTED' as NotificationType,
        title: 'Offer Accepted Confirmation',
        message: `Your acceptance for "${browseVacancies[4].title}" has been confirmed. Welcome to the team! Onboarding starts ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
        is_read: true,
        daysAgo: 1,
      },
      {
        type: 'APPLICATION_REJECTED' as NotificationType,
        title: 'Application Update',
        message: `Thank you for applying for "${seededVacancies[12].title}". After careful review, we regret to inform you that you have not been selected at this time.`,
        is_read: true,
        daysAgo: 5,
      },
      {
        type: 'GENERAL' as NotificationType,
        title: 'Profile Completion Reminder',
        message:
          'Your profile is 80% complete. Upload your CV and add your certifications to improve your chances.',
        is_read: false,
        daysAgo: 10,
      },
    ];

    for (const n of notifData) {
      await prisma.notification.create({
        data: {
          company_id: company.id,
          candidate_id: cu1.id,
          type: n.type,
          title: n.title,
          message: n.message,
          is_read: n.is_read,
          read_at: n.is_read
            ? new Date(Date.now() - (n.daysAgo - 1) * 24 * 60 * 60 * 1000)
            : null,
          created_at: new Date(Date.now() - n.daysAgo * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Notifications for canduser2
    await prisma.notification.create({
      data: {
        company_id: company.id,
        candidate_id: cu2.id,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview Scheduled',
        message: `Your HR interview for "${browseVacancies[0].title}" is scheduled for ${new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
        is_read: false,
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.notification.create({
      data: {
        company_id: company.id,
        candidate_id: cu2.id,
        type: 'OFFER_ISSUED',
        title: 'Employment Offer Received',
        message: `You have received an offer for "${browseVacancies[5].title}". Salary: ETB 8,000/month.`,
        is_read: false,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    // Notifications for canduser3
    await prisma.notification.create({
      data: {
        company_id: company.id,
        candidate_id: cu3.id,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Technical Interview Scheduled',
        message: `Your technical interview for "${seededVacancies[2].title}" is scheduled for ${new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
        is_read: false,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.notification.create({
      data: {
        company_id: company.id,
        candidate_id: cu3.id,
        type: 'OFFER_ACCEPTED',
        title: 'Offer Accepted',
        message: `Your acceptance for "${browseVacancies[3].title}" has been confirmed. Welcome!`,
        is_read: true,
        read_at: new Date(),
        created_at: new Date(),
      },
    });

    console.log('✓ Notifications created for all portal candidates');

    // ── 27. Talent Roster ────────────────────────────────────────────────────────
    await prisma.talentRoster.create({
      data: {
        company_id: company.id,
        candidate_id: seededCandidates[8].id,
        talent_category: 'Backend Engineering',
        availability_status: 'IMMEDIATELY',
        status: 'ACTIVE',
        source_stage: 'INTERVIEW',
        sourced_from_vacancy_id: seededVacancies[6].id,
        added_by: seededUsers['recruiter1@erms.com'].id,
        expected_salary: new Prisma.Decimal(8000),
        notes: 'Strong technical performance. Hold for future backend roles.',
      },
    });
    await prisma.talentRoster.create({
      data: {
        company_id: company.id,
        candidate_id: seededCandidates[9].id,
        talent_category: 'Frontend Engineering',
        availability_status: 'TWO_WEEKS',
        status: 'ACTIVE',
        source_stage: 'SCREENING',
        added_by: seededUsers['recruiter2@erms.com'].id,
        expected_salary: new Prisma.Decimal(7500),
        notes: 'Talented frontend builder.',
      },
    });
    await prisma.talentRoster.create({
      data: {
        company_id: company.id,
        candidate_id: seededCandidates[0].id,
        talent_category: 'Software Engineering',
        availability_status: 'ONE_MONTH',
        status: 'PLACED',
        source_stage: 'FINAL_SELECTION',
        sourced_from_vacancy_id: seededVacancies[7].id,
        added_by: seededUsers['recruiter1@erms.com'].id,
        expected_salary: new Prisma.Decimal(7000),
        notes: 'Placed in Engineering department.',
      },
    });
    await prisma.talentRoster.create({
      data: {
        company_id: company.id,
        candidate_id: seededCandidates[1].id,
        talent_category: 'Finance Analyst',
        availability_status: 'MORE_THAN_ONE_MONTH',
        status: 'INACTIVE',
        source_stage: 'INTERVIEW',
        added_by: seededUsers['hr2@erms.com'].id,
        expected_salary: new Prisma.Decimal(6000),
        notes: 'Profile deactivated — candidate relocated.',
      },
    });
    await prisma.talentRoster.create({
      data: {
        company_id: company.id,
        candidate_id: seededCandidates[2].id,
        talent_category: 'Project Management',
        availability_status: 'IMMEDIATELY',
        status: 'WITHDRAWN',
        source_stage: 'SCREENING',
        added_by: seededUsers['recruiter3@erms.com'].id,
        expected_salary: new Prisma.Decimal(6500),
        notes: 'Candidate requested removal.',
      },
    });
    // canduser1 on talent roster (from MOVED_TO_TALENT_ROSTER application)
    await prisma.talentRoster.create({
      data: {
        company_id: company.id,
        candidate_id: cu1.id,
        talent_category: 'Software Engineering',
        availability_status: 'IMMEDIATELY',
        status: 'ACTIVE',
        source_stage: 'INTERVIEW',
        sourced_from_vacancy_id: seededVacancies[13].id,
        added_by: seededUsers['recruiter1@erms.com'].id,
        expected_salary: new Prisma.Decimal(4500),
        notes: 'Good candidate — moved to roster from vacancy screening.',
      },
    });
    console.log('✓ Talent roster populated (all 4 statuses)');

    // ── 28. Hiring Minutes ───────────────────────────────────────────────────────
    const hmApproved = await prisma.hiringMinute.create({
      data: {
        vacancy_id: seededVacancies[10].id,
        prepared_by_id: seededUsers['hr1@erms.com'].id,
        recruitment_request_type: 'NEW_HEADCOUNT',
        recruitment_classification: 'PLANNED',
        application_type: 'EXTERNAL',
        interview_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        interview_time: '10:00 AM',
        interview_place: 'Adiu HQ, Board Room',
        advertisement_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        application_closing_date: new Date(
          Date.now() - 20 * 24 * 60 * 60 * 1000,
        ),
        total_applications: 14,
        total_screened: 10,
        total_shortlisted: 5,
        total_interviewed: 4,
        sources_used: ['Company Website', 'LinkedIn', 'Telegram'],
        interview_method: 'PHYSICAL',
        stages_conducted: [
          'HR Interview',
          'Technical Interview',
          'Final Interview',
        ],
        selected_candidate_id: seededCandidates[6].id,
        selected_candidate_score: new Prisma.Decimal(4.8),
        expected_joining_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        expected_salary: new Prisma.Decimal(7000),
        reason_for_selection:
          'Scored highest in technical and behavioral rounds.',
        alternative_candidate_id: seededCandidates[7].id,
        alternative_candidate_score: new Prisma.Decimal(4.1),
        reason_for_alternative: 'Strong backup — second highest score.',
        rejected_candidates_json: [
          {
            candidate_id: seededCandidates[8].id,
            name: 'Fikre Mariam',
            rejection_reason: 'Below salary expectations.',
          },
          {
            candidate_id: seededCandidates[9].id,
            name: 'Tsige Desta',
            rejection_reason: 'Less relevant experience.',
          },
        ],
        panel_recommendation: 'STRONGLY_RECOMMEND_HIRING',
        recommendation_summary:
          'Panel unanimously recommends the selected candidate.',
        hr_observation: 'All stages conducted professionally.',
        final_decision: 'APPROVED',
        approved_by_id: seededUsers['ceo1@erms.com'].id,
        approved_at: new Date(),
      },
    });
    await prisma.hiringMinutePanel.createMany({
      data: [
        {
          hiring_minute_id: hmApproved.id,
          user_id: seededUsers['hr1@erms.com'].id,
          member_name: 'Grace Girma',
          position_role: 'HR Specialist',
          department: 'Human Resources',
        },
        {
          hiring_minute_id: hmApproved.id,
          user_id: seededUsers['hm1@erms.com'].id,
          member_name: 'Maya Mulugeta',
          position_role: 'Hiring Manager',
          department: 'Engineering',
        },
        {
          hiring_minute_id: hmApproved.id,
          user_id: seededUsers['interviewer1@erms.com'].id,
          member_name: 'Sam Samuel',
          position_role: 'Technical Lead',
          department: 'Engineering',
        },
      ],
    });
    await prisma.hiringMinuteSignatory.createMany({
      data: [
        {
          hiring_minute_id: hmApproved.id,
          role: 'HR_REPRESENTATIVE',
          user_id: seededUsers['hr1@erms.com'].id,
          signatory_name: 'Grace Girma',
          position: 'HR Specialist',
          signed_at: new Date(),
        },
        {
          hiring_minute_id: hmApproved.id,
          role: 'HIRING_MANAGER',
          user_id: seededUsers['hm1@erms.com'].id,
          signatory_name: 'Maya Mulugeta',
          position: 'Hiring Manager',
          signed_at: new Date(),
        },
        {
          hiring_minute_id: hmApproved.id,
          role: 'DEPARTMENT_HEAD',
          user_id: seededUsers['dm1@erms.com'].id,
          signatory_name: 'Paul Petros',
          position: 'Dept Manager',
          signed_at: new Date(),
        },
        {
          hiring_minute_id: hmApproved.id,
          role: 'CEO',
          user_id: seededUsers['ceo1@erms.com'].id,
          signatory_name: 'Alice Admasu',
          position: 'CEO',
          signed_at: new Date(),
        },
      ],
    });
    await prisma.recruitmentApprovalHistory.create({
      data: {
        entity_type: 'HiringMinute',
        entity_id: hmApproved.id,
        action: 'APPROVED',
        actor_user_id: seededUsers['ceo1@erms.com'].id,
        comments: 'Hiring minute approved. Proceed with offer.',
      },
    });

    const hmPending = await prisma.hiringMinute.create({
      data: {
        vacancy_id: seededVacancies[6].id,
        prepared_by_id: seededUsers['hr2@erms.com'].id,
        recruitment_request_type: 'NEW_HEADCOUNT',
        recruitment_classification: 'PLANNED',
        application_type: 'EXTERNAL',
        interview_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        interview_time: '2:00 PM',
        interview_place: 'Adiu HQ, Conference Room B',
        total_applications: 6,
        total_screened: 5,
        total_shortlisted: 3,
        total_interviewed: 3,
        sources_used: ['LinkedIn', 'Facebook'],
        interview_method: 'VIRTUAL',
        stages_conducted: ['HR Interview', 'Technical Interview'],
        selected_candidate_id: seededCandidates[8].id,
        selected_candidate_score: new Prisma.Decimal(4.2),
        expected_salary: new Prisma.Decimal(6800),
        reason_for_selection: 'Solid technical skills and good communication.',
        panel_recommendation: 'RECOMMEND_HIRING',
        recommendation_summary:
          'Panel recommends candidate pending CEO sign-off.',
        final_decision: 'PENDING',
      },
    });
    await prisma.hiringMinutePanel.createMany({
      data: [
        {
          hiring_minute_id: hmPending.id,
          user_id: seededUsers['hr2@erms.com'].id,
          member_name: 'Henry Hagos',
          position_role: 'HR Specialist',
          department: 'Human Resources',
        },
        {
          hiring_minute_id: hmPending.id,
          user_id: seededUsers['hm2@erms.com'].id,
          member_name: 'Noah Negasi',
          position_role: 'Hiring Manager',
          department: 'Sales',
        },
      ],
    });
    await prisma.hiringMinuteSignatory.createMany({
      data: [
        {
          hiring_minute_id: hmPending.id,
          role: 'HR_REPRESENTATIVE',
          user_id: seededUsers['hr2@erms.com'].id,
          signatory_name: 'Henry Hagos',
          position: 'HR Specialist',
          signed_at: new Date(),
        },
        {
          hiring_minute_id: hmPending.id,
          role: 'HIRING_MANAGER',
          user_id: seededUsers['hm2@erms.com'].id,
          signatory_name: 'Noah Negasi',
          position: 'Hiring Manager',
          signed_at: new Date(),
        },
        {
          hiring_minute_id: hmPending.id,
          role: 'DEPARTMENT_HEAD',
          user_id: null,
          signatory_name: null,
          position: null,
        },
        {
          hiring_minute_id: hmPending.id,
          role: 'CEO',
          user_id: null,
          signatory_name: null,
          position: null,
        },
      ],
    });
    console.log('✓ Hiring minutes created (APPROVED + PENDING)');

    // Add REJECTED hiring minute for testing rejection flow
    const hmRejected = await prisma.hiringMinute.create({
      data: {
        vacancy_id: seededVacancies[7].id,
        prepared_by_id: seededUsers['hr2@erms.com'].id,
        recruitment_request_type: 'REPLACEMENT',
        recruitment_classification: 'PLANNED',
        application_type: 'EXTERNAL',
        interview_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        interview_time: '11:00 AM',
        interview_place: 'Adiu HQ, Board Room',
        total_applications: 12,
        total_screened: 8,
        total_shortlisted: 4,
        total_interviewed: 3,
        sources_used: ['LinkedIn', 'Telegram', 'Employee Referral'],
        interview_method: 'PHYSICAL',
        stages_conducted: ['HR Interview', 'Technical Interview', 'Final Interview'],
        selected_candidate_id: seededCandidates[7].id,
        selected_candidate_score: new Prisma.Decimal(3.5),
        reason_for_selection: 'Qualified but salary expectations too high.',
        panel_recommendation: 'DO_NOT_RECOMMEND_HIRING',
        recommendation_summary: 'Panel does not recommend due to budget constraints.',
        final_decision: 'REJECTED',
        approved_by_id: seededUsers['ceo1@erms.com'].id,
        approved_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expected_salary: new Prisma.Decimal(8000),
      },
    });
    await prisma.hiringMinutePanel.createMany({
      data: [
        {
          hiring_minute_id: hmRejected.id,
          user_id: seededUsers['hr2@erms.com'].id,
          member_name: 'Henry Hagos',
          position_role: 'HR Specialist',
          department: 'Human Resources',
        },
        {
          hiring_minute_id: hmRejected.id,
          user_id: seededUsers['interviewer2@erms.com'].id,
          member_name: 'Tina Tsegaye',
          position_role: 'Senior Developer',
          department: 'Engineering',
        },
      ],
    });
    await prisma.recruitmentApprovalHistory.create({
      data: {
        entity_type: 'HiringMinute',
        entity_id: hmRejected.id,
        action: 'REJECTED',
        actor_user_id: seededUsers['ceo1@erms.com'].id,
        comments: 'Rejected due to budget constraints. Salary exceeds approved range.',
      },
    });
    console.log('✓ Hiring minute created (REJECTED)');

    // Create a dedicated test vacancy with multiple evaluated candidates for testing evaluation results view
    const testVacancyRR = await makeBackingRR('Engineering', 'Test Software Engineer', 999);
    const testVacancy = await prisma.vacancy.create({
      data: {
        company_id: company.id,
        recruitment_request_id: testVacancyRR.id,
        title: 'Test Software Engineer for Evaluation Testing',
        department_id: departmentMap['Engineering'].id,
        location: 'Addis Ababa',
        employment_type: 'FULL_TIME',
        status: 'IN_PROGRESS',
        posting_status: 'PUBLISHED',
        open_positions: 1,
        description: 'Test vacancy for evaluation and selection flow testing.',
        responsibilities: 'Test responsibilities.',
        requirements: 'Test requirements.',
        required_qualifications: 'BSc in Computer Science',
        required_experience: 3,
        vacancy_number: 'VAC-TEST-001',
        posted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        opening_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        approved_at: new Date(),
      },
    });

    // Create 3 candidates with applications for this test vacancy
    const testCand1 = seededCandidates[0]; // Dawit
    const testCand2 = seededCandidates[1]; // Solomon
    const testCand3 = seededCandidates[2]; // Tigist

    const testApp1 = await createApp(testCand1.id, testVacancy.id, 'INTERVIEW_COMPLETED', 'EVALUATION', 5);
    const testApp2 = await createApp(testCand2.id, testVacancy.id, 'INTERVIEW_COMPLETED', 'EVALUATION', 5);
    const testApp3 = await createApp(testCand3.id, testVacancy.id, 'INTERVIEW_COMPLETED', 'EVALUATION', 5);

    // Create completed interviews with evaluations for all 3 candidates
    const testInt1 = await prisma.interview.create({
      data: {
        application_id: testApp1.id,
        interview_number: 'INT-TEST-001',
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/test-1',
      },
    });
    await prisma.interviewPanel.createMany({
      data: [
        { interview_id: testInt1.id, panel_member_id: seededUsers['interviewer1@erms.com'].id },
        { interview_id: testInt1.id, panel_member_id: seededUsers['interviewer2@erms.com'].id },
      ],
    });
    await prisma.interviewEvaluation.createMany({
      data: [
        {
          interview_id: testInt1.id,
          evaluator_id: seededUsers['interviewer1@erms.com'].id,
          interview_category_id: catTech.id,
          evaluation_template_id: techEvalTemplate.id,
          overall_score: 8.5,
          scores_json: [
            { criteria_name: 'Technical Skills', score: 9, comments: 'Excellent' },
            { criteria_name: 'Problem Solving', score: 8, comments: 'Good' },
            { criteria_name: 'Experience', score: 8, comments: 'Solid' },
          ],
          comments: 'Strong technical candidate.',
          recommendation: 'STRONGLY_RECOMMEND',
        },
        {
          interview_id: testInt1.id,
          evaluator_id: seededUsers['interviewer2@erms.com'].id,
          interview_category_id: catTech.id,
          evaluation_template_id: techEvalTemplate.id,
          overall_score: 8.0,
          scores_json: [
            { criteria_name: 'Technical Skills', score: 8, comments: 'Very good' },
            { criteria_name: 'Problem Solving', score: 8, comments: 'Good' },
            { criteria_name: 'Experience', score: 8, comments: 'Solid' },
          ],
          comments: 'Good fit for the role.',
          recommendation: 'RECOMMEND',
        },
      ],
    });

    const testInt2 = await prisma.interview.create({
      data: {
        application_id: testApp2.id,
        interview_number: 'INT-TEST-002',
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/test-2',
      },
    });
    await prisma.interviewPanel.createMany({
      data: [
        { interview_id: testInt2.id, panel_member_id: seededUsers['interviewer1@erms.com'].id },
        { interview_id: testInt2.id, panel_member_id: seededUsers['interviewer2@erms.com'].id },
      ],
    });
    await prisma.interviewEvaluation.createMany({
      data: [
        {
          interview_id: testInt2.id,
          evaluator_id: seededUsers['interviewer1@erms.com'].id,
          interview_category_id: catTech.id,
          evaluation_template_id: techEvalTemplate.id,
          overall_score: 7.0,
          scores_json: [
            { criteria_name: 'Technical Skills', score: 7, comments: 'Good' },
            { criteria_name: 'Problem Solving', score: 7, comments: 'Good' },
            { criteria_name: 'Experience', score: 7, comments: 'Adequate' },
          ],
          comments: 'Qualified candidate.',
          recommendation: 'RECOMMEND',
        },
        {
          interview_id: testInt2.id,
          evaluator_id: seededUsers['interviewer2@erms.com'].id,
          interview_category_id: catTech.id,
          evaluation_template_id: techEvalTemplate.id,
          overall_score: 6.5,
          scores_json: [
            { criteria_name: 'Technical Skills', score: 6, comments: 'Fair' },
            { criteria_name: 'Problem Solving', score: 7, comments: 'Good' },
            { criteria_name: 'Experience', score: 7, comments: 'Adequate' },
          ],
          comments: 'Acceptable candidate.',
          recommendation: 'RECOMMEND',
        },
      ],
    });

    const testInt3 = await prisma.interview.create({
      data: {
        application_id: testApp3.id,
        interview_number: 'INT-TEST-003',
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/test-3',
      },
    });
    await prisma.interviewPanel.createMany({
      data: [
        { interview_id: testInt3.id, panel_member_id: seededUsers['interviewer1@erms.com'].id },
        { interview_id: testInt3.id, panel_member_id: seededUsers['interviewer2@erms.com'].id },
      ],
    });
    await prisma.interviewEvaluation.createMany({
      data: [
        {
          interview_id: testInt3.id,
          evaluator_id: seededUsers['interviewer1@erms.com'].id,
          interview_category_id: catTech.id,
          evaluation_template_id: techEvalTemplate.id,
          overall_score: 5.5,
          scores_json: [
            { criteria_name: 'Technical Skills', score: 5, comments: 'Fair' },
            { criteria_name: 'Problem Solving', score: 6, comments: 'Fair' },
            { criteria_name: 'Experience', score: 5, comments: 'Limited' },
          ],
          comments: 'May need more experience.',
          recommendation: 'DO_NOT_RECOMMEND',
        },
        {
          interview_id: testInt3.id,
          evaluator_id: seededUsers['interviewer2@erms.com'].id,
          interview_category_id: catTech.id,
          evaluation_template_id: techEvalTemplate.id,
          overall_score: 5.0,
          scores_json: [
            { criteria_name: 'Technical Skills', score: 5, comments: 'Fair' },
            { criteria_name: 'Problem Solving', score: 5, comments: 'Fair' },
            { criteria_name: 'Experience', score: 5, comments: 'Limited' },
          ],
          comments: 'Not ready for this role.',
          recommendation: 'DO_NOT_RECOMMEND',
        },
      ],
    });
    console.log('✓ Test vacancy created with 3 evaluated candidates for evaluation testing');

    // ── 29. Recruitment Channels ────────────────────────────────────────────────

    const defaultRecruitmentChannels = [
      {
        name: 'Company Website',
        description: 'Jobs on company careers page',
        is_automated: true,
        share_template: 'Careers page listing',
      },
      {
        name: 'LinkedIn',
        description: 'LinkedIn posting integration',
        is_automated: true,
      },
      {
        name: 'Facebook',
        description: 'Facebook job posting integration',
        is_automated: false,
      },
      {
        name: 'Telegram',
        description: 'Telegram broadcast channel',
        is_automated: false,
      },
      {
        name: 'Employee Referral',
        description: 'Referral distribution channel',
        is_automated: false,
      },
      {
        name: 'Indeed',
        description: 'Indeed job board integration',
        is_automated: true,
      },
      {
        name: 'Glassdoor',
        description: 'Glassdoor job board integration',
        is_automated: true,
      },
      {
        name: 'CareerBuilder',
        description: 'CareerBuilder job board integration',
        is_automated: true,
      },
      {
        name: 'Twitter/X',
        description: 'Twitter/X job posting integration',
        is_automated: false,
      },
      {
        name: 'Instagram',
        description: 'Instagram job posting integration',
        is_automated: false,
      },
      {
        name: 'University Portal',
        description: 'University career portal posting',
        is_automated: false,
      },
    ];
    const seededChannels: Record<string, { id: string }> = {};
    for (const channel of defaultRecruitmentChannels) {
      const existing = await prisma.recruitmentChannel.findFirst({
        where: { company_id: company.id, name: channel.name },
      });
      if (existing) {
        seededChannels[channel.name] = await prisma.recruitmentChannel.update({
          where: { id: existing.id },
          data: {
            description: channel.description,
            is_automated: channel.is_automated,
            share_template: channel.share_template,
            is_active: true,
          },
        });
      } else {
        seededChannels[channel.name] = await prisma.recruitmentChannel.create({
          data: {
            company_id: company.id,
            name: channel.name,
            description: channel.description,
            is_automated: channel.is_automated,
            share_template: channel.share_template,
            is_active: true,
          },
        });
      }
    }

    // Job postings on PUBLISHED vacancies (both status-coverage and browse vacancies)
    const publishedVacancyIds = [
      seededVacancies[2].id,
      seededVacancies[3].id,
      seededVacancies[4].id,
      seededVacancies[5].id,
      seededVacancies[6].id,
      seededVacancies[7].id,
      ...browseVacancies.map((v: any) => v.id),
    ];
    const channelAssignments = [
      ['Company Website', 'LinkedIn'],
      ['Company Website', 'Telegram'],
      ['LinkedIn', 'Indeed'],
      ['Facebook', 'LinkedIn'],
      ['Company Website', 'Glassdoor'],
      ['LinkedIn', 'Indeed'],
      ['Company Website'],
      ['LinkedIn'],
      ['Indeed', 'Telegram'],
      ['Company Website', 'Facebook'],
      ['LinkedIn', 'Glassdoor'],
      ['Company Website', 'Indeed'],
    ];
    for (let i = 0; i < publishedVacancyIds.length; i++) {
      const channelNames = channelAssignments[i % channelAssignments.length];
      for (const channelName of channelNames) {
        if (seededChannels[channelName]) {
          await prisma.vacancyJobPosting
            .create({
              data: {
                company_id: company.id,
                vacancy_id: publishedVacancyIds[i],
                recruitment_channel_id: seededChannels[channelName].id,
                posting_status: 'PUBLISHED',
                posted_at: new Date(),
              },
            })
            .catch(() => {
              /* ignore dup */
            });
        }
      }
    }
    console.log('✓ Recruitment sources, channels, and postings created');

    // ── Summary ─────────────────────────────────────────────────────────────────
    console.log('\n✅ Seeding completed successfully!');
    console.log('─────────────────────────────────────────────────────────');
    console.log('Test login credentials (password: Password)');
    console.log('  CEO:              ceo1@erms.com');
    console.log('  HR Admin:         hradmin1@erms.com');
    console.log('  HR Specialist:    hr1@erms.com');
    console.log('  Recruiter:        recruiter1@erms.com');
    console.log('  Hiring Manager:   hm1@erms.com');
    console.log('  Dept Manager:     dm1@erms.com');
    console.log('  Interviewer:      interviewer1@erms.com');
    console.log(
      '  Candidate:        canduser1@erms.com  ← 12 apps all statuses + 2 pending offers + 6 interviews + 10 notifications',
    );
    console.log(
      '  Candidate:        canduser2@erms.com  ← 5 apps + 1 pending offer',
    );
    console.log(
      '  Candidate:        canduser3@erms.com  ← 4 apps + 1 pending offer',
    );
    console.log('─────────────────────────────────────────────────────────');
    console.log('Coverage summary:');
    console.log('  WorkforcePlan:       2 per status × 8 statuses = 16 plans');
    console.log(
      '  RecruitmentRequest:  2 per status × 6 statuses = 12 requests + vacancy backing',
    );
    console.log(
      '  Vacancy:             2 per status × 7 statuses = 14 + 6 dedicated Browse vacancies = 20 total',
    );
    console.log(
      '  Application:         All 12 statuses covered + all 3 portal users fully covered',
    );
    console.log(
      '  Interview:           All 6 statuses (SCHEDULED×2, RESCHEDULED, COMPLETED×2, CANCELLED, EVALUATION_PENDING, FINALIZED)',
    );
    console.log(
      '  Offer:               All 5 statuses (SENT×3 for cu1, ACCEPTED×2, DECLINED, WITHDRAWN, EXPIRED)',
    );
    console.log(
      '  TalentRoster:        All 4 statuses (ACTIVE, PLACED, INACTIVE, WITHDRAWN)',
    );
    console.log(
      '  HiringMinute:        APPROVED + PENDING with full panels & signatories',
    );
    console.log(
      '  Notification:        10 for canduser1, 2 for canduser2, 2 for canduser3',
    );
    console.log('─────────────────────────────────────────────────────────');
    console.log('canduser1 portal coverage:');
    console.log('  Browse Jobs:    12 PUBLISHED vacancies visible immediately');
    console.log(
      '  Applications:   12 apps across all 12 statuses (SUBMITTED → MOVED_TO_TALENT_ROSTER)',
    );
    console.log(
      '  Interviews:     6 interviews (2×SCHEDULED, RESCHEDULED, 2×COMPLETED, FINALIZED)',
    );
    console.log(
      '  Offers:         2 SENT (pending action) + 1 ACCEPTED (history)',
    );
    console.log('  Notifications:  10 notifications (6 unread, 4 read)');
    console.log('─────────────────────────────────────────────────────────');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

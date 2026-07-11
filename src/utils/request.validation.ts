import { z } from 'zod';

import {
  registerSchema as authRegisterSchema,
  loginSchema as authLoginSchema,
  changePasswordSchema as authChangePasswordSchema,
  emailSigninSchema as authEmailSigninSchema,
} from './auth.validation';

import {
  createdepartmentSchema as workforceCreatedepartmentSchema,
  createWorkforcePlanSchema as workforceCreateWorkforcePlanSchema,
  updateWorkforcePlanSchema as workforceUpdateWorkforcePlanSchema,
} from './workforce.validation';

import { dateTimeSchema, emailSchema, uuidSchema } from './common.validation';

export const registerSchema = authRegisterSchema;

export const loginSchema = authLoginSchema;

export const changePasswordSchema = authChangePasswordSchema;

export const emailSigninSchema = authEmailSigninSchema;

export const candidateRegisterSchema = z

  .object({
    first_name: z.string().min(1),

    last_name: z.string().min(1),

    email: emailSchema,

    password: z.string().min(8),

    confirm_password: z.string().min(8),

    terms_accepted: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),

    company_id: z.union([z.string(), z.number()]).optional(),
  })

  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',

    path: ['confirm_password'],
  });

export const candidateLoginSchema = loginSchema;

export const applyVacancySchema = z

  .object({
    vacancy_id: z.string().min(1),

    cover_letter: z.string().optional(),

    cover_letter_file: z.any().optional(),

    expected_salary: z.number().positive().optional(),

    recruitment_source_id: z.string().optional(),
  })

  .strict();

export const candidateProfileSchema = z

  .object({
    first_name: z.string().min(1).optional(),

    last_name: z.string().min(1).optional(),

    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),

    date_of_birth: z.string().optional(),

    nationality: z.string().optional(),

    years_of_experience: z.number().int().nonnegative().optional(),

    current_employer: z.string().optional(),

    current_position: z.string().optional(),

    skills: z.array(z.string()).optional(),

    languages: z.array(z.string()).optional(),

    portfolio_url: z.string().optional(),

    preferred_job_category: z.string().optional(),

    preferred_location: z.string().optional(),

    expected_salary: z.number().positive().optional(),

    availability_status: z
      .enum(['IMMEDIATELY', 'TWO_WEEKS', 'ONE_MONTH', 'MORE_THAN_ONE_MONTH'])
      .optional(),

    remarks: z.string().optional(),
  })

  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field must be provided',
  });

export const experienceSchema = z

  .object({
    company_name: z.string().min(1),

    job_title: z.string().min(1),

    start_date: dateTimeSchema,

    end_date: z.string().nullable().optional(),

    total_months: z.number().int().nonnegative().optional(),

    description: z.string().optional(),

    document_url: z.string().optional(),
  })

  .strict();

export const experienceUpdateSchema = experienceSchema.partial().strict();

export const educationSchema = z

  .object({
    institution_name: z.string().min(1),

    degree: z.enum([
      'HIGH_SCHOOL',
      'CERTIFICATE',
      'DIPLOMA',
      'ASSOCIATE',
      'BACHELOR',
      'MASTER',
      'DOCTORATE',
    ]),

    field_of_study: z.string().min(1),

    graduation_year: z.number().int().min(1900).max(2100),

    certificate_url: z.string().optional(),
  })

  .strict();

export const educationUpdateSchema = educationSchema.partial().strict();

export const certificationSchema = z

  .object({
    name: z.string().min(1).max(150),

    issuing_organization: z.string().max(150).optional(),

    issue_date: z.string().optional(),

    expiration_date: z.string().optional(),

    credential_id: z.string().max(100).optional(),

    credential_url: z.string().url().max(255).optional(),
  })

  .strict();

export const certificationUpdateSchema = certificationSchema.partial().strict();

export const phoneSchema = z

  .object({
    phone_number: z.string().min(1),

    phone_type: z.enum(['PRIVATE', 'WORK', 'EMERGENCY', 'OTHER']).optional(),

    is_primary: z.boolean().optional(),
  })

  .strict();

export const phoneUpdateSchema = phoneSchema.partial().strict();

export const addressSchema = z

  .object({
    region: z.string().optional(),

    city: z.string().optional(),

    sub_city: z.string().optional(),

    woreda: z.string().optional(),
  })

  .strict();

export const candidateChangePasswordSchema = z

  .object({
    current_password: z.string().min(1),

    new_password: z.string().min(8),

    confirm_password: z.string().min(8),
  })

  .refine((data) => data.new_password === data.confirm_password, {
    message: 'New password and confirm password do not match',

    path: ['confirm_password'],
  })

  .strict();

export const updateStatusSchema = z

  .object({
    application_id: uuidSchema,

    status: z.string().min(1),

    current_stage: z.string().optional(),

    notes: z.string().optional(),

    screening_criteria_json: z.any().optional(),
  })

  .strict();

export const scheduleInterviewSchema = z

  .object({
    application_id: uuidSchema,

    round: z.number().int().positive(),

    type: z.enum(['physical', 'virtual', 'hybrid']),

    start_time: dateTimeSchema,

    end_time: dateTimeSchema,

    location: z.string().optional(),

    meeting_link: z.string().optional(),
  })

  .strict();

export const recordEvaluationSchema = z

  .object({
    interview_id: uuidSchema,

    status: z.enum(['passed', 'failed', 'on_hold']),

    notes: z.string().min(1),
  })

  .strict();

export const createInterviewSchema = z

  .object({
    application_id: uuidSchema,

    round: z.number().int().positive().optional(),

    type: z.string().min(1),

    start_time: dateTimeSchema,

    end_time: dateTimeSchema,

    meeting_link: z.string().optional(),

    office_location: z.string().optional(),

    google_maps_location: z.string().optional(),

    in_office_start_time: dateTimeSchema.optional(),

    in_office_end_time: dateTimeSchema.optional(),

    remote_start_time: dateTimeSchema.optional(),

    remote_end_time: dateTimeSchema.optional(),

    panel_member_ids: z.array(uuidSchema).optional(),
    interview_category_id: uuidSchema.optional(),
    questions_json: z.any().optional(),
  })

  .strict();

export const updateInterviewSchema = createInterviewSchema
  .extend({
    rescheduled_reason: z.string().min(1).optional(),
  })
  .partial()
  .strict();

export const generateQuestionsSchema = z
  .object({
    application_id: uuidSchema,
    interview_category_id: uuidSchema.optional(),
    limit: z.number().int().min(1).max(20).optional(),
  })
  .strict();

export const createEvaluationSchema = z

  .object({
    interview_id: uuidSchema,

    overall_score: z.number().int().min(1).max(10),

    comments: z.string().optional(),

    questions_json: z.any().optional(),
  })

  .strict();

export const updateEvaluationSchema = createEvaluationSchema.partial().strict();

// Evaluation submission schema with scores and recommendation (Prompt 3)
export const evaluationScoreSchema = z
  .object({
    criterion_id: z.string().optional(),
    criterion_name: z.string().optional(),
    name: z.string().optional(), // Alias for criterion_name to match frontend
    score: z.number().int().min(1),
  })
  .refine(
    (data) => data.criterion_id || data.criterion_name || data.name,
    'Either criterion_id, criterion_name, or name must be provided',
  );

export const submitEvaluationSchema = z
  .object({
    scores: z
      .array(evaluationScoreSchema)
      .min(1, 'At least one score is required'),
    comments: z.string().optional(),
    recommendation: z.enum([
      'STRONGLY_RECOMMEND',
      'RECOMMEND',
      'HOLD',       // matches frontend option and EvaluationRecommendation schema enum
      'NEUTRAL',    // legacy alias — keep for backward compat
      'DO_NOT_RECOMMEND',
    ]),
  })
  .strict();

export const updateEvaluationSubmissionSchema = submitEvaluationSchema
  .partial()
  .strict();

export const issueOfferSchema = z

  .object({
    application_id: uuidSchema,

    salary: z.number().positive(),

    start_date: dateTimeSchema,

    expiry_date: dateTimeSchema,
  })

  .strict();

export const addToRoasterSchema = z

  .object({
    candidate_id: uuidSchema,

    category: z.string().min(1),

    notes: z.string().min(1),
  })

  .strict();

export const offerResponseSchema = z

  .object({
    reason: z.string().min(1).optional(),
  })

  .strict();

export const refreshSchema = z

  .object({
    refreshToken: z.string().min(10),
  })

  .strict();

export const logoutSchema = refreshSchema;

export const createdepartmentSchema = workforceCreatedepartmentSchema;

export const createWorkforcePlanSchema = workforceCreateWorkforcePlanSchema;

export const updateWorkforcePlanSchema = workforceUpdateWorkforcePlanSchema;

export const rejectWorkforcePlanSchema = z

  .object({
    reason: z.string().min(1),
  })

  .strict();

export const forwardWorkforcePlanSchema = z

  .object({
    notes: z.string().min(1).optional(),
  })

  .strict();

export const returnWorkforcePlanSchema = z

  .object({
    reason: z.string().min(1),
  })

  .strict();

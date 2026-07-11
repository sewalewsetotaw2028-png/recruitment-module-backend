import { z } from 'zod';
import { uuidSchema } from './common.validation';

const requestTypeEnum = z.enum([
  'planned',
  'unplanned',
  'replacement',
  'new',
  'new_headcount',
  'NEW_HEADCOUNT',
  'REPLACEMENT',
]);
const planningTypeEnum = z.enum([
  'planned',
  'unplanned',
  'PLANNED',
  'UNPLANNED',
]);
const requestStatusEnum = z.enum([
  'draft',
  'submitted',
  'pending',
  'pending_ceo',
  'under_review',
  'approved',
  'rejected',
  'vacancies_posted',
]);

export const recruitmentRequestStateSchema = requestStatusEnum;

export const createRequestSchema = z
  .object({
    workforce_plan_item_id: uuidSchema.optional(),
    department_id: z.union([z.string().min(1), z.number().int().positive()]),
    job_title: z.string().optional(),
    request_title: z.string().optional(),
    position_name: z.string().optional(),
    employment_type: z.string().optional(),
    request_type: requestTypeEnum.optional(),
    planning_type: planningTypeEnum.optional(),
    priority: z.string().optional(),
    is_replacement: z.boolean().optional(),
    replacement_employee_id: z.string().optional(),
    replacement_reason: z.string().optional(),
    justification: z.string().min(10),
    supporting_document_name: z.string().optional(),
    status: requestStatusEnum.optional(),
    headcount: z.number().int().positive().optional(),
    custom_field_values: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const updateRequestSchema = createRequestSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .strict();

export const createVacancySchema = z
  .object({
    recruitment_request_id: uuidSchema,
    title: z.string().optional(),
    location: z.string().min(1),
    employment_type: z.string().optional(),
    salary_min: z.number().nonnegative().optional(),
    salary_max: z.number().nonnegative().optional(),
    description: z.string().min(1),
    responsibilities: z.string().min(1),
    requirements: z.string().min(1),
    open_positions: z.number().int().positive().optional(),
    required_experience: z.number().int().nonnegative().optional(),
    required_qualifications: z.string().optional(),
    closing_date: z.string().optional(),
    benefits: z.string().optional(),
    employmentTerms: z.string().optional(),
    skills: z.array(z.string()).optional(),
    experienceRequired: z.string().optional(),
  })
  .strict();

export const updateVacancySchema = z
  .object({
    recruitment_request_id: uuidSchema.optional(),
    title: z.string().optional(),
    location: z.string().optional(),
    employment_type: z.string().optional(),
    salary_min: z.number().nonnegative().optional(),
    salary_max: z.number().nonnegative().optional(),
    description: z.string().optional(),
    responsibilities: z.string().optional(),
    requirements: z.string().optional(),
    open_positions: z.number().int().positive().optional(),
    required_experience: z.number().int().nonnegative().optional(),
    required_qualifications: z.string().optional(),
    closing_date: z.string().optional(),
    benefits: z.string().optional(),
    employmentTerms: z.string().optional(),
    skills: z.array(z.string()).optional(),
    experienceRequired: z.string().optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .strict();

export const setVacancyStatusSchema = z
  .object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'CANCELLED']),
  })
  .strict();

export const approveVacancySchema = z
  .object({
    location: z.string().optional(),
    employment_type: z.string().optional(),
    salary_min: z.number().nonnegative().optional(),
    salary_max: z.number().nonnegative().optional(),
    description: z.string().optional(),
    responsibilities: z.string().optional(),
    requirements: z.string().optional(),
    open_positions: z.number().int().positive().optional(),
    required_experience: z.number().int().nonnegative().optional(),
    required_qualifications: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();

export const hrReviewRequestSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    notes: z.string().optional(),
  })
  .strict();

export const rejectReasonSchema = z
  .object({
    reason: z.string().min(10),
  })
  .strict();

// Prompt 5: Final Selection Decision
export const selectCandidateSchema = z
  .object({
    selected_application_id: uuidSchema,
    alternative_application_id: uuidSchema.optional(),
    reason_for_selection: z.string().min(10),
    reason_for_alternative: z.string().min(10).optional(),
    expected_salary: z.number().positive(),
    expected_joining_date: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.alternative_application_id && !data.reason_for_alternative) {
        return false;
      }
      return true;
    },
    {
      message:
        'reason_for_alternative is required when alternative_application_id is provided',
      path: ['reason_for_alternative'],
    },
  )
  .strict();

// Prompt 6: Hiring Minute Approval & Post-Selection Flows
export const approveHiringMinuteSchema = z.object({}).strict();

export const rejectHiringMinuteSchema = z
  .object({
    comments: z.string().min(10),
  })
  .strict();

export const addSignatorySchema = z
  .object({
    role: z.enum(['HR_REPRESENTATIVE', 'HIRING_MANAGER', 'CEO']),
    signatory_name: z.string().min(1),
  })
  .strict();

export const addTalentRosterSchema = z
  .object({
    application_ids: z.array(uuidSchema).min(1),
  })
  .strict();

export const sendRegretsSchema = z.object({}).strict();

export const createHiringMinuteSchema = z
  .object({
    vacancy_id: uuidSchema,
    recruitment_request_type: z.enum(['NEW_HEADCOUNT', 'REPLACEMENT']),
    recruitment_classification: z.enum(['PLANNED', 'UNPLANNED']),
    application_type: z.enum(['INTERNAL', 'EXTERNAL', 'BOTH']),
    interview_date: z.string().optional().nullable(),
    interview_time: z.string().optional().nullable(),
    interview_place: z.string().optional().nullable(),
    advertisement_date: z.string().optional().nullable(),
    application_closing_date: z.string().optional().nullable(),
    total_applications: z.number().int().nonnegative().optional().nullable(),
    total_screened: z.number().int().nonnegative().optional().nullable(),
    total_shortlisted: z.number().int().nonnegative().optional().nullable(),
    total_interviewed: z.number().int().nonnegative().optional().nullable(),
    sources_used: z.unknown().optional().nullable(),
    screening_criteria_used: z.unknown().optional().nullable(),
    stages_conducted: z.unknown().optional().nullable(),
    candidate_evaluation_summary: z.unknown().optional().nullable(),
    selected_candidate_id: uuidSchema.optional().nullable(),
    selected_candidate_score: z.number().optional().nullable(),
    expected_joining_date: z.string().optional().nullable(),
    recommended_position: z.string().optional().nullable(),
    expected_salary: z.number().positive().optional().nullable(),
    reason_for_selection: z.string().optional().nullable(),
    alternative_candidate_id: uuidSchema.optional().nullable(),
    alternative_candidate_score: z.number().optional().nullable(),
    reason_for_alternative: z.string().optional().nullable(),
    rejected_candidates_json: z.unknown().optional().nullable(),
    panel_recommendation: z
      .enum([
        'STRONGLY_RECOMMEND_HIRING',
        'RECOMMEND_HIRING',
        'HOLD_FOR_FURTHER_EVALUATION',
        'DO_NOT_RECOMMEND_HIRING',
      ])
      .optional().nullable(),
    recommendation_summary: z.string().optional().nullable(),
    hr_observation: z.string().optional().nullable(),
    final_decision: z
      .enum([
        'PENDING',
        'APPROVED',
        'REJECTED',
        'RETURNED_FOR_FURTHER_REVIEW',
      ])
      .optional().nullable(),
    decision_remarks: z.string().optional().nullable(),
  })
  .strict();

export const updateHiringMinuteSchema = createHiringMinuteSchema.partial().strict();

export function validateRequestTransition(
  currentState: z.infer<typeof recruitmentRequestStateSchema>,
  nextState: z.infer<typeof recruitmentRequestStateSchema>,
) {
  const validTransitions: Record<string, string[]> = {
    draft: ['pending'],
    pending: ['pending_ceo', 'rejected'],
    under_review: ['approved', 'rejected'],
    pending_ceo: ['approved', 'rejected'],
    approved: ['vacancies_posted'],
    rejected: [],
    vacancies_posted: [],
  };

  return validTransitions[currentState]?.includes(nextState) ?? false;
}

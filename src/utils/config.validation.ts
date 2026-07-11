import { z } from 'zod';
import { NotificationType } from '@prisma/client';
import { uuidSchema } from './common.validation';

// ─── Roles & Permissions ───────────────────────────────────────────────────────

export const createRoleSchema = z
  .object({
    name: z.string().min(1, 'Role name is required'),
    slug: z.string().min(1, 'Role slug is required'),
    description: z.string().optional(),
    // Permissions are usually assigned via the permission-matrix save action
    // (PUT /roles/:id/permissions). Keep optional here for convenience.
    permission_ids: z.array(uuidSchema).optional(),
    // Backward-compatible key (older clients)
    permissions: z.array(uuidSchema).optional(),
  })
  .strict();

export const updateRoleSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  })
  .strict();

export const setRolePermissionsSchema = z
  .object({
    // Prompt 1 contract: { permission_ids: string[] }
    permission_ids: z.array(uuidSchema).optional(),
    // Backward-compatible key (older clients)
    permissionIds: z.array(uuidSchema).optional(),
  })
  .strict()
  .refine((data) => data.permission_ids || data.permissionIds, {
    message: 'permission_ids is required',
  })
  .transform((data) => ({
    permission_ids: data.permission_ids ?? data.permissionIds ?? [],
  }));

export const setUserRolesSchema = z
  .object({
    roleIds: z.array(uuidSchema).min(1, 'At least one role is required'),
  })
  .strict();

export const assignUserRoleSchema = z
  .object({
    role_id: uuidSchema.optional(),
    // Backward-compatible key
    roleId: uuidSchema.optional(),
  })
  .strict()
  .refine((data) => data.role_id || data.roleId, {
    message: 'role_id is required',
  })
  .transform((data) => ({
    role_id: (data.role_id ?? data.roleId) as string,
  }));

// ─── Screening Criteria ───────────────────────────────────────────────────────

export const screeningCriterionFieldSchema = z.enum([
  'Educational Qualification',
  'Relevant Work Experience',
  'Professional Certification',
  'Technical Skills',
  'Language Proficiency',
  'Communication Skills',
  'Availability',
  'Salary Expectation',
  'Location Requirement',
  'Document Completeness',
]);

export const screeningCriterionOperatorSchema = z.enum([
  'required',
  'min_years',
  'equals',
  'contains',
]);

export const screeningCriterionSchema = z
  .object({
    field: screeningCriterionFieldSchema,
    operator: screeningCriterionOperatorSchema,
    value: z.any(),
    weight: z.number().min(0).max(100),
  })
  .strict();

const normalizeScreeningCriteriaInput = (input: unknown) => {
  if (!input || typeof input !== 'object') return input;
  const raw = input as Record<string, unknown>;
  return {
    vacancyId: raw.vacancyId ?? raw.vacancy_id,
    jobTemplateId: raw.jobTemplateId ?? raw.job_template_id,
    criteriaJson: raw.criteriaJson ?? raw.criteria_json,
    isActive: raw.isActive ?? raw.is_active,
  };
};

const screeningCriteriaWeightsAreValid = (
  criteriaJson?: Array<{ weight: number }>,
) => {
  if (!criteriaJson) return true;
  // Keep screening scores normalized so the total scoring model always sums to 100%.
  return (
    criteriaJson.reduce((sum, rule) => sum + Number(rule.weight ?? 0), 0) === 100
  );
};

export const createScreeningCriteriaSchema = z.preprocess(
  normalizeScreeningCriteriaInput,
  z
    .object({
      vacancyId: uuidSchema.optional(),
      jobTemplateId: uuidSchema.optional(),
      criteriaJson: z.array(screeningCriterionSchema).min(1),
      isActive: z.boolean().optional(),
    })
    .strict()
    .refine((data) => !(data.vacancyId && data.jobTemplateId), {
      message: 'Provide either vacancyId or jobTemplateId, not both',
    })
    .refine((data) => screeningCriteriaWeightsAreValid(data.criteriaJson), {
      message: 'Criteria weights must sum to 100',
    }),
);

export const updateScreeningCriteriaSchema = z.preprocess(
  normalizeScreeningCriteriaInput,
  z
    .object({
      criteriaJson: z.array(screeningCriterionSchema).optional(),
      isActive: z.boolean().optional(),
    })
    .strict()
    .refine((data) => screeningCriteriaWeightsAreValid(data.criteriaJson), {
      message: 'Criteria weights must sum to 100',
    }),
);

export const upsertVacancyScreeningCriteriaSchema = z.preprocess(
  normalizeScreeningCriteriaInput,
  z
    .object({
      criteriaJson: z.array(screeningCriterionSchema).min(1),
      isActive: z.boolean().optional(),
    })
    .strict()
    .refine((data) => screeningCriteriaWeightsAreValid(data.criteriaJson), {
      message: 'Criteria weights must sum to 100',
    }),
);

// ─── Evaluation Templates ─────────────────────────────────────────────────────

const normalizeEvaluationTemplateInput = (input: unknown) => {
  if (!input || typeof input !== 'object') return input;
  const raw = input as Record<string, unknown>;
  const criteria = Array.isArray(raw.criteria)
    ? raw.criteria.map((criterion) => {
        if (!criterion || typeof criterion !== 'object') return criterion;
        const item = criterion as Record<string, unknown>;
        return {
          name: item.name,
          weight: Number(item.weight),
          maxScore: Number(item.maxScore ?? item.max_score ?? 10),
          order: Number(item.order),
        };
      })
    : raw.criteria;

  return {
    name: raw.name,
    interviewCategoryId: raw.interviewCategoryId ?? raw.interview_category_id,
    isActive: raw.isActive ?? raw.is_active,
    criteria,
  };
};

const normalizeEvaluationTemplateCriteriaOnlyInput = (input: unknown) => {
  if (!input || typeof input !== 'object') return input;
  const raw = input as Record<string, unknown>;
  const criteria = Array.isArray(raw.criteria)
    ? raw.criteria.map((criterion) => {
        if (!criterion || typeof criterion !== 'object') return criterion;
        const item = criterion as Record<string, unknown>;
        return {
          name: item.name,
          weight: Number(item.weight),
          maxScore: Number(item.maxScore ?? item.max_score ?? 10),
          order: Number(item.order),
        };
      })
    : raw.criteria;

  return { criteria };
};

export const evaluationCriteriaSchema = z
  .object({
    name: z.string().min(1),
    weight: z.number().min(0).max(100),
    maxScore: z.number().min(1).max(10).optional(),
    order: z.number().int().min(0),
  })
  .strict();

export const createEvaluationTemplateSchema = z
  .preprocess(
    normalizeEvaluationTemplateInput,
    z
      .object({
        name: z.string().min(1, 'Template name is required'),
        interviewCategoryId: uuidSchema.optional(),
        isActive: z.boolean().optional(),
        criteria: z
          .array(evaluationCriteriaSchema)
          .min(1, 'At least one criterion is required'),
      })
      .strict(),
  )
  // Keep evaluation scoring percentages normalized so each template totals 100.
  .refine(
    (data) => data.criteria.reduce((sum, c) => sum + c.weight, 0) === 100,
    {
      message: 'Criteria weights must sum to 100',
    },
  );

export const updateEvaluationTemplateSchema = z
  .preprocess(
    normalizeEvaluationTemplateInput,
    z
      .object({
        name: z.string().min(1).optional(),
        interviewCategoryId: uuidSchema.optional(),
        isActive: z.boolean().optional(),
        criteria: z.array(evaluationCriteriaSchema).optional(),
      })
      .strict(),
  )
  .refine(
    (data) => {
      if (!data.criteria) return true;
      return data.criteria.reduce((sum, c) => sum + c.weight, 0) === 100;
    },
    { message: 'Criteria weights must sum to 100' },
  );

export const replaceEvaluationTemplateCriteriaSchema = z
  .preprocess(
    normalizeEvaluationTemplateCriteriaOnlyInput,
    z
      .object({
        criteria: z
          .array(evaluationCriteriaSchema)
          .min(1, 'At least one criterion is required'),
      })
      .strict(),
  )
  .refine(
    (data) => data.criteria.reduce((sum, c) => sum + c.weight, 0) === 100,
    { message: 'Criteria weights must sum to 100' },
  );

// ─── Notification Templates ────────────────────────────────────────────────────

export const updateNotificationTemplateSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== 'object') return input;
    const raw = input as Record<string, unknown>;
    return {
      subject: raw.subject,
      bodyHtml: raw.bodyHtml ?? raw.body_html,
      bodySms: raw.bodySms ?? raw.body_sms,
      isActive: raw.isActive ?? raw.is_active,
    };
  },
  z
    .object({
      subject: z.string().min(1).optional(),
      bodyHtml: z.string().optional(),
      bodySms: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
);

export const upsertNotificationTemplateSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== 'object') return input;
    const raw = input as Record<string, unknown>;
    return {
      subject: raw.subject,
      bodyHtml: raw.bodyHtml ?? raw.body_html,
      bodySms: raw.bodySms ?? raw.body_sms,
      isActive: raw.isActive ?? raw.is_active,
    };
  },
  z
    .object({
      subject: z.string().min(1, 'Subject is required'),
      bodyHtml: z.string().min(1, 'Body HTML is required'),
      bodySms: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
);

export const notificationTypeSchema = z.nativeEnum(NotificationType);

// ─── Recruitment Channels ─────────────────────────────────────────────────────

export const createRecruitmentChannelSchema = z
  .object({
    name: z.string().trim().min(1, 'Channel name is required'),
    description: z.string().trim().optional(),
    isAutomated: z.boolean().optional(),
    isActive: z.boolean().optional(),
    apiUrl: z
      .string()
      .trim()
      .url('Please enter a valid URL')
      .optional()
      .or(z.literal('')),
    apiToken: z.string().trim().optional(),
    apiUsername: z.string().trim().optional(),
    shareTemplate: z.string().trim().optional(),
  })
  .strict();

export const updateRecruitmentChannelSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    isAutomated: z.boolean().optional(),
    isActive: z.boolean().optional(),
    apiUrl: z
      .string()
      .trim()
      .url('Please enter a valid URL')
      .optional()
      .or(z.literal('')),
    apiToken: z.string().trim().optional(),
    apiUsername: z.string().trim().optional(),
    shareTemplate: z.string().trim().optional(),
  })
  .strict();

// ─── Recruitment Sources ───────────────────────────────────────────────────────

export const createRecruitmentSourceSchema = z
  .object({
    name: z.string().trim().min(1, 'Source name is required'),
    description: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateRecruitmentSourceSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ─── Interview Categories ─────────────────────────────────────────────────────

export const createInterviewCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'Category name is required'),
    description: z.string().trim().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const updateInterviewCategorySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

// ─── Approval Workflows ───────────────────────────────────────────────────────

export const approvalWorkflowStageSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== 'object') return input;
    const raw = input as Record<string, unknown>;
    // Accept both snake_case (prompt spec) and camelCase (existing UI)
    return {
      stageOrder: raw.stageOrder ?? raw.stage_order,
      stageName: raw.stageName ?? raw.stage_name,
      approverRoleId: raw.approverRoleId ?? raw.approver_role_id,
      isMandatory: raw.isMandatory ?? raw.is_mandatory,
    };
  },
  z
    .object({
      stageOrder: z.number().int().min(0),
      stageName: z.string().min(1, 'Stage name is required'),
      approverRoleId: uuidSchema.optional(),
      isMandatory: z.boolean().optional(),
    })
    .strict(),
);

export const createApprovalWorkflowSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== 'object') return input;
    const raw = input as Record<string, unknown>;
    // Accept both snake_case (prompt spec) and camelCase (existing UI)
    return {
      name: raw.name,
      entityType: raw.entityType ?? raw.entity_type,
      stages: raw.stages,
    };
  },
  z
    .object({
      name: z.string().min(1, 'Workflow name is required'),
      entityType: z.enum(['WorkforcePlan', 'RecruitmentRequest', 'HiringMinute']),
      stages: z
        .array(approvalWorkflowStageSchema)
        .min(1, 'At least one stage is required'),
    })
    .strict()
    .refine(
      (data) => {
        const orders = data.stages.map((s) => s.stageOrder);
        const uniqueOrders = new Set(orders);
        return orders.length === uniqueOrders.size;
      },
      { message: 'Stage orders must be unique' },
    ),
);

export const updateApprovalWorkflowSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== 'object') return input;
    const raw = input as Record<string, unknown>;
    return {
      name: raw.name,
      isActive: raw.isActive ?? raw.is_active,
    };
  },
  z
    .object({
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
);

export const updateApprovalWorkflowStagesSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== 'object') return input;
    const raw = input as Record<string, unknown>;
    return { stages: raw.stages };
  },
  z
    .object({
      stages: z
        .array(approvalWorkflowStageSchema)
        .min(1, 'At least one stage is required'),
    })
    .strict()
    .refine(
      (data) => {
        const orders = data.stages.map((s) => s.stageOrder);
        const uniqueOrders = new Set(orders);
        return orders.length === uniqueOrders.size;
      },
      { message: 'Stage orders must be unique' },
    ),
);

// ─── Job Templates ───────────────────────────────────────────────────────

const normalizeJobTemplateInput = (input: unknown) => {
  if (!input || typeof input !== 'object') return input;
  const raw = input as Record<string, unknown>;
  return {
    title: raw.title,
    employmentType: raw.employmentType ?? raw.employment_type,
    jobGrade: raw.jobGrade ?? raw.job_grade,
    summary: raw.summary,
    responsibilities: raw.responsibilities,
    requirements: raw.requirements,
    isActive: raw.isActive ?? raw.is_active,
  };
};

const normalizeJobDescriptionInput = (input: unknown) => {
  if (!input || typeof input !== 'object') return input;
  const raw = input as Record<string, unknown>;
  return {
    title: raw.title,
    summary: raw.summary,
    responsibilities: raw.responsibilities,
    requirements: raw.requirements,
    qualifications: raw.qualifications,
    employmentType: raw.employmentType ?? raw.employment_type,
    jobGrade: raw.jobGrade ?? raw.job_grade,
  };
};

export const createJobTemplateSchema = z.preprocess(
  normalizeJobTemplateInput,
  z
    .object({
      title: z.string().min(1, 'Template title is required'),
      employmentType: z.enum([
        'FULL_TIME',
        'PART_TIME',
        'CONTRACT',
        'INTERNSHIP',
        'TEMPORARY',
        'CONSULTANT',
      ]),
      jobGrade: z.string().optional(),
      summary: z.string().optional(),
      responsibilities: z.string().min(1, 'Responsibilities are required'),
      requirements: z.string().min(1, 'Requirements are required'),
      isActive: z.boolean().optional(),
    })
    .strict(),
);

export const updateJobTemplateSchema = z.preprocess(
  normalizeJobTemplateInput,
  z
    .object({
      title: z.string().min(1).optional(),
      employmentType: z
        .enum([
          'FULL_TIME',
          'PART_TIME',
          'CONTRACT',
          'INTERNSHIP',
          'TEMPORARY',
          'CONSULTANT',
        ])
        .optional(),
      jobGrade: z.string().optional(),
      summary: z.string().optional(),
      responsibilities: z.string().optional(),
      requirements: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
);

export const createJobDescriptionSchema = z.preprocess(
  normalizeJobDescriptionInput,
  z
    .object({
      title: z.string().min(1, 'Description title is required'),
      summary: z.string().optional(),
      responsibilities: z.string().min(1, 'Responsibilities are required'),
      requirements: z.string().min(1, 'Requirements are required'),
      qualifications: z.string().optional(),
      employmentType: z
        .enum([
          'FULL_TIME',
          'PART_TIME',
          'CONTRACT',
          'INTERNSHIP',
          'TEMPORARY',
          'CONSULTANT',
        ])
        .optional(),
      jobGrade: z.string().optional(),
    })
    .strict(),
);

// ─── Custom Fields ───────────────────────────────────────────────────────

export const createCustomFieldSchema = z
  .object({
    // Custom fields are scoped per entity type so the same label can be reused
    // independently for vacancies, requests, candidates, and applications.
    entityType: z.enum([
      'Application',
      'Candidate',
      'Vacancy',
      'RecruitmentRequest',
    ]),
    fieldName: z.string().min(1, 'Field name is required'),
    fieldType: z.enum(['text', 'number', 'date', 'boolean', 'select']),
    isRequired: z.boolean().optional(),
    options: z.string().optional(),
  })
  .strict();

export const updateCustomFieldSchema = z
  .object({
    fieldName: z.string().min(1).optional(),
    fieldType: z.enum(['text', 'number', 'date', 'boolean', 'select']).optional(),
    isRequired: z.boolean().optional(),
    options: z.string().optional(),
  })
  .strict();

// ─── Company Profile ───────────────────────────────────────────────────────

const normalizeCompanyProfileInput = (input: unknown) => {
  if (!input || typeof input !== 'object') return input;
  const raw = input as Record<string, unknown>;

  const clean = (value: unknown) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  };

  return {
    name: clean(raw.name),
    email: clean(raw.email),
    logoUrl: clean(raw.logoUrl ?? raw.logo_url),
    primaryColor: clean(raw.primaryColor ?? raw.primary_color),
    secondaryColor: clean(raw.secondaryColor ?? raw.secondary_color),
    stampUrl: clean(raw.stampUrl ?? raw.stamp_url),
    industry: clean(raw.industry),
    phone: clean(raw.phone),
    address: clean(raw.address),
    website: clean(raw.website),
  };
};

export const updateCompanyProfileSchema = z.preprocess(
  normalizeCompanyProfileInput,
  z
    .object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      logoUrl: z.string().url().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      stampUrl: z.string().url().optional(),
      industry: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      website: z.string().url().optional(),
    })
    .strict(),
);

export const createInternalUserSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    roleIds: z.array(z.string()).min(1, 'At least one role is required'),
  })
  .strict();

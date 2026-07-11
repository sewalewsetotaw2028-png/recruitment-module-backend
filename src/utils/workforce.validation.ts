import { z } from 'zod';
import { dateTimeSchema } from './common.validation';

const normalizeEnumInput = (value: unknown) => {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase().replace(/-/g, '_');
};

const intIdSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    return value;
  },
  z.number().int().positive(),
);

const planningPeriodEnumSchema = z.preprocess(
  normalizeEnumInput,
  z.enum(['ANNUAL', 'QUARTERLY', 'SEMI_ANNUAL', 'MONTHLY']),
);

const planningQuarterEnumSchema = z.preprocess(
  normalizeEnumInput,
  z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
);

const workforcePlanStatusEnumSchema = z.preprocess(
  normalizeEnumInput,
  z.enum([
    'DRAFT',
    'SUBMITTED',
    'UNDER_HR_REVIEW',
    'UNDER_CEO_REVIEW',
    'APPROVED',
    'REJECTED',
    'RETURNED_FOR_REVISION',
    'CLOSED',
  ]),
);

const employment_typeEnumSchema = z.preprocess(
  normalizeEnumInput,
  z.enum([
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERNSHIP',
    'TEMPORARY',
    'CONSULTANT',
  ]),
);

const priorityLevelEnumSchema = z.preprocess(
  normalizeEnumInput,
  z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
);

const positionTypeEnumSchema = z.preprocess(
  normalizeEnumInput,
  z.enum(['NEW', 'REPLACEMENT']),
);

const workforcePlanItemSchema = z
  .object({
    department_id: intIdSchema.optional(),
    department_name: z.string().optional(),
    job_title: z.string().min(1),
    employment_type: employment_typeEnumSchema,
    headcount: z.number().int().positive(),
    planned_start: dateTimeSchema,
    justification: z.string().min(1),

    // Optional fields supported by Prisma WorkforcePlanItem
    job_grade: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
    salary_budget: z.coerce.number().positive().optional(),
    position_type: positionTypeEnumSchema.optional(),
    replacement_employee_ref: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
    priority: priorityLevelEnumSchema.optional(),
    expected_impact: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
    required_qualifications: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
    remarks: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (!item.department_id && !item.department_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Each item must include department_id or department_name',
      });
    }
  });

export const createdepartmentSchema = z
  .object({
    name: z.string().min(1).max(100),
    parent_department_id: intIdSchema.optional(),
  })
  .strict();

export const createWorkforcePlanSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(1).max(200),
    /**
     * Backward-compatible:
     * - legacy: "2026" (with planning_type = annual|quarterly|...)
     * - prisma-aligned: "ANNUAL" | "QUARTERLY" | ...
     */
    planning_period: z.preprocess(
      (val) => (typeof val === 'number' ? String(val) : val),
      z.string().min(1),
    ),
    /**
     * Legacy planning field (optional but accepted).
     * Prisma uses planning_period enum + year/quarter/month fields.
     */
    planning_type: planningPeriodEnumSchema.optional(),
    planning_year: z.coerce.number().int().min(1900).max(2100).optional(),
    planning_quarter: planningQuarterEnumSchema.optional(),
    planning_month: z.coerce.number().int().min(1).max(12).optional(),
    justification: z.string().min(1),
    status: workforcePlanStatusEnumSchema.optional(),
    business_unit: z.string().optional(),
    // Legacy/unused fields (accepted to avoid breaking existing clients)
    department_name: z.string().optional(),
    start_date: dateTimeSchema.optional(),
    end_date: dateTimeSchema.optional(),
    justification_type: z.string().optional(),
    supporting_document_name: z.string().optional(),
    hr_comments: z.string().optional(),
    ceo_comments: z.string().optional(),
    supporting_documents: z.array(z.string().min(1)).optional(),
    items: z.array(workforcePlanItemSchema).min(1),
  })
  .strict();

export const updateWorkforcePlanSchema = createWorkforcePlanSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .strict();

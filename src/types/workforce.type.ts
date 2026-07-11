export interface CreatedepartmentDTO {
  name: string;
  // Prisma: department.parent_department_id is Int?
  // Accept number or numeric string (controllers validate/coerce with Zod)
  parent_department_id?: number | string;
}

export interface departmentDTO {
  // Prisma: department.id is Int
  id: number;
  name: string;
  parent_department_id?: number | null;
  // Keep as Date|string depending on serialization; runtime uses Prisma Dates.
  created_at: string | Date;
  updated_at: string | Date;
}

export type WorkforcePlanStatusInput =
  | 'draft'
  | 'submitted'
  | 'under_hr_review'
  | 'under_ceo_review'
  | 'approved'
  | 'rejected'
  | 'returned_for_revision'
  | 'closed'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_HR_REVIEW'
  | 'UNDER_CEO_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED_FOR_REVISION'
  | 'CLOSED';

export type PlanningPeriodInput =
  | 'annual'
  | 'quarterly'
  | 'semi_annual'
  | 'monthly'
  | 'ANNUAL'
  | 'QUARTERLY'
  | 'SEMI_ANNUAL'
  | 'MONTHLY';

export type PlanningQuarterInput = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export type employment_typeInput =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship'
  | 'temporary'
  | 'consultant'
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERNSHIP'
  | 'TEMPORARY'
  | 'CONSULTANT';

export type PriorityLevelInput =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type PositionTypeInput =
  | 'new'
  | 'replacement'
  | 'NEW'
  | 'REPLACEMENT';

export interface WorkforcePlanItemDTO {
  // Prisma: WorkforcePlanItem.department_id is Int
  department_id?: number | string;
  department_name?: string;
  job_title: string;
  employment_type: employment_typeInput;
  headcount: number;
  planned_start: string; // ISO Date string
  justification: string;

  // Optional fields supported by Prisma schema
  job_grade?: string;
  salary_budget?: number;
  position_type?: PositionTypeInput;
  replacement_employee_ref?: string;
  priority?: PriorityLevelInput;
  expected_impact?: string;
  required_qualifications?: string;
  remarks?: string;
}

export interface CreateWorkforcePlanDTO {
  id?: string;
  title: string;
  /**
   * Legacy input: "2026" or similar (used together with planning_type).
   * Prisma-aligned input: also accept enum-like values (ANNUAL/QUARTERLY/...)
   */
  planning_period: string;
  /**
   * Legacy field (kept for backward compatibility).
   * Prisma schema uses planning_period enum + planning_year/planning_quarter/planning_month.
   */
  planning_type?: PlanningPeriodInput;
  // Prisma-aligned planning fields (optional, but preferred)
  planning_year?: number;
  planning_quarter?: PlanningQuarterInput;
  planning_month?: number;

  justification: string;
  status?: WorkforcePlanStatusInput;
  business_unit?: string;
  /** Legacy/unused (accepted for backward compatibility) */
  department_name?: string;
  /** Legacy/unused (accepted for backward compatibility) */
  start_date?: string;
  /** Legacy/unused (accepted for backward compatibility) */
  end_date?: string;
  /** Legacy/unused (accepted for backward compatibility) */
  justification_type?: string;
  /** Legacy (if provided, can be appended into supporting_documents) */
  supporting_document_name?: string;
  submitted_at?: string;
  hr_comments?: string;
  ceo_comments?: string;
  supporting_documents?: string[];
  items: WorkforcePlanItemDTO[];
}

export interface UpdateWorkforcePlanDTO extends Omit<Partial<CreateWorkforcePlanDTO>, 'status'> {}

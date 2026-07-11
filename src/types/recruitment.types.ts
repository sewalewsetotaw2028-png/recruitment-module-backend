export interface CreateRequestDTO {
  id?: string;
  workforce_plan_item_id?: string; // Optional (NULL for unplanned)
  department_id: number;
  job_title?: string;
  request_title?: string;
  position_name?: string;
  employment_type?: string;
  request_type: 'NEW_HEADCOUNT' | 'REPLACEMENT';
  planning_type: 'PLANNED' | 'UNPLANNED';
  priority?: string;
  is_replacement: boolean;
  replacement_employee_id?: string;
  replacement_reason?: string;
  justification: string;
  supporting_document_name?: string;
  status?: string;
  headcount?: number;
  custom_field_values?: Record<string, unknown>;
}

export interface UpdateRequestDTO extends Partial<CreateRequestDTO> {}

export interface CreateVacancyDTO {
  recruitment_request_id: string;
  title?: string;
  location: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  description: string;
  responsibilities: string;
  requirements: string;
  open_positions?: number;
  required_experience?: number;
  required_qualifications?: string;
  closing_date?: string;
  benefits?: string;
  employmentTerms?: string;
  skills?: string[];
  experienceRequired?: string;
}

export interface UpdateVacancyDTO extends Partial<CreateVacancyDTO> {}

export interface ApproveVacancyDTO extends Partial<CreateVacancyDTO> {}

export interface CreateHiringMinuteDTO {
  vacancy_id: string;
  recruitment_request_type: 'NEW_HEADCOUNT' | 'REPLACEMENT';
  recruitment_classification: 'PLANNED' | 'UNPLANNED';
  application_type: 'INTERNAL' | 'EXTERNAL' | 'BOTH';
  interview_date?: string;
  interview_time?: string;
  interview_place?: string;
  advertisement_date?: string;
  application_closing_date?: string;
  total_applications?: number;
  total_screened?: number;
  total_shortlisted?: number;
  total_interviewed?: number;
  sources_used?: any;
  screening_criteria_used?: any;
  stages_conducted?: any;
  candidate_evaluation_summary?: any;
  selected_candidate_id?: string;
  selected_candidate_score?: number;
  expected_joining_date?: string;
  recommended_position?: string;
  expected_salary?: number;
  reason_for_selection?: string;
  alternative_candidate_id?: string;
  alternative_candidate_score?: number;
  reason_for_alternative?: string;
  rejected_candidates_json?: any;
  panel_recommendation?:
    | 'STRONGLY_RECOMMEND_HIRING'
    | 'RECOMMEND_HIRING'
    | 'HOLD_FOR_FURTHER_EVALUATION'
    | 'DO_NOT_RECOMMEND_HIRING';
  recommendation_summary?: string;
  hr_observation?: string;
  final_decision?:
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'RETURNED_FOR_FURTHER_REVIEW';
  decision_remarks?: string;
}

export interface UpdateHiringMinuteDTO extends Partial<CreateHiringMinuteDTO> {}

export interface RejectReasonDTO {
  reason: string;
}

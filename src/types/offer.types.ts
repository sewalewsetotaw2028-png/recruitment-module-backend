export interface CreateOfferDTO {
  application_id: string;
  salary: number;
  start_date: string; // ISO Date
  expiry_date: string; // ISO Date
  offer_notes?: string;
  template_id?: string;
  employment_type?:
    | 'FULL_TIME'
    | 'PART_TIME'
    | 'CONTRACT'
    | 'INTERNSHIP'
    | 'TEMPORARY'
    | 'CONSULTANT';
  allowances?: Record<string, number> | any;
}

export interface talentRosterDTO {
  candidate_id: string;
  category: string; // e.g., "Senior Backend", "React Specialist"
  notes: string;
  source_stage?: string;
  sourced_from_vacancy_id?: string;
  expected_salary?: number;
  recruitment_source_id?: string;
  force_add?: boolean;
}

export interface OfferResponseDTO {
  reason?: string;
}

export interface OfferSummaryDTO {
  id: string;
  company_id: string;
  candidate_id: string;
  application_id: string;
  salary: number;
  start_date: string;
  expiry_date: string;
  status: string;
}

import { DegreeLevel, AvailabilityStatus, PhoneType, Gender } from '@prisma/client';

export interface CandidateRegisterDTO {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password?: string;
  terms_accepted?: boolean;
  company_id?: string;
}

export interface CandidateLoginDTO {
  email: string;
  password: string;
}

/** Updatable candidate profile fields — all optional for PATCH semantics */
export interface CandidateProfileUpdateDTO {
  first_name?: string;
  last_name?: string;
  gender?: Gender;
  date_of_birth?: string;
  nationality?: string;
  years_of_experience?: number;
  current_employer?: string;
  current_position?: string;
  skills?: string[];
  languages?: string[];
  portfolio_url?: string;
  preferred_job_category?: string;
  preferred_location?: string;
  expected_salary?: number;
  availability_status?: AvailabilityStatus;
  remarks?: string;
}

export interface ApplyVacancyDTO {
  vacancy_id: string;
  cover_letter_text?: string;
  cover_letter_url?: string;
  expected_salary?: number;
  recruitment_source_id?: string;
}

export interface CandidateExperienceDTO {
  company_name: string;
  job_title: string;
  start_date: string;
  end_date?: string | null;
  description?: string;
  document_url?: string;
  total_months?: number;
}

export interface CandidateExperienceUpdateDTO extends Partial<CandidateExperienceDTO> {}

export interface CandidateEducationDTO {
  institution_name: string;
  degree: DegreeLevel;
  field_of_study: string;
  graduation_year: number;
  certificate_url?: string;
}

export interface CandidateEducationUpdateDTO extends Partial<CandidateEducationDTO> {}

export interface CandidateCertificationDTO {
  name: string;
  issuing_organization?: string;
  issue_date?: string;
  expiration_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export interface CandidateCertificationUpdateDTO extends Partial<CandidateCertificationDTO> {}

export interface CandidatePhoneDTO {
  phone_number: string;
  phone_type?: PhoneType;
  is_primary?: boolean;
}

export interface CandidatePhoneUpdateDTO extends Partial<CandidatePhoneDTO> {}

export interface CandidateAddressDTO {
  region?: string;
  city?: string;
  sub_city?: string;
  woreda?: string;
}

export interface CandidateAddressUpdateDTO extends Partial<CandidateAddressDTO> {}

export interface CandidateChangePasswordDTO {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface CandidateOfferResponseDTO {
  reason?: string;
}

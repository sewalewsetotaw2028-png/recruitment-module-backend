export interface CreateOfferDTO {
  application_id: string;
  salary: number;
  start_date: string; // ISO Date
  expiry_date: string; // ISO Date
  offer_notes?: string;
}

export interface talentRosterDTO {
  candidate_id: string;
  category: string; // e.g., "Senior Backend", "React Specialist"
  notes: string;
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

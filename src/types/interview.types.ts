export interface UpdateApplicationStatusDTO {

  application_id: string;

  status: string; // 'shortlisted', 'rejected', 'interview', 'hired'

  current_stage?: string; // e.g., 'Technical Round 1'
  notes?: string;
  rejection_reason?: string;
  scores_json?: unknown;
  screening_criteria_json?: unknown;
  add_to_talent_roster?: boolean;
  future_fit_tag?: string;

}



export interface ScheduleInterviewDTO {

  application_id: string;

  round: number;

  type: 'physical' | 'virtual' | 'hybrid';

  start_time: string; // ISO string

  end_time: string; // ISO string

  location?: string;

  meeting_link?: string;

}



export interface SubmitEvaluationDTO {

  interview_id: string;

  status: 'passed' | 'failed' | 'on_hold';

  notes: string;

}



export interface CreateInterviewDTO {

  application_id: string;

  round?: number;

  type: string;

  start_time: string;

  end_time: string;

  meeting_link?: string;

  office_location?: string;

  google_maps_location?: string;

  in_office_start_time?: string;

  in_office_end_time?: string;

  remote_start_time?: string;

  remote_end_time?: string;

  panel_member_ids?: string[];
  interview_category_id?: string;
  questions_json?: unknown;
}

export interface UpdateInterviewDTO extends Partial<CreateInterviewDTO> {
  rescheduled_reason?: string;
}

export interface GenerateQuestionsDTO {
  application_id: string;
  interview_category_id?: string;
  limit?: number;
}

export interface CreateEvaluationDTO {

  interview_id: string;

  overall_score: number;

  comments?: string;

  questions_json?: unknown;

}



export interface UpdateEvaluationDTO extends Partial<CreateEvaluationDTO> {}


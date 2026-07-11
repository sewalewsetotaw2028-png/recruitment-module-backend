export interface NotificationCreateDTO {
  company_id: string;
  recipient_id: string;
  recipient_type: 'candidate' | 'recruiter' | 'hiring_manager' | 'admin';
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationDTO {
  id: string;
  company_id: string;
  recipient_id: string;
  recipient_type: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  read_at?: string;
}

export interface RegisterDTO {
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  terms_accepted: boolean;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface EmailSigninDTO {
  email: string;
}

export interface AuthTokenPayload {
  id: string;
  company_id: string;
  role?: string;
  roles?: string[];
  candidate_id?: string;
}

export interface AuthUserDTO {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_id: string;
  company_name?: string;
  role: string;
  roles?: string[];
  department_id?: string;
  department_name?: string;
}

export interface AuthResponseDTO {
  token: string;
  user: AuthUserDTO;
}

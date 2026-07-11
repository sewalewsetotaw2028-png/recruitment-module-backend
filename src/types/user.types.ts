export interface UserDTO {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_id: string;
  role?: string;
}

export interface UserProfileDTO {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_id: string;
}

export interface UserRoleDTO {
  id: string;
  name: string;
  slug: string;
  company_id: string;
}

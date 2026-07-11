import { PermissionKey } from '../config/rolePermissions';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        company_id: string | number;
        roles?: string[];
        role?: string;
        permissions?: PermissionKey[];
        candidate_id?: string;
        department_id?: string;
        department_name?: string;
      };
      file?: Express.Multer.File;
    }
  }
}

export {};

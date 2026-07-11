import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import prisma from '../config/database';
import {
  ROLES,
  allRoleSlugs,
  normalizeRoleSlug,
  PermissionKey,
  RoleSlug,
} from '../config/rolePermissions';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    company_id: any;
    roles?: string[];
    role?: string;
    permissions?: PermissionKey[];
    candidate_id?: string;
    department_id?: string;
    department_name?: string;
  };
  file?: Express.Multer.File;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'undefined' || token === 'null') {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  try {
    const jwtSecret =
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === 'production' ? '' : 'dev-jwt-secret');
    if (!jwtSecret) {
      return next(new AppError('JWT secret is not configured.', 500));
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      id: string;
      company_id: string;
      roles?: string[];
      role?: string;
      candidate_id?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        app_user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        company: true,
      },
    });

    if (user) {
      const normalizedRoles = Array.from(
        new Set(
          user.app_user_roles
            .map((userRole) => normalizeRoleSlug(userRole.role.slug))
            .map((role) =>
              allRoleSlugs.has(role as RoleSlug)
                ? (role as RoleSlug)
                : undefined,
            )
            .filter(Boolean) as RoleSlug[],
        ),
      );

      const effectiveRole =
        normalizedRoles.length > 0
          ? normalizedRoles[0]
          : normalizeRoleSlug(decoded.role || ROLES.CANDIDATE);

      /**
       * Resolve effective permissions from the database (authoritative runtime source):
       *
       * AppUserRole → AppRole → AppRolePermission → AppPermission.slug
       *
       * We intentionally do NOT rely on JWT claims or the hardcoded default matrix,
       * because HR Admin can change role→permission mappings in the config UI.
       */
      const permissions = Array.from(
        new Set(
          user.app_user_roles.flatMap((ur) =>
            ur.role.role_permissions.map((rp) => rp.permission.slug),
          ),
        ),
      ) as PermissionKey[];

      const candidate = await prisma.candidate.findFirst({
        where: { email: user.email, company_id: user.company_id },
      });
      const department = await prisma.department.findFirst({
        where: { company_id: user.company_id, manager_id: user.id },
        orderBy: { name: 'asc' },
      });

      req.user = {
        id: user.id,
        company_id: user.company_id,
        roles: normalizedRoles,
        role: effectiveRole,
        permissions,
        candidate_id: candidate?.id,
        department_id: department ? String(department.id) : undefined,
        department_name: department?.name,
      };

      next();
      return;
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: decoded.id },
    });
    if (!candidate) return next(new AppError('User not found', 401));

    req.user = {
      id: candidate.id,
      company_id: candidate.company_id,
      roles: [ROLES.CANDIDATE],
      role: ROLES.CANDIDATE,
      permissions: [],
      candidate_id: candidate.id,
      department_id: undefined,
      department_name: undefined,
    };

    next();
  } catch (error) {
    next(new AppError('Invalid or expired token.', 401));
  }
};

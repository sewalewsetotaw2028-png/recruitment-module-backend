import { Request, RequestHandler, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import {
  allPermissionKeys,
  allRoleSlugs,
  normalizeRoleSlug,
  PermissionKey,
  RoleSlug,
} from '../config/rolePermissions';
import { AuthRequest } from './authMiddleware';

type Guardable = RoleSlug | PermissionKey | string;

export const authorize = (allowed: Guardable[] | Guardable): RequestHandler => {
  const allowedValues = Array.isArray(allowed) ? allowed : [allowed];

  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const user = authReq.user;

    if (!user) {
      return next(new AppError('Authentication required.', 401));
    }

    const userRoles = user.roles ?? (user.role ? [user.role] : []);
    const normalizedUserRoles = Array.from(
      new Set(
        userRoles
          .map((role) => normalizeRoleSlug(role))
          .filter((role): role is RoleSlug => allRoleSlugs.has(role as RoleSlug)),
      ),
    );

    /**
     * Permission checking uses slugs that come from the DB at login time
     * (see authMiddleware):
     *
     * AppUserRole → AppRole → AppRolePermission → AppPermission.slug
     *
     * We deliberately avoid a hardcoded role→permission matrix at runtime so
     * that config UI changes take effect immediately without redeploys.
     */
    const userPermissions = user.permissions ?? [];

    const hasRoleAccess = allowedValues.some((permissionOrRole) => {
      const normalized = normalizeRoleSlug(permissionOrRole);
      return (
        allRoleSlugs.has(normalized as RoleSlug) &&
        normalizedUserRoles.includes(normalized as RoleSlug)
      );
    });

    const hasPermissionAccess = allowedValues.some((permissionOrRole) => {
      // Developer guard: only treat known permission slugs as permissions.
      // If a route passes an invalid string here, it should deny access.
      if (!allPermissionKeys.has(permissionOrRole as PermissionKey)) return false;
      return userPermissions.includes(permissionOrRole as PermissionKey);
    });

    if (!hasRoleAccess && !hasPermissionAccess) {
      return next(
        new AppError('Forbidden: insufficient permissions.', 403),
      );
    }

    next();
  };
};


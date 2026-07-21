import { Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { AuthRequest } from './authMiddleware';

/**
 * Middleware that checks whether the authenticated user's email has been verified.
 *
 * Returns a 403 error if `req.user.is_email_verified` is not `true`.
 *
 * Supports an optional `skipPaths` array — routes whose path starts with any
 * of the given prefixes will bypass the check. This is useful for read-only
 * endpoints that should remain accessible to unverified users (e.g. fetching
 * profile, viewing job listings, reading notifications).
 *
 * Usage:
 *   router.patch('/profile', requireEmailVerification(), updateProfile);
 *   router.get('/profile', requireEmailVerification(['/profile']), getProfile);
 *
 * @param skipPaths - Optional list of path prefixes to skip verification for.
 */
export const requireEmailVerification =
  (skipPaths?: string[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction) => {
    // Bypass check for paths in the skip list
    if (skipPaths && skipPaths.length > 0) {
      const shouldSkip = skipPaths.some((path) => req.path.startsWith(path));
      if (shouldSkip) {
        return next();
      }
    }

    if (!req.user?.is_email_verified) {
      return next(
        new AppError(
          'Email verification required. Please verify your email address to access this feature.',
          403,
        ),
      );
    }

    next();
  };

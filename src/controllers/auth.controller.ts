import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/authMiddleware';
import { AuthService } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import prisma from '../config/database';
import {
  normalizeRoleSlug,
  RoleSlug,
} from '../config/rolePermissions';
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  logoutSchema,
  emailSigninSchema,
} from '../utils/request.validation';
import {
  isValidRefreshToken,
  revokeRefreshToken,
  storeRefreshToken,
} from '../services/refreshToken.service';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await AuthService.register(registerSchema.parse(req.body));
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await AuthService.login(loginSchema.parse(req.body));
    res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        company: true,
        app_user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const roleSlug = user.app_user_roles[0]?.role.slug || 'candidate';
    const normalizedRoles = Array.from(
      new Set(
        user.app_user_roles
          .map((userRole) => normalizeRoleSlug(userRole.role.slug))
          .filter(Boolean) as RoleSlug[],
      ),
    );
    // DB-driven permissions (role→permission mapping is configurable at runtime)
    const permissions = Array.from(
      new Set(
        user.app_user_roles.flatMap((ur) =>
          ur.role.role_permissions.map((rp) => rp.permission.slug),
        ),
      ),
    );
    const department = await prisma.department.findFirst({
      where: { company_id: user.company_id, manager_id: user.id },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_id: user.company_id,
        company_name: user.company?.name,
        role: roleSlug,
        roleSlug: roleSlug,
        permissions: permissions,
        department_id: department ? String(department.id) : undefined,
        department_name: department?.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = refreshSchema.parse(req.body);

    if (!(await isValidRefreshToken(parsed.refreshToken))) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const secret = (process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET!) as jwt.Secret;
    const payload = jwt.verify(parsed.refreshToken, secret) as any;
    if (!payload || !payload.id)
      throw new AppError('Invalid token payload', 401);

    const newToken = jwt.sign(
      { id: payload.id, company_id: payload.company_id },
      process.env.JWT_SECRET as jwt.Secret,
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' } as jwt.SignOptions,
    );

    await revokeRefreshToken(parsed.refreshToken);

    const newRefresh = jwt.sign(
      { id: payload.id, company_id: payload.company_id },
      secret,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d' } as jwt.SignOptions,
    );
    await storeRefreshToken(newRefresh, payload.id);

    res
      .status(200)
      .json({ status: 'success', token: newToken, refreshToken: newRefresh });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = logoutSchema.parse(req.body);
    await revokeRefreshToken(parsed.refreshToken);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

export const emailSignin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = emailSigninSchema.parse(req.body);
    const result = await AuthService.emailSignin(parsed.email);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const googleRedirect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const redirectUrl = req.query.redirectUrl as string | undefined;
    const googleUrl = AuthService.getGoogleRedirectUrl(redirectUrl);
    res.redirect(googleUrl);
  } catch (error) {
    next(error);
  }
};

export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string | undefined;
    if (!code) {
      throw new AppError('Missing Google authorization code', 400);
    }
    const result = await AuthService.loginWithGoogle(code);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let redirectUrl = frontendUrl;

    if (state) {
      try {
        const parsedState = JSON.parse(
          Buffer.from(state, 'base64url').toString('utf8'),
        );
        // Security Check: Ensure the redirect URL stays within your domain boundaries
        if (
          parsedState?.redirectUrl &&
          parsedState.redirectUrl.startsWith(frontendUrl)
        ) {
          redirectUrl = parsedState.redirectUrl;
        }
      } catch {
        // Safe fallback
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Signing in with Google</title>
</head>
<body>
  <p>Signing in with Google...</p>
  <script>
    try {
      localStorage.setItem('token', ${JSON.stringify(result.token)});
      localStorage.setItem('refreshToken', ${JSON.stringify(result.refreshToken)});
    } catch (error) {
      console.error('Failed to save auth tokens:', error);
    }
    window.location.href = ${JSON.stringify(redirectUrl)};
  </script>
</body>
</html>`;

    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

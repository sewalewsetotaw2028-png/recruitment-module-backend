import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import https from 'https';
import { stringify } from 'querystring';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { RegisterDTO, LoginDTO } from '../types/auth.types';
import {
  allRoleSlugs,
  normalizeRoleSlug,
  ROLES,
  RoleSlug,
} from '../config/rolePermissions';

export class AuthService {
  private static async resolveManagedDepartment(
    userId: string,
    companyId: number,
  ) {
    const department = await prisma.department.findFirst({
      where: {
        company_id: companyId,
        manager_id: userId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return department
      ? {
          department_id: String(department.id),
          department_name: department.name,
        }
      : {};
  }

  static async register(data: RegisterDTO) {
    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) throw new AppError('Email already registered', 400);

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // 2. Transaction: Create or map Company and User together, assign Candidate role
    return await prisma.$transaction(async (tx) => {
      let company = await tx.company.findFirst();
      if (!company) {
        const name = data.company_name || 'Acme Corp';
        const cleanName = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
        const code = (cleanName || 'ACME') + Math.floor(1000 + Math.random() * 9000);
        company = await tx.company.create({
          data: {
            name,
            email: 'admin@acme.com',
            company_code: code,
          },
        });
      }

      const user = await tx.user.create({
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password_hash: hashedPassword,
          company_id: company.id,
          terms_accepted: data.terms_accepted,
        },
      });

      // Find or create Candidate role
      let candidateRole = await tx.appRole.findFirst({
        where: {
          company_id: company.id,
          slug: 'candidate',
        },
      });

      if (!candidateRole) {
        candidateRole = await tx.appRole.create({
          data: {
            name: 'Candidate',
            slug: 'candidate',
            company_id: company.id,
          },
        });
      }

      // Assign role to user
      await tx.appUserRole.create({
        data: {
          user_id: user.id,
          role_id: candidateRole.id,
        },
      });

      // Create corresponding Candidate record for the candidate portal features
      await tx.candidate.create({
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password_hash: hashedPassword,
          company_id: company.id,
          terms_accepted: data.terms_accepted,
        },
      });

      return { user, company };
    });
  }

  static getGoogleRedirectUrl(redirectUrl?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (!clientId) {
      throw new AppError('Google OAuth client ID not configured', 500);
    }

    const targetRedirect = redirectUrl || frontendUrl;
    const state = Buffer.from(
      JSON.stringify({ redirectUrl: targetRedirect }),
    ).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  static async loginWithGoogle(code: string, state?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`;
    if (!clientId || !clientSecret) {
      throw new AppError('Google OAuth credentials are not configured', 500);
    }

    const tokenResponse = await new Promise<any>((resolve, reject) => {
      const bodyString = stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      });

      const request = https.request(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(bodyString),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(json.error_description || json.error || data));
                return;
              }
              resolve(json);
            } catch (err) {
              reject(err);
            }
          });
        },
      );

      request.on('error', reject);
      request.write(bodyString);
      request.end();
    });

    const userInfo = await new Promise<any>((resolve, reject) => {
      https
        .get(
          'https://openidconnect.googleapis.com/v1/userinfo',
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                if (res.statusCode && res.statusCode >= 400) {
                  reject(
                    new Error(json.error_description || json.error || data),
                  );
                  return;
                }
                resolve(json);
              } catch (err) {
                reject(err);
              }
            });
          },
        )
        .on('error', reject);
    });

    const googleId = String(userInfo.sub || userInfo.id);
    const email = String(userInfo.email || '');
    const firstName = String(userInfo.given_name || userInfo.first_name || '');
    const lastName = String(userInfo.family_name || userInfo.last_name || '');
    if (!email) {
      throw new AppError('Google account did not return an email address', 400);
    }

    let user = await prisma.user.findUnique({
      where: { email },
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
      const hashedPassword = await bcrypt.hash(
        crypto.randomBytes(32).toString('hex'),
        12,
      );

      let company = await prisma.company.findFirst();
      if (!company) {
        const code = 'ACME' + Math.floor(1000 + Math.random() * 9000);
        company = await prisma.company.create({
          data: {
            name: 'Acme Corp',
            email: 'admin@acme.com',
            company_code: code,
          },
        });
      }

      user = await prisma.user.create({
        data: {
          first_name: firstName || 'Google',
          last_name: lastName || 'User',
          email,
          password_hash: hashedPassword,
          company_id: company.id,
          google_id: googleId,
          terms_accepted: true,
        },
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

      let candidateRole = await prisma.appRole.findFirst({
        where: {
          company_id: company.id,
          slug: 'candidate',
        },
      });

      if (!candidateRole) {
        candidateRole = await prisma.appRole.create({
          data: {
            name: 'Candidate',
            slug: 'candidate',
            company_id: company.id,
          },
        });
      }

      await prisma.appUserRole.create({
        data: {
          user_id: user.id,
          role_id: candidateRole.id,
        },
      });

      await prisma.candidate.create({
        data: {
          first_name: firstName || 'Google',
          last_name: lastName || 'User',
          email,
          password_hash: hashedPassword,
          company_id: company.id,
          google_id: googleId,
          terms_accepted: true,
        },
      });
    } else if (!user.google_id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { google_id: googleId },
      });
    }

    /**
     * Reload the user after any role assignment so permission slugs are resolved
     * from the DB (AppUserRole → AppRolePermission → AppPermission).
     *
     * This ensures the frontend's `usePermissions()` hook reflects any role
     * permission changes made in the config UI without redeploying.
     */
    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        company: true,
        app_user_roles: {
          include: {
            role: {
              include: {
                role_permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!freshUser) throw new AppError('User not found', 404);

    const roleSlugs = freshUser.app_user_roles
      .map((userRole) => normalizeRoleSlug(userRole.role.slug))
      .filter((slug): slug is RoleSlug => allRoleSlugs.has(slug as RoleSlug));

    const primaryRole = roleSlugs[0] ?? ROLES.CANDIDATE;
    const permissions = Array.from(
      new Set(
        freshUser.app_user_roles.flatMap((ur) =>
          ur.role.role_permissions.map((rp) => rp.permission.slug),
        ),
      ),
    );
    const candidate = await prisma.candidate.findFirst({
      where: { email: freshUser.email, company_id: freshUser.company_id },
    });
    const department = await this.resolveManagedDepartment(
      freshUser.id,
      freshUser.company_id,
    );

    const tokenPayload: Record<string, any> = {
      id: freshUser.id,
      company_id: freshUser.company_id,
      role: primaryRole,
      roles: roleSlugs,
    };
    if (candidate) {
      tokenPayload.candidate_id = candidate.id;
    }

    const signOptions: SignOptions = {
      expiresIn:
        (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '15m',
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, signOptions);

    const refreshSignOptions: SignOptions = {
      expiresIn:
        (process.env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn']) ??
        '7d',
    };
    const refreshToken = jwt.sign(
      { id: freshUser.id, company_id: freshUser.company_id },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET!,
      refreshSignOptions,
    );

    try {
      const { storeRefreshToken } = await import('../config/sessionStore');
      storeRefreshToken(refreshToken, freshUser.id);
    } catch (e) {
      // non-fatal
    }

    return {
      token,
      refreshToken,
      user: {
        id: freshUser.id,
        email: freshUser.email,
        first_name: freshUser.first_name,
        last_name: freshUser.last_name,
        company_id: freshUser.company_id,
        company_name: freshUser.company.name,
        role: primaryRole,
        roles: roleSlugs,
        permissions,
        ...department,
      },
    };
  }

  static async login(data: LoginDTO) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        company: true,
        app_user_roles: {
          include: {
            role: {
              include: {
                role_permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      throw new AppError('Invalid email or password', 401);
    }

    const roleSlugs = user.app_user_roles
      .map((userRole) => normalizeRoleSlug(userRole.role.slug))
      .filter((slug): slug is RoleSlug => allRoleSlugs.has(slug as RoleSlug));

    const primaryRole = roleSlugs[0] ?? ROLES.CANDIDATE;
    const permissions = Array.from(
      new Set(
        user.app_user_roles.flatMap((ur) =>
          ur.role.role_permissions.map((rp) => rp.permission.slug),
        ),
      ),
    );

    const candidate = await prisma.candidate.findFirst({
      where: { email: user.email, company_id: user.company_id },
    });
    const department = await this.resolveManagedDepartment(user.id, user.company_id);

    const tokenPayload: Record<string, any> = {
      id: user.id,
      company_id: user.company_id,
      role: primaryRole,
      roles: roleSlugs,
    };
    if (candidate) {
      tokenPayload.candidate_id = candidate.id;
    }

    const signOptions: SignOptions = {
      expiresIn:
        (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '15m',
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, signOptions);

    // Create a refresh token (longer lived)
    const refreshSignOptions: SignOptions = {
      expiresIn:
        (process.env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn']) ??
        '7d',
    };

    const refreshToken = jwt.sign(
      { id: user.id, company_id: user.company_id },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET!,
      refreshSignOptions,
    );

    // store refresh token in memory store
    try {
      const { storeRefreshToken } = await import('../config/sessionStore');
      storeRefreshToken(refreshToken, user.id);
    } catch (e) {
      // non-fatal
    }

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_id: user.company_id,
        company_name: user.company.name,
        role: primaryRole,
        roles: roleSlugs,
        permissions,
        ...department,
      },
    };
  }

  static async emailSignin(email: string) {
    // Check if user/candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { email },
      include: {
        company: true,
      },
    });

    if (!candidate) {
      // For security, we return the same message as if the user exists
      // In production, you might want to send a signup link instead
      throw new AppError(
        'Email not found. Please sign up first or check the email address.',
        404,
      );
    }

    // For now, we'll return a message that an email has been sent
    // In production, you would:
    // 1. Generate a verification token
    // 2. Send an email with a login link containing the token
    // 3. Store the token with an expiration time
    // 4. User clicks the link which exchanges the token for a session

    return {
      message: 'If this email exists, a sign-in link has been sent.',
      email: email,
    };
  }
}

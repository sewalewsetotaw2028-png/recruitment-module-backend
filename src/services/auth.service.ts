import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import https from 'https';
import { stringify } from 'querystring';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { RegisterDTO, LoginDTO } from '../types/auth.types';
import { EmailService } from './email.service';
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

  /**
   * Generate a cryptographically secure email verification token with expiry.
   * Uses the configured expiry hours from env, defaulting to 24 hours.
   */
  private static generateEmailVerificationToken(): {
    token: string;
    expiresAt: Date;
  } {
    const token = crypto.randomBytes(32).toString('hex');
    const expiryHours = parseInt(
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS || '24',
      10,
    );
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    return { token, expiresAt };
  }

  /**
   * Send a verification email to a user or candidate.
   * Builds a verification URL pointing to the frontend, which the user clicks to verify.
   */
  private static async sendEmailVerification(
    entity: { email: string; first_name: string; email_verification_token: string | null },
    userType: 'user' | 'candidate',
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const token = entity.email_verification_token;
    if (!token) {
      return; // No token to send
    }

    // Token is embedded in the URL, userType tells the backend which model to query
    const verificationUrl = `${frontendUrl}/verify-email/${token}?type=${userType}`;
    const appName = process.env.APP_NAME || 'Recruitment Portal';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${entity.first_name}</strong>,</p>
            <p>Thank you for creating an account with ${appName}. Please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #667eea;">${verificationUrl}</p>
            <p>This link will expire in ${process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS || '24'} hours.</p>
            <p>If you did not create this account, please ignore this email.</p>
            <p>Best regards,<br>${appName} Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await EmailService.sendEmail({
      to: entity.email,
      subject: 'Verify your email address',
      html,
    });
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

      // Generate email verification token before creating records
      const { token: emailToken, expiresAt: tokenExpires } =
        this.generateEmailVerificationToken();

      const user = await tx.user.create({
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password_hash: hashedPassword,
          company_id: company.id,
          terms_accepted: data.terms_accepted,
          email_verification_token: emailToken,
          email_verification_expires: tokenExpires,
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
          email_verification_token: emailToken,
          email_verification_expires: tokenExpires,
        },
      });

      // Send verification email outside the transaction — email failures must not roll back the registration
      this.sendEmailVerification(
        {
          email: user.email,
          first_name: user.first_name,
          email_verification_token: emailToken,
        },
        'user',
      ).catch((err) => {
        // Log and swallow — registration succeeded regardless
        console.error('Failed to send verification email:', err);
      });

      return { user, company, is_email_verified: false };
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
      // New user: create account with Google-provided data, mark email as verified
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
          // Google-verified accounts are trusted — skip email verification
          is_email_verified: true,
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
          // Candidate record also starts verified for Google sign-ups
          is_email_verified: true,
        },
      });
    } else {
      // Existing user found — handle account linking
      if (!user.google_id) {
        // Local account without Google linked: link the Google account
        await prisma.user.update({
          where: { id: user.id },
          data: {
            google_id: googleId,
            // If the user wasn't verified before, mark as verified now
            // (Google has already verified this email)
            is_email_verified: true,
            email_verification_token: null,
            email_verification_expires: null,
          },
        });

        // Also sync verification status to the candidate record
        await prisma.candidate.updateMany({
          where: { email: user.email, company_id: user.company_id },
          data: {
            is_email_verified: true,
            email_verification_token: null,
            email_verification_expires: null,
          },
        });
      } else if (!user.is_email_verified) {
        // Google account exists but wasn't verified — sync the verified status
        await prisma.user.update({
          where: { id: user.id },
          data: {
            is_email_verified: true,
            email_verification_token: null,
            email_verification_expires: null,
          },
        });

        await prisma.candidate.updateMany({
          where: { email: user.email, company_id: user.company_id },
          data: {
            is_email_verified: true,
            email_verification_token: null,
            email_verification_expires: null,
          },
        });
      }
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
        is_email_verified: freshUser.is_email_verified,
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
        is_email_verified: user.is_email_verified,
        ...department,
      },
    };
  }

  /**
   * Verify a user's or candidate's email using the verification token.
   * Finds the entity by token, checks expiry, then marks email as verified.
   */
  static async verifyEmail(
    token: string,
    userType: 'user' | 'candidate',
  ): Promise<{ message: string }> {
    if (userType === 'user') {
      const user = await prisma.user.findFirst({
        where: {
          email_verification_token: token,
          is_email_verified: false,
        },
      });

      if (!user) {
        // Check if the token exists but the email is already verified
        const alreadyVerified = await prisma.user.findFirst({
          where: { email_verification_token: token, is_email_verified: true },
        });
        if (alreadyVerified) {
          return { message: 'Email is already verified. You can log in.' };
        }
        throw new AppError(
          'Invalid verification token. This link may have been used already, or you may have clicked an older email. Please request a new verification email.',
          400,
        );
      }

      if (
        user.email_verification_expires &&
        new Date() > new Date(user.email_verification_expires)
      ) {
        throw new AppError(
          'Verification token has expired. Please request a new one.',
          400,
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          is_email_verified: true,
          email_verification_token: null,
          email_verification_expires: null,
        },
      });

      // Also update the corresponding candidate record if it exists
      await prisma.candidate.updateMany({
        where: { email: user.email, company_id: user.company_id },
        data: {
          is_email_verified: true,
          email_verification_token: null,
          email_verification_expires: null,
        },
      });

      return { message: 'Email verified successfully.' };
    } else {
      const candidate = await prisma.candidate.findFirst({
        where: {
          email_verification_token: token,
          is_email_verified: false,
        },
      });

      if (!candidate) {
        // Check if the token exists but the candidate is already verified
        const alreadyVerified = await prisma.candidate.findFirst({
          where: { email_verification_token: token, is_email_verified: true },
        });
        if (alreadyVerified) {
          return { message: 'Email is already verified. You can log in.' };
        }
        throw new AppError(
          'Invalid verification token. This link may have been used already, or you may have clicked an older email. Please request a new verification email.',
          400,
        );
      }

      if (
        candidate.email_verification_expires &&
        new Date() > candidate.email_verification_expires
      ) {
        throw new AppError(
          'Verification token has expired. Please request a new one.',
          400,
        );
      }

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          is_email_verified: true,
          email_verification_token: null,
          email_verification_expires: null,
        },
      });

      return { message: 'Email verified successfully.' };
    }
  }

  /**
   * Resend the email verification token.
   * Generates a new token & expiry, updates the DB, and sends a fresh email.
   */
  static async resendEmailVerification(
    email: string,
    userType: 'user' | 'candidate',
  ): Promise<{ message: string }> {
    const { token: newToken, expiresAt: newExpiry } =
      this.generateEmailVerificationToken();

    if (userType === 'user') {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Don't reveal whether the email exists for security
        return {
          message:
            'If this email is registered, a verification email has been sent.',
        };
      }

      if (user.is_email_verified) {
        return { message: 'This email is already verified. You can log in.' };
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          email_verification_token: newToken,
          email_verification_expires: newExpiry,
        },
      });

      // Send the verification email asynchronously
      this.sendEmailVerification(
        {
          email: user.email,
          first_name: user.first_name,
          email_verification_token: newToken,
        },
        'user',
      ).catch((err) => {
        console.error('Failed to resend verification email:', err);
      });

      return {
        message:
          'If this email is registered, a verification email has been sent.',
      };
    } else {
      const candidate = await prisma.candidate.findUnique({
        where: { email },
      });
      if (!candidate) {
        return {
          message:
            'If this email is registered, a verification email has been sent.',
        };
      }

      if (candidate.is_email_verified) {
        return { message: 'This email is already verified. You can log in.' };
      }

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          email_verification_token: newToken,
          email_verification_expires: newExpiry,
        },
      });

      this.sendEmailVerification(
        {
          email: candidate.email,
          first_name: candidate.first_name,
          email_verification_token: newToken,
        },
        'candidate',
      ).catch((err) => {
        console.error('Failed to resend verification email:', err);
      });

      return {
        message:
          'If this email is registered, a verification email has been sent.',
      };
    }
  }

  /**
   * Generate a secure magic link token for passwordless login.
   * Short-lived (15 minutes by default) for security.
   */
  private static generateMagicLinkToken(): {
    token: string;
    expiresAt: Date;
  } {
    const token = crypto.randomBytes(32).toString('hex');
    // Magic links are short-lived: 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    return { token, expiresAt };
  }

  /**
   * Send a magic link email for passwordless login.
   * Checks both User and Candidate models for the given email,
   * generates a token, stores it, and sends the email.
   */
  static async requestMagicLink(
    email: string,
    userType: 'user' | 'candidate',
  ): Promise<{ message: string }> {
    const { token: magicToken, expiresAt: tokenExpires } =
      this.generateMagicLinkToken();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const magicLinkUrl = `${frontendUrl}/login/magic-link/callback?token=${magicToken}&type=${userType}`;
    const appName = process.env.APP_NAME || 'Recruitment Portal';

    if (userType === 'user') {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Security: don't reveal whether email exists
        return {
          message:
            'If this email is registered, a sign-in link has been sent.',
        };
      }

      // Store magic link token & expiry on the user record
      // Reuse email_verification fields for this purpose since they are general-purpose token fields
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email_verification_token: magicToken,
          email_verification_expires: tokenExpires,
        },
      });

      // Send the magic link email
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign in to ${appName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Sign in to ${appName}</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${user.first_name}</strong>,</p>
              <p>Click the button below to sign in to your account. This link expires in 15 minutes.</p>
              <div style="text-align: center;">
                <a href="${magicLinkUrl}" class="cta-button">Sign In</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #667eea;">${magicLinkUrl}</p>
              <p>If you did not request this link, please ignore this email.</p>
              <p>Best regards,<br>${appName} Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await EmailService.sendEmail({
        to: user.email,
        subject: `Sign in to ${appName}`,
        html,
      });

      return {
        message:
          'If this email is registered, a sign-in link has been sent.',
      };
    } else {
      const candidate = await prisma.candidate.findUnique({
        where: { email },
      });
      if (!candidate) {
        return {
          message:
            'If this email is registered, a sign-in link has been sent.',
        };
      }

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          email_verification_token: magicToken,
          email_verification_expires: tokenExpires,
        },
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign in to ${appName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Sign in to ${appName}</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${candidate.first_name}</strong>,</p>
              <p>Click the button below to sign in to your account. This link expires in 15 minutes.</p>
              <div style="text-align: center;">
                <a href="${magicLinkUrl}" class="cta-button">Sign In</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #667eea;">${magicLinkUrl}</p>
              <p>If you did not request this link, please ignore this email.</p>
              <p>Best regards,<br>${appName} Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await EmailService.sendEmail({
        to: candidate.email,
        subject: `Sign in to ${appName}`,
        html,
      });

      return {
        message:
          'If this email is registered, a sign-in link has been sent.',
      };
    }
  }

  /**
   * Verify a magic link token and issue JWT tokens for passwordless login.
   * Finds the entity by token, checks expiry, generates auth tokens, and clears the magic link.
   */
  static async verifyMagicLink(
    token: string,
    userType: 'user' | 'candidate',
  ): Promise<{
    token: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      company_id: string;
      company_name: string;
      role: string;
      roles: string[];
      permissions: string[];
      is_email_verified: boolean;
    };
  }> {
    if (userType === 'user') {
      const user = await prisma.user.findFirst({
        where: { email_verification_token: token },
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

      if (!user) {
        throw new AppError('Invalid or expired magic link.', 400);
      }

      if (
        user.email_verification_expires &&
        new Date() > user.email_verification_expires
      ) {
        throw new AppError(
          'This magic link has expired. Please request a new one.',
          400,
        );
      }

      // Clear the magic link token (one-time use)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email_verification_token: null,
          email_verification_expires: null,
        },
      });

      // Resolve roles and permissions from DB
      const roleSlugs = user.app_user_roles
        .map((ur) => normalizeRoleSlug(ur.role.slug))
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

      const tokenPayload: Record<string, any> = {
        id: user.id,
        company_id: user.company_id,
        role: primaryRole,
        roles: roleSlugs,
      };
      if (candidate) tokenPayload.candidate_id = candidate.id;

      const signOptions: SignOptions = {
        expiresIn:
          (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '15m',
      };
      const jwtToken = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET!,
        signOptions,
      );

      const refreshOpts: SignOptions = {
        expiresIn:
          (process.env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn']) ??
          '7d',
      };
      const refreshToken = jwt.sign(
        { id: user.id, company_id: user.company_id },
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET!,
        refreshOpts,
      );

      try {
        const { storeRefreshToken } = await import('../config/sessionStore');
        storeRefreshToken(refreshToken, user.id);
      } catch (e) {
        // non-fatal
      }

      return {
        token: jwtToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          company_id: String(user.company_id),
          company_name: user.company.name,
          role: primaryRole,
          roles: roleSlugs,
          permissions,
          is_email_verified: user.is_email_verified,
        },
      };
    } else {
      const candidate = await prisma.candidate.findFirst({
        where: { email_verification_token: token },
        include: { company: true },
      });

      if (!candidate) {
        throw new AppError('Invalid or expired magic link.', 400);
      }

      if (
        candidate.email_verification_expires &&
        new Date() > candidate.email_verification_expires
      ) {
        throw new AppError(
          'This magic link has expired. Please request a new one.',
          400,
        );
      }

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          email_verification_token: null,
          email_verification_expires: null,
        },
      });

      const tokenPayload: Record<string, any> = {
        id: candidate.id,
        company_id: candidate.company_id,
        role: ROLES.CANDIDATE,
        roles: [ROLES.CANDIDATE],
        candidate_id: candidate.id,
      };

      const signOptions: SignOptions = {
        expiresIn:
          (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '15m',
      };
      const jwtToken = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET!,
        signOptions,
      );

      const refreshOpts: SignOptions = {
        expiresIn:
          (process.env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn']) ??
          '7d',
      };
      const refreshToken = jwt.sign(
        { id: candidate.id, company_id: candidate.company_id },
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET!,
        refreshOpts,
      );

      return {
        token: jwtToken,
        refreshToken,
        user: {
          id: candidate.id,
          email: candidate.email,
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          company_id: String(candidate.company_id),
          company_name: candidate.company.name,
          role: ROLES.CANDIDATE,
          roles: [ROLES.CANDIDATE],
          permissions: [],
          is_email_verified: candidate.is_email_verified,
        },
      };
    }
  }
}

import { z } from 'zod';
import { emailSchema, stringWithLength } from './common.validation';

export const registerSchema = z
  .object({
    company_name: z.string().min(1),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: emailSchema,
    password: stringWithLength(8),
    confirm_password: stringWithLength(8),
    terms_accepted: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: stringWithLength(8),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    current_password: stringWithLength(8),
    new_password: stringWithLength(8),
    confirm_password: z.string().min(8),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'New password and confirmation must match',
    path: ['confirm_password'],
  })
  .strict();

export const emailSigninSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

const userTypeEnum = z.enum(['user', 'candidate']);

export const magicLinkSchema = z
  .object({
    token: z.string().min(1, 'Magic link token is required'),
    type: userTypeEnum,
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, 'Verification token is required'),
    userType: userTypeEnum,
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: emailSchema,
    userType: userTypeEnum,
  })
  .strict();

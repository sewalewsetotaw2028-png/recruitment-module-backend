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

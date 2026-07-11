import { z, ZodError } from 'zod';

export const emailSchema = z
  .string()
  .email({ message: 'Invalid email address' });
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

export const stringWithLength = (min: number, max = 1024) =>
  z
    .string()
    .min(min, { message: `Must be at least ${min} characters` })
    .max(max);

export const enumValidation = <T extends string>(values: ReadonlyArray<T>) =>
  z.enum([...(values as [T, ...T[]])] as [T, ...T[]]);

export const dateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid date/time string',
  });

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
});

export function transformValidationError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
  }));
}

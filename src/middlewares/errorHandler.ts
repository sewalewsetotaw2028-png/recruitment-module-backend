import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { transformValidationError } from '../utils/common.validation';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    logger.warn('Validation error', JSON.stringify(err.issues));
    return res.status(400).json({
      status: 'error',
      message: 'Invalid request',
      errors: transformValidationError(err),
    });
  }

  // App-level errors
  if (err instanceof AppError) {
    logger.warn('AppError', err.message);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Prisma client errors
  if ((err as Prisma.PrismaClientKnownRequestError)?.code) {
    const p = err as Prisma.PrismaClientKnownRequestError;
    logger.error('Prisma error', p.code, p.meta);
    const status = p.code === 'P2002' ? 409 : 400;
    let message = p.message;
    // Provide user-friendly messages for common Prisma errors
    if (p.code === 'P2002') {
      message = 'A record with this information already exists.';
    } else if (p.code === 'P2025') {
      message = 'The requested record was not found.';
    } else if (p.code === 'P2003') {
      message = 'Invalid reference to related record.';
    }
    return res.status(status).json({
      status: 'error',
      message,
    });
  }

  // Fallback
  logger.error('Unhandled Error:', err && err.stack ? err.stack : err);
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred. Please try again later.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

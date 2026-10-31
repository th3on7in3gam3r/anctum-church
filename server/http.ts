import type { Response } from 'express';
import { DatabaseUnavailable, SanctumError } from '../shared/errors.ts';
import { isPrismaPoolTimeout } from './prisma.ts';

export function sendError(res: Response, error: unknown): void {
  if (isPrismaPoolTimeout(error)) {
    console.error('database pool timeout:', error instanceof Error ? error.message : error);
    error = DatabaseUnavailable('The database is busy. Wait a moment and try again.');
  }

  if (error instanceof SanctumError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message,
      details: error.details ?? null,
    });
    return;
  }

  console.error('unexpected server error:', error);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong. Please try again.',
    details: null,
  });
}

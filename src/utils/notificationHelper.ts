import prisma from '../config/database';
import { logger } from './logger';

export const sendNotification = async (
  company_id: string,
  recipient_id: string,
  recipient_type: 'candidate' | 'user',
  type: string,
  message: string,
) => {
  try {
    // 1. Log to Application Log
    logger.info(
      'notificationHelper',
      `🔔 NOTIFICATION to ${recipient_id}: ${message} [type=${type}, recipientType=${recipient_type}]`,
    );
  } catch (error) {
    logger.error('notificationHelper', 'Failed to send notification', error);
  }
};

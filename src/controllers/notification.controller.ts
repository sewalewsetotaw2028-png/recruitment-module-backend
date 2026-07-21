import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { NotificationService } from '../services/notification.service';
import prisma from '../config/database';

export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const filters = {
      is_read: req.query.is_read !== undefined
        ? req.query.is_read === 'true'
        : undefined,
      type: req.query.type as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await NotificationService.getNotifications(userId, filters);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const notificationId = String(req.params.id);

    const result = await NotificationService.markAsRead(userId, notificationId);
    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found or unauthorized',
      });
    }

    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const result = await NotificationService.markAllAsRead(userId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const result = await NotificationService.getUnreadCount(userId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get candidate unread notification count.
 * Uses the candidate_id from the authenticated user's JWT token.
 */
export const getCandidateUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidateId = req.user?.candidate_id || req.user!.id;
    const count = await prisma.notification.count({
      where: { candidate_id: candidateId, is_read: false },
    });
    res.status(200).json({ status: 'success', data: { count } });
  } catch (error) {
    next(error);
  }
};

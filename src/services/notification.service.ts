import prisma from '../config/database';
import { NotificationType, Prisma } from '@prisma/client';

export interface NotificationFilters {
  is_read?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: Date;
    read_at: Date | null;
    related_entity_type: string | null;
    related_entity_id: string | null;
  }>;
  unread_count: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export class NotificationService {
  /**
   * Get paginated notifications for a staff user, with optional filters.
   * Always returns the total unread count at the top level.
   */
  static async getNotifications(
    userId: string,
    filters: NotificationFilters = {},
  ): Promise<PaginatedNotifications> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      user_id: userId,
    };

    if (filters.is_read !== undefined) {
      where.is_read = filters.is_read;
    }

    if (filters.type) {
      where.type = filters.type as NotificationType;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          is_read: true,
          created_at: true,
          read_at: true,
          related_entity_type: true,
          related_entity_id: true,
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    return {
      notifications,
      unread_count: unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a single notification as read.
   * Verifies the notification belongs to the given user before updating.
   */
  static async markAsRead(
    userId: string,
    notificationId: string,
  ) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.user_id !== userId) {
      return null;
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true, read_at: new Date() },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        is_read: true,
        created_at: true,
        read_at: true,
        related_entity_type: true,
        related_entity_id: true,
      },
    });
  }

  /**
   * Mark all notifications as read for a user.
   * Returns the count of notifications that were updated.
   */
  static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });

    return { count: result.count };
  }

  /**
   * Get the count of unread notifications for a user.
   */
  static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });

    return { count };
  }
}

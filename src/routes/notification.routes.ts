import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from '../controllers/notification.controller';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Staff notification endpoints
router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);
router.patch('/read-all', markAllNotificationsRead);
router.get('/unread-count', getUnreadCount);

export default router;

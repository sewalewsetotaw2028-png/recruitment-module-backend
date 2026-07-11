import { Router, RequestHandler } from 'express';
import * as controller from '../controllers/jobPosting.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';

const router = Router();

// All routes require authentication
router.use(authenticate as RequestHandler);

// GET  /api/v1/job-postings?vacancyId=xxx  — get channel postings for a vacancy
router.get(
  '/',
  authorize([PERMISSIONS.VACANCY_READ]),
  controller.findAll as RequestHandler,
);

// GET  /api/v1/job-postings/channels  — list all active channels for this company
router.get(
  '/channels',
  authorize([PERMISSIONS.VACANCY_READ]),
  controller.getChannels as RequestHandler,
);

// POST /api/v1/job-postings  — create postings for selected channels
router.post(
  '/',
  authorize([PERMISSIONS.VACANCY_PUBLISH, PERMISSIONS.VACANCY_UPDATE]),
  controller.create as RequestHandler,
);

// PATCH /api/v1/job-postings/:vacancyId/withdraw  — withdraw all channel postings
router.patch(
  '/:vacancyId/withdraw',
  authorize([PERMISSIONS.VACANCY_UPDATE]),
  controller.withdraw as RequestHandler,
);

export default router;

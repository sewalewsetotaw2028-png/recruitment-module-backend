import { Router, RequestHandler } from 'express';
import {
  getHiringMinutes,
  getHiringMinuteById,
  createHiringMinute,
  updateHiringMinute,
  approveHiringMinute,
  rejectHiringMinute,
  addSignatory,
  addTalentRoster,
  sendRegrets,
} from '../controllers/hiringMinute.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';

const router = Router();
router.use(authenticate as RequestHandler);

router.get(
  '/',
  authorize(PERMISSIONS.HIRING_MINUTE_READ),
  getHiringMinutes as RequestHandler,
);
router.get(
  '/:hiringMinuteId',
  authorize(PERMISSIONS.HIRING_MINUTE_READ),
  getHiringMinuteById as RequestHandler,
);
router.post(
  '/',
  authorize(PERMISSIONS.HIRING_MINUTE_CREATE),
  createHiringMinute as RequestHandler,
);
router.patch(
  '/:hiringMinuteId',
  authorize(PERMISSIONS.HIRING_MINUTE_UPDATE),
  updateHiringMinute as RequestHandler,
);

// Prompt 6: Hiring Minute Approval & Post-Selection Flows
router.post(
  '/:hiringMinuteId/approve',
  authorize(PERMISSIONS.HIRING_MINUTE_APPROVE),
  approveHiringMinute as RequestHandler,
);

router.post(
  '/:hiringMinuteId/reject',
  authorize(PERMISSIONS.HIRING_MINUTE_APPROVE),
  rejectHiringMinute as RequestHandler,
);

router.post(
  '/:hiringMinuteId/signatures',
  authorize(PERMISSIONS.HIRING_MINUTE_UPDATE),
  addSignatory as RequestHandler,
);

router.post(
  '/:hiringMinuteId/add-to-roster',
  authorize(PERMISSIONS.TALENT_ROSTER_MANAGE),
  addTalentRoster as RequestHandler,
);

router.post(
  '/:hiringMinuteId/send-regrets',
  authorize(PERMISSIONS.HIRING_MINUTE_UPDATE),
  sendRegrets as RequestHandler,
);

export default router;

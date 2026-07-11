import { Router, RequestHandler } from 'express';
import {
  getVacancies,
  getVacancyById,
  createVacancy,
  updateVacancy,
  postVacancy,
  unpostVacancy,
  holdVacancy,
  resumeVacancy,
  setVacancyStatus,
  fulfillVacancy,
  approveVacancyPosting,
  rejectVacancyPosting,
  getVacancyEvaluationSummary,
  selectCandidate,
  revokeSelection,
  getVacancyApplications,
  getVacancyHiringMinute,
} from '../controllers/vacancy.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';

const router = Router();

router.use(authenticate as RequestHandler);

// Get all vacancies
router.get(
  '/',
  authorize(PERMISSIONS.VACANCY_READ),
  getVacancies as RequestHandler,
);

// Get vacancy by ID
router.get(
  '/:vacancy_id',
  authorize(PERMISSIONS.VACANCY_READ),
  getVacancyById as RequestHandler,
);

// Create a new vacancy (requires approved recruitment request)
router.post(
  '/',
  authorize(PERMISSIONS.VACANCY_CREATE),
  createVacancy as RequestHandler,
);

// Update vacancy details
router.put(
  '/:vacancy_id',
  authorize(PERMISSIONS.VACANCY_UPDATE),
  updateVacancy as RequestHandler,
);

// Post/publish a vacancy (make it open for applications)
router.post(
  '/:vacancy_id/post',
  authorize(PERMISSIONS.VACANCY_UPDATE),
  postVacancy as RequestHandler,
);

// Unpost/withdraw a vacancy
router.post(
  '/:vacancy_id/unpost',
  authorize(PERMISSIONS.VACANCY_UPDATE),
  unpostVacancy as RequestHandler,
);

router.post(
  '/:vacancy_id/hold',
  authorize(PERMISSIONS.VACANCY_UPDATE),
  holdVacancy as RequestHandler,
);

router.post(
  '/:vacancy_id/resume',
  authorize(PERMISSIONS.VACANCY_UPDATE),
  resumeVacancy as RequestHandler,
);

router.post(
  '/:vacancy_id/status',
  authorize([PERMISSIONS.VACANCY_CREATE, PERMISSIONS.VACANCY_UPDATE]),
  setVacancyStatus as RequestHandler,
);

// Fulfill vacancy
router.post(
  '/:vacancy_id/fulfill',
  authorize(PERMISSIONS.VACANCY_CLOSE),
  fulfillVacancy as RequestHandler,
);

// Approve vacancy posting
router.post(
  '/:vacancy_id/approve-posting',
  authorize(PERMISSIONS.VACANCY_UPDATE),
  approveVacancyPosting as RequestHandler,
);

// Reject vacancy posting
router.post(
  '/:vacancy_id/reject-posting',
  authorize(PERMISSIONS.VACANCY_UPDATE),
  rejectVacancyPosting as RequestHandler,
);

// Prompt 4: Evaluation results & aggregation
router.get(
  '/:vacancy_id/evaluation-summary',
  authorize(PERMISSIONS.VIEW_EVALUATIONS),
  getVacancyEvaluationSummary as RequestHandler,
);

// Prompt 5: Final Selection Decision
router.post(
  '/:vacancy_id/select-candidate',
  authorize(PERMISSIONS.HIRING_MINUTE_CREATE),
  selectCandidate as RequestHandler,
);

router.delete(
  '/:vacancy_id/selection',
  authorize(PERMISSIONS.HIRING_MINUTE_UPDATE),
  revokeSelection as RequestHandler,
);

// Get applications for a specific vacancy
router.get(
  '/:vacancy_id/applications',
  authorize(PERMISSIONS.VACANCY_READ),
  getVacancyApplications as RequestHandler,
);

// Get hiring minute for a specific vacancy
router.get(
  '/:vacancy_id/hiring-minute',
  authorize(PERMISSIONS.HIRING_MINUTE_READ),
  getVacancyHiringMinute as RequestHandler,
);

export default router;

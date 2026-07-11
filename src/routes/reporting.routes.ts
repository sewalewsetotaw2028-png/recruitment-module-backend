import { Router } from 'express';
import {
  getDashboard,
  generateHiringMinute,
  getMyVacancies,
  getMyInterviews,
  getMyEvaluations,
} from '../controllers/reporting.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';

const router = Router();

router.use(authenticate); // Internal dashboard access only

// Org-level reporting endpoints (requires REPORTS_READ)
router.get('/dashboard', authorize(PERMISSIONS.REPORTS_READ), getDashboard);
router.post(
  '/hiring-minute/:vacancyId',
  authorize(PERMISSIONS.HIRING_MINUTE_CREATE),
  generateHiringMinute,
);

// Assignment-based personal endpoints (requires specific permissions)
router.get(
  '/my-vacancies',
  authorize(PERMISSIONS.MY_VACANCY_READ),
  getMyVacancies,
);
router.get(
  '/my-interviews',
  authorize(PERMISSIONS.MY_INTERVIEW_READ),
  getMyInterviews,
);
router.get(
  '/my-evaluations',
  authorize(PERMISSIONS.MY_EVALUATION_READ),
  getMyEvaluations,
);

export default router;

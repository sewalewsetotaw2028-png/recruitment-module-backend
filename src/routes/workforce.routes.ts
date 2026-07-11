import { Router } from 'express';
import {
  createDepartment,
  getDepartments,
  createWorkforcePlan,
  updateWorkforcePlan,
  deleteWorkforcePlan,
  getWorkforcePlans,
  getWorkforcePlanById,
  submitWorkforcePlan,
  forwardWorkforcePlanToCeo,
  approveWorkforcePlan,
  rejectWorkforcePlan,
  returnWorkforcePlanForRevision,
  closeWorkforcePlan,
} from '../controllers/workforce.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';

const router = Router();

router.use(authenticate); // Protection layer

// Department routes
router.get(
  '/departments',
  authorize([
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.WORKFORCE_PLAN_READ,
    PERMISSIONS.WORKFORCE_PLAN_CREATE,
  ]),
  getDepartments,
);
router.post(
  '/departments',
  authorize(PERMISSIONS.DEPARTMENT_CREATE),
  createDepartment,
);

// Workforce plans
router.post(
  '/plans',
  authorize(PERMISSIONS.WORKFORCE_PLAN_CREATE),
  createWorkforcePlan,
);
router.put(
  '/plans/:planId',
  authorize(PERMISSIONS.WORKFORCE_PLAN_UPDATE),
  updateWorkforcePlan,
);
router.patch(
  '/plans/:planId',
  authorize(PERMISSIONS.WORKFORCE_PLAN_UPDATE),
  updateWorkforcePlan,
);
router.delete(
  '/plans/:planId',
  authorize(PERMISSIONS.WORKFORCE_PLAN_UPDATE),
  deleteWorkforcePlan,
);
router.get(
  '/plans',
  authorize([
    PERMISSIONS.WORKFORCE_PLAN_READ,
    PERMISSIONS.WORKFORCE_PLAN_CREATE,
  ]),
  getWorkforcePlans,
);
router.get(
  '/plans/:planId',
  authorize([
    PERMISSIONS.WORKFORCE_PLAN_READ,
    PERMISSIONS.WORKFORCE_PLAN_CREATE,
  ]),
  getWorkforcePlanById,
);
router.post(
  '/plans/:planId/submit',
  authorize(PERMISSIONS.WORKFORCE_PLAN_SUBMIT),
  submitWorkforcePlan,
);
router.post(
  '/plans/:planId/forward',
  authorize(PERMISSIONS.WORKFORCE_PLAN_FORWARD),
  forwardWorkforcePlanToCeo,
);
router.post(
  '/plans/:planId/approve',
  authorize(PERMISSIONS.WORKFORCE_PLAN_APPROVE),
  approveWorkforcePlan,
);
router.post(
  '/plans/:planId/reject',
  authorize(PERMISSIONS.WORKFORCE_PLAN_REJECT),
  rejectWorkforcePlan,
);
router.post(
  '/plans/:planId/return',
  authorize(PERMISSIONS.WORKFORCE_PLAN_RETURN),
  returnWorkforcePlanForRevision,
);
router.post(
  '/plans/:planId/close',
  authorize(PERMISSIONS.WORKFORCE_PLAN_APPROVE),
  closeWorkforcePlan,
);

export default router;

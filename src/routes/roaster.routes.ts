import { Router } from 'express';
import {
  addToRoaster,
  getRoasterList,
  linkCandidateToVacancy,
  getAllRosterActivity,
  getRosterHistory,
  removeFromRoaster,
} from '../controllers/roaster.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';

const router = Router();

router.use(authenticate);

// Get talent roaster list with filters
router.get('/', authorize(PERMISSIONS.VIEW_ROASTER), getRoasterList);

// Add candidate to talent roaster
router.post('/', authorize(PERMISSIONS.ADD_TO_ROASTER), addToRoaster);

// Company-wide roster activity log (must be before /:roster_id routes)
router.get('/activity', authorize(PERMISSIONS.VIEW_ROASTER), getAllRosterActivity);

// Link roster candidate to vacancy
router.post('/:roster_id/link/:vacancy_id', authorize(PERMISSIONS.ADD_TO_ROASTER), linkCandidateToVacancy);

// Get per-candidate roster history
router.get('/:roster_id/history', authorize(PERMISSIONS.VIEW_ROASTER), getRosterHistory);

// Remove from roster
router.delete('/:roster_id', authorize(PERMISSIONS.ADD_TO_ROASTER), removeFromRoaster);

export default router;

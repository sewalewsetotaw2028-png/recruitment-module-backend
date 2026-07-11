import { Router } from 'express';
import {
  addToRoaster,
  getRoasterList,
} from '../controllers/roaster.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';

const router = Router();

router.use(authenticate);

// Get talent roaster list
router.get('/', authorize(PERMISSIONS.VIEW_ROASTER), getRoasterList);

// Add candidate to talent roaster
router.post('/', authorize(PERMISSIONS.ADD_TO_ROASTER), addToRoaster);

export default router;

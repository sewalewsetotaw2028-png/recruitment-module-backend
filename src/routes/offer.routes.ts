import { Router } from 'express';
import {
  issueOffer,
  acceptOffer,
  rejectOffer,
  getCandidateOffers,
} from '../controllers/offer.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';

const router = Router();

router.use(authenticate);

// Issue an offer
router.post('/issue', authorize(PERMISSIONS.ISSUE_OFFER), issueOffer);

// Candidate get their offers
router.get('/', getCandidateOffers);

// Candidate accept offer
router.post('/:offer_id/accept', acceptOffer);

// Candidate reject offer
router.post('/:offer_id/reject', rejectOffer);

export default router;

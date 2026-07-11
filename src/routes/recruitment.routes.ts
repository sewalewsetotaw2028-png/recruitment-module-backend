import { Router, RequestHandler } from 'express';
import {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  hrReviewRequest,
  rejectRequest,
  approveRecruitmentRequest,
  submitRecruitmentRequest,
  uploadSupportingDocument,
  getSupportingDocument,
} from '../controllers/recruitment.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';
import { recruitmentDocumentUpload } from '../middlewares/recruitmentDocumentUpload';

const router = Router();

router.use(authenticate as RequestHandler);

// Recruitment Request routes
router.get('/requests', authorize(PERMISSIONS.RECRUITMENT_REQUEST_READ), getRequests as RequestHandler);
router.get(
  '/requests/:requestId',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_READ),
  getRequestById as RequestHandler,
);

// Hiring Managers create requests; HR approves them
router.post('/requests', authorize(PERMISSIONS.RECRUITMENT_REQUEST_CREATE), createRequest as RequestHandler);
router.patch(
  '/requests/:requestId',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_UPDATE),
  updateRequest as RequestHandler,
);
router.put(
  '/requests/:requestId',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_UPDATE),
  updateRequest as RequestHandler,
);
router.delete(
  '/requests/:requestId',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_UPDATE),
  deleteRequest as RequestHandler,
);
router.post(
  '/requests/:requestId/review',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_FORWARD),
  hrReviewRequest as RequestHandler,
);
router.post(
  '/requests/:requestId/approve',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_APPROVE),
  approveRecruitmentRequest as RequestHandler,
);
router.post(
  '/requests/:requestId/reject',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_REJECT),
  rejectRequest as RequestHandler,
);

// Vacancy routes

router.post(
  '/requests/:requestId/submit',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_UPDATE),
  submitRecruitmentRequest as RequestHandler,
);

// Upload supporting document for a recruitment request
router.post(
  '/requests/:requestId/document',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_UPDATE),
  recruitmentDocumentUpload.single('document') as RequestHandler,
  uploadSupportingDocument as RequestHandler,
);
router.get(
  '/requests/:requestId/document',
  authorize(PERMISSIONS.RECRUITMENT_REQUEST_READ),
  getSupportingDocument as RequestHandler,
);

export default router;

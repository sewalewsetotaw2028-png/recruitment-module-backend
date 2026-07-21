import { Router } from 'express';
import {
  registerCandidate,
  loginCandidate,
  getVacancies,
  getVacanciesFromToken,
  getVacancyDetail,
  apply,
  uploadDocument,
  getDocuments,
  deleteDocument,
  viewDocument,
  getProfile,
  getCandidateById,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
  getProfileCompleteness,
  getApplications,
  getCompanyApplications,
  getScreeningApplications,
  getShortlistedApplications,
  getApplicationById,
  getOffers,
  acceptOffer,
  rejectOffer,
  getCandidateInterviews,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  addExperience,
  getExperiences,
  updateExperience,
  deleteExperience,
  addEducation,
  getEducations,
  updateEducation,
  deleteEducation,
  addCertification,
  getCertifications,
  updateCertification,
  deleteCertification,
  addPhone,
  getPhones,
  updatePhone,
  deletePhone,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  getTalentRosterStatus,
  getRecruitmentSources,
} from '../controllers/candidate.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { requireEmailVerification } from '../middlewares/emailVerificationMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';
import { upload } from '../middlewares/upload';
import {
  getCandidateUnreadCount,
} from '../controllers/notification.controller';

const router = Router();

// Public Routes
router.post('/register', registerCandidate);
router.post('/login', loginCandidate);
router.get('/vacancies/:company_id', getVacancies);
// Auth-based vacancies (company_id from JWT token — no URL param needed)
router.get('/vacancies', authenticate, getVacanciesFromToken);

// Protected Candidate Routes
router.get(
  '/company/applications',
  authenticate,
  authorize(PERMISSIONS.APPLICATION_READ),
  getCompanyApplications,
);
router.get(
  '/screening/applications',
  authenticate,
  authorize(PERMISSIONS.CANDIDATE_APPLICATION_READ),
  getScreeningApplications,
);
router.get(
  '/shortlisted',
  authenticate,
  authorize(PERMISSIONS.CANDIDATE_APPLICATION_READ),
  getShortlistedApplications,
);
router.post('/apply', authenticate, requireEmailVerification(), apply);
router.get('/vacancies-detail/:id', authenticate, getVacancyDetail);
router.post('/apply', authenticate, requireEmailVerification(), upload.single('cover_letter_file'), apply);
router.get('/applications', authenticate, getApplications);
router.get('/applications/:id', authenticate, getApplicationById);
router.get('/offers', authenticate, getOffers);
router.post('/offers/:offerId/accept', authenticate, requireEmailVerification(), acceptOffer);
router.post('/offers/:offerId/reject', authenticate, requireEmailVerification(), rejectOffer);
router.get('/interviews', authenticate, getCandidateInterviews);

// Candidate notification routes
router.get('/me/notifications', authenticate, getNotifications);
router.get('/me/notifications/unread-count', authenticate, getCandidateUnreadCount);
router.patch('/me/notifications/:id/read', authenticate, markNotificationRead);
router.patch(
  '/me/notifications/read-all',
  authenticate,
  markAllNotificationsRead,
);

router.get('/me', authenticate, getProfile);
router.get('/:id', authenticate, getCandidateById);
router.patch('/profile', authenticate, requireEmailVerification(), updateProfile);

router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticate, deleteAvatar);
router.post('/change-password', authenticate, requireEmailVerification(), changePassword);
router.get('/me/completeness', authenticate, getProfileCompleteness);

router.post(
  '/documents',
  authenticate,
  requireEmailVerification(),
  upload.single('document'),
  uploadDocument,
);
router.get('/documents', authenticate, getDocuments);
router.get('/documents/view', authenticate, viewDocument);
router.delete('/documents', authenticate, deleteDocument);

// NOTE: /:id wildcard must come AFTER all specific sub-routes
router.get('/:id', authenticate, getCandidateById);

router.post(
  '/experience',
  authenticate,
  requireEmailVerification(),
  upload.single('document'),
  addExperience,
);
router.get('/experience', authenticate, getExperiences);
router.patch(
  '/experience/:experienceId',
  authenticate,
  requireEmailVerification(),
  upload.single('document'),
  updateExperience,
);
router.delete('/experience/:experienceId', authenticate, requireEmailVerification(), deleteExperience);

router.post(
  '/education',
  authenticate,
  requireEmailVerification(),
  upload.single('certificate'),
  addEducation,
);
router.get('/education', authenticate, getEducations);
router.patch(
  '/education/:educationId',
  authenticate,
  requireEmailVerification(),
  upload.single('certificate'),
  updateEducation,
);
router.delete('/education/:educationId', authenticate, requireEmailVerification(), deleteEducation);

router.post('/certification', authenticate, requireEmailVerification(), addCertification);
router.get('/certification', authenticate, getCertifications);
router.patch(
  '/certification/:certificationId',
  authenticate,
  requireEmailVerification(),
  updateCertification,
);
router.delete(
  '/certification/:certificationId',
  authenticate,
  requireEmailVerification(),
  deleteCertification,
);

router.post('/phone', authenticate, requireEmailVerification(), addPhone);
router.get('/phone', authenticate, getPhones);
router.patch('/phone/:phoneId', authenticate, requireEmailVerification(), updatePhone);
router.delete('/phone/:phoneId', authenticate, requireEmailVerification(), deletePhone);

router.post('/address', authenticate, requireEmailVerification(), addAddress);
router.get('/address', authenticate, getAddresses);
router.patch('/address/:addressId', authenticate, requireEmailVerification(), updateAddress);
router.delete('/address/:addressId', authenticate, requireEmailVerification(), deleteAddress);

router.get('/talent-roster', authenticate, getTalentRosterStatus);
router.get('/recruitment-sources', authenticate, getRecruitmentSources);

export default router;

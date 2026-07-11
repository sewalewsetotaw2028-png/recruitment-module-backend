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
  getProfile,
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
import { PERMISSIONS } from '../config/rolePermissions';
import { upload } from '../middlewares/upload';

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
router.post('/apply', authenticate, apply);
router.get('/vacancies-detail/:id', authenticate, getVacancyDetail);
router.post('/apply', authenticate, upload.single('cover_letter_file'), apply);
router.get('/applications', authenticate, getApplications);
router.get('/applications/:id', authenticate, getApplicationById);
router.get('/offers', authenticate, getOffers);
router.post('/offers/:offerId/accept', authenticate, acceptOffer);
router.post('/offers/:offerId/reject', authenticate, rejectOffer);
router.get('/interviews', authenticate, getCandidateInterviews);

router.patch('/me/notifications/:id/read', authenticate, markNotificationRead);
router.patch(
  '/me/notifications/read-all',
  authenticate,
  markAllNotificationsRead,
);

router.get('/me', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticate, deleteAvatar);
router.post('/change-password', authenticate, changePassword);
router.get('/me/completeness', authenticate, getProfileCompleteness);

router.post(
  '/documents',
  authenticate,
  upload.single('document'),
  uploadDocument,
);
router.get('/documents', authenticate, getDocuments);
router.delete('/documents', authenticate, deleteDocument);

router.post(
  '/experience',
  authenticate,
  upload.single('document'),
  addExperience,
);
router.get('/experience', authenticate, getExperiences);
router.patch(
  '/experience/:experienceId',
  authenticate,
  upload.single('document'),
  updateExperience,
);
router.delete('/experience/:experienceId', authenticate, deleteExperience);

router.post(
  '/education',
  authenticate,
  upload.single('certificate'),
  addEducation,
);
router.get('/education', authenticate, getEducations);
router.patch(
  '/education/:educationId',
  authenticate,
  upload.single('certificate'),
  updateEducation,
);
router.delete('/education/:educationId', authenticate, deleteEducation);

router.post('/certification', authenticate, addCertification);
router.get('/certification', authenticate, getCertifications);
router.patch(
  '/certification/:certificationId',
  authenticate,
  updateCertification,
);
router.delete(
  '/certification/:certificationId',
  authenticate,
  deleteCertification,
);

router.post('/phone', authenticate, addPhone);
router.get('/phone', authenticate, getPhones);
router.patch('/phone/:phoneId', authenticate, updatePhone);
router.delete('/phone/:phoneId', authenticate, deletePhone);

router.post('/address', authenticate, addAddress);
router.get('/address', authenticate, getAddresses);
router.patch('/address/:addressId', authenticate, updateAddress);
router.delete('/address/:addressId', authenticate, deleteAddress);

router.get('/talent-roster', authenticate, getTalentRosterStatus);
router.get('/recruitment-sources', authenticate, getRecruitmentSources);

export default router;

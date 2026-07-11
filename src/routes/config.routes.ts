import { Router } from 'express';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  setRolePermissions,
  getRoleUsers,
  getUserRoles,
  setUserRoles,
  assignUserRole,
  removeUserRole,
  getCompanyUsers,
  createInternalUser,
  getScreeningCriteria,
  getScreeningCriteriaByVacancy,
  createScreeningCriteria,
  setScreeningCriteriaForVacancy,
  updateScreeningCriteria,
  deleteScreeningCriteria,
  getEvaluationTemplates,
  createEvaluationTemplate,
  getEvaluationTemplateById,
  updateEvaluationTemplate,
  replaceEvaluationTemplateCriteria,
  deleteEvaluationTemplate,
  addCriteriaToTemplate,
  updateCriteriaInTemplate,
  deleteCriteriaFromTemplate,
  reorderEvaluationCriteria,
  getNotificationTemplates,
  getNotificationTemplate,
  updateNotificationTemplate,
  upsertNotificationTemplateByType,
  previewNotificationTemplateByType,
  getRecruitmentChannels,
  createRecruitmentChannel,
  updateRecruitmentChannel,
  deleteRecruitmentChannel,
  getRecruitmentSources,
  createRecruitmentSource,
  updateRecruitmentSource,
  deleteRecruitmentSource,
  getInterviewCategories,
  createInterviewCategory,
  updateInterviewCategory,
  deleteInterviewCategory,
  getApprovalWorkflows,
  createApprovalWorkflow,
  updateApprovalWorkflow,
  updateApprovalWorkflowStages,
  getApprovalWorkflowStages,
  deleteApprovalWorkflow,
  getJobTemplates,
  createJobTemplate,
  updateJobTemplate,
  deleteJobTemplate,
  createJobDescription,
  getJobDescriptions,
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getCompanyProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
  uploadCompanyStamp,
  getNotificationVariables,
  getNotificationVariablesByType,
} from '../controllers/config.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

// ─── Roles & Permissions ─────────────────────────────────────────────────────

// Configuration endpoints are gated by config:manage (Prompt 1 / BRD).
router.get('/roles', authorize(PERMISSIONS.CONFIG_MANAGE), getRoles);
router.post('/roles', authorize(PERMISSIONS.CONFIG_MANAGE), createRole);
router.patch(
  '/roles/:roleId',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateRole,
);
router.delete(
  '/roles/:roleId',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteRole,
);

router.get(
  '/permissions',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getPermissions,
);
router.put(
  '/roles/:roleId/permissions',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  setRolePermissions,
);

router.get(
  '/roles/:roleId/users',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getRoleUsers,
);

router.get('/users', authorize(PERMISSIONS.CONFIG_MANAGE), getCompanyUsers);
router.post('/users', authorize(PERMISSIONS.CONFIG_MANAGE), createInternalUser);

router.get(
  '/users/:user_id/roles',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getUserRoles,
);

// Prompt 1 assignment endpoints (incremental add/remove)
router.post(
  '/users/:userId/roles',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  assignUserRole,
);
router.delete(
  '/users/:userId/roles/:roleId',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  removeUserRole,
);

// Backward-compatible replace-all endpoint (some UI versions use this)
router.put(
  '/users/:user_id/roles',

  authorize(PERMISSIONS.CONFIG_MANAGE),
  setUserRoles,
);

// ─── Screening Criteria ─────────────────────────────────────────────────────

router.get(
  '/screening-criteria',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getScreeningCriteria,
);
router.post(
  '/screening-criteria',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  createScreeningCriteria,
);
router.get(
  '/screening-criteria/vacancy/:vacancyId',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getScreeningCriteriaByVacancy,
);
router.put(
  '/screening-criteria/vacancy/:vacancyId',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  setScreeningCriteriaForVacancy,
);
router.patch(
  '/screening-criteria/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateScreeningCriteria,
);
router.delete(
  '/screening-criteria/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteScreeningCriteria,
);

// ─── Evaluation Templates ───────────────────────────────────────────────────

// Read access is required by panel members (interview:evaluate) to load the
// evaluation form — they don't need config:manage for a GET-only lookup.
router.get(
  '/evaluation-templates',
  authorize([PERMISSIONS.INTERVIEW_EVALUATE, PERMISSIONS.CONFIG_MANAGE]),
  getEvaluationTemplates,
);
router.post(
  '/evaluation-templates',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  createEvaluationTemplate,
);
router.get(
  '/evaluation-templates/:id',
  authorize([PERMISSIONS.INTERVIEW_EVALUATE, PERMISSIONS.CONFIG_MANAGE]),
  getEvaluationTemplateById,
);
router.patch(
  '/evaluation-templates/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateEvaluationTemplate,
);
router.post(
  '/evaluation-templates/:id/criteria',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  addCriteriaToTemplate,
);
router.patch(
  '/evaluation-templates/:id/criteria/:criteriaId',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateCriteriaInTemplate,
);
router.delete(
  '/evaluation-templates/:id/criteria/:criteriaId',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteCriteriaFromTemplate,
);
router.put(
  '/evaluation-templates/:id/criteria',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  replaceEvaluationTemplateCriteria,
);
router.put(
  '/evaluation-templates/:id/criteria/reorder',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  reorderEvaluationCriteria,
);
router.delete(
  '/evaluation-templates/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteEvaluationTemplate,
);

// ─── Notification Templates ─────────────────────────────────────────────────

router.get(
  '/notification-templates',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getNotificationTemplates,
);
router.get(
  '/notification-templates/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getNotificationTemplate,
);
router.put(
  '/notification-templates/:type',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  upsertNotificationTemplateByType,
);
router.post(
  '/notification-templates/:type/preview',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  previewNotificationTemplateByType,
);
router.patch(
  '/notification-templates/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateNotificationTemplate,
);

// ─── Recruitment Channels ───────────────────────────────────────────────────

router.get(
  '/recruitment-channels',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getRecruitmentChannels,
);
router.post(
  '/recruitment-channels',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  createRecruitmentChannel,
);
router.patch(
  '/recruitment-channels/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateRecruitmentChannel,
);
router.delete(
  '/recruitment-channels/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteRecruitmentChannel,
);

// ─── Recruitment Sources ─────────────────────────────────────────────────────

router.get(
  '/recruitment-sources',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getRecruitmentSources,
);
router.post(
  '/recruitment-sources',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  createRecruitmentSource,
);
router.patch(
  '/recruitment-sources/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateRecruitmentSource,
);
router.delete(
  '/recruitment-sources/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteRecruitmentSource,
);

// ─── Interview Categories ─────────────────────────────────────────────────────

// Read access is also granted to anyone who can schedule or evaluate interviews
// so the category name is available on the evaluation form.
router.get(
  '/interview-categories',
  authorize([PERMISSIONS.INTERVIEW_EVALUATE, PERMISSIONS.INTERVIEW_CREATE, PERMISSIONS.CONFIG_MANAGE]),
  getInterviewCategories,
);
router.post(
  '/interview-categories',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  createInterviewCategory,
);
router.patch(
  '/interview-categories/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateInterviewCategory,
);
router.delete(
  '/interview-categories/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteInterviewCategory,
);

// ─── Approval Workflows ─────────────────────────────────────────────────────

router.get(
  '/approval-workflows',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getApprovalWorkflows,
);
router.post(
  '/approval-workflows',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  createApprovalWorkflow,
);
router.patch(
  '/approval-workflows/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateApprovalWorkflow,
);
router.delete(
  '/approval-workflows/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteApprovalWorkflow,
);
router.put(
  '/approval-workflows/:id/stages',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateApprovalWorkflowStages,
);
router.get(
  '/approval-workflows/:id/stages',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getApprovalWorkflowStages,
);

// ─── Job Templates ─────────────────────────────────────────────────────

router.get(
  '/job-templates',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getJobTemplates,
);
router.post(
  '/job-templates',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  createJobTemplate,
);
router.patch(
  '/job-templates/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateJobTemplate,
);
router.delete(
  '/job-templates/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteJobTemplate,
);
router.post(
  '/job-templates/:templateId/descriptions',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  createJobDescription,
);
router.get(
  '/job-templates/:templateId/descriptions',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getJobDescriptions,
);

// ─── Custom Fields ─────────────────────────────────────────────────────

router.get(
  '/custom-fields',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getCustomFields,
);
router.post(
  '/custom-fields',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  createCustomField,
);
router.patch(
  '/custom-fields/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateCustomField,
);
router.delete(
  '/custom-fields/:id',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  deleteCustomField,
);

// ─── Company Profile ─────────────────────────────────────────────────────

router.get('/company', authenticate, getCompanyProfile);
router.patch(
  '/company',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateCompanyProfile,
);
router.post(
  '/company/logo',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  upload.single('logo'),
  uploadCompanyLogo,
);
router.post(
  '/company/stamp',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  upload.single('stamp'),
  uploadCompanyStamp,
);
router.get('/company-profile', authenticate, getCompanyProfile);
router.put(
  '/company-profile',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  updateCompanyProfile,
);

// ─── Notification Variables ─────────────────────────────────────────────────

router.get(
  '/notification-variables',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getNotificationVariables,
);
router.get(
  '/notification-variables/:type',
  authorize(PERMISSIONS.CONFIG_MANAGE),
  getNotificationVariablesByType,
);

export default router;

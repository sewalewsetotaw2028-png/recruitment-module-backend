import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ConfigService } from '../services/config.service';
import { AppError } from '../utils/AppError';
import {
  createRoleSchema,
  updateRoleSchema,
  setRolePermissionsSchema,
  setUserRolesSchema,
  assignUserRoleSchema,
  createScreeningCriteriaSchema,
  updateScreeningCriteriaSchema,
  upsertVacancyScreeningCriteriaSchema,
  createEvaluationTemplateSchema,
  updateEvaluationTemplateSchema,
  replaceEvaluationTemplateCriteriaSchema,
  evaluationCriteriaSchema,
  updateNotificationTemplateSchema,
  upsertNotificationTemplateSchema,
  notificationTypeSchema,
  createRecruitmentChannelSchema,
  updateRecruitmentChannelSchema,
  createRecruitmentSourceSchema,
  updateRecruitmentSourceSchema,
  createInterviewCategorySchema,
  updateInterviewCategorySchema,
  createApprovalWorkflowSchema,
  updateApprovalWorkflowSchema,
  updateApprovalWorkflowStagesSchema,
  createJobTemplateSchema,
  updateJobTemplateSchema,
  createJobDescriptionSchema,
  createCustomFieldSchema,
  updateCustomFieldSchema,
  updateCompanyProfileSchema,
  createInternalUserSchema,
} from '../utils/config.validation';

// ─── Roles & Permissions ───────────────────────────────────────────────────────

export const getRoles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roles = await ConfigService.getRoles(Number(req.user!.company_id));
    res.status(200).json({ status: 'success', data: roles });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await ConfigService.createRole(
      Number(req.user!.company_id),
      createRoleSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: role });
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await ConfigService.updateRole(
      Number(req.user!.company_id),
      String(req.params.roleId),
      updateRoleSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: role });
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.deleteRole(
      Number(req.user!.company_id),
      String(req.params.roleId),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getPermissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const permissions = await ConfigService.getPermissions();
    res.status(200).json({ status: 'success', data: permissions });
  } catch (error) {
    next(error);
  }
};

export const setRolePermissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await ConfigService.setRolePermissions(
      Number(req.user!.company_id),
      String(req.params.roleId),
      setRolePermissionsSchema.parse(req.body).permission_ids,
    );
    res.status(200).json({ status: 'success', data: role });
  } catch (error) {
    next(error);
  }
};

export const getRoleUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await ConfigService.getRoleUsers(
      Number(req.user!.company_id),
      String(req.params.roleId),
    );
    res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    next(error);
  }
};

export const getUserRoles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roles = await ConfigService.getUserRoles(String(req.params.user_id));
    res.status(200).json({ status: 'success', data: roles });
  } catch (error) {
    next(error);
  }
};

export const setUserRoles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roles = await ConfigService.setUserRoles(
      String(req.params.user_id),
      setUserRolesSchema.parse(req.body).roleIds,
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: roles });
  } catch (error) {
    next(error);
  }
};

export const assignUserRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await ConfigService.assignUserRole(
      Number(req.user!.company_id),
      String(req.params.userId),
      assignUserRoleSchema.parse(req.body).role_id,
      req.user!.id,
    );
    res.status(201).json({ status: 'success', data: role });
  } catch (error) {
    next(error);
  }
};

export const removeUserRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.removeUserRole(
      Number(req.user!.company_id),
      String(req.params.userId),
      String(req.params.roleId),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getCompanyUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20),
    );
    const search = req.query.search
      ? String(req.query.search).trim()
      : undefined;

    const result = await ConfigService.getCompanyUsers(
      Number(req.user!.company_id),
      {
        page,
        limit,
        search,
      },
    );
    res
      .status(200)
      .json({
        status: 'success',
        data: result.users,
        pagination: result.pagination,
      });
  } catch (error) {
    next(error);
  }
};

export const createInternalUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = createInternalUserSchema.parse(req.body);
    const user = await ConfigService.createInternalUser(
      Number(req.user!.company_id),
      payload,
      req.user!.id,
    );
    res.status(201).json({ status: 'success', data: user });
  } catch (error) {
    next(error);
  }
};

// ─── Screening Criteria ─────────────────────────────────────────────────────

export const getScreeningCriteria = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const criteria = await ConfigService.getScreeningCriteria(
      Number(req.user!.company_id),
      {
        vacancyId: req.query.vacancyId as string,
        jobTemplateId: req.query.jobTemplateId as string,
      },
    );
    res.status(200).json({ status: 'success', data: criteria });
  } catch (error) {
    next(error);
  }
};

export const getScreeningCriteriaByVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const criteria = await ConfigService.getScreeningCriteriaByVacancy(
      Number(req.user!.company_id),
      String(req.params.vacancyId),
    );
    res.status(200).json({ status: 'success', data: criteria });
  } catch (error) {
    next(error);
  }
};

export const createScreeningCriteria = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const criteria = await ConfigService.createScreeningCriteria(
      Number(req.user!.company_id),
      createScreeningCriteriaSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: criteria });
  } catch (error) {
    next(error);
  }
};

export const setScreeningCriteriaForVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const criteria = await ConfigService.upsertVacancyScreeningCriteria(
      Number(req.user!.company_id),
      String(req.params.vacancyId),
      upsertVacancyScreeningCriteriaSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: criteria });
  } catch (error) {
    next(error);
  }
};

export const updateScreeningCriteria = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const criteria = await ConfigService.updateScreeningCriteria(
      Number(req.user!.company_id),
      String(req.params.id),
      updateScreeningCriteriaSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: criteria });
  } catch (error) {
    next(error);
  }
};

export const deleteScreeningCriteria = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.deleteScreeningCriteria(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Evaluation Templates ───────────────────────────────────────────────────

export const getEvaluationTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const templates = await ConfigService.getEvaluationTemplates(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: templates });
  } catch (error) {
    next(error);
  }
};

export const createEvaluationTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.createEvaluationTemplate(
      Number(req.user!.company_id),
      createEvaluationTemplateSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const updateEvaluationTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.updateEvaluationTemplate(
      Number(req.user!.company_id),
      String(req.params.id),
      updateEvaluationTemplateSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const replaceEvaluationTemplateCriteria = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.updateEvaluationTemplate(
      Number(req.user!.company_id),
      String(req.params.id),
      replaceEvaluationTemplateCriteriaSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const deleteEvaluationTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.deleteEvaluationTemplate(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getEvaluationTemplateById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.getEvaluationTemplateById(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const addCriteriaToTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.addCriteriaToTemplate(
      Number(req.user!.company_id),
      String(req.params.id),
      evaluationCriteriaSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const updateCriteriaInTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.updateCriteriaInTemplate(
      Number(req.user!.company_id),
      String(req.params.id),
      String(req.params.criteriaId),
      evaluationCriteriaSchema.partial().parse(req.body),
    );
    res.status(200).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const deleteCriteriaFromTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.deleteCriteriaFromTemplate(
      Number(req.user!.company_id),
      String(req.params.id),
      String(req.params.criteriaId),
    );
    res.status(200).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const reorderEvaluationCriteria = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.reorderCriteria(
      Number(req.user!.company_id),
      String(req.params.id),
      req.body.criteria_ids || [],
    );
    res.status(200).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

// ─── Notification Templates ─────────────────────────────────────────────────

export const getNotificationTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.getNotificationTemplates(
      Number(req.user!.company_id),
    );
    res.status(200).json({
      status: 'success',
      data: result.templates,
      groupedByType: result.groupedByType,
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.getNotificationTemplateById(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const updateNotificationTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.updateNotificationTemplate(
      Number(req.user!.company_id),
      String(req.params.id),
      updateNotificationTemplateSchema.parse(req.body),
    );
    res.status(200).json({
      status: 'success',
      data: result.template,
      warnings: result.warnings,
    });
  } catch (error) {
    next(error);
  }
};

export const upsertNotificationTemplateByType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.upsertNotificationTemplateByType(
      Number(req.user!.company_id),
      notificationTypeSchema.parse(req.params.type),
      upsertNotificationTemplateSchema.parse(req.body),
    );
    res.status(200).json({
      status: 'success',
      data: result.template,
      warnings: result.warnings,
    });
  } catch (error) {
    next(error);
  }
};

export const previewNotificationTemplateByType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const preview = await ConfigService.previewNotificationTemplateByType(
      Number(req.user!.company_id),
      notificationTypeSchema.parse(req.params.type),
    );
    res.status(200).json({ status: 'success', data: preview });
  } catch (error) {
    next(error);
  }
};

// ─── Recruitment Channels ───────────────────────────────────────────────────

export const getRecruitmentChannels = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const channels = await ConfigService.getRecruitmentChannels(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: channels });
  } catch (error) {
    next(error);
  }
};

export const createRecruitmentChannel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const channel = await ConfigService.createRecruitmentChannel(
      Number(req.user!.company_id),
      createRecruitmentChannelSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: channel });
  } catch (error) {
    next(error);
  }
};

export const updateRecruitmentChannel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const channel = await ConfigService.updateRecruitmentChannel(
      Number(req.user!.company_id),
      String(req.params.id),
      updateRecruitmentChannelSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: channel });
  } catch (error) {
    next(error);
  }
};

export const deleteRecruitmentChannel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.deleteRecruitmentChannel(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Recruitment Sources ─────────────────────────────────────────────────────

export const getRecruitmentSources = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sources = await ConfigService.getRecruitmentSources(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: sources });
  } catch (error) {
    next(error);
  }
};

export const createRecruitmentSource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const source = await ConfigService.createRecruitmentSource(
      Number(req.user!.company_id),
      createRecruitmentSourceSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: source });
  } catch (error) {
    next(error);
  }
};

export const updateRecruitmentSource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const source = await ConfigService.updateRecruitmentSource(
      Number(req.user!.company_id),
      String(req.params.id),
      updateRecruitmentSourceSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: source });
  } catch (error) {
    next(error);
  }
};

export const deleteRecruitmentSource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.deleteRecruitmentSource(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Interview Categories ─────────────────────────────────────────────────────

export const getInterviewCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categories = await ConfigService.getInterviewCategories(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: categories });
  } catch (error) {
    next(error);
  }
};

export const createInterviewCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const category = await ConfigService.createInterviewCategory(
      Number(req.user!.company_id),
      createInterviewCategorySchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: category });
  } catch (error) {
    next(error);
  }
};

export const updateInterviewCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const category = await ConfigService.updateInterviewCategory(
      Number(req.user!.company_id),
      String(req.params.id),
      updateInterviewCategorySchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteInterviewCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.deleteInterviewCategory(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Approval Workflows ─────────────────────────────────────────────────────

export const getApprovalWorkflows = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const workflows = await ConfigService.getApprovalWorkflows(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: workflows });
  } catch (error) {
    next(error);
  }
};

export const createApprovalWorkflow = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const workflow = await ConfigService.createApprovalWorkflow(
      Number(req.user!.company_id),
      createApprovalWorkflowSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: workflow });
  } catch (error) {
    next(error);
  }
};

export const updateApprovalWorkflow = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const workflow = await ConfigService.updateApprovalWorkflow(
      Number(req.user!.company_id),
      String(req.params.id),
      updateApprovalWorkflowSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: workflow });
  } catch (error) {
    next(error);
  }
};

export const updateApprovalWorkflowStages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const workflow = await ConfigService.updateApprovalWorkflowStages(
      Number(req.user!.company_id),
      String(req.params.id),
      updateApprovalWorkflowStagesSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: workflow });
  } catch (error) {
    next(error);
  }
};

export const getApprovalWorkflowStages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const stages = await ConfigService.getApprovalWorkflowStages(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: stages });
  } catch (error) {
    next(error);
  }
};

export const deleteApprovalWorkflow = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.deleteApprovalWorkflow(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Job Templates ─────────────────────────────────────────────────────

export const getJobTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const templates = await ConfigService.getJobTemplates(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: templates });
  } catch (error) {
    next(error);
  }
};

export const createJobTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.createJobTemplate(
      Number(req.user!.company_id),
      createJobTemplateSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const getJobDescriptions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const descriptions = await ConfigService.getJobDescriptions(
      Number(req.user!.company_id),
      String(req.params.templateId),
    );
    res.status(200).json({ status: 'success', data: descriptions });
  } catch (error) {
    next(error);
  }
};

export const updateJobTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await ConfigService.updateJobTemplate(
      Number(req.user!.company_id),
      String(req.params.id),
      updateJobTemplateSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: template });
  } catch (error) {
    next(error);
  }
};

export const deleteJobTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.deleteJobTemplate(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const createJobDescription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const description = await ConfigService.createJobDescription(
      Number(req.user!.company_id),
      String(req.params.templateId),
      createJobDescriptionSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: description });
  } catch (error) {
    next(error);
  }
};

// ─── Custom Fields ─────────────────────────────────────────────────────

export const getCustomFields = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const fields = await ConfigService.getCustomFields(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: fields });
  } catch (error) {
    next(error);
  }
};

export const createCustomField = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const field = await ConfigService.createCustomField(
      Number(req.user!.company_id),
      createCustomFieldSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: field });
  } catch (error) {
    next(error);
  }
};

export const updateCustomField = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const field = await ConfigService.updateCustomField(
      Number(req.user!.company_id),
      String(req.params.id),
      updateCustomFieldSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: field });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomField = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.deleteCustomField(
      Number(req.user!.company_id),
      String(req.params.id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Company Profile ─────────────────────────────────────────────────────

export const getCompanyProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const company = await ConfigService.getCompanyProfile(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: company });
  } catch (error) {
    next(error);
  }
};

export const updateCompanyProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const company = await ConfigService.updateCompanyProfile(
      Number(req.user!.company_id),
      updateCompanyProfileSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: company });
  } catch (error) {
    next(error);
  }
};

// ─── Notification Variables ─────────────────────────────────────────────────

export const getNotificationVariables = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConfigService.getNotificationVariables();
    res.status(200).json({
      status: 'success',
      data: result.variables,
      groupedByType: result.groupedByType,
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationVariablesByType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const variables = await ConfigService.getNotificationVariablesByType(
      String(req.params.type),
    );
    res.status(200).json({ status: 'success', data: variables });
  } catch (error) {
    next(error);
  }
};

export const uploadCompanyLogo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      throw new AppError('Logo file is required', 400);
    }

    const baseUrl =
      process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
      `${req.protocol}://${req.get('host')}`;

    const company = await ConfigService.updateCompanyProfile(
      Number(req.user!.company_id),
      { logoUrl: `${baseUrl}/uploads/${req.file.filename}` },
    );
    res.status(200).json({ status: 'success', data: company });
  } catch (error) {
    next(error);
  }
};

export const uploadCompanyStamp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      throw new AppError('Stamp file is required', 400);
    }

    const baseUrl =
      process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
      `${req.protocol}://${req.get('host')}`;

    const company = await ConfigService.updateCompanyProfile(
      Number(req.user!.company_id),
      { stampUrl: `${baseUrl}/uploads/${req.file.filename}` },
    );
    res.status(200).json({ status: 'success', data: company });
  } catch (error) {
    next(error);
  }
};

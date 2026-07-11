import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { WorkforceService } from '../services/workforce.service';
import { PERMISSIONS } from '../config/rolePermissions';
import {
  createdepartmentSchema,
  createWorkforcePlanSchema,
  updateWorkforcePlanSchema,
  rejectWorkforcePlanSchema,
  forwardWorkforcePlanSchema,
  returnWorkforcePlanSchema,
} from '../utils/request.validation';

const getDepartmentScope = (req: AuthRequest) => {
  const permissions = req.user?.permissions ?? [];
  // A user with approve, forward, or global report-read permission sees all
  // departments. Everyone else is scoped to their own department.
  const isGlobalScope =
    permissions.includes(PERMISSIONS.WORKFORCE_PLAN_APPROVE) ||
    permissions.includes(PERMISSIONS.WORKFORCE_PLAN_FORWARD) ||
    permissions.includes(PERMISSIONS.REPORTS_READ) ||
    permissions.includes(PERMISSIONS.REPORT_READ);

  return isGlobalScope ? undefined : req.user?.department_id;
};

export const createDepartment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dept = await WorkforceService.createDepartment(
      req.user!.company_id,
      createdepartmentSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: dept });
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const depts = await WorkforceService.getDepartments(req.user!.company_id);
    res.status(200).json({ status: 'success', data: depts });
  } catch (error) {
    next(error);
  }
};

export const createWorkforcePlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await WorkforceService.createPlan(
      req.user!.company_id,
      req.user!.id,
      createWorkforcePlanSchema.parse(req.body),
      getDepartmentScope(req),
    );
    res.status(201).json({ status: 'success', data: plan });
  } catch (error) {
    next(error);
  }
};

export const updateWorkforcePlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await WorkforceService.updatePlan(
      req.user!.company_id,
      String(req.params.planId),
      req.user!.id,
      updateWorkforcePlanSchema.parse(req.body),
      getDepartmentScope(req),
    );
    res.status(200).json({ status: 'success', data: plan });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkforcePlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await WorkforceService.deletePlan(
      req.user!.company_id,
      String(req.params.planId),
      getDepartmentScope(req),
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getWorkforcePlans = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plans = await WorkforceService.getPlans(
      req.user!.company_id,
      getDepartmentScope(req),
    );
    res.status(200).json({ status: 'success', data: plans });
  } catch (error) {
    next(error);
  }
};

export const getWorkforcePlanById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await WorkforceService.getPlanById(
      req.user!.company_id,
      String(req.params.planId),
      getDepartmentScope(req),
    );
    res.status(200).json({ status: 'success', data: plan });
  } catch (error) {
    next(error);
  }
};

export const submitWorkforcePlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await WorkforceService.submitPlan(
      req.user!.company_id,
      String(req.params.planId),
      req.user!.id,
      getDepartmentScope(req),
    );
    res.status(200).json({ status: 'success', data: plan });
  } catch (error) {
    next(error);
  }
};

export const approveWorkforcePlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await WorkforceService.approvePlan(
      req.user!.company_id,
      String(req.params.planId),
      req.user!.id,
      getDepartmentScope(req),
    );
    res.status(200).json({ status: 'success', data: plan });
  } catch (error) {
    next(error);
  }
};

export const rejectWorkforcePlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reason } = rejectWorkforcePlanSchema.parse(req.body);
    const plan = await WorkforceService.rejectPlan(
      req.user!.company_id,
      String(req.params.planId),
      req.user!.id,
      reason,
      getDepartmentScope(req),
    );
    res.status(200).json({ status: 'success', data: plan });
  } catch (error) {
    next(error);
  }
};

export const forwardWorkforcePlanToCeo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { notes } = forwardWorkforcePlanSchema.parse(req.body);
    const plan = await WorkforceService.forwardPlanToCeo(
      req.user!.company_id,
      String(req.params.planId),
      req.user!.id,
      notes,
      getDepartmentScope(req),
    );
    res.status(200).json({ status: 'success', data: plan });
  } catch (error) {
    next(error);
  }
};

export const returnWorkforcePlanForRevision = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reason } = returnWorkforcePlanSchema.parse(req.body);
    // Determine actor role from permissions — not role name, which may be stale.
    // A user with WORKFORCE_PLAN_APPROVE but not FORWARD is assumed to be the
    // CEO-level approver; everyone else is treated as HR.
    const permissions = req.user?.permissions ?? [];
    const isCeoLevel =
      permissions.includes(PERMISSIONS.WORKFORCE_PLAN_APPROVE) &&
      !permissions.includes(PERMISSIONS.WORKFORCE_PLAN_FORWARD);
    const actorRole: 'ceo' | 'hr' = isCeoLevel ? 'ceo' : 'hr';

    const plan = await WorkforceService.returnForRevision(
      req.user!.company_id,
      String(req.params.planId),
      req.user!.id,
      actorRole,
      reason,
      getDepartmentScope(req),
    );
    res.status(200).json({ status: 'success', data: plan });
  } catch (error) {
    next(error);
  }
};

export const closeWorkforcePlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await WorkforceService.closePlan(
      req.user!.company_id,
      String(req.params.planId),
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: plan });
  } catch (error) {
    next(error);
  }
};

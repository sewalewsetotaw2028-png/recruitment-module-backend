import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ReportingService } from '../services/reporting.service';
import { InterviewService } from '../services/interview.service';
import prisma from '../config/database';

export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { period, startDate, endDate, departmentId, vacancyId } =
      req.query as {
        period?: string;
        startDate?: string;
        endDate?: string;
        departmentId?: string;
        vacancyId?: string;
      };

    // For convenience, interpret period values
    let opts: {
      period?: string;
      startDate?: string;
      endDate?: string;
      departmentId?: string;
      vacancyId?: string;
      forceEmpty?: boolean;
    } = {};
    if (period === 'monthly' || period === 'quarterly') {
      opts.period = period;
    } else if (period === 'custom') {
      // IMPORTANT: reporting.service.ts only applies custom start/end when
      // opts.period === 'custom'. Without this, custom date range has no effect.
      opts.period = 'custom';
      if (startDate) opts.startDate = startDate;
      if (endDate) opts.endDate = endDate;
    } else {
      // default to monthly
      opts.period = 'monthly';
    }

    /**
     * IMPORTANT: This endpoint is already protected by `authorize(PERMISSIONS.REPORTS_READ)`
     * at the router level, meaning access is permission-driven (DB-backed), not role-driven.
     *
     * Therefore, DO NOT silently scope results by department based on role names.
     * If the caller should only see department-scoped data, they should not have
     * the reporting permission in the first place (configurable in the UI).
     */
    if (departmentId) opts.departmentId = departmentId;

    if (vacancyId) opts.vacancyId = vacancyId;

    const stats = await ReportingService.getDashboardStats(
      String(req.user!.company_id),
      opts,
    );
    res.status(200).json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
};

export const generateHiringMinute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { vacancyId } = req.params;
    const hiringMinute = await ReportingService.generateHiringMinute(
      String(req.user!.company_id),
      Array.isArray(vacancyId) ? vacancyId[0] : vacancyId,
      String(req.user!.id),
    );
    res.status(200).json({ status: 'success', data: hiringMinute });
  } catch (error) {
    next(error);
  }
};

/**
 * getMyVacancies — Return vacancies assigned to the current hiring manager.
 * - Hiring manager view: vacancies whose recruitment request was raised by this user.
 * - Department manager view: vacancies in the department(s) the user manages.
 */
export const getMyVacancies = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const userDepartmentId = req.user?.department_id;
    if (!userId) return res.status(200).json({ status: 'success', data: [] });

    const vacancies = await prisma.vacancy.findMany({
      where: {
        company_id: req.user!.company_id,
        OR: [
          // Hiring manager assignment (request owner)
          { recruitment_request: { requested_by_user_id: userId } },
          // Department manager scope (managed department)
          ...(userDepartmentId
            ? [{ department_id: Number(userDepartmentId) }]
            : []),
        ],
        status: { in: ['OPEN', 'IN_PROGRESS', 'PUBLISHED'] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        open_positions: true,
        department: { select: { id: true, name: true } },
        applications: { select: { id: true, status: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ status: 'success', data: vacancies });
  } catch (error) {
    next(error);
  }
};

/**
 * getMyInterviews — Return interviews where the current user is a panel member.
 */
export const getMyInterviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(200).json({ status: 'success', data: [] });

    const interviews = await prisma.interview.findMany({
      where: {
        interview_panels: {
          some: { panel_member_id: userId },
        },
      },
      select: {
        id: true,
        interview_number: true,
        round: true,
        start_time: true,
        end_time: true,
        status: true,
        mode: true,
        application: {
          select: {
            id: true,
            vacancy: { select: { id: true, title: true } },
            candidate: {
              select: { first_name: true, last_name: true, email: true },
            },
          },
        },
      },
      orderBy: { start_time: 'asc' },
    });

    res.status(200).json({ status: 'success', data: interviews });
  } catch (error) {
    next(error);
  }
};

/**
 * getMyEvaluations — Return pending interview evaluations assigned to the current user.
 */
export const getMyEvaluations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const pending = await InterviewService.getPendingEvaluations(
      req.user!.company_id,
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: pending });
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import {
  getJobPostingsForVacancy,
  createJobPostings,
  withdrawJobPostings,
  getCompanyChannels,
} from '../services/jobPosting.service';
import { AuthRequest } from '../middlewares/authMiddleware';

// ─── GET /api/v1/job-postings?vacancyId=xxx ───────────────────────────────────
// Returns all VacancyJobPostings for a vacancy (which channels it's posted to).
export const findAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const company_id = req.user?.company_id;
    if (!company_id) throw new AppError('Unauthorized', 401);

    const vacancyId = req.query.vacancyId ? String(req.query.vacancyId) : null;
    if (!vacancyId) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const postings = await getJobPostingsForVacancy(company_id, vacancyId);
    res.status(200).json({ success: true, data: postings });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/job-postings ────────────────────────────────────────────────
// Body: { vacancyId: string, channelIds: string[] }
// Creates VacancyJobPosting records and marks vacancy as PUBLISHED.
export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const company_id = req.user?.company_id;
    if (!company_id) throw new AppError('Unauthorized', 401);

    const { vacancyId, channelIds } = req.body as {
      vacancyId: string;
      channelIds: string[];
    };

    if (!vacancyId) throw new AppError('vacancyId is required', 400);
    if (!Array.isArray(channelIds) || channelIds.length === 0) {
      throw new AppError('At least one channelId is required', 400);
    }

    const postings = await createJobPostings(company_id, vacancyId, channelIds);
    res.status(201).json({ success: true, data: postings });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/v1/job-postings/:vacancyId/withdraw ──────────────────────────
export const withdraw = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const company_id = req.user?.company_id;
    if (!company_id) throw new AppError('Unauthorized', 401);

    const vacancyId = String(req.params.vacancyId);
    const reason: string | undefined = req.body?.reason ? String(req.body.reason) : undefined;

    const postings = await withdrawJobPostings(company_id, vacancyId, reason);
    res.status(200).json({ success: true, data: postings });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/job-postings/channels ───────────────────────────────────────
// Returns all active RecruitmentChannels for the company.
export const getChannels = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const company_id = req.user?.company_id;
    if (!company_id) throw new AppError('Unauthorized', 401);

    const channels = await getCompanyChannels(company_id);
    res.status(200).json({ success: true, data: channels });
  } catch (err) {
    next(err);
  }
};

// Legacy stubs — kept so existing imports don't break
export const findOne = findAll;
export const publish = create;
export const remove = async (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Deleted' });
};
export const candidateJobs = async (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: [] });
};
export const candidateJobDetails = async (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Not found' });
};

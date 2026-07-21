import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { VacancyService } from '../services/vacancy.service';
import { InterviewService } from '../services/interview.service';
import {
  createVacancySchema,
  rejectReasonSchema,
  setVacancyStatusSchema,
  updateVacancySchema,
  selectCandidateSchema,
} from '../utils/recruitment.validation';

export const getVacancies = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vacancies = await VacancyService.getVacancies(req.user!.company_id);
    res.status(200).json({ status: 'success', data: vacancies });
  } catch (error) {
    next(error);
  }
};
export const getVacancyById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vacancy = await VacancyService.getVacancyById(
      req.user!.company_id,
      String(req.params.vacancy_id),
    );

    const timeToFillDays =
      vacancy?.filled_at && vacancy?.created_at
        ? Math.round(
            (vacancy.filled_at.getTime() - vacancy.created_at.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : undefined;

    res.status(200).json({
      status: 'success',
      data: {
        ...vacancy,
        ...(timeToFillDays !== undefined && { timeToFillDays }),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedBody = createVacancySchema.parse(req.body);
    const vacancy = await VacancyService.createVacancy(
      req.user!.company_id,
      validatedBody,
    );
    res.status(201).json({ status: 'success', data: vacancy });
  } catch (error) {
    next(error);
  }
};

export const updateVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log('updateVacancy controller - req.body:', req.body);
    console.log('updateVacancy controller - req.params:', req.params);
    const validatedBody = updateVacancySchema.parse(req.body);
    console.log('updateVacancy controller - validatedBody:', validatedBody);
    const vacancy = await VacancyService.updateVacancy(
      req.user!.company_id,
      String(req.params.vacancy_id),
      validatedBody,
    );
    res.status(200).json({ status: 'success', data: vacancy });
  } catch (error) {
    console.error('updateVacancy controller - error:', error);
    next(error);
  }
};

export const postVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vacancy = await VacancyService.postVacancy(
      req.user!.company_id,
      String(req.params.vacancy_id),
    );
    res.status(200).json({ status: 'success', data: vacancy });
  } catch (error) {
    next(error);
  }
};

export const unpostVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vacancy = await VacancyService.unpostVacancy(
      req.user!.company_id,
      String(req.params.vacancy_id),
    );
    res.status(200).json({ status: 'success', data: vacancy });
  } catch (error) {
    next(error);
  }
};

export const holdVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vacancy = await VacancyService.holdVacancy(
      req.user!.company_id,
      String(req.params.vacancy_id),
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: vacancy });
  } catch (error) {
    next(error);
  }
};

export const resumeVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vacancy = await VacancyService.resumeVacancy(
      req.user!.company_id,
      String(req.params.vacancy_id),
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: vacancy });
  } catch (error) {
    next(error);
  }
};

export const setVacancyStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedBody = setVacancyStatusSchema.parse(req.body);
    const vacancy = await VacancyService.setVacancyStatus(
      req.user!.company_id,
      String(req.params.vacancy_id),
      validatedBody.status,
    );
    res.status(200).json({ status: 'success', data: vacancy });
  } catch (error) {
    next(error);
  }
};

export const fulfillVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vacancy = await VacancyService.fulfillVacancy(
      req.user!.company_id,
      String(req.params.vacancy_id),
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: vacancy });
  } catch (error) {
    next(error);
  }
};

export const approveVacancyPosting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vacancy = await VacancyService.approveVacancyPosting(
      req.user!.company_id,
      String(req.params.vacancy_id),
    );
    res.status(200).json({ status: 'success', data: vacancy });
  } catch (error) {
    next(error);
  }
};

export const rejectVacancyPosting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reason } = rejectReasonSchema.parse(req.body);
    const vacancy = await VacancyService.rejectVacancyPosting(
      req.user!.company_id,
      String(req.params.vacancy_id),
      reason,
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: vacancy });
  } catch (error) {
    next(error);
  }
};

// Prompt 4: Evaluation results & aggregation
export const getVacancyEvaluationSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const summary = await InterviewService.getVacancyEvaluationSummary(
      String(req.user!.company_id),
      String(req.params.vacancy_id),
    );
    res.status(200).json({ status: 'success', data: summary });
  } catch (error) {
    next(error);
  }
};

// Prompt 5: Final Selection Decision
export const selectCandidate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedBody = selectCandidateSchema.parse(req.body);
    const hiringMinute = await VacancyService.selectCandidate(
      req.user!.company_id,
      String(req.params.vacancy_id),
      validatedBody,
      req.user!.id,
    );
    res.status(201).json({ status: 'success', data: hiringMinute });
  } catch (error) {
    next(error);
  }
};

export const revokeSelection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await VacancyService.revokeSelection(
      req.user!.company_id,
      String(req.params.vacancy_id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getVacancyApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const applications = await VacancyService.getVacancyApplications(
      req.user!.company_id,
      String(req.params.vacancy_id),
    );
    res.status(200).json({ status: 'success', data: applications });
  } catch (error) {
    next(error);
  }
};

export const getVacancyHiringMinute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const hiringMinute = await VacancyService.getVacancyHiringMinute(
      req.user!.company_id,
      String(req.params.vacancy_id),
    );
    res.status(200).json({ status: 'success', data: hiringMinute });
  } catch (error) {
    next(error);
  }
};

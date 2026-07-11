import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { HiringMinuteService } from '../services/hiringMinute.service';
import {
  createHiringMinuteSchema,
  updateHiringMinuteSchema,
  approveHiringMinuteSchema,
  rejectHiringMinuteSchema,
  addSignatorySchema,
  addTalentRosterSchema,
  sendRegretsSchema,
} from '../utils/recruitment.validation';

export const getHiringMinutes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Support optional ?vacancy_id= query param to fetch a specific vacancy's minute
    const { vacancy_id } = req.query;
    if (vacancy_id && typeof vacancy_id === 'string') {
      const minute = await HiringMinuteService.getHiringMinuteByVacancy(
        req.user!.company_id,
        vacancy_id,
      );
      return res.status(200).json({ status: 'success', data: minute });
    }
    const minutes = await HiringMinuteService.getHiringMinutes(
      req.user!.company_id,
    );
    res.status(200).json({ status: 'success', data: minutes });
  } catch (error) {
    next(error);
  }
};

export const getHiringMinuteById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const minute = await HiringMinuteService.getHiringMinuteById(
      req.user!.company_id,
      String(req.params.hiringMinuteId),
    );
    res.status(200).json({ status: 'success', data: minute });
  } catch (error) {
    next(error);
  }
};

export const createHiringMinute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedBody = createHiringMinuteSchema.parse(req.body);
    const minute = await HiringMinuteService.createHiringMinute(
      req.user!.company_id,
      req.user!.id,
      validatedBody as any,
    );
    res.status(201).json({ status: 'success', data: minute });
  } catch (error) {
    next(error);
  }
};

export const updateHiringMinute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedBody = updateHiringMinuteSchema.parse(req.body);
    const minute = await HiringMinuteService.updateHiringMinute(
      req.user!.company_id,
      String(req.params.hiringMinuteId),
      validatedBody as any,
    );
    res.status(200).json({ status: 'success', data: minute });
  } catch (error) {
    next(error);
  }
};

// Prompt 6: Hiring Minute Approval & Post-Selection Flows
export const approveHiringMinute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    approveHiringMinuteSchema.parse(req.body);
    const minute = await HiringMinuteService.approveHiringMinute(
      req.user!.company_id,
      String(req.params.hiringMinuteId),
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: minute });
  } catch (error) {
    next(error);
  }
};

export const rejectHiringMinute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { comments } = rejectHiringMinuteSchema.parse(req.body);
    const minute = await HiringMinuteService.rejectHiringMinute(
      req.user!.company_id,
      String(req.params.hiringMinuteId),
      comments,
    );
    res.status(200).json({ status: 'success', data: minute });
  } catch (error) {
    next(error);
  }
};

export const addSignatory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = addSignatorySchema.parse(req.body);
    const signatory = await HiringMinuteService.addSignatory(
      req.user!.company_id,
      String(req.params.hiringMinuteId),
      req.user!.id,
      data,
    );
    res.status(201).json({ status: 'success', data: signatory });
  } catch (error) {
    next(error);
  }
};

export const addTalentRoster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { application_ids } = addTalentRosterSchema.parse(req.body);
    const results = await HiringMinuteService.addTalentRoster(
      req.user!.company_id,
      String(req.params.hiringMinuteId),
      application_ids,
    );
    res.status(200).json({ status: 'success', data: results });
  } catch (error) {
    next(error);
  }
};

export const sendRegrets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    sendRegretsSchema.parse(req.body);
    const results = await HiringMinuteService.sendRegrets(
      req.user!.company_id,
      String(req.params.hiringMinuteId),
    );
    res.status(200).json({ status: 'success', data: results });
  } catch (error) {
    next(error);
  }
};

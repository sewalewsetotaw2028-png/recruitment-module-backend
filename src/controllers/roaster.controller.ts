import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { RoasterService } from '../services/roaster.service';
import { addToRoasterSchema } from '../utils/request.validation';

export const addToRoaster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await RoasterService.addToRoaster(
      req.user!.company_id,
      req.user!.id,
      addToRoasterSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getRoasterList = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filters = {
      search: req.query.search as string | undefined,
      skill: req.query.skill as string | undefined,
      tier: req.query.tier as string | undefined,
      department: req.query.department as string | undefined,
      minExperience: req.query.minExperience ? Number(req.query.minExperience) : undefined,
      availability: req.query.availability as string | undefined,
    };
    const list = await RoasterService.getRoaster(req.user!.company_id, filters);
    res.status(200).json({ status: 'success', data: list });
  } catch (error) {
    next(error);
  }
};

export const linkCandidateToVacancy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {roster_id, vacancy_id} = req.params;
    const result = await RoasterService.linkCandidateToVacancy(
      req.user!.company_id,
      Array.isArray(roster_id) ? roster_id[0] : roster_id,
      Array.isArray(vacancy_id) ? vacancy_id[0] : vacancy_id,
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getAllRosterActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await RoasterService.getAllRosterActivity(req.user!.company_id);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getRosterHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {roster_id} = req.params;
    const result = await RoasterService.getRosterHistory(
      req.user!.company_id,
      Array.isArray(roster_id) ? roster_id[0] : roster_id,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const removeFromRoaster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {roster_id} = req.params;
    const reason = req.body?.reason as string | undefined;
    const result = await RoasterService.removeFromRoaster(
      req.user!.company_id,
      Array.isArray(roster_id) ? roster_id[0] : roster_id,
      req.user!.id,
      reason,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

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
    const list = await RoasterService.getRoaster(req.user!.company_id);
    res.status(200).json({ status: 'success', data: list });
  } catch (error) {
    next(error);
  }
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { OfferService } from '../services/offer.service';
import { CandidateService } from '../services/candidate.service';
import { issueOfferSchema } from '../utils/request.validation';

export const issueOffer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await OfferService.createOffer(
      Number(req.user!.company_id),
      req.user!.id,
      issueOfferSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const acceptOffer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const result = await CandidateService.acceptOffer(
      candidate_id,
      String(req.params.offer_id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const rejectOffer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const { reason } = req.body;
    const result = await CandidateService.declineOffer(
      candidate_id,
      String(req.params.offer_id),
      reason,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getCandidateOffers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const result = await CandidateService.getCandidateOffers(
      candidate_id,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

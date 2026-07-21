import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { OfferService } from '../services/offer.service';
import { CandidateService } from '../services/candidate.service';
import { EmailService } from '../services/email.service';
import { issueOfferSchema } from '../utils/request.validation';

export const getCompanyOffers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await OfferService.getOffers(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

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

    // Send offer letter email to candidate
    try {
      await EmailService.sendOfferLetterEmail({
        candidateEmail: result.candidate.email,
        candidateName: `${result.candidate.first_name} ${result.candidate.last_name}`,
        positionTitle: result.application.vacancy.title,
        companyName: 'Adiu Communication Service PLC',
        salary: Number(result.salary),
        startDate: result.start_date.toISOString(),
        expiryDate: result.expiry_date.toISOString(),
        employmentType: undefined,
        allowances: undefined,
        offerNotes: result.offer_notes || undefined,
      });
    } catch (emailError) {
      // Log email error but don't fail the offer creation
      console.error('Failed to send offer email:', emailError);
    }

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

import fs from 'fs';
import path from 'path';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { RecruitmentService } from '../services/recruitment.service';
import { CloudinaryDocumentStorageService } from '../services/cloudinaryDocumentStorage.service';
import { GcsDocumentStorageService } from '../services/gcsDocumentStorage.service';
import { AppError } from '../utils/AppError';
import {
  createRequestSchema,
  hrReviewRequestSchema,
  rejectReasonSchema,
  updateRequestSchema,
} from '../utils/recruitment.validation';
import { CreateRequestDTO } from '../types/recruitment.types';

export const createRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedBody = createRequestSchema.parse(req.body);
    const request = await RecruitmentService.createRequest(
      req.user!.company_id,
      req.user!.id,
      validatedBody as CreateRequestDTO,
    );
    res.status(201).json({ status: 'success', data: request });
  } catch (error) {
    next(error);
  }
};

export const getRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requests = await RecruitmentService.getRequests(req.user!.company_id);
    res.status(200).json({ status: 'success', data: requests });
  } catch (error) {
    next(error);
  }
};

export const getRequestById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const request = await RecruitmentService.getRequestById(
      req.user!.company_id,
      String(req.params.requestId),
    );
    res.status(200).json({ status: 'success', data: request });
  } catch (error) {
    next(error);
  }
};

export const updateRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedBody = updateRequestSchema.parse(req.body);
    const request = await RecruitmentService.updateRequest(
      req.user!.company_id,
      String(req.params.requestId),
      req.user!.id,
      validatedBody as any,
    );
    res.status(200).json({ status: 'success', data: request });
  } catch (error) {
    next(error);
  }
};

export const deleteRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await RecruitmentService.deleteRequest(
      req.user!.company_id,
      String(req.params.requestId),
      req.user!.id,
    );
    res.status(200).json({ status: 'success', message: 'Request deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const hrReviewRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { action, notes } = hrReviewRequestSchema.parse(req.body);
    const request = await RecruitmentService.hrReviewRequest(
      req.user!.company_id,
      String(req.params.requestId),
      req.user!.id,
      action,
      notes,
    );
    res.status(200).json({ status: 'success', data: request });
  } catch (error) {
    next(error);
  }
};

export const rejectRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reason } = rejectReasonSchema.parse(req.body);
    const request = await RecruitmentService.rejectRequest(
      req.user!.company_id,
      String(req.params.requestId),
      req.user!.id,
      reason,
    );
    res.status(200).json({ status: 'success', data: request });
  } catch (error) {
    next(error);
  }
};
export const submitRecruitmentRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const request = await RecruitmentService.submitRecruitmentRequest(
      req.user!.company_id,
      String(req.params.requestId),
      req.user!.id,
    );

    res.status(200).json({
      status: 'success',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

export const approveRecruitmentRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requestId = String(req.params.requestId);
    await RecruitmentService.approveRecruitmentRequest(
      req.user!.company_id,
      requestId,
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: { id: requestId, status: 'APPROVED' } });
  } catch (error) {
    next(error);
  }
};

export const uploadSupportingDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      res.status(400).json({ status: 'error', message: 'No file uploaded' });
      return;
    }
    const requestId = String(req.params.requestId);
    const uploaded = await CloudinaryDocumentStorageService.uploadRecruitmentDocument(
      requestId,
      req.file,
    );
    const result = await RecruitmentService.uploadSupportingDocument(
      req.user!.company_id,
      requestId,
      uploaded.url,
      uploaded.name,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getSupportingDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requestId = String(req.params.requestId);
    const document = await RecruitmentService.getSupportingDocument(
      req.user!.company_id,
      requestId,
    );

    if (CloudinaryDocumentStorageService.isCloudinaryUri(document.url)) {
      const { stream, contentType } =
        await CloudinaryDocumentStorageService.getDocumentStream(document.url);

      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(document.name)}"`,
      );
      stream.on('error', next);
      stream.pipe(res);
      return;
    }

    if (GcsDocumentStorageService.isGcsUri(document.url)) {
      const { stream, contentType } =
        await GcsDocumentStorageService.getDocumentStream(document.url);

      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(document.name)}"`,
      );
      stream.on('error', next);
      stream.pipe(res);
      return;
    }

    if (document.url.startsWith('/uploads/')) {
      const fileName = path.basename(document.url);
      const filePath = path.resolve(__dirname, '../../uploads', fileName);

      if (!fs.existsSync(filePath)) {
        throw new AppError('Supporting document file not found.', 404);
      }

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(document.name)}"`,
      );
      res.sendFile(filePath);
      return;
    }

    throw new AppError('Unsupported supporting document location.', 400);
  } catch (error) {
    next(error);
  }
};













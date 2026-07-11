import { Request, Response, NextFunction } from 'express';
import {
  uploadDocument,
  getCandidateDocuments,
  deleteDocument,
  downloadDocument,
} from '../services/document.service';

export const upload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;

    if (!file) {
      throw new Error('File is required');
    }

    const candidateId = String(req.body.candidateId);
    const documentType = String(req.body.document_type || req.body.documentType || 'cv') as
      | 'cv'
      | 'photo'
      | 'id_documents';

    const result = await uploadDocument(candidateId, file, documentType);

    res.status(201).json({
      success: true,
      message: 'Document uploaded',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCandidateDocuments(String(req.params.candidateId));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const candidateId = String(req.body.candidateId || req.query.candidateId || '');
    const target = String(req.params.id);
    await deleteDocument(candidateId, target);

    res.status(200).json({
      success: true,
      message: 'Document deleted',
    });
  } catch (error) {
    next(error);
  }
};

export const download = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const candidateId = String(req.query.candidateId || req.body.candidateId || '');
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const docUrl = await downloadDocument(candidateId, id);

    return res.redirect(docUrl);
  } catch (error) {
    next(error);
  }
};

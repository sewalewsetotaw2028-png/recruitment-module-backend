import { Request, Response, NextFunction } from 'express';
import { CandidateService } from '../services/candidate.service';
import { AuthRequest } from '../middlewares/authMiddleware';
import { logger } from '../utils/logger';
import {
  applyVacancySchema,
  candidateLoginSchema,
  candidateProfileSchema,
  candidateRegisterSchema,
  educationSchema,
  educationUpdateSchema,
  experienceSchema,
  experienceUpdateSchema,
  offerResponseSchema,
  certificationSchema,
  certificationUpdateSchema,
  phoneSchema,
  phoneUpdateSchema,
  addressSchema,
  candidateChangePasswordSchema,
} from '../utils/request.validation';

export const registerCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = candidateRegisterSchema.parse(req.body);
    const registerData = {
      ...parsed,
      company_id:
        parsed.company_id !== undefined ? String(parsed.company_id) : undefined,
    };
    const result = await CandidateService.register(registerData);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const loginCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await CandidateService.login(
      candidateLoginSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    next(error);
  }
};

export const getVacancies = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const company_id = Number(req.params.company_id);
    const vacancies = await CandidateService.getPublishedVacancies(company_id, {
      keyword: req.query.keyword as string,
      department_id: req.query.department_id
        ? Number(req.query.department_id)
        : undefined,
      employment_type: req.query.employment_type as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.status(200).json({ status: 'success', data: vacancies });
  } catch (error) {
    next(error);
  }
};

/**
 * Same as getVacancies but reads company_id from the JWT token instead of the URL.
 * The frontend can call this without needing to pass the company_id in the URL,
 * which avoids issues where organizationId is not yet resolved in the Redux store.
 */
export const getVacanciesFromToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const company_id = Number(req.user!.company_id);
    const vacancies = await CandidateService.getPublishedVacancies(company_id, {
      keyword: req.query.keyword as string,
      department_id: req.query.department_id
        ? Number(req.query.department_id)
        : undefined,
      employment_type: req.query.employment_type as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.status(200).json({ status: 'success', data: vacancies });
  } catch (error) {
    next(error);
  }
};

export const getVacancyDetail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const vacancy_id = String(req.params.id);
    const detail = await CandidateService.getPublishedVacancyDetail(
      vacancy_id,
      candidate_id,
    );
    res.status(200).json({ status: 'success', data: detail });
  } catch (error) {
    next(error);
  }
};

export const apply = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const company_id = Number(req.user!.company_id);

    // Handle file upload for cover letter
    let coverLetterData: any = applyVacancySchema.parse(req.body);

    if (req.file && req.file.fieldname === 'cover_letter_file') {
      // Upload file and get URL
      const { CloudinaryService } =
        await import('../services/cloudinary.service');
      const uploadedUrl = await CloudinaryService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        'cover-letters',
        'raw'
      );
      coverLetterData = {
        ...coverLetterData,
        cover_letter_url: uploadedUrl,
        cover_letter_text: undefined,
      };
    } else if (coverLetterData.cover_letter) {
      // Text cover letter
      coverLetterData = {
        ...coverLetterData,
        cover_letter_text: coverLetterData.cover_letter,
        cover_letter_url: undefined,
      };
      delete coverLetterData.cover_letter;
    }

    const application = await CandidateService.submitApplication(
      candidate_id,
      company_id,
      coverLetterData,
    );
    res.status(201).json({ status: 'success', data: application });
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const candidate_id = req.user?.candidate_id || req.user!.id;
  logger.section('UPLOAD DOCUMENT — Controller');
  try {
    const company_id = Number(req.user!.company_id);

    if (!req.file) {
      logger.warn('uploadDocument', 'Request received but no file attached', {
        candidate_id,
      });
      return res
        .status(400)
        .json({ status: 'error', message: 'No file uploaded' });
    }

    const document_type = String(req.body.document_type || 'cv');
    logger.info('uploadDocument', 'Document upload request received', {
      candidate_id,
      company_id,
      document_type,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      sizeBytes: req.file.size,
      sizeMB: (req.file.size / 1024 / 1024).toFixed(2),
    });

    const doc = await CandidateService.uploadDocument(
      candidate_id,
      company_id,
      req.file,
      document_type,
    );

    logger.success(
      'uploadDocument',
      'Document upload complete — returning 201',
      {
        candidate_id,
        document_type,
        uploaded_url: (doc as any)?.uploaded_url,
      },
    );
    res.status(201).json({ status: 'success', data: doc });
  } catch (error) {
    logger.error(
      'uploadDocument',
      'Unhandled error in uploadDocument controller',
      error,
      { candidate_id },
    );
    next(error);
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const profile = await CandidateService.getProfile(candidate_id);
    res.status(200).json({ status: 'success', data: profile });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const updated = await CandidateService.updateProfile(
      candidate_id,
      candidateProfileSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const candidate_id = req.user?.candidate_id || req.user!.id;
  try {
    const result = await CandidateService.deleteAvatar(candidate_id);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const candidate_id = req.user?.candidate_id || req.user!.id;
  logger.section('UPLOAD AVATAR — Controller');
  try {
    if (!req.file) {
      logger.warn('uploadAvatar', 'No avatar file in request', {
        candidate_id,
      });
      return res
        .status(400)
        .json({ status: 'error', message: 'No file uploaded' });
    }
    logger.info('uploadAvatar', 'Avatar upload request received', {
      candidate_id,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      sizeBytes: req.file.size,
    });
    const result = await CandidateService.uploadAvatar(candidate_id, req.file);
    logger.success('uploadAvatar', 'Avatar upload complete', {
      candidate_id,
      photo_url: (result as any)?.photo_url,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    logger.error(
      'uploadAvatar',
      'Unhandled error in uploadAvatar controller',
      error,
      { candidate_id },
    );
    next(error);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const data = candidateChangePasswordSchema.parse(req.body);
    const result = await CandidateService.changePassword(candidate_id, data);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getProfileCompleteness = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const completeness =
      await CandidateService.getProfileCompleteness(candidate_id);
    res.status(200).json({ status: 'success', data: completeness });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const candidate_id = req.user?.candidate_id || req.user!.id;
  const documentId = String(req.query.documentId || req.body.documentId);
  logger.section('DELETE DOCUMENT — Controller');
  logger.info('deleteDocument', 'Delete request received', {
    candidate_id,
    documentId,
    source: req.query.documentId ? 'query' : 'body',
  });
  try {
    if (!documentId || documentId === 'undefined') {
      logger.warn(
        'deleteDocument',
        'documentId is missing or undefined in request',
        {
          query: req.query,
          body: req.body,
        },
      );
      return res
        .status(400)
        .json({ status: 'error', message: 'documentId is required' });
    }
    await CandidateService.deleteDocument(candidate_id, documentId);
    logger.success(
      'deleteDocument',
      'Document deleted successfully — returning 204',
      {
        candidate_id,
        documentId,
      },
    );
    res.status(204).send();
  } catch (error) {
    logger.error('deleteDocument', 'Failed to delete document', error, {
      candidate_id,
      documentId,
    });
    next(error);
  }
};

export const getApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const applications = await CandidateService.getApplications(candidate_id);
    res.status(200).json({ status: 'success', data: applications });
  } catch (error) {
    next(error);
  }
};

export const getScreeningApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const applications = await CandidateService.getScreeningApplications(
      String(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: applications });
  } catch (error) {
    next(error);
  }
};

export const getCompanyApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const applications = await CandidateService.getCompanyApplications(
      String(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: applications });
  } catch (error) {
    next(error);
  }
};

export const getShortlistedApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const applications = await CandidateService.getShortlistedApplications(
      String(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: applications });
  } catch (error) {
    next(error);
  }
};

export const getApplicationById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const application_id = String(req.params.id);
    const application = await CandidateService.getApplicationById(
      candidate_id,
      application_id,
    );
    res.status(200).json({ status: 'success', data: application });
  } catch (error) {
    next(error);
  }
};

export const getOffers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const offers = await CandidateService.getCandidateOffers(candidate_id);
    res.status(200).json({ status: 'success', data: offers });
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
    const offerId = String(req.params.offerId);
    const result = await CandidateService.acceptOffer(candidate_id, offerId);
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
    const offerId = String(req.params.offerId);
    const { reason } = offerResponseSchema.parse(req.body);
    const result = await CandidateService.declineOffer(
      candidate_id,
      offerId,
      reason,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getCandidateInterviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const interviews =
      await CandidateService.getCandidateInterviews(candidate_id);
    res.status(200).json({ status: 'success', data: interviews });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const notifications = await CandidateService.getNotifications(candidate_id);
    res.status(200).json({ status: 'success', data: notifications });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const notificationId = String(req.params.id);
    const result = await CandidateService.markNotificationRead(
      candidate_id,
      notificationId,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const result =
      await CandidateService.markAllNotificationsRead(candidate_id);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const addExperience = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const exp = await CandidateService.addExperience(
      candidate_id,
      experienceSchema.parse(req.body),
      req.file,
    );
    res.status(201).json({ status: 'success', data: exp });
  } catch (error) {
    next(error);
  }
};

export const getExperiences = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const exps = await CandidateService.getExperiences(candidate_id);
    res.status(200).json({ status: 'success', data: exps });
  } catch (error) {
    next(error);
  }
};

export const updateExperience = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const experienceId = String(req.params.experienceId);
    const exp = await CandidateService.updateExperience(
      candidate_id,
      experienceId,
      experienceUpdateSchema.parse(req.body),
      req.file,
    );
    res.status(200).json({ status: 'success', data: exp });
  } catch (error) {
    next(error);
  }
};

export const deleteExperience = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const experienceId = String(req.params.experienceId);
    await CandidateService.deleteExperience(candidate_id, experienceId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addEducation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    // FormData sends all values as strings; coerce graduation_year to number
    const parsedBody = {
      ...req.body,
      ...(req.body.graduation_year !== undefined && {
        graduation_year: Number(req.body.graduation_year),
      }),
    };
    const edu = await CandidateService.addEducation(
      candidate_id,
      educationSchema.parse(parsedBody),
      req.file,
    );
    res.status(201).json({ status: 'success', data: edu });
  } catch (error) {
    next(error);
  }
};

export const getEducations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const edus = await CandidateService.getEducations(candidate_id);
    res.status(200).json({ status: 'success', data: edus });
  } catch (error) {
    next(error);
  }
};

export const updateEducation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const educationId = String(req.params.educationId);
    const parsedBody = {
      ...req.body,
      ...(req.body.graduation_year !== undefined && {
        graduation_year: Number(req.body.graduation_year),
      }),
    };
    const edu = await CandidateService.updateEducation(
      candidate_id,
      educationId,
      educationUpdateSchema.parse(parsedBody),
      req.file,
    );
    res.status(200).json({ status: 'success', data: edu });
  } catch (error) {
    next(error);
  }
};

export const deleteEducation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const educationId = String(req.params.educationId);
    await CandidateService.deleteEducation(candidate_id, educationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const candidate_id = req.user?.candidate_id || req.user!.id;
  logger.info('getDocuments', 'Fetching documents for candidate', {
    candidate_id,
  });
  try {
    const docs = await CandidateService.getDocuments(candidate_id);
    if (!docs) {
      logger.warn('getDocuments', 'No document record found for candidate', {
        candidate_id,
      });
    } else {
      logger.success('getDocuments', 'Documents retrieved successfully', {
        candidate_id,
        cv_count: (docs as any)?.cv?.length ?? 0,
        photo_count: (docs as any)?.photo?.length ?? 0,
        id_documents_count: (docs as any)?.id_documents?.length ?? 0,
      });
    }
    res.status(200).json({ status: 'success', data: docs });
  } catch (error) {
    logger.error(
      'getDocuments',
      'Failed to fetch documents from database',
      error,
      { candidate_id },
    );
    next(error);
  }
};

export const addCertification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const cert = await CandidateService.addCertification(
      candidate_id,
      certificationSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: cert });
  } catch (error) {
    next(error);
  }
};

export const getCertifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const certs = await CandidateService.getCertifications(candidate_id);
    res.status(200).json({ status: 'success', data: certs });
  } catch (error) {
    next(error);
  }
};

export const updateCertification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const certificationId = String(req.params.certificationId);
    const cert = await CandidateService.updateCertification(
      candidate_id,
      certificationId,
      certificationUpdateSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: cert });
  } catch (error) {
    next(error);
  }
};

export const deleteCertification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const certificationId = String(req.params.certificationId);
    await CandidateService.deleteCertification(candidate_id, certificationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addPhone = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const company_id = Number(req.user!.company_id);
    const phone = await CandidateService.addPhone(
      candidate_id,
      company_id,
      phoneSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: phone });
  } catch (error) {
    next(error);
  }
};

export const getPhones = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const phones = await CandidateService.getPhones(candidate_id);
    res.status(200).json({ status: 'success', data: phones });
  } catch (error) {
    next(error);
  }
};

export const updatePhone = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const phoneId = String(req.params.phoneId);
    const phone = await CandidateService.updatePhone(
      candidate_id,
      phoneId,
      phoneUpdateSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: phone });
  } catch (error) {
    next(error);
  }
};

export const deletePhone = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const phoneId = String(req.params.phoneId);
    await CandidateService.deletePhone(candidate_id, phoneId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const company_id = Number(req.user!.company_id);
    const address = await CandidateService.addAddress(
      candidate_id,
      company_id,
      addressSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: address });
  } catch (error) {
    next(error);
  }
};

export const getAddresses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const addresses = await CandidateService.getAddresses(candidate_id);
    res.status(200).json({ status: 'success', data: addresses });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const addressId = String(req.params.addressId);
    const address = await CandidateService.updateAddress(
      candidate_id,
      addressId,
      addressSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: address });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const addressId = String(req.params.addressId);
    await CandidateService.deleteAddress(candidate_id, addressId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getTalentRosterStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const candidate_id = req.user?.candidate_id || req.user!.id;
    const status = await CandidateService.getTalentRosterStatus(candidate_id);
    res.status(200).json({ status: 'success', data: status });
  } catch (error) {
    next(error);
  }
};

export const getRecruitmentSources = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { ConfigService } = await import('../services/config.service');
    const sources = await ConfigService.getRecruitmentSources(
      Number(req.user!.company_id),
    );
    res.status(200).json({ status: 'success', data: sources });
  } catch (error) {
    next(error);
  }
};

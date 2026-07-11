import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { InterviewService } from '../services/interview.service';
import {
  createEvaluationSchema,
  createInterviewSchema,
  generateQuestionsSchema,
  recordEvaluationSchema,
  scheduleInterviewSchema,
  updateEvaluationSchema,
  updateInterviewSchema,
  updateStatusSchema,
  submitEvaluationSchema,
  updateEvaluationSubmissionSchema,
} from '../utils/request.validation';

export const updateStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await InterviewService.updateApplicationStatus(
      req.user!.company_id,
      updateStatusSchema.parse(req.body),
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const schedule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interview = await InterviewService.scheduleInterview(
      req.user!.company_id,
      scheduleInterviewSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: interview });
  } catch (error) {
    next(error);
  }
};

export const evaluate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await InterviewService.recordEvaluation(
      req.user!.company_id,
      recordEvaluationSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getOrgInterviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const list = await InterviewService.getInterviews(req.user!.company_id);
    res.status(200).json({ status: 'success', data: list });
  } catch (error) {
    next(error);
  }
};

export const getInterviewById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interview = await InterviewService.getInterviewById(
      req.user!.company_id,
      String(req.params.interview_id),
    );
    res.status(200).json({ status: 'success', data: interview });
  } catch (error) {
    next(error);
  }
};

export const createInterview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interview = await InterviewService.createInterview(
      req.user!.company_id,
      createInterviewSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: interview });
  } catch (error) {
    next(error);
  }
};

export const updateInterview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interview = await InterviewService.updateInterview(
      req.user!.company_id,
      String(req.params.interview_id),
      updateInterviewSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: interview });
  } catch (error) {
    next(error);
  }
};

export const cancelInterview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interview = await InterviewService.cancelInterview(
      req.user!.company_id,
      String(req.params.interview_id),
    );
    res.status(200).json({ status: 'success', data: interview });
  } catch (error) {
    next(error);
  }
};

export const getEvaluations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const list = await InterviewService.getEvaluations(
      req.user!.company_id,
      String(req.params.interview_id),
    );
    res.status(200).json({ status: 'success', data: list });
  } catch (error) {
    next(error);
  }
};

export const createEvaluation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const evaluation = await InterviewService.createEvaluation(
      req.user!.company_id,
      req.user!.id,
      createEvaluationSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: evaluation });
  } catch (error) {
    next(error);
  }
};

export const updateEvaluation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const evaluation = await InterviewService.updateEvaluation(
      req.user!.company_id,
      String(req.params.evaluationId),
      req.user!.id,
      updateEvaluationSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: evaluation });
  } catch (error) {
    next(error);
  }
};

export const getQuestionBank = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const questions = await InterviewService.getQuestionBank(req.user!.company_id);
    res.status(200).json({ status: 'success', data: questions });
  } catch (error) {
    next(error);
  }
};

export const generateQuestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const questions = await InterviewService.generateQuestionsForApplication(
      req.user!.company_id,
      generateQuestionsSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: questions });
  } catch (error) {
    next(error);
  }
};

/**
 * Prompt 3: Submit evaluation as panel member (POST /interviews/:interviewId/evaluations)
 * - Validates interview COMPLETED status
 * - Verifies user is panel member
 * - Prevents duplicate submissions
 * - Calculates weighted scores using template criteria
 */
export const submitEvaluation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const evaluation = await InterviewService.submitEvaluation(
      req.user!.company_id,
      String(req.params.interviewId),
      req.user!.id,
      submitEvaluationSchema.parse(req.body),
    );
    res.status(201).json({ status: 'success', data: evaluation });
  } catch (error) {
    next(error);
  }
};

/**
 * Prompt 3: Update submitted evaluation (PATCH /interviews/:interviewId/evaluations/:evaluationId)
 * - Verifies caller is original evaluator
 * - Re-validates interview still COMPLETED
 * - Checks HiringMinute not finalized
 * - Recalculates weighted scores
 */
export const updateEvaluationSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const evaluation = await InterviewService.updateEvaluationSubmission(
      req.user!.company_id,
      String(req.params.interviewId),
      String(req.params.evaluationId),
      req.user!.id,
      updateEvaluationSubmissionSchema.parse(req.body),
    );
    res.status(200).json({ status: 'success', data: evaluation });
  } catch (error) {
    next(error);
  }
};

/**
 * Prompt 4: Get all evaluations for a single interview with aggregates
 * GET /interviews/:interviewId/evaluations
 */
export const getInterviewEvaluationSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const summary = await InterviewService.getInterviewEvaluationSummary(
      req.user!.company_id,
      String(req.params.interviewId),
    );
    res.status(200).json({ status: 'success', data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * Prompt 4: Get candidate rankings for a vacancy based on evaluation scores
 * GET /vacancies/:vacancyId/evaluation-summary
 */
export const getVacancyEvaluationSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const summary = await InterviewService.getVacancyEvaluationSummary(
      req.user!.company_id,
      String(req.params.vacancy_id),
    );
    res.status(200).json({ status: 'success', data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * Prompt 9: Get all evaluations for a candidate application
 * GET /interviews/applications/:applicationId/evaluations
 */
export const getApplicationEvaluations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const evaluations = await InterviewService.getApplicationEvaluations(
      req.user!.company_id,
      String(req.params.applicationId),
    );
    res.status(200).json({ status: 'success', data: evaluations });
  } catch (error) {
    next(error);
  }
};

/**
 * Prompt 4: Get pending evaluations for the authenticated panel member
 * GET /my/pending-evaluations
 */
export const getPendingEvaluations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const pending = await InterviewService.getPendingEvaluations(
      req.user!.company_id,
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: pending });
  } catch (error) {
    next(error);
  }
};

import { Router } from 'express';
import {
  updateStatus,
  schedule,
  getOrgInterviews,
  getInterviewById,
  createInterview,
  updateInterview,
  cancelInterview,
  getEvaluations,
  getQuestionBank,
  generateQuestions,
  submitEvaluation,
  updateEvaluationSubmission,
  getInterviewEvaluationSummary,
  getApplicationEvaluations,
  getPendingEvaluations,
} from '../controllers/interview.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { PERMISSIONS } from '../config/rolePermissions';

const router = Router();

router.use(authenticate); // Only HR/Internal users

router.patch('/application-status', updateStatus);
router.get(
  '/list',
  authorize([
    PERMISSIONS.VIEW_INTERVIEWS,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.INTERVIEW_CREATE,
    PERMISSIONS.INTERVIEW_EVALUATE,
    PERMISSIONS.MY_INTERVIEW_READ,
    PERMISSIONS.MY_EVALUATION_READ,
  ]),
  getOrgInterviews,
);
router.get(
  '/question-bank',
  authorize([
    PERMISSIONS.VIEW_INTERVIEWS,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.INTERVIEW_CREATE,
    PERMISSIONS.INTERVIEW_EVALUATE,
  ]),
  getQuestionBank,
);
router.post(
  '/generate-questions',
  authorize(PERMISSIONS.SCHEDULE_INTERVIEW),
  generateQuestions,
);
router.post('/schedule', authorize(PERMISSIONS.SCHEDULE_INTERVIEW), schedule);

router.post('/', authorize(PERMISSIONS.CREATE_INTERVIEW), createInterview);
// Prompt 4: Pending evaluations for the authenticated panel member — must be
// registered BEFORE the /:interviewId param route or Express will treat "my"
// as an interview ID and the handler will never be reached.
router.get(
  '/my/pending-evaluations',
  authorize(PERMISSIONS.VIEW_EVALUATIONS),
  getPendingEvaluations,
);

router.get(
  '/:interview_id',
  authorize([
    PERMISSIONS.VIEW_INTERVIEWS,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.INTERVIEW_EVALUATE,
    PERMISSIONS.MY_INTERVIEW_READ,
  ]),
  getInterviewById,
);
router.put(
  '/:interview_id',
  authorize(PERMISSIONS.UPDATE_INTERVIEW),
  updateInterview,
);
router.post(
  '/:interview_id/cancel',
  authorize(PERMISSIONS.CANCEL_INTERVIEW),
  cancelInterview,
);
router.get(
  '/:interview_id/evaluations',
  authorize([
    PERMISSIONS.VIEW_EVALUATIONS,
    PERMISSIONS.INTERVIEW_EVALUATE,
    PERMISSIONS.MY_EVALUATION_READ,
  ]),
  getEvaluations,
);

// Prompt 3: Evaluation submission endpoints
router.post(
  '/:interviewId/evaluations',
  authorize(PERMISSIONS.INTERVIEW_EVALUATE),
  submitEvaluation,
);
router.patch(
  '/:interviewId/evaluations/:evaluationId',
  authorize(PERMISSIONS.INTERVIEW_EVALUATE),
  updateEvaluationSubmission,
);

// Prompt 4: Evaluation results & aggregation endpoints
router.get(
  '/:interviewId/evaluations-summary',
  authorize([
    PERMISSIONS.VIEW_EVALUATIONS,
    PERMISSIONS.INTERVIEW_EVALUATE,
    PERMISSIONS.HIRING_MINUTE_READ,
  ]),
  getInterviewEvaluationSummary,
);

// Prompt 9: Fetch candidate evaluations for detailed breakdown
router.get(
  '/applications/:applicationId/evaluations',
  authorize([
    PERMISSIONS.VIEW_EVALUATIONS,
    PERMISSIONS.HIRING_MINUTE_READ,
  ]),
  getApplicationEvaluations,
);

export default router;

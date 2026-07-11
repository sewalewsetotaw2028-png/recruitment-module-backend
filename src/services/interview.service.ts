import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import {
  UpdateApplicationStatusDTO,
  ScheduleInterviewDTO,
  SubmitEvaluationDTO,
  CreateInterviewDTO,
  UpdateInterviewDTO,
  CreateEvaluationDTO,
  UpdateEvaluationDTO,
} from '../types/interview.types';
import { sendNotification } from '../utils/notificationHelper';

const toApplicationStatus = (status: string) => {
  switch (status.toLowerCase()) {
    case 'submitted':
      return 'SUBMITTED';
    case 'screening':
    case 'under_screening':
      return 'UNDER_SCREENING';
    case 'shortlisted':
      return 'SHORTLISTED';
    case 'interview':
    case 'interview_scheduled':
      return 'INTERVIEW_SCHEDULED';
    case 'interview_completed':
      return 'INTERVIEW_COMPLETED';
    case 'under_evaluation':
    case 'evaluation':
      return 'UNDER_EVALUATION';
    case 'selected':
      return 'SELECTED';
    case 'offered':
    case 'offer_issued':
      return 'OFFER_ISSUED';
    case 'hired':
    case 'offer_accepted':
      return 'OFFER_ACCEPTED';
    case 'offer_declined':
      return 'OFFER_DECLINED';
    case 'rejected':
      return 'REJECTED';
    case 'moved_to_talent_roster':
      return 'MOVED_TO_TALENT_ROSTER';
    default:
      return status.toUpperCase();
  }
};

const toApplicationStage = (stage: string | undefined, status: string) => {
  const normalizedStage = String(stage ?? '').toLowerCase();
  if (normalizedStage.includes('screen')) return 'SCREENING';
  if (normalizedStage.includes('shortlist')) return 'SHORTLISTING';
  if (normalizedStage.includes('interview')) return 'INTERVIEW';
  if (normalizedStage.includes('evaluat')) return 'EVALUATION';
  if (normalizedStage.includes('offer')) return 'OFFER';
  if (normalizedStage.includes('onboard')) return 'ONBOARDING';
  if (normalizedStage.includes('reject') || normalizedStage.includes('close')) {
    return 'CLOSED';
  }

  switch (toApplicationStatus(status)) {
    case 'SHORTLISTED':
      return 'SHORTLISTING';
    case 'INTERVIEW_SCHEDULED':
    case 'INTERVIEW_COMPLETED':
      return 'INTERVIEW';
    case 'UNDER_EVALUATION':
    case 'SELECTED':
      return 'EVALUATION';
    case 'OFFER_ISSUED':
    case 'OFFER_ACCEPTED':
    case 'OFFER_DECLINED':
      return 'OFFER';
    case 'REJECTED':
    case 'MOVED_TO_TALENT_ROSTER':
      return 'CLOSED';
    default:
      return 'SCREENING';
  }
};

const toScreeningStatus = (status: string) => {
  switch (toApplicationStatus(status)) {
    case 'SHORTLISTED':
    case 'SELECTED':
    case 'OFFER_ISSUED':
    case 'OFFER_ACCEPTED':
      return 'QUALIFIED';
    case 'REJECTED':
    case 'OFFER_DECLINED':
    case 'MOVED_TO_TALENT_ROSTER':
      return 'NOT_QUALIFIED';
    case 'UNDER_SCREENING':
    case 'SUBMITTED':
      return 'HOLD_FOR_REVIEW';
    default:
      return 'PARTIALLY_QUALIFIED';
  }
};

const toInterviewMode = (type: string) => {
  switch (type.toLowerCase()) {
    case 'physical':
      return 'PHYSICAL' as const;
    case 'hybrid':
      return 'HYBRID' as const;
    default:
      return 'VIRTUAL' as const;
  }
};

const assertCompanyApplication = (
  app: { company_id: number } | null,
  company_id: string,
) => {
  if (!app || String(app.company_id) !== String(company_id)) {
    throw new AppError('Application not found', 404);
  }
};

const resolveInterviewCategoryId = async (
  companyId: number,
  categoryId?: string,
) => {
  if (categoryId) {
    const selected = await prisma.interviewCategory.findFirst({
      where: { id: categoryId, company_id: companyId, is_active: true },
      select: { id: true },
    });
    if (selected) return selected.id;
  }

  const defaultCategory = await prisma.interviewCategory.findFirst({
    where: { company_id: companyId, is_default: true, is_active: true },
    select: { id: true },
  });
  if (defaultCategory) return defaultCategory.id;

  const fallbackCategory = await prisma.interviewCategory.findFirst({
    where: { company_id: companyId, is_active: true },
    orderBy: { created_at: 'asc' },
    select: { id: true },
  });
  if (!fallbackCategory) {
    throw new AppError(
      'No interview category configured. Add one in Settings first.',
      400,
    );
  }
  return fallbackCategory.id;
};

const buildInterviewNumber = async (companyId: number) => {
  const count = await prisma.interview.count({
    where: { application: { company_id: companyId } },
  });
  return `INT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
};

const interviewInclude = {
  application: {
    include: {
      candidate: {
        select: { first_name: true, last_name: true, email: true },
      },
      vacancy: { select: { title: true, id: true, employment_type: true } },
    },
  },
  interview_panels: {
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          app_user_roles: {
            select: { role: { select: { slug: true } } },
          },
        },
      },
    },
  },
  interview_evaluations: true,
} as const;

export class InterviewService {
  // 1. Screening: Update Application Status (FR-26, FR-28)
  static async updateApplicationStatus(
    company_id: string,
    data: UpdateApplicationStatusDTO,
    actorUserId?: string,
  ) {
    const app = await prisma.application.findUnique({
      where: { id: data.application_id },
      include: {
        candidate: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        vacancy: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!app || String(app.company_id) !== String(company_id)) {
      throw new AppError('Application not found', 404);
    }

    const nextStatus = toApplicationStatus(data.status);
    const shouldAddToTalentRoster =
      Boolean(data.add_to_talent_roster) &&
      (nextStatus === 'REJECTED' || nextStatus === 'MOVED_TO_TALENT_ROSTER');
    const persistedStatus = shouldAddToTalentRoster
      ? 'MOVED_TO_TALENT_ROSTER'
      : nextStatus;
    const nextStage =
      persistedStatus === 'SHORTLISTED'
        ? 'SHORTLISTING'
        : persistedStatus === 'REJECTED' ||
            persistedStatus === 'MOVED_TO_TALENT_ROSTER'
          ? 'CLOSED'
          : toApplicationStage(data.current_stage, data.status);
    const note =
      data.notes?.trim() ||
      data.rejection_reason?.trim() ||
      undefined;

    if (shouldAddToTalentRoster && !actorUserId) {
      throw new AppError('Authenticated user is required to update roster.', 401);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const savedApplication = await tx.application.update({
        where: { id: data.application_id },
        data: {
          status: persistedStatus as any,
          current_stage: nextStage as any,
          rejection_reason:
            persistedStatus === 'REJECTED' ||
            persistedStatus === 'MOVED_TO_TALENT_ROSTER'
              ? data.rejection_reason?.trim() || app.rejection_reason
              : null,
          sourced_from_roster: shouldAddToTalentRoster ? true : app.sourced_from_roster,
        },
      });

      await tx.screeningLog.create({
        data: {
          vacancy_id: app.vacancy_id,
          candidate_id: app.candidate_id,
          status: toScreeningStatus(data.status) as any,
          reason: note,
          scores_json: data.scores_json as any,
          screening_criteria_json: data.screening_criteria_json as any,
          screened_by_user_id: actorUserId,
        },
      });

      await tx.applicationStageHistory.create({
        data: {
          application_id: app.id,
          from_stage: app.current_stage,
          to_stage: nextStage as any,
          changed_by_id: actorUserId,
          notes: note,
        },
      });

      if (persistedStatus === 'SHORTLISTED') {
        await tx.shortlistedCandidate.upsert({
          where: {
            vacancy_id_candidate_id: {
              vacancy_id: app.vacancy_id,
              candidate_id: app.candidate_id,
            },
          },
          update: {
            application_id: app.id,
            shortlisted_by_user_id: actorUserId,
            shortlisted_at: new Date(),
            notes: data.notes?.trim() || null,
          },
          create: {
            vacancy_id: app.vacancy_id,
            candidate_id: app.candidate_id,
            application_id: app.id,
            shortlisted_by_user_id: actorUserId,
            notes: data.notes?.trim(),
          },
        });
      } else {
        await tx.shortlistedCandidate.deleteMany({
          where: {
            vacancy_id: app.vacancy_id,
            candidate_id: app.candidate_id,
          },
        });
      }

      if (shouldAddToTalentRoster) {
        const rosterNotes = [data.rejection_reason?.trim(), note]
          .filter(Boolean)
          .join(' — ');
        const existingRosterEntry = await tx.talentRoster.findFirst({
          where: {
            company_id: Number(company_id),
            candidate_id: app.candidate_id,
            sourced_from_vacancy_id: app.vacancy_id,
          },
          select: { id: true },
        });

        if (existingRosterEntry) {
          await tx.talentRoster.update({
            where: { id: existingRosterEntry.id },
            data: {
              talent_category:
                data.future_fit_tag?.trim() || 'General Talent Pool',
              notes: rosterNotes || undefined,
              source_stage: 'SCREENING',
              status: 'ACTIVE',
            },
          });
        } else {
          await tx.talentRoster.create({
            data: {
              company_id: Number(company_id),
              candidate_id: app.candidate_id,
              talent_category:
                data.future_fit_tag?.trim() || 'General Talent Pool',
              sourced_from_vacancy_id: app.vacancy_id,
              notes: rosterNotes || undefined,
              added_by: actorUserId!,
              source_stage: 'SCREENING',
            },
          });
        }
      }

      return savedApplication;
    });

    if (persistedStatus === 'SHORTLISTED') {
      await sendNotification(
        company_id,
        app.candidate_id,
        'candidate',
        'candidate_shortlisted',
        `You have been shortlisted for ${app.vacancy.title}. Our team will contact you about the next steps soon.`,
      );
    } else if (
      persistedStatus === 'REJECTED' ||
      persistedStatus === 'MOVED_TO_TALENT_ROSTER'
    ) {
      await sendNotification(
        company_id,
        app.candidate_id,
        'candidate',
        'candidate_rejected',
        `Thank you for your interest in the ${app.vacancy.title} position. We will not be progressing your application further at this stage.`,
      );
    }

    return updated;
  }

  // 2. Interview Management: Schedule Round (FR-31, FR-33, FR-41, FR-75)
  static async scheduleInterview(
    company_id: string,
    data: ScheduleInterviewDTO,
  ) {
    return this.createInterview(company_id, {
      application_id: data.application_id,
      round: data.round,
      type: data.type,
      start_time: data.start_time,
      end_time: data.end_time,
      office_location: data.location,
      meeting_link: data.meeting_link,
    });
  }

  // 3. Interview Evaluation: Record Outcome (FR-40, FR-76)
  static async recordEvaluation(company_id: string, data: SubmitEvaluationDTO) {
    const interviewDetails = await prisma.interview.findUnique({
      where: { id: data.interview_id },
      include: {
        application: {
          include: {
            candidate: true,
            vacancy: true,
          },
        },
      },
    });

    if (!interviewDetails) throw new AppError('Interview not found', 404);
    assertCompanyApplication(interviewDetails.application, company_id);

    const application = interviewDetails.application;

    return await prisma.$transaction(async (tx) => {
      const updatedInterview = await tx.interview.update({
        where: { id: data.interview_id },
        data: { status: 'COMPLETED' },
      });

      const isPassed = data.status === 'passed';
      const newAppStatus = isPassed ? 'SELECTED' : 'REJECTED';
      const newStage = isPassed ? 'EVALUATION' : 'CLOSED';

      await tx.application.update({
        where: { id: application.id },
        data: {
          status: newAppStatus,
          current_stage: newStage,
        },
      });

      const message = isPassed
        ? `Congratulations! You have passed Round ${interviewDetails.round} for ${application.vacancy.title}.`
        : `Thank you for your interest in the ${application.vacancy.title} position. Unfortunately, we will not be moving forward with your application at this time.`;

      await sendNotification(
        company_id,
        application.candidate_id,
        'candidate',
        isPassed ? 'interview_passed' : 'regret_letter',
        message,
      );

      return updatedInterview;
    });
  }

  // 4. Reporting: List all interviews for the company (FR-34)
  static async getInterviews(company_id: string) {
    return await prisma.interview.findMany({
      where: {
        application: {
          company_id: parseInt(company_id, 10),
        },
      },
      include: interviewInclude,
      orderBy: { start_time: 'asc' },
    });
  }

  static async getInterviewById(company_id: string, interview_id: string) {
    const interview = await prisma.interview.findUnique({
      where: { id: interview_id },
      include: interviewInclude,
    });
    if (!interview || String(interview.application.company_id) !== String(company_id)) {
      throw new AppError('Interview not found', 404);
    }
    return interview;
  }

  static async createInterview(company_id: string, data: CreateInterviewDTO) {
    const app = await prisma.application.findUnique({
      where: { id: data.application_id },
      include: { vacancy: { select: { title: true } } },
    });
    assertCompanyApplication(app, company_id);

    const companyId = Number(company_id);
    const round = data.round ?? 1;
    const mode = toInterviewMode(data.type);
    const interviewCategoryId = await resolveInterviewCategoryId(
      companyId,
      data.interview_category_id,
    );

    // Validate panel member IDs exist
    if (data.panel_member_ids && data.panel_member_ids.length > 0) {
      const existingPanelMembers = await prisma.user.findMany({
        where: {
          id: { in: data.panel_member_ids },
          company_id: companyId,
        },
        select: { id: true },
      });
      if (existingPanelMembers.length !== data.panel_member_ids.length) {
        const foundIds = new Set(existingPanelMembers.map(u => u.id));
        const missingIds = data.panel_member_ids.filter(id => !foundIds.has(id));
        throw new AppError(
          `Panel members not found: ${missingIds.join(', ')}`,
          400,
        );
      }
    }

    let questionsJson = data.questions_json;
    if (!questionsJson) {
      const generated = await this.generateQuestionsForApplication(company_id, {
        application_id: data.application_id,
        interview_category_id: interviewCategoryId,
        limit: 5,
      });
      if (generated.length) {
        questionsJson = generated;
      }
    }

    const interview = await prisma.interview.create({
      data: {
        application_id: data.application_id,
        interview_number: await buildInterviewNumber(companyId),
        round,
        interview_category_id: interviewCategoryId,
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
        status: 'SCHEDULED',
        mode,
        meeting_link: data.meeting_link,
        office_location: data.office_location,
        google_maps_location: data.google_maps_location,
        in_office_start_time: data.in_office_start_time
          ? new Date(data.in_office_start_time)
          : undefined,
        in_office_end_time: data.in_office_end_time
          ? new Date(data.in_office_end_time)
          : undefined,
        remote_start_time: data.remote_start_time
          ? new Date(data.remote_start_time)
          : undefined,
        remote_end_time: data.remote_end_time
          ? new Date(data.remote_end_time)
          : undefined,
        questions_json: questionsJson as any,
        interview_panels: data.panel_member_ids?.length
          ? {
              create: data.panel_member_ids.map((panel_member_id) => ({
                panel_member_id,
              })),
            }
          : undefined,
      },
      include: interviewInclude,
    });

    await prisma.application.update({
      where: { id: data.application_id },
      data: {
        status: 'INTERVIEW_SCHEDULED',
        current_stage: 'INTERVIEW',
      },
    });

    await sendNotification(
      company_id,
      app!.candidate_id,
      'candidate',
      'interview_scheduled',
      `Your interview for ${app!.vacancy.title} is scheduled for ${data.start_time}`,
    );

    return interview;
  }

  // FR-35: Controlled rescheduling with audit reason
  static async updateInterview(
    company_id: string,
    interview_id: string,
    data: UpdateInterviewDTO,
  ) {
    const interview = await prisma.interview.findUnique({
      where: { id: interview_id },
      include: {
        application: { include: { vacancy: { select: { title: true } } } },
      },
    });
    if (!interview || String(interview.application.company_id) !== String(company_id)) {
      throw new AppError('Interview not found', 404);
    }

    const nextStart = data.start_time
      ? new Date(data.start_time)
      : interview.start_time;
    const nextEnd = data.end_time
      ? new Date(data.end_time)
      : interview.end_time;
    const isReschedule =
      nextStart.getTime() !== interview.start_time.getTime() ||
      nextEnd.getTime() !== interview.end_time.getTime();

    if (isReschedule && !data.rescheduled_reason?.trim()) {
      throw new AppError('Rescheduling requires a reason.', 400);
    }

    const updated = await prisma.interview.update({
      where: { id: interview_id },
      data: {
        round: data.round ?? interview.round,
        mode: data.type ? toInterviewMode(data.type) : interview.mode,
        start_time: nextStart,
        end_time: nextEnd,
        meeting_link: data.meeting_link ?? interview.meeting_link,
        office_location: data.office_location ?? interview.office_location,
        google_maps_location:
          data.google_maps_location ?? interview.google_maps_location,
        in_office_start_time: data.in_office_start_time
          ? new Date(data.in_office_start_time)
          : interview.in_office_start_time,
        in_office_end_time: data.in_office_end_time
          ? new Date(data.in_office_end_time)
          : interview.in_office_end_time,
        remote_start_time: data.remote_start_time
          ? new Date(data.remote_start_time)
          : interview.remote_start_time,
        remote_end_time: data.remote_end_time
          ? new Date(data.remote_end_time)
          : interview.remote_end_time,
        questions_json: (data.questions_json ?? interview.questions_json) as any,
        status: isReschedule ? 'RESCHEDULED' : interview.status,
        rescheduled_reason: isReschedule
          ? data.rescheduled_reason?.trim()
          : interview.rescheduled_reason,
      },
      include: interviewInclude,
    });

    if (isReschedule) {
      await sendNotification(
        company_id,
        interview.application.candidate_id,
        'candidate',
        'interview_rescheduled',
        `Your interview for ${interview.application.vacancy.title} has been rescheduled to ${nextStart.toISOString()}. Reason: ${data.rescheduled_reason}`,
      );
    }

    return updated;
  }

  static async cancelInterview(company_id: string, interview_id: string) {
    const interview = await prisma.interview.findUnique({
      where: { id: interview_id },
      include: { application: true },
    });
    if (!interview || String(interview.application.company_id) !== String(company_id)) {
      throw new AppError('Interview not found', 404);
    }
    return await prisma.interview.update({
      where: { id: interview_id },
      data: { status: 'CANCELLED' },
    });
  }

  static async getEvaluations(company_id: string, interview_id: string) {
    const interview = await prisma.interview.findUnique({
      where: { id: interview_id },
      include: { application: true },
    });
    if (!interview || String(interview.application.company_id) !== String(company_id)) {
      throw new AppError('Interview not found', 404);
    }
    return await prisma.interviewEvaluation.findMany({
      where: { interview_id },
      orderBy: { created_at: 'desc' },
    });
  }

  static async createEvaluation(
    company_id: string,
    evaluator_id: string,
    data: CreateEvaluationDTO,
  ) {
    const interview = await prisma.interview.findUnique({
      where: { id: data.interview_id },
      include: { application: true },
    });
    if (!interview || String(interview.application.company_id) !== String(company_id)) {
      throw new AppError('Interview not found', 404);
    }
    return await prisma.interviewEvaluation.create({
      data: {
        interview_id: data.interview_id,
        evaluator_id,
        overall_score: data.overall_score,
        comments: data.comments,
        questions_json: data.questions_json as any,
      },
    });
  }

  static async updateEvaluation(
    company_id: string,
    evaluationId: string,
    evaluator_id: string,
    data: UpdateEvaluationDTO,
  ) {
    const evaluation = await prisma.interviewEvaluation.findUnique({
      where: { id: evaluationId },
      include: { interview: { include: { application: true } } },
    });
    if (
      !evaluation ||
      String(evaluation.interview.application.company_id) !== String(company_id)
    ) {
      throw new AppError('Evaluation not found', 404);
    }
    if (evaluation.evaluator_id !== evaluator_id) {
      throw new AppError('Unauthorized', 403);
    }
    return await prisma.interviewEvaluation.update({
      where: { id: evaluationId },
      data: {
        overall_score: data.overall_score ?? evaluation.overall_score,
        comments: data.comments ?? evaluation.comments,
        questions_json: (data.questions_json ?? evaluation.questions_json) as any,
      },
    });
  }

  // FR-36 / FR-37: Question bank read + role-based generation
  static async getQuestionBank(company_id: string) {
    const banks = await prisma.interviewQuestionBank.findMany({
      where: { company_id: Number(company_id), is_active: true },
      include: {
        questions: { where: { is_active: true } },
        interview_category: { select: { name: true } },
      },
    });

    return banks.flatMap((bank) =>
      bank.questions.map((question) => ({
        id: question.id,
        questionText: question.question,
        jobRole: bank.title,
        grade: bank.job_grade ?? 'General',
        functionalArea: bank.interview_category?.name ?? 'General',
        category: bank.interview_category?.name ?? 'General',
      })),
    );
  }

  static async generateQuestionsForApplication(
    company_id: string,
    data: {
      application_id: string;
      interview_category_id?: string;
      limit?: number;
    },
  ) {
    const app = await prisma.application.findUnique({
      where: { id: data.application_id },
      include: { vacancy: { select: { title: true } } },
    });
    assertCompanyApplication(app, company_id);

    const companyId = Number(company_id);
    const categoryId = await resolveInterviewCategoryId(
      companyId,
      data.interview_category_id,
    );
    const limit = data.limit ?? 5;
    const vacancyTitle = app!.vacancy.title.toLowerCase();

    const questions = await prisma.interviewQuestion.findMany({
      where: {
        is_active: true,
        OR: [
          { interview_category_id: categoryId },
          { bank: { company_id: companyId, is_active: true } },
        ],
      },
      include: {
        bank: { select: { title: true, job_grade: true } },
        interview_category: { select: { name: true } },
      },
      take: Math.max(limit * 3, 15),
    });

    return questions
      .map((question) => {
        const bankTitle = question.bank.title.toLowerCase();
        const categoryName =
          question.interview_category?.name?.toLowerCase() ?? '';
        let score = 0;
        if (
          bankTitle.includes(vacancyTitle) ||
          vacancyTitle.includes(bankTitle)
        ) {
          score += 3;
        }
        if (
          categoryName &&
          (vacancyTitle.includes(categoryName.split(' ')[0]!) ||
            categoryName.includes(vacancyTitle.split(' ')[0]!))
        ) {
          score += 2;
        }
        if (question.bank.job_grade) score += 1;
        return {
          id: question.id,
          question: question.question,
          category: question.interview_category?.name ?? 'General',
          job_grade: question.bank.job_grade,
          bank_title: question.bank.title,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score: _score, ...rest }) => rest);
  }

  /**
   * Prompt 3: Submit evaluation with weighted score calculation
   * - Validates interview is COMPLETED, EVALUATION_PENDING, or FINALIZED
   * - Prevents duplicate submissions by same evaluator
   * - Retrieves active evaluation template by interview category
   * - Maps provided scores to template criteria
   * - Calculates weighted overall_score: sum(score_i * weight_i / 100)
   * - Persists evaluation with scores_json and recommendation
   */
  static async submitEvaluation(
    company_id: string,
    interview_id: string,
    evaluator_id: string,
    payload: {
      scores: Array<{
        criterion_id?: string;
        criterion_name?: string;
        score: number;
      }>;
      comments?: string;
      recommendation:
        | 'STRONGLY_RECOMMEND'
        | 'RECOMMEND'
        | 'HOLD'
        | 'NEUTRAL'
        | 'DO_NOT_RECOMMEND';
    },
  ) {
    // 1. Fetch interview and validate status
    const interview = await prisma.interview.findUnique({
      where: { id: interview_id },
      include: {
        application: true,
        interview_panels: true,
        interview_category: true,
      },
    });

    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    if (String(interview.application.company_id) !== String(company_id)) {
      throw new AppError('Unauthorized', 403);
    }

    // COMPLETED, EVALUATION_PENDING, and FINALIZED are all valid states for submission.
    // FINALIZED means all panel members have submitted; latecomers can still add theirs.
    const evaluableStatuses = ['COMPLETED', 'EVALUATION_PENDING', 'FINALIZED'];
    if (!evaluableStatuses.includes(interview.status)) {
      throw new AppError(
        `Interview must be completed to submit evaluation. Current status: ${interview.status}`,
        400,
      );
    }

    // 2. Verify evaluator is panel member
    const isPanelMember = interview.interview_panels.some(
      (panel) => panel.panel_member_id === evaluator_id,
    );

    if (!isPanelMember) {
      throw new AppError('Only panel members can submit evaluations', 403);
    }

    // 3. Check for duplicate submission
    const existingEvaluation = await prisma.interviewEvaluation.findFirst({
      where: {
        interview_id,
        evaluator_id,
      },
    });

    if (existingEvaluation) {
      throw new AppError(
        'You have already submitted an evaluation for this interview',
        409,
      );
    }

    // 4. Resolve active evaluation template (by category or fallback to Standard)
    const template = await prisma.interviewEvaluationTemplate.findFirst({
      where: {
        company_id: Number(company_id),
        ...(interview.interview_category_id
          ? { interview_category_id: interview.interview_category_id }
          : { interview_category_id: null }),
      },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      throw new AppError(
        'No evaluation template found for this interview category',
        400,
      );
    }

    // 5. Map scores to criteria and validate
    const scoresMap = new Map<string, number>();
    const criteriaMap = new Map<string, (typeof template.criteria)[0]>();

    for (const criterion of template.criteria) {
      criteriaMap.set(criterion.id, criterion);
      criteriaMap.set(criterion.name, criterion);
    }

    for (const score of payload.scores) {
      const criteriaKey = score.criterion_id || score.criterion_name || (score as any).name;
      const criterion = criteriaMap.get(criteriaKey!);

      if (!criterion) {
        throw new AppError(`Criterion not found: ${criteriaKey}`, 400);
      }

      if (score.score < 1 || score.score > criterion.max_score) {
        throw new AppError(
          `Score for "${criterion.name}" must be between 1 and ${criterion.max_score}`,
          400,
        );
      }

      scoresMap.set(criterion.id, score.score);
    }

    // 6. Validate all criteria have scores
    for (const criterion of template.criteria) {
      if (!scoresMap.has(criterion.id)) {
        throw new AppError(
          `Missing score for criterion: ${criterion.name}`,
          400,
        );
      }
    }

    // 7. Calculate weighted overall_score
    let overallScore = 0;
    for (const criterion of template.criteria) {
      const score = scoresMap.get(criterion.id)!;
      overallScore += (score * Number(criterion.weight)) / 100;
    }
    overallScore = Math.round(overallScore * 100) / 100; // Round to 2 decimals

    // 8. Create scores_json object
    const scoresJson = template.criteria.map((criterion) => ({
      criterion_id: criterion.id,
      criterion_name: criterion.name,
      score: scoresMap.get(criterion.id),
      weight: criterion.weight,
      weighted_score:
        (scoresMap.get(criterion.id)! * Number(criterion.weight)) / 100,
    }));

    // 9. Persist evaluation
    const evaluation = await prisma.interviewEvaluation.create({
      data: {
        interview_id,
        evaluator_id,
        overall_score: Math.round(overallScore),
        scores_json: scoresJson,
        comments: payload.comments,
        recommendation: payload.recommendation,
        interview_category_id: interview.interview_category_id,
        evaluation_template_id: template.id,
      },
    });

    return evaluation;
  }

  /**
   * Prompt 3: Update submitted evaluation
   * - Verifies caller is original evaluator
   * - Re-validates interview still COMPLETED
   * - Checks HiringMinute not finalized
   * - Recalculates weighted score with new criteria scores
   */
  static async updateEvaluationSubmission(
    company_id: string,
    interview_id: string,
    evaluation_id: string,
    evaluator_id: string,
    payload: {
      scores?: Array<{
        criterion_id?: string;
        criterion_name?: string;
        score: number;
      }>;
      comments?: string;
      recommendation?:
        | 'STRONGLY_RECOMMEND'
        | 'RECOMMEND'
        | 'HOLD'
        | 'NEUTRAL'
        | 'DO_NOT_RECOMMEND';
    },
  ) {
    // 1. Fetch evaluation and validate ownership
    const evaluation = await prisma.interviewEvaluation.findUnique({
      where: { id: evaluation_id },
      include: {
        interview: {
          include: {
            application: true,
            interview_category: true,
          },
        },
      },
    });

    if (!evaluation) {
      throw new AppError('Evaluation not found', 404);
    }

    if (evaluation.evaluator_id !== evaluator_id) {
      throw new AppError('You can only update your own evaluation', 403);
    }

    if (String(evaluation.interview.application.company_id) !== String(company_id)) {
      throw new AppError('Unauthorized', 403);
    }

    // 2. Verify interview is still in an evaluable state
    const evaluableStatuses = ['COMPLETED', 'EVALUATION_PENDING', 'FINALIZED'];
    if (!evaluableStatuses.includes(evaluation.interview.status)) {
      throw new AppError(
        'Cannot update evaluation after interview status changed',
        400,
      );
    }

    // 3. Check HiringMinute not finalized
    const hiringMinute = await prisma.hiringMinute.findFirst({
      where: {
        vacancy_id: evaluation.interview.application.vacancy_id,
      },
    });

    if (hiringMinute && hiringMinute.final_decision !== 'PENDING') {
      throw new AppError(
        'Cannot update evaluation after hiring decision finalized',
        400,
      );
    }

    // 4. Get current template (same logic as submitEvaluation)
    const template = await prisma.interviewEvaluationTemplate.findFirst({
      where: {
        company_id: Number(company_id),
        ...(evaluation.interview.interview_category_id
          ? { interview_category_id: evaluation.interview.interview_category_id }
          : { interview_category_id: null }),
      },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      throw new AppError('No evaluation template found', 400);
    }

    // 5. Use provided scores or fallback to existing
    let updateData: any = {};

    if (payload.scores) {
      // Validate and map new scores
      const scoresMap = new Map<string, number>();
      const criteriaMap = new Map<string, (typeof template.criteria)[0]>();

      for (const criterion of template.criteria) {
        criteriaMap.set(criterion.id, criterion);
        criteriaMap.set(criterion.name, criterion);
      }

      for (const score of payload.scores) {
        const criteriaKey = score.criterion_id || score.criterion_name || (score as any).name;
        const criterion = criteriaMap.get(criteriaKey!);

        if (!criterion) {
          throw new AppError(`Criterion not found: ${criteriaKey}`, 400);
        }

        if (score.score < 1 || score.score > criterion.max_score) {
          throw new AppError(
            `Score for "${criterion.name}" must be between 1 and ${criterion.max_score}`,
            400,
          );
        }

        scoresMap.set(criterion.id, score.score);
      }

      // Validate all criteria have scores
      for (const criterion of template.criteria) {
        if (!scoresMap.has(criterion.id)) {
          throw new AppError(
            `Missing score for criterion: ${criterion.name}`,
            400,
          );
        }
      }

      // Calculate new weighted overall_score
      let overallScore = 0;
      for (const criterion of template.criteria) {
        const score = scoresMap.get(criterion.id)!;
        overallScore += (score * Number(criterion.weight)) / 100;
      }
      overallScore = Math.round(overallScore * 100) / 100;

      const scoresJson = template.criteria.map((criterion) => ({
        criterion_id: criterion.id,
        criterion_name: criterion.name,
        score: scoresMap.get(criterion.id),
        weight: criterion.weight,
        weighted_score:
          (scoresMap.get(criterion.id)! * Number(criterion.weight)) / 100,
      }));

      updateData.overall_score = Math.round(overallScore);
      updateData.scores_json = scoresJson;
    }

    if (payload.comments !== undefined) {
      updateData.comments = payload.comments;
    }

    if (payload.recommendation !== undefined) {
      updateData.recommendation = payload.recommendation;
    }

    updateData.updated_at = new Date();

    // 6. Persist updates
    const updatedEvaluation = await prisma.interviewEvaluation.update({
      where: { id: evaluation_id },
      data: updateData,
    });

    return updatedEvaluation;
  }

  /**
   * Prompt 4: Get all evaluations for a single interview with aggregates
   * Returns interview details + evaluation list + completion status
   */
  static async getInterviewEvaluationSummary(
    company_id: string,
    interview_id: string,
  ) {
    // 1. Fetch interview with all details
    const interview = await prisma.interview.findUnique({
      where: { id: interview_id },
      include: {
        application: {
          include: {
            candidate: true,
            vacancy: true,
          },
        },
        interview_category: true,
        interview_panels: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
        interview_evaluations: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    if (interview.application.company_id !== parseInt(company_id)) {
      throw new AppError('Unauthorized', 403);
    }

    // 2. Prepare interview summary
    const interviewSummary = {
      id: interview.id,
      candidate_name: `${interview.application.candidate.first_name} ${interview.application.candidate.last_name}`,
      candidate_email: interview.application.candidate.email,
      vacancy_title: interview.application.vacancy.title,
      category_name: interview.interview_category.name,
      interview_date: interview.start_time,
      interview_round: interview.round,
    };

    // 3. Prepare evaluations list with evaluator details
    const evaluations = interview.interview_evaluations.map((evaluation) => ({
      id: evaluation.id,
      evaluator_id: evaluation.evaluator_id,
      evaluator_name: `${evaluation.user.first_name} ${evaluation.user.last_name}`,
      evaluator_email: evaluation.user.email,
      overall_score: evaluation.overall_score,
      recommendation: evaluation.recommendation,
      scores_json: evaluation.scores_json,
      comments: evaluation.comments,
      created_at: evaluation.created_at,
    }));

    // 4. Calculate aggregates
    const panelCount = interview.interview_panels.length;
    const evaluationCount = interview.interview_evaluations.length;
    const pendingCount = panelCount - evaluationCount;

    let avgScore = 0;
    if (evaluationCount > 0) {
      const totalScore = interview.interview_evaluations.reduce(
        (sum, evaluation) => sum + evaluation.overall_score,
        0,
      );
      avgScore = Math.round((totalScore / evaluationCount) * 100) / 100;
    }

    // Count recommendations
    const recommendationCounts = interview.interview_evaluations.reduce(
      (acc, evaluation) => {
        const rec = evaluation.recommendation || 'NOT_PROVIDED';
        acc[rec] = (acc[rec] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 5. Return complete summary
    return {
      interview: interviewSummary,
      evaluations,
      aggregates: {
        average_score: avgScore,
        total_panelists: panelCount,
        evaluations_submitted: evaluationCount,
        evaluations_pending: pendingCount,
        all_evaluated: pendingCount === 0,
        recommendation_counts: recommendationCounts,
      },
    };
  }

  /**
   * Prompt 4: Get candidate rankings for a vacancy based on evaluation scores
   * Returns candidates with at least one evaluation, ordered by aggregate score descending
   */
  static async getVacancyEvaluationSummary(
    company_id: string,
    vacancy_id: string,
  ) {
    // 1. Verify vacancy exists and belongs to company
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
      select: { company_id: true },
    });

    if (!vacancy || vacancy.company_id !== parseInt(company_id)) {
      throw new AppError('Vacancy not found or unauthorized', 404);
    }

    // 2. Get all applications for this vacancy
    const applications = await prisma.application.findMany({
      where: { vacancy_id: vacancy_id },
      include: {
        candidate: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    // 3. For each application, fetch all evaluations and interview details
    const candidateRankings = [];

    for (const app of applications) {
      // Get all interviews for this application
      const interviews = await prisma.interview.findMany({
        where: { application_id: app.id },
        include: {
          interview_category: true,
          interview_evaluations: true,
          interview_panels: true,
        },
      });

      // Skip if no interviews
      if (interviews.length === 0) continue;

      // Get all evaluations across all interviews for this application
      const allEvaluations = interviews.flatMap((i) => i.interview_evaluations);

      // Skip if no evaluations
      if (allEvaluations.length === 0) continue;

      // Calculate metrics
      const completedInterviewCount = interviews.filter(
        (i) => i.status === 'COMPLETED',
      ).length;

      const fullyEvaluatedInterviews = interviews.filter((i) => {
        const panelCount = i.interview_panels.length;
        const evalCount = i.interview_evaluations.length;
        return panelCount === evalCount && panelCount > 0;
      }).length;

      // Aggregate score across all evaluations
      const totalScore = allEvaluations.reduce(
        (sum, evaluation) => sum + evaluation.overall_score,
        0,
      );
      const aggregateScore =
        Math.round((totalScore / allEvaluations.length) * 100) / 100;

      // Breakdown per interview round/category
      const breakdownPerRound: Record<
        string,
        { round: number; avg_score: number }
      > = {};
      for (const interview of interviews) {
        const categoryKey = interview.interview_category.name;
        if (interview.interview_evaluations.length > 0) {
          const categoryTotal = interview.interview_evaluations.reduce(
            (sum, evaluation) => sum + evaluation.overall_score,
            0,
          );
          breakdownPerRound[categoryKey] = {
            round: interview.round,
            avg_score:
              Math.round(
                (categoryTotal / interview.interview_evaluations.length) * 100,
              ) / 100,
          };
        }
      }

      // Recommendation counts
      const recommendationCounts = allEvaluations.reduce(
        (acc, evaluation) => {
          const rec = evaluation.recommendation || 'NOT_PROVIDED';
          acc[rec] = (acc[rec] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Map category breakdown to format expected by frontend
      const categoryBreakdown: Record<string, number> = {};
      for (const [catName, details] of Object.entries(breakdownPerRound)) {
        categoryBreakdown[catName] = (details as any).avg_score;
      }

      const totalPanelMembers = interviews.reduce(
        (sum, i) => sum + i.interview_panels.length,
        0,
      );

      candidateRankings.push({
        // Backend keys
        application_id: app.id,
        candidate_name: `${app.candidate.first_name} ${app.candidate.last_name}`,
        candidate_email: app.candidate.email,
        application_status: app.status,
        completed_interviews: completedInterviewCount,
        fully_evaluated_interviews: fullyEvaluatedInterviews,
        aggregate_score: aggregateScore,
        breakdown_per_round: breakdownPerRound,
        recommendation_counts: recommendationCounts,

        // Frontend keys
        candidate_id: app.candidate.id,
        category_breakdown: categoryBreakdown,
        panel_recommendations: recommendationCounts,
        evaluation_count: allEvaluations.length,
        total_evaluators: totalPanelMembers,
      });
    }

    // 4. Sort by aggregate score descending
    candidateRankings.sort((a, b) => b.aggregate_score - a.aggregate_score);

    return {
      vacancy_id,
      total_candidates_evaluated: candidateRankings.length,
      candidates: candidateRankings,
      rankings: candidateRankings,
    };
  }

  /**
   * Prompt 4: Get pending evaluations for the authenticated panel member
   * Returns all COMPLETED interviews where user is a panelist and hasn't submitted evaluation
   */
  static async getPendingEvaluations(company_id: string, user_id: string) {
    // 1. Find all interviews where user is a panel member
    const panelAssignments = await prisma.interviewPanel.findMany({
      where: { panel_member_id: user_id },
      include: {
        interview: {
          include: {
            interview_category: true,
            application: {
              include: {
                candidate: true,
                vacancy: true,
              },
            },
            interview_evaluations: {
              select: { evaluator_id: true },
            },
          },
        },
      },
    });

    // 2. Filter for completed-state interviews without user's evaluation.
    // COMPLETED, EVALUATION_PENDING, and FINALIZED are all states where the
    // interview is done and evaluations can still be submitted.
    const evaluableStatuses = ['COMPLETED', 'EVALUATION_PENDING', 'FINALIZED'];
    const pending = panelAssignments
      .filter((assignment) => {
        const interview = assignment.interview;
        if (!evaluableStatuses.includes(interview.status)) return false;
        const hasUserEvaluated = interview.interview_evaluations.some(
          (evaluation) => evaluation.evaluator_id === user_id,
        );
        return !hasUserEvaluated;
      })
      .map((assignment) => {
        const interview = assignment.interview;
        return {
          interview_id: interview.id,
          interview_date: interview.start_time,
          interview_round: interview.round,
          interview_category: interview.interview_category.name,
          vacancy_title: interview.application.vacancy.title,
          candidate_name: `${interview.application.candidate.first_name} ${interview.application.candidate.last_name}`,
          candidate_email: interview.application.candidate.email,
        };
      });

    return pending;
  }

  /**
   * Prompt 9: Get all evaluations for a candidate application
   * Returns detailed evaluation data for all interviews of a candidate
   */
  static async getApplicationEvaluations(
    company_id: string,
    application_id: string,
  ) {
    // 1. Verify application exists and belongs to company
    const application = await prisma.application.findUnique({
      where: { id: application_id },
      select: { company_id: true },
    });

    if (!application || application.company_id !== parseInt(company_id)) {
      throw new AppError('Application not found', 404);
    }

    // 2. Fetch all interviews for this application with evaluations
    const interviews = await prisma.interview.findMany({
      where: { application_id },
      include: {
        interview_category: true,
        interview_evaluations: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // 3. Map to evaluation detail format
    const evaluations: any[] = [];
    for (const interview of interviews) {
      for (const evaluation of interview.interview_evaluations) {
        evaluations.push({
          interview_id: interview.id,
          interview_category: interview.interview_category.name,
          interview_date: interview.start_time,
          evaluator_name: `${evaluation.user.first_name} ${evaluation.user.last_name}`,
          evaluator_email: evaluation.user.email,
          overall_score: evaluation.overall_score,
          recommendation: evaluation.recommendation,
          scores_json: evaluation.scores_json,
          comments: evaluation.comments,
          created_at: evaluation.created_at,
        });
      }
    }

    return evaluations;
  }
}

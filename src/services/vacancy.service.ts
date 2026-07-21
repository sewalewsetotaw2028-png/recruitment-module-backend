import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { CreateVacancyDTO } from '../types/recruitment.types';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import {
  notifyVacancyCreated,
  notifyVacancyPublished,
} from '../utils/notificationWiring';

const assertCompanyRecord = (
  record: { company_id: number | string } | null,
  company_id: string | number,
): void => {
  if (!record || String(record.company_id) !== String(company_id)) {
    throw new AppError('Not found or unauthorized', 404);
  }
};

const toEmploymentType = (value?: string) => {
  const employmentType = String(value ?? 'full_time').toUpperCase();
  return employmentType === 'CONTRACTOR' ? 'CONTRACT' : employmentType;
};

const vacancySelect = {
  id: true,
  company_id: true,
  recruitment_request_id: true,
  title: true,
  department_id: true,
  location: true,
  employment_type: true,
  status: true,
  open_positions: true,
  description: true,
  responsibilities: true,
  requirements: true,
  required_qualifications: true,
  required_experience: true,
  created_at: true,
  updated_at: true,
  posted_at: true,
  posting_status: true,
  vacancy_number: true,
  opening_date: true,
  closing_date: true,
  job_grade: true,
  business_unit: true,
  approved_at: true,
  closed_at: true,
  filled_at: true,
  job_description: {
    select: {
      id: true,
      title: true,
      summary: true,
      responsibilities: true,
      requirements: true,
      qualifications: true,
      benefits: true,
      employment_terms: true,
      skills: true,
      experience_required: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  recruitment_request: {
    select: {
      id: true,
      workforce_plan_item: {
        select: {
          workforce_plan_id: true,
          workforce_plan: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  },
} as const;

const HOLD_ACTIVITY_ACTION = 'vacancy_hold_context';
const ACTIVE_SELECTION_STATUSES = [
  'SELECTED',
  'OFFER_ISSUED',
  'OFFER_ACCEPTED',
] as const;
const REVERSIBLE_SELECTION_STATUSES = [
  ...ACTIVE_SELECTION_STATUSES,
  'OFFER_DECLINED',
] as const;
const AUTO_SELECTION_REJECTION_REASON =
  'Another candidate was selected for this vacancy';

const parseOptionalDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid datetime value: ${value}`, 400);
  }
  return parsed;
};

const getApplicationEvaluationSnapshot = async (
  tx: any,
  applicationId: string,
) => {
  const interviews = await tx.interview.findMany({
    where: {
      application_id: applicationId,
    },
    include: {
      interview_category: {
        select: {
          id: true,
          name: true,
        },
      },
      interview_evaluations: true,
    },
    orderBy: {
      start_time: 'asc',
    },
  });

  let aggregateScore = 0;
  let evaluationCount = 0;
  const evaluationSummary: Record<
    string,
    {
      category: string;
      scores: number[];
      avg: number;
    }
  > = {};

  for (const interview of interviews) {
    for (const evaluation of interview.interview_evaluations) {
      evaluationCount++;
      aggregateScore += Number(evaluation.overall_score || 0);

      const categoryKey =
        interview.interview_category?.id ||
        interview.interview_category_id ||
        'unknown';
      if (!evaluationSummary[categoryKey]) {
        evaluationSummary[categoryKey] = {
          category: interview.interview_category?.name || 'Unknown',
          scores: [],
          avg: 0,
        };
      }
      evaluationSummary[categoryKey].scores.push(
        Number(evaluation.overall_score || 0),
      );
    }
  }

  if (evaluationCount > 0) {
    aggregateScore = Math.round((aggregateScore / evaluationCount) * 100) / 100;
  }

  for (const key in evaluationSummary) {
    const scores = evaluationSummary[key].scores;
    evaluationSummary[key].avg =
      Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
      100;
  }

  return {
    interviews,
    aggregateScore,
    evaluationSummary,
    firstInterviewDate: interviews[0]?.start_time ?? null,
  };
};

const getVacancySelectionMetrics = async (tx: any, vacancyId: string) => {
  const applications = await tx.application.findMany({
    where: { vacancy_id: vacancyId },
    include: {
      candidate: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
      interviews: {
        include: {
          interview_evaluations: true,
        },
      },
    },
    orderBy: {
      submitted_at: 'asc',
    },
  });

  const rejectedCandidates = applications
    .filter((application: any) => application.status === 'REJECTED')
    .map((application: any) => ({
      application_id: application.id,
      candidate_id: application.candidate_id,
      candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`.trim(),
      candidate_email: application.candidate.email,
      rejection_reason: application.rejection_reason,
      roster_added: false,
      regret_sent_at: null,
    }));

  const activeSelectedCount = applications.filter((application: any) =>
    ACTIVE_SELECTION_STATUSES.includes(application.status as (typeof ACTIVE_SELECTION_STATUSES)[number]),
  ).length;

  const totalInterviewed = applications.filter((application: any) =>
    application.interviews.some(
      (interview: any) => interview.status === 'COMPLETED',
    ),
  ).length;

  return {
    totalApplications: applications.length,
    totalScreened: applications.filter((application: any) =>
      application.status !== 'SUBMITTED',
    ).length,
    totalShortlisted: applications.filter((application: any) =>
      [
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW_COMPLETED',
        'UNDER_EVALUATION',
        ...REVERSIBLE_SELECTION_STATUSES,
      ].includes(application.status),
    ).length,
    totalInterviewed,
    activeSelectedCount,
    rejectedCandidates,
  };
};

const getStoredHoldStatus = async (
  company_id: string | number,
  vacancy_id: string,
): Promise<string | undefined> => {
  const log = await prisma.activityLog.findFirst({
    where: {
      company_id: Number(company_id),
      entity_type: 'Vacancy',
      entity_id: vacancy_id,
      action: HOLD_ACTIVITY_ACTION,
    },
    orderBy: { created_at: 'desc' },
  });

  if (
    !log?.changes ||
    typeof log.changes !== 'object' ||
    Array.isArray(log.changes)
  ) {
    return undefined;
  }

  const previousStatus = (log.changes as Record<string, unknown>)
    .previousStatus;
  return typeof previousStatus === 'string' ? previousStatus : undefined;
};

const getResumeStatus = async (
  company_id: string | number,
  vacancy_id: string,
  posting_status?: string | null,
): Promise<'DRAFT' | 'OPEN' | 'IN_PROGRESS'> => {
  const previousStatus = await getStoredHoldStatus(company_id, vacancy_id);

  if (previousStatus === 'IN_PROGRESS') {
    return 'IN_PROGRESS';
  }

  if (previousStatus === 'OPEN') {
    return 'OPEN';
  }

  if (previousStatus === 'DRAFT') {
    return 'DRAFT';
  }

  return posting_status === 'PUBLISHED' ? 'OPEN' : 'DRAFT';
};

export class VacancyService {
  static async getVacancies(company_id: string | number) {
    return await prisma.vacancy.findMany({
      where: { company_id: Number(company_id) },
      select: vacancySelect,
      orderBy: { created_at: 'desc' },
    });
  }

  static async getVacancyById(company_id: string | number, vacancy_id: string) {
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
      select: vacancySelect,
    });
    assertCompanyRecord(vacancy, company_id);
    return vacancy;
  }

  static async createVacancy(
    company_id: string | number,
    data: CreateVacancyDTO,
  ) {
    const request = await prisma.recruitmentRequest.findUnique({
      where: { id: data.recruitment_request_id },
    });
    
    if (!request) {
      throw new AppError('Recruitment request not found', 404);
    }
    
    assertCompanyRecord(request, company_id);

    if (request.status !== 'APPROVED') {
      throw new AppError(
        'Recruitment request must be approved before creating a vacancy.',
        400,
      );
    }

    const vacancy = await prisma.vacancy.create({
      data: {
        company_id: Number(company_id),
        recruitment_request_id: data.recruitment_request_id,
        title: data.title || request.job_title || request.position_name,
        department_id: request.department_id,
        location: data.location,
        employment_type: toEmploymentType(
          data.employment_type || request.employment_type,
        ) as any,
        open_positions: data.open_positions ?? request.headcount ?? 1,
        description: data.description,
        responsibilities: data.responsibilities,
        requirements: data.requirements,
        required_experience: data.required_experience,
        required_qualifications: data.required_qualifications,
        status: 'DRAFT',
        posting_status: 'PENDING',
        opening_date: new Date(),
      },
      select: vacancySelect,
    });

    // Fire-and-forget notification to hiring manager
    setImmediate(async () => {
      try {
        const department = await prisma.department.findUnique({ where: { id: request.department_id } });
        const hiringManagerId = request.requested_by_user_id;
        await notifyVacancyCreated(
          Number(company_id),
          (vacancy as any).id,
          (vacancy as any).title,
          (vacancy as any).vacancy_number,
          department?.name || '',
          hiringManagerId,
        );
      } catch (e) { /* swallow */ }
    });

    return vacancy;
  }

  static async getVacancyApplications(
    company_id: string | number,
    vacancy_id: string,
  ) {
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
      include: {
        applications: {
          include: {
            candidate: true,
          },
        },
      },
    });
    
    if (!vacancy) {
      throw new AppError('Vacancy not found', 404);
    }
    
    assertCompanyRecord(vacancy, company_id);

    return vacancy.applications;
  }

  static async getVacancyHiringMinute(
    company_id: string | number,
    vacancy_id: string,
  ) {
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
      include: {
        hiring_minute: {
          include: {
            panel_members: true,
            signatories: true,
          },
        },
      },
    });
    
    if (!vacancy) {
      throw new AppError('Vacancy not found', 404);
    }
    
    assertCompanyRecord(vacancy, company_id);

    return vacancy.hiring_minute;
  }

  static async updateVacancy(
    company_id: string | number,
    vacancy_id: string,
    data: Partial<CreateVacancyDTO>,
  ) {
    const existing = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
      include: {
        job_description: true,
      },
    });
    if (!existing) {
      throw new Error('Vacancy not found');
    }
    assertCompanyRecord(existing, company_id);

    // Extract extra job description fields (benefits, employmentTerms, skills, experienceRequired)
    const extraJobData: any = {};
    if (data.benefits !== undefined) extraJobData.benefits = data.benefits;
    if (data.employmentTerms !== undefined) extraJobData.employment_terms = data.employmentTerms;
    if (data.skills !== undefined) extraJobData.skills = data.skills;
    if (data.experienceRequired !== undefined) extraJobData.experience_required = data.experienceRequired;

    // Always update or create job description when these fields are present in the payload
    // even if they are empty strings or empty arrays
    let jobDescriptionId = existing.job_description_id;
    const hasExtraFieldsPayload = 'benefits' in data || 'employmentTerms' in data || 'skills' in data || 'experienceRequired' in data;
    
    if (hasExtraFieldsPayload) {
      if (existing.job_description) {
        // Update existing job description with the extra fields
        await prisma.jobDescription.update({
          where: { id: existing.job_description.id },
          data: extraJobData,
        });
      } else {
        // Create new job description with all available data
        const newJobDescription = await prisma.jobDescription.create({
          data: {
            company_id: Number(company_id),
            title: data.title || existing.title,
            summary: data.description || existing.description,
            responsibilities: data.responsibilities || existing.responsibilities,
            requirements: data.requirements || existing.requirements,
            qualifications: data.required_qualifications || existing.required_qualifications,
            ...extraJobData,
          },
        });
        jobDescriptionId = newJobDescription.id;
      }
    }

    const updateData: any = {
      title: data.title ?? existing.title,
      location: data.location ?? existing.location,
      employment_type: data.employment_type
        ? (toEmploymentType(data.employment_type) as any)
        : existing.employment_type,
      open_positions: data.open_positions ?? existing.open_positions,
      opening_date: data.opening_date
        ? new Date(data.opening_date)
        : existing.opening_date,
      closing_date: data.closing_date
        ? new Date(data.closing_date)
        : existing.closing_date,
    };

    // Only update description fields if they are explicitly provided in the payload
    // This prevents data loss when updating other fields like closing_date
    if (data.description !== undefined) {
      updateData.description = data.description || existing.description;
    }
    if (data.responsibilities !== undefined) {
      updateData.responsibilities = data.responsibilities || existing.responsibilities;
    }
    if (data.requirements !== undefined) {
      updateData.requirements = data.requirements || existing.requirements;
    }
    if (data.required_qualifications !== undefined) {
      updateData.required_qualifications = data.required_qualifications || existing.required_qualifications;
    }
    if (data.required_experience !== undefined) {
      updateData.required_experience = data.required_experience || existing.required_experience;
    }

    // If closing date is being extended and vacancy is closed, reopen it to previous status
    if (data.closing_date && existing.status === 'CLOSED') {
      const newClosingDate = new Date(data.closing_date);
      const now = new Date();
      if (newClosingDate > now) {
        // Restore to previous status if available, otherwise default to OPEN
        const previousStatus = (existing as any).previous_status || 'OPEN';
        updateData.status = previousStatus;
      }
    }

    // If status is being changed to CLOSED, save the current status as previous_status
    if ((data as any).status === 'CLOSED' && existing.status !== 'CLOSED') {
      updateData.previous_status = existing.status;
      updateData.status = 'CLOSED';
    }

    // Only update job_description_id if we actually created/updated a job description
    // Otherwise, preserve the existing job_description_id to avoid data loss
    if (hasExtraFieldsPayload && jobDescriptionId) {
      updateData.job_description_id = jobDescriptionId;
    }

    return await prisma.vacancy.update({
      where: { id: vacancy_id },
      data: updateData,
      select: vacancySelect,
    });
  }

  static async postVacancy(company_id: string | number, vacancy_id: string) {
    const existing = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
    });
    assertCompanyRecord(existing, company_id);

    const vacancy = await prisma.vacancy.update({
      where: { id: vacancy_id },
      data: {
        posting_status: 'PUBLISHED',
        status: 'OPEN',
        posted_at: new Date(),
      },
      select: vacancySelect,
    });

    // Fire-and-forget notification to hiring manager
    setImmediate(async () => {
      try {
        const fullVacancy = await prisma.vacancy.findUnique({
          where: { id: vacancy_id },
          include: {
            recruitment_request: { select: { requested_by_user_id: true } },
          },
        });
        if (fullVacancy) {
          await notifyVacancyPublished(
            Number(company_id),
            vacancy_id,
            (vacancy as any).title,
            (vacancy as any).vacancy_number,
            fullVacancy.recruitment_request.requested_by_user_id,
          );
        }
      } catch (e) { /* swallow */ }
    });

    return vacancy;
  }

  static async unpostVacancy(company_id: string | number, vacancy_id: string) {
    const existing = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
    });
    assertCompanyRecord(existing, company_id);

    return await prisma.vacancy.update({
      where: { id: vacancy_id },
      data: { posting_status: 'WITHDRAWN', status: 'DRAFT' },
      select: vacancySelect,
    });
  }

  static async holdVacancy(
    company_id: string | number,
    vacancy_id: string,
    user_id?: string,
  ) {
    const existing = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
    });
    
    if (!existing) {
      throw new AppError('Vacancy not found', 404);
    }
    
    assertCompanyRecord(existing, company_id);

    if (existing.status === 'ON_HOLD') {
      return await prisma.vacancy.findUniqueOrThrow({
        where: { id: vacancy_id },
        select: vacancySelect,
      });
    }

    if (['CLOSED', 'CANCELLED'].includes(existing.status)) {
      throw new AppError(
        'Closed or cancelled vacancies cannot be put on hold.',
        400,
      );
    }

    const previousStatus =
      existing.status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : existing.status === 'OPEN'
          ? 'OPEN'
          : 'DRAFT';

    return await prisma.$transaction(async (tx) => {
      const vacancy = await tx.vacancy.update({
        where: { id: vacancy_id },
        data: { status: 'ON_HOLD' },
        select: vacancySelect,
      });

      await tx.activityLog.create({
        data: {
          company_id: Number(company_id),
          user_id,
          action: HOLD_ACTIVITY_ACTION,
          entity_type: 'Vacancy',
          entity_id: vacancy_id,
          description: `Vacancy put on hold from ${previousStatus.toLowerCase().replace('_', ' ')}`,
          changes: {
            previousStatus,
            nextStatus: 'ON_HOLD',
          },
        },
      });

      return vacancy;
    });
  }

  static async resumeVacancy(
    company_id: string | number,
    vacancy_id: string,
    user_id?: string,
  ) {
    const existing = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
    });
    
    if (!existing) {
      throw new AppError('Vacancy not found', 404);
    }
    
    assertCompanyRecord(existing, company_id);

    if (existing.status !== 'ON_HOLD') {
      return await prisma.vacancy.findUniqueOrThrow({
        where: { id: vacancy_id },
        select: vacancySelect,
      });
    }

    const nextStatus = await getResumeStatus(
      company_id,
      vacancy_id,
      existing.posting_status,
    );

    return await prisma.$transaction(async (tx) => {
      const vacancy = await tx.vacancy.update({
        where: { id: vacancy_id },
        data: { status: nextStatus as any },
        select: vacancySelect,
      });

      await tx.activityLog.create({
        data: {
          company_id: Number(company_id),
          user_id,
          action: 'vacancy_resumed',
          entity_type: 'Vacancy',
          entity_id: vacancy_id,
          description: `Vacancy resumed to ${nextStatus.toLowerCase().replace('_', ' ')}`,
          changes: {
            previousStatus: 'ON_HOLD',
            nextStatus,
          },
        },
      });

      return vacancy;
    });
  }

  static async setVacancyStatus(
    company_id: string | number,
    vacancy_id: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'CANCELLED',
  ) {
    const existing = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
    });
    
    if (!existing) {
      throw new AppError('Vacancy not found', 404);
    }
    
    assertCompanyRecord(existing, company_id);

    const nextStatus =
      existing.status === 'ON_HOLD' && status === 'OPEN'
        ? await getResumeStatus(company_id, vacancy_id, existing.posting_status)
        : status;

    return await prisma.vacancy.update({
      where: { id: vacancy_id },
      data: { status: nextStatus },
      select: vacancySelect,
    });
  }

  static async fulfillVacancy(
    company_id: string | number,
    vacancy_id: string,
    user_id?: string,
  ) {
    const existing = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
    });
    
    if (!existing) {
      throw new AppError('Vacancy not found', 404);
    }
    
    assertCompanyRecord(existing, company_id);

    const vacancy = await prisma.vacancy.update({
      where: { id: vacancy_id },
      data: { status: 'CLOSED', filled_at: new Date(), closed_at: new Date() },
      select: vacancySelect,
    });

    if (user_id) {
      await prisma.activityLog.create({
        data: {
          company_id: Number(company_id),
          user_id,
          action: 'fulfilled',
          entity_type: 'Vacancy',
          entity_id: vacancy_id,
          description: `Vacancy fulfilled: ${vacancy.title}`,
        },
      });
    }

    return vacancy;
  }

  static async approveVacancyPosting(
    company_id: string | number,
    vacancy_id: string,
  ) {
    return await this.postVacancy(company_id, vacancy_id);
  }

  static async rejectVacancyPosting(
    company_id: string | number,
    vacancy_id: string,
    reason?: string,
    user_id?: string,
  ) {
    const existing = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
    });
    assertCompanyRecord(existing, company_id);

    if (user_id) {
      await prisma.activityLog.create({
        data: {
          company_id: Number(company_id),
          user_id,
          action: 'rejected',
          entity_type: 'VacancyPosting',
          entity_id: vacancy_id,
          description: reason,
        },
      });
    }

    return await prisma.vacancy.update({
      where: { id: vacancy_id },
      data: { posting_status: 'WITHDRAWN' },
      select: vacancySelect,
    });
  }

  // Prompt 5: Final Selection Decision
  static async selectCandidate(
    company_id: string | number,
    vacancy_id: string,
    data: {
      selected_application_id: string;
      alternative_application_id?: string;
      reason_for_selection: string;
      reason_for_alternative?: string;
      expected_salary: number;
      expected_joining_date?: string;
    },
    user_id: string,
  ) {
    // Fetch vacancy with company check
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
      include: {
        applications: true,
        recruitment_request: {
          select: {
            request_type: true,
            planning_type: true,
          },
        },
      },
    });
    assertCompanyRecord(vacancy, company_id);

    // Validate vacancy status - must be IN_PROGRESS or PUBLISHED
    if (vacancy && !['IN_PROGRESS', 'PUBLISHED', 'OPEN'].includes(vacancy.status)) {
      throw new AppError(
        'Cannot select from a vacancy that is not IN_PROGRESS, PUBLISHED, or OPEN',
        400,
      );
    }

    // Fetch selected application with all required relations
    const selectedApp = await prisma.application.findUnique({
      where: { id: data.selected_application_id },
      include: {
        candidate: true,
        vacancy: true,
      },
    });
    if (!selectedApp || selectedApp.vacancy_id !== vacancy_id) {
      throw new AppError(
        'Selected application not found for this vacancy',
        404,
      );
    }

    // Verify application is in a state that allows selection
    const validPreSelectionStatuses = [
      'UNDER_EVALUATION',
      'INTERVIEW_COMPLETED',
      'SHORTLISTED',
    ];
    if (!validPreSelectionStatuses.includes(selectedApp.status)) {
      throw new AppError(
        `Application must be in one of these statuses to be selected: ${validPreSelectionStatuses.join(', ')}`,
        400,
      );
    }

    // Check if at least one evaluation exists for this candidate for this vacancy
    const evaluationCount = await prisma.interviewEvaluation.count({
      where: {
        interview: {
          application_id: data.selected_application_id,
        },
      },
    });
    if (evaluationCount === 0) {
      throw new AppError(
        'Cannot select a candidate without at least one evaluation',
        400,
      );
    }

    const existingHiringMinute = await prisma.hiringMinute.findUnique({
      where: { vacancy_id: vacancy_id },
      select: {
        id: true,
        final_decision: true,
      },
    });

    // If alternative is provided, validate it
    let alternativeApp = null;
    if (data.alternative_application_id) {
      alternativeApp = await prisma.application.findUnique({
        where: { id: data.alternative_application_id },
        include: { candidate: true },
      });
      if (!alternativeApp || alternativeApp.vacancy_id !== vacancy_id) {
        throw new AppError(
          'Alternative application not found for this vacancy',
          404,
        );
      }
      if (alternativeApp.id === data.selected_application_id) {
        throw new AppError(
          'Alternative candidate must be different from the selected candidate',
          400,
        );
      }
    }

    // Run everything in a transaction
    return await prisma.$transaction(async (tx) => {
      const currentActiveSelections = await tx.application.count({
        where: {
          vacancy_id,
          status: {
            in: [...ACTIVE_SELECTION_STATUSES],
          },
        },
      });

      if (vacancy && currentActiveSelections >= vacancy.open_positions) {
        throw new AppError(
          'All approved openings for this vacancy are already filled or in offer processing.',
          409,
        );
      }

      // 1. Update selected application status to SELECTED
      await tx.application.update({
        where: { id: data.selected_application_id },
        data: {
          status: 'SELECTED',
          current_stage: 'OFFER',
        },
      });

      // 2. Add stage history for selected application
      await tx.applicationStageHistory.create({
        data: {
          application_id: data.selected_application_id,
          from_stage: selectedApp.current_stage,
          to_stage: 'OFFER',
          changed_by_id: user_id,
          notes: `Selected for ${vacancy?.title} by ${user_id}`,
        },
      });

      // 3. Get all evaluations for the selected and alternative candidates
      const selectedSnapshot = await getApplicationEvaluationSnapshot(
        tx,
        data.selected_application_id,
      );
      const alternativeSnapshot = data.alternative_application_id
        ? await getApplicationEvaluationSnapshot(tx, data.alternative_application_id)
        : null;

      // 4. Get panel members for HiringMinutePanel
      const panelMembers = await tx.interviewPanel.findMany({
        where: {
          interview: {
            application_id: data.selected_application_id,
          },
        },
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              app_user_roles: {
                select: {
                  role: {
                    select: {
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      const metrics = await getVacancySelectionMetrics(tx, vacancy_id);
      const hiringMinutePayload = {
        prepared_by_id: user_id,
        recruitment_request_type:
          vacancy?.recruitment_request?.request_type || 'NEW_HEADCOUNT',
        recruitment_classification:
          vacancy?.recruitment_request?.planning_type || 'PLANNED',
        application_type: vacancy?.application_type || 'EXTERNAL',
        interview_date:
          selectedSnapshot.firstInterviewDate ||
          parseOptionalDate(data.expected_joining_date) ||
          null,
        total_applications: metrics.totalApplications,
        total_screened: metrics.totalScreened,
        total_shortlisted: metrics.totalShortlisted,
        total_interviewed: metrics.totalInterviewed,
        selected_candidate_id: selectedApp.candidate_id,
        selected_candidate_score: new Decimal(
          selectedSnapshot.aggregateScore.toString(),
        ),
        expected_joining_date:
          parseOptionalDate(data.expected_joining_date) ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        recommended_position: vacancy?.title,
        expected_salary: new Decimal(data.expected_salary.toString()),
        reason_for_selection: data.reason_for_selection,
        alternative_candidate_id: data.alternative_application_id
          ? alternativeApp?.candidate_id
          : null,
        alternative_candidate_score:
          alternativeSnapshot && alternativeApp
            ? new Decimal(alternativeSnapshot.aggregateScore.toString())
            : null,
        reason_for_alternative: data.reason_for_alternative || null,
        candidate_evaluation_summary: selectedSnapshot.evaluationSummary,
        rejected_candidates_json: metrics.rejectedCandidates,
        panel_recommendation: 'RECOMMEND_HIRING' as const,
        final_decision: 'PENDING' as const,
        approved_at: null,
        approved_by_id: null,
      };

      const hiringMinute = existingHiringMinute
        ? await tx.hiringMinute.update({
            where: { id: existingHiringMinute.id },
            data: {
              ...hiringMinutePayload,
              decision_remarks:
                existingHiringMinute.final_decision === 'APPROVED'
                  ? 'Hiring minute content changed after a new selection and requires fresh approval.'
                  : undefined,
            },
          })
        : await tx.hiringMinute.create({
            data: {
              vacancy_id,
              ...hiringMinutePayload,
            },
          });

      await tx.hiringMinutePanel.deleteMany({
        where: { hiring_minute_id: hiringMinute.id },
      });
      await tx.hiringMinuteSignatory.deleteMany({
        where: { hiring_minute_id: hiringMinute.id },
      });

      // 6. Create HiringMinutePanel records for the current selection set
      const uniquePanelMembers = new Map<string, (typeof panelMembers)[number]>();
      for (const panelMember of panelMembers) {
        const uniqueKey = panelMember.panel_member_id;
        if (!uniquePanelMembers.has(uniqueKey)) {
          uniquePanelMembers.set(uniqueKey, panelMember);
        }
      }

      for (const panelMember of uniquePanelMembers.values()) {
        const panelRole = panelMember.user?.app_user_roles[0]?.role;
        await tx.hiringMinutePanel.create({
          data: {
            hiring_minute_id: hiringMinute.id,
            user_id: panelMember.panel_member_id,
            member_name: panelMember.user?.first_name
              ? `${panelMember.user.first_name} ${panelMember.user.last_name}`
              : 'Unknown',
            position_role: panelRole?.name || panelRole?.slug || 'Interviewer',
          },
        });
      }

      // 7. Update vacancy status based on the number of active selections
      if (vacancy && metrics.activeSelectedCount >= vacancy.open_positions) {
        await tx.vacancy.update({
          where: { id: vacancy_id },
          data: { status: 'CLOSED' },
        });
      } else if (vacancy && vacancy.status === 'CLOSED') {
        await tx.vacancy.update({
          where: { id: vacancy_id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return hiringMinute;
    });
  }

  static async revokeSelection(
    company_id: string | number,
    vacancy_id: string,
  ) {
    // Fetch vacancy with company check
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
    });
    assertCompanyRecord(vacancy, company_id);

    // Fetch the hiring minute
    const hiringMinute = await prisma.hiringMinute.findUnique({
      where: { vacancy_id: vacancy_id },
    });
    if (!hiringMinute) {
      throw new AppError('No selection found for this vacancy', 404);
    }

    // Cannot revoke if already approved
    if (hiringMinute.final_decision === 'APPROVED') {
      throw new AppError('Cannot revoke an approved hiring minute', 409);
    }

    // Run everything in a transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Revert actively selected applications back to pre-selection status
      const selectedApps = await tx.application.findMany({
        where: {
          vacancy_id,
          status: {
            in: [...REVERSIBLE_SELECTION_STATUSES],
          },
        },
      });

      for (const selectedApp of selectedApps) {
        const previousHistory = await tx.applicationStageHistory.findFirst({
          where: {
            application_id: selectedApp.id,
            to_stage: 'OFFER',
          },
          orderBy: { changed_at: 'desc' },
        });

        await tx.application.update({
          where: { id: selectedApp.id },
          data: {
            status: 'UNDER_EVALUATION',
            current_stage: previousHistory?.from_stage || 'EVALUATION',
            rejection_reason: null,
          },
        });
      }

      // 2. Revert automatically rejected applications back to their previous status
      const rejectedHistory = await tx.applicationStageHistory.findMany({
        where: {
          application_id: {
            in: (
              await tx.application.findMany({
                where: {
                  vacancy_id: vacancy_id,
                  status: 'REJECTED',
                  rejection_reason: AUTO_SELECTION_REJECTION_REASON,
                },
                select: { id: true },
              })
            ).map((a) => a.id),
          },
          notes: AUTO_SELECTION_REJECTION_REASON,
        },
      });

      for (const history of rejectedHistory) {
        await tx.application.update({
          where: { id: history.application_id },
          data: {
            status: 'UNDER_EVALUATION',
            current_stage: history.from_stage || 'EVALUATION',
            rejection_reason: null,
          },
        });
      }

      // 3. Delete HiringMinutePanel records
      await tx.hiringMinutePanel.deleteMany({
        where: { hiring_minute_id: hiringMinute.id },
      });

      // 4. Delete HiringMinuteSignatory records
      await tx.hiringMinuteSignatory.deleteMany({
        where: { hiring_minute_id: hiringMinute.id },
      });

      // 5. Delete HiringMinute
      await tx.hiringMinute.delete({
        where: { id: hiringMinute.id },
      });

      // 6. Revert vacancy status if needed
      await tx.vacancy.update({
        where: { id: vacancy_id },
        data: { status: 'IN_PROGRESS' },
      });

      return { success: true, message: 'Selection revoked successfully' };
    });
  }

  /**
   * Close expired vacancies - scheduled job functionality
   * Finds all OPEN / PUBLISHED vacancies whose closing_date has passed
   * and transitions them to CLOSED automatically.
   */
  static async closeExpiredVacancies(): Promise<void> {
    const now = new Date();

    try {
      const expired = await prisma.vacancy.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          closing_date: { lt: now },
        },
        select: { id: true, title: true, closing_date: true, company_id: true },
      });

      if (expired.length === 0) {
        logger.info('VACANCY SERVICE', 'No expired vacancies to close');
        return;
      }

      logger.info('VACANCY SERVICE', `Closing ${expired.length} expired vacancies`);

      await prisma.vacancy.updateMany({
        where: {
          id: { in: expired.map((v) => v.id) },
        },
        data: {
          status: 'CLOSED',
          closed_at: now,
          posting_status: 'WITHDRAWN',
        },
      });

      // Log each closure in the activity log for audit trail
      await prisma.activityLog.createMany({
        data: expired.map((v) => ({
          company_id: v.company_id,
          action: 'auto_closed',
          entity_type: 'Vacancy',
          entity_id: v.id,
          description: `Vacancy automatically closed — deadline ${v.closing_date?.toISOString().slice(0, 10)} passed`,
          changes: {
            previousStatus: 'OPEN',
            nextStatus: 'CLOSED',
            reason: 'closing_date_passed',
          },
        })),
        skipDuplicates: true,
      });

      logger.success('VACANCY SERVICE', `Closed ${expired.length} expired vacancies`);
    } catch (err) {
      logger.error('VACANCY SERVICE', 'Error closing expired vacancies', err);
      throw err;
    }
  }

  /**
   * Start the recurring scheduler for closing expired vacancies.
   * Runs immediately on startup, then every hour.
   */
  static startVacancyExpiryScheduler(): void {
    // Run once immediately on startup
    void this.closeExpiredVacancies();

    // Then run every hour (3_600_000 ms)
    setInterval(() => {
      void this.closeExpiredVacancies();
    }, 60 * 60 * 1000);

    logger.info('VACANCY SERVICE', 'Vacancy expiry scheduler started — runs every hour');
  }
}

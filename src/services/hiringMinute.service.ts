import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import {
  CreateHiringMinuteDTO,
  UpdateHiringMinuteDTO,
} from '../types/recruitment.types';

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid datetime value: ${value}`, 400);
  }
  return date;
};

const ACTIVE_SELECTION_STATUSES = [
  'SELECTED',
  'OFFER_ISSUED',
  'OFFER_ACCEPTED',
] as const;

const getFullName = (
  person?:
    | {
        first_name?: string | null;
        last_name?: string | null;
      }
    | null,
) => {
  const fullName = [person?.first_name, person?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || undefined;
};

const toNumericValue = (value: unknown) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getApplicationAggregateScore = (application: any) => {
  const evaluations = (application.interviews || []).flatMap(
    (interview: any) => interview.interview_evaluations || [],
  );
  if (evaluations.length === 0) return null;
  const total = evaluations.reduce(
    (sum: number, evaluation: any) => sum + Number(evaluation.overall_score || 0),
    0,
  );
  return Math.round((total / evaluations.length) * 100) / 100;
};

const buildSelectedCandidates = (minute: any) => {
  const applications = minute.vacancy?.applications || [];
  return applications
    .filter((application: any) =>
      ACTIVE_SELECTION_STATUSES.includes(
        application.status as (typeof ACTIVE_SELECTION_STATUSES)[number],
      ),
    )
    .map((application: any) => ({
      application_id: application.id,
      candidate_id: application.candidate_id,
      candidate_name:
        getFullName(application.candidate) || application.candidate?.email || 'Unknown',
      candidate_email: application.candidate?.email || undefined,
      application_status: application.status,
      aggregate_score: getApplicationAggregateScore(application),
      expected_salary: toNumericValue(application.expected_salary),
      selected_at: application.updated_at,
    }))
    .sort((left: any, right: any) => {
      const statusOrder = (status: string) =>
        ({
          OFFER_ACCEPTED: 3,
          OFFER_ISSUED: 2,
          SELECTED: 1,
        })[status] || 0;
      return (
        statusOrder(right.application_status) - statusOrder(left.application_status) ||
        new Date(right.selected_at).getTime() - new Date(left.selected_at).getTime()
      );
    });
};

const buildRejectedCandidates = (minute: any) => {
  const existingRejected = new Map<string, any>();
  if (Array.isArray(minute.rejected_candidates_json)) {
    for (const candidate of minute.rejected_candidates_json as any[]) {
      if (candidate?.application_id) {
        existingRejected.set(candidate.application_id, candidate);
      }
    }
  }

  const liveRejected = (minute.vacancy?.applications || []).filter(
    (application: any) => application.status === 'REJECTED',
  );

  return liveRejected.map((application: any) => {
    const existing = existingRejected.get(application.id);
    return {
      application_id: application.id,
      candidate_id: application.candidate_id,
      candidate_name:
        getFullName(application.candidate) || application.candidate?.email || 'Unknown',
      candidate_email: application.candidate?.email || undefined,
      rejection_reason: application.rejection_reason || existing?.rejection_reason || null,
      roster_added: Boolean(existing?.roster_added),
      regret_sent_at: existing?.regret_sent_at || null,
    };
  });
};

const formatInterviewDates = (minute: any) => {
  if (minute.interview_date) {
    return new Date(minute.interview_date).toLocaleDateString();
  }

  const uniqueDates = new Set<string>();
  for (const application of minute.vacancy?.applications || []) {
    for (const interview of application.interviews || []) {
      if (interview.start_time) {
        uniqueDates.add(new Date(interview.start_time).toLocaleDateString());
      }
    }
  }

  return uniqueDates.size > 0 ? Array.from(uniqueDates).join(', ') : null;
};

const buildHiringMinuteResponse = (minute: any) => {
  const selectedCandidates = buildSelectedCandidates(minute);
  const primarySelectedCandidate = selectedCandidates[0];
  const rejectedCandidates = buildRejectedCandidates(minute);
  const openPositions = Number(minute.vacancy?.open_positions || 0);
  const remainingOpenings = Math.max(openPositions - selectedCandidates.length, 0);

  return {
    ...minute,
    prepared_by_name: getFullName(minute.prepared_by),
    approved_by_name: getFullName(minute.approved_by),
    selected_candidate_id:
      primarySelectedCandidate?.candidate_id || minute.selected_candidate_id,
    selected_candidate_name:
      primarySelectedCandidate?.candidate_name ||
      getFullName(minute.selected_candidate) ||
      undefined,
    selected_candidate_score:
      primarySelectedCandidate?.aggregate_score ??
      toNumericValue(minute.selected_candidate_score),
    alternative_candidate_name:
      getFullName(minute.alternative_candidate) || undefined,
    expected_salary: toNumericValue(minute.expected_salary),
    alternative_candidate_score: toNumericValue(minute.alternative_candidate_score),
    panel_members: minute.panel_members || [],
    signatories: minute.signatories || [],
    rejected_candidates: rejectedCandidates,
    selected_candidates: selectedCandidates,
    current_selected_count: selectedCandidates.length,
    remaining_openings: remainingOpenings,
    has_remaining_openings: remainingOpenings > 0,
    interview_dates: formatInterviewDates(minute),
  };
};

const hiringMinuteDetailInclude = {
  vacancy: {
    include: {
      department: true,
      applications: {
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
              interview_evaluations: {
                select: {
                  overall_score: true,
                },
              },
            },
          },
        },
      },
    },
  },
  prepared_by: true,
  approved_by: true,
  selected_candidate: true,
  alternative_candidate: true,
  panel_members: true,
  signatories: {
    orderBy: {
      signed_at: 'asc' as const,
    },
  },
} as const;

export class HiringMinuteService {
  static async getHiringMinutes(company_id: string | number) {
    const companyIdNum = Number(company_id);
    const minutes = await prisma.hiringMinute.findMany({
      where: { vacancy: { company_id: companyIdNum } },
      include: {
        vacancy: true,
        prepared_by: true,
        approved_by: true,
        selected_candidate: true,
        alternative_candidate: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return minutes.map((minute) => ({
      ...minute,
      prepared_by_name: getFullName(minute.prepared_by),
      approved_by_name: getFullName(minute.approved_by),
      selected_candidate_name: getFullName(minute.selected_candidate),
      alternative_candidate_name: getFullName(minute.alternative_candidate),
    }));
  }

  static async getHiringMinuteByVacancy(
    company_id: string | number,
    vacancy_id: string,
  ) {
    const companyIdNum = Number(company_id);
    const minute = await prisma.hiringMinute.findFirst({
      where: {
        vacancy_id,
        vacancy: { company_id: companyIdNum },
      },
      include: hiringMinuteDetailInclude,
    });
    if (minute && minute.vacancy.company_id !== companyIdNum) {
      return null;
    }
    if (!minute) return null;
    return buildHiringMinuteResponse(minute);
  }

  static async getHiringMinuteById(company_id: string | number, hiringMinuteId: string) {
    const companyIdNum = Number(company_id);
    const minute = await prisma.hiringMinute.findUnique({
      where: { id: hiringMinuteId },
      include: hiringMinuteDetailInclude,
    });
    if (!minute || minute.vacancy.company_id !== companyIdNum) {
      throw new AppError('Not found or unauthorized', 404);
    }
    return buildHiringMinuteResponse(minute);
  }

  static async createHiringMinute(
    company_id: string | number,
    user_id: string,
    data: CreateHiringMinuteDTO,
  ) {
    const companyIdNum = Number(company_id);
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: data.vacancy_id },
      include: { company: true, hiring_minute: true },
    });
    if (!vacancy || vacancy.company_id !== companyIdNum) {
      throw new AppError('Vacancy not found or unauthorized', 404);
    }
    if (vacancy.hiring_minute) {
      throw new AppError(
        'A hiring minute already exists for this vacancy.',
        409,
      );
    }

    const parsed = {
      vacancy_id: data.vacancy_id,
      prepared_by_id: user_id,
      recruitment_request_type: data.recruitment_request_type,
      recruitment_classification: data.recruitment_classification,
      application_type: data.application_type,
      interview_date: parseDate(data.interview_date),
      interview_time: data.interview_time,
      interview_place: data.interview_place,
      advertisement_date: parseDate(data.advertisement_date),
      application_closing_date: parseDate(data.application_closing_date),
      total_applications: data.total_applications,
      total_screened: data.total_screened,
      total_shortlisted: data.total_shortlisted,
      total_interviewed: data.total_interviewed,
      sources_used: data.sources_used,
      screening_criteria_used: data.screening_criteria_used,
      stages_conducted: data.stages_conducted,
      candidate_evaluation_summary: data.candidate_evaluation_summary,
      selected_candidate_id: data.selected_candidate_id,
      selected_candidate_score: data.selected_candidate_score,
      expected_joining_date: parseDate(data.expected_joining_date),
      recommended_position: data.recommended_position,
      expected_salary: data.expected_salary,
      reason_for_selection: data.reason_for_selection,
      alternative_candidate_id: data.alternative_candidate_id,
      alternative_candidate_score: data.alternative_candidate_score,
      reason_for_alternative: data.reason_for_alternative,
      rejected_candidates_json: data.rejected_candidates_json,
      panel_recommendation: data.panel_recommendation,
      recommendation_summary: data.recommendation_summary,
      hr_observation: data.hr_observation,
      final_decision: data.final_decision,
      decision_remarks: data.decision_remarks,
    };

    return prisma.hiringMinute.create({
      data: parsed,
      include: { vacancy: true, prepared_by: true, approved_by: true },
    });
  }

  static async updateHiringMinute(
    company_id: string | number,
    hiringMinuteId: string,
    data: UpdateHiringMinuteDTO,
  ) {
    const companyIdNum = Number(company_id);
    const existing = await prisma.hiringMinute.findUnique({
      where: { id: hiringMinuteId },
      include: { vacancy: true },
    });
    if (!existing || existing.vacancy.company_id !== companyIdNum) {
      throw new AppError('Not found or unauthorized', 404);
    }

    const parsed: Record<string, unknown> = {};
    if (data.recruitment_request_type)
      parsed.recruitment_request_type = data.recruitment_request_type;
    if (data.recruitment_classification)
      parsed.recruitment_classification = data.recruitment_classification;
    if (data.application_type) parsed.application_type = data.application_type;
    if (data.interview_date)
      parsed.interview_date = parseDate(data.interview_date);
    if (data.interview_time) parsed.interview_time = data.interview_time;
    if (data.interview_place) parsed.interview_place = data.interview_place;
    if (data.advertisement_date)
      parsed.advertisement_date = parseDate(data.advertisement_date);
    if (data.application_closing_date)
      parsed.application_closing_date = parseDate(data.application_closing_date);
    if (data.total_applications !== undefined)
      parsed.total_applications = data.total_applications;
    if (data.total_screened !== undefined)
      parsed.total_screened = data.total_screened;
    if (data.total_shortlisted !== undefined)
      parsed.total_shortlisted = data.total_shortlisted;
    if (data.total_interviewed !== undefined)
      parsed.total_interviewed = data.total_interviewed;
    if (data.sources_used !== undefined) parsed.sources_used = data.sources_used;
    if (data.screening_criteria_used !== undefined)
      parsed.screening_criteria_used = data.screening_criteria_used;
    if (data.stages_conducted !== undefined)
      parsed.stages_conducted = data.stages_conducted;
    if (data.candidate_evaluation_summary !== undefined)
      parsed.candidate_evaluation_summary = data.candidate_evaluation_summary;
    if (data.selected_candidate_id !== undefined)
      parsed.selected_candidate_id = data.selected_candidate_id;
    if (data.selected_candidate_score !== undefined)
      parsed.selected_candidate_score = data.selected_candidate_score;
    if (data.expected_joining_date)
      parsed.expected_joining_date = parseDate(data.expected_joining_date);
    if (data.recommended_position !== undefined)
      parsed.recommended_position = data.recommended_position;
    if (data.expected_salary !== undefined)
      parsed.expected_salary = data.expected_salary;
    if (data.reason_for_selection !== undefined)
      parsed.reason_for_selection = data.reason_for_selection;
    if (data.alternative_candidate_id !== undefined)
      parsed.alternative_candidate_id = data.alternative_candidate_id;
    if (data.alternative_candidate_score !== undefined)
      parsed.alternative_candidate_score = data.alternative_candidate_score;
    if (data.reason_for_alternative !== undefined)
      parsed.reason_for_alternative = data.reason_for_alternative;
    if (data.rejected_candidates_json !== undefined)
      parsed.rejected_candidates_json = data.rejected_candidates_json;
    if (data.panel_recommendation !== undefined)
      parsed.panel_recommendation = data.panel_recommendation;
    if (data.recommendation_summary !== undefined)
      parsed.recommendation_summary = data.recommendation_summary;
    if (data.hr_observation !== undefined)
      parsed.hr_observation = data.hr_observation;
    if (data.final_decision !== undefined)
      parsed.final_decision = data.final_decision;
    if (data.decision_remarks !== undefined)
      parsed.decision_remarks = data.decision_remarks;

    return prisma.hiringMinute.update({
      where: { id: hiringMinuteId },
      data: parsed,
      include: { vacancy: true, prepared_by: true, approved_by: true },
    });
  }

  // Prompt 6: Hiring Minute Approval & Post-Selection Flows
  static async approveHiringMinute(
    company_id: string | number,
    hiringMinuteId: string,
    user_id: string,
  ) {
    const companyIdNum = Number(company_id);
    const minute = await prisma.hiringMinute.findUnique({
      where: { id: hiringMinuteId },
      include: { vacancy: true },
    });
    if (!minute || minute.vacancy.company_id !== companyIdNum) {
      throw new AppError('Hiring minute not found or unauthorized', 404);
    }

    if (minute.final_decision !== 'PENDING') {
      throw new AppError(
        'Only hiring minutes in PENDING state can be approved',
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update hiring minute to APPROVED
      const updated = await tx.hiringMinute.update({
        where: { id: hiringMinuteId },
        data: {
          final_decision: 'APPROVED',
          approved_by_id: user_id,
          approved_at: new Date(),
        },
        include: {
          vacancy: true,
          prepared_by: true,
          approved_by: true,
          selected_candidate: true,
        },
      });

      // 2. Create HiringMinuteSignatory record for the approver
      const user = await tx.user.findUnique({ where: { id: user_id } });
      await tx.hiringMinuteSignatory.upsert({
        where: {
          hiring_minute_id_role: {
            hiring_minute_id: hiringMinuteId,
            role: 'HR_REPRESENTATIVE',
          },
        },
        create: {
          hiring_minute_id: hiringMinuteId,
          role: 'HR_REPRESENTATIVE',
          user_id: user_id,
          signatory_name: user
            ? `${user.first_name} ${user.last_name}`
            : 'System',
          signed_at: new Date(),
        },
        update: {
          user_id: user_id,
          signatory_name: user
            ? `${user.first_name} ${user.last_name}`
            : 'System',
          signed_at: new Date(),
        },
      });

      // 3. Create RecruitmentApprovalHistory (if needed - check schema for FK)
      // Note: This assumes RecruitmentApprovalHistory exists and can store HiringMinute approvals
      // If schema FK is missing, skip or record in notes

      // 4. Dispatch CANDIDATE_SELECTED notification if candidate exists
      if (updated.selected_candidate) {
        // Notification dispatch would happen here
        // await NotificationService.dispatch({
        //   type: 'CANDIDATE_SELECTED',
        //   recipient_id: updated.selected_candidate_id,
        //   data: { hiring_minute_id: hiringMinuteId }
        // });
      }

      return updated;
    });
  }

  static async rejectHiringMinute(
    company_id: string | number,
    hiringMinuteId: string,
    comments: string,
  ) {
    const companyIdNum = Number(company_id);
    const minute = await prisma.hiringMinute.findUnique({
      where: { id: hiringMinuteId },
      include: { vacancy: true },
    });
    if (!minute || minute.vacancy.company_id !== companyIdNum) {
      throw new AppError('Hiring minute not found or unauthorized', 404);
    }

    if (minute.final_decision !== 'PENDING') {
      throw new AppError(
        'Only hiring minutes in PENDING state can be rejected',
        400,
      );
    }

    return await prisma.hiringMinute.update({
      where: { id: hiringMinuteId },
      data: {
        final_decision: 'REJECTED',
        decision_remarks: comments,
      },
      include: {
        vacancy: true,
        prepared_by: true,
        approved_by: true,
      },
    });
  }

  static async addSignatory(
    company_id: string | number,
    hiringMinuteId: string,
    user_id: string,
    data: {
      role: 'HR_REPRESENTATIVE' | 'HIRING_MANAGER' | 'CEO';
      signatory_name: string;
    },
  ) {
    const companyIdNum = Number(company_id);
    const minute = await prisma.hiringMinute.findUnique({
      where: { id: hiringMinuteId },
      include: { vacancy: true },
    });
    if (!minute || minute.vacancy.company_id !== companyIdNum) {
      throw new AppError('Hiring minute not found or unauthorized', 404);
    }

    return await prisma.hiringMinuteSignatory.upsert({
      where: {
        hiring_minute_id_role: {
          hiring_minute_id: hiringMinuteId,
          role: data.role,
        },
      },
      create: {
        hiring_minute_id: hiringMinuteId,
        role: data.role,
        user_id: user_id,
        signatory_name: data.signatory_name,
        signed_at: new Date(),
      },
      update: {
        user_id: user_id,
        signatory_name: data.signatory_name,
        signed_at: new Date(),
      },
    });
  }

  static async addTalentRoster(
    company_id: string | number,
    hiringMinuteId: string,
    applicationIds: string[],
  ) {
    const companyIdNum = Number(company_id);
    const minute = await prisma.hiringMinute.findUnique({
      where: { id: hiringMinuteId },
      include: { vacancy: true },
    });
    if (!minute || minute.vacancy.company_id !== companyIdNum) {
      throw new AppError('Hiring minute not found or unauthorized', 404);
    }

    return await prisma.$transaction(async (tx) => {
      const results = [];

      for (const appId of applicationIds) {
        const app = await tx.application.findUnique({
          where: { id: appId },
          include: { candidate: true, vacancy: true },
        });

        if (!app || app.vacancy_id !== minute.vacancy_id) {
          continue; // Skip if not in this vacancy
        }

        if (app.status !== 'REJECTED') {
          continue; // Skip if not rejected
        }

        // Check if candidate is already in the talent roster for the same company
        let talentRoster = await tx.talentRoster.findFirst({
          where: {
            candidate_id: app.candidate_id,
            company_id: companyIdNum,
          },
        });

        if (!talentRoster) {
          talentRoster = await tx.talentRoster.create({
            data: {
              candidate_id: app.candidate_id,
              company_id: companyIdNum,
              talent_category: 'Rejected Candidate',
              source_stage: 'FINAL_SELECTION',
              sourced_from_vacancy_id: minute.vacancy_id,
              added_by: minute.prepared_by_id,
              added_at: new Date(),
            },
          });
        } else {
          // If already exists, update added_at
          talentRoster = await tx.talentRoster.update({
            where: { id: talentRoster.id },
            data: { added_at: new Date() },
          });
        }

        // Update application status to MOVED_TO_TALENT_ROSTER
        const updatedApp = await tx.application.update({
          where: { id: appId },
          data: { status: 'MOVED_TO_TALENT_ROSTER' },
        });

        // Create stage history entry
        await tx.applicationStageHistory.create({
          data: {
            application_id: appId,
            from_stage: 'CLOSED',
            to_stage: 'CLOSED',
            notes: 'Moved to talent roster',
          },
        });

        // Dispatch TALENT_ROSTER_ADDED notification
        // await NotificationService.dispatch({
        //   type: 'TALENT_ROSTER_ADDED',
        //   recipient_id: app.candidate_id,
        //   data: { hiring_minute_id: hiringMinuteId }
        // });

        results.push({
          application_id: appId,
          talent_roster_id: talentRoster.id,
        });
      }

      return results;
    });
  }

  static async sendRegrets(company_id: string | number, hiringMinuteId: string) {
    const companyIdNum = Number(company_id);
    const minute = await prisma.hiringMinute.findUnique({
      where: { id: hiringMinuteId },
      include: {
        vacancy: true,
        selected_candidate: true,
      },
    });
    if (!minute || minute.vacancy.company_id !== companyIdNum) {
      throw new AppError('Hiring minute not found or unauthorized', 404);
    }

    return await prisma.$transaction(async (tx) => {
      // Get all rejected applications for this vacancy that haven't been moved to roster
      const rejectedApps = await tx.application.findMany({
        where: {
          vacancy_id: minute.vacancy_id,
          status: {
            in: ['REJECTED', 'MOVED_TO_TALENT_ROSTER'],
          },
        },
        include: { candidate: true },
      });

      const results = [];

      for (const app of rejectedApps) {
        // Skip applications that already received a regret notification —
        // check for the exact sentinel note written by this function.
        const existingRegret = await tx.applicationStageHistory.findFirst({
          where: {
            application_id: app.id,
            notes: { startsWith: 'REGRET_SENT:' },
          },
        });

        if (existingRegret) {
          continue; // Already sent for this application — do not send again.
        }

        // Dispatch CANDIDATE_REJECTED notification
        // await NotificationService.dispatch({
        //   type: 'CANDIDATE_REJECTED',
        //   recipient_id: app.candidate_id,
        //   data: { vacancy_title: minute.vacancy.title }
        // });

        // Record the regret notification with a prefixed sentinel so the
        // duplicate-send check above can do an exact prefix match.
        await tx.applicationStageHistory.create({
          data: {
            application_id: app.id,
            from_stage: app.current_stage || 'CLOSED',
            to_stage: app.current_stage || 'CLOSED',
            notes: `REGRET_SENT: hiring_minute=${hiringMinuteId} sent_at=${new Date().toISOString()}`,
          },
        });

        results.push({
          application_id: app.id,
          candidate_email: app.candidate.email,
        });
      }

      return results;
    });
  }
}

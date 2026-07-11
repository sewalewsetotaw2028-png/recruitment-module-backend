import prisma from '../config/database';
import redisClient from '../config/redis';
import { logger } from '../utils/logger';

type ReportingOptions = {
  period?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  vacancyId?: string;
  forceEmpty?: boolean;
};

type DateRange = {
  gte?: Date;
  lte?: Date;
};

const endOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const toDateRange = (
  startDate?: string,
  endDate?: string,
): DateRange | undefined => {
  if (!startDate && !endDate) {
    return undefined;
  }

  const range: DateRange = {};
  if (startDate) {
    range.gte = new Date(startDate);
  }
  if (endDate) {
    range.lte = endOfDay(new Date(endDate));
  }
  return range;
};

const toPeriodDateRange = (period?: string): DateRange | undefined => {
  const now = new Date();
  if (period === 'monthly') {
    // Calendar month-to-date (not "last 30 days") so the UI toggle produces
    // clearly different results vs quarterly.
    return {
      gte: new Date(now.getFullYear(), now.getMonth(), 1),
      lte: endOfDay(now),
    };
  }
  if (period === 'quarterly') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return {
      gte: new Date(now.getFullYear(), quarterStartMonth, 1),
      lte: endOfDay(now),
    };
  }
  return undefined;
};

const avg = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const normalizeStage = (stage: string) => stage.toLowerCase().trim();

const stageMatches = (stage: string, aliases: string[]) => {
  const normalized = normalizeStage(stage);
  return aliases.some((alias) => normalized.includes(alias));
};

const safeCount = async (countFn: () => Promise<number>, modelName: string) => {
  try {
    return await countFn();
  } catch (error: any) {
    if (error?.code === 'P2021') {
      logger.warn(`${modelName} table missing, returning 0 for metrics`);
      return 0;
    }
    throw error;
  }
};

const buildEmptyDashboardReport = () => ({
  summary: {
    totalVacancies: 0,
    openVacancies: 0,
    totalApplications: 0,
    hiredCount: 0,
    fulfillmentRate: '0.0%',
  },
  sourcing: [{ source: 'Direct Application', count: 0 }],
  pipeline: [],
  kpis: {
    averageTimeToFillDays: 0,
    averageTimeToHireDays: 0,
    offerAcceptanceRate: '0.0%',
    candidateConversionRate: '0.0%',
    interviewToSelectionRatio: 0,
    talentRosterUtilizationRate: '0.0%',
    totals: {
      totalOffers: 0,
      acceptedOffersCount: 0,
      totalInterviews: 0,
    },
  },
  trends: {
    vacancies: [0, 0, 0, 0, 0, 0, 0],
    applications: [0, 0, 0, 0, 0, 0, 0],
    hires: [0, 0, 0, 0, 0, 0, 0],
    fulfillment: [0, 0, 0, 0, 0, 0, 0],
    hiredImprovement: 0,
  },
});

export class ReportingService {
  static async getDashboardStats(company_id: string, opts?: ReportingOptions) {
    const startDate = opts?.startDate;
    const endDate = opts?.endDate;
    const departmentId = opts?.departmentId;
    const vacancyId = opts?.vacancyId;
    const cacheKey = `dashboard_stats:${company_id}:${opts?.period || ''}:${startDate || ''}:${endDate || ''}:${departmentId || ''}:${vacancyId || ''}`;

    if (opts?.forceEmpty) {
      return buildEmptyDashboardReport();
    }

    // Disable caching for dashboard to ensure period filter changes are reflected immediately
    // try {
    //   const cachedData = await redisClient.get(cacheKey);
    //   if (cachedData) {
    //     logger.info('📊 Returning cached dashboard stats');
    //     return JSON.parse(cachedData);
    //   }
    // } catch (redisError) {
    //   logger.warn('Redis cache unavailable, proceeding with database query');
    // }

    const dateRange =
      opts?.period === 'custom'
        ? toDateRange(startDate, endDate)
        : toPeriodDateRange(opts?.period);

    const depId = departmentId ? Number(departmentId) : undefined;
    const vacId = vacancyId ? vacancyId : undefined;

    const vacancyWhere: any = {
      company_id: Number(company_id),
      ...(dateRange ? { created_at: dateRange } : {}),
      ...(depId ? { department_id: depId } : {}),
      ...(vacId ? { id: vacId } : {}),
    };

    const applicationWhere: any = {
      company_id: Number(company_id),
      ...(dateRange ? { submitted_at: dateRange } : {}),
      ...(depId || vacId ? {
        vacancy: {
          ...(depId ? { department_id: depId } : {}),
          ...(vacId ? { id: vacId } : {}),
        }
      } : {}),
    };

    const hiredApplicationWhere: any = {
      company_id: Number(company_id),
      status: 'OFFER_ACCEPTED',
      ...(dateRange ? { updated_at: dateRange } : {}),
      ...(depId || vacId ? {
        vacancy: {
          ...(depId ? { department_id: depId } : {}),
          ...(vacId ? { id: vacId } : {}),
        }
      } : {}),
    };

    const interviewWhere: any = {
      application: {
        company_id: Number(company_id),
        ...(dateRange ? { submitted_at: dateRange } : {}),
        ...(depId || vacId ? {
          vacancy: {
            ...(depId ? { department_id: depId } : {}),
            ...(vacId ? { id: vacId } : {}),
          }
        } : {}),
      }
    };

    const offerWhere: any = {
      company_id: Number(company_id),
      ...(dateRange ? { created_at: dateRange } : {}),
      ...(depId || vacId ? {
        application: {
          vacancy: {
            ...(depId ? { department_id: depId } : {}),
            ...(vacId ? { id: vacId } : {}),
          }
        }
      } : {}),
    };

    const acceptedOfferWhere: any = {
      company_id: Number(company_id),
      status: 'ACCEPTED',
      ...(dateRange ? { updated_at: dateRange } : {}),
      ...(depId || vacId ? {
        application: {
          vacancy: {
            ...(depId ? { department_id: depId } : {}),
            ...(vacId ? { id: vacId } : {}),
          }
        }
      } : {}),
    };

    const [
      vacanciesList,
      openVacancies,
      applicationsList,
      hiredCount,
      hiredApplications,
      totalInterviews,
      approvedVacanciesCount,
      filledVacanciesCount,
    ] = await Promise.all([
      prisma.vacancy.findMany({
        where: vacancyWhere,
        select: { created_at: true }
      }),
      prisma.vacancy.count({
        where: {
          ...vacancyWhere,
          status: 'OPEN',
        },
      }),
      prisma.application.findMany({
        where: applicationWhere,
        select: { submitted_at: true }
      }),
      prisma.application.count({
        where: hiredApplicationWhere,
      }),
      prisma.application.findMany({
        where: hiredApplicationWhere,
        select: {
          submitted_at: true,
          updated_at: true,
          current_stage: true,
          vacancy: {
            select: {
              posted_at: true,
              created_at: true,
              approved_at: true,
            },
          },
        },
      }),
      prisma.interview.count({
        where: interviewWhere,
      }),
      prisma.vacancy.count({
        where: {
          company_id: Number(company_id),
          approved_at: { not: null },
          ...(depId ? { department_id: depId } : {}),
          ...(vacId ? { id: vacId } : {}),
        }
      }),
      prisma.vacancy.count({
        where: {
          company_id: Number(company_id),
          approved_at: { not: null },
          OR: [
            { filled_at: { not: null } },
            { status: 'CLOSED' }
          ],
          ...(depId ? { department_id: depId } : {}),
          ...(vacId ? { id: vacId } : {}),
        }
      }),
    ]);

    const totalVacancies = vacanciesList.length;
    const totalApplications = applicationsList.length;

    const fulfillmentRate =
      approvedVacanciesCount > 0 ? (filledVacanciesCount / approvedVacanciesCount) * 100 : 0;

    // Helper to generate 7-point trend array
    const generateTrend = (dates: Date[], start: Date, end: Date) => {
      const startMs = start.getTime();
      const endMs = end.getTime();
      const diff = endMs - startMs;
      const interval = Math.max(diff / 7, 1);
      const buckets = new Array(7).fill(0);
      
      dates.forEach(d => {
        const t = d.getTime();
        if (t >= startMs && t <= endMs) {
          const idx = Math.min(6, Math.floor((t - startMs) / interval));
          buckets[idx]++;
        }
      });
      return buckets;
    };

    const effectiveStart = dateRange?.gte || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const effectiveEnd = dateRange?.lte || new Date();

    const vacanciesTrend = generateTrend(
      vacanciesList.map(v => v.created_at),
      effectiveStart,
      effectiveEnd
    );

    const applicationsTrend = generateTrend(
      applicationsList.map(a => a.submitted_at),
      effectiveStart,
      effectiveEnd
    );

    const hiresTrend = generateTrend(
      hiredApplications.map(a => new Date(a.updated_at)),
      effectiveStart,
      effectiveEnd
    );

    // Simulate fulfillment trend (cumulative)
    const fulfillmentTrend = [0, 0, 0, 0, 0, 0, 0].map((_, i) => {
      const progress = (i + 1) / 7;
      return Number((fulfillmentRate * progress).toFixed(1));
    });

    const currentPeriodHires = hiredCount;
    // Calculate previous period for improvement
    const prevStartMs = effectiveStart.getTime() - (effectiveEnd.getTime() - effectiveStart.getTime());
    const prevStart = new Date(prevStartMs);
    const prevHiresCount = await prisma.application.count({
      where: {
        ...hiredApplicationWhere,
        updated_at: { gte: prevStart, lte: effectiveStart }
      }
    });

    let hiredImprovement = 0;
    if (prevHiresCount > 0) {
      hiredImprovement = ((currentPeriodHires - prevHiresCount) / prevHiresCount) * 100;
    } else if (currentPeriodHires > 0) {
      hiredImprovement = 100;
    }

    const stageCounts = await prisma.application.groupBy({
      by: ['current_stage'],
      where: applicationWhere,
      _count: { id: true },
    });

    const pipeline = stageCounts.map((item) => ({
      stage: item.current_stage,
      count: item._count.id,
    }));

    const screenedCount = totalApplications;
    const shortlistedCount = await prisma.application.count({
      where: {
        ...applicationWhere,
        current_stage: {
          in: ['SHORTLISTING', 'INTERVIEW', 'EVALUATION', 'OFFER', 'ONBOARDING', 'CLOSED']
        }
      }
    });

    const candidateConversionRate =
      screenedCount > 0 ? (shortlistedCount / screenedCount) * 100 : 0;

    const acceptedOffersForHire = await prisma.offer.findMany({
      where: acceptedOfferWhere,
      select: {
        accepted_at: true,
        application: {
          select: {
            submitted_at: true
          }
        }
      }
    });

    let timeToHireDays = 0;
    if (acceptedOffersForHire.length > 0) {
      const diffs = acceptedOffersForHire
        .map(o => {
          const acceptDate = o.accepted_at ? new Date(o.accepted_at) : null;
          const submitDate = o.application?.submitted_at ? new Date(o.application.submitted_at) : null;
          if (acceptDate && submitDate) {
            return (acceptDate.getTime() - submitDate.getTime()) / (1000 * 60 * 60 * 24);
          }
          return null;
        })
        .filter((d): d is number => d !== null);
      if (diffs.length > 0) timeToHireDays = avg(diffs);
    }

    if (timeToHireDays === 0 && hiredApplications.length > 0) {
      timeToHireDays = avg(
        hiredApplications
          .filter((app) => app.submitted_at && app.updated_at)
          .map((app) => {
            const submittedAt = new Date(app.submitted_at);
            const updatedAt = new Date(app.updated_at);
            return (
              (updatedAt.getTime() - submittedAt.getTime()) /
              (1000 * 60 * 60 * 24)
            );
          }),
      );
    }

    let timeToFillDays = 0;
    if (acceptedOffersForHire.length > 0) {
      const diffs = acceptedOffersForHire
        .map(o => {
          const acceptDate = o.accepted_at ? new Date(o.accepted_at) : null;
          const approvalDate = o.application?.vacancy?.approved_at ? new Date(o.application.vacancy.approved_at) : null;
          if (acceptDate && approvalDate) {
            return (acceptDate.getTime() - approvalDate.getTime()) / (1000 * 60 * 60 * 24);
          }
          return null;
        })
        .filter((d): d is number => d !== null);
      if (diffs.length > 0) timeToFillDays = avg(diffs);
    }

    if (timeToFillDays === 0 && hiredApplications.length > 0) {
      timeToFillDays = avg(
        hiredApplications
          .map((app) => {
            const postedAt = app.vacancy?.posted_at ?? app.vacancy?.created_at;
            if (!postedAt) {
              return null;
            }
            const hiredAt = new Date(app.updated_at);
            const startAt = new Date(postedAt);
            return (
              (hiredAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24)
            );
          })
          .filter((value): value is number => value !== null),
      );
    }

    const totalOffers = await safeCount(
      () =>
        prisma.offer.count({
          where: offerWhere,
        }),
      'Offer',
    );

    const acceptedOffersCount = await safeCount(
      () =>
        prisma.offer.count({
          where: acceptedOfferWhere,
        }),
      'Offer',
    );

    const offerAcceptanceRate =
      totalOffers > 0 ? (acceptedOffersCount / totalOffers) * 100 : 0;

    const talentRosterHiresCount = await safeCount(
      () =>
        prisma.application.count({
          where: {
            ...hiredApplicationWhere,
            sourced_from_roster: true,
          },
        }),
      'TalentRosterHires',
    );

    const talentRosterUtilizationRate =
      hiredCount > 0 ? (talentRosterHiresCount / hiredCount) * 100 : 0;

    const interviewToSelectionRatio =
      hiredCount > 0 ? totalInterviews / hiredCount : totalInterviews;

    const sourceApplications = await prisma.application.groupBy({
      by: ['recruitment_source_id'],
      where: applicationWhere,
      _count: { id: true },
    });

    const recruitmentSources = await prisma.recruitmentSource.findMany({
      where: { company_id: Number(company_id) },
      select: { id: true, name: true },
    });
    const sourceMap = new Map(recruitmentSources.map(s => [s.id, s.name]));

    const sourcing = sourceApplications.map((item) => ({
      source: item.recruitment_source_id ? (sourceMap.get(item.recruitment_source_id) || 'Unknown') : 'Direct Application',
      count: item._count.id,
    }));

    const finalSourcing = sourcing.length > 0 ? sourcing : [
      { source: 'Direct Application', count: 0 }
    ];

    const report = {
      summary: {
        totalVacancies,
        openVacancies,
        totalApplications,
        hiredCount,
        fulfillmentRate: `${fulfillmentRate.toFixed(1)}%`,
      },
      sourcing: finalSourcing,
      pipeline,
      kpis: {
        averageTimeToFillDays: Number(timeToFillDays.toFixed(1)),
        averageTimeToHireDays: Number(timeToHireDays.toFixed(1)),
        offerAcceptanceRate: `${offerAcceptanceRate.toFixed(1)}%`,
        candidateConversionRate: `${candidateConversionRate.toFixed(1)}%`,
        interviewToSelectionRatio: Number(interviewToSelectionRatio.toFixed(2)),
        talentRosterUtilizationRate: `${talentRosterUtilizationRate.toFixed(1)}%`,
        totals: {
          totalOffers,
          acceptedOffersCount,
          totalInterviews,
        },
      },
      trends: {
        vacancies: vacanciesTrend,
        applications: applicationsTrend,
        hires: hiresTrend,
        fulfillment: fulfillmentTrend,
        hiredImprovement: Number(hiredImprovement.toFixed(1)),
      }
    };

    // Disable caching for dashboard to ensure period filter changes are reflected immediately
    // try {
    //   await redisClient.setEx(cacheKey, 300, JSON.stringify(report));
    // } catch (redisError) {
    //   logger.warn('Failed to cache dashboard stats');
    // }
    return report;
  }

  static async generateHiringMinute(company_id: string, vacancyId: string, preparedById: string) {
    const vacancy = await prisma.vacancy.findFirst({
      where: {
        id: vacancyId,
        company_id: Number(company_id),
      },
      include: {
        recruitment_request: true,
        applications: {
          include: {
            candidate: true,
            interviews: {
              include: {
                interview_evaluations: true,
              }
            }
          }
        },
        screening_logs: true,
        shortlisted_candidates: true,
      }
    });

    if (!vacancy) {
      throw new Error('Vacancy not found or unauthorized');
    }

    const applications = vacancy.applications || [];
    const total_applications = applications.length;
    const total_screened = vacancy.screening_logs.length;
    const total_shortlisted = vacancy.shortlisted_candidates.length;
    const total_interviewed = applications.filter(app => app.interviews.length > 0).length;

    const selectedApp = applications.find(app =>
      ['SELECTED', 'OFFER_ACCEPTED', 'OFFER_ISSUED'].includes(app.status)
    );
    const selected_candidate_id = selectedApp?.candidate_id || null;

    const alternativeApp = applications.find(app =>
      app.status === 'SHORTLISTED' && app.candidate_id !== selected_candidate_id
    );
    const alternative_candidate_id = alternativeApp?.candidate_id || null;

    const candidate_evaluation_summary = applications
      .filter(app => app.interviews.length > 0)
      .map(app => {
        const evaluations = app.interviews.flatMap(i => i.interview_evaluations || []);
        const avgScore = evaluations.length > 0 ? avg(evaluations.map(e => e.overall_score)) : 0;
        return {
          candidate_id: app.candidate_id,
          name: `${app.candidate.first_name} ${app.candidate.last_name}`,
          score: avgScore,
          recommendation: evaluations[0]?.recommendation || null,
        };
      });

    const rejected_candidates_json = applications
      .filter(app => app.status === 'REJECTED')
      .map(app => ({
        candidate_id: app.candidate_id,
        name: `${app.candidate.first_name} ${app.candidate.last_name}`,
        rejection_reason: app.rejection_reason || 'Not qualified',
      }));

    const hiringMinute = await prisma.hiringMinute.upsert({
      where: { vacancy_id: vacancyId },
      create: {
        vacancy_id: vacancyId,
        prepared_by_id: preparedById,
        recruitment_request_type: vacancy.recruitment_request?.request_type || 'NEW_HEADCOUNT',
        recruitment_classification: vacancy.recruitment_request?.planning_type || 'PLANNED',
        application_type: vacancy.application_type,
        total_applications,
        total_screened,
        total_shortlisted,
        total_interviewed,
        selected_candidate_id,
        alternative_candidate_id,
        candidate_evaluation_summary: candidate_evaluation_summary as any,
        rejected_candidates_json: rejected_candidates_json as any,
        panel_recommendation: 'RECOMMEND_HIRING',
      },
      update: {
        total_applications,
        total_screened,
        total_shortlisted,
        total_interviewed,
        selected_candidate_id,
        alternative_candidate_id,
        candidate_evaluation_summary: candidate_evaluation_summary as any,
        rejected_candidates_json: rejected_candidates_json as any,
      },
      include: {
        vacancy: true,
        prepared_by: {
          select: { first_name: true, last_name: true }
        },
        selected_candidate: true,
        alternative_candidate: true,
      }
    });

    return hiringMinute;
  }
}

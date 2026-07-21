import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { talentRosterDTO } from '../types/offer.types';
import { Decimal } from '@prisma/client/runtime/library';
import {
  notifyTalentRosterAdded,
} from '../utils/notificationWiring';

export class RoasterService {
  static async addToRoaster(
    company_id: string | number,
    user_id: string,
    data: talentRosterDTO,
  ) {
    // Check if candidate already exists in roster
    const existing = await prisma.talentRoster.findFirst({
      where: {
        company_id: Number(company_id),
        candidate_id: data.candidate_id,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      throw new AppError('Candidate already exists in talent roster', 400);
    }

    // Check eligibility rules
    const candidate = await prisma.candidate.findUnique({
      where: { id: data.candidate_id },
      include: {
        applications: {
          where: { vacancy: { company_id: Number(company_id) } },
          include: { vacancy: true },
        },
      },
    });

    if (!candidate) {
      throw new AppError('Candidate not found', 404);
    }

    // Eligibility rule: Only candidates with at least one application can be added
    if (candidate.applications.length === 0) {
      throw new AppError('Candidate must have at least one application to be added to talent roster', 400);
    }

    // Eligibility rule: Check if candidate was rejected
    const hasRejection = candidate.applications.some(
      (app) => app.status === 'REJECTED'
    );

    if (!hasRejection && !data.force_add) {
      throw new AppError('Only rejected or unsuccessful candidates can be added to talent roster', 400);
    }

    const roster = await prisma.talentRoster.create({
      data: {
        company_id: Number(company_id),
        candidate_id: data.candidate_id,
        talent_category: data.category,
        availability_status: 'IMMEDIATELY',
        notes: data.notes,
        added_by: user_id,
        source_stage: data.source_stage as any,
        sourced_from_vacancy_id: data.sourced_from_vacancy_id,
        expected_salary: data.expected_salary ? new Decimal(data.expected_salary) : null,
        recruitment_source_id: data.recruitment_source_id,
      },
    });

    // Log activity for history persistence
    await prisma.activityLog.create({
      data: {
        company_id: Number(company_id),
        user_id,
        action: 'added_to_roster',
        entity_type: 'TalentRoster',
        entity_id: roster.id,
        description: `Candidate added to Talent Roster. Category: ${data.category || 'General Talent Pool'}`,
      },
    });

    // Fire-and-forget notification to candidate
    setImmediate(async () => {
      try {
        const candidate = await prisma.candidate.findUnique({ where: { id: data.candidate_id } });
        const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}`.trim() : 'Candidate';
        await notifyTalentRosterAdded(
          Number(company_id),
          data.candidate_id,
          candidateName,
        );
      } catch (e) { /* swallow */ }
    });

    return roster;
  }

  static async getRoaster(
    company_id: string | number,
    filters?: {
      search?: string;
      skill?: string;
      tier?: string;
      department?: string;
      minExperience?: number;
      availability?: string;
    },
  ) {
    const where: any = {
      company_id: Number(company_id),
      status: 'ACTIVE',
    };

    // Build search filter
    if (filters?.search) {
      where.OR = [
        { candidate: { first_name: { contains: filters.search, mode: 'insensitive' } } },
        { candidate: { last_name: { contains: filters.search, mode: 'insensitive' } } },
        { candidate: { email: { contains: filters.search, mode: 'insensitive' } } },
        { candidate: { current_position: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // Build availability filter
    if (filters?.availability) {
      where.availability_status = filters.availability.toUpperCase();
    }

    // Build tier filter (based on talent_category)
    if (filters?.tier) {
      const tierMapping: Record<string, string[]> = {
        high_potential: ['Senior', 'Lead', 'Investment'],
        standard: ['General', 'Standard'],
        developing: ['Develop', 'Intern'],
      };
      const categories = tierMapping[filters.tier] || [];
      if (categories.length > 0) {
        where.talent_category = {
          in: categories,
        };
      }
    }

    const results = await prisma.talentRoster.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            current_position: true,
            years_of_experience: true,
            skills: true,
            availability_status: true,
            educations: {
              select: {
                degree: true,
                institution_name: true,
                field_of_study: true,
              },
              take: 1,
              orderBy: { graduation_year: 'desc' },
            },
          },
        },
        user: {
          select: { first_name: true, last_name: true },
        },
      },
      orderBy: { added_at: 'desc' },
    });

    // Apply client-side filters that can't be done in SQL
    let filtered = results;
    
    // Case-insensitive skill filter
    if (filters?.skill) {
      const skillLower = filters.skill.toLowerCase();
      filtered = filtered.filter((r) => 
        r.candidate.skills.some((skill: string) => skill.toLowerCase() === skillLower)
      );
    }
    
    if (filters?.minExperience) {
      filtered = filtered.filter((r) =>
        (r.candidate.years_of_experience ?? 0) >= filters.minExperience!
      );
    }

    return filtered;
  }

  static async linkCandidateToVacancy(
    company_id: string | number,
    roster_id: string,
    vacancy_id: string,
    user_id: string,
  ) {
    const roster = await prisma.talentRoster.findUnique({
      where: { id: roster_id },
      include: { candidate: true },
    });

    if (!roster) {
      throw new AppError('Talent roster entry not found', 404);
    }

    if (roster.company_id !== Number(company_id)) {
      throw new AppError('Unauthorized access to talent roster entry', 403);
    }

    // Check if vacancy exists and belongs to company
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancy_id },
    });

    if (!vacancy || vacancy.company_id !== Number(company_id)) {
      throw new AppError('Vacancy not found or unauthorized', 404);
    }

    // Check if application already exists for this candidate and vacancy
    const existingApp = await prisma.application.findFirst({
      where: {
        candidate_id: roster.candidate_id,
        vacancy_id,
      },
    });

    if (existingApp) {
      // Allow re-linking - just update the sourced_from_vacancy_id
      await prisma.talentRoster.update({
        where: { id: roster_id },
        data: {
          sourced_from_vacancy_id: vacancy_id,
        },
      });

      // Log the re-link activity too
      await prisma.activityLog.create({
        data: {
          company_id: Number(company_id),
          user_id,
          action: 'linked_to_vacancy',
          entity_type: 'TalentRoster',
          entity_id: roster_id,
          description: `Candidate re-linked to vacancy: ${vacancy.title}`,
        },
      });

      return existingApp;
    }

    // Create new application with historical data
    const application = await prisma.application.create({
      data: {
        company_id: Number(company_id),
        candidate_id: roster.candidate_id,
        vacancy_id,
        current_stage: 'SCREENING',
        sourced_from_roster: true,
        submitted_at: new Date(),
        cover_letter_text: `Transferred from Talent Roster. Category: ${roster.talent_category}`,
      },
    });

    // Update roster to track linkage but keep candidate on roster
    await prisma.talentRoster.update({
      where: { id: roster_id },
      data: {
        sourced_from_vacancy_id: vacancy_id,
      },
    });

    // Log activity for history persistence
    await prisma.activityLog.create({
      data: {
        company_id: Number(company_id),
        user_id,
        action: 'linked_to_vacancy',
        entity_type: 'TalentRoster',
        entity_id: roster_id,
        description: `Candidate linked to vacancy: ${vacancy.title}`,
      },
    });

    return application;
  }

  static async getAllRosterActivity(company_id: string | number) {
    // Fetch all TalentRoster activity logs for the company, newest first
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        company_id: Number(company_id),
        entity_type: 'TalentRoster',
      },
      orderBy: { created_at: 'desc' },
    });

    // Enrich each log with candidate name by joining via TalentRoster
    const rosterIds = [...new Set(activityLogs.map((l) => l.entity_id))];

    const rosters = await prisma.talentRoster.findMany({
      where: { id: { in: rosterIds } },
      include: {
        candidate: { select: { first_name: true, last_name: true } },
      },
    });

    const rosterMap = new Map(rosters.map((r) => [r.id, r]));

    const enriched = activityLogs.map((log) => {
      const roster = rosterMap.get(log.entity_id);
      const candidateName = roster
        ? `${roster.candidate.first_name} ${roster.candidate.last_name}`.trim()
        : 'Unknown Candidate';
      return { ...log, candidateName };
    });

    // Summary stats
    const totalActive = await prisma.talentRoster.count({
      where: { company_id: Number(company_id), status: 'ACTIVE' },
    });
    const totalAll = await prisma.talentRoster.count({
      where: { company_id: Number(company_id) },
    });
    const linkedCount = await prisma.talentRoster.count({
      where: {
        company_id: Number(company_id),
        status: 'ACTIVE',
        sourced_from_vacancy_id: { not: null },
      },
    });
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const addedThisMonth = await prisma.talentRoster.count({
      where: {
        company_id: Number(company_id),
        added_at: { gte: startOfMonth },
      },
    });

    return {
      activityLogs: enriched,
      summary: { totalActive, totalAll, linkedCount, addedThisMonth },
    };
  }

  static async getRosterHistory(
    company_id: string | number,
    roster_id: string,
  ) {
    try {
      const roster = await prisma.talentRoster.findUnique({
        where: { id: roster_id },
        include: {
          candidate: {
            include: {
              applications: {
                include: {
                  vacancy: {
                    select: {
                      id: true,
                      title: true,
                      status: true,
                      company_id: true,
                    },
                  },
                },
                orderBy: { submitted_at: 'desc' },
              },
            },
          },
        },
      });

      if (!roster || roster.company_id !== Number(company_id)) {
        throw new AppError('Talent roster entry not found', 404);
      }

      // Filter applications to only those belonging to the company
      const filteredApplications = roster.candidate?.applications.filter(
        (app) => app.vacancy.company_id === Number(company_id)
      ) || [];

      // Fetch interviews and evaluations separately for each application
      const applicationsWithInterviews = await Promise.all(
        filteredApplications.map(async (app) => {
          try {
            const interviews = await prisma.interview.findMany({
              where: { application_id: app.id },
              include: {
                interview_panels: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        first_name: true,
                        last_name: true,
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
                      },
                    },
                  },
                },
              },
              orderBy: { start_time: 'desc' },
            });
            return { ...app, interviews };
          } catch (error) {
            // If interviews fail to load, return app without interviews
            console.error('Error fetching interviews for application:', app.id, error);
            return { ...app, interviews: [] };
          }
        })
      );

      // Fetch all activity logs for this roster entry (persistent history)
      const activityLogs = await prisma.activityLog.findMany({
        where: {
          company_id: Number(company_id),
          entity_type: 'TalentRoster',
          entity_id: roster_id,
        },
        orderBy: { created_at: 'desc' },
      });

      return {
        roster,
        historicalApplications: applicationsWithInterviews,
        activityLogs,
      };
    } catch (error) {
      console.error('Error in getRosterHistory:', error);
      throw error;
    }
  }

  static async removeFromRoaster(
    company_id: string | number,
    roster_id: string,
    user_id: string,
    reason?: string,
  ) {
    const roster = await prisma.talentRoster.findUnique({
      where: { id: roster_id },
    });

    if (!roster) {
      throw new AppError('Talent roster entry not found', 404);
    }

    if (roster.company_id !== Number(company_id)) {
      throw new AppError('Unauthorized access to talent roster entry', 403);
    }

    await prisma.talentRoster.update({
      where: { id: roster_id },
      data: {
        status: 'INACTIVE',
        notes: reason ? `Removed: ${reason}` : roster.notes,
      },
    });

    // Log activity with reason
    await prisma.activityLog.create({
      data: {
        company_id: Number(company_id),
        user_id,
        action: 'removed_from_roster',
        entity_type: 'TalentRoster',
        entity_id: roster_id,
        description: reason
          ? `Candidate removed from Talent Roster. Reason: ${reason}`
          : `Candidate removed from Talent Roster`,
      },
    });

    return { success: true };
  }
}

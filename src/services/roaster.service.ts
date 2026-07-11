import prisma from '../config/database';
import { talentRosterDTO } from '../types/offer.types';

export class RoasterService {
  static async addToRoaster(
    company_id: string | number,
    user_id: string,
    data: talentRosterDTO,
  ) {
    return await prisma.talentRoster.create({
      data: {
        company_id: Number(company_id),
        candidate_id: data.candidate_id,
        talent_category: data.category,
        availability_status: 'IMMEDIATELY',
        notes: data.notes,
        added_by: user_id,
      },
    });
  }

  static async getRoaster(company_id: string | number) {
    return await prisma.talentRoster.findMany({
      where: {
        company_id: Number(company_id),
        status: 'ACTIVE',
      },
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
  }
}

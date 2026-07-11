import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { CreateOfferDTO } from '../types/offer.types';

export class OfferService {
  // Issue an offer to a candidate and update the application status
  static async createOffer(company_id: number, user_id: string, data: CreateOfferDTO) {
    const app = await prisma.application.findUnique({
      where: { id: data.application_id },
      include: { candidate: true },
    });
    if (!app || app.company_id !== company_id) {
      throw new AppError('Application not found', 404);
    }

    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.create({
        data: {
          company_id,
          application_id: data.application_id,
          candidate_id: app.candidate_id,
          created_by_user_id: user_id,
          salary: data.salary,
          start_date: new Date(data.start_date),
          expiry_date: new Date(data.expiry_date),
          status: 'SENT',
          offer_notes: data.offer_notes,
        },
        include: {
          application: true,
          candidate: true,
        },
      });

      await tx.application.update({
        where: { id: data.application_id },
        data: { status: 'OFFER_ISSUED', current_stage: 'OFFER' },
      });

      return offer;
    });
  }

  // HR-side: returns all offers for a company
  static async getOffers(company_id: number) {
    return await prisma.offer.findMany({
      where: { company_id },
      include: {
        application: {
          select: {
            vacancy: { select: { id: true, title: true, location: true } },
          },
        },
        candidate: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}

import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { CreateOfferDTO } from '../types/offer.types';

export class OfferService {
  // Issue an offer to a candidate and update the application status
  static async createOffer(
    company_id: number,
    user_id: string,
    data: CreateOfferDTO,
  ) {
    const app = await prisma.application.findUnique({
      where: { id: data.application_id },
      include: { candidate: true, vacancy: true },
    });
    if (!app || app.company_id !== company_id) {
      throw new AppError('Application not found', 404);
    }

    const offer = await prisma.$transaction(async (tx) => {
      const created = await tx.offer.create({
        data: {
          company_id,
          application_id: data.application_id,
          candidate_id: app.candidate_id,
          created_by_user_id: user_id,
          salary: data.salary,
          employment_type: data.employment_type
            ? data.employment_type
            : undefined,
          template_id: data.template_id || undefined,
          allowances: data.allowances ? data.allowances : undefined,
          start_date: new Date(data.start_date),
          expiry_date: new Date(data.expiry_date),
          status: 'SENT',
          offer_notes: data.offer_notes,
        },
        include: {
          application: {
            include: {
              vacancy: {
                select: { id: true, title: true, location: true, department: { select: { name: true } } },
              },
            },
          },
          candidate: true,
        },
      });

      await tx.application.update({
        where: { id: data.application_id },
        data: { status: 'OFFER_ISSUED', current_stage: 'OFFER' },
      });

      return created;
    });

    // Fire-and-forget notification to candidate
    setImmediate(async () => {
      try {
        const { notifyOfferIssued } = await import('../utils/notificationWiring');
        const candidate = offer.candidate;
        const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}`.trim() : 'Candidate';
        const vacancyTitle = (offer.application as any)?.vacancy?.title || 'Position';
        const expiryDate = new Date(offer.expiry_date).toLocaleDateString();
        await notifyOfferIssued(
          company_id,
          offer.candidate_id,
          candidateName,
          vacancyTitle,
          expiryDate,
        );
      } catch (e) { /* swallow */ }
    });

    return offer;
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

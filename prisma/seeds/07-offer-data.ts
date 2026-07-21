import 'dotenv/config';
import {
  Prisma,
  ApplicationStatus,
  ApplicationStage,
  OfferStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../../src/config/database';

async function main() {
  try {
    // Get company
    const company = await prisma.company.findUnique({
      where: { company_code: 'ADIU' },
    });
    if (!company) {
      throw new Error('Company not found. Run 01-base-data.ts first.');
    }

    // Get users
    const users = await prisma.user.findMany({
      where: { company_id: company.id },
    });
    const userMap: Record<string, any> = users.reduce((map: Record<string, any>, user: any) => {
      map[user.email] = user;
      return map;
    }, {});

    // Get candidates
    const candidates = await prisma.candidate.findMany({
      where: { company_id: company.id },
    });
    const seededCandidates = candidates.slice(0, 10); // Background candidates

    // Get vacancies
    const vacancies = await prisma.vacancy.findMany({
      where: { company_id: company.id },
    });
    const seededVacancies = vacancies.slice(0, 14); // Status-coverage vacancies

    // Get departments
    const departments = await prisma.department.findMany({
      where: { company_id: company.id },
    });
    const departmentMap: Record<string, any> = departments.reduce((map: Record<string, any>, dept: any) => {
      map[dept.name] = dept;
      return map;
    }, {});

    // Helper to create application
    async function createApp(
      candId: string,
      vacId: string,
      status: ApplicationStatus,
      stage: ApplicationStage,
      daysAgo = 0,
    ) {
      if (!company) throw new Error('Company not found');
      const appId = randomUUID();
      const app = await prisma.application.create({
        data: {
          id: appId,
          company_id: company.id,
          candidate_id: candId,
          vacancy_id: vacId,
          status,
          current_stage: stage,
          submitted_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.applicationStageHistory.create({
        data: {
          id: randomUUID(),
          application_id: app.id,
          from_stage: null,
          to_stage: stage,
          notes: `Seeded at ${stage}`,
        },
      });
      return app;
    }

    // ── 1. Create SELECTED applications for offer creation ─────────────────────
    console.log('📝 Creating SELECTED applications for offer creation...');

    const selectedApp1 = await createApp(
      seededCandidates[0].id,
      seededVacancies[0].id,
      ApplicationStatus.SELECTED,
      ApplicationStage.OFFER,
      5,
    );

    const selectedApp2 = await createApp(
      seededCandidates[1].id,
      seededVacancies[1].id,
      ApplicationStatus.SELECTED,
      ApplicationStage.OFFER,
      7,
    );

    const selectedApp3 = await createApp(
      seededCandidates[2].id,
      seededVacancies[2].id,
      ApplicationStatus.SELECTED,
      ApplicationStage.OFFER,
      10,
    );

    // ── 2. Create offers with different statuses ───────────────────────────────
    console.log('📝 Creating offers with different statuses...');

    // SENT offer
    await prisma.offer.create({
      data: {
        id: randomUUID(),
        company_id: company.id,
        application_id: selectedApp1.id,
        candidate_id: seededCandidates[0].id,
        created_by_user_id: userMap['recruiter1@erms.com'].id,
        salary: new Prisma.Decimal(55000),
        employment_type: 'FULL_TIME',
        start_date: new Date('2026-08-01'),
        expiry_date: new Date('2026-07-15'),
        status: OfferStatus.SENT,
        offer_notes: 'Standard benefits package included',
        allowances: {
          transport: 2000,
          housing: 3000,
        },
      },
    });

    // ACCEPTED offer
    const acceptedApp = await createApp(
      seededCandidates[3].id,
      seededVacancies[3].id,
      ApplicationStatus.OFFER_ACCEPTED,
      ApplicationStage.OFFER,
      15,
    );

    await prisma.offer.create({
      data: {
        id: randomUUID(),
        company_id: company.id,
        application_id: acceptedApp.id,
        candidate_id: seededCandidates[3].id,
        created_by_user_id: userMap['recruiter1@erms.com'].id,
        salary: new Prisma.Decimal(65000),
        employment_type: 'FULL_TIME',
        start_date: new Date('2026-08-15'),
        expiry_date: new Date('2026-07-20'),
        status: OfferStatus.ACCEPTED,
        offer_notes: 'Accepted offer with senior benefits',
        accepted_at: new Date('2026-07-10'),
        allowances: {
          transport: 2500,
          housing: 4000,
        },
      },
    });

    // DECLINED offer
    const declinedApp = await createApp(
      seededCandidates[4].id,
      seededVacancies[4].id,
      ApplicationStatus.OFFER_DECLINED,
      ApplicationStage.OFFER,
      20,
    );

    await prisma.offer.create({
      data: {
        id: randomUUID(),
        company_id: company.id,
        application_id: declinedApp.id,
        candidate_id: seededCandidates[4].id,
        created_by_user_id: userMap['recruiter1@erms.com'].id,
        salary: new Prisma.Decimal(45000),
        employment_type: 'PART_TIME',
        start_date: new Date('2026-08-01'),
        expiry_date: new Date('2026-07-10'),
        status: OfferStatus.DECLINED,
        offer_notes: 'Declined due to better offer elsewhere',
        declined_reason: 'Received higher offer from competitor',
        rejected_at: new Date('2026-07-05'),
        allowances: {},
      },
    });

    // EXPIRED offer
    const expiredApp = await createApp(
      seededCandidates[5].id,
      seededVacancies[5].id,
      ApplicationStatus.OFFER_ISSUED,
      ApplicationStage.OFFER,
      30,
    );

    await prisma.offer.create({
      data: {
        id: randomUUID(),
        company_id: company.id,
        application_id: expiredApp.id,
        candidate_id: seededCandidates[5].id,
        created_by_user_id: userMap['recruiter2@erms.com'].id,
        salary: new Prisma.Decimal(50000),
        employment_type: 'CONTRACT',
        start_date: new Date('2026-07-01'),
        expiry_date: new Date('2026-06-20'),
        status: OfferStatus.EXPIRED,
        offer_notes: 'Expired offer - candidate did not respond',
        allowances: {
          transport: 1500,
        },
      },
    });

    // ── 3. Create additional SELECTED applications for testing ─────────────────
    console.log('📝 Creating additional SELECTED applications for testing...');

    await createApp(
      seededCandidates[6].id,
      seededVacancies[6].id,
      ApplicationStatus.SELECTED,
      ApplicationStage.OFFER,
      2,
    );

    await createApp(
      seededCandidates[7].id,
      seededVacancies[7].id,
      ApplicationStatus.SELECTED,
      ApplicationStage.OFFER,
    );

    await createApp(
      seededCandidates[8].id,
      seededVacancies[8].id,
      ApplicationStatus.SELECTED,
      ApplicationStage.OFFER,
    );

    console.log('✅ Offer data seeded successfully!');
    console.log('   - 3 SELECTED applications ready for offer creation');
    console.log('   - 4 offers with different statuses (SENT, ACCEPTED, DECLINED, EXPIRED)');
    console.log('   - 3 additional SELECTED applications for testing');

  } catch (error) {
    console.error('❌ Error seeding offer data:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

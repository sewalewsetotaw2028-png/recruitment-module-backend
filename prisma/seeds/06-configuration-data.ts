import 'dotenv/config';
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

    // Get vacancies
    const vacancies = await prisma.vacancy.findMany({
      where: { company_id: company.id },
    });
    const seededVacancies = vacancies.slice(0, 14); // Status-coverage vacancies
    const browseVacancies = vacancies.slice(14); // Browse vacancies

    // ── 1. Recruitment Sources ───────────────────────────────────────────────────
    const defaultRecruitmentSources = [
      {
        name: 'Company Website',
        description: 'Direct applications from company careers page',
        is_active: true,
      },
      {
        name: 'LinkedIn',
        description: 'LinkedIn job applications',
        is_active: true,
      },
      {
        name: 'Employee Referral',
        description: 'Referrals from current employees',
        is_active: true,
      },
      {
        name: 'Job Fair',
        description: 'Applications from job fairs',
        is_active: true,
      },
    ];
    const seededSources: Record<string, any> = {};
    for (const source of defaultRecruitmentSources) {
      const existing = await prisma.recruitmentSource.findFirst({
        where: { company_id: company.id, name: source.name },
      });
      if (existing) {
        seededSources[source.name] = await prisma.recruitmentSource.update({
          where: { id: existing.id },
          data: {
            description: source.description,
            is_active: source.is_active,
          },
        });
      } else {
        seededSources[source.name] = await prisma.recruitmentSource.create({
          data: {
            company_id: company.id,
            name: source.name,
            description: source.description,
            is_active: source.is_active,
          },
        });
      }
    }
    console.log('✓ Recruitment sources created');

    // ── 2. Recruitment Channels ─────────────────────────────────────────────────
    const defaultRecruitmentChannels = [
      {
        name: 'Company Website',
        description: 'Jobs on company careers page',
        is_automated: true,
        share_template: 'Careers page listing',
      },
      {
        name: 'LinkedIn',
        description: 'LinkedIn posting integration',
        is_automated: true,
      },
      {
        name: 'Facebook',
        description: 'Facebook job posting integration',
        is_automated: false,
      },
      {
        name: 'Telegram',
        description: 'Telegram broadcast channel',
        is_automated: false,
      },
      {
        name: 'Employee Referral',
        description: 'Referral distribution channel',
        is_automated: false,
      },
      {
        name: 'Indeed',
        description: 'Indeed job board integration',
        is_automated: true,
      },
      {
        name: 'Glassdoor',
        description: 'Glassdoor job board integration',
        is_automated: true,
      },
      {
        name: 'CareerBuilder',
        description: 'CareerBuilder job board integration',
        is_automated: true,
      },
      {
        name: 'Twitter/X',
        description: 'Twitter/X job posting integration',
        is_automated: false,
      },
      {
        name: 'Instagram',
        description: 'Instagram job posting integration',
        is_automated: false,
      },
      {
        name: 'University Portal',
        description: 'University career portal posting',
        is_automated: false,
      },
    ];
    const seededChannels: Record<string, any> = {};
    for (const channel of defaultRecruitmentChannels) {
      const existing = await prisma.recruitmentChannel.findFirst({
        where: { company_id: company.id, name: channel.name },
      });
      if (existing) {
        seededChannels[channel.name] = await prisma.recruitmentChannel.update({
          where: { id: existing.id },
          data: {
            description: channel.description,
            is_automated: channel.is_automated,
            share_template: channel.share_template,
            is_active: true,
          },
        });
      } else {
        seededChannels[channel.name] = await prisma.recruitmentChannel.create({
          data: {
            company_id: company.id,
            name: channel.name,
            description: channel.description,
            is_automated: channel.is_automated,
            share_template: channel.share_template,
            is_active: true,
          },
        });
      }
    }
    console.log('✓ Recruitment channels created');

    // ── 3. Job Postings on PUBLISHED/OPEN/IN_PROGRESS Vacancies ────────────────
    const publishedVacancyIds = [
      seededVacancies[2]?.id,
      seededVacancies[3]?.id,
      seededVacancies[4]?.id,
      seededVacancies[5]?.id,
      seededVacancies[6]?.id,
      seededVacancies[7]?.id,
      ...browseVacancies.map((v: any) => v.id),
    ].filter(Boolean);

    const channelAssignments = [
      ['Company Website', 'LinkedIn'],
      ['Company Website', 'Telegram'],
      ['LinkedIn', 'Indeed'],
      ['Facebook', 'LinkedIn'],
      ['Company Website', 'Glassdoor'],
      ['LinkedIn', 'Indeed'],
      ['Company Website'],
      ['LinkedIn'],
      ['Indeed', 'Telegram'],
      ['Company Website', 'Facebook'],
      ['LinkedIn', 'Glassdoor'],
      ['Company Website', 'Indeed'],
    ];

    // NOTE: VacancyJobPosting has no @@unique constraint in schema.prisma on
    // (vacancy_id, recruitment_channel_id), so a bare create() + catch-and-ignore
    // is NOT idempotent — re-running this seed will duplicate postings every time.
    // We guard manually by checking for an existing row first.
    let createdPostings = 0;
    let skippedPostings = 0;
    for (let i = 0; i < publishedVacancyIds.length; i++) {
      const channelNames = channelAssignments[i % channelAssignments.length];
      for (const channelName of channelNames) {
        const channel = seededChannels[channelName];
        if (!channel) continue;

        const existingPosting = await prisma.vacancyJobPosting.findFirst({
          where: {
            vacancy_id: publishedVacancyIds[i],
            recruitment_channel_id: channel.id,
          },
        });

        if (existingPosting) {
          skippedPostings++;
          continue;
        }

        await prisma.vacancyJobPosting.create({
          data: {
            company_id: company.id,
            vacancy_id: publishedVacancyIds[i],
            recruitment_channel_id: channel.id,
            posting_status: 'PUBLISHED',
            posted_at: new Date(),
          },
        });
        createdPostings++;
      }
    }
    console.log(
      `✓ Job postings created (${createdPostings} created, ${skippedPostings} already existed)`,
    );

    // ── 4. Default Evaluation Template ─────────────────────────────────────────────
    const existingTemplate = await prisma.interviewEvaluationTemplate.findFirst({
      where: {
        company_id: company.id,
        interview_category_id: null,
        name: 'Standard Interview Evaluation',
      },
    });

    if (!existingTemplate) {
      const defaultTemplate = await prisma.interviewEvaluationTemplate.create({
        data: {
          company_id: company.id,
          name: 'Standard Interview Evaluation',
          interview_category_id: null,
          is_active: true,
        },
      });

      const defaultCriteria = [
        { name: 'Technical Skills', weight: 25, max_score: 10, order: 1 },
        { name: 'Communication Skills', weight: 20, max_score: 10, order: 2 },
        { name: 'Problem Solving', weight: 20, max_score: 10, order: 3 },
        { name: 'Cultural Fit', weight: 15, max_score: 10, order: 4 },
        { name: 'Relevant Experience', weight: 20, max_score: 10, order: 5 },
      ];

      await prisma.evaluationCriteria.createMany({
        data: defaultCriteria.map((c) => ({
          template_id: defaultTemplate.id,
          ...c,
        })),
      });

      console.log('✓ Default evaluation template created');
    } else {
      console.log('✓ Default evaluation template already exists');
    }

    console.log('\n✅ Configuration data seeded successfully!');
    console.log('─────────────────────────────────────────────────────────');
  } catch (error) {
    console.error('Error seeding configuration data:', error);
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

import 'dotenv/config';
import { Prisma } from '@prisma/client';
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

    // Get applications
    const applications = await prisma.application.findMany({
      where: { company_id: company.id },
    });
    const appMap: Record<string, any> = applications.reduce((map: Record<string, any>, app: any) => {
      map[app.id] = app;
      return map;
    }, {});

    // ── 1. Interview Categories ─────────────────────────────────────────────────
    const seededCategories: Record<string, any> = {};
    for (const category of [
      { name: 'HR Interview', description: 'General HR stage', is_default: true },
      { name: 'Technical Interview', description: 'Role-specific technical stage', is_default: false },
      { name: 'Managerial Interview', description: 'Line manager/leadership panel', is_default: false },
      { name: 'Final Interview', description: 'Final decision interview stage', is_default: false },
    ]) {
      seededCategories[category.name] = await prisma.interviewCategory.upsert({
        where: { company_id_name: { company_id: company.id, name: category.name } },
        update: { description: category.description, is_default: category.is_default, is_active: true },
        create: {
          company_id: company.id,
          name: category.name,
          description: category.description,
          is_default: category.is_default,
          is_active: true,
        },
      });
    }
    const catHR = seededCategories['HR Interview'];
    const catTech = seededCategories['Technical Interview'];
    const catMgr = seededCategories['Managerial Interview'];
    const catFinal = seededCategories['Final Interview'];
    console.log('✓ Interview categories created');

    // ── 2. Evaluation Templates ─────────────────────────────────────────────────
    const standardTemplate = await prisma.interviewEvaluationTemplate.upsert({
      where: { company_id_name: { company_id: company.id, name: 'Standard Interview' } },
      update: { is_active: true },
      create: {
        company_id: company.id,
        interview_category_id: null,
        name: 'Standard Interview',
        is_active: true,
      },
    });
    await prisma.evaluationCriteria.createMany({
      data: [
        { template_id: standardTemplate.id, name: 'Technical Skills', weight: new Prisma.Decimal(40), max_score: 10, order: 1 },
        { template_id: standardTemplate.id, name: 'Communication', weight: new Prisma.Decimal(30), max_score: 10, order: 2 },
        { template_id: standardTemplate.id, name: 'Cultural Fit', weight: new Prisma.Decimal(30), max_score: 10, order: 3 },
      ],
      skipDuplicates: true,
    });

    const hrEvalTemplate = await prisma.interviewEvaluationTemplate.upsert({
      where: { company_id_name: { company_id: company.id, name: 'HR Interview Template' } },
      update: { is_active: true },
      create: {
        company_id: company.id,
        interview_category_id: catHR.id,
        name: 'HR Interview Template',
        is_active: true,
      },
    });
    await prisma.evaluationCriteria.createMany({
      data: [
        { template_id: hrEvalTemplate.id, name: 'Communication', weight: new Prisma.Decimal(30), max_score: 10, order: 1 },
        { template_id: hrEvalTemplate.id, name: 'Culture Fit', weight: new Prisma.Decimal(30), max_score: 10, order: 2 },
        { template_id: hrEvalTemplate.id, name: 'Motivation', weight: new Prisma.Decimal(40), max_score: 10, order: 3 },
      ],
      skipDuplicates: true,
    });

    const techEvalTemplate = await prisma.interviewEvaluationTemplate.upsert({
      where: { company_id_name: { company_id: company.id, name: 'Technical Interview Template' } },
      update: { is_active: true },
      create: {
        company_id: company.id,
        interview_category_id: catTech.id,
        name: 'Technical Interview Template',
        is_active: true,
      },
    });
    await prisma.evaluationCriteria.createMany({
      data: [
        { template_id: techEvalTemplate.id, name: 'Technical Skills', weight: new Prisma.Decimal(50), max_score: 10, order: 1 },
        { template_id: techEvalTemplate.id, name: 'Problem Solving', weight: new Prisma.Decimal(30), max_score: 10, order: 2 },
        { template_id: techEvalTemplate.id, name: 'Experience', weight: new Prisma.Decimal(20), max_score: 10, order: 3 },
      ],
      skipDuplicates: true,
    });

    const mgrEvalTemplate = await prisma.interviewEvaluationTemplate.upsert({
      where: { company_id_name: { company_id: company.id, name: 'Managerial Interview Template' } },
      update: { is_active: true },
      create: {
        company_id: company.id,
        interview_category_id: catMgr.id,
        name: 'Managerial Interview Template',
        is_active: true,
      },
    });
    await prisma.evaluationCriteria.createMany({
      data: [
        { template_id: mgrEvalTemplate.id, name: 'Leadership', weight: new Prisma.Decimal(40), max_score: 10, order: 1 },
        { template_id: mgrEvalTemplate.id, name: 'Decision Making', weight: new Prisma.Decimal(35), max_score: 10, order: 2 },
        { template_id: mgrEvalTemplate.id, name: 'Communication', weight: new Prisma.Decimal(25), max_score: 10, order: 3 },
      ],
      skipDuplicates: true,
    });
    console.log('✓ Evaluation templates and criteria created');

    // ── 3. Question Banks ───────────────────────────────────────────────────────
    const techBank = await prisma.interviewQuestionBank.upsert({
      where: { company_id_title: { company_id: company.id, title: 'Backend Core Questions' } },
      update: {},
      create: {
        company_id: company.id,
        title: 'Backend Core Questions',
        interview_category_id: catTech.id,
      },
    });
    await prisma.interviewQuestion.createMany({
      data: [
        { bank_id: techBank.id, question: 'What is database transaction isolation level?', interview_category_id: catTech.id },
        { bank_id: techBank.id, question: 'Describe standard HTTP status codes.', interview_category_id: catTech.id },
        { bank_id: techBank.id, question: 'Explain horizontal vs vertical scaling.', interview_category_id: catTech.id },
        { bank_id: techBank.id, question: 'How do you handle N+1 query problems in ORM?', interview_category_id: catTech.id },
        { bank_id: techBank.id, question: 'Describe your experience with CI/CD pipelines.', interview_category_id: catTech.id },
      ],
      skipDuplicates: true,
    });

    const hrBank = await prisma.interviewQuestionBank.upsert({
      where: { company_id_title: { company_id: company.id, title: 'HR & Behavioral Questions' } },
      update: {},
      create: {
        company_id: company.id,
        title: 'HR & Behavioral Questions',
        interview_category_id: catHR.id,
      },
    });
    await prisma.interviewQuestion.createMany({
      data: [
        { bank_id: hrBank.id, question: 'Tell me about yourself.', interview_category_id: catHR.id },
        { bank_id: hrBank.id, question: 'Why do you want to work for Adiu?', interview_category_id: catHR.id },
        { bank_id: hrBank.id, question: 'Describe a time you resolved a conflict at work.', interview_category_id: catHR.id },
        { bank_id: hrBank.id, question: 'What are your long-term career goals?', interview_category_id: catHR.id },
      ],
      skipDuplicates: true,
    });
    console.log('✓ Question banks created');

    // ── 4. Interviews ───────────────────────────────────────────────────────────
    let intNum = 1;
    const nextIntNum = () => `INT-2026-${String(intNum++).padStart(3, '0')}`;

    // Find applications with appropriate statuses
    const appIntSched1 = applications.find(a => a.status === 'INTERVIEW_SCHEDULED');
    const appIntSched2 = applications.find((a, i) => a.status === 'INTERVIEW_SCHEDULED' && i !== applications.indexOf(appIntSched1!));
    const appIntComp1 = applications.find(a => a.status === 'INTERVIEW_COMPLETED');
    const appIntComp2 = applications.find((a, i) => a.status === 'INTERVIEW_COMPLETED' && i !== applications.indexOf(appIntComp1!));
    const appEval1 = applications.find(a => a.status === 'UNDER_EVALUATION');
    const appEval2 = applications.find((a, i) => a.status === 'UNDER_EVALUATION' && i !== applications.indexOf(appEval1!));

    // Background candidate interviews (all 6 statuses)
    const intSched1 = await prisma.interview.upsert({
      where: { interview_number: 'INT-2026-001' },
      update: {},
      create: {
        application_id: appIntSched1?.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catHR.id,
        start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'SCHEDULED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/aaa-bbb-001',
      },
    });
    await prisma.interviewPanel.upsert({
      where: { interview_id_panel_member_id: { interview_id: intSched1.id, panel_member_id: userMap['interviewer1@erms.com'].id } },
      update: {},
      create: { interview_id: intSched1.id, panel_member_id: userMap['interviewer1@erms.com'].id },
    });

    const intResch1 = await prisma.interview.upsert({
      where: { interview_number: 'INT-2026-002' },
      update: {},
      create: {
        application_id: appIntSched2?.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'RESCHEDULED',
        mode: 'PHYSICAL',
        office_location: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.123456789!2d38.7456789!3d9.0123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMDAnNDQuNCJOIDM4wrA0NCczMC4wIkU!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus',
        rescheduled_reason: 'Panel member unavailability.',
      },
    });
    await prisma.interviewPanel.upsert({
      where: { interview_id_panel_member_id: { interview_id: intResch1.id, panel_member_id: userMap['interviewer2@erms.com'].id } },
      update: {},
      create: { interview_id: intResch1.id, panel_member_id: userMap['interviewer2@erms.com'].id },
    });

    const intComp1 = await prisma.interview.upsert({
      where: { interview_number: 'INT-2026-003' },
      update: {},
      create: {
        application_id: appIntComp1?.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catTech.id,
        start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'COMPLETED',
        mode: 'VIRTUAL',
        meeting_link: 'https://meet.google.com/xyz-uvw-comp',
      },
    });
    await prisma.interviewPanel.upsert({
      where: { interview_id_panel_member_id: { interview_id: intComp1.id, panel_member_id: userMap['interviewer2@erms.com'].id } },
      update: {},
      create: { interview_id: intComp1.id, panel_member_id: userMap['interviewer2@erms.com'].id },
    });
    await prisma.interviewEvaluation.upsert({
      where: { interview_id_evaluator_id: { interview_id: intComp1.id, evaluator_id: userMap['interviewer2@erms.com'].id } },
      update: {},
      create: {
        interview_id: intComp1.id,
        evaluator_id: userMap['interviewer2@erms.com'].id,
        interview_category_id: catTech.id,
        evaluation_template_id: techEvalTemplate.id,
        overall_score: 4,
        scores_json: [
          { criteria_name: 'Technical Skills', score: 5, comments: 'Strong fundamentals.' },
          { criteria_name: 'Problem Solving', score: 4, comments: 'Good analytical approach.' },
          { criteria_name: 'Experience', score: 4, comments: 'Solid background.' },
        ],
        comments: 'Excellent technical skills.',
        recommendation: 'RECOMMEND',
      },
    });

    const intCancel1 = await prisma.interview.upsert({
      where: { interview_number: 'INT-2026-004' },
      update: {},
      create: {
        application_id: appIntComp2?.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catHR.id,
        start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'CANCELLED',
        mode: 'VIRTUAL',
        rescheduled_reason: 'Candidate withdrew.',
      },
    });
    await prisma.interviewPanel.upsert({
      where: { interview_id_panel_member_id: { interview_id: intCancel1.id, panel_member_id: userMap['interviewer3@erms.com'].id } },
      update: {},
      create: { interview_id: intCancel1.id, panel_member_id: userMap['interviewer3@erms.com'].id },
    });

    const intEvalPending = await prisma.interview.upsert({
      where: { interview_number: 'INT-2026-005' },
      update: {},
      create: {
        application_id: appEval1?.id,
        interview_number: nextIntNum(),
        round: 1,
        interview_category_id: catMgr.id,
        start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'EVALUATION_PENDING',
        mode: 'HYBRID',
        office_location: 'Meeting Room B',
        meeting_link: 'https://meet.google.com/eval-pending',
      },
    });
    await prisma.interviewPanel.upsert({
      where: { interview_id_panel_member_id: { interview_id: intEvalPending.id, panel_member_id: userMap['hm1@erms.com'].id } },
      update: {},
      create: { interview_id: intEvalPending.id, panel_member_id: userMap['hm1@erms.com'].id },
    });

    const intFinalized = await prisma.interview.upsert({
      where: { interview_number: 'INT-2026-006' },
      update: {},
      create: {
        application_id: appEval2?.id,
        interview_number: nextIntNum(),
        round: 2,
        interview_category_id: catFinal.id,
        start_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3_600_000),
        status: 'FINALIZED',
        mode: 'PHYSICAL',
        office_location: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.234567890!2d38.7567890!3d9.0234567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMDAnNDQuNCJOIDM4wrA0NCczMC4wIkU!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus',
      },
    });
    await prisma.interviewPanel.upsert({
      where: { interview_id_panel_member_id: { interview_id: intFinalized.id, panel_member_id: userMap['hm2@erms.com'].id } },
      update: {},
      create: { interview_id: intFinalized.id, panel_member_id: userMap['hm2@erms.com'].id },
    });
    await prisma.interviewPanel.upsert({
      where: { interview_id_panel_member_id: { interview_id: intFinalized.id, panel_member_id: userMap['interviewer1@erms.com'].id } },
      update: {},
      create: { interview_id: intFinalized.id, panel_member_id: userMap['interviewer1@erms.com'].id },
    });
    await prisma.interviewEvaluation.upsert({
      where: { interview_id_evaluator_id: { interview_id: intFinalized.id, evaluator_id: userMap['hm2@erms.com'].id } },
      update: {},
      create: {
        interview_id: intFinalized.id,
        evaluator_id: userMap['hm2@erms.com'].id,
        interview_category_id: catFinal.id,
        evaluation_template_id: standardTemplate.id,
        overall_score: 5,
        scores_json: [
          { criteria_name: 'Technical Skills', score: 5, comments: 'Exceptional depth.' },
          { criteria_name: 'Communication', score: 5, comments: 'Outstanding.' },
          { criteria_name: 'Cultural Fit', score: 5, comments: 'Perfect fit.' },
        ],
        comments: 'Highly recommended.',
        recommendation: 'STRONGLY_RECOMMEND',
      },
    });

    console.log('✓ Interviews created (all 6 statuses covered)');

    console.log('\n✅ Interview data seeded successfully!');
    console.log('─────────────────────────────────────────────────────────');
  } catch (error) {
    console.error('Error seeding interview data:', error);
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

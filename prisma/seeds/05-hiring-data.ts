import 'dotenv/config';
import { Prisma, ApplicationStatus, ApplicationStage } from '@prisma/client';
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
    const userMap: Record<string, any> = users.reduce(
      (map: Record<string, any>, user: any) => {
        map[user.email] = user;
        return map;
      },
      {},
    );

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
    const departmentMap: Record<string, any> = departments.reduce(
      (map: Record<string, any>, dept: any) => {
        map[dept.name] = dept;
        return map;
      },
      {},
    );

    // Get interview categories and evaluation templates
    const catTech = await prisma.interviewCategory.findUnique({
      where: {
        company_id_name: {
          company_id: company.id,
          name: 'Technical Interview',
        },
      },
    });
    const techEvalTemplate = await prisma.interviewEvaluationTemplate.findFirst(
      {
        where: { company_id: company.id, name: 'Technical Interview Template' },
      },
    );

    // Helper to backing recruitment request
    const makeBackingRR = async (
      deptName: string,
      jobTitle: string,
      idx: number,
    ) => {
      if (!company) throw new Error('Company not found');
      const reqNumber = `REQ-VAC-2026-${String(idx).padStart(3, '0')}`;
      const existing = await prisma.recruitmentRequest.findUnique({
        where: { request_number: reqNumber },
      });
      if (existing) return existing;

      return await prisma.recruitmentRequest.create({
        data: {
          company_id: company.id,
          planning_type: 'PLANNED',
          requested_by_user_id: userMap['hm1@erms.com'].id,
          department_id: departmentMap[deptName].id,
          job_title: jobTitle,
          position_name: jobTitle,
          employment_type: 'FULL_TIME',
          request_type: 'NEW_HEADCOUNT',
          justification: 'Backing vacancy for seed data.',
          status: 'APPROVED',
          priority: 'HIGH',
          request_number: reqNumber,
          approved_by_user_id: userMap['ceo1@erms.com'].id,
        },
      });
    };

    // Helper to create application
    async function createApp(
      candId: string,
      vacId: string,
      status: ApplicationStatus,
      stage: ApplicationStage,
      daysAgo = 0,
    ) {
      if (!company) throw new Error('Company not found');
      const app = await prisma.application.upsert({
        where: { id: `app-${candId}-${vacId}` },
        update: {},
        create: {
          id: `app-${candId}-${vacId}`,
          company_id: company.id,
          candidate_id: candId,
          vacancy_id: vacId,
          status,
          current_stage: stage,
          submitted_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.applicationStageHistory.upsert({
        where: { id: `ash-${app.id}` },
        update: {},
        create: {
          id: `ash-${app.id}`,
          application_id: app.id,
          from_stage: null,
          to_stage: stage,
          notes: `Seeded at ${stage}`,
        },
      });
      return app;
    }

    // ── 1. Talent Roster ───────────────────────────────────────────────────────
    await prisma.talentRoster.upsert({
      where: { id: 'tr-001' },
      update: {},
      create: {
        id: 'tr-001',
        company_id: company.id,
        candidate_id: seededCandidates[3].id,
        talent_category: 'Backend Engineering',
        availability_status: 'IMMEDIATELY',
        status: 'ACTIVE',
        source_stage: 'SCREENING',
        added_by: userMap['recruiter1@erms.com'].id,
        expected_salary: new Prisma.Decimal(5500),
        notes: 'Strong backend skills from screening.',
      },
    });
    await prisma.talentRoster.upsert({
      where: { id: 'tr-002' },
      update: {},
      create: {
        id: 'tr-002',
        company_id: company.id,
        candidate_id: seededCandidates[9].id,
        talent_category: 'Frontend Engineering',
        availability_status: 'TWO_WEEKS',
        status: 'ACTIVE',
        source_stage: 'SCREENING',
        added_by: userMap['recruiter2@erms.com'].id,
        expected_salary: new Prisma.Decimal(7500),
        notes: 'Talented frontend builder.',
      },
    });
    await prisma.talentRoster.upsert({
      where: { id: 'tr-003' },
      update: {},
      create: {
        id: 'tr-003',
        company_id: company.id,
        candidate_id: seededCandidates[0].id,
        talent_category: 'Software Engineering',
        availability_status: 'ONE_MONTH',
        status: 'PLACED',
        source_stage: 'FINAL_SELECTION',
        sourced_from_vacancy_id: seededVacancies[7].id,
        added_by: userMap['recruiter1@erms.com'].id,
        expected_salary: new Prisma.Decimal(7000),
        notes: 'Placed in Engineering department.',
      },
    });
    await prisma.talentRoster.upsert({
      where: { id: 'tr-004' },
      update: {},
      create: {
        id: 'tr-004',
        company_id: company.id,
        candidate_id: seededCandidates[1].id,
        talent_category: 'Finance Analyst',
        availability_status: 'MORE_THAN_ONE_MONTH',
        status: 'INACTIVE',
        source_stage: 'INTERVIEW',
        added_by: userMap['hr2@erms.com'].id,
        expected_salary: new Prisma.Decimal(6000),
        notes: 'Profile deactivated — candidate relocated.',
      },
    });
    await prisma.talentRoster.upsert({
      where: { id: 'tr-005' },
      update: {},
      create: {
        id: 'tr-005',
        company_id: company.id,
        candidate_id: seededCandidates[2].id,
        talent_category: 'Project Management',
        availability_status: 'IMMEDIATELY',
        status: 'WITHDRAWN',
        source_stage: 'SCREENING',
        added_by: userMap['recruiter3@erms.com'].id,
        expected_salary: new Prisma.Decimal(6500),
        notes: 'Candidate requested removal.',
      },
    });

    // canduser1 on talent roster
    const cu1 = await prisma.candidate.findUnique({
      where: { email: 'canduser1@erms.com' },
    });
    if (cu1) {
      await prisma.talentRoster.upsert({
        where: { id: 'tr-006' },
        update: {},
        create: {
          id: 'tr-006',
          company_id: company.id,
          candidate_id: cu1.id,
          talent_category: 'Software Engineering',
          availability_status: 'IMMEDIATELY',
          status: 'ACTIVE',
          source_stage: 'INTERVIEW',
          sourced_from_vacancy_id: seededVacancies[13]?.id,
          added_by: userMap['recruiter1@erms.com'].id,
          expected_salary: new Prisma.Decimal(4500),
          notes: 'Good candidate — moved to roster from vacancy screening.',
        },
      });
    }
    console.log('✓ Talent roster populated (all 4 statuses)');

    // ── 2. Hiring Minutes ─────────────────────────────────────────────────────
    // Create applications for the hiring minute candidates first
    const hmApprovedApp = await createApp(
      seededCandidates[6].id,
      seededVacancies[10].id,
      'SELECTED',
      'EVALUATION' as ApplicationStage,
      15,
    );
    const hmApprovedAltApp = await createApp(
      seededCandidates[7].id,
      seededVacancies[10].id,
      'REJECTED',
      'EVALUATION' as ApplicationStage,
      15,
    );
    const hmApprovedRejectedApp1 = await createApp(
      seededCandidates[8].id,
      seededVacancies[10].id,
      'REJECTED',
      'EVALUATION' as ApplicationStage,
      15,
    );
    const hmApprovedRejectedApp2 = await createApp(
      seededCandidates[9].id,
      seededVacancies[10].id,
      'REJECTED',
      'EVALUATION' as ApplicationStage,
      15,
    );

    const hmApproved = await prisma.hiringMinute.upsert({
      where: { id: 'hm-approved-001' },
      update: {},
      create: {
        id: 'hm-approved-001',
        vacancy_id: seededVacancies[10].id,
        prepared_by_id: userMap['hr1@erms.com'].id,
        recruitment_request_type: 'NEW_HEADCOUNT',
        recruitment_classification: 'PLANNED',
        application_type: 'EXTERNAL',
        interview_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        interview_time: '10:00 AM',
        interview_place: 'Adiu HQ, Board Room',
        advertisement_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        application_closing_date: new Date(
          Date.now() - 20 * 24 * 60 * 60 * 1000,
        ),
        total_applications: 14,
        total_screened: 10,
        total_shortlisted: 5,
        total_interviewed: 4,
        sources_used: ['Company Website', 'LinkedIn', 'Telegram'],
        interview_method: 'PHYSICAL',
        stages_conducted: [
          'HR Interview',
          'Technical Interview',
          'Final Interview',
        ],
        selected_candidate_id: seededCandidates[6].id,
        selected_candidate_score: new Prisma.Decimal(4.8),
        expected_joining_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        expected_salary: new Prisma.Decimal(7000),
        reason_for_selection:
          'Scored highest in technical and behavioral rounds.',
        alternative_candidate_id: seededCandidates[7].id,
        alternative_candidate_score: new Prisma.Decimal(4.1),
        reason_for_alternative: 'Strong backup — second highest score.',
        rejected_candidates_json: [
          {
            application_id: hmApprovedRejectedApp1.id,
            candidate_id: seededCandidates[8].id,
            name: 'Fikre Mariam',
            rejection_reason: 'Below salary expectations.',
          },
          {
            application_id: hmApprovedRejectedApp2.id,
            candidate_id: seededCandidates[9].id,
            name: 'Tsige Desta',
            rejection_reason: 'Less relevant experience.',
          },
        ],
        panel_recommendation: 'STRONGLY_RECOMMEND_HIRING',
        recommendation_summary:
          'Panel unanimously recommends the selected candidate.',
        hr_observation: 'All stages conducted professionally.',
        final_decision: 'APPROVED',
        approved_by_id: userMap['ceo1@erms.com'].id,
        approved_at: new Date(),
      },
    });
    await prisma.hiringMinutePanel.createMany({
      data: [
        {
          hiring_minute_id: hmApproved.id,
          user_id: userMap['hr1@erms.com'].id,
          member_name: 'Grace Girma',
          position_role: 'HR Specialist',
          department: 'Human Resources',
        },
        {
          hiring_minute_id: hmApproved.id,
          user_id: userMap['hm1@erms.com'].id,
          member_name: 'Maya Mulugeta',
          position_role: 'Hiring Manager',
          department: 'Engineering',
        },
        {
          hiring_minute_id: hmApproved.id,
          user_id: userMap['interviewer1@erms.com'].id,
          member_name: 'Sam Samuel',
          position_role: 'Technical Lead',
          department: 'Engineering',
        },
      ],
      skipDuplicates: true,
    });
    await prisma.hiringMinuteSignatory.createMany({
      data: [
        {
          hiring_minute_id: hmApproved.id,
          role: 'HR_REPRESENTATIVE',
          user_id: userMap['hr1@erms.com'].id,
          signatory_name: 'Grace Girma',
          position: 'HR Specialist',
          signed_at: new Date(),
        },
        {
          hiring_minute_id: hmApproved.id,
          role: 'HIRING_MANAGER',
          user_id: userMap['hm1@erms.com'].id,
          signatory_name: 'Maya Mulugeta',
          position: 'Hiring Manager',
          signed_at: new Date(),
        },
        {
          hiring_minute_id: hmApproved.id,
          role: 'DEPARTMENT_HEAD',
          user_id: userMap['dm1@erms.com'].id,
          signatory_name: 'Paul Petros',
          position: 'Dept Manager',
          signed_at: new Date(),
        },
        {
          hiring_minute_id: hmApproved.id,
          role: 'CEO',
          user_id: userMap['ceo1@erms.com'].id,
          signatory_name: 'Alice Admasu',
          position: 'CEO',
          signed_at: new Date(),
        },
      ],
      skipDuplicates: true,
    });
    await prisma.recruitmentApprovalHistory.upsert({
      where: { id: 'rah-hm-approved' },
      update: {},
      create: {
        id: 'rah-hm-approved',
        entity_type: 'HiringMinute',
        entity_id: hmApproved.id,
        action: 'APPROVED',
        actor_user_id: userMap['ceo1@erms.com'].id,
        comments: 'Hiring minute approved. Proceed with offer.',
      },
    });

    // Create applications for pending hiring minute candidates
    const hmPendingApp = await createApp(
      seededCandidates[8].id,
      seededVacancies[6].id,
      'SELECTED',
      'EVALUATION' as ApplicationStage,
      5,
    );

    const hmPending = await prisma.hiringMinute.upsert({
      where: { id: 'hm-pending-001' },
      update: {},
      create: {
        id: 'hm-pending-001',
        vacancy_id: seededVacancies[6].id,
        prepared_by_id: userMap['hr2@erms.com'].id,
        recruitment_request_type: 'NEW_HEADCOUNT',
        recruitment_classification: 'PLANNED',
        application_type: 'EXTERNAL',
        interview_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        interview_time: '2:00 PM',
        interview_place: 'Adiu HQ, Conference Room B',
        total_applications: 6,
        total_screened: 5,
        total_shortlisted: 3,
        total_interviewed: 3,
        sources_used: ['LinkedIn', 'Facebook'],
        interview_method: 'VIRTUAL',
        stages_conducted: ['HR Interview', 'Technical Interview'],
        selected_candidate_id: seededCandidates[8].id,
        selected_candidate_score: new Prisma.Decimal(4.2),
        expected_salary: new Prisma.Decimal(6800),
        reason_for_selection: 'Solid technical skills and good communication.',
        panel_recommendation: 'RECOMMEND_HIRING',
        recommendation_summary:
          'Panel recommends candidate pending CEO sign-off.',
        final_decision: 'PENDING',
      },
    });
    await prisma.hiringMinutePanel.createMany({
      data: [
        {
          hiring_minute_id: hmPending.id,
          user_id: userMap['hr2@erms.com'].id,
          member_name: 'Henry Hagos',
          position_role: 'HR Specialist',
          department: 'Human Resources',
        },
        {
          hiring_minute_id: hmPending.id,
          user_id: userMap['hm2@erms.com'].id,
          member_name: 'Noah Negasi',
          position_role: 'Hiring Manager',
          department: 'Sales',
        },
      ],
      skipDuplicates: true,
    });
    await prisma.hiringMinuteSignatory.createMany({
      data: [
        {
          hiring_minute_id: hmPending.id,
          role: 'HR_REPRESENTATIVE',
          user_id: userMap['hr2@erms.com'].id,
          signatory_name: 'Henry Hagos',
          position: 'HR Specialist',
          signed_at: new Date(),
        },
        {
          hiring_minute_id: hmPending.id,
          role: 'HIRING_MANAGER',
          user_id: userMap['hm2@erms.com'].id,
          signatory_name: 'Noah Negasi',
          position: 'Hiring Manager',
          signed_at: new Date(),
        },
      ],
      skipDuplicates: true,
    });
    console.log('✓ Hiring minutes created (APPROVED + PENDING)');

    // Create applications for rejected hiring minute candidates
    const hmRejectedApp = await createApp(
      seededCandidates[7].id,
      seededVacancies[7].id,
      'REJECTED',
      'EVALUATION' as ApplicationStage,
      18,
    );

    const hmRejected = await prisma.hiringMinute.upsert({
      where: { id: 'hm-rejected-001' },
      update: {},
      create: {
        id: 'hm-rejected-001',
        vacancy_id: seededVacancies[7].id,
        prepared_by_id: userMap['hr2@erms.com'].id,
        recruitment_request_type: 'REPLACEMENT',
        recruitment_classification: 'PLANNED',
        application_type: 'EXTERNAL',
        interview_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        interview_time: '11:00 AM',
        interview_place: 'Adiu HQ, Board Room',
        total_applications: 12,
        total_screened: 8,
        total_shortlisted: 4,
        total_interviewed: 3,
        sources_used: ['LinkedIn', 'Telegram', 'Employee Referral'],
        interview_method: 'PHYSICAL',
        stages_conducted: [
          'HR Interview',
          'Technical Interview',
          'Final Interview',
        ],
        selected_candidate_id: seededCandidates[7].id,
        selected_candidate_score: new Prisma.Decimal(3.5),
        reason_for_selection: 'Qualified but salary expectations too high.',
        panel_recommendation: 'DO_NOT_RECOMMEND_HIRING',
        recommendation_summary:
          'Panel does not recommend due to budget constraints.',
        final_decision: 'REJECTED',
        approved_by_id: userMap['ceo1@erms.com'].id,
        approved_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expected_salary: new Prisma.Decimal(8000),
      },
    });
    await prisma.hiringMinutePanel.createMany({
      data: [
        {
          hiring_minute_id: hmRejected.id,
          user_id: userMap['hr2@erms.com'].id,
          member_name: 'Henry Hagos',
          position_role: 'HR Specialist',
          department: 'Human Resources',
        },
        {
          hiring_minute_id: hmRejected.id,
          user_id: userMap['interviewer2@erms.com'].id,
          member_name: 'Tina Tsegaye',
          position_role: 'Senior Developer',
          department: 'Engineering',
        },
      ],
      skipDuplicates: true,
    });
    await prisma.recruitmentApprovalHistory.upsert({
      where: { id: 'rah-hm-rejected' },
      update: {},
      create: {
        id: 'rah-hm-rejected',
        entity_type: 'HiringMinute',
        entity_id: hmRejected.id,
        action: 'REJECTED',
        actor_user_id: userMap['ceo1@erms.com'].id,
        comments:
          'Rejected due to budget constraints. Salary exceeds approved range.',
      },
    });
    console.log('✓ Hiring minute created (REJECTED)');

    // ── 3. Test Vacancy with Multiple Evaluated Candidates ───────────────────────
    if (catTech && techEvalTemplate) {
      const testVacancyRR = await makeBackingRR(
        'Engineering',
        'Test Software Engineer',
        999,
      );
      const testVacancy = await prisma.vacancy.upsert({
        where: { id: 'vac-test-001' },
        update: {},
        create: {
          id: 'vac-test-001',
          company_id: company.id,
          recruitment_request_id: testVacancyRR.id,
          title: 'Test Software Engineer for Evaluation Testing',
          department_id: departmentMap['Engineering'].id,
          location: 'Addis Ababa',
          employment_type: 'FULL_TIME',
          status: 'IN_PROGRESS',
          posting_status: 'PUBLISHED',
          open_positions: 1,
          description:
            'Test vacancy for evaluation and selection flow testing.',
          responsibilities: 'Test responsibilities.',
          requirements: 'Test requirements.',
          required_qualifications: 'BSc in Computer Science',
          required_experience: 3,
          vacancy_number: 'VAC-TEST-001',
          posted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          opening_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          approved_at: new Date(),
        },
      });

      const testCand1 = seededCandidates[0];
      const testCand2 = seededCandidates[1];
      const testCand3 = seededCandidates[2];

      const testApp1 = await createApp(
        testCand1.id,
        testVacancy.id,
        'INTERVIEW_COMPLETED',
        'EVALUATION',
        5,
      );
      const testApp2 = await createApp(
        testCand2.id,
        testVacancy.id,
        'INTERVIEW_COMPLETED',
        'EVALUATION',
        5,
      );
      const testApp3 = await createApp(
        testCand3.id,
        testVacancy.id,
        'INTERVIEW_COMPLETED',
        'EVALUATION',
        5,
      );

      // Test interview 1
      const testInt1 = await prisma.interview.upsert({
        where: { interview_number: 'INT-TEST-001' },
        update: {},
        create: {
          application_id: testApp1.id,
          interview_number: 'INT-TEST-001',
          round: 1,
          interview_category_id: catTech.id,
          start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3_600_000),
          status: 'COMPLETED',
          mode: 'VIRTUAL',
          meeting_link: 'https://meet.google.com/test-1',
        },
      });
      await prisma.interviewPanel.createMany({
        data: [
          {
            interview_id: testInt1.id,
            panel_member_id: userMap['interviewer1@erms.com'].id,
          },
          {
            interview_id: testInt1.id,
            panel_member_id: userMap['interviewer2@erms.com'].id,
          },
        ],
        skipDuplicates: true,
      });
      await prisma.interviewEvaluation.createMany({
        data: [
          {
            interview_id: testInt1.id,
            evaluator_id: userMap['interviewer1@erms.com'].id,
            interview_category_id: catTech.id,
            evaluation_template_id: techEvalTemplate.id,
            overall_score: 8.5,
            scores_json: [
              {
                criteria_name: 'Technical Skills',
                score: 9,
                comments: 'Excellent',
              },
              { criteria_name: 'Problem Solving', score: 8, comments: 'Good' },
              { criteria_name: 'Experience', score: 8, comments: 'Solid' },
            ],
            comments: 'Strong technical candidate.',
            recommendation: 'STRONGLY_RECOMMEND',
          },
          {
            interview_id: testInt1.id,
            evaluator_id: userMap['interviewer2@erms.com'].id,
            interview_category_id: catTech.id,
            evaluation_template_id: techEvalTemplate.id,
            overall_score: 8.0,
            scores_json: [
              {
                criteria_name: 'Technical Skills',
                score: 8,
                comments: 'Very good',
              },
              { criteria_name: 'Problem Solving', score: 8, comments: 'Good' },
              { criteria_name: 'Experience', score: 8, comments: 'Solid' },
            ],
            comments: 'Good fit for the role.',
            recommendation: 'RECOMMEND',
          },
        ],
        skipDuplicates: true,
      });

      // Test interview 2
      const testInt2 = await prisma.interview.upsert({
        where: { interview_number: 'INT-TEST-002' },
        update: {},
        create: {
          application_id: testApp2.id,
          interview_number: 'INT-TEST-002',
          round: 1,
          interview_category_id: catTech.id,
          start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3_600_000),
          status: 'COMPLETED',
          mode: 'VIRTUAL',
          meeting_link: 'https://meet.google.com/test-2',
        },
      });
      await prisma.interviewPanel.createMany({
        data: [
          {
            interview_id: testInt2.id,
            panel_member_id: userMap['interviewer1@erms.com'].id,
          },
          {
            interview_id: testInt2.id,
            panel_member_id: userMap['interviewer2@erms.com'].id,
          },
        ],
        skipDuplicates: true,
      });
      await prisma.interviewEvaluation.createMany({
        data: [
          {
            interview_id: testInt2.id,
            evaluator_id: userMap['interviewer1@erms.com'].id,
            interview_category_id: catTech.id,
            evaluation_template_id: techEvalTemplate.id,
            overall_score: 7.0,
            scores_json: [
              { criteria_name: 'Technical Skills', score: 7, comments: 'Good' },
              { criteria_name: 'Problem Solving', score: 7, comments: 'Good' },
              { criteria_name: 'Experience', score: 7, comments: 'Adequate' },
            ],
            comments: 'Qualified candidate.',
            recommendation: 'RECOMMEND',
          },
          {
            interview_id: testInt2.id,
            evaluator_id: userMap['interviewer2@erms.com'].id,
            interview_category_id: catTech.id,
            evaluation_template_id: techEvalTemplate.id,
            overall_score: 6.5,
            scores_json: [
              { criteria_name: 'Technical Skills', score: 6, comments: 'Fair' },
              { criteria_name: 'Problem Solving', score: 7, comments: 'Good' },
              { criteria_name: 'Experience', score: 7, comments: 'Adequate' },
            ],
            comments: 'Acceptable candidate.',
            recommendation: 'RECOMMEND',
          },
        ],
        skipDuplicates: true,
      });

      // Test interview 3
      const testInt3 = await prisma.interview.upsert({
        where: { interview_number: 'INT-TEST-003' },
        update: {},
        create: {
          application_id: testApp3.id,
          interview_number: 'INT-TEST-003',
          round: 1,
          interview_category_id: catTech.id,
          start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3_600_000),
          status: 'COMPLETED',
          mode: 'VIRTUAL',
          meeting_link: 'https://meet.google.com/test-3',
        },
      });
      await prisma.interviewPanel.createMany({
        data: [
          {
            interview_id: testInt3.id,
            panel_member_id: userMap['interviewer1@erms.com'].id,
          },
          {
            interview_id: testInt3.id,
            panel_member_id: userMap['interviewer2@erms.com'].id,
          },
        ],
        skipDuplicates: true,
      });
      await prisma.interviewEvaluation.createMany({
        data: [
          {
            interview_id: testInt3.id,
            evaluator_id: userMap['interviewer1@erms.com'].id,
            interview_category_id: catTech.id,
            evaluation_template_id: techEvalTemplate.id,
            overall_score: 5.5,
            scores_json: [
              { criteria_name: 'Technical Skills', score: 5, comments: 'Fair' },
              { criteria_name: 'Problem Solving', score: 6, comments: 'Fair' },
              { criteria_name: 'Experience', score: 5, comments: 'Limited' },
            ],
            comments: 'May need more experience.',
            recommendation: 'DO_NOT_RECOMMEND',
          },
          {
            interview_id: testInt3.id,
            evaluator_id: userMap['interviewer2@erms.com'].id,
            interview_category_id: catTech.id,
            evaluation_template_id: techEvalTemplate.id,
            overall_score: 5.0,
            scores_json: [
              { criteria_name: 'Technical Skills', score: 5, comments: 'Fair' },
              { criteria_name: 'Problem Solving', score: 5, comments: 'Fair' },
              { criteria_name: 'Experience', score: 5, comments: 'Limited' },
            ],
            comments: 'Not ready for this role.',
            recommendation: 'DO_NOT_RECOMMEND',
          },
        ],
        skipDuplicates: true,
      });
      console.log(
        '✓ Test vacancy created with 3 evaluated candidates for evaluation testing',
      );
    }

    console.log('\n✅ Hiring data seeded successfully!');
    console.log('─────────────────────────────────────────────────────────');
  } catch (error) {
    console.error('Error seeding hiring data:', error);
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

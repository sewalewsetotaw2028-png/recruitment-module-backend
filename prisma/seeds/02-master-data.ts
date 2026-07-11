import 'dotenv/config';
import {
  Prisma,
  WorkforcePlanStatus,
  RecruitmentRequestStatus,
  VacancyStatus,
} from '@prisma/client';
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

    // Get departments
    const departments = await prisma.department.findMany({
      where: { company_id: company.id },
    });
    const departmentMap: Record<string, any> = departments.reduce((map: Record<string, any>, dept: any) => {
      map[dept.name] = dept;
      return map;
    }, {});

    // ── 1. Job Templates ────────────────────────────────────────────────────────
    const softwareEngineerTemplateId = '00000000-0000-4000-8000-000000000101';
    const hrSpecialistTemplateId = '00000000-0000-4000-8000-000000000102';
    const dataAnalystTemplateId = '00000000-0000-4000-8000-000000000103';
    const marketingManagerTemplateId = '00000000-0000-4000-8000-000000000104';

    await prisma.jobTemplate.upsert({
      where: { id: softwareEngineerTemplateId },
      update: {
        company_id: company.id,
        title: 'Software Engineer',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 3',
        summary: 'Build and maintain the recruitment platform.',
        responsibilities:
          'Develop features, review code, and support production systems.',
        requirements:
          'Strong TypeScript, React, and API development experience.',
        is_active: true,
      },
      create: {
        id: softwareEngineerTemplateId,
        company_id: company.id,
        title: 'Software Engineer',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 3',
        summary: 'Build and maintain the recruitment platform.',
        responsibilities:
          'Develop features, review code, and support production systems.',
        requirements:
          'Strong TypeScript, React, and API development experience.',
        is_active: true,
      },
    });
    await prisma.jobTemplate.upsert({
      where: { id: hrSpecialistTemplateId },
      update: {
        company_id: company.id,
        title: 'HR Specialist',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 2',
        summary: 'Support HR operations and recruitment coordination.',
        responsibilities:
          'Coordinate hiring workflows, manage records, and support candidates.',
        requirements:
          'Experience with HR operations, communication, and process tracking.',
        is_active: true,
      },
      create: {
        id: hrSpecialistTemplateId,
        company_id: company.id,
        title: 'HR Specialist',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 2',
        summary: 'Support HR operations and recruitment coordination.',
        responsibilities:
          'Coordinate hiring workflows, manage records, and support candidates.',
        requirements:
          'Experience with HR operations, communication, and process tracking.',
        is_active: true,
      },
    });
    await prisma.jobTemplate.upsert({
      where: { id: dataAnalystTemplateId },
      update: {
        company_id: company.id,
        title: 'Data Analyst',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 2',
        summary: 'Analyze recruitment data and support decision-making.',
        responsibilities:
          'Build dashboards, run reports, and provide data insights.',
        requirements: 'SQL, Python, and data visualization tools.',
        is_active: true,
      },
      create: {
        id: dataAnalystTemplateId,
        company_id: company.id,
        title: 'Data Analyst',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 2',
        summary: 'Analyze recruitment data and support decision-making.',
        responsibilities:
          'Build dashboards, run reports, and provide data insights.',
        requirements: 'SQL, Python, and data visualization tools.',
        is_active: true,
      },
    });
    await prisma.jobTemplate.upsert({
      where: { id: marketingManagerTemplateId },
      update: {
        company_id: company.id,
        title: 'Marketing Manager',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 4',
        summary: 'Lead marketing campaigns and employer branding.',
        responsibilities:
          'Plan campaigns, manage social media, and track KPIs.',
        requirements: 'Marketing degree with 5+ years of experience.',
        is_active: true,
      },
      create: {
        id: marketingManagerTemplateId,
        company_id: company.id,
        title: 'Marketing Manager',
        employment_type: 'FULL_TIME',
        job_grade: 'Level 4',
        summary: 'Lead marketing campaigns and employer branding.',
        responsibilities:
          'Plan campaigns, manage social media, and track KPIs.',
        requirements: 'Marketing degree with 5+ years of experience.',
        is_active: true,
      },
    });
    console.log('✓ Job templates created (4)');

    // ── 2. Workforce Plans ─────────────────────────────────────────────────────
    const seededPlanItems: any[] = [];
    const wfpStatuses: WorkforcePlanStatus[] = [
      'DRAFT',
      'SUBMITTED',
      'UNDER_HR_REVIEW',
      'UNDER_CEO_REVIEW',
      'APPROVED',
      'REJECTED',
      'RETURNED_FOR_REVISION',
      'CLOSED',
    ];
    const planAssignments = [
      { creatorEmail: 'dm1@erms.com', deptName: 'Engineering' },
      { creatorEmail: 'hr1@erms.com', deptName: 'Human Resources' },
      { creatorEmail: 'dm3@erms.com', deptName: 'Sales' },
      { creatorEmail: 'dm2@erms.com', deptName: 'Finance' },
    ];
    const approvers = ['ceo1@erms.com', 'hradmin1@erms.com'];
    let planIndex = 1;

    for (const status of wfpStatuses) {
      for (let i = 1; i <= 2; i++) {
        const assignment = planAssignments[planIndex % planAssignments.length];
        const creatorUser = userMap[assignment.creatorEmail];
        const approverUser = userMap[approvers[planIndex % approvers.length]];
        const dept = departmentMap[assignment.deptName];

        const plan = await prisma.workforcePlan.upsert({
          where: { id: `wfp-${planIndex}` },
          update: {},
          create: {
            id: `wfp-${planIndex}`,
            company_id: company.id,
            title: `FY2026 ${assignment.deptName} Workforce Plan — ${status} #${i}`,
            planning_period: 'QUARTERLY',
            planning_quarter: 'Q2',
            planning_year: 2026,
            status,
            created_by_user_id: creatorUser.id,
            approved_by_user_id:
              ['APPROVED', 'CLOSED', 'UNDER_CEO_REVIEW'].includes(status)
                ? approverUser.id
                : null,
            approval_date: ['APPROVED', 'CLOSED'].includes(status)
              ? new Date()
              : null,
            justification: `Workforce expansion plan for ${assignment.deptName} — status: ${status}.`,
            version_number: 1,
            business_unit: `${assignment.deptName} Ops`,
            submitted_at: status !== 'DRAFT' ? new Date() : null,
            hr_comments:
              status === 'RETURNED_FOR_REVISION'
                ? 'Please align salary budget with HR guidelines before resubmitting.'
                : null,
            ceo_comments:
              status === 'REJECTED'
                ? 'Rejected due to quarterly budget overruns. Please revise headcount.'
                : null,
            returned_comments:
              status === 'RETURNED_FOR_REVISION'
                ? 'Budget figures need revision.'
                : null,
            returned_at: status === 'RETURNED_FOR_REVISION' ? new Date() : null,
            returned_by_user_id:
              status === 'RETURNED_FOR_REVISION'
                ? userMap['hr1@erms.com'].id
                : null,
          },
        });

        const item1 = await prisma.workforcePlanItem.create({
          data: {
            workforce_plan_id: plan.id,
            department_id: dept.id,
            job_title: `${assignment.deptName} Specialist`,
            employment_type: 'FULL_TIME',
            headcount: 2,
            planned_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            justification: 'Increased project roadmap requirements.',
            job_grade: 'Grade 8',
            salary_budget: new Prisma.Decimal(5000),
            priority: 'HIGH',
            position_type: 'NEW',
          },
        });
        const item2 = await prisma.workforcePlanItem.create({
          data: {
            workforce_plan_id: plan.id,
            department_id: dept.id,
            job_title: `Lead ${assignment.deptName} Consultant`,
            employment_type: 'CONTRACT',
            headcount: 1,
            planned_start: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            justification: 'Expert advisory support needed.',
            job_grade: 'Grade 10',
            salary_budget: new Prisma.Decimal(9500),
            priority: 'CRITICAL',
            position_type: 'REPLACEMENT',
          },
        });
        seededPlanItems.push(item1, item2);

        if (status !== 'DRAFT') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'SUBMITTED',
              actor_user_id: creatorUser.id,
              comments: 'Submitted for review.',
            },
          });
        }
        if (
          [
            'UNDER_HR_REVIEW',
            'UNDER_CEO_REVIEW',
            'APPROVED',
            'REJECTED',
            'CLOSED',
          ].includes(status)
        ) {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'REVIEWED',
              actor_user_id: userMap['hr1@erms.com'].id,
              comments: 'HR reviewed and forwarded.',
            },
          });
        }
        if (['APPROVED', 'CLOSED'].includes(status)) {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'APPROVED',
              actor_user_id: approverUser.id,
              comments: 'Approved by CEO.',
            },
          });
        }
        if (status === 'REJECTED') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'REJECTED',
              actor_user_id: approverUser.id,
              comments: 'Rejected due to budget overruns.',
            },
          });
        }
        if (status === 'RETURNED_FOR_REVISION') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'WorkforcePlan',
              entity_id: plan.id,
              action: 'RETURNED_FOR_REVISION',
              actor_user_id: userMap['hr1@erms.com'].id,
              comments: 'Budget figures need revision.',
            },
          });
        }
        planIndex++;
      }
    }
    console.log(
      '✓ Workforce plans created (2 per status × 8 statuses = 16 plans)',
    );

    // ── 3. Recruitment Requests ─────────────────────────────────────────────────
    const rrStatuses: RecruitmentRequestStatus[] = [
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ];
    const rrRequesterEmails = ['hm1@erms.com', 'hm2@erms.com', 'hm3@erms.com'];
    const rrDepts = ['Engineering', 'Sales', 'Human Resources', 'Finance'];
    let requestIndex = 1;

    for (const rrStatus of rrStatuses) {
      for (let i = 1; i <= 2; i++) {
        const requester =
          userMap[rrRequesterEmails[requestIndex % rrRequesterEmails.length]];
        const deptName = rrDepts[requestIndex % rrDepts.length];
        const dept = departmentMap[deptName];
        const wpi = seededPlanItems[requestIndex % seededPlanItems.length];
        const job_title = `${deptName} Analyst #${requestIndex}`;

        const rr = await prisma.recruitmentRequest.upsert({
          where: { id: `rr-${requestIndex}` },
          update: {},
          create: {
            id: `rr-${requestIndex}`,
            company_id: company.id,
            planning_type: 'PLANNED',
            workforce_plan_item_id: wpi.id,
            requested_by_user_id: requester.id,
            department_id: dept.id,
            job_title,
            position_name: job_title,
            employment_type: 'FULL_TIME',
            request_type: 'NEW_HEADCOUNT',
            justification: `Core headcount addition for ${deptName} team.`,
            status: rrStatus,
            priority: 'MEDIUM',
            request_number: `REQ-2026-${String(requestIndex).padStart(3, '0')}`,
            approved_by_user_id:
              rrStatus === 'APPROVED'
                ? userMap['hradmin1@erms.com'].id
                : null,
            hr_comments:
              rrStatus === 'REJECTED'
                ? 'Position already filled or lack of approved budget.'
                : null,
          },
        });

        if (rrStatus !== 'DRAFT' && rrStatus !== 'CANCELLED') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'RecruitmentRequest',
              entity_id: rr.id,
              action: 'SUBMITTED',
              actor_user_id: requester.id,
              comments: 'Submitted for HR review.',
            },
          });
        }
        if (rrStatus === 'APPROVED') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'RecruitmentRequest',
              entity_id: rr.id,
              action: 'APPROVED',
              actor_user_id: userMap['hradmin1@erms.com'].id,
              comments: 'Approved. Proceed with vacancy creation.',
            },
          });
        }
        if (rrStatus === 'REJECTED') {
          await prisma.recruitmentApprovalHistory.create({
            data: {
              entity_type: 'RecruitmentRequest',
              entity_id: rr.id,
              action: 'REJECTED',
              actor_user_id: userMap['hr1@erms.com'].id,
              comments: 'Budget not available for this quarter.',
            },
          });
        }
        requestIndex++;
      }
    }
    console.log(
      '✓ Recruitment requests created (2 per status × 6 statuses = 12 requests)',
    );

    // ── 4. Vacancies ───────────────────────────────────────────────────────────
    const vacancyStatuses: VacancyStatus[] = [
      'DRAFT',
      'OPEN',
      'PUBLISHED',
      'IN_PROGRESS',
      'ON_HOLD',
      'CLOSED',
      'CANCELLED',
    ];
    const seededVacancies: any[] = [];
    let vacIndex = 1;

    // Helper to create a backing recruitment request for a vacancy
    const makeBackingRR = async (
      deptName: string,
      jobTitle: string,
      idx: number,
    ) => {
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
          request_number: `REQ-VAC-2026-${String(idx).padStart(3, '0')}`,
          approved_by_user_id: userMap['ceo1@erms.com'].id,
        },
      });
    };

    // 2 per status
    for (const vacStatus of vacancyStatuses) {
      for (let v = 1; v <= 2; v++) {
        const deptName = rrDepts[vacIndex % rrDepts.length];
        const dept = departmentMap[deptName];
        const job_title = `${deptName} ${vacStatus === 'IN_PROGRESS' ? 'Engineer' : 'Specialist'} (${vacStatus} #${v})`;
        const isPublicFacing = ['PUBLISHED', 'IN_PROGRESS', 'OPEN'].includes(
          vacStatus,
        );

        const rr = await makeBackingRR(deptName, job_title, vacIndex);
        const vac = await prisma.vacancy.upsert({
          where: { id: `vac-${vacIndex}` },
          update: {},
          create: {
            id: `vac-${vacIndex}`,
            company_id: company.id,
            recruitment_request_id: rr.id,
            title: job_title,
            department_id: dept.id,
            location: 'Addis Ababa',
            employment_type: 'FULL_TIME',
            status: vacStatus,
            posting_status: isPublicFacing ? 'PUBLISHED' : 'DRAFT',
            open_positions: 2,
            description: `We are looking for a qualified ${deptName} professional. This is a ${vacStatus.toLowerCase().replace(/_/g, ' ')} vacancy. Join our growing team and make an impact in a dynamic environment.`,
            responsibilities:
              'Participate in team meetings, deliver assigned work, and contribute to department goals.',
            requirements:
              'Bachelor degree in a relevant field and 3+ years of experience.',
            required_qualifications: 'BSc in relevant discipline.',
            required_experience: 3,
            vacancy_number: `VAC-2026-${String(vacIndex).padStart(3, '0')}`,
            posted_at: isPublicFacing
              ? new Date(Date.now() - vacIndex * 7 * 24 * 60 * 60 * 1000)
              : null,
            opening_date: isPublicFacing
              ? new Date(Date.now() - vacIndex * 7 * 24 * 60 * 60 * 1000)
              : null,
            closing_date: isPublicFacing
              ? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
              : null,
            approved_at: isPublicFacing ? new Date() : null,
            closed_at: vacStatus === 'CLOSED' ? new Date() : null,
          },
        });
        seededVacancies.push(vac);
        vacIndex++;
      }
    }

    // 6 dedicated "Browse Jobs" PUBLISHED vacancies
    const browseVacancyDefs = [
      {
        title: 'Senior Software Engineer',
        dept: 'Engineering',
        employType: 'FULL_TIME' as const,
        exp: 5,
        salary: 8000,
        tag: 'SWE-Sr',
      },
      {
        title: 'Junior Frontend Developer',
        dept: 'Engineering',
        employType: 'FULL_TIME' as const,
        exp: 1,
        salary: 4500,
        tag: 'FE-Jr',
      },
      {
        title: 'Data Analyst',
        dept: 'Finance',
        employType: 'FULL_TIME' as const,
        exp: 3,
        salary: 6000,
        tag: 'DA',
      },
      {
        title: 'HR Coordinator',
        dept: 'Human Resources',
        employType: 'FULL_TIME' as const,
        exp: 2,
        salary: 5000,
        tag: 'HR-Coord',
      },
      {
        title: 'Marketing Specialist',
        dept: 'Marketing',
        employType: 'FULL_TIME' as const,
        exp: 3,
        salary: 5500,
        tag: 'MKT',
      },
      {
        title: 'Customer Support Lead',
        dept: 'Customer Support',
        employType: 'FULL_TIME' as const,
        exp: 2,
        salary: 4800,
        tag: 'CS-Lead',
      },
    ];

    const browseVacancies: any[] = [];
    for (const bv of browseVacancyDefs) {
      const rr = await makeBackingRR(bv.dept, bv.title, vacIndex);
      const vac = await prisma.vacancy.upsert({
        where: { id: `vac-browse-${bv.tag}` },
        update: {},
        create: {
          id: `vac-browse-${bv.tag}`,
          company_id: company.id,
          recruitment_request_id: rr.id,
          title: bv.title,
          department_id: departmentMap[bv.dept].id,
          location: 'Addis Ababa',
          employment_type: bv.employType,
          status: 'PUBLISHED',
          posting_status: 'PUBLISHED',
          open_positions: 3,
          description: `We are seeking a talented ${bv.title} to join our ${bv.dept} team. You will work on challenging projects, collaborate with a talented team, and have the opportunity to grow your career in a fast-paced environment. We offer competitive salary, flexible working hours, and excellent benefits.`,
          responsibilities: `Lead ${bv.dept.toLowerCase()} initiatives, collaborate with cross-functional teams, and deliver high-quality work that meets organizational goals.`,
          requirements: `${bv.exp}+ years of relevant experience, strong communication skills, and a passion for continuous learning.`,
          required_qualifications: `Bachelor's degree in a relevant field. Master's degree is a plus.`,
          required_experience: bv.exp,
          vacancy_number: `VAC-BROWSE-2026-${String(vacIndex).padStart(3, '0')}`,
          posted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          opening_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          approved_at: new Date(),
        },
      });
      browseVacancies.push(vac);
      vacIndex++;
    }
    console.log(
      `✓ Vacancies created (${seededVacancies.length} status-coverage + ${browseVacancies.length} browse-ready = ${seededVacancies.length + browseVacancies.length} total)`,
    );

    console.log('\n✅ Master data seeded successfully!');
    console.log('─────────────────────────────────────────────────────────');
  } catch (error) {
    console.error('Error seeding master data:', error);
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

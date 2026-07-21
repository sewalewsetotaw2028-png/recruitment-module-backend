import 'dotenv/config';
import { Prisma } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLES,
} from '../../src/config/rolePermissions';
import prisma from '../../src/config/database';

const formatLabel = (slug: string) =>
  slug.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

// ─── Permission descriptions ───────────────────────────────────────────────────
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'workforce_plan:read': 'View workforce plans and their details',
  'workforce_plan:create': 'Create new workforce plans',
  'workforce_plan:update': 'Edit existing workforce plans',
  'workforce_plan:submit': 'Submit a workforce plan for HR review',
  'workforce_plan:forward': 'Forward a workforce plan to CEO for approval',
  'workforce_plan:approve': 'Approve workforce plans at the HR or CEO stage',
  'workforce_plan:reject': 'Reject a workforce plan with comments',
  'workforce_plan:return': 'Return a workforce plan for revision',
  'recruitment_request:read': 'View recruitment requests',
  'recruitment_request:create': 'Create new recruitment requests',
  'recruitment_request:update': 'Edit existing recruitment requests',
  'recruitment_request:submit': 'Submit a recruitment request for HR review',
  'recruitment_request:forward': 'Forward a recruitment request for approval',
  'recruitment_request:approve': 'Approve a recruitment request',
  'recruitment_request:reject': 'Reject a recruitment request with comments',
  'vacancy:read': 'View vacancies and their applicant lists',
  'vacancy:create': 'Create new vacancies from approved recruitment requests',
  'vacancy:update': 'Edit vacancy details, requirements, and status',
  'vacancy:publish': 'Post a vacancy to external job channels',
  'vacancy:close': 'Close a vacancy and stop accepting applications',
  'application:read': 'View applications and their current status',
  'application:screen': 'Screen applications during initial review',
  'application:shortlist': 'Shortlist applications for interviews',
  'application:reject': 'Reject an application at any stage',
  'interview:read': 'View scheduled and completed interviews',
  'interview:create': 'Schedule new interviews for shortlisted candidates',
  'interview:update': 'Reschedule or cancel an existing interview',
  'interview:evaluate': 'Submit an evaluation form after an interview',
  'offer:read': 'View employment offers issued to candidates',
  'offer:create': 'Issue a new employment offer to a selected candidate',
  'offer:update': 'Modify or withdraw an existing offer',
  'talent_roster:read': 'View the talent roster of stored candidate profiles',
  'talent_roster:manage':
    'Add/remove candidates and update talent roster entries',
  'hiring_minute:read': 'View hiring minutes and their decisions',
  'hiring_minute:create': 'Prepare a new hiring minute for a vacancy',
  'hiring_minute:update': 'Update or sign off on a hiring minute',
  'hiring_minute:approve': 'Approve a hiring minute as the final approver',
  'department:read': 'View department structure and details',
  'department:create': 'Create new departments',
  'report:read': 'View recruitment reports, KPIs, and analytics dashboards',
  'candidate_application:read':
    'View your own candidate applications and their status',
  'my_vacancy:read': 'View vacancies assigned to you as a hiring manager',
  'my_interview:read':
    'View interviews where you are assigned as a panel member',
  'my_evaluation:read': 'View pending interview evaluations assigned to you',
  'config:manage': 'Manage roles, permissions, templates, and system settings',
};

async function main() {
  try {
    const passwordHash = await bcryptjs.hash('Password', 12);

    // ── 1. Company ──────────────────────────────────────────────────────────────
    const company = await prisma.company.upsert({
      where: { company_code: 'ADIU' },
      update: {},
      create: {
        company_code: 'ADIU',
        name: 'Adiu Seed Company',
        email: 'admin@erms.com',
        phone: '+251 11 000 0000',
        address: '456 Recruiter Blvd, Addis Ababa',
        website: 'https://adiu.et',
        industry: 'Recruitment Technology',
      },
    });
    console.log('✓ Company created (id=%s)', company.id);

    // ── 2. Permissions ──────────────────────────────────────────────────────────
    const permissionSlugs = Array.from(new Set(Object.values(PERMISSIONS)));
    const permissions = await Promise.all(
      permissionSlugs.map((permissionSlug) => {
        const [moduleName, action] = permissionSlug.split(':');
        return prisma.appPermission.upsert({
          where: { slug: permissionSlug },
          update: {
            name: formatLabel(permissionSlug),
            module: moduleName,
            action: action ?? '',
            description:
              PERMISSION_DESCRIPTIONS[permissionSlug] ??
              formatLabel(permissionSlug),
          },
          create: {
            name: formatLabel(permissionSlug),
            slug: permissionSlug,
            module: moduleName,
            action: action ?? '',
            description:
              PERMISSION_DESCRIPTIONS[permissionSlug] ??
              formatLabel(permissionSlug),
          },
        });
      }),
    );
    const permissionMap = permissions.reduce<Record<string, string>>(
      (map, perm) => {
        map[perm.slug] = perm.id;
        return map;
      },
      {},
    );
    console.log('✓ Permissions created');

    // ── 3. App Roles ────────────────────────────────────────────────────────────
    const roleDescriptions: Record<string, string> = {
      ceo: 'Final approver for workforce plans and recruitment requests',
      hr_admin: 'Full HR operations and system configuration access',
      hr: 'HR operations — recruitment, screening, interviews, offers',
      work_unit:
        'Operational unit user for workforce plans and recruitment requests',
      recruiter: 'Manages vacancies, applications, screening and shortlisting',
      hiring_manager:
        'Submits recruitment requests and participates in interviews',
      department_manager:
        'Initiates workforce planning and recruitment requests',
      interviewer: 'Conducts interviews and submits evaluations',
      candidate: 'External applicant — portal access only',
    };
    const appRoles: Record<string, any> = {};
    for (const [, slug] of Object.entries(ROLES)) {
      appRoles[slug] = await prisma.appRole.upsert({
        where: { company_id_slug: { company_id: company.id, slug } },
        update: {
          name: formatLabel(slug),
          description: roleDescriptions[slug] ?? '',
          is_system: true,
        },
        create: {
          company_id: company.id,
          name: formatLabel(slug),
          slug,
          description: roleDescriptions[slug] ?? '',
          is_system: true,
        },
      });
    }
    console.log('✓ App roles created');

    // ── 4. Role → Permission Assignments ────────────────────────────────────────
    const rolePermissionData = Object.entries(DEFAULT_ROLE_PERMISSIONS).flatMap(
      ([roleSlug, permissionSlugs]) => {
        const roleId = appRoles[roleSlug]?.id;
        if (!roleId) return [];
        return permissionSlugs
          .map((permSlug) => {
            const permissionId = permissionMap[permSlug];
            if (!permissionId) return null;
            return { role_id: roleId, permission_id: permissionId };
          })
          .filter(
            (x): x is { role_id: string; permission_id: string } => x !== null,
          );
      },
    );
    await prisma.appRolePermission.createMany({
      data: rolePermissionData,
      skipDuplicates: true,
    });
    console.log('✓ Role permissions assigned');

    // ── 5. Default Approval Workflows ──────────────────────────────────────────
    const hrRoleId = appRoles['hr']?.id ?? null;
    const ceoRoleId = appRoles['ceo']?.id ?? null;
    for (const wf of [
      {
        name: 'Workforce Plan Approval',
        entity_type: 'WorkforcePlan' as const,
        stages: [
          {
            stage_order: 0,
            stage_name: 'HR Review',
            approver_role_id: hrRoleId,
            is_mandatory: true,
          },
          {
            stage_order: 1,
            stage_name: 'CEO Approval',
            approver_role_id: ceoRoleId,
            is_mandatory: true,
          },
        ],
      },
      {
        name: 'Recruitment Request Approval',
        entity_type: 'RecruitmentRequest' as const,
        stages: [
          {
            stage_order: 0,
            stage_name: 'HR Review',
            approver_role_id: hrRoleId,
            is_mandatory: true,
          },
        ],
      },
    ]) {
      const existing = await prisma.approvalWorkflow.findFirst({
        where: {
          company_id: company.id,
          entity_type: wf.entity_type,
          name: wf.name,
        },
      });
      const workflow = existing
        ? await prisma.approvalWorkflow.update({
            where: { id: existing.id },
            data: { is_active: true },
          })
        : await prisma.approvalWorkflow.create({
            data: {
              company_id: company.id,
              name: wf.name,
              entity_type: wf.entity_type,
              is_active: true,
            },
          });
      await prisma.approvalWorkflowStage.deleteMany({
        where: { workflow_id: workflow.id },
      });
      await prisma.approvalWorkflowStage.createMany({
        data: wf.stages.map((s) => ({ ...s, workflow_id: workflow.id })),
      });
    }
    console.log('✓ Approval workflows created');

    // ── 6. Users ────────────────────────────────────────────────────────────────
    const userEntries = [
      {
        email: 'ceo1@erms.com',
        first_name: 'Alice',
        last_name: 'Admasu',
        roleSlugs: ['ceo'],
      },
      {
        email: 'ceo2@erms.com',
        first_name: 'Bob',
        last_name: 'Bekele',
        roleSlugs: ['ceo'],
      },
      {
        email: 'ceo3@erms.com',
        first_name: 'Charlie',
        last_name: 'Chala',
        roleSlugs: ['ceo'],
      },
      {
        email: 'hradmin1@erms.com',
        first_name: 'David',
        last_name: 'Daniel',
        roleSlugs: ['hr_admin'],
      },
      {
        email: 'hradmin2@erms.com',
        first_name: 'Emma',
        last_name: 'Eshatu',
        roleSlugs: ['hr_admin'],
      },
      {
        email: 'hradmin3@erms.com',
        first_name: 'Fiona',
        last_name: 'Fikru',
        roleSlugs: ['hr_admin'],
      },
      {
        email: 'hr1@erms.com',
        first_name: 'Grace',
        last_name: 'Girma',
        roleSlugs: ['hr'],
      },
      {
        email: 'hr2@erms.com',
        first_name: 'Henry',
        last_name: 'Hagos',
        roleSlugs: ['hr'],
      },
      {
        email: 'hr3@erms.com',
        first_name: 'Isabella',
        last_name: 'Ibrahim',
        roleSlugs: ['hr'],
      },
      {
        email: 'recruiter1@erms.com',
        first_name: 'Jack',
        last_name: 'Joseph',
        roleSlugs: ['recruiter'],
      },
      {
        email: 'recruiter2@erms.com',
        first_name: 'Karen',
        last_name: 'Kebede',
        roleSlugs: ['recruiter'],
      },
      {
        email: 'recruiter3@erms.com',
        first_name: 'Leo',
        last_name: 'Lema',
        roleSlugs: ['recruiter'],
      },
      {
        email: 'hm1@erms.com',
        first_name: 'Maya',
        last_name: 'Mulugeta',
        roleSlugs: ['hiring_manager'],
      },
      {
        email: 'hm2@erms.com',
        first_name: 'Noah',
        last_name: 'Negasi',
        roleSlugs: ['hiring_manager'],
      },
      {
        email: 'hm3@erms.com',
        first_name: 'Olivia',
        last_name: 'Oumer',
        roleSlugs: ['hiring_manager'],
      },
      {
        email: 'dm1@erms.com',
        first_name: 'Paul',
        last_name: 'Petros',
        roleSlugs: ['department_manager'],
      },
      {
        email: 'dm2@erms.com',
        first_name: 'Quinn',
        last_name: 'Qasile',
        roleSlugs: ['department_manager'],
      },
      {
        email: 'dm3@erms.com',
        first_name: 'Rachel',
        last_name: 'Rediet',
        roleSlugs: ['department_manager'],
      },
      {
        email: 'interviewer1@erms.com',
        first_name: 'Sam',
        last_name: 'Samuel',
        roleSlugs: ['interviewer'],
      },
      {
        email: 'interviewer2@erms.com',
        first_name: 'Tina',
        last_name: 'Tsegaye',
        roleSlugs: ['interviewer'],
      },
      {
        email: 'interviewer3@erms.com',
        first_name: 'Victor',
        last_name: 'Vasilis',
        roleSlugs: ['interviewer'],
      },
      {
        email: 'canduser1@erms.com',
        first_name: 'Wendy',
        last_name: 'Worku',
        roleSlugs: ['candidate'],
      },
      {
        email: 'canduser2@erms.com',
        first_name: 'Xavier',
        last_name: 'Xo',
        roleSlugs: ['candidate'],
      },
      {
        email: 'canduser3@erms.com',
        first_name: 'Yasmine',
        last_name: 'Yasin',
        roleSlugs: ['candidate'],
      },
    ];

    const seededUsers: Record<string, any> = {};
    for (const entry of userEntries) {
      const dbUser = await prisma.user.upsert({
        where: { email: entry.email },
        update: {},
        create: {
          company_id: company.id,
          first_name: entry.first_name,
          last_name: entry.last_name,
          email: entry.email,
          phone: '+251 911 000 000',
          password_hash: passwordHash,
          is_active: true,
          terms_accepted: true,
          is_email_verified: true,
        },
      });
      seededUsers[entry.email] = dbUser;
      await prisma.appUserRole.createMany({
        data: entry.roleSlugs.map((slug) => ({
          user_id: dbUser.id,
          role_id: appRoles[slug].id,
        })),
        skipDuplicates: true,
      });
      // Phone: use findFirst + create because there is no unique composite on (user_id, phone_type)
      const existingPhone = await prisma.phone.findFirst({
        where: { user_id: dbUser.id, phone_type: 'PRIVATE' },
      });
      if (!existingPhone) {
        await prisma.phone.create({
          data: {
            company_id: company.id,
            user_id: dbUser.id,
            phone_number: '+251 911 000 000',
            phone_type: 'PRIVATE',
            is_primary: true,
          },
        });
      }

      // Address: findFirst then create since Address has no unique constraint on user_id
      const existingAddress = await prisma.address.findFirst({
        where: { user_id: dbUser.id },
      });
      if (!existingAddress) {
        await prisma.address.create({
          data: {
            company_id: company.id,
            user_id: dbUser.id,
            region: 'Addis Ababa',
            city: 'Addis Ababa',
          },
        });
      }
    }
    console.log('✓ Users created (3 per role + 3 candidate portal users)');

    // ── 7. Departments ─────────────────────────────────────────────────────────
    const departmentMap: Record<string, any> = {};
    for (const dept of [
      { name: 'Engineering', managerEmail: 'dm1@erms.com' },
      { name: 'Human Resources', managerEmail: 'hr1@erms.com' },
      { name: 'Sales', managerEmail: 'dm3@erms.com' },
      { name: 'Finance', managerEmail: 'dm2@erms.com' },
      { name: 'Marketing', managerEmail: 'hradmin1@erms.com' },
      { name: 'Customer Support', managerEmail: 'interviewer3@erms.com' },
    ]) {
      departmentMap[dept.name] = await prisma.department.upsert({
        where: { company_id_name: { company_id: company.id, name: dept.name } },
        update: { manager_id: seededUsers[dept.managerEmail]?.id },
        create: {
          company_id: company.id,
          name: dept.name,
          manager_id: seededUsers[dept.managerEmail]?.id,
        },
      });
    }
    console.log('✓ Departments created (6)');

    console.log('\n✅ Base data seeded successfully!');
    console.log('─────────────────────────────────────────────────────────');
  } catch (error) {
    console.error('Error seeding base data:', error);
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

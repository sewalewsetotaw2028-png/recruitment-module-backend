/**
 * permissions.ts  —  BACKEND CANONICAL SOURCE OF TRUTH
 *
 * This file owns three things:
 *   1. ROLES            — every role slug that can exist in AppRole.slug
 *   2. PERMISSIONS      — every permission slug that can exist in AppPermission.slug
 *   3. ROLE_PERMISSIONS — the DEFAULT matrix seeded into AppRolePermission on first deploy
 *
 * The database is the live source of truth at runtime. This file is used by:
 *   - The seed script  (writes ROLE_PERMISSIONS into AppRolePermission rows)
 *   - The permission middleware  (resolves slugs, normalises aliases)
 *   - The frontend shared-types package  (imports ROLES and PERMISSIONS only — NOT the matrix)
 *
 * HR admins can change individual role→permission mappings via the config UI.
 * Those changes live in the database. This file is NOT re-read at runtime —
 * it is only the starting state.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ISSUES FIXED FROM PREVIOUS VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Slug inconsistency — the old file had both "hiring_manager" and "hiring-manager"
 *    and both "hr_admin" and "hr_manager". All slugs are now underscore-only and the
 *    ROLE_ALIASES map handles any legacy hyphenated values still in the database.
 *
 * 2. Permissions now follow the pattern  "{module}:{action}"  so the config UI
 *    can build a matrix (rows = modules, columns = roles, cells = checkboxes per
 *    action) without needing any extra metadata.
 *
 * 3. CEO had full write access to everything in the old file. Per the BRD the CEO
 *    only approves — they do not create vacancies, schedule interviews, or issue
 *    offers. Fixed below.
 *
 * 4. INTERVIEWER role previously had only read permissions. Panel members must be
 *    able to submit evaluations. Fixed below.
 *
 * 5. Added CONFIG permissions — the config page itself must be permission-gated.
 */

// ─────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────

export const ROLES = {
  CEO: 'ceo',
  HR_ADMIN: 'hr_admin',
  HR: 'hr',
  /**
   * "Work unit" is a BRD/config-UI role used for operational unit users who can
   * initiate and manage workforce planning and recruitment requests.
   */
  WORK_UNIT: 'work_unit',
  RECRUITER: 'recruiter',
  HIRING_MANAGER: 'hiring_manager',
  DEPARTMENT_MANAGER: 'department_manager',
  INTERVIEWER: 'interviewer',
  CANDIDATE: 'candidate',
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

/**
 * Legacy slug aliases — normalise anything in the DB that predates the
 * unified underscore convention. Add entries here; never change the ROLES
 * constants above once the seed has run.
 */
export const ROLE_ALIASES: Record<string, RoleSlug> = {
  'hiring-manager': ROLES.HIRING_MANAGER,
  'hr-admin': ROLES.HR_ADMIN,
  hr_manager: ROLES.HR,
};

// ─────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────
// Slug convention: "{module}:{action}"
// module  — matches AppPermission.module column
// action  — one of "create" | "read" | "update" | "delete" | "approve" | "submit"
//
// "approve" and "submit" are treated as distinct actions because the config UI
// needs to show them separately (a hiring manager can submit a plan but not approve it).

export const PERMISSIONS = {
  // ── Workforce planning ──────────────────────
  WORKFORCE_PLAN_READ: 'workforce_plan:read',
  WORKFORCE_PLAN_CREATE: 'workforce_plan:create',
  WORKFORCE_PLAN_UPDATE: 'workforce_plan:update',
  WORKFORCE_PLAN_UPDATE_ANY_DEPARTMENT: 'workforce_plan:update_any_department',
  WORKFORCE_PLAN_SUBMIT: 'workforce_plan:submit',
  WORKFORCE_PLAN_FORWARD: 'workforce_plan:forward',
  WORKFORCE_PLAN_APPROVE: 'workforce_plan:approve',
  WORKFORCE_PLAN_REJECT: 'workforce_plan:reject',
  WORKFORCE_PLAN_RETURN: 'workforce_plan:return',

  // ── Recruitment request ──────────────────────
  RECRUITMENT_REQUEST_READ: 'recruitment_request:read',
  RECRUITMENT_REQUEST_CREATE: 'recruitment_request:create',
  RECRUITMENT_REQUEST_UPDATE: 'recruitment_request:update',
  RECRUITMENT_REQUEST_SUBMIT: 'recruitment_request:submit',
  RECRUITMENT_REQUEST_FORWARD: 'recruitment_request:forward',
  RECRUITMENT_REQUEST_APPROVE: 'recruitment_request:approve',
  RECRUITMENT_REQUEST_REJECT: 'recruitment_request:reject',

  // ── Vacancy ──────────────────────────────────
  VACANCY_READ: 'vacancy:read',
  VACANCY_CREATE: 'vacancy:create',
  VACANCY_UPDATE: 'vacancy:update',
  VACANCY_PUBLISH: 'vacancy:publish', // post to channels
  VACANCY_CLOSE: 'vacancy:close',

  // ── Applications ─────────────────────────────
  APPLICATION_READ: 'application:read',
  APPLICATION_SCREEN: 'application:screen',
  APPLICATION_SHORTLIST: 'application:shortlist',
  APPLICATION_REJECT: 'application:reject',

  // ── Shortlisting ─────────────────────────────
  SHORTLIST_READ: 'shortlist:read',
  SHORTLIST_CREATE: 'shortlist:create',

  // ── Interview ────────────────────────────────
  INTERVIEW_READ: 'interview:read',
  VIEW_INTERVIEWS: 'interview:view', // Added for interviews list page access
  INTERVIEW_CREATE: 'interview:create', // schedule
  INTERVIEW_UPDATE: 'interview:update', // reschedule / cancel
  INTERVIEW_EVALUATE: 'interview:evaluate', // submit evaluation form

  // ── Offer ────────────────────────────────────
  OFFER_READ: 'offer:read',
  OFFER_CREATE: 'offer:create',
  OFFER_UPDATE: 'offer:update',

  // ── Talent roster ────────────────────────────
  TALENT_ROSTER_READ: 'talent_roster:read',
  TALENT_ROSTER_MANAGE: 'talent_roster:manage',

  // ── Hiring minute ────────────────────────────
  HIRING_MINUTE_READ: 'hiring_minute:read',
  HIRING_MINUTE_CREATE: 'hiring_minute:create',
  HIRING_MINUTE_UPDATE: 'hiring_minute:update',
  HIRING_MINUTE_APPROVE: 'hiring_minute:approve',

  // ── Department ───────────────────────────────
  DEPARTMENT_READ: 'department:read',
  DEPARTMENT_CREATE: 'department:create',

  // ── Reporting ────────────────────────────────
  REPORT_READ: 'report:read',

  // ── Dashboard — candidate/personal widgets ──
  CANDIDATE_APPLICATION_READ: 'candidate_application:read',
  MY_VACANCY_READ: 'my_vacancy:read',
  MY_INTERVIEW_READ: 'my_interview:read',
  MY_EVALUATION_READ: 'my_evaluation:read',

  // ── System configuration ─────────────────────
  CONFIG_MANAGE: 'config:manage',

  // ─────────────────────────────────────────────
  // Legacy aliases (keep route code stable)
  // ─────────────────────────────────────────────
  // The backend and DB use the "{module}:{action}" slugs above. Some older route
  // files still reference permission constants like VIEW_DEPARTMENTS; map them
  // to the canonical slugs so the middleware can still do slug checks.
  VIEW_DEPARTMENTS: 'department:read',
  CREATE_DEPARTMENT: 'department:create',
  VIEW_WORKFORCE_PLANS: 'workforce_plan:read',
  CREATE_WORKFORCE_PLAN: 'workforce_plan:create',
  UPDATE_WORKFORCE_PLAN: 'workforce_plan:update',
  SUBMIT_WORKFORCE_PLAN: 'workforce_plan:submit',
  FORWARD_WORKFORCE_PLAN: 'workforce_plan:forward',
  APPROVE_WORKFORCE_PLAN: 'workforce_plan:approve',
  REJECT_WORKFORCE_PLAN: 'workforce_plan:reject',
  RETURN_WORKFORCE_PLAN: 'workforce_plan:return',
  VIEW_REQUESTS: 'recruitment_request:read',
  CREATE_REQUEST: 'recruitment_request:create',
  UPDATE_REQUEST: 'recruitment_request:update',
  SUBMIT_REQUEST: 'recruitment_request:submit',
  FORWARD_REQUEST: 'recruitment_request:forward',
  APPROVE_REQUEST: 'recruitment_request:approve',
  REJECT_REQUEST: 'recruitment_request:reject',
  VIEW_VACANCIES: 'vacancy:read',
  CREATE_VACANCY: 'vacancy:create',
  UPDATE_VACANCY: 'vacancy:update',
  POST_VACANCY: 'vacancy:publish',
  CLOSE_VACANCY: 'vacancy:close',
  CREATE_INTERVIEW: 'interview:create',
  SCHEDULE_INTERVIEW: 'interview:create',
  UPDATE_INTERVIEW: 'interview:update',
  CANCEL_INTERVIEW: 'interview:update',
  EVALUATE_INTERVIEW: 'interview:evaluate',
  VIEW_EVALUATIONS: 'interview:evaluate',
  VIEW_ROASTER: 'talent_roster:read',
  ADD_TO_ROASTER: 'talent_roster:manage',
  ISSUE_OFFER: 'offer:create',
  VIEW_DASHBOARD: 'report:read',
  REPORTS_READ: 'report:read',
  CONFIG_READ: 'config:manage',
  CONFIG_WRITE: 'config:manage',
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─────────────────────────────────────────────
// DEFAULT ROLE → PERMISSION MATRIX
// ─────────────────────────────────────────────
// Used ONLY by the seed script. The database is authoritative at runtime.
// HR admins can modify any mapping via the config UI after the seed runs.

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleSlug, PermissionSlug[]> = {
  // CEO — approves, returns, and rejects workforce plans; does NOT perform operational HR tasks
  [ROLES.CEO]: [
    // CEO only approves, returns, or rejects workforce plans
    PERMISSIONS.WORKFORCE_PLAN_READ,
    PERMISSIONS.WORKFORCE_PLAN_APPROVE,
    PERMISSIONS.WORKFORCE_PLAN_REJECT,
    PERMISSIONS.WORKFORCE_PLAN_RETURN,
  ],

  // HR Admin — full operational + configuration access, can reject but not approve workforce plans
  [ROLES.HR_ADMIN]: [
    // HR Admin can reject but not approve workforce plans (CEO approves)
    PERMISSIONS.WORKFORCE_PLAN_CREATE,
    PERMISSIONS.WORKFORCE_PLAN_READ,
    PERMISSIONS.WORKFORCE_PLAN_UPDATE,
    PERMISSIONS.WORKFORCE_PLAN_UPDATE_ANY_DEPARTMENT,
    PERMISSIONS.WORKFORCE_PLAN_SUBMIT,
    PERMISSIONS.WORKFORCE_PLAN_FORWARD,
    PERMISSIONS.WORKFORCE_PLAN_REJECT,
    PERMISSIONS.WORKFORCE_PLAN_RETURN,
    PERMISSIONS.RECRUITMENT_REQUEST_CREATE,
    PERMISSIONS.RECRUITMENT_REQUEST_READ,
    PERMISSIONS.RECRUITMENT_REQUEST_UPDATE,
    PERMISSIONS.RECRUITMENT_REQUEST_FORWARD,
    PERMISSIONS.RECRUITMENT_REQUEST_APPROVE,
    PERMISSIONS.RECRUITMENT_REQUEST_REJECT,
    PERMISSIONS.VACANCY_CREATE,
    PERMISSIONS.VACANCY_READ,
    PERMISSIONS.VACANCY_UPDATE,
    PERMISSIONS.VACANCY_PUBLISH,
    PERMISSIONS.VACANCY_CLOSE,
    PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.APPLICATION_SCREEN,
    PERMISSIONS.APPLICATION_SHORTLIST,
    PERMISSIONS.APPLICATION_REJECT,
    PERMISSIONS.INTERVIEW_CREATE,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.INTERVIEW_UPDATE,
    PERMISSIONS.INTERVIEW_EVALUATE,
    PERMISSIONS.OFFER_CREATE,
    PERMISSIONS.OFFER_READ,
    PERMISSIONS.OFFER_UPDATE,
    PERMISSIONS.TALENT_ROSTER_READ,
    PERMISSIONS.TALENT_ROSTER_MANAGE,
    PERMISSIONS.HIRING_MINUTE_CREATE,
    PERMISSIONS.HIRING_MINUTE_READ,
    PERMISSIONS.HIRING_MINUTE_APPROVE,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.CONFIG_MANAGE,
    // Dashboard personal widgets (for visibility in all views)
    PERMISSIONS.MY_VACANCY_READ,
    PERMISSIONS.MY_INTERVIEW_READ,
    PERMISSIONS.MY_EVALUATION_READ,
    PERMISSIONS.CANDIDATE_APPLICATION_READ,
  ],

  // HR — same as HR_ADMIN minus configuration write, can reject but not approve workforce plans
  [ROLES.HR]: [
    // HR can reject but not approve workforce plans (CEO approves)
    PERMISSIONS.WORKFORCE_PLAN_CREATE,
    PERMISSIONS.WORKFORCE_PLAN_READ,
    PERMISSIONS.WORKFORCE_PLAN_UPDATE,
    PERMISSIONS.WORKFORCE_PLAN_SUBMIT,
    PERMISSIONS.WORKFORCE_PLAN_FORWARD,
    PERMISSIONS.WORKFORCE_PLAN_REJECT,
    PERMISSIONS.WORKFORCE_PLAN_RETURN,
    PERMISSIONS.RECRUITMENT_REQUEST_CREATE,
    PERMISSIONS.RECRUITMENT_REQUEST_READ,
    PERMISSIONS.RECRUITMENT_REQUEST_UPDATE,
    PERMISSIONS.RECRUITMENT_REQUEST_FORWARD,
    PERMISSIONS.RECRUITMENT_REQUEST_APPROVE,
    PERMISSIONS.RECRUITMENT_REQUEST_REJECT,
    PERMISSIONS.VACANCY_CREATE,
    PERMISSIONS.VACANCY_READ,
    PERMISSIONS.VACANCY_UPDATE,
    PERMISSIONS.VACANCY_PUBLISH,
    PERMISSIONS.VACANCY_CLOSE,
    PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.APPLICATION_SCREEN,
    PERMISSIONS.APPLICATION_SHORTLIST,
    PERMISSIONS.APPLICATION_REJECT,
    PERMISSIONS.INTERVIEW_CREATE,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.INTERVIEW_UPDATE,
    PERMISSIONS.OFFER_CREATE,
    PERMISSIONS.OFFER_READ,
    PERMISSIONS.OFFER_UPDATE,
    PERMISSIONS.TALENT_ROSTER_READ,
    PERMISSIONS.TALENT_ROSTER_MANAGE,
    PERMISSIONS.HIRING_MINUTE_CREATE,
    PERMISSIONS.HIRING_MINUTE_READ,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.REPORT_READ,
    // Dashboard personal widgets
    PERMISSIONS.MY_VACANCY_READ,
    PERMISSIONS.MY_INTERVIEW_READ,
    PERMISSIONS.MY_EVALUATION_READ,
    PERMISSIONS.CANDIDATE_APPLICATION_READ,
  ],

  // Work Unit — creates and manages workforce plans & recruitment requests
  [ROLES.WORK_UNIT]: [
    PERMISSIONS.WORKFORCE_PLAN_CREATE,
    PERMISSIONS.WORKFORCE_PLAN_READ,
    PERMISSIONS.WORKFORCE_PLAN_UPDATE,
    PERMISSIONS.WORKFORCE_PLAN_SUBMIT,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.RECRUITMENT_REQUEST_CREATE,
    PERMISSIONS.RECRUITMENT_REQUEST_READ,
    PERMISSIONS.RECRUITMENT_REQUEST_UPDATE,
    PERMISSIONS.VACANCY_READ,
  ],

  // Recruiter — operational access; no config, no approvals, no offers
  [ROLES.RECRUITER]: [
    PERMISSIONS.WORKFORCE_PLAN_READ,
    PERMISSIONS.WORKFORCE_PLAN_CREATE,
    PERMISSIONS.WORKFORCE_PLAN_UPDATE,
    PERMISSIONS.WORKFORCE_PLAN_SUBMIT,
    PERMISSIONS.RECRUITMENT_REQUEST_READ,
    PERMISSIONS.RECRUITMENT_REQUEST_CREATE,
    PERMISSIONS.RECRUITMENT_REQUEST_UPDATE,
    PERMISSIONS.VACANCY_READ,
    PERMISSIONS.VACANCY_CREATE,
    PERMISSIONS.VACANCY_UPDATE,
    PERMISSIONS.VACANCY_PUBLISH,
    // Candidate pipeline actions are modeled as application permissions in the BRD
    PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.APPLICATION_SCREEN,
    PERMISSIONS.APPLICATION_SHORTLIST,
    PERMISSIONS.APPLICATION_REJECT,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.INTERVIEW_CREATE,
    PERMISSIONS.INTERVIEW_UPDATE,
    PERMISSIONS.INTERVIEW_EVALUATE,
    PERMISSIONS.OFFER_READ,
    PERMISSIONS.TALENT_ROSTER_READ,
    PERMISSIONS.TALENT_ROSTER_MANAGE,
    PERMISSIONS.HIRING_MINUTE_READ,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.REPORTS_READ,
  ],

  // Hiring Manager — requests, interviews, evaluations; no vacancy publishing or offers
  [ROLES.HIRING_MANAGER]: [
    // Prompt 1 default matrix
    PERMISSIONS.RECRUITMENT_REQUEST_READ,
    PERMISSIONS.VACANCY_READ,
    PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.INTERVIEW_EVALUATE,
    PERMISSIONS.HIRING_MINUTE_READ,
    // Dashboard personal widgets
    PERMISSIONS.MY_VACANCY_READ,
    PERMISSIONS.MY_INTERVIEW_READ,
    PERMISSIONS.MY_EVALUATION_READ,
  ],

  // Department Manager — workforce planning and request initiation only
  [ROLES.DEPARTMENT_MANAGER]: [
    PERMISSIONS.WORKFORCE_PLAN_READ,
    PERMISSIONS.WORKFORCE_PLAN_CREATE,
    PERMISSIONS.WORKFORCE_PLAN_UPDATE,
    PERMISSIONS.WORKFORCE_PLAN_SUBMIT,
    PERMISSIONS.RECRUITMENT_REQUEST_READ,
    PERMISSIONS.RECRUITMENT_REQUEST_CREATE,
    PERMISSIONS.DEPARTMENT_READ,
    // Dashboard personal widgets
    PERMISSIONS.MY_VACANCY_READ,
  ],

  // Interviewer / Panel Member — read interviews, submit evaluations
  [ROLES.INTERVIEWER]: [
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.VIEW_INTERVIEWS, // Added to access interviews list page
    PERMISSIONS.INTERVIEW_EVALUATE, // FIXED: was missing in old file
    PERMISSIONS.VACANCY_READ, // needs context about the role they're interviewing for
    PERMISSIONS.DEPARTMENT_READ,
    // Dashboard personal widgets
    PERMISSIONS.MY_INTERVIEW_READ,
    PERMISSIONS.MY_EVALUATION_READ,
  ],

  // Candidate — no internal permissions; portal access is controlled separately
  [ROLES.CANDIDATE]: [
    // Dashboard candidate widgets
    PERMISSIONS.CANDIDATE_APPLICATION_READ,
  ],
};

// ─────────────────────────────────────────────
// HELPERS  (used by middleware and seed)
// ─────────────────────────────────────────────

export const allRoleSlugs = new Set<RoleSlug>(Object.values(ROLES));
export const allPermissionSlugs = new Set<PermissionSlug>(
  Object.values(PERMISSIONS),
);

/** Normalise a raw slug from the DB — handles legacy hyphenated values */
export const normaliseRoleSlug = (slug: string): RoleSlug | undefined => {
  const direct = slug as RoleSlug;
  if (allRoleSlugs.has(direct)) return direct;
  const aliased = ROLE_ALIASES[slug] as RoleSlug | undefined;
  return aliased;
};

export const isValidRoleSlug = (slug: string): slug is RoleSlug =>
  !!normaliseRoleSlug(slug);

export const isValidPermissionSlug = (slug: string): slug is PermissionSlug =>
  allPermissionSlugs.has(slug as PermissionSlug);

/** Returns the DEFAULT permissions for a role (seed use only — use DB at runtime) */
export const getDefaultPermissionsForRole = (
  roleSlug: string,
): PermissionSlug[] => {
  const normalised = normaliseRoleSlug(roleSlug);
  if (!normalised) return [];
  return DEFAULT_ROLE_PERMISSIONS[normalised] ?? [];
};

/**
 * Candidate routes are auth-only; no role-based restrictions.
 * List here so the middleware knows to skip the role check entirely.
 */
export const CANDIDATE_ONLY_ROUTES = [
  'candidate:apply',
  'candidate:profile',
  'candidate:documents',
  'candidate:experience',
  'candidate:education',
  'candidate:offers',
] as const;

// Legacy aliases and helpers used by middlewares, routes, and services
export const normalizeRoleSlug = normaliseRoleSlug;
export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;
export type PermissionKey = PermissionSlug;
export const allPermissionKeys = allPermissionSlugs;

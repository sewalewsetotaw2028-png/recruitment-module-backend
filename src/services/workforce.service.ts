import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import {
  EmploymentType,
  PlanningPeriod,
  PlanningQuarter,
  PositionType,
  PriorityLevel,
  WorkforcePlanStatus,
} from '@prisma/client';
import {
  CreateDepartmentDTO,
  CreateWorkforcePlanDTO,
  UpdateWorkforcePlanDTO,
} from '../types/workforce.type';

export class WorkforceService {
  private static toCompanyId(company_id: string | number) {
    const parsed =
      typeof company_id === 'number' ? company_id : Number(company_id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError('Invalid company_id', 400);
    }
    return parsed;
  }

  private static normalizeEnumInput(value?: string) {
    if (!value) return undefined;
    return value.trim().toUpperCase().replace(/-/g, '_');
  }

  private static toPlanningPeriod(
    data: Pick<CreateWorkforcePlanDTO, 'planning_type' | 'planning_period'>,
  ) {
    const normalizedPlanningType = this.normalizeEnumInput(
      data.planning_type as unknown as string,
    );
    const normalizedPlanningPeriod = this.normalizeEnumInput(
      data.planning_period,
    );

    // Preferred: planning_period provided as enum (ANNUAL/QUARTERLY/...)
    if (
      normalizedPlanningPeriod &&
      Object.values(PlanningPeriod).includes(
        normalizedPlanningPeriod as PlanningPeriod,
      )
    ) {
      return normalizedPlanningPeriod as PlanningPeriod;
    }

    // Legacy: planning_type drives enum selection
    if (
      normalizedPlanningType &&
      Object.values(PlanningPeriod).includes(
        normalizedPlanningType as PlanningPeriod,
      )
    ) {
      return normalizedPlanningType as PlanningPeriod;
    }

    throw new AppError(
      'Invalid planning period. Provide planning_period as ANNUAL|QUARTERLY|SEMI_ANNUAL|MONTHLY (preferred) or include planning_type for legacy payloads.',
      400,
    );
  }

  private static inferPlanningYearQuarterMonth(data: CreateWorkforcePlanDTO) {
    // Prefer explicit fields
    let planning_year = data.planning_year;
    let planning_quarter = data.planning_quarter as PlanningQuarter | undefined;
    let planning_month = data.planning_month;

    // Legacy parsing from planning_period string like "2026", "2026-Q1", "Q1-2026"
    const raw = (data.planning_period ?? '').trim();
    const yearOnly = raw.match(/^(\d{4})$/);
    const yearQuarter1 = raw.match(/^(\d{4})-(Q[1-4])$/i);
    const yearQuarter2 = raw.match(/^(Q[1-4])-(\d{4})$/i);

    if (!planning_year && yearOnly) planning_year = Number(yearOnly[1]);
    if (!planning_year && yearQuarter1) planning_year = Number(yearQuarter1[1]);
    if (!planning_year && yearQuarter2) planning_year = Number(yearQuarter2[2]);

    if (!planning_quarter && yearQuarter1)
      planning_quarter = yearQuarter1[2].toUpperCase() as PlanningQuarter;
    if (!planning_quarter && yearQuarter2)
      planning_quarter = yearQuarter2[1].toUpperCase() as PlanningQuarter;

    if (
      planning_quarter &&
      !Object.values(PlanningQuarter).includes(planning_quarter)
    )
      planning_quarter = undefined;

    if (
      planning_month &&
      (!Number.isInteger(planning_month) ||
        planning_month < 1 ||
        planning_month > 12)
    ) {
      planning_month = undefined;
    }

    return { planning_year, planning_quarter, planning_month };
  }

  private static toWorkforcePlanStatus(status?: string) {
    const normalized = this.normalizeEnumInput(status);
    if (!normalized) return WorkforcePlanStatus.DRAFT;
    if (
      Object.values(WorkforcePlanStatus).includes(
        normalized as WorkforcePlanStatus,
      )
    ) {
      return normalized as WorkforcePlanStatus;
    }
    // Legacy lowercase shortcuts
    const legacyMap: Record<string, WorkforcePlanStatus> = {
      DRAFT: WorkforcePlanStatus.DRAFT,
      SUBMITTED: WorkforcePlanStatus.SUBMITTED,
      APPROVED: WorkforcePlanStatus.APPROVED,
      REJECTED: WorkforcePlanStatus.REJECTED,
    };
    return legacyMap[normalized] ?? WorkforcePlanStatus.DRAFT;
  }

  private static toEmploymentType(value: string) {
    const normalized = this.normalizeEnumInput(value);
    if (!normalized) throw new AppError('employment_type is required', 400);
    if (Object.values(EmploymentType).includes(normalized as EmploymentType)) {
      return normalized as EmploymentType;
    }
    throw new AppError(`Invalid employment_type: ${value}`, 400);
  }

  private static toPriorityLevel(value?: string) {
    const normalized = this.normalizeEnumInput(value);
    if (!normalized) return undefined;
    if (Object.values(PriorityLevel).includes(normalized as PriorityLevel)) {
      return normalized as PriorityLevel;
    }
    return undefined;
  }

  private static toPositionType(value?: string) {
    const normalized = this.normalizeEnumInput(value);
    if (!normalized) return undefined;
    if (Object.values(PositionType).includes(normalized as PositionType)) {
      return normalized as PositionType;
    }
    return undefined;
  }

  private static formatUserName(user: any) {
    if (!user) {
      return undefined;
    }

    const parts = [user.first_name, user.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : undefined;
  }

  private static summarizeRevisionChanges(changes: unknown) {
    if (!changes) {
      return 'Updated workforce plan details.';
    }
    if (typeof changes === 'string') {
      return changes;
    }
    if (Array.isArray(changes)) {
      return changes.length
        ? `Updated ${changes.length} plan field${changes.length === 1 ? '' : 's'}.`
        : 'Updated workforce plan details.';
    }
    if (typeof changes === 'object') {
      const keys = Object.keys(changes as Record<string, unknown>);
      if (!keys.length) {
        return 'Updated workforce plan details.';
      }
      const preview = keys.slice(0, 4).join(', ');
      return `Changed: ${preview}${keys.length > 4 ? `, +${keys.length - 4} more` : ''}.`;
    }
    return 'Updated workforce plan details.';
  }

  private static async loadRevisionHistory(
    client: Pick<typeof prisma, 'versionHistory' | 'user'>,
    planIds: string[],
  ) {
    if (!planIds.length) {
      return new Map<string, any[]>();
    }

    const histories = await client.versionHistory.findMany({
      where: {
        entity_type: 'WorkforcePlan',
        entity_id: { in: planIds },
      },
      orderBy: [
        { entity_id: 'asc' },
        { version_number: 'asc' },
        { created_at: 'asc' },
      ],
    });

    const userIds = Array.from(
      new Set(
        histories
          .map((entry) => entry.changed_by_user_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const users = userIds.length
      ? await client.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];

    const userNameMap = new Map(
      users.map((user) => [user.id, this.formatUserName(user) || user.id]),
    );

    const grouped = new Map<string, any[]>();

    histories.forEach((entry) => {
      const revisions = grouped.get(entry.entity_id) || [];
      revisions.push({
        version: `V${entry.version_number}.0`,
        versionNumber: entry.version_number,
        date: entry.created_at,
        author: entry.changed_by_user_id
          ? userNameMap.get(entry.changed_by_user_id) ||
            entry.changed_by_user_id
          : 'System',
        role: 'system',
        changes: this.summarizeRevisionChanges(entry.changes),
        status: 'saved',
      });
      grouped.set(entry.entity_id, revisions);
    });

    return grouped;
  }

  private static async loadApprovalHistories(
    client: Pick<typeof prisma, 'recruitmentApprovalHistory'>,
    planIds: string[],
  ) {
    if (!planIds.length) {
      return new Map<string, any[]>();
    }

    const histories = await client.recruitmentApprovalHistory.findMany({
      where: {
        entity_type: 'WorkforcePlan',
        entity_id: { in: planIds },
      },
      include: {
        actor: { select: { first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    const grouped = new Map<string, any[]>();
    histories.forEach((history) => {
      const list = grouped.get(history.entity_id) || [];
      list.push(history);
      grouped.set(history.entity_id, list);
    });

    return grouped;
  }

  private static toDepartmentId(value?: string | number | null) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  private static enforceDepartmentScope(
    departmentId: number,
    allowedDepartmentId?: number,
  ) {
    if (!allowedDepartmentId) {
      return departmentId;
    }

    if (departmentId && departmentId !== allowedDepartmentId) {
      throw new AppError(
        'You can only create or update workforce plans for your own department.',
        403,
      );
    }

    return allowedDepartmentId;
  }

  private static async assertPlanDepartmentScope(
    client: Pick<typeof prisma, 'workforcePlanItem'>,
    planId: string,
    allowedDepartmentId?: number,
  ) {
    if (!allowedDepartmentId) {
      return;
    }

    const items = await client.workforcePlanItem.findMany({
      where: { workforce_plan_id: planId },
      select: { department_id: true },
    });

    if (
      items.length > 0 &&
      items.some((item) => item.department_id !== allowedDepartmentId)
    ) {
      throw new AppError(
        'You are not allowed to access a workforce plan from another department.',
        403,
      );
    }
  }

  private static normalizeWorkforcePlan(plan: any) {
    const createdBy = plan.created_by ?? undefined;
    const approvedBy = plan.approved_by ?? undefined;
    const approvalHistories = Array.isArray(plan.approval_histories)
      ? plan.approval_histories.map((history: any) => ({
          id: history.id,
          entityType: history.entity_type,
          entityId: history.entity_id,
          action: history.action,
          actorId: history.actor_user_id,
          actorName:
            this.formatUserName(history.actor) ||
            history.actor_user_id ||
            'System',
          comments: history.comments,
          createdAt: history.created_at,
        }))
      : [];
    const items = Array.isArray(plan.workforce_plan_items)
      ? plan.workforce_plan_items.map((item: any) => ({
          ...item,
          department: item.department,
          departmentId: item.department_id,
          department_id: item.department_id,
          departmentName: item.department?.name,
          department_name: item.department?.name,
          jobTitle: item.job_title,
          job_title: item.job_title,
          employmentType: item.employment_type,
          employment_type: item.employment_type,
          plannedStart: item.planned_start,
          planned_start: item.planned_start,
          headcount: item.headcount,
        }))
      : [];

    return {
      ...plan,
      departmentId: items[0]?.departmentId
        ? String(items[0].departmentId)
        : undefined,
      department_id: items[0]?.department_id ?? undefined,
      departmentName: items[0]?.departmentName ?? undefined,
      department_name: items[0]?.department_name ?? undefined,
      items,
      createdBy: plan.created_by_user_id,
      createdByName: this.formatUserName(createdBy),
      created_by: createdBy,
      created_by_name: this.formatUserName(createdBy),
      approvedBy: plan.approved_by_user_id,
      approvedByName: this.formatUserName(approvedBy),
      approved_by: approvedBy,
      approved_by_name: this.formatUserName(approvedBy),
      returnedBy: plan.returned_by_user_id,
      returnedByName: this.formatUserName(plan.returned_by),
      returned_by: plan.returned_by,
      returned_by_name: this.formatUserName(plan.returned_by),
      returnedComments: plan.returned_comments,
      returned_comments: plan.returned_comments,
      returnedAt: plan.returned_at,
      returned_at: plan.returned_at,
      planningYear: plan.planning_year,
      planning_year: plan.planning_year,
      planningQuarter: plan.planning_quarter,
      planning_quarter: plan.planning_quarter,
      planningMonth: plan.planning_month,
      planning_month: plan.planning_month,
      planningPeriod: plan.planning_period,
      planning_period: plan.planning_period,
      // Compatibility alias: old API used planning_type
      planningType: String(plan.planning_period).toLowerCase(),
      planning_type: String(plan.planning_period).toLowerCase(),
      versionNumber: plan.version_number,
      version_number: plan.version_number,
      revisions: Array.isArray(plan.revisions) ? plan.revisions : [],
      createdAt: plan.created_at,
      created_at: plan.created_at,
      updatedAt: plan.updated_at,
      updated_at: plan.updated_at,
      approvalHistories,
      approval_histories: approvalHistories,
      // Optional compatibility aliases for clients that used lowercase statuses
      status_lower:
        typeof plan.status === 'string' ? plan.status.toLowerCase() : undefined,
    };
  }

  // --- Department Logic ---
  static async createDepartment(
    company_id: string | number,
    data: CreateDepartmentDTO,
  ) {
    const companyId = this.toCompanyId(company_id);
    const parentDepartmentId =
      data.parent_department_id === undefined ||
      data.parent_department_id === null
        ? undefined
        : Number(data.parent_department_id);

    return await prisma.department.create({
      data: {
        company_id: companyId,
        name: data.name,
        parent_department_id:
          parentDepartmentId && Number.isInteger(parentDepartmentId)
            ? parentDepartmentId
            : undefined,
      },
    });
  }

  static async getDepartments(company_id: string | number) {
    const companyId = this.toCompanyId(company_id);
    return await prisma.department.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' },
    });
  }

  // --- Workforce Plan Logic (FR-01 to FR-08) ---
  static async createPlan(
    company_id: string | number,
    user_id: string,
    data: CreateWorkforcePlanDTO,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);

    return await prisma.$transaction(async (tx) => {
      const items = data.items
        ? await Promise.all(
            data.items.map(async (item) => {
              let departmentId =
                item.department_id === undefined || item.department_id === null
                  ? undefined
                  : Number(item.department_id);
              if (!departmentId && scopedDepartmentId) {
                departmentId = scopedDepartmentId;
              }
              if (!departmentId && item.department_name) {
                const department = await tx.department.findFirst({
                  where: {
                    company_id: companyId,
                    name: item.department_name,
                  },
                });
                if (!department) {
                  throw new AppError(
                    `Department not found: ${item.department_name}`,
                    400,
                  );
                }
                departmentId = department.id;
              }
              if (!departmentId) {
                throw new AppError(
                  `Missing department information for workforce plan item.`,
                  400,
                );
              }
              departmentId = this.enforceDepartmentScope(
                departmentId as number,
                scopedDepartmentId,
              );
              return {
                department_id: departmentId,
                job_title: item.job_title,
                employment_type: this.toEmploymentType(item.employment_type),
                headcount: item.headcount,
                planned_start: new Date(item.planned_start),
                justification: item.justification,
                job_grade: item.job_grade,
                salary_budget: item.salary_budget,
                position_type: this.toPositionType(item.position_type),
                replacement_employee_ref: item.replacement_employee_ref,
                priority: this.toPriorityLevel(item.priority),
                expected_impact: item.expected_impact,
                required_qualifications: item.required_qualifications,
                remarks: item.remarks,
              };
            }),
          )
        : undefined;

      const planning_period = this.toPlanningPeriod(data);
      const { planning_year, planning_quarter, planning_month } =
        this.inferPlanningYearQuarterMonth(data);

      const supporting_documents = Array.from(
        new Set(
          [
            ...(Array.isArray(data.supporting_documents)
              ? data.supporting_documents
              : []),
            ...(data.supporting_document_name
              ? [data.supporting_document_name]
              : []),
          ].filter(Boolean),
        ),
      );

      const plan = await tx.workforcePlan.create({
        data: {
          id: data.id,
          company_id: companyId,
          created_by_user_id: user_id,
          title: data.title,
          planning_period,
          planning_year,
          planning_quarter,
          planning_month,
          justification: data.justification,
          status: this.toWorkforcePlanStatus(data.status),
          business_unit: data.business_unit,
          hr_comments: data.hr_comments,
          ceo_comments: data.ceo_comments,
          supporting_documents,
          ...(items
            ? {
                workforce_plan_items: {
                  create: items,
                },
              }
            : {}),
        },
        include: {
          workforce_plan_items: { include: { department: true } },
          created_by: {
            select: { first_name: true, last_name: true },
          },
          approved_by: {
            select: { first_name: true, last_name: true },
          },
          returned_by: {
            select: { first_name: true, last_name: true },
          },
        },
      });
      return WorkforceService.normalizeWorkforcePlan(plan);
    });
  }

  static async updatePlan(
    company_id: string | number,
    planId: string,
    changedByUserId: string,
    data: UpdateWorkforcePlanDTO,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.workforcePlan.findUnique({
        where: { id: planId },
      });
      if (!existing || existing.company_id !== companyId) {
        throw new AppError('Not found or unauthorized', 404);
      }
      await this.assertPlanDepartmentScope(tx, planId, scopedDepartmentId);
      const editableStatuses: WorkforcePlanStatus[] = [
        WorkforcePlanStatus.DRAFT,
        WorkforcePlanStatus.RETURNED_FOR_REVISION,
        WorkforcePlanStatus.REJECTED,
      ];
      if (!editableStatuses.includes(existing.status)) {
        throw new AppError(
          'Only draft/returned/rejected plans can be updated.',
          400,
        );
      }

      // Status transitions must only happen through dedicated endpoints.
      // Reject any attempt to set status via the update payload.
      if ((data as any).status) {
        throw new AppError(
          'Use the dedicated status endpoints (submit, forward, approve, reject, return) to change plan status.',
          400,
        );
      }

      const items = data.items
        ? await Promise.all(
            data.items.map(async (item) => {
              let departmentId =
                item.department_id === undefined || item.department_id === null
                  ? undefined
                  : Number(item.department_id);
              if (!departmentId && scopedDepartmentId) {
                departmentId = scopedDepartmentId;
              }
              if (!departmentId && item.department_name) {
                const department = await tx.department.findFirst({
                  where: {
                    company_id: companyId,
                    name: item.department_name,
                  },
                });
                if (!department) {
                  throw new AppError(
                    `Department not found: ${item.department_name}`,
                    400,
                  );
                }
                departmentId = department.id;
              }
              if (!departmentId) {
                throw new AppError(
                  `Missing department information for workforce plan item.`,
                  400,
                );
              }
              departmentId = this.enforceDepartmentScope(
                departmentId as number,
                scopedDepartmentId,
              );
              return {
                department_id: departmentId,
                job_title: item.job_title,
                employment_type: this.toEmploymentType(item.employment_type),
                headcount: item.headcount,
                planned_start: new Date(item.planned_start),
                justification: item.justification,
                job_grade: item.job_grade,
                salary_budget: item.salary_budget,
                position_type: this.toPositionType(item.position_type),
                replacement_employee_ref: item.replacement_employee_ref,
                priority: this.toPriorityLevel(item.priority),
                expected_impact: item.expected_impact,
                required_qualifications: item.required_qualifications,
                remarks: item.remarks,
              };
            }),
          )
        : undefined;

      const planning_period =
        data.planning_period || data.planning_type
          ? this.toPlanningPeriod({
              planning_period: data.planning_period ?? existing.planning_period,
              planning_type: (data.planning_type ?? undefined) as any,
            } as any)
          : existing.planning_period;

      const inferred = this.inferPlanningYearQuarterMonth({
        ...(existing as any),
        ...(data as any),
      });

      const supporting_documents = Array.from(
        new Set(
          [
            ...(Array.isArray(existing.supporting_documents)
              ? existing.supporting_documents
              : []),
            ...(Array.isArray(data.supporting_documents)
              ? data.supporting_documents
              : []),
            ...(data.supporting_document_name
              ? [data.supporting_document_name]
              : []),
          ].filter(Boolean),
        ),
      );

      const plan = await tx.workforcePlan.update({
        where: { id: planId },
        data: {
          title: data.title ?? existing.title,
          planning_period,
          planning_year:
            data.planning_year ??
            inferred.planning_year ??
            existing.planning_year,
          planning_quarter:
            (data.planning_quarter as any) ??
            inferred.planning_quarter ??
            existing.planning_quarter,
          planning_month:
            data.planning_month ??
            inferred.planning_month ??
            existing.planning_month,
          justification: data.justification ?? existing.justification,
          business_unit: data.business_unit ?? existing.business_unit,
          hr_comments: data.hr_comments ?? existing.hr_comments,
          ceo_comments: data.ceo_comments ?? existing.ceo_comments,
          supporting_documents,
          // status intentionally omitted — transitions go through dedicated endpoints
          version_number: existing.version_number + 1,
          ...(data.items
            ? {
                workforce_plan_items: {
                  deleteMany: {},
                  create: items,
                },
              }
            : {}),
        },
        include: {
          workforce_plan_items: { include: { department: true } },
          created_by: {
            select: { first_name: true, last_name: true },
          },
          approved_by: {
            select: { first_name: true, last_name: true },
          },
          returned_by: {
            select: { first_name: true, last_name: true },
          },
        },
      });

      // Record version history (workforce-only)
      await tx.versionHistory.create({
        data: {
          entity_id: planId,
          entity_type: 'WorkforcePlan',
          version_number: existing.version_number + 1,
          changed_by_user_id: changedByUserId,
          changes: data as any,
        },
      });

      return WorkforceService.normalizeWorkforcePlan(plan);
    });
  }

  static async deletePlan(
    company_id: string | number,
    planId: string,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.workforcePlan.findUnique({
        where: { id: planId },
      });
      if (!existing || existing.company_id !== companyId) {
        throw new AppError('Not found or unauthorized', 404);
      }
      await this.assertPlanDepartmentScope(tx, planId, scopedDepartmentId);

      const deletableStatuses: WorkforcePlanStatus[] = [
        WorkforcePlanStatus.DRAFT,
        WorkforcePlanStatus.RETURNED_FOR_REVISION,
        WorkforcePlanStatus.REJECTED,
      ];
      if (!deletableStatuses.includes(existing.status)) {
        throw new AppError(
          'Only draft, returned for revision, or rejected plans can be deleted.',
          400,
        );
      }

      await tx.workforcePlan.delete({
        where: { id: planId },
      });
    });
  }

  static async getPlans(
    company_id: string | number,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);
    const plans = await prisma.workforcePlan.findMany({
      where: {
        company_id: companyId,
        ...(scopedDepartmentId
          ? {
              workforce_plan_items: {
                some: { department_id: scopedDepartmentId },
              },
            }
          : {}),
      },
      include: {
        workforce_plan_items: { include: { department: true } },
        created_by: {
          select: { first_name: true, last_name: true },
        },
        approved_by: {
          select: { first_name: true, last_name: true },
        },
        returned_by: {
          select: { first_name: true, last_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    // Return lightweight list — history is loaded only in getPlanById (detail view).
    return plans.map((plan) =>
      WorkforceService.normalizeWorkforcePlan({
        ...plan,
        approval_histories: [],
        revisions: [],
      }),
    );
  }

  static async getPlanById(
    company_id: string | number,
    planId: string,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);
    const plan = await prisma.workforcePlan.findUnique({
      where: { id: planId },
      include: {
        workforce_plan_items: { include: { department: true } },
        created_by: {
          select: { first_name: true, last_name: true },
        },
        approved_by: {
          select: { first_name: true, last_name: true },
        },
        returned_by: {
          select: { first_name: true, last_name: true },
        },
      },
    });
    if (!plan || plan.company_id !== companyId) {
      throw new AppError('Not found or unauthorized', 404);
    }
    if (scopedDepartmentId) {
      const items = Array.isArray(plan.workforce_plan_items)
        ? plan.workforce_plan_items
        : [];
      if (
        items.length > 0 &&
        items.some((item) => Number(item.department_id) !== scopedDepartmentId)
      ) {
        throw new AppError(
          'You are not allowed to access a workforce plan from another department.',
          403,
        );
      }
    }
    const [revisionsMap, historiesMap] = await Promise.all([
      this.loadRevisionHistory(prisma, [planId]),
      this.loadApprovalHistories(prisma, [planId]),
    ]);
    return WorkforceService.normalizeWorkforcePlan({
      ...plan,
      approval_histories: historiesMap.get(planId) || [],
      revisions: revisionsMap.get(planId) || [],
    });
  }

  static async submitPlan(
    company_id: string | number,
    planId: string,
    actorUserId: string,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);
    const existing = await prisma.workforcePlan.findUnique({
      where: { id: planId },
    });
    if (!existing || existing.company_id !== companyId) {
      throw new AppError('Not found or unauthorized', 404);
    }
    await this.assertPlanDepartmentScope(prisma, planId, scopedDepartmentId);
    const submittableStatuses: WorkforcePlanStatus[] = [
      WorkforcePlanStatus.DRAFT,
      WorkforcePlanStatus.RETURNED_FOR_REVISION,
      WorkforcePlanStatus.REJECTED,
    ];
    if (!submittableStatuses.includes(existing.status)) {
      throw new AppError(
        'Only draft/returned/rejected plans can be submitted.',
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          company_id: companyId,
          user_id: actorUserId,
          action: 'WORKFORCE_PLAN_SUBMITTED',
          entity_type: 'WorkforcePlan',
          entity_id: planId,
        },
      });
      await tx.recruitmentApprovalHistory.create({
        data: {
          entity_type: 'WorkforcePlan',
          entity_id: planId,
          action: 'SUBMITTED',
          actor_user_id: actorUserId,
          comments: null,
        },
      });

      const plan = await tx.workforcePlan.update({
        where: { id: planId },
        data: {
          status: WorkforcePlanStatus.SUBMITTED,
          submitted_at: new Date(),
        },
        include: {
          workforce_plan_items: { include: { department: true } },
          created_by: { select: { first_name: true, last_name: true } },
          approved_by: { select: { first_name: true, last_name: true } },
          returned_by: { select: { first_name: true, last_name: true } },
        },
      });

      const histories = await tx.recruitmentApprovalHistory.findMany({
        where: { entity_type: 'WorkforcePlan', entity_id: planId },
        include: { actor: { select: { first_name: true, last_name: true } } },
        orderBy: { created_at: 'asc' },
      });

      return WorkforceService.normalizeWorkforcePlan({
        ...plan,
        approval_histories: histories,
      });
    });
  }

  /**
   * HR workflow step: review and forward the plan to CEO.
   * This matches the BRD flow (HR reviews then forwards to CEO).
   */
  static async forwardPlanToCeo(
    company_id: string | number,
    planId: string,
    actorUserId: string,
    notes?: string,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);
    const existing = await prisma.workforcePlan.findUnique({
      where: { id: planId },
    });
    if (!existing || existing.company_id !== companyId) {
      throw new AppError('Not found or unauthorized', 404);
    }
    await this.assertPlanDepartmentScope(prisma, planId, scopedDepartmentId);

    const forwardableStatuses: WorkforcePlanStatus[] = [
      WorkforcePlanStatus.SUBMITTED,
      WorkforcePlanStatus.UNDER_HR_REVIEW,
    ];
    if (!forwardableStatuses.includes(existing.status)) {
      throw new AppError('Only submitted plans can be forwarded to CEO.', 400);
    }

    return await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          company_id: companyId,
          user_id: actorUserId,
          action: 'WORKFORCE_PLAN_FORWARDED_TO_CEO',
          entity_type: 'WorkforcePlan',
          entity_id: planId,
          description: notes,
        },
      });
      await tx.recruitmentApprovalHistory.create({
        data: {
          entity_type: 'WorkforcePlan',
          entity_id: planId,
          action: 'FORWARDED',
          actor_user_id: actorUserId,
          comments: notes ?? null,
        },
      });

      const plan = await tx.workforcePlan.update({
        where: { id: planId },
        data: {
          status: WorkforcePlanStatus.UNDER_CEO_REVIEW,
          hr_comments: notes ?? existing.hr_comments ?? undefined,
        },
        include: {
          workforce_plan_items: { include: { department: true } },
          created_by: { select: { first_name: true, last_name: true } },
          approved_by: { select: { first_name: true, last_name: true } },
          returned_by: { select: { first_name: true, last_name: true } },
        },
      });

      const histories = await tx.recruitmentApprovalHistory.findMany({
        where: { entity_type: 'WorkforcePlan', entity_id: planId },
        include: { actor: { select: { first_name: true, last_name: true } } },
        orderBy: { created_at: 'asc' },
      });

      return WorkforceService.normalizeWorkforcePlan({
        ...plan,
        approval_histories: histories,
      });
    });
  }

  /**
   * Return a plan to the work unit for revision (HR or CEO).
   */
  static async returnForRevision(
    company_id: string | number,
    planId: string,
    actorUserId: string,
    actorRole: 'ceo' | 'hr',
    reason: string,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);
    const existing = await prisma.workforcePlan.findUnique({
      where: { id: planId },
    });
    if (!existing || existing.company_id !== companyId) {
      throw new AppError('Not found or unauthorized', 404);
    }
    await this.assertPlanDepartmentScope(prisma, planId, scopedDepartmentId);

    const allowedStatuses: WorkforcePlanStatus[] =
      actorRole === 'ceo'
        ? [WorkforcePlanStatus.UNDER_CEO_REVIEW]
        : [WorkforcePlanStatus.SUBMITTED, WorkforcePlanStatus.UNDER_HR_REVIEW];

    if (!allowedStatuses.includes(existing.status)) {
      throw new AppError(
        'Plan cannot be returned for revision from the current status.',
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          company_id: companyId,
          user_id: actorUserId,
          action: 'WORKFORCE_PLAN_RETURNED_FOR_REVISION',
          entity_type: 'WorkforcePlan',
          entity_id: planId,
          description: reason,
        },
      });
      await tx.recruitmentApprovalHistory.create({
        data: {
          entity_type: 'WorkforcePlan',
          entity_id: planId,
          action: 'RETURNED_FOR_REVISION',
          actor_user_id: actorUserId,
          comments: reason,
        },
      });

      const plan = await tx.workforcePlan.update({
        where: { id: planId },
        data: {
          status: WorkforcePlanStatus.RETURNED_FOR_REVISION,
          returned_comments: reason,
          returned_at: new Date(),
          returned_by_user_id: actorUserId,
          hr_comments:
            actorRole === 'hr' ? reason : (existing.hr_comments ?? undefined),
          ceo_comments:
            actorRole === 'ceo' ? reason : (existing.ceo_comments ?? undefined),
        },
        include: {
          workforce_plan_items: { include: { department: true } },
          created_by: { select: { first_name: true, last_name: true } },
          approved_by: { select: { first_name: true, last_name: true } },
          returned_by: { select: { first_name: true, last_name: true } },
        },
      });

      const histories = await tx.recruitmentApprovalHistory.findMany({
        where: { entity_type: 'WorkforcePlan', entity_id: planId },
        include: { actor: { select: { first_name: true, last_name: true } } },
        orderBy: { created_at: 'asc' },
      });

      return WorkforceService.normalizeWorkforcePlan({
        ...plan,
        approval_histories: histories,
      });
    });
  }

  static async approvePlan(
    company_id: string | number,
    planId: string,
    approverUserId: string,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);

    const existing = await prisma.workforcePlan.findUnique({
      where: { id: planId },
    });
    if (!existing || existing.company_id !== companyId) {
      throw new AppError('Not found or unauthorized', 404);
    }
    await this.assertPlanDepartmentScope(prisma, planId, scopedDepartmentId);
    // Only UNDER_CEO_REVIEW plans can be approved — this enforces the mandatory
    // HR → CEO review chain described in the BRD. HR forwards to CEO; CEO approves.
    const approvableStatuses: WorkforcePlanStatus[] = [
      WorkforcePlanStatus.UNDER_CEO_REVIEW,
    ];
    if (!approvableStatuses.includes(existing.status)) {
      throw new AppError(
        'Only plans under CEO review can be approved. HR must first forward the plan to the CEO.',
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          company_id: companyId,
          user_id: approverUserId,
          action: 'WORKFORCE_PLAN_APPROVED',
          entity_type: 'WorkforcePlan',
          entity_id: planId,
        },
      });
      await tx.recruitmentApprovalHistory.create({
        data: {
          entity_type: 'WorkforcePlan',
          entity_id: planId,
          action: 'APPROVED',
          actor_user_id: approverUserId,
          comments: null,
        },
      });

      const plan = await tx.workforcePlan.update({
        where: { id: planId },
        data: {
          status: WorkforcePlanStatus.APPROVED,
          approved_by_user_id: approverUserId,
          approval_date: new Date(),
        },
        include: {
          workforce_plan_items: { include: { department: true } },
          created_by: { select: { first_name: true, last_name: true } },
          approved_by: { select: { first_name: true, last_name: true } },
          returned_by: { select: { first_name: true, last_name: true } },
        },
      });

      const histories = await tx.recruitmentApprovalHistory.findMany({
        where: { entity_type: 'WorkforcePlan', entity_id: planId },
        include: { actor: { select: { first_name: true, last_name: true } } },
        orderBy: { created_at: 'asc' },
      });

      return WorkforceService.normalizeWorkforcePlan({
        ...plan,
        approval_histories: histories,
      });
    });
  }

  static async closePlan(
    company_id: string | number,
    planId: string,
    actorUserId: string,
  ) {
    const companyId = this.toCompanyId(company_id);
    const existing = await prisma.workforcePlan.findUnique({
      where: { id: planId },
    });
    if (!existing || existing.company_id !== companyId) {
      throw new AppError('Not found or unauthorized', 404);
    }
    if (existing.status !== WorkforcePlanStatus.APPROVED) {
      throw new AppError(
        'Only APPROVED plans can be closed. Approve the plan before closing it.',
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          company_id: companyId,
          user_id: actorUserId,
          action: 'WORKFORCE_PLAN_CLOSED',
          entity_type: 'WorkforcePlan',
          entity_id: planId,
        },
      });
      await tx.recruitmentApprovalHistory.create({
        data: {
          entity_type: 'WorkforcePlan',
          entity_id: planId,
          action: 'CLOSED',
          actor_user_id: actorUserId,
          comments: null,
        },
      });
      const plan = await tx.workforcePlan.update({
        where: { id: planId },
        data: { status: WorkforcePlanStatus.CLOSED },
        include: {
          workforce_plan_items: { include: { department: true } },
          created_by: { select: { first_name: true, last_name: true } },
          approved_by: { select: { first_name: true, last_name: true } },
          returned_by: { select: { first_name: true, last_name: true } },
        },
      });
      return WorkforceService.normalizeWorkforcePlan({
        ...plan,
        approval_histories: [],
        revisions: [],
      });
    });
  }

  static async rejectPlan(
    company_id: string | number,
    planId: string,
    approverUserId: string,
    reason?: string,
    allowedDepartmentId?: string | number | null,
  ) {
    const companyId = this.toCompanyId(company_id);
    const scopedDepartmentId = this.toDepartmentId(allowedDepartmentId);

    const existing = await prisma.workforcePlan.findUnique({
      where: { id: planId },
    });
    if (!existing || existing.company_id !== companyId) {
      throw new AppError('Not found or unauthorized', 404);
    }
    await this.assertPlanDepartmentScope(prisma, planId, scopedDepartmentId);
    const rejectableStatuses: WorkforcePlanStatus[] = [
      WorkforcePlanStatus.UNDER_HR_REVIEW,
      WorkforcePlanStatus.UNDER_CEO_REVIEW,
    ];
    if (!rejectableStatuses.includes(existing.status)) {
      throw new AppError(
        'Only plans under HR or CEO review can be rejected.',
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          company_id: companyId,
          user_id: approverUserId,
          action: 'WORKFORCE_PLAN_REJECTED',
          entity_type: 'WorkforcePlan',
          entity_id: planId,
          description: reason,
        },
      });
      await tx.recruitmentApprovalHistory.create({
        data: {
          entity_type: 'WorkforcePlan',
          entity_id: planId,
          action: 'REJECTED',
          actor_user_id: approverUserId,
          comments: reason ?? null,
        },
      });

      const plan = await tx.workforcePlan.update({
        where: { id: planId },
        data: {
          status: WorkforcePlanStatus.REJECTED,
          ceo_comments: reason ?? undefined,
        },
        include: {
          workforce_plan_items: { include: { department: true } },
          created_by: { select: { first_name: true, last_name: true } },
          approved_by: { select: { first_name: true, last_name: true } },
          returned_by: { select: { first_name: true, last_name: true } },
        },
      });

      const histories = await tx.recruitmentApprovalHistory.findMany({
        where: { entity_type: 'WorkforcePlan', entity_id: planId },
        include: { actor: { select: { first_name: true, last_name: true } } },
        orderBy: { created_at: 'asc' },
      });

      return WorkforceService.normalizeWorkforcePlan({
        ...plan,
        approval_histories: histories,
      });
    });
  }
}

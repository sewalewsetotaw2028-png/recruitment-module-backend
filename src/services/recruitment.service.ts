import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { CreateRequestDTO, UpdateRequestDTO } from '../types/recruitment.types';
import {
  notifyRecruitmentRequestSubmitted,
  notifyRecruitmentRequestApproved,
  notifyRecruitmentRequestRejected,
} from '../utils/notificationWiring';

type CustomFieldPersistenceClient = Pick<
  typeof prisma,
  'customField' | 'customFieldValue' | 'user'
>;

type WorkforcePlanMetadataClient = Pick<typeof prisma, 'workforcePlanItem'>;

const RESERVED_CUSTOM_FIELD_KEYS = [
  '__hiring_manager_id',
  '__hiring_manager_name',
  '__location',
] as const;

type ReservedCustomFieldKey = (typeof RESERVED_CUSTOM_FIELD_KEYS)[number];

type ReservedMetadata = Partial<Record<ReservedCustomFieldKey, string>>;

type RecruitmentRequestDbStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

const toDbStatus = (value?: string): RecruitmentRequestDbStatus => {
  switch (String(value ?? 'draft').toLowerCase()) {
    case 'submitted':
    case 'pending':
      return 'SUBMITTED';
    case 'under_review':
    case 'pending_ceo':
      return 'UNDER_REVIEW';
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'DRAFT';
  }
};

const toRequestType = (value?: string, isReplacement?: boolean) =>
  value === 'replacement' || value === 'REPLACEMENT' || isReplacement
    ? 'REPLACEMENT'
    : 'NEW_HEADCOUNT';

const toPlanningType = (value?: string) =>
  String(value ?? '').toLowerCase() === 'unplanned' ? 'UNPLANNED' : 'PLANNED';

const toPriority = (value?: string) => {
  const priority = String(value ?? 'medium').toUpperCase();
  return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)
    ? priority
    : 'MEDIUM';
};

const toEmploymentType = (value?: string) => {
  const employmentType = String(value ?? 'full_time').toUpperCase();
  return employmentType === 'CONTRACTOR' ? 'CONTRACT' : employmentType;
};

const assertCompanyRecord = <T extends { company_id: number | string }>(
  record: T | null,
  company_id: string | number,
): T => {
  if (!record || String(record.company_id) !== String(company_id)) {
    throw new AppError('Not found or unauthorized', 404);
  }
  return record;
};

export class RecruitmentService {
  private static extractMetadataFromValues(values: Record<string, unknown>): {
    reserved: ReservedMetadata;
    custom: Record<string, unknown>;
  } {
    const reserved: ReservedMetadata = {};
    const custom: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(values)) {
      if (
        (RESERVED_CUSTOM_FIELD_KEYS as readonly string[]).includes(key) &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        reserved[key as ReservedCustomFieldKey] = String(value);
      } else {
        custom[key] = value;
      }
    }

    return { reserved, custom };
  }

  private static mergeMetadata(
    existing: ReservedMetadata,
    derived: ReservedMetadata,
    fillMissingOnly = false,
  ): ReservedMetadata {
    const merged: ReservedMetadata = { ...existing };

    for (const key of RESERVED_CUSTOM_FIELD_KEYS) {
      const derivedValue = derived[key];
      if (!derivedValue) continue;
      if (fillMissingOnly && merged[key]) continue;
      merged[key] = derivedValue;
    }

    return merged;
  }

  private static buildMetadataFromWorkforcePlanItem(item: {
    department?: {
      manager?: {
        id: string;
        first_name: string;
        last_name: string;
      } | null;
    } | null;
    workforce_plan?: {
      business_unit?: string | null;
      created_by?: {
        id: string;
        first_name: string;
        last_name: string;
      } | null;
    } | null;
  }): ReservedMetadata {
    const metadata: ReservedMetadata = {};

    const location = item.workforce_plan?.business_unit?.trim();
    if (location) {
      metadata.__location = location;
    }

    const hiringManager =
      item.department?.manager ?? item.workforce_plan?.created_by ?? null;
    if (hiringManager) {
      metadata.__hiring_manager_id = hiringManager.id;
      metadata.__hiring_manager_name =
        `${hiringManager.first_name} ${hiringManager.last_name}`.trim();
    }

    return metadata;
  }

  private static async getPlannedRequestMetadata(
    client: WorkforcePlanMetadataClient,
    workforcePlanItemId: string,
  ): Promise<ReservedMetadata> {
    const item = await client.workforcePlanItem.findUnique({
      where: { id: workforcePlanItemId },
      include: {
        department: {
          include: {
            manager: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
        workforce_plan: {
          select: {
            business_unit: true,
            created_by: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
      },
    });

    if (!item) return {};
    return this.buildMetadataFromWorkforcePlanItem(item);
  }

  private static async enrichHiringManagerMetadata(
    client: Pick<typeof prisma, 'user'>,
    values: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const enriched = { ...values };
    const hiringManagerId = String(enriched.__hiring_manager_id ?? '').trim();
    const hiringManagerName = String(
      enriched.__hiring_manager_name ?? '',
    ).trim();

    if (!hiringManagerId || hiringManagerName) {
      return enriched;
    }

    const user = await client.user.findUnique({
      where: { id: hiringManagerId },
      select: { first_name: true, last_name: true },
    });

    if (user) {
      enriched.__hiring_manager_name =
        `${user.first_name} ${user.last_name}`.trim();
    }

    return enriched;
  }

  private static async resolveReservedCustomFieldIds(
    tx: CustomFieldPersistenceClient,
    companyId: number,
    entityType: 'RecruitmentRequest',
    reserved: ReservedMetadata,
  ): Promise<Record<string, string>> {
    const resolved: Record<string, string> = {};

    for (const fieldName of RESERVED_CUSTOM_FIELD_KEYS) {
      const value = reserved[fieldName];
      if (!value) continue;

      let field = await tx.customField.findFirst({
        where: {
          company_id: companyId,
          entity_type: entityType,
          field_name: fieldName,
        },
        select: { id: true },
      });

      if (!field) {
        field = await tx.customField.create({
          data: {
            company_id: companyId,
            entity_type: entityType,
            field_name: fieldName,
            field_type: 'text',
            is_required: false,
          },
          select: { id: true },
        });
      }

      resolved[field.id] = value;
    }

    return resolved;
  }

  private static async getCustomFieldValues(
    companyId: string | number,
    entityType: 'RecruitmentRequest',
    entityId: string,
  ): Promise<Record<string, string>> {
    const values = await prisma.customFieldValue.findMany({
      where: {
        entity_id: entityId,
        custom_field: {
          company_id: Number(companyId),
          entity_type: entityType,
        },
      },
      select: {
        custom_field_id: true,
        value: true,
        custom_field: {
          select: { field_name: true },
        },
      },
    });

    return values.reduce<Record<string, string>>((acc, item) => {
      acc[item.custom_field_id] = item.value;
      const fieldName = item.custom_field?.field_name;
      if (fieldName?.startsWith('__')) {
        acc[fieldName] = item.value;
      }
      if (fieldName === 'hiring_manager_id') {
        acc.__hiring_manager_id = item.value;
      }
      if (fieldName === 'hiring_manager_name') {
        acc.__hiring_manager_name = item.value;
      }
      return acc;
    }, {});
  }

  private static async attachCustomFieldValues<
    T extends {
      id: string;
      planning_type?: string;
      workforce_plan_item_id?: string | null;
    },
  >(
    companyId: string | number,
    entityType: 'RecruitmentRequest',
    record: T,
  ): Promise<T & { custom_field_values: Record<string, string> }> {
    let custom_field_values = await this.getCustomFieldValues(
      companyId,
      entityType,
      record.id,
    );

    if (
      String(record.planning_type ?? '').toUpperCase() === 'PLANNED' &&
      record.workforce_plan_item_id
    ) {
      const plannedMetadata = await this.getPlannedRequestMetadata(
        prisma,
        record.workforce_plan_item_id,
      );
      const { reserved } = this.extractMetadataFromValues(custom_field_values);
      const merged = this.mergeMetadata(reserved, plannedMetadata, true);
      custom_field_values = {
        ...custom_field_values,
        ...merged,
      };
    }

    const enriched = (await this.enrichHiringManagerMetadata(
      prisma,
      custom_field_values,
    )) as Record<string, string>;

    return {
      ...record,
      custom_field_values: enriched,
    };
  }

  private static async persistCustomFieldValues(
    tx: CustomFieldPersistenceClient,
    companyId: string | number,
    entityType: 'RecruitmentRequest',
    entityId: string,
    values?: Record<string, unknown>,
  ) {
    if (values === undefined) return;

    const enrichedValues = await this.enrichHiringManagerMetadata(tx, values);
    const { reserved, custom } = this.extractMetadataFromValues(enrichedValues);
    const resolvedReserved = await this.resolveReservedCustomFieldIds(
      tx,
      Number(companyId),
      entityType,
      reserved,
    );
    const mergedValues = { ...custom, ...resolvedReserved };

    const definitions = await tx.customField.findMany({
      where: {
        company_id: Number(companyId),
        entity_type: entityType,
      },
      select: { id: true, field_name: true, is_required: true },
    });

    const requiredFields = definitions.filter((field) => field.is_required);
    for (const field of requiredFields) {
      const rawValue = mergedValues[field.id];
      const isEmpty =
        rawValue === undefined ||
        rawValue === null ||
        String(rawValue).trim() === '';

      if (isEmpty) {
        throw new AppError(
          `Custom field "${field.field_name}" is required.`,
          400,
        );
      }
    }

    const validFieldIds = new Set(definitions.map((field) => field.id));
    const entries = Object.entries(mergedValues).filter(([fieldId, value]) => {
      return (
        validFieldIds.has(fieldId) &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      );
    });

    await tx.customFieldValue.deleteMany({
      where: { entity_id: entityId },
    });

    if (entries.length === 0) return;

    await tx.customFieldValue.createMany({
      data: entries.map(([fieldId, value]) => ({
        custom_field_id: fieldId,
        entity_id: entityId,
        value:
          typeof value === 'string'
            ? value
            : typeof value === 'number' || typeof value === 'boolean'
              ? String(value)
              : JSON.stringify(value),
      })),
    });
  }

  static async createRequest(
    company_id: string | number,
    user_id: string,
    data: CreateRequestDTO,
  ) {
    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.recruitmentRequest.create({
        data: {
          id: data.id,
          company_id: Number(company_id),
          planning_type: toPlanningType(data.planning_type || data.request_type),
          requested_by_user_id: user_id,
          workforce_plan_item_id: data.workforce_plan_item_id || undefined,
          department_id: Number(data.department_id),
          position_name:
            data.position_name ||
            data.request_title ||
            data.job_title ||
            'New Position',
          job_title:
            data.job_title || data.request_title || data.position_name || 'TBD',
          headcount: data.headcount ?? 1,
          employment_type: toEmploymentType(data.employment_type) as any,
          justification: data.justification || '',
          request_type: toRequestType(data.request_type, data.is_replacement),
          priority: toPriority(data.priority) as any,
          is_replacement: Boolean(data.is_replacement),
          replacement_for_employee_id:
            data.replacement_employee_id || undefined,
          replacement_reason: data.replacement_reason || undefined,
          status: toDbStatus(data.status),
        },
      });

      const planningType = toPlanningType(
        data.planning_type || data.request_type,
      );
      let customFieldValues = { ...(data.custom_field_values ?? {}) };

      if (planningType === 'PLANNED' && data.workforce_plan_item_id) {
        const plannedMetadata = await this.getPlannedRequestMetadata(
          tx,
          data.workforce_plan_item_id,
        );
        const { reserved } = this.extractMetadataFromValues(customFieldValues);
        customFieldValues = {
          ...customFieldValues,
          ...this.mergeMetadata(reserved, plannedMetadata, false),
        };
      }

      await this.persistCustomFieldValues(
        tx,
        company_id,
        'RecruitmentRequest',
        created.id,
        customFieldValues,
      );

      await tx.activityLog.create({
        data: {
          company_id: Number(company_id),
          user_id,
          action: 'created',
          entity_type: 'RecruitmentRequest',
          entity_id: created.id,
          description: `Recruitment request created with status ${created.status}`,
          changes: {
            status: created.status,
            request_type: created.request_type,
            planning_type: created.planning_type,
            department_id: created.department_id,
          },
        },
      });

      return created;
    });

    return await this.attachCustomFieldValues(
      company_id,
      'RecruitmentRequest',
      request,
    );
  }

  static async updateRequest(
    company_id: string | number,
    requestId: string,
    updatedByUserId: string,
    data: UpdateRequestDTO,
  ) {
    const existing = assertCompanyRecord(await prisma.recruitmentRequest.findUnique({
      where: { id: requestId },
    }), company_id);

    if (existing.status !== 'DRAFT') {
      throw new AppError('Only draft requests can be updated.', 400);
    }

    const request = await prisma.$transaction(async (tx) => {
      const updated = await tx.recruitmentRequest.update({
        where: { id: requestId },
        data: {
          planning_type: data.planning_type
            ? (toPlanningType(data.planning_type) as any)
            : undefined,
          workforce_plan_item_id:
            data.workforce_plan_item_id || existing.workforce_plan_item_id,
          department_id: data.department_id
            ? Number(data.department_id)
            : existing.department_id,
          position_name:
            data.position_name ||
            data.request_title ||
            data.job_title ||
            existing.position_name,
          job_title:
            data.job_title ||
            data.request_title ||
            data.position_name ||
            existing.job_title,
          headcount: data.headcount ?? existing.headcount,
          employment_type: data.employment_type
            ? (toEmploymentType(data.employment_type) as any)
            : existing.employment_type,
          request_type: data.request_type
            ? (toRequestType(data.request_type, data.is_replacement) as any)
            : existing.request_type,
          priority: data.priority
            ? (toPriority(data.priority) as any)
            : existing.priority,
          is_replacement:
            data.is_replacement !== undefined
              ? Boolean(data.is_replacement)
              : existing.is_replacement,
          replacement_for_employee_id:
            data.replacement_employee_id ||
            existing.replacement_for_employee_id,
          replacement_reason:
            data.replacement_reason || existing.replacement_reason,
          justification: data.justification || existing.justification,
          status: data.status ? toDbStatus(data.status) : existing.status,
        },
      });

      if (data.custom_field_values !== undefined) {
        let customFieldValues = { ...data.custom_field_values };
        const planningType = toPlanningType(
          data.planning_type ||
            existing.planning_type ||
            data.request_type,
        );
        const workforcePlanItemId =
          data.workforce_plan_item_id || existing.workforce_plan_item_id;

        if (planningType === 'PLANNED' && workforcePlanItemId) {
          const plannedMetadata = await this.getPlannedRequestMetadata(
            tx,
            workforcePlanItemId,
          );
          const { reserved } =
            this.extractMetadataFromValues(customFieldValues);
          customFieldValues = {
            ...customFieldValues,
            ...this.mergeMetadata(reserved, plannedMetadata, false),
          };
        }

        await this.persistCustomFieldValues(
          tx,
          company_id,
          'RecruitmentRequest',
          updated.id,
          customFieldValues,
        );
      }

      await tx.activityLog.create({
        data: {
          company_id: Number(company_id),
          user_id: updatedByUserId,
          action: 'updated',
          entity_type: 'RecruitmentRequest',
          entity_id: updated.id,
          description: `Recruitment request updated with status ${updated.status}`,
          changes: data as any,
        },
      });

      return updated;
    });

    return await this.attachCustomFieldValues(
      company_id,
      'RecruitmentRequest',
      request,
    );
  }

  /**
   * Store the uploaded document URL on the request.
   * We piggyback on the existing `hr_comments` field using a reserved prefix
   * "__doc::" so it can be parsed back by the mapper without a schema change.
   */
  static async uploadSupportingDocument(
    company_id: string | number,
    request_id: string,
    file_url: string,
    file_name: string,
  ) {
    const existing = await prisma.recruitmentRequest.findUnique({
      where: { id: request_id },
    });
    assertCompanyRecord(existing, company_id);

    // Encode URL + original filename into hr_comments with a reserved prefix.
    const docTag = `__doc::${file_url}::${file_name}`;
    const currentComments = (existing as NonNullable<typeof existing>).hr_comments ?? '';
    // Strip any previous doc tag
    const stripped = currentComments.replace(/__doc::.*?::[^\n]*/g, '').trim();
    const merged = stripped ? `${docTag}\n${stripped}` : docTag;

    await prisma.recruitmentRequest.update({
      where: { id: request_id },
      data: { hr_comments: merged },
    });

    return { url: file_url, name: file_name };
  }

  static async getSupportingDocument(
    company_id: string | number,
    request_id: string,
  ) {
    const existing = assertCompanyRecord(
      await prisma.recruitmentRequest.findUnique({
        where: { id: request_id },
      }),
      company_id,
    );

    const comments = existing.hr_comments ?? '';
    const match = comments.match(/__doc::([^:]+(?::[^:]+)*)::(.+)/);

    if (!match) {
      throw new AppError('No supporting document attached.', 404);
    }

    return {
      url: match[1],
      name: match[2],
    };
  }

  static async getRequests(company_id: string | number) {    const requests = await prisma.recruitmentRequest.findMany({
      where: { company_id: Number(company_id) },
      include: {
        department: true,
        requested_by: {
          select: { first_name: true, last_name: true },
        },
        vacancy: {
          select: { id: true, vacancy_number: true },
        },
        approved_by: {
          select: { first_name: true, last_name: true },
        },
        workforce_plan_item: {
          select: {
            id: true,
            workforce_plan_id: true,
            department: {
              select: {
                id: true,
                name: true,
                manager: {
                  select: { id: true, first_name: true, last_name: true },
                },
              },
            },
            workforce_plan: {
              select: {
                id: true,
                title: true,
                business_unit: true,
                created_by_user_id: true,
                created_by: {
                  select: { id: true, first_name: true, last_name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return await Promise.all(
      requests.map((request) =>
        this.attachCustomFieldValues(
          company_id,
          'RecruitmentRequest',
          request,
        ),
      ),
    );
  }

  static async getRequestById(company_id: string | number, requestId: string) {
    const request = assertCompanyRecord(await prisma.recruitmentRequest.findUnique({
      where: { id: requestId },
      include: {
        department: true,
        requested_by: {
          select: { first_name: true, last_name: true },
        },
        approved_by: {
          select: { first_name: true, last_name: true },
        },
        vacancy: true,
        workforce_plan_item: {
          select: {
            id: true,
            workforce_plan_id: true,
            department: {
              select: {
                id: true,
                name: true,
                manager: {
                  select: { id: true, first_name: true, last_name: true },
                },
              },
            },
            workforce_plan: {
              select: {
                id: true,
                title: true,
                business_unit: true,
                created_by_user_id: true,
                created_by: {
                  select: { id: true, first_name: true, last_name: true },
                },
              },
            },
          },
        },
      },
    }), company_id);

    return await this.attachCustomFieldValues(
      company_id,
      'RecruitmentRequest',
      request,
    );
  }

  static async hrReviewRequest(
    company_id: string | number,
    requestId: string,
    reviewerUserId: string,
    action: 'approve' | 'reject',
    notes?: string,
  ) {
    const existing = assertCompanyRecord(await prisma.recruitmentRequest.findUnique({
      where: { id: requestId },
    }), company_id);

    if (existing.status !== 'SUBMITTED') {
      throw new AppError('Only submitted requests can be reviewed by HR.', 400);
    }

    const nextStatus = action === 'reject' ? 'REJECTED' : 'UNDER_REVIEW';

    // Preserve any existing __doc:: tag in hr_comments (the supporting document URL)
    // and append the HR review notes after it.
    const existingComments = existing.hr_comments ?? '';
    const docTagMatch = existingComments.match(/(__doc::[^\n]*)/);
    const docTag = docTagMatch ? docTagMatch[1] : null;
    const mergedComments = notes
      ? docTag
        ? `${docTag}\n${notes}`   // keep doc tag, add notes below
        : notes                   // no doc tag, just the notes
      : docTag
        ? docTag                  // notes empty, keep doc tag only
        : null;                   // nothing to store

    const updated = await prisma.recruitmentRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        hr_comments: mergedComments,
      },
      include: {
        department: true,
        requested_by: {
          select: { first_name: true, last_name: true },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        company_id: Number(company_id),
        user_id: reviewerUserId,
        action: action === 'reject' ? 'rejected' : 'approved',
        entity_type: 'RecruitmentRequest',
        entity_id: requestId,
        description:
          notes ||
          (action === 'reject'
            ? 'HR rejected the recruitment request.'
            : 'HR forwarded request to CEO.'),
      },
    });

    return await this.attachCustomFieldValues(
      company_id,
      'RecruitmentRequest',
      updated,
    );
  }

  static async submitRecruitmentRequest(
    company_id: string | number,
    requestId: string,
    submittedByUserId: string,
  ) {
    const existing = assertCompanyRecord(await prisma.recruitmentRequest.findUnique({
      where: { id: requestId },
    }), company_id);

    if (existing.status !== 'DRAFT') {
      throw new AppError('Only draft requests can be submitted.', 400);
    }

    const updated = await prisma.recruitmentRequest.update({
      where: { id: requestId },
      data: { status: 'SUBMITTED' },
      include: {
        department: true,
        requested_by: {
          select: { first_name: true, last_name: true },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        company_id: Number(company_id),
        user_id: submittedByUserId,
        action: 'submitted',
        entity_type: 'RecruitmentRequest',
        entity_id: requestId,
        description: 'Recruitment request submitted for HR review.',
      },
    });

    // Fire-and-forget notification
    setImmediate(async () => {
      try {
        const requester = updated.requested_by;
        const requesterName = requester ? `${requester.first_name} ${requester.last_name}`.trim() : 'Unknown';
        await notifyRecruitmentRequestSubmitted(
          Number(company_id),
          requestId,
          existing.request_number || '',
          updated.job_title,
          updated.department?.name || '',
          requesterName,
        );
      } catch (e) { /* swallow */ }
    });

    return await this.attachCustomFieldValues(
      company_id,
      'RecruitmentRequest',
      updated,
    );
  }

  static async approveRecruitmentRequest(
    company_id: string | number,
    requestId: string,
    approverUserId: string,
    approvalNotes?: string,
  ) {
    const existing = assertCompanyRecord(await prisma.recruitmentRequest.findUnique({
      where: { id: requestId },
    }), company_id);

    if (existing.status !== 'UNDER_REVIEW') {
      throw new AppError(
        'Only requests under CEO review can be approved.',
        400,
      );
    }

    // Merge CEO notes into hr_comments using a tag so they're preserved alongside HR notes
    let updatedComments = existing.hr_comments || '';
    if (approvalNotes?.trim()) {
      const ceoTag = `__ceo_notes::${approvalNotes.trim()}`;
      updatedComments = updatedComments
        ? `${updatedComments}\n${ceoTag}`
        : ceoTag;
    }

    const updated = await prisma.recruitmentRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approved_by_user_id: approverUserId,
        ...(approvalNotes?.trim() ? { hr_comments: updatedComments } : {}),
      },
      include: {
        department: true,
        requested_by: {
          select: { first_name: true, last_name: true },
        },
        vacancy: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        company_id: Number(company_id),
        user_id: approverUserId,
        action: 'approved',
        entity_type: 'RecruitmentRequest',
        entity_id: requestId,
        description: approvalNotes?.trim()
          ? `Recruitment request approved. CEO notes: ${approvalNotes.trim()}`
          : `Recruitment request approved: ${requestId}`,
      },
    });

    // Fire-and-forget notification
    setImmediate(async () => {
      try {
        const approver = await prisma.user.findUnique({ where: { id: approverUserId }, select: { first_name: true, last_name: true } });
        const approverName = approver ? `${approver.first_name} ${approver.last_name}`.trim() : 'Unknown';
        await notifyRecruitmentRequestApproved(
          Number(company_id),
          requestId,
          existing.request_number || '',
          updated.job_title,
          existing.requested_by_user_id,
          approverName,
        );
      } catch (e) { /* swallow */ }
    });

    return await this.attachCustomFieldValues(
      company_id,
      'RecruitmentRequest',
      updated,
    );
  }

  static async rejectRequest(
    company_id: string | number,
    requestId: string,
    rejectedByUserId: string,
    reason?: string,
  ) {
    const existing = assertCompanyRecord(await prisma.recruitmentRequest.findUnique({
      where: { id: requestId },
    }), company_id);

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(existing.status)) {
      throw new AppError(
        'Only submitted or under-review requests can be rejected.',
        400,
      );
    }

    const updated = await prisma.recruitmentRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        approved_by_user_id: rejectedByUserId,
        hr_comments: (() => {
          const existingComments = existing.hr_comments ?? '';
          const docTagMatch = existingComments.match(/(__doc::[^\n]*)/);
          const docTag = docTagMatch ? docTagMatch[1] : null;
          return reason
            ? docTag ? `${docTag}\n${reason}` : reason
            : docTag ?? null;
        })(),
      },
      include: {
        department: true,
        requested_by: {
          select: { first_name: true, last_name: true },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        company_id: Number(company_id),
        user_id: rejectedByUserId,
        action: 'rejected',
        entity_type: 'RecruitmentRequest',
        entity_id: requestId,
        description: reason,
      },
    });

    // Fire-and-forget notification
    setImmediate(async () => {
      try {
        const rejector = await prisma.user.findUnique({ where: { id: rejectedByUserId }, select: { first_name: true, last_name: true } });
        const rejectorName = rejector ? `${rejector.first_name} ${rejector.last_name}`.trim() : 'Unknown';
        await notifyRecruitmentRequestRejected(
          Number(company_id),
          requestId,
          existing.request_number || '',
          updated.job_title,
          existing.requested_by_user_id,
          rejectorName,
          reason || '',
        );
      } catch (e) { /* swallow */ }
    });

    return await this.attachCustomFieldValues(
      company_id,
      'RecruitmentRequest',
      updated,
    );
  }

  static async deleteRequest(
    company_id: string | number,
    requestId: string,
    deletedByUserId: string,
  ) {
    const existing = assertCompanyRecord(await prisma.recruitmentRequest.findUnique({
      where: { id: requestId },
    }), company_id);

    if (existing.status !== 'DRAFT') {
      throw new AppError('Only draft requests can be deleted.', 400);
    }

    await prisma.$transaction(async (tx) => {
      // Delete custom field values
      await tx.customFieldValue.deleteMany({
        where: { entity_id: requestId },
      });

      // Delete activity logs
      await tx.activityLog.deleteMany({
        where: { entity_id: requestId },
      });

      // Delete the recruitment request
      await tx.recruitmentRequest.delete({
        where: { id: requestId },
      });

      // Log the deletion
      await tx.activityLog.create({
        data: {
          company_id: Number(company_id),
          user_id: deletedByUserId,
          action: 'deleted',
          entity_type: 'RecruitmentRequest',
          entity_id: requestId,
          description: `Recruitment request deleted: ${existing.position_name}`,
        },
      });
    });
  }
}

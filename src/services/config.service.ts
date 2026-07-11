import prisma from '../config/database';
import { Prisma, NotificationType } from '@prisma/client';
import { AppError } from '../utils/AppError';
import bcrypt from 'bcryptjs';

export class ConfigService {
  // ─── Roles ─────────────────────────────────────────────────────────────────

  static async getRoles(companyId: number) {
    const roles = await prisma.appRole.findMany({
      where: { company_id: companyId },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      ...role,
      // Config UI expects a simple list of permission slugs for the matrix.
      permissions: role.role_permissions.map((rp) => rp.permission.slug),
    }));
  }

  static async createRole(
    companyId: number,
    data: {
      name: string;
      slug: string;
      description?: string;
      permission_ids?: string[];
      permissions?: string[]; // backward compatible
    },
  ) {
    // Check name + slug uniqueness within the company (Prompt 1)
    const existing = await prisma.appRole.findFirst({
      where: {
        company_id: companyId,
        OR: [{ slug: data.slug }, { name: data.name }],
      },
    });

    if (existing) {
      throw new AppError(
        'Role name and slug must be unique within the company',
        409,
      );
    }

    const permissionIds = data.permission_ids ?? data.permissions ?? [];

    if (permissionIds.length > 0) {
      const valid = await prisma.appPermission.count({
        where: { id: { in: permissionIds } },
      });
      if (valid !== permissionIds.length) {
        throw new AppError('One or more permission_ids are invalid', 400);
      }
    }

    // Create role with optional permissions in a transaction
    return await prisma.$transaction(async (tx) => {
      const role = await tx.appRole.create({
        data: {
          company_id: companyId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          is_system: false,
        },
      });

      if (permissionIds.length > 0) {
        // Create role permissions
        await tx.appRolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            role_id: role.id,
            permission_id: permissionId,
          })),
          skipDuplicates: true,
        });
      }

      const hydrated = await tx.appRole.findUnique({
        where: { id: role.id },
        include: {
          role_permissions: {
            include: { permission: true },
          },
        },
      });

      if (!hydrated) throw new AppError('Role not found', 404);

      return {
        ...hydrated,
        permissions: hydrated.role_permissions.map((rp) => rp.permission.slug),
      };
    });
  }

  static async updateRole(
    companyId: number,
    roleId: string,
    data: {
      name?: string;
      description?: string;
    },
  ) {
    const role = await prisma.appRole.findFirst({
      where: {
        id: roleId,
        company_id: companyId,
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // System roles: only description is editable (Prompt 1)
    if (role.is_system && data.name && data.name !== role.name) {
      throw new AppError('System role names cannot be changed', 400);
    }

    if (data.name && data.name !== role.name) {
      const nameExists = await prisma.appRole.findFirst({
        where: {
          company_id: companyId,
          name: data.name,
          id: { not: roleId },
        },
      });
      if (nameExists) {
        throw new AppError('Role name must be unique within the company', 409);
      }
    }

    const updated = await prisma.appRole.update({
      where: { id: roleId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return {
      ...updated,
      permissions: updated.role_permissions.map((rp) => rp.permission.slug),
    };
  }

  static async deleteRole(companyId: number, roleId: string) {
    const role = await prisma.appRole.findFirst({
      where: {
        id: roleId,
        company_id: companyId,
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Soft-guard: reject if is_system = true
    if (role.is_system) {
      throw new AppError('Cannot delete system roles', 400);
    }

    // Hard-guard: reject if any AppUserRole rows reference this role
    const userRoleCount = await prisma.appUserRole.count({
      where: { role_id: roleId },
    });

    if (userRoleCount > 0) {
      throw new AppError('Cannot delete role that is assigned to users', 409);
    }

    // Delete role and cascade permissions
    await prisma.appRole.delete({
      where: { id: roleId },
    });

    return { success: true };
  }

  // ─── Permissions ─────────────────────────────────────────────────────────────

  static async getPermissions() {
    const permissions = await prisma.appPermission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });

    // Group by module
    const grouped = permissions.reduce<Record<string, typeof permissions>>(
      (acc, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      },
      {},
    );

    return grouped;
  }

  // ─── Role → Permission Toggle ───────────────────────────────────────────────

  static async setRolePermissions(
    companyId: number,
    roleId: string,
    permissionIds: string[],
  ) {
    const role = await prisma.appRole.findFirst({
      where: {
        id: roleId,
        company_id: companyId,
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    const valid = await prisma.appPermission.count({
      where: { id: { in: permissionIds } },
    });
    if (valid !== permissionIds.length) {
      throw new AppError('One or more permission_ids are invalid', 400);
    }

    /**
     * Replace-all strategy (Prompt 1):
     * - the UI saves the entire permission matrix row for a role at once
     * - we delete existing mappings and re-insert the provided ids in a transaction
     *   so the role's permission set is never partially updated.
     */
    return await prisma.$transaction(async (tx) => {
      // Delete existing permissions
      await tx.appRolePermission.deleteMany({
        where: { role_id: roleId },
      });

      // Insert new permissions
      if (permissionIds.length > 0) {
        await tx.appRolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          })),
          skipDuplicates: true,
        });
      }

      // Return updated role with permissions
      const updated = await tx.appRole.findUnique({
        where: { id: roleId },
        include: {
          role_permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!updated) {
        // Should not happen because we already verified existence, but avoids a crash.
        throw new AppError('Role not found', 404);
      }

      return {
        ...updated,
        permissions: updated.role_permissions.map((rp) => rp.permission.slug),
      };
    });
  }

  static async getRoleUsers(companyId: number, roleId: string) {
    const role = await prisma.appRole.findFirst({
      where: { id: roleId, company_id: companyId },
    });

    if (!role) throw new AppError('Role not found', 404);

    const assignments = await prisma.appUserRole.findMany({
      where: { role_id: roleId, role: { company_id: companyId } },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
      },
      orderBy: { assigned_at: 'desc' },
    });

    return assignments.map((a) => ({
      assigned_at: a.assigned_at,
      user: a.user,
    }));
  }

  // ─── User Role Assignment ───────────────────────────────────────────────────

  static async getUserRoles(userId: string) {
    const userRoles = await prisma.appUserRole.findMany({
      where: { user_id: userId },
      include: {
        role: true,
      },
    });

    return userRoles.map((ur) => ur.role);
  }

  static async setUserRoles(
    userId: string,
    roleIds: string[],
    assignedBy: string,
  ) {
    // Replace the user's role set
    return await prisma.$transaction(async (tx) => {
      // Delete existing roles
      await tx.appUserRole.deleteMany({
        where: { user_id: userId },
      });

      // Insert new roles
      await tx.appUserRole.createMany({
        data: roleIds.map((roleId) => ({
          user_id: userId,
          role_id: roleId,
          assigned_by_id: assignedBy,
        })),
        skipDuplicates: true,
      });

      // Return updated roles
      const updated = await tx.appUserRole.findMany({
        where: { user_id: userId },
        include: {
          role: true,
        },
      });

      return updated.map((ur) => ur.role);
    });
  }

  static async assignUserRole(
    companyId: number,
    userId: string,
    roleId: string,
    assignedBy: string,
  ) {
    const role = await prisma.appRole.findFirst({
      where: { id: roleId, company_id: companyId },
    });
    if (!role) throw new AppError('Role not found', 404);

    const user = await prisma.user.findFirst({
      where: { id: userId, company_id: companyId },
      select: { id: true },
    });
    if (!user) throw new AppError('User not found', 404);

    await prisma.appUserRole.upsert({
      where: { user_id_role_id: { user_id: userId, role_id: roleId } },
      update: { assigned_by_id: assignedBy },
      create: {
        user_id: userId,
        role_id: roleId,
        assigned_by_id: assignedBy,
      },
    });

    return role;
  }

  static async removeUserRole(
    companyId: number,
    userId: string,
    roleId: string,
  ) {
    const role = await prisma.appRole.findFirst({
      where: { id: roleId, company_id: companyId },
      select: { id: true },
    });
    if (!role) throw new AppError('Role not found', 404);

    await prisma.appUserRole.deleteMany({
      where: { user_id: userId, role_id: roleId },
    });

    return { success: true };
  }

  static async getCompanyUsers(
    companyId: number,
    options: { page: number; limit: number; search?: string },
  ) {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.UserWhereInput = {
      company_id: companyId,
      ...(search && {
        OR: [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          is_active: true,
          app_user_roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { first_name: 'asc' },
      }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        is_active: user.is_active,
        roles: user.app_user_roles.map((ur) => ur.role),
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async createInternalUser(
    companyId: number,
    payload: {
      firstName: string;
      lastName: string;
      email: string;
      password?: string;
      roleIds: string[];
    },
    assignedBy: string,
  ) {
    const existing = await prisma.user.findFirst({
      where: { email: payload.email },
    });
    if (existing) {
      throw new AppError('Email is already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(payload.password || '', 12);

    const user = await prisma.user.create({
      data: {
        company_id: companyId,
        first_name: payload.firstName,
        last_name: payload.lastName,
        email: payload.email,
        password_hash: hashedPassword,
        is_active: true,
        is_email_verified: true,
        terms_accepted: true,
      },
    });

    if (payload.roleIds && payload.roleIds.length > 0) {
      const roles = await prisma.appRole.findMany({
        where: {
          id: { in: payload.roleIds },
          company_id: companyId,
        },
      });
      if (roles.length !== payload.roleIds.length) {
        throw new AppError('One or more role IDs are invalid', 400);
      }

      await this.setUserRoles(user.id, payload.roleIds, assignedBy);
    }

    const roles = await this.getUserRoles(user.id);

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      is_active: user.is_active,
      roles,
    };
  }

  // ─── Screening Criteria ─────────────────────────────────────────────────────

  private static getTemplateScreeningCriteriaWhere(companyId: number) {
    return {
      company_id: companyId,
      vacancy_id: null,
      job_template_id: null,
      is_active: true,
    };
  }

  private static async getTemplateScreeningCriteria(companyId: number) {
    return await prisma.screeningCriteria.findMany({
      where: this.getTemplateScreeningCriteriaWhere(companyId),
      orderBy: { created_at: 'desc' },
    });
  }

  private static async upsertScreeningCriteriaByScope(
    companyId: number,
    data: {
      vacancyId?: string;
      jobTemplateId?: string;
      criteriaJson: any[];
      isActive?: boolean;
    },
  ) {
    const scopeWhere = data.vacancyId
      ? { company_id: companyId, vacancy_id: data.vacancyId }
      : data.jobTemplateId
        ? { company_id: companyId, job_template_id: data.jobTemplateId }
        : this.getTemplateScreeningCriteriaWhere(companyId);

    const existing = await prisma.screeningCriteria.findFirst({
      where: scopeWhere,
      orderBy: { created_at: 'desc' },
    });

    const payload = {
      criteria_json: data.criteriaJson,
      is_active: data.isActive ?? true,
    };

    if (existing) {
      return await prisma.screeningCriteria.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return await prisma.screeningCriteria.create({
      data: {
        company_id: companyId,
        vacancy_id: data.vacancyId ?? null,
        job_template_id: data.jobTemplateId ?? null,
        ...payload,
      },
    });
  }

  static async getScreeningCriteria(
    companyId: number,
    filters: {
      vacancyId?: string;
      jobTemplateId?: string;
    },
  ) {
    if (filters.vacancyId) {
      const vacancyCriteria = await prisma.screeningCriteria.findMany({
        where: {
          company_id: companyId,
          vacancy_id: filters.vacancyId,
          is_active: true,
        },
        orderBy: { created_at: 'desc' },
      });

      if (vacancyCriteria.length > 0) {
        return vacancyCriteria;
      }

      // Vacancy-specific criteria override the shared template defaults; if none exist,
      // fall back to the company template so the UI still has something to edit.
      return await this.getTemplateScreeningCriteria(companyId);
    }

    if (filters.jobTemplateId) {
      const templateCriteria = await prisma.screeningCriteria.findMany({
        where: {
          company_id: companyId,
          job_template_id: filters.jobTemplateId,
          is_active: true,
        },
        orderBy: { created_at: 'desc' },
      });

      if (templateCriteria.length > 0) {
        return templateCriteria;
      }

      return await this.getTemplateScreeningCriteria(companyId);
    }

    return await this.getTemplateScreeningCriteria(companyId);
  }

  static async createScreeningCriteria(
    companyId: number,
    data: {
      vacancyId?: string;
      jobTemplateId?: string;
      criteriaJson: any[];
      isActive?: boolean;
    },
  ) {
    // Template-level defaults are stored as one editable row per company, while
    // vacancy/job-template profiles are updated in place for a consistent UX.
    return await this.upsertScreeningCriteriaByScope(companyId, {
      vacancyId: data.vacancyId,
      jobTemplateId: data.jobTemplateId,
      criteriaJson: data.criteriaJson,
      isActive: data.isActive,
    });
  }

  static async getScreeningCriteriaByVacancy(
    companyId: number,
    vacancyId: string,
  ) {
    const vacancyCriteria = await prisma.screeningCriteria.findMany({
      where: {
        company_id: companyId,
        vacancy_id: vacancyId,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });

    if (vacancyCriteria.length > 0) {
      return vacancyCriteria;
    }

    // Vacancy-specific criteria override the shared template defaults; if none exist,
    // fall back to the company template so the UI still shows the baseline profile.
    return await this.getTemplateScreeningCriteria(companyId);
  }

  static async upsertVacancyScreeningCriteria(
    companyId: number,
    vacancyId: string,
    data: {
      criteriaJson: any[];
      isActive?: boolean;
    },
  ) {
    const vacancy = await prisma.vacancy.findFirst({
      where: { id: vacancyId, company_id: companyId },
      select: { id: true },
    });

    if (!vacancy) {
      throw new AppError('Vacancy not found', 404);
    }

    return await this.upsertScreeningCriteriaByScope(companyId, {
      vacancyId,
      criteriaJson: data.criteriaJson,
      isActive: data.isActive,
    });
  }

  static async updateScreeningCriteria(
    companyId: number,
    id: string,
    data: {
      criteriaJson?: any[];
      isActive?: boolean;
    },
  ) {
    const criteria = await prisma.screeningCriteria.findFirst({
      where: { id, company_id: companyId },
    });

    if (!criteria) {
      throw new AppError('Screening criteria not found', 404);
    }

    return await prisma.screeningCriteria.update({
      where: { id },
      data: {
        ...(data.criteriaJson && { criteria_json: data.criteriaJson }),
        ...(data.isActive !== undefined && { is_active: data.isActive }),
      },
    });
  }

  static async deleteScreeningCriteria(companyId: number, id: string) {
    const criteria = await prisma.screeningCriteria.findFirst({
      where: { id, company_id: companyId },
    });

    if (!criteria) {
      throw new AppError('Screening criteria not found', 404);
    }

    // Soft delete - set is_active = false
    return await prisma.screeningCriteria.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // ─── Evaluation Templates ───────────────────────────────────────────────────

  private static mapEvaluationTemplate(template: any) {
    const { criteria, interview_category, ...rest } = template;
    return {
      ...rest,
      interview_category_name: interview_category?.name || null,
      criteria_count: Array.isArray(criteria) ? criteria.length : 0,
      criteria: Array.isArray(criteria)
        ? criteria.map((criterion: any) => ({
            id: criterion.id,
            template_id: criterion.template_id,
            name: criterion.name,
            weight: Number(criterion.weight),
            maxScore: criterion.max_score,
            order: criterion.order,
          }))
        : [],
    };
  }

  static async getEvaluationTemplates(companyId: number) {
    const templates = await prisma.interviewEvaluationTemplate.findMany({
      where: { company_id: companyId },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        interview_category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return templates.map((template) => this.mapEvaluationTemplate(template));
  }

  static async getEvaluationTemplateById(companyId: number, id: string) {
    const template = await prisma.interviewEvaluationTemplate.findFirst({
      where: { id, company_id: companyId },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        interview_category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!template) {
      throw new AppError('Evaluation template not found', 404);
    }

    return this.mapEvaluationTemplate(template);
  }

  static async createEvaluationTemplate(
    companyId: number,
    data: {
      name: string;
      interviewCategoryId?: string;
      isActive?: boolean;
      criteria: {
        name: string;
        weight: number;
        maxScore?: number;
        order: number;
      }[];
    },
  ) {
    // Check if name is unique within the company
    const existing = await prisma.interviewEvaluationTemplate.findFirst({
      where: {
        company_id: companyId,
        name: data.name,
      },
    });

    if (existing) {
      throw new AppError(
        'Template name must be unique within the company',
        409,
      );
    }

    // Validate weights sum to 100 (already done in validation schema, but double-check)
    const weightSum = data.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (weightSum !== 100) {
      throw new AppError('Criteria weights must sum to 100', 400);
    }

    return await prisma.$transaction(async (tx) => {
      const template = await tx.interviewEvaluationTemplate.create({
        data: {
          company_id: companyId,
          name: data.name,
          interview_category_id: data.interviewCategoryId,
          is_active: data.isActive ?? true,
        },
      });

      await tx.evaluationCriteria.createMany({
        data: data.criteria.map((c) => ({
          template_id: template.id,
          name: c.name,
          weight: c.weight,
          max_score: c.maxScore ?? 10,
          order: c.order,
        })),
      });

      const created = await tx.interviewEvaluationTemplate.findUnique({
        where: { id: template.id },
        include: {
          criteria: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!created) {
        throw new AppError(
          'Failed to load the created evaluation template',
          500,
        );
      }

      return this.mapEvaluationTemplate(created);
    });
  }

  static async updateEvaluationTemplate(
    companyId: number,
    id: string,
    data: {
      name?: string;
      interviewCategoryId?: string;
      isActive?: boolean;
      criteria?: {
        name: string;
        weight: number;
        maxScore?: number;
        order: number;
      }[];
    },
  ) {
    const template = await prisma.interviewEvaluationTemplate.findFirst({
      where: { id, company_id: companyId },
    });

    if (!template) {
      throw new AppError('Evaluation template not found', 404);
    }

    // If changing interview_category_id, validate that no existing evaluations reference this template
    if (
      data.interviewCategoryId !== undefined &&
      data.interviewCategoryId !== template.interview_category_id
    ) {
      const evaluationCount = await prisma.interviewEvaluation.count({
        where: { evaluation_template_id: id },
      });

      if (evaluationCount > 0) {
        throw new AppError(
          'Cannot change interview category of a template that is already used in evaluations',
          409,
        );
      }
    }

    // If criteria array is provided, replace all EvaluationCriteria atomically
    if (data.criteria) {
      const weightSum = data.criteria.reduce((sum, c) => sum + c.weight, 0);
      if (weightSum !== 100) {
        throw new AppError('Criteria weights must sum to 100', 400);
      }

      return await prisma.$transaction(async (tx) => {
        // Delete existing criteria
        await tx.evaluationCriteria.deleteMany({
          where: { template_id: id },
        });

        // Insert new criteria
        await tx.evaluationCriteria.createMany({
          data: data.criteria.map((c) => ({
            template_id: id,
            name: c.name,
            weight: c.weight,
            max_score: c.maxScore ?? 10,
            order: c.order,
          })),
        });

        // Update template
        const updated = await tx.interviewEvaluationTemplate.update({
          where: { id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.interviewCategoryId !== undefined && {
              interview_category_id: data.interviewCategoryId,
            }),
            ...(data.isActive !== undefined && { is_active: data.isActive }),
          },
          include: {
            criteria: {
              orderBy: { order: 'asc' },
            },
            interview_category: {
              select: { id: true, name: true },
            },
          },
        });

        return this.mapEvaluationTemplate(updated);
      });
    }

    // Only update name/category/is_active
    const updated = await prisma.interviewEvaluationTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.interviewCategoryId !== undefined && {
          interview_category_id: data.interviewCategoryId,
        }),
        ...(data.isActive !== undefined && { is_active: data.isActive }),
      },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        interview_category: {
          select: { id: true, name: true },
        },
      },
    });

    return this.mapEvaluationTemplate(updated);
  }

  static async deleteEvaluationTemplate(companyId: number, id: string) {
    const template = await prisma.interviewEvaluationTemplate.findFirst({
      where: { id, company_id: companyId },
    });

    if (!template) {
      throw new AppError('Evaluation template not found', 404);
    }

    // Reject if any InterviewEvaluation rows reference this template
    const evaluationCount = await prisma.interviewEvaluation.count({
      where: { evaluation_template_id: id },
    });

    if (evaluationCount > 0) {
      throw new AppError(
        'Cannot delete template that is referenced by interview evaluations',
        409,
      );
    }

    // Hard delete removes the template from the configuration list. The
    // delete guard above protects historical evaluations from losing context.
    await prisma.interviewEvaluationTemplate.delete({
      where: { id },
    });

    return { success: true };
  }

  static async addCriteriaToTemplate(
    companyId: number,
    templateId: string,
    data: {
      name: string;
      weight: number;
      maxScore?: number;
      order: number;
    },
  ) {
    const template = await prisma.interviewEvaluationTemplate.findFirst({
      where: { id: templateId, company_id: companyId },
      include: { criteria: true },
    });

    if (!template) {
      throw new AppError('Evaluation template not found', 404);
    }

    // Validate weight constraint: sum of all weights must not exceed 100
    const existingWeightSum = template.criteria.reduce(
      (sum, c) => sum + Number(c.weight),
      0,
    );
    const newWeightSum = existingWeightSum + data.weight;

    if (newWeightSum > 100) {
      throw new AppError(
        `Adding this criterion (weight: ${data.weight}) would exceed total weight of 100. Current total: ${existingWeightSum}`,
        400,
      );
    }

    const criterion = await prisma.evaluationCriteria.create({
      data: {
        template_id: templateId,
        name: data.name,
        weight: data.weight,
        max_score: data.maxScore ?? 10,
        order: data.order,
      },
    });

    // Return updated template with all criteria
    const updated = await prisma.interviewEvaluationTemplate.findUnique({
      where: { id: templateId },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        interview_category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!updated) {
      throw new AppError('Failed to retrieve updated template', 500);
    }

    return this.mapEvaluationTemplate(updated);
  }

  static async updateCriteriaInTemplate(
    companyId: number,
    templateId: string,
    criteriaId: string,
    data: {
      name?: string;
      weight?: number;
      maxScore?: number;
      order?: number;
    },
  ) {
    const template = await prisma.interviewEvaluationTemplate.findFirst({
      where: { id: templateId, company_id: companyId },
      include: { criteria: true },
    });

    if (!template) {
      throw new AppError('Evaluation template not found', 404);
    }

    const criterion = template.criteria.find((c) => c.id === criteriaId);
    if (!criterion) {
      throw new AppError(
        'Evaluation criterion not found in this template',
        404,
      );
    }

    // If weight is being changed, validate the new total
    if (data.weight !== undefined && data.weight !== Number(criterion.weight)) {
      const otherWeightSum = template.criteria
        .filter((c) => c.id !== criteriaId)
        .reduce((sum, c) => sum + Number(c.weight), 0);
      const newWeightSum = otherWeightSum + data.weight;

      if (newWeightSum > 100) {
        throw new AppError(
          `New weight would cause total to exceed 100. Other criteria total: ${otherWeightSum}, new weight: ${data.weight}`,
          400,
        );
      }
    }

    const updated = await prisma.evaluationCriteria.update({
      where: { id: criteriaId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.maxScore !== undefined && { max_score: data.maxScore }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    // Return updated template with all criteria
    const templateUpdated = await prisma.interviewEvaluationTemplate.findUnique(
      {
        where: { id: templateId },
        include: {
          criteria: {
            orderBy: { order: 'asc' },
          },
          interview_category: {
            select: { id: true, name: true },
          },
        },
      },
    );

    if (!templateUpdated) {
      throw new AppError('Failed to retrieve updated template', 500);
    }

    return this.mapEvaluationTemplate(templateUpdated);
  }

  static async deleteCriteriaFromTemplate(
    companyId: number,
    templateId: string,
    criteriaId: string,
  ) {
    const template = await prisma.interviewEvaluationTemplate.findFirst({
      where: { id: templateId, company_id: companyId },
      include: { criteria: true },
    });

    if (!template) {
      throw new AppError('Evaluation template not found', 404);
    }

    const criterion = template.criteria.find((c) => c.id === criteriaId);
    if (!criterion) {
      throw new AppError(
        'Evaluation criterion not found in this template',
        404,
      );
    }

    // Delete the criterion
    await prisma.evaluationCriteria.delete({
      where: { id: criteriaId },
    });

    // Return updated template with all remaining criteria
    const updated = await prisma.interviewEvaluationTemplate.findUnique({
      where: { id: templateId },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        interview_category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!updated) {
      throw new AppError('Failed to retrieve updated template', 500);
    }

    return this.mapEvaluationTemplate(updated);
  }

  static async reorderCriteria(
    companyId: number,
    templateId: string,
    criteriaIds: string[],
  ) {
    const template = await prisma.interviewEvaluationTemplate.findFirst({
      where: { id: templateId, company_id: companyId },
      include: { criteria: true },
    });

    if (!template) {
      throw new AppError('Evaluation template not found', 404);
    }

    // Validate all provided criteria IDs exist in this template
    const templateCriteriaIds = new Set(template.criteria.map((c) => c.id));
    for (const id of criteriaIds) {
      if (!templateCriteriaIds.has(id)) {
        throw new AppError(`Criterion ${id} not found in this template`, 404);
      }
    }

    if (criteriaIds.length !== template.criteria.length) {
      throw new AppError(
        'All criteria must be included in reorder request',
        400,
      );
    }

    // Update order values in transaction
    await prisma.$transaction(
      criteriaIds.map((id, index) =>
        prisma.evaluationCriteria.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    // Return updated template
    const updated = await prisma.interviewEvaluationTemplate.findUnique({
      where: { id: templateId },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        interview_category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!updated) {
      throw new AppError('Failed to retrieve updated template', 500);
    }

    return this.mapEvaluationTemplate(updated);
  }

  static async resolveEvaluationTemplate(interviewId: string) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        interview_category_id: true,
        application: {
          select: { organizationId: true },
        },
      },
    });

    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    const companyId = interview.application?.organizationId;
    if (!companyId) {
      throw new AppError('Interview company not found', 500);
    }

    // First, try to find an active template matching the interview category
    if (interview.interview_category_id) {
      const categoryTemplate =
        await prisma.interviewEvaluationTemplate.findFirst({
          where: {
            company_id: companyId,
            interview_category_id: interview.interview_category_id,
            is_active: true,
          },
          include: {
            criteria: {
              orderBy: { order: 'asc' },
            },
            interview_category: {
              select: { id: true, name: true },
            },
          },
        });

      if (categoryTemplate) {
        return this.mapEvaluationTemplate(categoryTemplate);
      }
    }

    // Fall back to the "Standard" template (interview_category_id = null)
    const standardTemplate = await prisma.interviewEvaluationTemplate.findFirst(
      {
        where: {
          company_id: companyId,
          interview_category_id: null,
          is_active: true,
        },
        include: {
          criteria: {
            orderBy: { order: 'asc' },
          },
          interview_category: {
            select: { id: true, name: true },
          },
        },
      },
    );

    if (!standardTemplate) {
      throw new AppError(
        'No active evaluation template found for this company',
        404,
      );
    }

    return this.mapEvaluationTemplate(standardTemplate);
  }

  // ─── Notification Templates ───────────────────────────────────────────────────

  private static parseNotificationType(notificationType: string) {
    if (
      !Object.values(NotificationType).includes(
        notificationType as NotificationType,
      )
    ) {
      throw new AppError('Invalid notification type', 400);
    }

    return notificationType as NotificationType;
  }

  private static extractTemplateVariables(text: string) {
    const regex = /\{\{(\w+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  private static async getNotificationTemplateVariables(
    notificationType: NotificationType,
  ) {
    return await prisma.notificationVariable.findMany({
      where: { notification_type: notificationType },
      orderBy: { variable_key: 'asc' },
    });
  }

  private static scanForUnknownVariables(
    bodyHtml: string | undefined,
    bodySms: string | undefined,
    validVariables: Set<string>,
  ) {
    // We scan both HTML and SMS content before saving so the UI can warn
    // without blocking admins when a new variable has not yet been seeded.
    const unknown = new Set<string>();
    const scan = (text?: string) => {
      if (!text) return;
      this.extractTemplateVariables(text).forEach((variableKey) => {
        if (!validVariables.has(variableKey)) {
          unknown.add(variableKey);
        }
      });
    };

    scan(bodyHtml);
    scan(bodySms);
    return Array.from(unknown).sort();
  }

  private static renderPreviewText(
    text: string,
    exampleValues: Map<string, string>,
  ) {
    // Regex replacement keeps preview rendering simple: each {{variable_key}}
    // token is swapped for the registry's example_value in-place.
    return text.replace(/\{\{(\w+)\}\}/g, (_match, variableKey: string) => {
      return exampleValues.get(variableKey) ?? '';
    });
  }

  private static async saveNotificationTemplate(
    companyId: number,
    notificationType: NotificationType,
    data: {
      subject?: string;
      bodyHtml?: string;
      bodySms?: string;
      isActive?: boolean;
    },
  ) {
    const existingTemplate = await prisma.notificationTemplate.findFirst({
      where: {
        company_id: companyId,
        type: notificationType,
      },
    });

    const validVariables = new Set(
      (await this.getNotificationTemplateVariables(notificationType)).map(
        (variable) => variable.variable_key,
      ),
    );

    const unknownVariables = this.scanForUnknownVariables(
      data.bodyHtml,
      data.bodySms,
      validVariables,
    );

    const createData = {
      company_id: companyId,
      type: notificationType,
      subject: data.subject ?? existingTemplate?.subject ?? '',
      body_html: data.bodyHtml ?? existingTemplate?.body_html ?? '',
      body_sms:
        data.bodySms !== undefined
          ? data.bodySms
          : (existingTemplate?.body_sms ?? null),
      is_active:
        data.isActive !== undefined
          ? data.isActive
          : (existingTemplate?.is_active ?? true),
    };

    const updateData = {
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.bodyHtml !== undefined && { body_html: data.bodyHtml }),
      ...(data.bodySms !== undefined && {
        body_sms: data.bodySms,
      }),
      ...(data.isActive !== undefined && { is_active: data.isActive }),
    };

    if (existingTemplate && Object.keys(updateData).length === 0) {
      return {
        template: existingTemplate,
        warnings: {
          unknown_variables: unknownVariables,
        },
      };
    }

    const template = existingTemplate
      ? await prisma.notificationTemplate.update({
          where: { id: existingTemplate.id },
          data: updateData,
        })
      : await prisma.notificationTemplate.create({
          data: createData,
        });

    return {
      template,
      warnings: {
        unknown_variables: unknownVariables,
      },
    };
  }

  static async getNotificationTemplates(companyId: number) {
    const templates = await prisma.notificationTemplate.findMany({
      where: { company_id: companyId },
      orderBy: [{ type: 'asc' }, { updated_at: 'desc' }],
    });

    const groupedByType = templates.reduce<Record<string, typeof templates>>(
      (acc, template) => {
        if (!acc[template.type]) {
          acc[template.type] = [];
        }
        acc[template.type].push(template);
        return acc;
      },
      {},
    );

    return {
      templates,
      groupedByType,
    };
  }

  static async getNotificationTemplateById(companyId: number, id: string) {
    const template = await prisma.notificationTemplate.findFirst({
      where: { id, company_id: companyId },
    });

    if (!template) {
      throw new AppError('Notification template not found', 404);
    }

    return template;
  }

  static async updateNotificationTemplate(
    companyId: number,
    id: string,
    data: {
      subject?: string;
      bodyHtml?: string;
      bodySms?: string;
      isActive?: boolean;
    },
  ) {
    const template = await prisma.notificationTemplate.findFirst({
      where: { id, company_id: companyId },
    });

    if (!template) {
      throw new AppError('Notification template not found', 404);
    }

    return await this.saveNotificationTemplate(companyId, template.type, data);
  }

  static async upsertNotificationTemplateByType(
    companyId: number,
    notificationType: string,
    data: {
      subject: string;
      bodyHtml: string;
      bodySms?: string;
      isActive?: boolean;
    },
  ) {
    const parsedType = this.parseNotificationType(notificationType);
    return await this.saveNotificationTemplate(companyId, parsedType, data);
  }

  static async previewNotificationTemplateByType(
    companyId: number,
    notificationType: string,
  ) {
    const parsedType = this.parseNotificationType(notificationType);
    const template = await prisma.notificationTemplate.findFirst({
      where: {
        company_id: companyId,
        type: parsedType,
      },
    });

    if (!template) {
      throw new AppError('Notification template not found', 404);
    }

    const variables = await this.getNotificationTemplateVariables(parsedType);
    const exampleValues = new Map(
      variables.map((variable) => [
        variable.variable_key,
        variable.example_value ?? '',
      ]),
    );

    return {
      subject_preview: this.renderPreviewText(template.subject, exampleValues),
      body_preview: this.renderPreviewText(template.body_html, exampleValues),
    };
  }

  // ─── Recruitment Channels ───────────────────────────────────────────────────

  static async getRecruitmentChannels(companyId: number) {
    return await prisma.recruitmentChannel.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' },
    });
  }

  static async createRecruitmentChannel(
    companyId: number,
    data: {
      name: string;
      description?: string;
      isAutomated?: boolean;
      isActive?: boolean;
      apiUrl?: string;
      apiToken?: string;
      apiUsername?: string;
      shareTemplate?: string;
    },
  ) {
    const normalizeNullableText = (value?: string) =>
      value && value.trim() ? value.trim() : null;

    const existing = await prisma.recruitmentChannel.findFirst({
      where: {
        company_id: companyId,
        name: data.name,
      },
    });

    if (existing) {
      throw new AppError(
        'Recruitment channel name must be unique within the company',
        409,
      );
    }

    return await prisma.recruitmentChannel.create({
      data: {
        company_id: companyId,
        name: data.name,
        description: data.description,
        is_automated: data.isAutomated,
        is_active: data.isActive ?? true,
        api_url: normalizeNullableText(data.apiUrl),
        api_token: normalizeNullableText(data.apiToken),
        api_username: normalizeNullableText(data.apiUsername),
        share_template: normalizeNullableText(data.shareTemplate),
      },
    });
  }

  static async updateRecruitmentChannel(
    companyId: number,
    id: string,
    data: {
      name?: string;
      description?: string;
      isAutomated?: boolean;
      isActive?: boolean;
      apiUrl?: string;
      apiToken?: string;
      apiUsername?: string;
      shareTemplate?: string;
    },
  ) {
    const normalizeNullableText = (value?: string) =>
      value && value.trim() ? value.trim() : null;

    const channel = await prisma.recruitmentChannel.findFirst({
      where: { id, company_id: companyId },
    });

    if (!channel) {
      throw new AppError('Recruitment channel not found', 404);
    }

    if (data.name && data.name !== channel.name) {
      const existing = await prisma.recruitmentChannel.findFirst({
        where: {
          company_id: companyId,
          name: data.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new AppError(
          'Recruitment channel name must be unique within the company',
          409,
        );
      }
    }

    return await prisma.recruitmentChannel.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.isAutomated !== undefined && {
          is_automated: data.isAutomated,
        }),
        ...(data.isActive !== undefined && {
          is_active: data.isActive,
        }),
        ...(data.apiUrl !== undefined && {
          api_url: normalizeNullableText(data.apiUrl),
        }),
        ...(data.apiToken !== undefined && {
          api_token: normalizeNullableText(data.apiToken),
        }),
        ...(data.apiUsername !== undefined && {
          api_username: normalizeNullableText(data.apiUsername),
        }),
        ...(data.shareTemplate !== undefined && {
          share_template: normalizeNullableText(data.shareTemplate),
        }),
      },
    });
  }

  static async deleteRecruitmentChannel(companyId: number, id: string) {
    const channel = await prisma.recruitmentChannel.findFirst({
      where: { id, company_id: companyId },
    });

    if (!channel) {
      throw new AppError('Recruitment channel not found', 404);
    }

    // Block deletion while any active posting still uses the channel so we do
    // not orphan a live distribution target.
    const postingCount = await prisma.vacancyJobPosting.count({
      where: {
        recruitment_channel_id: id,
        posting_status: {
          in: ['PENDING', 'PUBLISHED', 'SUSPENDED'],
        },
      },
    });

    if (postingCount > 0) {
      throw new AppError(
        'Cannot delete channel that is referenced by job postings',
        409,
      );
    }

    await prisma.recruitmentChannel.delete({
      where: { id },
    });

    return { success: true };
  }

  // ─── Recruitment Sources ─────────────────────────────────────────────────────

  static async getRecruitmentSources(companyId: number) {
    return await prisma.recruitmentSource.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' },
    });
  }

  static async createRecruitmentSource(
    companyId: number,
    data: {
      name: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await prisma.recruitmentSource.findFirst({
      where: {
        company_id: companyId,
        name: data.name,
      },
    });

    if (existing) {
      throw new AppError(
        'Recruitment source name must be unique within the company',
        409,
      );
    }

    return await prisma.recruitmentSource.create({
      data: {
        company_id: companyId,
        name: data.name,
        description: data.description,
        is_active: data.isActive ?? true,
      },
    });
  }

  static async updateRecruitmentSource(
    companyId: number,
    id: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    const source = await prisma.recruitmentSource.findFirst({
      where: { id, company_id: companyId },
    });

    if (!source) {
      throw new AppError('Recruitment source not found', 404);
    }

    if (data.name && data.name !== source.name) {
      const existing = await prisma.recruitmentSource.findFirst({
        where: {
          company_id: companyId,
          name: data.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new AppError(
          'Recruitment source name must be unique within the company',
          409,
        );
      }
    }

    return await prisma.recruitmentSource.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.isActive !== undefined && { is_active: data.isActive }),
      },
    });
  }

  static async deleteRecruitmentSource(companyId: number, id: string) {
    const source = await prisma.recruitmentSource.findFirst({
      where: { id, company_id: companyId },
    });

    if (!source) {
      throw new AppError('Recruitment source not found', 404);
    }

    // Hard delete only after we confirm nothing currently references the
    // source; historical references should keep the source row intact.
    const applicationCount = await prisma.application.count({
      where: { recruitment_source_id: id },
    });

    if (applicationCount > 0) {
      throw new AppError(
        'Cannot delete source while applications still reference it',
        409,
      );
    }

    await prisma.recruitmentSource.delete({
      where: { id },
    });

    return { success: true };
  }

  // ─── Interview Categories ─────────────────────────────────────────────────────

  static async getInterviewCategories(companyId: number) {
    return await prisma.interviewCategory.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' },
    });
  }

  static async createInterviewCategory(
    companyId: number,
    data: {
      name: string;
      description?: string;
      isDefault?: boolean;
    },
  ) {
    const existing = await prisma.interviewCategory.findFirst({
      where: {
        company_id: companyId,
        name: data.name,
      },
    });

    if (existing) {
      throw new AppError(
        'Interview category name must be unique within the company',
        409,
      );
    }

    return await prisma.interviewCategory.create({
      data: {
        company_id: companyId,
        name: data.name,
        description: data.description,
        is_default: data.isDefault,
      },
    });
  }

  static async updateInterviewCategory(
    companyId: number,
    id: string,
    data: {
      name?: string;
      description?: string;
      isDefault?: boolean;
    },
  ) {
    const category = await prisma.interviewCategory.findFirst({
      where: { id, company_id: companyId },
    });

    if (!category) {
      throw new AppError('Interview category not found', 404);
    }

    if (data.name && data.name !== category.name) {
      const existing = await prisma.interviewCategory.findFirst({
        where: {
          company_id: companyId,
          name: data.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new AppError(
          'Interview category name must be unique within the company',
          409,
        );
      }
    }

    return await prisma.interviewCategory.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.isDefault !== undefined && { is_default: data.isDefault }),
      },
    });
  }

  static async deleteInterviewCategory(companyId: number, id: string) {
    const category = await prisma.interviewCategory.findFirst({
      where: { id, company_id: companyId },
    });

    if (!category) {
      throw new AppError('Interview category not found', 404);
    }

    // Prompt 13: block deletion only when an active evaluation template still
    // depends on this category. Older interview rows do not need to prevent
    // cleanup of configuration data.
    const activeTemplateCount = await prisma.interviewEvaluationTemplate.count({
      where: {
        interview_category_id: id,
        is_active: true,
      },
    });

    if (activeTemplateCount > 0) {
      throw new AppError(
        'Cannot delete category while an active interview evaluation template still references it.',
        409,
      );
    }

    await prisma.interviewCategory.delete({
      where: { id },
    });

    return { success: true };
  }

  // ─── Approval Workflows ─────────────────────────────────────────────────────

  static async getApprovalWorkflows(companyId: number) {
    return await prisma.approvalWorkflow.findMany({
      where: { company_id: companyId },
      include: {
        stages: {
          orderBy: { stage_order: 'asc' },
        },
      },
      orderBy: [{ entity_type: 'asc' }, { name: 'asc' }],
    });
  }

  static async createApprovalWorkflow(
    companyId: number,
    data: {
      name: string;
      entityType: string;
      stages: {
        stageOrder: number;
        stageName: string;
        approverRoleId?: string;
        isMandatory?: boolean;
      }[];
    },
  ) {
    // Check if an active workflow already exists for this entity type
    const existing = await prisma.approvalWorkflow.findFirst({
      where: {
        company_id: companyId,
        entity_type: data.entityType,
        is_active: true,
      },
    });

    if (existing) {
      throw new AppError(
        `An active workflow already exists for ${data.entityType}. Deactivate it first.`,
        409,
      );
    }

    return await prisma.$transaction(async (tx) => {
      const workflow = await tx.approvalWorkflow.create({
        data: {
          company_id: companyId,
          name: data.name,
          entity_type: data.entityType,
          is_active: true,
        },
      });

      await tx.approvalWorkflowStage.createMany({
        data: data.stages.map((s) => ({
          workflow_id: workflow.id,
          stage_order: s.stageOrder,
          stage_name: s.stageName,
          approver_role_id: s.approverRoleId,
          is_mandatory: s.isMandatory ?? true,
        })),
      });

      return workflow;
    });
  }

  static async updateApprovalWorkflow(
    companyId: number,
    id: string,
    data: {
      name?: string;
      isActive?: boolean;
    },
  ) {
    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { id, company_id: companyId },
    });

    if (!workflow) {
      throw new AppError('Approval workflow not found', 404);
    }

    /**
     * Only one workflow per entity_type may be active at a time (Prompt 3).
     * We *reject* activation if another active workflow exists for the same entity.
     * This keeps the config UI deterministic: admins must explicitly deactivate the
     * old workflow before activating a different one.
     */
    if (data.isActive === true) {
      const otherActive = await prisma.approvalWorkflow.findFirst({
        where: {
          company_id: companyId,
          entity_type: workflow.entity_type,
          is_active: true,
          id: { not: id },
        },
        select: { id: true },
      });
      if (otherActive) {
        throw new AppError(
          `Only one workflow for ${workflow.entity_type} can be active at a time.`,
          409,
        );
      }
    }

    return await prisma.approvalWorkflow.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.isActive !== undefined && { is_active: data.isActive }),
      },
      include: {
        stages: {
          orderBy: { stage_order: 'asc' },
        },
      },
    });
  }

  static async updateApprovalWorkflowStages(
    companyId: number,
    id: string,
    data: {
      stages: {
        stageOrder: number;
        stageName: string;
        approverRoleId?: string;
        isMandatory?: boolean;
      }[];
    },
  ) {
    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { id, company_id: companyId },
    });

    if (!workflow) {
      throw new AppError('Approval workflow not found', 404);
    }

    return await prisma.$transaction(async (tx) => {
      /**
       * Replace-all stage strategy (Prompt 3):
       * Stages are ordered (stage_order) and act as a single list.
       * For correctness, we delete all existing stages and re-insert the full
       * ordered set atomically, instead of attempting to patch individual rows.
       */
      // Delete existing stages
      await tx.approvalWorkflowStage.deleteMany({
        where: { workflow_id: id },
      });

      // Insert new stages
      await tx.approvalWorkflowStage.createMany({
        data: data.stages.map((s) => ({
          workflow_id: id,
          stage_order: s.stageOrder,
          stage_name: s.stageName,
          approver_role_id: s.approverRoleId,
          is_mandatory: s.isMandatory ?? true,
        })),
      });

      // Return updated workflow with stages
      return await tx.approvalWorkflow.findUnique({
        where: { id },
        include: {
          stages: {
            orderBy: { stage_order: 'asc' },
          },
        },
      });
    });
  }

  static async getApprovalWorkflowStages(
    companyId: number,
    workflowId: string,
  ) {
    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, company_id: companyId },
      select: { id: true },
    });

    if (!workflow) {
      throw new AppError('Approval workflow not found', 404);
    }

    return await prisma.approvalWorkflowStage.findMany({
      where: { workflow_id: workflowId },
      orderBy: { stage_order: 'asc' },
    });
  }

  static async deleteApprovalWorkflow(companyId: number, workflowId: string) {
    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, company_id: companyId },
    });

    if (!workflow) {
      throw new AppError('Approval workflow not found', 404);
    }

    // The current schema does not store a workflow_id on the active entity
    // rows, so we can only delete the configuration record itself. We do not
    // block deletion with a company-wide proxy because that would make every
    // workflow effectively undeletable in a live system.
    await prisma.approvalWorkflow.delete({
      where: { id: workflowId },
    });

    return { success: true };
  }

  // ─── Job Templates ─────────────────────────────────────────────────────

  private static mapJobTemplate(template: any) {
    return {
      ...template,
      // Keep the canonical relation name the frontend already consumes while
      // also preserving the legacy alias for any older callers.
      job_descriptions: template.job_descriptions,
      descriptions: template.job_descriptions,
    };
  }

  static async getJobTemplates(companyId: number) {
    const templates = await prisma.jobTemplate.findMany({
      where: {
        company_id: companyId,
        is_active: true,
      },
      include: {
        job_descriptions: {
          orderBy: { version: 'desc' },
        },
      },
      orderBy: { title: 'asc' },
    });

    return templates.map((template) => this.mapJobTemplate(template));
  }

  static async createJobTemplate(
    companyId: number,
    data: {
      title: string;
      employmentType: string;
      jobGrade?: string;
      summary?: string;
      responsibilities: string;
      requirements: string;
      isActive?: boolean;
    },
  ) {
    const template = await prisma.jobTemplate.create({
      data: {
        company_id: companyId,
        title: data.title,
        employment_type: data.employmentType as any,
        job_grade: data.jobGrade,
        summary: data.summary,
        responsibilities: data.responsibilities,
        requirements: data.requirements,
        is_active: data.isActive ?? true,
      },
      include: {
        job_descriptions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    return this.mapJobTemplate(template);
  }

  static async updateJobTemplate(
    companyId: number,
    id: string,
    data: {
      title?: string;
      employmentType?: string;
      jobGrade?: string;
      summary?: string;
      responsibilities?: string;
      requirements?: string;
      isActive?: boolean;
    },
  ) {
    const template = await prisma.jobTemplate.findFirst({
      where: { id, company_id: companyId },
    });

    if (!template) {
      throw new AppError('Job template not found', 404);
    }

    const updated = await prisma.jobTemplate.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.employmentType && {
          employment_type: data.employmentType as any,
        }),
        ...(data.jobGrade !== undefined && { job_grade: data.jobGrade }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.responsibilities && {
          responsibilities: data.responsibilities,
        }),
        ...(data.requirements && { requirements: data.requirements }),
        ...(data.isActive !== undefined && { is_active: data.isActive }),
      },
      include: {
        job_descriptions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    return this.mapJobTemplate(updated);
  }

  static async deleteJobTemplate(companyId: number, id: string) {
    const template = await prisma.jobTemplate.findFirst({
      where: { id, company_id: companyId },
    });

    if (!template) {
      throw new AppError('Job template not found', 404);
    }

    const updated = await prisma.jobTemplate.update({
      where: { id },
      data: {
        is_active: false,
      },
      include: {
        job_descriptions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    // Soft delete keeps historic vacancy descriptions intact while removing the
    // template from the active configuration list.
    return this.mapJobTemplate(updated);
  }

  static async createJobDescription(
    companyId: number,
    jobTemplateId: string,
    data: {
      title: string;
      summary?: string;
      responsibilities: string;
      requirements: string;
      qualifications?: string;
      employmentType?: string;
      jobGrade?: string;
    },
  ) {
    const template = await prisma.jobTemplate.findFirst({
      where: { id: jobTemplateId, company_id: companyId },
      select: { id: true },
    });

    if (!template) {
      throw new AppError('Job template not found', 404);
    }

    // Version numbers are monotonic per template so the history panel can show
    // the most recent description first without losing earlier revisions.
    const latest = await prisma.jobDescription.findFirst({
      where: { job_template_id: jobTemplateId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    return await prisma.jobDescription.create({
      data: {
        company_id: companyId,
        job_template_id: jobTemplateId,
        title: data.title,
        summary: data.summary,
        responsibilities: data.responsibilities,
        requirements: data.requirements,
        qualifications: data.qualifications,
        employment_type: data.employmentType as any,
        job_grade: data.jobGrade,
        version: nextVersion,
        is_active: true,
      },
    });
  }

  static async getJobDescriptions(companyId: number, templateId: string) {
    const template = await prisma.jobTemplate.findFirst({
      where: { id: templateId, company_id: companyId },
      select: { id: true },
    });

    if (!template) {
      throw new AppError('Job template not found', 404);
    }

    return await prisma.jobDescription.findMany({
      where: { job_template_id: templateId, company_id: companyId },
      orderBy: [{ version: 'desc' }, { created_at: 'desc' }],
    });
  }

  // ─── Custom Fields ─────────────────────────────────────────────────────

  static async getCustomFields(companyId: number) {
    return await prisma.customField.findMany({
      where: { company_id: companyId },
      orderBy: [{ entity_type: 'asc' }, { field_name: 'asc' }],
    });
  }

  static async createCustomField(
    companyId: number,
    data: {
      entityType: string;
      fieldName: string;
      fieldType: string;
      isRequired?: boolean;
      options?: string;
    },
  ) {
    // Check if field name is unique within company and entity type
    const existing = await prisma.customField.findFirst({
      where: {
        company_id: companyId,
        entity_type: data.entityType,
        field_name: data.fieldName,
      },
    });

    if (existing) {
      throw new AppError(
        'Field name must be unique within the company and entity type',
        409,
      );
    }

    return await prisma.customField.create({
      data: {
        company_id: companyId,
        entity_type: data.entityType,
        field_name: data.fieldName,
        field_type: data.fieldType,
        is_required: data.isRequired ?? false,
        options: data.options?.trim() || null,
      },
    });
  }

  static async updateCustomField(
    companyId: number,
    id: string,
    data: {
      fieldName?: string;
      fieldType?: string;
      isRequired?: boolean;
      options?: string;
    },
  ) {
    const field = await prisma.customField.findFirst({
      where: { id, company_id: companyId },
    });

    if (!field) {
      throw new AppError('Custom field not found', 404);
    }

    // If changing field name, check uniqueness
    if (data.fieldName && data.fieldName !== field.field_name) {
      const existing = await prisma.customField.findFirst({
        where: {
          company_id: companyId,
          entity_type: field.entity_type,
          field_name: data.fieldName,
          id: { not: id },
        },
      });

      if (existing) {
        throw new AppError(
          'Field name must be unique within the company and entity type',
          409,
        );
      }
    }

    return await prisma.customField.update({
      where: { id },
      data: {
        ...(data.fieldName && { field_name: data.fieldName }),
        ...(data.fieldType && { field_type: data.fieldType }),
        ...(data.isRequired !== undefined && { is_required: data.isRequired }),
        ...(data.options !== undefined && {
          options: data.options?.trim() || null,
        }),
      },
    });
  }

  static async deleteCustomField(companyId: number, id: string) {
    const field = await prisma.customField.findFirst({
      where: { id, company_id: companyId },
    });

    if (!field) {
      throw new AppError('Custom field not found', 404);
    }

    await prisma.customField.delete({
      where: { id },
    });

    return { success: true };
  }

  // ─── Company Profile ─────────────────────────────────────────────────────

  static async getCompanyProfile(companyId: number) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    return company;
  }

  static async updateCompanyProfile(
    companyId: number,
    data: {
      name?: string;
      email?: string;
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      stampUrl?: string;
      industry?: string;
      phone?: string;
      address?: string;
      website?: string;
    },
  ) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    return await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.logoUrl !== undefined && { logo_url: data.logoUrl }),
        ...(data.primaryColor !== undefined && {
          primary_color: data.primaryColor,
        }),
        ...(data.secondaryColor !== undefined && {
          secondary_color: data.secondaryColor,
        }),
        ...(data.stampUrl !== undefined && { stamp_url: data.stampUrl }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.website !== undefined && { website: data.website }),
      },
    });
  }

  // ─── Notification Variables ─────────────────────────────────────────────────

  static async getNotificationVariables() {
    const variables = await prisma.notificationVariable.findMany({
      orderBy: [{ notification_type: 'asc' }, { variable_key: 'asc' }],
    });

    const groupedByType = variables.reduce<Record<string, typeof variables>>(
      (acc, variable) => {
        if (!acc[variable.notification_type]) {
          acc[variable.notification_type] = [];
        }
        acc[variable.notification_type].push(variable);
        return acc;
      },
      {},
    );

    return {
      variables,
      groupedByType,
    };
  }

  static async getNotificationVariablesByType(notificationType: string) {
    const parsedType = this.parseNotificationType(notificationType);
    return await prisma.notificationVariable.findMany({
      where: { notification_type: parsedType },
      orderBy: { variable_key: 'asc' },
    });
  }
}

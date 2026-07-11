import { Router, RequestHandler, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/database';

const router = Router();

router.use(authenticate as RequestHandler);

/**
 * GET /api/v1/users
 * Returns active company users with their role slugs.
 * Query params:
 *   ?role=hiring_manager  — filter by role slug
 *   ?search=maya          — search by name / email / employee_id
 */
router.get('/', (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const company_id = req.user?.company_id;
    if (!company_id) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const roleFilter   = req.query.role   ? String(req.query.role).trim()   : undefined;
    const searchQuery  = req.query.search ? String(req.query.search).trim() : undefined;

    const users = await prisma.user.findMany({
      where: {
        company_id: Number(company_id),
        is_active: true,
        ...(roleFilter
          ? {
              app_user_roles: {
                some: { role: { slug: roleFilter } },
              },
            }
          : {}),
        ...(searchQuery
          ? {
              OR: [
                { first_name: { contains: searchQuery, mode: 'insensitive' as const } },
                { last_name:  { contains: searchQuery, mode: 'insensitive' as const } },
                { email:      { contains: searchQuery, mode: 'insensitive' as const } },
                // employee_id may be null — only include if truthy search
                { employee_id: { contains: searchQuery, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        employee_id: true,
        app_user_roles: {
          select: {
            role: { select: { slug: true, name: true } },
          },
        },
      },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    });

    const mapped = users.map((u) => ({
      id:         u.id,
      firstName:  u.first_name,
      lastName:   u.last_name,
      fullName:   `${u.first_name} ${u.last_name}`,
      email:      u.email,
      employeeId: u.employee_id,
      roles:      u.app_user_roles.map((r) => r.role.slug),
      roleSlug:   u.app_user_roles[0]?.role.slug ?? null,
    }));

    res.status(200).json({ status: 'success', data: mapped });
  } catch (err) {
    next(err);
  }
}) as RequestHandler);

export default router;

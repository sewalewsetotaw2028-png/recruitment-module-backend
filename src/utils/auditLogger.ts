import prisma from '../config/database';

export const logAudit = async (
  company_id: string,
  user_id: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  entity_type: string,
  entity_id: string,
  oldValues?: any,
  newValues?: any,
) => {
  await prisma.$executeRaw`
    INSERT INTO "AuditLog" (id, "company_id", "user_id", action, "entity_type", "entity_id", "oldValues", "newValues", "created_at")
    VALUES (gen_random_uuid(), ${company_id}, ${user_id}, ${action}, ${entity_type}, ${entity_id}, ${oldValues}, ${newValues}, NOW())
  `;
};

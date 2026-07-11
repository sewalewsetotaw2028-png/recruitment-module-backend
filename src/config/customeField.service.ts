import prisma from './database';

export class CustomFieldService {
  // Create a definition (e.g., "T-shirt Size" for onboarding)
  static async createFieldDefinition(company_id: string, data: any) {
    return await prisma.customField.create({
      data: { ...data, company_id: company_id },
    });
  }

  // Save the actual value for a specific candidate/vacancy
  static async saveFieldValue(
    fieldId: string,
    entity_id: string,
    value: string,
  ) {
    const existing = await prisma.customFieldValue.findFirst({
      where: { custom_field_id: fieldId, entity_id: entity_id },
    });
    if (existing) {
      return await prisma.customFieldValue.update({
        where: { id: existing.id },
        data: { value },
      });
    }
    return await prisma.customFieldValue.create({
      data: { custom_field_id: fieldId, entity_id: entity_id, value },
    });
  }
}

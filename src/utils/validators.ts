import { z } from "zod";

export const createVacancySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),

  description: z.string().min(10, "Description is too short"),

  department: z.string().min(2, "department is required"),

  location: z.string().min(2, "Location is required"),

  openings: z.number().min(1, "Openings must be at least 1")
});

export const updateVacancyStatusSchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "CANCELLED"])
});

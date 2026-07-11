import { ApplicationStatus } from "@prisma/client";

export interface RegisterCandidateDto {
  firstName: string;
  lastName: string;

  email: string;
  phone: string;

  address?: string;

  linkedinUrl?: string;
  portfolioUrl?: string;
}

export interface ApplyForJobDto {
  candidateId: string;
  jobPostingId: string;

  coverLetter?: string;
}

export interface UpdateApplicationStatusDto {
  status: ApplicationStatus;
}

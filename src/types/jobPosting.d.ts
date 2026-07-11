import {
  employment_type,
  WorkplaceType,
  Jobposting_status,
  PostingChannelType
} from "@prisma/client";

export interface CreateJobPostingDto {
  vacancyId: string;

  title: string;
  roleSummary: string;

  responsibilities: string[];
  qualifications: string[];
  benefits?: string[];

  employment_type: employment_type;
  workplaceType: WorkplaceType;

  department: string;
  location?: string;

  isInternal?: boolean;
  isExternal?: boolean;

  channels?: PostingChannelType[];

  createdBy: string;
}

export interface UpdateJobposting_statusDto {
  status: Jobposting_status;
  comment?: string;
}

export interface WithdrawJobPostingDto {
  reason: string;
}

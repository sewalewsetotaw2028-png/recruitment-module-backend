export interface PipelineStageDTO {
  stage: string;
  count: number;
}

export interface DashboardSummaryDTO {
  totalVacancies: number;
  openVacancies: number;
  totalApplications: number;
  hiredCount: number;
  fulfillmentRate: string;
}

export interface DashboardStatsDTO {
  summary: DashboardSummaryDTO;
  pipeline: PipelineStageDTO[];
  kpis?: {
    averageTimeToFillDays?: number;
    averageTimeToHireDays?: number;
    offerAcceptanceRate?: string;
    candidateConversionRate?: string;
    interviewToSelectionRatio?: number;
    talentRosterUtilizationRate?: string;
    totals?: {
      totalOffers?: number;
      acceptedOffersCount?: number;
      totalInterviews?: number;
    };
  };
}

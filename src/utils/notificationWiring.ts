import { NotificationType } from '@prisma/client';
import { dispatchNotification } from './notificationHelper';
import prisma from '../config/database';

/**
 * Helper functions for wiring notifications into service methods.
 * Each function encapsulates the lookup logic and dispatch call for a specific trigger.
 */

// ─── Workforce Planning ─────────────────────────────────────────────────────

/** Notify HR users with workforce_plan:approve permission that a plan was submitted */
export async function notifyWorkforcePlanSubmitted(
  companyId: number,
  planId: string,
  planTitle: string,
  submittedBy: string,
  submittedByName: string,
  department: string,
) {
  // Find users with workforce_plan:approve permission
  const approvers = await prisma.appRolePermission.findMany({
    where: {
      permission: { slug: 'workforce_plan:approve' },
      role: { company_id: companyId },
    },
    include: {
      role: {
        include: {
          app_user_roles: {
            include: { user: { select: { id: true } } },
          },
        },
      },
    },
  });

  const userIds = new Set<string>();
  for (const rp of approvers) {
    for (const ur of rp.role.app_user_roles) {
      userIds.add(ur.user.id);
    }
  }

  const results = [];
  for (const userId of userIds) {
    const result = await dispatchNotification({
      companyId,
      type: 'WORKFORCE_PLAN_SUBMITTED' as NotificationType,
      recipientUserId: userId,
      variables: {
        plan_title: planTitle,
        submitted_by: submittedByName,
        department,
      },
      channels: ['in_app', 'email'],
      relatedEntityType: 'workforce_plan',
      relatedEntityId: planId,
    });
    results.push(result);
  }
  return results;
}

/** Notify CEO users that a plan was forwarded for review */
export async function notifyWorkforcePlanForwarded(
  companyId: number,
  planId: string,
  planTitle: string,
  forwardedByName: string,
) {
  const ceoRoles = await prisma.appRole.findMany({
    where: { company_id: companyId, slug: 'ceo' },
    include: {
      app_user_roles: {
        include: { user: { select: { id: true, email: true } } },
      },
    },
  });

  const results = [];
  for (const role of ceoRoles) {
    for (const ur of role.app_user_roles) {
      const result = await dispatchNotification({
        companyId,
        type: 'WORKFORCE_PLAN_SUBMITTED' as NotificationType,
        recipientUserId: ur.user.id,
        variables: {
          plan_title: planTitle,
          forwarded_by: forwardedByName,
          department: '',
        },
        channels: ['in_app', 'email'],
        relatedEntityType: 'workforce_plan',
        relatedEntityId: planId,
      });
      results.push(result);
    }
  }
  return results;
}

/** Notify plan creator that the plan was approved */
export async function notifyWorkforcePlanApproved(
  companyId: number,
  planId: string,
  planTitle: string,
  creatorUserId: string,
  approverName: string,
) {
  return dispatchNotification({
    companyId,
    type: 'WORKFORCE_PLAN_APPROVED' as NotificationType,
    recipientUserId: creatorUserId,
    variables: {
      plan_title: planTitle,
      approved_by: approverName,
      approval_date: new Date().toLocaleDateString(),
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'workforce_plan',
    relatedEntityId: planId,
  });
}

/** Notify plan creator that the plan was rejected */
export async function notifyWorkforcePlanRejected(
  companyId: number,
  planId: string,
  planTitle: string,
  creatorUserId: string,
  rejectedByName: string,
  reason: string,
) {
  return dispatchNotification({
    companyId,
    type: 'WORKFORCE_PLAN_REJECTED' as NotificationType,
    recipientUserId: creatorUserId,
    variables: {
      plan_title: planTitle,
      rejected_by: rejectedByName,
      rejection_reason: reason,
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'workforce_plan',
    relatedEntityId: planId,
  });
}

/** Notify plan creator that the plan was returned for revision */
export async function notifyWorkforcePlanReturned(
  companyId: number,
  planId: string,
  planTitle: string,
  creatorUserId: string,
  returnedByName: string,
  revisionComments: string,
) {
  return dispatchNotification({
    companyId,
    type: 'WORKFORCE_PLAN_REJECTED' as NotificationType,
    recipientUserId: creatorUserId,
    variables: {
      plan_title: planTitle,
      returned_by: returnedByName,
      revision_comments: revisionComments,
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'workforce_plan',
    relatedEntityId: planId,
  });
}

// ─── Recruitment Request ────────────────────────────────────────────────────

/** Notify HR approvers that a recruitment request was submitted */
export async function notifyRecruitmentRequestSubmitted(
  companyId: number,
  requestId: string,
  requestNumber: string,
  jobTitle: string,
  department: string,
  submittedByName: string,
) {
  const approvers = await prisma.appRolePermission.findMany({
    where: {
      permission: { slug: 'recruitment_request:approve' },
      role: { company_id: companyId },
    },
    include: {
      role: {
        include: {
          app_user_roles: {
            include: { user: { select: { id: true } } },
          },
        },
      },
    },
  });

  const userIds = new Set<string>();
  for (const rp of approvers) {
    for (const ur of rp.role.app_user_roles) {
      userIds.add(ur.user.id);
    }
  }

  const results = [];
  for (const userId of userIds) {
    const result = await dispatchNotification({
      companyId,
      type: 'RECRUITMENT_REQUEST_SUBMITTED' as NotificationType,
      recipientUserId: userId,
      variables: {
        request_number: requestNumber || requestId,
        job_title: jobTitle,
        department,
        submitted_by: submittedByName,
      },
      channels: ['in_app', 'email'],
      relatedEntityType: 'recruitment_request',
      relatedEntityId: requestId,
    });
    results.push(result);
  }
  return results;
}

/** Notify request creator that the request was approved */
export async function notifyRecruitmentRequestApproved(
  companyId: number,
  requestId: string,
  requestNumber: string,
  jobTitle: string,
  creatorUserId: string,
  approverName: string,
) {
  return dispatchNotification({
    companyId,
    type: 'RECRUITMENT_REQUEST_APPROVED' as NotificationType,
    recipientUserId: creatorUserId,
    variables: {
      request_number: requestNumber || requestId,
      job_title: jobTitle,
      approved_by: approverName,
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'recruitment_request',
    relatedEntityId: requestId,
  });
}

/** Notify request creator that the request was rejected */
export async function notifyRecruitmentRequestRejected(
  companyId: number,
  requestId: string,
  requestNumber: string,
  jobTitle: string,
  creatorUserId: string,
  rejectedByName: string,
  reason: string,
) {
  return dispatchNotification({
    companyId,
    type: 'RECRUITMENT_REQUEST_REJECTED' as NotificationType,
    recipientUserId: creatorUserId,
    variables: {
      request_number: requestNumber || requestId,
      job_title: jobTitle,
      rejected_by: rejectedByName,
      rejection_reason: reason,
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'recruitment_request',
    relatedEntityId: requestId,
  });
}

// ─── Vacancy ────────────────────────────────────────────────────────────────

/** Notify hiring manager that a vacancy was created */
export async function notifyVacancyCreated(
  companyId: number,
  vacancyId: string,
  vacancyTitle: string,
  vacancyNumber: string | null | undefined,
  department: string,
  hiringManagerUserId: string,
) {
  return dispatchNotification({
    companyId,
    type: 'VACANCY_CREATED' as NotificationType,
    recipientUserId: hiringManagerUserId,
    variables: {
      vacancy_title: vacancyTitle,
      vacancy_number: vacancyNumber || '',
      department,
    },
    channels: ['in_app'],
    relatedEntityType: 'vacancy',
    relatedEntityId: vacancyId,
  });
}

/** Notify hiring manager that a vacancy was published */
export async function notifyVacancyPublished(
  companyId: number,
  vacancyId: string,
  vacancyTitle: string,
  vacancyNumber: string | null | undefined,
  hiringManagerUserId: string,
) {
  return dispatchNotification({
    companyId,
    type: 'JOB_POSTED' as NotificationType,
    recipientUserId: hiringManagerUserId,
    variables: {
      vacancy_title: vacancyTitle,
      vacancy_number: vacancyNumber || '',
    },
    channels: ['in_app'],
    relatedEntityType: 'vacancy',
    relatedEntityId: vacancyId,
  });
}

// ─── Application / Candidate ────────────────────────────────────────────────

/** Notify candidate that their application was received */
export async function notifyApplicationReceived(
  companyId: number,
  candidateId: string,
  candidateName: string,
  vacancyTitle: string,
  companyName: string,
  applicationId: string,
) {
  return dispatchNotification({
    companyId,
    type: 'APPLICATION_RECEIVED' as NotificationType,
    recipientCandidateId: candidateId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
      company_name: companyName,
      application_date: new Date().toLocaleDateString(),
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'application',
    relatedEntityId: applicationId,
  });
}

/** Notify HR/recruiter users that a new application was submitted */
export async function notifyNewApplicationToHR(
  companyId: number,
  candidateName: string,
  vacancyTitle: string,
  applicationId: string,
) {
  // Find users with application:screen permission for the same company
  const screeners = await prisma.appRolePermission.findMany({
    where: {
      permission: { slug: 'application:screen' },
      role: { company_id: companyId },
    },
    include: {
      role: {
        include: {
          app_user_roles: {
            include: { user: { select: { id: true } } },
          },
        },
      },
    },
  });

  const userIds = new Set<string>();
  for (const rp of screeners) {
    for (const ur of rp.role.app_user_roles) {
      userIds.add(ur.user.id);
    }
  }

  const results = [];
  for (const userId of userIds) {
    const result = await dispatchNotification({
      companyId,
      type: 'GENERAL' as NotificationType,
      recipientUserId: userId,
      variables: {
        title: 'New Application Received',
        message: `${candidateName} applied for ${vacancyTitle}.`,
      },
      channels: ['in_app'],
      relatedEntityType: 'application',
      relatedEntityId: applicationId,
    });
    results.push(result);
  }
  return results;
}

/** Notify candidate they were shortlisted */
export async function notifyCandidateShortlisted(
  companyId: number,
  candidateId: string,
  candidateName: string,
  vacancyTitle: string,
  applicationId: string,
) {
  return dispatchNotification({
    companyId,
    type: 'APPLICATION_SHORTLISTED' as NotificationType,
    recipientCandidateId: candidateId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'application',
    relatedEntityId: applicationId,
  });
}

/** Notify candidate they were rejected */
export async function notifyCandidateRejected(
  companyId: number,
  candidateId: string,
  candidateName: string,
  vacancyTitle: string,
  applicationId: string,
) {
  return dispatchNotification({
    companyId,
    type: 'APPLICATION_REJECTED' as NotificationType,
    recipientCandidateId: candidateId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'application',
    relatedEntityId: applicationId,
  });
}

// ─── Interview ──────────────────────────────────────────────────────────────

/** Notify candidate that an interview was scheduled */
export async function notifyInterviewScheduledForCandidate(
  companyId: number,
  candidateId: string,
  candidateName: string,
  vacancyTitle: string,
  interviewDate: string,
  interviewTime: string,
  interviewMode: string,
  meetingLink: string | null | undefined,
  interviewId: string,
) {
  const variables: Record<string, string> = {
    candidate_name: candidateName,
    vacancy_title: vacancyTitle,
    interview_date: interviewDate,
    interview_time: interviewTime,
    interview_mode: interviewMode,
    meeting_link: meetingLink || '',
  };

  return dispatchNotification({
    companyId,
    type: 'INTERVIEW_SCHEDULED' as NotificationType,
    recipientCandidateId: candidateId,
    variables,
    channels: ['in_app', 'email'],
    relatedEntityType: 'interview',
    relatedEntityId: interviewId,
  });
}

/** Notify panel member that an interview was scheduled */
export async function notifyInterviewScheduledForPanelist(
  companyId: number,
  panelMemberId: string,
  candidateName: string,
  vacancyTitle: string,
  interviewDate: string,
  interviewTime: string,
  interviewMode: string,
  interviewId: string,
) {
  return dispatchNotification({
    companyId,
    type: 'INTERVIEW_SCHEDULED' as NotificationType,
    recipientUserId: panelMemberId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
      interview_date: interviewDate,
      interview_time: interviewTime,
      interview_mode: interviewMode,
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'interview',
    relatedEntityId: interviewId,
  });
}

/** Notify about interview reschedule */
export async function notifyInterviewRescheduled(
  companyId: number,
  recipientCandidateId: string | null,
  recipientUserId: string | null,
  candidateName: string,
  vacancyTitle: string,
  interviewDate: string,
  interviewTime: string,
  interviewMode: string,
  interviewId: string,
) {
  return dispatchNotification({
    companyId,
    type: 'INTERVIEW_RESCHEDULED' as NotificationType,
    recipientCandidateId,
    recipientUserId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
      interview_date: interviewDate,
      interview_time: interviewTime,
      interview_mode: interviewMode,
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'interview',
    relatedEntityId: interviewId,
  });
}

/** Notify about interview cancellation */
export async function notifyInterviewCancelled(
  companyId: number,
  recipientCandidateId: string | null,
  recipientUserId: string | null,
  candidateName: string,
  vacancyTitle: string,
  interviewId: string,
) {
  return dispatchNotification({
    companyId,
    type: 'INTERVIEW_CANCELLED' as NotificationType,
    recipientCandidateId,
    recipientUserId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
    },
    channels: ['in_app', 'email'],
    relatedEntityType: 'interview',
    relatedEntityId: interviewId,
  });
}

// ─── Selection / Hiring Minute ──────────────────────────────────────────────

/** Notify HR that evaluations are complete */
export async function notifyEvaluationsComplete(
  companyId: number,
  vacancyTitle: string,
  candidateCount: number,
) {
  const hrRoles = await prisma.appRole.findMany({
    where: {
      company_id: companyId,
      slug: { in: ['hr_admin', 'hr'] },
    },
    include: {
      app_user_roles: {
        include: { user: { select: { id: true } } },
      },
    },
  });

  const userIds = new Set<string>();
  for (const role of hrRoles) {
    for (const ur of role.app_user_roles) {
      userIds.add(ur.user.id);
    }
  }

  const results = [];
  for (const userId of userIds) {
    const result = await dispatchNotification({
      companyId,
      type: 'GENERAL' as NotificationType,
      recipientUserId: userId,
      variables: {
        title: 'Evaluations Complete',
        message: `All panel evaluations for ${vacancyTitle} (${candidateCount} candidates) are complete. Ready for selection decision.`,
      },
      channels: ['in_app'],
    });
    results.push(result);
  }
  return results;
}

/** Notify candidate they were selected */
export async function notifyCandidateSelected(
  companyId: number,
  candidateId: string,
  candidateName: string,
  vacancyTitle: string,
) {
  return dispatchNotification({
    companyId,
    type: 'CANDIDATE_SELECTED' as NotificationType,
    recipientCandidateId: candidateId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
    },
    channels: ['in_app', 'email'],
  });
}

/** Notify candidate they were rejected after evaluation */
export async function notifyCandidateRejectedAfterEvaluation(
  companyId: number,
  candidateId: string,
  candidateName: string,
  vacancyTitle: string,
) {
  return dispatchNotification({
    companyId,
    type: 'CANDIDATE_REJECTED' as NotificationType,
    recipientCandidateId: candidateId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
    },
    channels: ['in_app', 'email'],
  });
}

// ─── Offer ──────────────────────────────────────────────────────────────────

/** Notify candidate that an offer was issued */
export async function notifyOfferIssued(
  companyId: number,
  candidateId: string,
  candidateName: string,
  vacancyTitle: string,
  offerExpiryDate: string,
) {
  return dispatchNotification({
    companyId,
    type: 'OFFER_ISSUED' as NotificationType,
    recipientCandidateId: candidateId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
      offer_expiry_date: offerExpiryDate,
    },
    channels: ['in_app', 'email'],
  });
}

/** Notify HR that the candidate accepted the offer */
export async function notifyOfferAccepted(
  companyId: number,
  hrUserId: string,
  candidateName: string,
  vacancyTitle: string,
) {
  return dispatchNotification({
    companyId,
    type: 'OFFER_ACCEPTED' as NotificationType,
    recipientUserId: hrUserId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
    },
    channels: ['in_app', 'email'],
  });
}

/** Notify HR that the candidate declined the offer */
export async function notifyOfferDeclined(
  companyId: number,
  hrUserId: string,
  candidateName: string,
  vacancyTitle: string,
) {
  return dispatchNotification({
    companyId,
    type: 'OFFER_DECLINED' as NotificationType,
    recipientUserId: hrUserId,
    variables: {
      candidate_name: candidateName,
      vacancy_title: vacancyTitle,
    },
    channels: ['in_app', 'email'],
  });
}

// ─── Talent Roster ──────────────────────────────────────────────────────────

/** Notify candidate they were added to talent roster */
export async function notifyTalentRosterAdded(
  companyId: number,
  candidateId: string,
  candidateName: string,
) {
  return dispatchNotification({
    companyId,
    type: 'TALENT_ROSTER_ADDED' as NotificationType,
    recipientCandidateId: candidateId,
    variables: {
      candidate_name: candidateName,
    },
    channels: ['in_app', 'email'],
  });
}

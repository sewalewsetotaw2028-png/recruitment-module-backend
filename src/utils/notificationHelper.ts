import prisma from '../config/database';
import { logger } from './logger';
import { renderTemplate } from './templateRenderer';
import { EmailService } from '../services/email.service';
import { NotificationType } from '@prisma/client';

export interface DispatchNotificationParams {
  /** Company that owns the notification */
  companyId: number;
  /** The NotificationType enum value that determines the template to use */
  type: NotificationType;
  /** User ID for staff-facing notifications (leave null for candidate notifications) */
  recipientUserId?: string | null;
  /** Candidate ID for candidate-facing notifications (leave null for staff notifications) */
  recipientCandidateId?: string | null;
  /** Template variables to substitute into the notification template */
  variables: Record<string, string>;
  /** Which channels to dispatch through: 'in_app', 'email', or both */
  channels: ('in_app' | 'email')[];
  /** Optional related entity type (e.g. 'vacancy', 'offer', 'workforce_plan') */
  relatedEntityType?: string | null;
  /** Optional related entity ID for navigation links */
  relatedEntityId?: string | null;
}

export interface DispatchNotificationResult {
  /** Whether an in-app notification record was created */
  inAppCreated: boolean;
  /** Whether an email was sent (or logged in dev mode) */
  emailSent: boolean;
  /** The created notification record, if any */
  notification?: {
    id: string;
    type: string;
    title: string;
    message: string;
  } | null;
}

/**
 * Single dispatch point for all notifications across the system.
 *
 * 1. Looks up the NotificationTemplate for the given company + type.
 * 2. Renders the template subject and body using the provided variables.
 * 3. Creates a Notification DB record (in-app channel).
 * 4. Sends an email via EmailService (email channel).
 *
 * Every service calls ONLY this function — never creates Notification
 * records directly or calls sendEmail directly.
 */
export async function dispatchNotification(
  params: DispatchNotificationParams,
): Promise<DispatchNotificationResult> {
  const {
    companyId,
    type,
    recipientUserId,
    recipientCandidateId,
    variables,
    channels,
    relatedEntityType,
    relatedEntityId,
  } = params;

  const result: DispatchNotificationResult = {
    inAppCreated: false,
    emailSent: false,
  };

  try {
    // 1. Look up the notification template for this company + type
    const template = await prisma.notificationTemplate.findFirst({
      where: {
        company_id: companyId,
        type,
        is_active: true,
      },
    });

    if (!template) {
      logger.warn(
        'DISPATCH',
        `No active notification template found for company=${companyId} type=${type}. Skipping notification.`,
      );
      return result;
    }

    // 2. Render subject and body using the template renderer
    const renderedSubject = renderTemplate(template.subject, variables);
    const renderedBody = renderTemplate(template.body_html, variables);

    // 3. Create in-app notification record
    if (channels.includes('in_app')) {
      try {
        const notification = await prisma.notification.create({
          data: {
            company_id: companyId,
            user_id: recipientUserId || null,
            candidate_id: recipientCandidateId || null,
            type,
            title: renderedSubject,
            message: renderedBody,
            is_read: false,
            related_entity_type: relatedEntityType || null,
            related_entity_id: relatedEntityId || null,
          },
        });

        result.inAppCreated = true;
        result.notification = {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
        };

        logger.info(
          'DISPATCH',
          `In-app notification created: type=${type} user=${recipientUserId ?? '—'} candidate=${recipientCandidateId ?? '—'}`,
          { notification_id: notification.id },
        );
      } catch (dbError) {
        logger.error(
          'DISPATCH',
          `Failed to create in-app notification record for type=${type}`,
          dbError,
        );
      }
    }

    // 4. Send email if channel is enabled
    if (channels.includes('email')) {
      try {
        let recipientEmail: string | null = null;

        if (recipientUserId) {
          const user = await prisma.user.findUnique({
            where: { id: recipientUserId },
            select: { email: true },
          });
          recipientEmail = user?.email ?? null;
        } else if (recipientCandidateId) {
          const candidate = await prisma.candidate.findUnique({
            where: { id: recipientCandidateId },
            select: { email: true },
          });
          recipientEmail = candidate?.email ?? null;
        }

        if (recipientEmail) {
          await EmailService.sendEmail({
            to: recipientEmail,
            subject: renderedSubject,
            html: renderedBody,
            text: renderedBody.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
          });
          result.emailSent = true;

          logger.info(
            'DISPATCH',
            `Email sent: to=${recipientEmail} type=${type}`,
          );
        } else {
          logger.warn(
            'DISPATCH',
            `Cannot send email — no recipient found for type=${type} user=${recipientUserId ?? '—'} candidate=${recipientCandidateId ?? '—'}`,
          );
        }
      } catch (emailError) {
        logger.error(
          'DISPATCH',
          `Failed to send email notification for type=${type}`,
          emailError,
        );
      }
    }

    return result;
  } catch (error) {
    logger.error(
      'DISPATCH',
      `Unhandled error in dispatchNotification for type=${type}`,
      error,
    );
    return result;
  }
}

/**
 * Keep the old `sendNotification` as a thin wrapper for backward compatibility
 * during the transition. New code should use `dispatchNotification` directly.
 */
export const sendNotification = async (
  company_id: string | number,
  recipient_id: string,
  recipient_type: 'candidate' | 'user',
  type: string,
  message: string,
) => {
  logger.info(
    'NOTIFICATION',
    `[sendNotification] DEPRECATED — use dispatchNotification. type=${type}, recipient=${recipient_id}`,
  );

  try {
    await prisma.notification.create({
      data: {
        company_id: Number(company_id),
        user_id: recipient_type === 'user' ? recipient_id : null,
        candidate_id: recipient_type === 'candidate' ? recipient_id : null,
        type: type as NotificationType,
        title: type,
        message,
        is_read: false,
      },
    });
  } catch (error) {
    logger.error('NOTIFICATION', 'Failed to create legacy notification', error);
  }
};

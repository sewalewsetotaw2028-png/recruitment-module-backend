import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    logger.warn('EMAIL SERVICE', 'SMTP not fully configured. Emails will be logged only.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

export class EmailService {
  private static isEnabled(): boolean {
    return getTransporter() !== null;
  }

  /**
   * Send an email using the configured SMTP service
   * Falls back to logging if email is not configured
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    const t = getTransporter();

    if (!t) {
      logger.info(
        'EMAIL SERVICE',
        `[EMAIL SERVICE] Email not configured. Would send to: ${options.to}`,
        { subject: options.subject },
      );
      logger.info('EMAIL SERVICE', `[EMAIL SERVICE] Email content: ${options.html.substring(0, 200)}...`);
      return;
    }

    try {
      const fromName = process.env.SMTP_FROM_NAME || 'Recruitment System';
      const fromAddress = process.env.SMTP_FROM_ADDRESS || process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@recruitment.com';

      await t.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });

      logger.info(
        'EMAIL SERVICE',
        `[EMAIL SERVICE] Email sent successfully to: ${options.to}`,
        { subject: options.subject },
      );
    } catch (error) {
      logger.error('EMAIL SERVICE', '[EMAIL SERVICE] Failed to send email', error);
      // Don't throw — email failures should not break the main flow
    }
  }

  /**
   * Send offer letter email to candidate
   */
  static async sendOfferLetterEmail(params: {
    candidateEmail: string;
    candidateName: string;
    positionTitle: string;
    companyName: string;
    salary: number;
    startDate: string;
    expiryDate: string;
    employmentType?: string;
    allowances?: Record<string, number>;
    offerNotes?: string;
    templateName?: string;
  }): Promise<void> {
    const {
      candidateEmail,
      candidateName,
      positionTitle,
      companyName,
      salary,
      startDate,
      expiryDate,
      employmentType,
      allowances,
      offerNotes,
      templateName,
    } = params;

    const subject = `Job Offer: ${positionTitle} at ${companyName}`;

    const allowancesHtml =
      allowances && Object.keys(allowances).length > 0
        ? `
        <div style="margin-top: 20px;">
          <h3 style="color: #333; font-size: 16px; margin-bottom: 10px;">Allowances & Benefits</h3>
          <ul style="list-style: none; padding: 0;">
            ${Object.entries(allowances)
              .map(
                ([key, value]) => `
              <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                <strong>${key}:</strong> ETB ${Number(value).toLocaleString()}
              </li>
            `,
              )
              .join('')}
          </ul>
        </div>
      `
        : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Offer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .offer-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #555; }
          .detail-value { color: #333; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Congratulations, ${candidateName}!</h1>
            <p>We are pleased to offer you the position of ${positionTitle}</p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${candidateName}</strong>,</p>
            
            <p>We are delighted to offer you the position of <strong>${positionTitle}</strong> at <strong>${companyName}</strong>. After careful consideration of your qualifications and experience, we believe you will be a valuable addition to our team.</p>
            
            <div class="offer-details">
              <h2 style="color: #667eea; margin-top: 0;">Offer Details</h2>
              
              <div class="detail-row">
                <span class="detail-label">Position:</span>
                <span class="detail-value">${positionTitle}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Annual Salary:</span>
                <span class="detail-value">ETB ${salary.toLocaleString()}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Employment Type:</span>
                <span class="detail-value">${employmentType?.replace(/_/g, ' ') || 'Full Time'}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">${new Date(startDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Offer Valid Until:</span>
                <span class="detail-value">${new Date(expiryDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
              
              ${templateName ? `
              <div class="detail-row">
                <span class="detail-label">Offer Template:</span>
                <span class="detail-value">${templateName}</span>
              </div>
              ` : ''}
            </div>
            
            ${allowancesHtml}
            
            ${offerNotes ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <strong>Additional Notes:</strong>
              <p style="margin: 10px 0 0 0;">${offerNotes}</p>
            </div>
            ` : ''}
            
            <p>Please review this offer carefully and accept or decline it through the candidate portal by the expiry date. To view the full offer details and take action, please log in to your candidate portal.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/candidate-offers" class="cta-button">View & Respond to Offer</a>
            </div>
            
            <p>If you have any questions about this offer, please don't hesitate to contact our HR team.</p>
            
            <p>We look forward to welcoming you to ${companyName}!</p>
            
            <p>Best regards,<br>
            HR Team<br>
            ${companyName}</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply directly to this message.</p>
            <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: candidateEmail,
      subject,
      html,
      text: `Job Offer: ${positionTitle} at ${companyName}\n\nDear ${candidateName},\n\nWe are pleased to offer you the position of ${positionTitle} at ${companyName}.\n\nAnnual Salary: ETB ${salary.toLocaleString()}\nStart Date: ${new Date(startDate).toLocaleDateString()}\nOffer Valid Until: ${new Date(expiryDate).toLocaleDateString()}\n\nPlease log in to your candidate portal to view the full offer details and accept or decline this offer.\n\nBest regards,\nHR Team\n${companyName}`,
    });

    logger.info(
      'EMAIL SERVICE',
      `[EMAIL SERVICE] Offer letter email sent to ${candidateEmail} for position ${positionTitle}`,
    );
  }

  /**
   * Send offer status update email (accepted/declined)
   */
  static async sendOfferStatusEmail(params: {
    candidateEmail: string;
    candidateName: string;
    positionTitle: string;
    companyName: string;
    status: 'accepted' | 'declined';
    reason?: string;
  }): Promise<void> {
    const { candidateEmail, candidateName, positionTitle, companyName, status, reason } = params;

    const subject = `Offer ${status.toUpperCase()}: ${positionTitle} - ${candidateName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offer ${status.toUpperCase()}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${status === 'accepted' ? '#10b981' : '#ef4444'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Offer ${status.toUpperCase()}</h1>
          </div>
          
          <div class="content">
            <p><strong>${candidateName}</strong> has ${status} the offer for the position of <strong>${positionTitle}</strong>.</p>
            
            ${reason && status === 'declined' ? `
            <div style="background: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <strong>Reason for declining:</strong>
              <p style="margin: 10px 0 0 0;">${reason}</p>
            </div>
            ` : ''}
            
            <p>Please log in to the recruitment portal to view the updated offer status.</p>
            
            <p>Best regards,<br>
            Recruitment System<br>
            ${companyName}</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: candidateEmail,
      subject,
      html,
    });

    logger.info(
      'EMAIL SERVICE',
      `[EMAIL SERVICE] Offer ${status} email sent to ${candidateEmail} for position ${positionTitle}`,
    );
  }
}

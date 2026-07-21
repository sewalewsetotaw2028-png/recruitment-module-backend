import 'dotenv/config';
import prisma from '../../src/config/database';

/**
 * Seeds notification templates and variables for all NotificationType enum values.
 * Each template has a subject and body_html with {{variable_key}} tokens that
 * the dispatchNotification function will substitute at send time.
 */
async function main() {
  try {
    const company = await prisma.company.findUnique({
      where: { company_code: 'ADIU' },
    });
    if (!company) {
      throw new Error('Company not found. Run 01-base-data.ts first.');
    }

    const companyId = company.id;

    // ─── Seed Notification Variables ─────────────────────────────────────

    const variableDefinitions: Array<{
      type: string;
      key: string;
      description: string;
      example: string;
    }> = [
      // Workforce Planning
      { type: 'WORKFORCE_PLAN_SUBMITTED', key: 'plan_title', description: 'The title of the workforce plan', example: 'Q3 2026 Staffing Plan' },
      { type: 'WORKFORCE_PLAN_SUBMITTED', key: 'submitted_by', description: 'Name of the person who submitted the plan', example: 'John Doe' },
      { type: 'WORKFORCE_PLAN_SUBMITTED', key: 'department', description: 'Department name', example: 'Engineering' },
      { type: 'WORKFORCE_PLAN_SUBMITTED', key: 'forwarded_by', description: 'Name of person who forwarded the plan', example: 'Jane Smith' },
      { type: 'WORKFORCE_PLAN_APPROVED', key: 'plan_title', description: 'The title of the workforce plan', example: 'Q3 2026 Staffing Plan' },
      { type: 'WORKFORCE_PLAN_APPROVED', key: 'approved_by', description: 'Name of the approver', example: 'CEO Name' },
      { type: 'WORKFORCE_PLAN_APPROVED', key: 'approval_date', description: 'Date the plan was approved', example: '2026-07-20' },
      { type: 'WORKFORCE_PLAN_REJECTED', key: 'plan_title', description: 'The title of the workforce plan', example: 'Q3 2026 Staffing Plan' },
      { type: 'WORKFORCE_PLAN_REJECTED', key: 'rejected_by', description: 'Name of the person who rejected', example: 'CEO Name' },
      { type: 'WORKFORCE_PLAN_REJECTED', key: 'rejection_reason', description: 'Reason for rejection or revision comments', example: 'Please reconsider the headcount numbers' },
      { type: 'WORKFORCE_PLAN_REJECTED', key: 'returned_by', description: 'Name of person who returned for revision', example: 'CEO Name' },
      { type: 'WORKFORCE_PLAN_REJECTED', key: 'revision_comments', description: 'Revision comments', example: 'Please reduce the headcount by 2' },

      // Recruitment Request
      { type: 'RECRUITMENT_REQUEST_SUBMITTED', key: 'request_number', description: 'Request reference number', example: 'RR-2026-0042' },
      { type: 'RECRUITMENT_REQUEST_SUBMITTED', key: 'job_title', description: 'Job title being requested', example: 'Senior Software Engineer' },
      { type: 'RECRUITMENT_REQUEST_SUBMITTED', key: 'department', description: 'Department name', example: 'Engineering' },
      { type: 'RECRUITMENT_REQUEST_SUBMITTED', key: 'submitted_by', description: 'Name of requester', example: 'John Doe' },
      { type: 'RECRUITMENT_REQUEST_APPROVED', key: 'request_number', description: 'Request reference number', example: 'RR-2026-0042' },
      { type: 'RECRUITMENT_REQUEST_APPROVED', key: 'job_title', description: 'Job title being requested', example: 'Senior Software Engineer' },
      { type: 'RECRUITMENT_REQUEST_APPROVED', key: 'approved_by', description: 'Name of approver', example: 'HR Admin' },
      { type: 'RECRUITMENT_REQUEST_REJECTED', key: 'request_number', description: 'Request reference number', example: 'RR-2026-0042' },
      { type: 'RECRUITMENT_REQUEST_REJECTED', key: 'job_title', description: 'Job title being requested', example: 'Senior Software Engineer' },
      { type: 'RECRUITMENT_REQUEST_REJECTED', key: 'rejected_by', description: 'Name of person who rejected', example: 'HR Admin' },
      { type: 'RECRUITMENT_REQUEST_REJECTED', key: 'rejection_reason', description: 'Rejection reason', example: 'Budget constraints' },

      // Vacancy
      { type: 'VACANCY_CREATED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },
      { type: 'VACANCY_CREATED', key: 'vacancy_number', description: 'Vacancy reference number', example: 'VAC-2026-0015' },
      { type: 'VACANCY_CREATED', key: 'department', description: 'Department name', example: 'Engineering' },
      { type: 'JOB_POSTED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },
      { type: 'JOB_POSTED', key: 'vacancy_number', description: 'Vacancy reference number', example: 'VAC-2026-0015' },

      // Application / Candidate
      { type: 'APPLICATION_RECEIVED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },
      { type: 'APPLICATION_RECEIVED', key: 'vacancy_title', description: 'Title of the vacancy applied for', example: 'Senior Software Engineer' },
      { type: 'APPLICATION_RECEIVED', key: 'company_name', description: 'Company name', example: 'Adiu Communication' },
      { type: 'APPLICATION_RECEIVED', key: 'application_date', description: 'Date the application was submitted', example: '2026-07-18' },
      { type: 'APPLICATION_SHORTLISTED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },
      { type: 'APPLICATION_SHORTLISTED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },
      { type: 'APPLICATION_REJECTED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },
      { type: 'APPLICATION_REJECTED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },

      // Interview
      { type: 'INTERVIEW_SCHEDULED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },
      { type: 'INTERVIEW_SCHEDULED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },
      { type: 'INTERVIEW_SCHEDULED', key: 'interview_date', description: 'Date of the interview', example: '2026-07-25' },
      { type: 'INTERVIEW_SCHEDULED', key: 'interview_time', description: 'Time of the interview', example: '10:00 AM' },
      { type: 'INTERVIEW_SCHEDULED', key: 'interview_mode', description: 'Interview mode (Physical/Virtual/Hybrid)', example: 'Virtual' },
      { type: 'INTERVIEW_SCHEDULED', key: 'meeting_link', description: 'Meeting link for virtual interviews', example: 'https://meet.google.com/abc-defg-hij' },
      { type: 'INTERVIEW_RESCHEDULED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },
      { type: 'INTERVIEW_RESCHEDULED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },
      { type: 'INTERVIEW_RESCHEDULED', key: 'interview_date', description: 'New date of the interview', example: '2026-07-28' },
      { type: 'INTERVIEW_RESCHEDULED', key: 'interview_time', description: 'New time of the interview', example: '02:00 PM' },
      { type: 'INTERVIEW_RESCHEDULED', key: 'interview_mode', description: 'Interview mode (Physical/Virtual/Hybrid)', example: 'Physical' },
      { type: 'INTERVIEW_CANCELLED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },
      { type: 'INTERVIEW_CANCELLED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },

      // Selection
      { type: 'CANDIDATE_SELECTED', key: 'candidate_name', description: 'Full name of the selected candidate', example: 'Abebe Kebede' },
      { type: 'CANDIDATE_SELECTED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },
      { type: 'CANDIDATE_REJECTED', key: 'candidate_name', description: 'Full name of the rejected candidate', example: 'Abebe Kebede' },
      { type: 'CANDIDATE_REJECTED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },

      // Offer
      { type: 'OFFER_ISSUED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },
      { type: 'OFFER_ISSUED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },
      { type: 'OFFER_ISSUED', key: 'offer_expiry_date', description: 'Date the offer expires', example: '2026-08-15' },
      { type: 'OFFER_ACCEPTED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },
      { type: 'OFFER_ACCEPTED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },
      { type: 'OFFER_DECLINED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },
      { type: 'OFFER_DECLINED', key: 'vacancy_title', description: 'Title of the vacancy', example: 'Senior Software Engineer' },

      // Talent Roster
      { type: 'TALENT_ROSTER_ADDED', key: 'candidate_name', description: 'Full name of the candidate', example: 'Abebe Kebede' },

      // General
      { type: 'GENERAL', key: 'title', description: 'Custom notification title', example: 'Action Required' },
      { type: 'GENERAL', key: 'message', description: 'Custom notification message', example: 'Please complete your pending evaluation.' },
    ];

    // Upsert variables (idempotent - won't duplicate on re-run)
    for (const variable of variableDefinitions) {
      await prisma.notificationVariable.upsert({
        where: {
          notification_type_variable_key: {
            notification_type: variable.type as any,
            variable_key: variable.key,
          },
        },
        update: {
          description: variable.description,
          example_value: variable.example,
        },
        create: {
          notification_type: variable.type as any,
          variable_key: variable.key,
          description: variable.description,
          example_value: variable.example,
        },
      });
    }
    console.log(`✓ ${variableDefinitions.length} notification variables upserted`);

    // ─── Seed Notification Templates ─────────────────────────────────────

    const templateDefinitions: Array<{
      type: string;
      subject: string;
      bodyHtml: string;
    }> = [
      // Workforce Planning
      {
        type: 'WORKFORCE_PLAN_SUBMITTED',
        subject: 'Workforce Plan Submitted: {{plan_title}}',
        bodyHtml: `<p>Dear HR Team,</p>
<p>A workforce plan has been submitted for your review.</p>
<ul>
<li><strong>Plan Title:</strong> {{plan_title}}</li>
<li><strong>Submitted By:</strong> {{submitted_by}}</li>
<li><strong>Department:</strong> {{department}}</li>
</ul>
<p>Please log in to the system to review and take action.</p>`,
      },
      {
        type: 'WORKFORCE_PLAN_APPROVED',
        subject: 'Workforce Plan Approved: {{plan_title}}',
        bodyHtml: `<p>Dear {{submitted_by}},</p>
<p>Your workforce plan <strong>{{plan_title}}</strong> has been approved by <strong>{{approved_by}}</strong> on {{approval_date}}.</p>
<p>You can now proceed with the next steps in the recruitment process.</p>`,
      },
      {
        type: 'WORKFORCE_PLAN_REJECTED',
        subject: 'Workforce Plan Update: {{plan_title}}',
        bodyHtml: `<p>Dear {{submitted_by}},</p>
<p>Your workforce plan <strong>{{plan_title}}</strong> requires attention.</p>
<p><strong>Reason:</strong> {{rejection_reason}}</p>
<p>Please log in to the system to review and make the necessary changes.</p>`,
      },

      // Recruitment Request
      {
        type: 'RECRUITMENT_REQUEST_SUBMITTED',
        subject: 'New Recruitment Request: {{request_number}} - {{job_title}}',
        bodyHtml: `<p>Dear HR Team,</p>
<p>A new recruitment request has been submitted for your approval.</p>
<ul>
<li><strong>Request Number:</strong> {{request_number}}</li>
<li><strong>Job Title:</strong> {{job_title}}</li>
<li><strong>Department:</strong> {{department}}</li>
<li><strong>Submitted By:</strong> {{submitted_by}}</li>
</ul>
<p>Please log in to review and approve or reject this request.</p>`,
      },
      {
        type: 'RECRUITMENT_REQUEST_APPROVED',
        subject: 'Recruitment Request Approved: {{request_number}}',
        bodyHtml: `<p>Dear Requester,</p>
<p>Your recruitment request <strong>{{request_number}}</strong> for <strong>{{job_title}}</strong> has been approved by <strong>{{approved_by}}</strong>.</p>
<p>The recruitment process will now proceed with creating the vacancy.</p>`,
      },
      {
        type: 'RECRUITMENT_REQUEST_REJECTED',
        subject: 'Recruitment Request Update: {{request_number}}',
        bodyHtml: `<p>Dear Requester,</p>
<p>Your recruitment request <strong>{{request_number}}</strong> for <strong>{{job_title}}</strong> has been reviewed.</p>
<p><strong>Reason:</strong> {{rejection_reason}}</p>
<p>Please log in to view the full details.</p>`,
      },

      // Vacancy
      {
        type: 'VACANCY_CREATED',
        subject: 'Vacancy Created: {{vacancy_title}}',
        bodyHtml: `<p>Dear Hiring Manager,</p>
<p>A new vacancy has been created:</p>
<ul>
<li><strong>Vacancy:</strong> {{vacancy_title}}</li>
<li><strong>Reference Number:</strong> {{vacancy_number}}</li>
<li><strong>Department:</strong> {{department}}</li>
</ul>
<p>Please log in to review the vacancy details.</p>`,
      },
      {
        type: 'JOB_POSTED',
        subject: 'Vacancy Published: {{vacancy_title}}',
        bodyHtml: `<p>Dear Hiring Manager,</p>
<p>The vacancy <strong>{{vacancy_title}}</strong> ({{vacancy_number}}) has been published and is now live for applications.</p>
<p>You will be notified when candidates begin applying.</p>`,
      },

      // Application
      {
        type: 'APPLICATION_RECEIVED',
        subject: 'Application Received - {{vacancy_title}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>Thank you for applying for the position of <strong>{{vacancy_title}}</strong> at <strong>{{company_name}}</strong>.</p>
<p>Your application was received on {{application_date}}. We will review your qualifications and get back to you soon.</p>
<p>You can track your application status through the candidate portal.</p>`,
      },
      {
        type: 'APPLICATION_SHORTLISTED',
        subject: 'Application Shortlisted - {{vacancy_title}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>Congratulations! Your application for <strong>{{vacancy_title}}</strong> has been shortlisted.</p>
<p>We will contact you shortly with the next steps in the recruitment process.</p>`,
      },
      {
        type: 'APPLICATION_REJECTED',
        subject: 'Application Update - {{vacancy_title}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>Thank you for your interest in the <strong>{{vacancy_title}}</strong> position.</p>
<p>After careful review, we regret to inform you that your application has not been selected to proceed to the next stage.</p>
<p>We wish you the best in your future endeavors.</p>`,
      },

      // Interview
      {
        type: 'INTERVIEW_SCHEDULED',
        subject: 'Interview Scheduled - {{vacancy_title}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>We are pleased to invite you for an interview for the position of <strong>{{vacancy_title}}</strong>.</p>
<ul>
<li><strong>Date:</strong> {{interview_date}}</li>
<li><strong>Time:</strong> {{interview_time}}</li>
<li><strong>Mode:</strong> {{interview_mode}}</li>
</ul>
<p>Please confirm your availability by logging into the candidate portal. If the interview is virtual, the meeting link will be available in the candidate portal.</p>`,
      },
      {
        type: 'INTERVIEW_RESCHEDULED',
        subject: 'Interview Rescheduled - {{vacancy_title}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>Your interview for <strong>{{vacancy_title}}</strong> has been rescheduled.</p>
<ul>
<li><strong>New Date:</strong> {{interview_date}}</li>
<li><strong>New Time:</strong> {{interview_time}}</li>
<li><strong>Mode:</strong> {{interview_mode}}</li>
</ul>
<p>Please log in to the candidate portal for the updated details.</p>`,
      },

      // Selection
      {
        type: 'CANDIDATE_SELECTED',
        subject: 'Congratulations - Selected for {{vacancy_title}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>Congratulations! We are pleased to inform you that you have been selected for the position of <strong>{{vacancy_title}}</strong>.</p>
<p>You will receive an official offer letter shortly with further details.</p>`,
      },
      {
        type: 'CANDIDATE_REJECTED',
        subject: 'Application Update - {{vacancy_title}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>Thank you for your participation in the recruitment process for <strong>{{vacancy_title}}</strong>.</p>
<p>After careful evaluation, we regret to inform you that another candidate has been selected for this position.</p>
<p>We appreciate your interest and wish you success in your career.</p>`,
      },

      // Offer
      {
        type: 'OFFER_ISSUED',
        subject: 'Job Offer - {{vacancy_title}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>We are pleased to offer you the position of <strong>{{vacancy_title}}</strong>.</p>
<p><strong>Offer Expiry Date:</strong> {{offer_expiry_date}}</p>
<p>Please log in to the candidate portal to review the full offer details and accept or decline the offer.</p>`,
      },
      {
        type: 'OFFER_ACCEPTED',
        subject: 'Offer Accepted - {{vacancy_title}}',
        bodyHtml: `<p>Dear HR Team,</p>
<p><strong>{{candidate_name}}</strong> has accepted the offer for the position of <strong>{{vacancy_title}}</strong>.</p>
<p>Please proceed with the onboarding process.</p>`,
      },
      {
        type: 'OFFER_DECLINED',
        subject: 'Offer Declined - {{vacancy_title}}',
        bodyHtml: `<p>Dear HR Team,</p>
<p><strong>{{candidate_name}}</strong> has declined the offer for the position of <strong>{{vacancy_title}}</strong>.</p>
<p>Please review the next steps for this vacancy.</p>`,
      },

      // Talent Roster
      {
        type: 'TALENT_ROSTER_ADDED',
        subject: 'Welcome to Our Talent Pool',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>We are pleased to inform you that you have been added to our talent roster.</p>
<p>We will keep your profile on file and reach out when suitable opportunities arise.</p>`,
      },

      // Interview Cancelled
      {
        type: 'INTERVIEW_CANCELLED',
        subject: 'Interview Cancelled - {{vacancy_title}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p>
<p>Your interview for <strong>{{vacancy_title}}</strong> has been cancelled.</p>
<p>Please log in to the candidate portal for more information.</p>`,
      },

      // General
      {
        type: 'GENERAL',
        subject: '{{title}}',
        bodyHtml: `<p>{{message}}</p>`,
      },
    ];

    // Upsert templates (idempotent)
    for (const tpl of templateDefinitions) {
      await prisma.notificationTemplate.upsert({
        where: {
          company_id_type: {
            company_id: companyId,
            type: tpl.type as any,
          },
        },
        update: {
          subject: tpl.subject,
          body_html: tpl.bodyHtml,
          is_active: true,
        },
        create: {
          company_id: companyId,
          type: tpl.type as any,
          subject: tpl.subject,
          body_html: tpl.bodyHtml,
          is_active: true,
        },
      });
    }
    console.log(`✓ ${templateDefinitions.length} notification templates upserted`);

    console.log('\n✅ Notification data seeded successfully!');
    console.log('─────────────────────────────────────────────────────────');
  } catch (error) {
    console.error('Error seeding notification data:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

/**
 * jobPosting.service.ts
 *
 * Uses the ACTUAL schema models:
 *   - Vacancy          (posting_status field tracks published/draft/withdrawn)
 *   - VacancyJobPosting (one row per channel per vacancy)
 *   - RecruitmentChannel (the master list of channels per company)
 *
 * The old service tried to use prisma.jobPosting which doesn't exist in this schema.
 */

import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { PostingStatus } from '@prisma/client';
import https from 'https';

// ─── Telegram helper ─────────────────────────────────────────────────────────

/**
 * Post a job vacancy message to a Telegram channel/group via the Bot API.
 * Returns the Telegram message URL on success, or null on failure.
 *
 * Stored fields on RecruitmentChannel:
 *   api_token   → Telegram bot token  (from @BotFather)
 *   api_username → chat_id            (e.g. -1001234567890 or @channelname)
 */
async function postToTelegram(opts: {
  botToken: string;
  chatId: string;
  text: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      chat_id: opts.chatId,
      text: opts.text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    });

    const url = `https://api.telegram.org/bot${opts.botToken}/sendMessage`;
    const urlObj = new URL(url);

    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.ok && json.result?.message_id) {
              const chatId = String(opts.chatId).replace('@', '');
              // Build a link: for public channels use t.me/channelname/msgId
              // For private groups the URL is not directly linkable — return a generic ref
              const msgId = json.result.message_id;
              const link = chatId.startsWith('-')
                ? `https://t.me/c/${chatId.replace('-100', '')}/${msgId}`
                : `https://t.me/${chatId}/${msgId}`;
              resolve(link);
            } else {
              console.error('[Telegram] sendMessage failed:', json);
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      },
    );

    req.on('error', (err) => {
      console.error('[Telegram] request error:', err.message);
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Build the job posting message text for Telegram.
 */
function buildTelegramMessage(vacancy: {
  title: string;
  location: string;
  description: string;
  requirements: string;
  employment_type: string;
  open_positions: number;
  closing_date: Date | null;
}): string {
  const lines: string[] = [
    `<b>🚀 New Job Opening: ${vacancy.title}</b>`,
    '',
    `📍 <b>Location:</b> ${vacancy.location}`,
    `💼 <b>Type:</b> ${vacancy.employment_type.replace('_', ' ')}`,
    `👥 <b>Openings:</b> ${vacancy.open_positions}`,
  ];

  if (vacancy.closing_date) {
    lines.push(
      `📅 <b>Apply by:</b> ${new Date(vacancy.closing_date).toLocaleDateString()}`,
    );
  }

  if (vacancy.description) {
    lines.push('', `📋 <b>About the role:</b>`, vacancy.description.slice(0, 300) + (vacancy.description.length > 300 ? '…' : ''));
  }

  if (vacancy.requirements) {
    lines.push('', `✅ <b>Requirements:</b>`, vacancy.requirements.slice(0, 200) + (vacancy.requirements.length > 200 ? '…' : ''));
  }

  lines.push('', '📩 To apply, reply to this message or contact our HR team.');

  return lines.join('\n');
}

/**
 * Delete a Telegram message by parsing the message_id from the stored external_job_url.
 * URL format: https://t.me/c/{groupId}/{msgId}  or  https://t.me/{channel}/{msgId}
 */
async function deleteTelegramMessage(opts: {
  botToken: string;
  chatId: string;
  externalUrl: string;
}): Promise<void> {
  // Extract message_id from the URL (last path segment)
  const parts = opts.externalUrl.split('/');
  const messageId = parts[parts.length - 1];
  if (!messageId || isNaN(Number(messageId))) return;

  return new Promise((resolve) => {
    const body = JSON.stringify({
      chat_id: opts.chatId,
      message_id: Number(messageId),
    });

    const url = `https://api.telegram.org/bot${opts.botToken}/deleteMessage`;
    const urlObj = new URL(url);

    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (!json.ok) {
              console.warn('[Telegram] deleteMessage failed:', json.description);
            }
          } catch {
            // ignore parse errors
          }
          resolve();
        });
      },
    );

    req.on('error', (err) => {
      console.error('[Telegram] deleteMessage request error:', err.message);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

const assertVacancyAccess = async (
  company_id: string | number,
  vacancy_id: string,
) => {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancy_id } });
  if (!vacancy || String(vacancy.company_id) !== String(company_id)) {
    throw new AppError('Vacancy not found or unauthorized', 404);
  }
  return vacancy;
};

// ─── select shape returned to frontend ───────────────────────────────────────

const postingSelect = {
  id: true,
  vacancy_id: true,
  recruitment_channel_id: true,
  posting_status: true,
  posted_at: true,
  external_job_id: true,
  external_job_url: true,
  error_log: true,
  created_at: true,
  updated_at: true,
  recruitment_channel: {
    select: {
      id: true,
      name: true,
      description: true,
      is_automated: true,
      is_active: true,
      company_id: true,
      api_username: true,
    },
  },
} as const;

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Get all VacancyJobPostings for a vacancy (i.e. which channels it's posted to).
 */
export const getJobPostingsForVacancy = async (
  company_id: string | number,
  vacancy_id: string,
) => {
  await assertVacancyAccess(company_id, vacancy_id);

  return prisma.vacancyJobPosting.findMany({
    where: { vacancy_id },
    select: postingSelect,
    orderBy: { created_at: 'desc' },
  });
};

/**
 * Create VacancyJobPosting records — one per selected channel.
 * Also marks the vacancy posting_status as PUBLISHED.
 */
export const createJobPostings = async (
  company_id: string | number,
  vacancy_id: string,
  channel_ids: string[],
) => {
  const vacancy = await assertVacancyAccess(company_id, vacancy_id);

  // Validate that all channels belong to this company
  const channels = await prisma.recruitmentChannel.findMany({
    where: {
      id: { in: channel_ids },
      company_id: Number(company_id),
      is_active: true,
    },
  });

  if (channels.length === 0) {
    throw new AppError('No valid active channels provided', 400);
  }

  // Build the Telegram message once (shared across all Telegram channels)
  const telegramMessage = buildTelegramMessage({
    title: vacancy.title,
    location: vacancy.location,
    description: vacancy.description,
    requirements: vacancy.requirements,
    employment_type: String(vacancy.employment_type),
    open_positions: vacancy.open_positions,
    closing_date: vacancy.closing_date,
  });

  // Upsert a VacancyJobPosting per channel (avoid duplicates via findFirst + update/create)
  const created = await Promise.all(
    channels.map(async (ch) => {
      // ── Telegram auto-post ───────────────────────────────────────────────
      let telegramUrl: string | null = null;
      const isTelegram = ch.name.toLowerCase().includes('telegram');
      if (isTelegram && ch.api_token && ch.api_username) {
        telegramUrl = await postToTelegram({
          botToken: ch.api_token,
          chatId: ch.api_username,
          text: telegramMessage,
        });
      }

      const existing = await prisma.vacancyJobPosting.findFirst({
        where: { vacancy_id, recruitment_channel_id: ch.id },
      });
      if (existing) {
        return prisma.vacancyJobPosting.update({
          where: { id: existing.id },
          data: {
            posting_status: PostingStatus.PUBLISHED,
            posted_at: new Date(),
            error_log: null,
            ...(telegramUrl ? { external_job_url: telegramUrl } : {}),
          },
          select: postingSelect,
        });
      }
      return prisma.vacancyJobPosting.create({
        data: {
          vacancy_id,
          recruitment_channel_id: ch.id,
          company_id: Number(company_id),
          posting_status: PostingStatus.PUBLISHED,
          posted_at: new Date(),
          ...(telegramUrl ? { external_job_url: telegramUrl } : {}),
        },
        select: postingSelect,
      });
    }),
  );

  // Update the vacancy itself to reflect published state
  await prisma.vacancy.update({
    where: { id: vacancy_id },
    data: {
      posting_status: 'PUBLISHED',
      status: 'OPEN',
      posted_at: new Date(),
    },
  });

  return created;
};

/**
 * Withdraw all channel postings for a vacancy.
 * - Does NOT delete messages from posted channels/sources — content stays live.
 * - Only updates the posting status to WITHDRAWN and vacancy status to CANCELLED.
 * - Preserves external_job_url so the audit trail retains channel links.
 */
export const withdrawJobPostings = async (
  company_id: string | number,
  vacancy_id: string,
  reason?: string,
) => {
  await assertVacancyAccess(company_id, vacancy_id);

  // Mark all published postings as withdrawn — keep external_job_url intact
  await prisma.vacancyJobPosting.updateMany({
    where: {
      vacancy_id,
      posting_status: PostingStatus.PUBLISHED,
    },
    data: {
      posting_status: PostingStatus.WITHDRAWN,
      error_log: reason ?? null,
    },
  });

  // Set vacancy status to CANCELLED (closed/cancelled — not re-publishable)
  await prisma.vacancy.update({
    where: { id: vacancy_id },
    data: { posting_status: 'WITHDRAWN', status: 'CANCELLED' },
  });

  return getJobPostingsForVacancy(company_id, vacancy_id);
};

/**
 * Get all RecruitmentChannels for a company — used to populate
 * the channel selection UI.
 */
export const getCompanyChannels = async (company_id: string | number) => {
  return prisma.recruitmentChannel.findMany({
    where: { company_id: Number(company_id), is_active: true },
    select: {
      id: true,
      name: true,
      description: true,
      is_automated: true,
      is_active: true,
      api_username: true,  // chat_id for Telegram
      // Do NOT expose api_token or api_password to frontend
    },
    orderBy: { name: 'asc' },
  });
};

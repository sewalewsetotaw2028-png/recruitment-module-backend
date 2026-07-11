/**
 * closeExpiredVacancies.ts
 *
 * Scheduled job — runs every hour.
 * Finds all OPEN / PUBLISHED vacancies whose closing_date has passed
 * and transitions them to CLOSED automatically.
 */

import prisma from '../config/database';

export async function closeExpiredVacancies(): Promise<void> {
  const now = new Date();

  try {
    const expired = await prisma.vacancy.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        closing_date: { lt: now },
      },
      select: { id: true, title: true, closing_date: true, company_id: true },
    });

    if (expired.length === 0) return;

    console.log(
      `[Scheduler] Closing ${expired.length} expired vacancies…`,
    );

    await prisma.vacancy.updateMany({
      where: {
        id: { in: expired.map((v) => v.id) },
      },
      data: {
        status: 'CLOSED',
        closed_at: now,
        posting_status: 'WITHDRAWN',
      },
    });

    // Log each closure in the activity log for audit trail
    await prisma.activityLog.createMany({
      data: expired.map((v) => ({
        company_id: v.company_id,
        action: 'auto_closed',
        entity_type: 'Vacancy',
        entity_id: v.id,
        description: `Vacancy automatically closed — deadline ${v.closing_date?.toISOString().slice(0, 10)} passed`,
        changes: {
          previousStatus: 'OPEN',
          nextStatus: 'CLOSED',
          reason: 'closing_date_passed',
        },
      })),
      skipDuplicates: true,
    });

    console.log(`[Scheduler] Closed ${expired.length} expired vacancies.`);
  } catch (err) {
    console.error('[Scheduler] closeExpiredVacancies error:', err);
  }
}

/**
 * Start the recurring scheduler.
 * Runs immediately on startup, then every hour.
 */
export function startVacancyExpiryScheduler(): void {
  // Run once immediately on startup
  void closeExpiredVacancies();

  // Then run every hour (3_600_000 ms)
  setInterval(() => {
    void closeExpiredVacancies();
  }, 60 * 60 * 1000);

  console.log('[Scheduler] Vacancy expiry job started — runs every hour.');
}

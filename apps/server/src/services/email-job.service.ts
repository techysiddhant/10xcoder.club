import { emailQueue } from "../lib/email-queue";
import type { EmailJobType } from "../lib/email-queue";

// ── Types ────────────────────────────────────────

export interface EmailJobStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface FailedEmailJob {
  id: string | undefined;
  type: EmailJobType;
  to: string;
  subject: string;
  attempts: number;
  failedReason: string | undefined;
  timestamp: number | undefined;
  finishedOn: number | undefined;
}

// ── Get queue stats ──────────────────────────────

export async function getEmailJobStats(): Promise<EmailJobStats> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

// ── Get failed jobs (paginated) ──────────────────

export async function getFailedEmailJobs(
  start: number,
  limit: number,
): Promise<{ total: number; jobs: FailedEmailJob[] }> {
  const safeStart = Math.max(0, Math.floor(start));
  const safeLimit = Math.max(1, Math.floor(limit));

  const total = await emailQueue.getFailedCount();
  const jobs = await emailQueue.getFailed(safeStart, safeStart + safeLimit - 1);

  return {
    total,
    jobs: jobs.map((job) => ({
      id: job.id,
      type: job.data.type,
      to: job.data.to,
      subject: job.data.subject,
      attempts: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    })),
  };
}

// ── Retry all failed jobs ────────────────────────

export async function retryAllFailedEmailJobs(): Promise<number> {
  const failed = await emailQueue.getFailed();
  let retried = 0;

  for (const job of failed) {
    await job.retry();
    retried++;
  }

  return retried;
}

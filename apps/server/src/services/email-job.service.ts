import { logger } from "@/lib/logger";
import { emailQueue } from "@/lib/email-queue";
import type { EmailJobType } from "@/lib/email-queue";

const MAX_LIMIT = 1000;

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
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));

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
  const batchSize = 50;
  let retried = 0;

  // Always fetch from index 0: job.retry() removes items and shifts indices,
  // so advancing start would skip jobs. Iterate in reverse to avoid
  // index-shifting issues within each batch.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await emailQueue.getFailed(0, batchSize - 1);
    if (batch.length === 0) break;

    let succeededInBatch = 0;
    for (let i = batch.length - 1; i >= 0; i--) {
      const job = batch[i];
      if (!job) continue;
      try {
        await job.retry();
        retried++;
        succeededInBatch++;
      } catch (err) {
        // Log and continue — don't let one failure stop the loop
        logger.warn({ jobId: job.id, error: err }, "Failed to retry email job");
      }
    }

    if (succeededInBatch === 0) {
      logger.warn(
        { batchSize: batch.length },
        "No retries succeeded in batch, breaking out of loop.",
      );
      break;
    }
  }

  return retried;
}

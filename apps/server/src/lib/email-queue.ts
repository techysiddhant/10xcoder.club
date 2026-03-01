import { Queue, Worker } from "bullmq";
import type { Job } from "bullmq";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/autosend";

// ── Types ────────────────────────────────────────

export type EmailJobType = "verification" | "reset-password" | "magic-link";

export interface EmailJobData {
  type: EmailJobType;
  to: string;
  subject: string;
  templateId: string;
  dynamicData: Record<string, string>;
}

// ── Redis connection config for BullMQ ───────────

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
};

// ── Queue ────────────────────────────────────────

const QUEUE_NAME = "email";

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000, // 1s → 2s → 4s
    },
    removeOnComplete: {
      age: 60 * 60 * 24, // keep completed jobs for 24h
      count: 1000,
    },
    removeOnFail: false, // keep failed jobs for inspection
  },
});

// ── Worker ───────────────────────────────────────

export const emailWorker = new Worker<EmailJobData>(
  QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { type, to, subject, templateId, dynamicData } = job.data;

    logger.info(
      { jobId: job.id, type, to, attempt: job.attemptsMade + 1 },
      "📧 Processing email job",
    );

    await sendEmail({ to, subject, templateId, dynamicData });

    logger.info({ jobId: job.id, type, to }, "✅ Email sent successfully");
  },
  {
    connection,
    concurrency: 5,
  },
);

// ── Event listeners ──────────────────────────────

emailWorker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      type: job?.data?.type,
      to: job?.data?.to,
      attempt: job?.attemptsMade,
      err,
    },
    "❌ Email job failed",
  );
});

emailWorker.on("error", (err) => {
  logger.error({ err }, "Email worker error");
});

// ── Helper: enqueue an email job ─────────────────

export async function addEmailJob(data: EmailJobData): Promise<string> {
  const job = await emailQueue.add(data.type, data, {
    jobId: `${data.type}-${data.to}-${Date.now()}`,
  });

  logger.info(
    { jobId: job.id, type: data.type, to: data.to },
    "📨 Email job enqueued",
  );

  if (!job.id) {
    throw new Error(
      `Failed to enqueue email job: missing job.id for type=${data.type} to=${data.to}`,
    );
  }

  return job.id;
}

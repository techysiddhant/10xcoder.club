import { Queue } from "bullmq";
import { env } from "@/config/env";
import { QUEUE_NAMES } from "@/constant";

// BullMQ connection config (separate from ioredis instance)
const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
};

// BullMQ Queues
export const voteQueue = new Queue(QUEUE_NAMES.VOTE_SYNC, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 1000, // Keep last 1000 failed jobs
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

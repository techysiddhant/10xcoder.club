import { Queue } from "bullmq";
import { QUEUE_NAMES } from "@/constant";
import { redisConnectionOptions } from "./redis";

// BullMQ connection config (separate from ioredis instance)
const connection = redisConnectionOptions;

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

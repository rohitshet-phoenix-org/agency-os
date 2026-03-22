import { Queue } from "bullmq";

const connection = {
  host: process.env["REDIS_HOST"] ?? "localhost",
  port: Number(process.env["REDIS_PORT"] ?? 6379),
  password: process.env["REDIS_PASSWORD"],
};

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

export const reportQueue = new Queue("reports", { connection, defaultJobOptions });
export const socialPublishQueue = new Queue("social-publish", { connection, defaultJobOptions });
export const emailQueue = new Queue("email", { connection, defaultJobOptions });
export const seoQueue = new Queue("seo", { connection, defaultJobOptions });
export const adSyncQueue = new Queue("ad-sync", { connection, defaultJobOptions });
export const alertQueue = new Queue("alerts", { connection, defaultJobOptions });
export const notificationQueue = new Queue("notifications", { connection, defaultJobOptions });

import { type ConnectionOptions, Queue, Worker } from 'bullmq';

import logger from '../utils/logger';

const redisConnection: ConnectionOptions = {
  host: '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6000, // Redis instance alreading running on VM used port forwarding
};

export const emailQueue = new Queue('EmailQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

// TODO: stub — replace the logger calls with actual email transport (e.g. nodemailer/Resend)
export const emailWorker = new Worker('EmailQueue', async (job) => {
  logger.info(`Job ${job.id} picking up email task`);
  const { to, message } = job.data;
  if (Array.isArray(to)) {
    to.forEach((email) => logger.info(`Sent email to ${email} with message: ${message}`));
  } else {
    logger.info(`Sent email to ${to} with message: ${message}`);
  }
});

emailWorker.on('completed', (job) => {
  logger.info(`[Job ${job.id}] Email sent successfully`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`[Job ${job?.id}] Failed after all retries: ${err.message}`);
});

// Connection/transport errors — not tied to a specific job
emailWorker.on('error', (err) => {
  logger.error(`Email worker error: ${err.message}`);
});

import { Queue } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import Redis from 'ioredis';

const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const CAMPAIGN_QUEUE_NAME = 'outbound-campaign-queue';

export const campaignQueue = new Queue(CAMPAIGN_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

campaignQueue.on('error', (err) => {
  logger.error({ err: err.message }, 'BullMQ Campaign Queue error');
});

export default campaignQueue;

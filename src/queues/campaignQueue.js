import { Queue } from 'bullmq';
import { logger } from '../config/logger.js';
import { createRedisConnection } from '../config/redis.js';

export const CAMPAIGN_QUEUE_NAME = 'outbound-campaign-queue';

export const campaignQueue = new Queue(CAMPAIGN_QUEUE_NAME, {
  connection: createRedisConnection(),
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

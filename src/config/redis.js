import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

let redisClient = null;

export const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        logger.warn({ times, delay }, 'Retrying Redis connection...');
        return delay;
      },
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisClient.on('error', (err) => {
      logger.error({ err: err.message }, 'Redis connection error');
    });
  }

  return redisClient;
};

export default getRedisClient;

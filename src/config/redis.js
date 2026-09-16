import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Creates a configured Redis client instance suitable for BullMQ and application use.
 * @param {Object} [options]
 * @returns {Redis}
 */
export const createRedisConnection = (options = {}) => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      logger.warn({ times, delay }, 'Retrying Redis connection...');
      return delay;
    },
    ...options,
  });

  client.on('connect', () => {
    logger.info('Connected to Redis');
  });

  client.on('error', (err) => {
    logger.error({ err: err.message }, 'Redis connection error');
  });

  return client;
};

let redisClient = null;

/**
 * Gets or initializes a shared singleton Redis client.
 * @returns {Redis}
 */
export const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisConnection();
  }
  return redisClient;
};

export default getRedisClient;

import pino from 'pino';
import { env } from './env.js';

const isDev = env.NODE_ENV === 'development';

export const logger = pino({
  level: env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-twilio-signature"]',
      'body.password',
      'body.token',
      'TWILIO_AUTH_TOKEN',
      'OPENAI_API_KEY',
    ],
    remove: true,
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: env.NODE_ENV,
  },
});

/**
 * Creates a child logger with contextual metadata (correlation IDs)
 * @param {Object} context
 * @param {string} [context.callId]
 * @param {string} [context.customerId]
 * @param {string} [context.twilioCallSid]
 * @param {string} [context.campaignId]
 */
export const createCallLogger = (context) => {
  return logger.child(context);
};

export default logger;

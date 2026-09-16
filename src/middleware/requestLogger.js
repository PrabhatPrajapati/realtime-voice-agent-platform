import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from '../config/logger.js';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-correlation-id'] || randomUUID(),
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed with status ${res.statusCode}`,
  customErrorMessage: (req, res, error) => `${req.method} ${req.url} failed with status ${res.statusCode}: ${error?.message || 'unknown error'}`,
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
});

export default requestLogger;

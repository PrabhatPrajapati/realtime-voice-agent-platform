import { logger } from '../config/logger.js';
import { ZodError } from 'zod';

export const errorHandler = (err, req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || req.id;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    logger.warn({ correlationId, errors: formattedErrors }, 'Validation error');

    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: formattedErrors,
    });
  }

  // Handle custom App / Service Errors
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(
    {
      correlationId,
      err: {
        message: err.message,
        stack: err.stack,
        code: err.code,
      },
      url: req.originalUrl,
      method: req.method,
    },
    'Unhandled request error'
  );

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

export default errorHandler;

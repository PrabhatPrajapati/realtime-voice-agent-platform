import twilio from 'twilio';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Express middleware to verify incoming requests from Twilio
 */
export const verifyTwilioWebhook = (req, res, next) => {
  // If webhook validation is disabled in config (e.g. local testing), bypass
  if (!env.TWILIO_VALIDATE_WEBHOOK) {
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'];
  if (!twilioSignature) {
    logger.warn({ ip: req.ip, url: req.originalUrl }, 'Missing Twilio signature header');
    return res.status(403).send('Twilio signature header missing');
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  const isValid = twilio.validateRequest(
    env.TWILIO_AUTH_TOKEN,
    twilioSignature,
    fullUrl,
    req.body || {}
  );

  if (!isValid) {
    logger.warn(
      {
        url: fullUrl,
        ip: req.ip,
        signature: twilioSignature,
      },
      'Invalid Twilio webhook signature'
    );
    return res.status(403).send('Invalid Twilio signature');
  }

  next();
};

export default verifyTwilioWebhook;

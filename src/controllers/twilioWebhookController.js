import { callService } from '../services/callService.js';
import { twimlBuilder } from '../utils/twimlBuilder.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export class TwilioWebhookController {
  /**
   * POST /webhooks/twilio/voice
   * Returns TwiML connecting the call to the AI Media Stream
   */
  handleVoice = asyncHandler(async (req, res) => {
    const { CallSid, From, To } = req.body;
    const { callId, customerId } = req.query;

    logger.info({ CallSid, From, To, callId, customerId }, 'Voice webhook triggered by Twilio');

    const wsBaseUrl = env.PUBLIC_BASE_URL.replace(/^http(s?):/, 'ws$1:');
    const streamUrl = `${wsBaseUrl}/media-stream`;

    const twiml = twimlBuilder.buildMediaStreamTwiML({
      streamUrl,
      customParameters: {
        callId: callId || '',
        customerId: customerId || '',
        callSid: CallSid || '',
      },
    });

    res.type('text/xml').send(twiml);
  });

  /**
   * POST /webhooks/twilio/status
   * Updates call status from Twilio status callbacks
   */
  handleStatus = asyncHandler(async (req, res) => {
    await callService.handleTwilioStatusCallback(req.body);
    res.status(200).send('<Response></Response>');
  });

  /**
   * POST /webhooks/twilio/amd
   * Updates call record with Answering Machine Detection result
   */
  handleAmd = asyncHandler(async (req, res) => {
    await callService.handleTwilioAmdCallback(req.body);
    res.status(200).send('<Response></Response>');
  });

  /**
   * POST /webhooks/twilio/transfer
   * Returns TwiML to transfer call to CSR
   */
  handleTransfer = asyncHandler(async (req, res) => {
    const csrPhone = env.CSR_PHONE_NUMBER;
    const announcement = 'Please hold while I connect you with our support team.';

    const twiml = twimlBuilder.buildTransferTwiML(csrPhone, {
      announcement,
      callerId: env.TWILIO_PHONE_NUMBER,
    });

    res.type('text/xml').send(twiml);
  });

  /**
   * POST /webhooks/twilio/recording
   * Handles call recording callbacks
   */
  handleRecording = asyncHandler(async (req, res) => {
    const { RecordingSid, RecordingUrl, RecordingDuration, CallSid } = req.body;
    logger.info(
      { RecordingSid, RecordingUrl, RecordingDuration, CallSid },
      'Twilio recording status callback received'
    );
    res.status(200).send('<Response></Response>');
  });
}

export const twilioWebhookController = new TwilioWebhookController();
export default twilioWebhookController;

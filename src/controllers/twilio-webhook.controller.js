import { callService } from '../services/call.service.js';
import { twimlBuilder } from '../utils/twiml-builder.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export class TwilioWebhookController {
  /**
   * POST /webhooks/twilio/voice
   * Returns TwiML connecting the call to the AI Media Stream
   */
  async handleVoice(req, res, next) {
    try {
      const { CallSid, From, To } = req.body;
      const callId = req.query.callId;
      const customerId = req.query.customerId;

      logger.info({ CallSid, From, To, callId, customerId }, 'Voice webhook triggered by Twilio');

      // Construct WebSocket URL from PUBLIC_BASE_URL
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

      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      logger.error({ err: error.message }, 'Error in handleVoice webhook');
      next(error);
    }
  }

  /**
   * POST /webhooks/twilio/status
   * Updates call status from Twilio status callbacks
   */
  async handleStatus(req, res, next) {
    try {
      await callService.handleTwilioStatusCallback(req.body);
      res.status(200).send('<Response></Response>');
    } catch (error) {
      logger.error({ err: error.message }, 'Error in handleStatus webhook');
      next(error);
    }
  }

  /**
   * POST /webhooks/twilio/amd
   * Updates call record with Answering Machine Detection result
   */
  async handleAmd(req, res, next) {
    try {
      await callService.handleTwilioAmdCallback(req.body);
      res.status(200).send('<Response></Response>');
    } catch (error) {
      logger.error({ err: error.message }, 'Error in handleAmd webhook');
      next(error);
    }
  }

  /**
   * POST /webhooks/twilio/transfer
   * Returns TwiML to transfer call to CSR
   */
  async handleTransfer(req, res, next) {
    try {
      const csrPhone = env.CSR_PHONE_NUMBER;
      const announcement = "Please hold while I connect you with our support team.";

      const twiml = twimlBuilder.buildTransferTwiML(csrPhone, {
        announcement,
        callerId: env.TWILIO_PHONE_NUMBER,
      });

      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      logger.error({ err: error.message }, 'Error in handleTransfer webhook');
      next(error);
    }
  }

  /**
   * POST /webhooks/twilio/recording
   * Handles call recording callbacks
   */
  async handleRecording(req, res, next) {
    try {
      const { RecordingSid, RecordingUrl, RecordingDuration, CallSid } = req.body;
      logger.info(
        { RecordingSid, RecordingUrl, RecordingDuration, CallSid },
        'Twilio recording status callback received'
      );
      res.status(200).send('<Response></Response>');
    } catch (error) {
      logger.error({ err: error.message }, 'Error in handleRecording webhook');
      next(error);
    }
  }
}

export const twilioWebhookController = new TwilioWebhookController();
export default twilioWebhookController;

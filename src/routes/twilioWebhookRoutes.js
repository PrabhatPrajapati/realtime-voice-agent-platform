import { Router } from 'express';
import { twilioWebhookController } from '../controllers/twilioWebhookController.js';
import { verifyTwilioWebhook } from '../middleware/twilioAuth.js';

const router = Router();

// Apply Twilio Webhook Signature Verification middleware
router.use(verifyTwilioWebhook);

/**
 * POST /webhooks/twilio/voice
 * Called when Twilio places or connects an outbound call
 */
router.post('/voice', twilioWebhookController.handleVoice);

/**
 * POST /webhooks/twilio/status
 * Status tracking callback for call events (ringing, answered, completed, failed)
 */
router.post('/status', twilioWebhookController.handleStatus);

/**
 * POST /webhooks/twilio/amd
 * Answering Machine Detection callback
 */
router.post('/amd', twilioWebhookController.handleAmd);

/**
 * POST /webhooks/twilio/transfer
 * Generates TwiML for CSR human handoff
 */
router.post('/transfer', twilioWebhookController.handleTransfer);

/**
 * POST /webhooks/twilio/recording
 * Receives recording status & URL
 */
router.post('/recording', twilioWebhookController.handleRecording);

export default router;

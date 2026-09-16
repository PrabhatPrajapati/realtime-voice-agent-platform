import twilio from 'twilio';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export class TwilioService {
  constructor() {
    this.isMockMode =
      env.TWILIO_ACCOUNT_SID.startsWith('ACmock') ||
      env.NODE_ENV === 'test';

    if (!this.isMockMode) {
      this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      logger.info('Twilio client initialized with live credentials');
    } else {
      logger.warn('Twilio client initialized in MOCK/SANDBOX mode');
    }
  }

  /**
   * Places an outbound call via Twilio Calls API
   * @param {Object} params
   * @param {string} params.to - Customer phone number in E.164 format
   * @param {string} params.callId - Database call ID
   * @param {string} [params.customerId] - Customer ID
   * @param {string} [params.campaignId] - Campaign ID if part of campaign
   * @returns {Promise<{ callSid: string, status: string }>}
   */
  async makeOutboundCall({ to, callId, customerId, campaignId }) {
    const voiceUrl = new URL(`${env.PUBLIC_BASE_URL}/webhooks/twilio/voice`);
    voiceUrl.searchParams.set('callId', callId);
    if (customerId) voiceUrl.searchParams.set('customerId', customerId);
    if (campaignId) voiceUrl.searchParams.set('campaignId', campaignId);

    const statusCallbackUrl = new URL(`${env.PUBLIC_BASE_URL}/webhooks/twilio/status`);
    statusCallbackUrl.searchParams.set('callId', callId);

    if (this.isMockMode) {
      const mockSid = `CAmock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      logger.info(
        { mockSid, to, from: env.TWILIO_PHONE_NUMBER, voiceUrl: voiceUrl.toString() },
        '[MOCK] Outbound Twilio call initiated'
      );
      return {
        callSid: mockSid,
        status: 'queued',
      };
    }

    const callOptions = {
      to,
      from: env.TWILIO_PHONE_NUMBER,
      url: voiceUrl.toString(),
      statusCallback: statusCallbackUrl.toString(),
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    };

    // Answering Machine Detection (AMD)
    if (env.ENABLE_AMD) {
      const amdCallbackUrl = new URL(`${env.PUBLIC_BASE_URL}/webhooks/twilio/amd`);
      amdCallbackUrl.searchParams.set('callId', callId);

      callOptions.machineDetection = 'Enable';
      callOptions.asyncAmd = 'true';
      callOptions.asyncAmdStatusCallback = amdCallbackUrl.toString();
      callOptions.asyncAmdStatusCallbackMethod = 'POST';
    }

    // Call Recording Configuration
    if (env.ENABLE_CALL_RECORDING) {
      const recordingCallbackUrl = new URL(`${env.PUBLIC_BASE_URL}/webhooks/twilio/recording`);
      recordingCallbackUrl.searchParams.set('callId', callId);

      callOptions.record = true;
      callOptions.recordingStatusCallback = recordingCallbackUrl.toString();
      callOptions.recordingStatusCallbackMethod = 'POST';
    }

    try {
      const call = await this.client.calls.create(callOptions);
      logger.info(
        { callSid: call.sid, status: call.status, to },
        'Twilio outbound call created successfully'
      );
      return {
        callSid: call.sid,
        status: call.status,
      };
    } catch (error) {
      logger.error(
        { err: error.message, code: error.code, to },
        'Failed to initiate Twilio outbound call'
      );
      throw error;
    }
  }

  /**
   * Fetches the current live status of a Twilio call
   * @param {string} callSid
   */
  async getCallStatus(callSid) {
    if (this.isMockMode || callSid.startsWith('CAmock')) {
      return { sid: callSid, status: 'in-progress' };
    }

    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
      };
    } catch (error) {
      logger.error({ err: error.message, callSid }, 'Failed to fetch Twilio call status');
      throw error;
    }
  }

  /**
   * Transfers an active call to a new TwiML URL or phone number
   * @param {string} callSid
   * @param {string} targetUrl
   */
  async transferCall(callSid, targetUrl) {
    if (this.isMockMode || callSid.startsWith('CAmock')) {
      logger.info({ callSid, targetUrl }, '[MOCK] Call transferred');
      return { sid: callSid, status: 'in-progress' };
    }

    try {
      const call = await this.client.calls(callSid).update({
        url: targetUrl,
        method: 'POST',
      });
      logger.info({ callSid, status: call.status }, 'Call successfully transferred');
      return call;
    } catch (error) {
      logger.error({ err: error.message, callSid }, 'Failed to transfer call');
      throw error;
    }
  }

  /**
   * Ends an active call via Twilio Calls API
   * @param {string} callSid
   */
  async hangupCall(callSid) {
    if (this.isMockMode || callSid.startsWith('CAmock')) {
      logger.info({ callSid }, '[MOCK] Call hung up');
      return { sid: callSid, status: 'completed' };
    }

    try {
      const call = await this.client.calls(callSid).update({
        status: 'completed',
      });
      logger.info({ callSid, status: call.status }, 'Call hung up successfully');
      return call;
    } catch (error) {
      logger.error({ err: error.message, callSid }, 'Failed to hangup call');
      throw error;
    }
  }
}

export const twilioService = new TwilioService();
export default twilioService;

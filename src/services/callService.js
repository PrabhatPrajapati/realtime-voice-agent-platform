import { callRepository } from '../repositories/callRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { twilioService } from './twilioService.js';
import { logger, createCallLogger } from '../config/logger.js';

export class CallService {
  /**
   * Initiates a test outbound call to a customer or phone number
   * @param {Object} params
   * @param {string} [params.phone]
   * @param {string} [params.customerId]
   * @param {string} [params.customerName]
   */
  async initiateTestCall({ phone, customerId, customerName }) {
    let customer;

    if (customerId) {
      customer = await customerRepository.findById(customerId);
      if (!customer) {
        const error = new Error(`Customer with ID ${customerId} not found`);
        error.statusCode = 404;
        throw error;
      }
    } else if (phone) {
      customer = await customerRepository.upsertByPhone({
        phone,
        name: customerName || 'Test Customer',
      });
    }

    // Compliance Check: Do-Not-Call check
    if (customer.status === 'DO_NOT_CALL') {
      const error = new Error(`Cannot place call: Customer ${customer.phone} is registered on DO_NOT_CALL list`);
      error.statusCode = 400;
      throw error;
    }

    // Step 1: Create Initial Call Record
    const initialCall = await callRepository.create({
      customerId: customer.id,
      status: 'QUEUED',
      outcome: 'IN_PROGRESS',
      startedAt: new Date(),
    });

    const callLog = createCallLogger({
      callId: initialCall.id,
      customerId: customer.id,
      customerPhone: customer.phone,
    });

    callLog.info('Call record initialized in database');

    // Step 2: Trigger Outbound Call via Twilio
    try {
      const twilioResult = await twilioService.makeOutboundCall({
        to: customer.phone,
        callId: initialCall.id,
        customerId: customer.id,
      });

      // Step 3: Update Call with Twilio SID and DIALING status
      const updatedCall = await callRepository.update(initialCall.id, {
        twilioCallSid: twilioResult.callSid,
        status: 'DIALING',
      });

      await callRepository.addMessage({
        callId: initialCall.id,
        speaker: 'SYSTEM',
        text: `Outbound call initiated to ${customer.phone}. Twilio SID: ${twilioResult.callSid}`,
      });

      callLog.info({ twilioCallSid: twilioResult.callSid }, 'Twilio call successfully placed');

      return updatedCall;
    } catch (error) {
      callLog.error({ err: error.message }, 'Failed to initiate outbound Twilio call');

      await callRepository.update(initialCall.id, {
        status: 'FAILED',
        outcome: 'FAILED',
        endedAt: new Date(),
      });

      await callRepository.addMessage({
        callId: initialCall.id,
        speaker: 'SYSTEM',
        text: `Failed to initiate call: ${error.message}`,
      });

      throw error;
    }
  }

  /**
   * Handles status updates received from Twilio status callbacks
   * @param {Object} statusData - Twilio webhook payload
   */
  async handleTwilioStatusCallback(statusData) {
    const { CallSid, CallStatus: twilioStatus, CallDuration, SequenceNumber } = statusData;

    logger.info({ CallSid, twilioStatus, CallDuration }, 'Received Twilio status callback');

    try {
      const existingCall = await callRepository.findByTwilioCallSid(CallSid);
      if (!existingCall) {
        logger.warn({ CallSid }, 'Call not found for Twilio status callback');
        return null;
      }

      const updateData = {};
      const now = new Date();

      switch (twilioStatus) {
        case 'initiated':
        case 'queued':
          updateData.status = 'QUEUED';
          break;
        case 'ringing':
          updateData.status = 'RINGING';
          break;
        case 'in-progress':
          if (!existingCall.answeredAt) {
            updateData.answeredAt = now;
          }
          updateData.status = 'ANSWERED';
          break;
        case 'completed':
          updateData.status = 'COMPLETED';
          updateData.endedAt = now;
          if (CallDuration) {
            updateData.duration = parseInt(CallDuration, 10);
          }
          break;
        case 'busy':
          updateData.status = 'FAILED';
          updateData.outcome = 'BUSY';
          updateData.endedAt = now;
          break;
        case 'no-answer':
          updateData.status = 'FAILED';
          updateData.outcome = 'NO_ANSWER';
          updateData.endedAt = now;
          break;
        case 'failed':
        case 'canceled':
          updateData.status = 'FAILED';
          updateData.outcome = 'FAILED';
          updateData.endedAt = now;
          break;
        default:
          logger.debug({ twilioStatus }, 'Unmapped Twilio status');
      }

      return await callRepository.update(existingCall.id, updateData);
    } catch (error) {
      logger.error({ err: error.message, CallSid }, 'Error updating call from Twilio status callback');
      return null;
    }
  }

  /**
   * Handles Answering Machine Detection results
   * @param {Object} amdData - Twilio AMD payload
   */
  async handleTwilioAmdCallback(amdData) {
    const { CallSid, AnsweredBy } = amdData;

    logger.info({ CallSid, AnsweredBy }, 'Received Twilio AMD callback');

    const existingCall = await callRepository.findByTwilioCallSid(CallSid);
    if (!existingCall) return null;

    let amdResult = 'UNKNOWN';
    let outcome = existingCall.outcome;

    if (AnsweredBy === 'human') {
      amdResult = 'HUMAN';
    } else if (AnsweredBy && AnsweredBy.startsWith('machine')) {
      amdResult = 'MACHINE';
      outcome = 'VOICEMAIL';
    }

    return callRepository.update(existingCall.id, {
      amdResult,
      outcome,
    });
  }

  /**
   * Get call by ID
   * @param {string} id
   */
  async getCallById(id) {
    const call = await callRepository.findById(id);
    if (!call) {
      const error = new Error(`Call with ID ${id} not found`);
      error.statusCode = 404;
      throw error;
    }
    return call;
  }

  /**
   * List calls
   * @param {Object} params
   */
  async listCalls(params) {
    return callRepository.findMany(params);
  }
}

export const callService = new CallService();
export default callService;

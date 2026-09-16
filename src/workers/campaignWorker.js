import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { logger, createCallLogger } from '../config/logger.js';
import { createRedisConnection } from '../config/redis.js';
import { CAMPAIGN_QUEUE_NAME } from '../queues/campaignQueue.js';
import { campaignRepository } from '../repositories/campaignRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { callRepository } from '../repositories/callRepository.js';
import { twilioService } from '../services/twilioService.js';
import {
  CALL_STATUS,
  CALL_OUTCOME,
  CUSTOMER_STATUS,
  CAMPAIGN_STATUS,
  CAMPAIGN_CUSTOMER_STATUS,
} from '../constants/enums.js';

export const campaignWorker = new Worker(
  CAMPAIGN_QUEUE_NAME,
  async (job) => {
    const { campaignId, customerId } = job.data;
    const workerLog = logger.child({
      jobId: job.id,
      campaignId,
      customerId,
    });

    workerLog.info('Processing outbound campaign call job');

    // Step 1: Check Campaign Status
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign || campaign.status === CAMPAIGN_STATUS.PAUSED || campaign.status === CAMPAIGN_STATUS.CANCELLED) {
      workerLog.warn(
        { status: campaign?.status },
        'Skipping job: Campaign is paused, cancelled, or missing'
      );
      return { skipped: true, reason: `Campaign status: ${campaign?.status}` };
    }

    // Step 2: Check Customer & Compliance
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      workerLog.error('Customer record not found');
      return { skipped: true, reason: 'Customer not found' };
    }

    if (customer.status === CUSTOMER_STATUS.DO_NOT_CALL) {
      workerLog.info('Skipping call: Customer is registered on DO_NOT_CALL list');
      await campaignRepository.updateCampaignCustomer(campaignId, customerId, {
        status: CAMPAIGN_CUSTOMER_STATUS.DO_NOT_CALL,
        lastAttemptAt: new Date(),
      });
      await campaignRepository.incrementCompletedCalls(campaignId);
      return { skipped: true, reason: 'DO_NOT_CALL' };
    }

    // Step 3: Update Campaign Customer status to CALLING
    await campaignRepository.updateCampaignCustomer(campaignId, customerId, {
      status: CAMPAIGN_CUSTOMER_STATUS.CALLING,
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
    });

    // Step 4: Create Call Record
    const call = await callRepository.create({
      customerId: customer.id,
      campaignId: campaign.id,
      status: CALL_STATUS.QUEUED,
      outcome: CALL_OUTCOME.IN_PROGRESS,
      startedAt: new Date(),
    });

    const callLog = createCallLogger({
      callId: call.id,
      campaignId,
      customerId,
      phone: customer.phone,
    });

    // Step 5: Place Outbound Twilio Call
    try {
      const twilioResult = await twilioService.makeOutboundCall({
        to: customer.phone,
        callId: call.id,
        customerId: customer.id,
        campaignId: campaign.id,
      });

      await callRepository.update(call.id, {
        twilioCallSid: twilioResult.callSid,
        status: CALL_STATUS.DIALING,
      });

      await campaignRepository.updateCampaignCustomer(campaignId, customerId, {
        status: CAMPAIGN_CUSTOMER_STATUS.CALLING,
      });

      callLog.info({ callSid: twilioResult.callSid }, 'Campaign call successfully dialed');
      return { success: true, callId: call.id, callSid: twilioResult.callSid };
    } catch (err) {
      callLog.error({ err: err.message }, 'Failed to place campaign call');

      await callRepository.update(call.id, {
        status: CALL_STATUS.FAILED,
        outcome: CALL_OUTCOME.FAILED,
        endedAt: new Date(),
      });

      await campaignRepository.updateCampaignCustomer(campaignId, customerId, {
        status: CAMPAIGN_CUSTOMER_STATUS.FAILED,
      });

      await campaignRepository.incrementCompletedCalls(campaignId);
      throw err;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: env.MAX_CONCURRENT_CALLS || 5,
    limiter: {
      max: env.CALLS_PER_MINUTE || 20,
      duration: 60000,
    },
  }
);

campaignWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Campaign job completed');
});

campaignWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Campaign job failed');
});

export default campaignWorker;

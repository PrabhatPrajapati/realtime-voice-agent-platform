import { campaignRepository } from '../repositories/campaignRepository.js';
import { campaignQueue } from '../queues/campaignQueue.js';
import { prisma } from '../utils/prisma.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { CAMPAIGN_STATUS, CAMPAIGN_CUSTOMER_STATUS } from '../constants/enums.js';

export class CampaignService {
  /**
   * Create a new campaign with a list of customer IDs
   */
  async createCampaign(data) {
    logger.info({ name: data.name, customerCount: data.customerIds?.length }, 'Creating campaign');
    return campaignRepository.create(data);
  }

  /**
   * Get campaign details by ID
   */
  async getCampaignById(id) {
    const campaign = await campaignRepository.findById(id);
    if (!campaign) {
      const error = new Error(`Campaign with ID ${id} not found`);
      error.statusCode = 404;
      throw error;
    }
    return campaign;
  }

  /**
   * List campaigns
   */
  async listCampaigns(query) {
    return campaignRepository.findMany(query);
  }

  /**
   * Start or Run a campaign: Enqueues jobs in bulk into BullMQ (O(1) batch operation)
   */
  async startCampaign(id) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status === CAMPAIGN_STATUS.RUNNING) {
      return campaign;
    }

    logger.info({ campaignId: id }, 'Starting campaign and batch-enqueuing customer jobs');

    // Update status to RUNNING
    await campaignRepository.update(id, { status: CAMPAIGN_STATUS.RUNNING });

    // Filter pending/failed customers
    const pendingCustomers = campaign.campaignCustomers.filter(
      (cc) =>
        cc.status === CAMPAIGN_CUSTOMER_STATUS.PENDING ||
        cc.status === CAMPAIGN_CUSTOMER_STATUS.FAILED
    );

    if (pendingCustomers.length > 0) {
      // 1. Prepare bulk job definitions with rate pacing delay
      const intervalMs = Math.max(1000, Math.floor(60000 / (env.CALLS_PER_MINUTE || 10)));
      const bulkJobs = pendingCustomers.map((cc, index) => ({
        name: `campaign-${id}-customer-${cc.customerId}`,
        data: {
          campaignId: id,
          customerId: cc.customerId,
        },
        opts: {
          jobId: `job-${id}-${cc.customerId}-${Date.now()}`,
          delay: index * intervalMs,
        },
      }));

      await campaignQueue.addBulk(bulkJobs);

      // 2. Batch update customer campaign status to QUEUED
      const targetCustomerIds = pendingCustomers.map((c) => c.customerId);
      await prisma.campaignCustomer.updateMany({
        where: {
          campaignId: id,
          customerId: { in: targetCustomerIds },
        },
        data: {
          status: CAMPAIGN_CUSTOMER_STATUS.QUEUED,
        },
      });
    }

    return this.getCampaignById(id);
  }

  /**
   * Pause an active campaign
   */
  async pauseCampaign(id) {
    await this.getCampaignById(id);
    logger.info({ campaignId: id }, 'Pausing campaign');
    return campaignRepository.update(id, { status: CAMPAIGN_STATUS.PAUSED });
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(id) {
    return this.startCampaign(id);
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(id) {
    await this.getCampaignById(id);
    logger.info({ campaignId: id }, 'Cancelling campaign');
    return campaignRepository.update(id, { status: CAMPAIGN_STATUS.CANCELLED });
  }

  /**
   * Delete a campaign and its associations
   */
  async deleteCampaign(id) {
    await this.getCampaignById(id);
    logger.info({ campaignId: id }, 'Deleting campaign');
    return campaignRepository.delete(id);
  }
}

export const campaignService = new CampaignService();
export default campaignService;

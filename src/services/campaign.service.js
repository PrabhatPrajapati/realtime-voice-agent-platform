import { campaignRepository } from '../repositories/campaign.repository.js';
import { campaignQueue } from '../queues/campaign.queue.js';
import { logger } from '../config/logger.js';

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
   * Start or Run a campaign: Enqueues jobs for pending customers into BullMQ
   */
  async startCampaign(id) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status === 'RUNNING') {
      return campaign;
    }

    logger.info({ campaignId: id }, 'Starting campaign and queuing customer jobs');

    // Update status to RUNNING
    await campaignRepository.update(id, { status: 'RUNNING' });

    // Enqueue jobs for all PENDING customers
    const pendingCustomers = campaign.campaignCustomers.filter(
      (cc) => cc.status === 'PENDING' || cc.status === 'FAILED'
    );

    for (const cc of pendingCustomers) {
      await campaignQueue.add(
        `campaign-${id}-customer-${cc.customerId}`,
        {
          campaignId: id,
          customerId: cc.customerId,
        },
        {
          jobId: `job-${id}-${cc.customerId}-${Date.now()}`,
        }
      );

      await campaignRepository.updateCampaignCustomer(id, cc.customerId, {
        status: 'QUEUED',
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
    return campaignRepository.update(id, { status: 'PAUSED' });
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
    return campaignRepository.update(id, { status: 'CANCELLED' });
  }
}

export const campaignService = new CampaignService();
export default campaignService;

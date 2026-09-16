import { campaignService } from '../services/campaignService.js';
import { weeklyCheckinService } from '../services/weeklyCheckinService.js';

export class CampaignController {
  async listCampaigns(req, res, next) {
    try {
      const result = await campaignService.listCampaigns(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getWeeklyStatus(req, res, next) {
    try {
      const status = await weeklyCheckinService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async triggerWeekly(req, res, next) {
    try {
      const result = await weeklyCheckinService.triggerWeeklyCheckIn({
        name: req.body?.name,
        triggeredBy: 'MANUAL_DASHBOARD',
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getCampaign(req, res, next) {
    try {
      const campaign = await campaignService.getCampaignById(req.params.id);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }

  async createCampaign(req, res, next) {
    try {
      const campaign = await campaignService.createCampaign(req.body);
      res.status(201).json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }

  async startCampaign(req, res, next) {
    try {
      const campaign = await campaignService.startCampaign(req.params.id);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }

  async pauseCampaign(req, res, next) {
    try {
      const campaign = await campaignService.pauseCampaign(req.params.id);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }

  async resumeCampaign(req, res, next) {
    try {
      const campaign = await campaignService.resumeCampaign(req.params.id);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }

  async cancelCampaign(req, res, next) {
    try {
      const campaign = await campaignService.cancelCampaign(req.params.id);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
export default campaignController;

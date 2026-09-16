import { campaignService } from '../services/campaignService.js';
import { weeklyCheckinService } from '../services/weeklyCheckinService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class CampaignController {
  listCampaigns = asyncHandler(async (req, res) => {
    const result = await campaignService.listCampaigns(req.query);
    return ApiResponse.paginated(res, result);
  });

  getWeeklyStatus = asyncHandler(async (req, res) => {
    const status = await weeklyCheckinService.getStatus();
    return ApiResponse.success(res, status);
  });

  triggerWeekly = asyncHandler(async (req, res) => {
    const result = await weeklyCheckinService.triggerWeeklyCheckIn({
      name: req.body?.name,
      triggeredBy: 'MANUAL_DASHBOARD',
    });
    return ApiResponse.success(res, result);
  });

  getCampaign = asyncHandler(async (req, res) => {
    const campaign = await campaignService.getCampaignById(req.params.id);
    return ApiResponse.success(res, campaign);
  });

  createCampaign = asyncHandler(async (req, res) => {
    const campaign = await campaignService.createCampaign(req.body);
    return ApiResponse.created(res, campaign);
  });

  startCampaign = asyncHandler(async (req, res) => {
    const campaign = await campaignService.startCampaign(req.params.id);
    return ApiResponse.success(res, campaign);
  });

  pauseCampaign = asyncHandler(async (req, res) => {
    const campaign = await campaignService.pauseCampaign(req.params.id);
    return ApiResponse.success(res, campaign);
  });

  resumeCampaign = asyncHandler(async (req, res) => {
    const campaign = await campaignService.resumeCampaign(req.params.id);
    return ApiResponse.success(res, campaign);
  });

  cancelCampaign = asyncHandler(async (req, res) => {
    const campaign = await campaignService.cancelCampaign(req.params.id);
    return ApiResponse.success(res, campaign);
  });
}

export const campaignController = new CampaignController();
export default campaignController;

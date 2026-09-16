import { Router } from 'express';
import { campaignController } from '../controllers/campaignController.js';
import { validate } from '../middleware/validate.js';
import {
  createCampaignSchema,
  campaignQuerySchema,
  campaignIdParamSchema,
} from '../schemas/campaignSchemas.js';

const router = Router();

router.get(
  '/',
  validate({ query: campaignQuerySchema }),
  campaignController.listCampaigns
);

router.get('/weekly-status', campaignController.getWeeklyStatus);
router.post('/trigger-weekly', campaignController.triggerWeekly);

router.get(
  '/:id',
  validate({ params: campaignIdParamSchema }),
  campaignController.getCampaign
);

router.post(
  '/',
  validate({ body: createCampaignSchema }),
  campaignController.createCampaign
);

router.post(
  '/:id/start',
  validate({ params: campaignIdParamSchema }),
  campaignController.startCampaign
);

router.post(
  '/:id/pause',
  validate({ params: campaignIdParamSchema }),
  campaignController.pauseCampaign
);

router.post(
  '/:id/resume',
  validate({ params: campaignIdParamSchema }),
  campaignController.resumeCampaign
);

router.post(
  '/:id/cancel',
  validate({ params: campaignIdParamSchema }),
  campaignController.cancelCampaign
);

router.delete(
  '/:id',
  validate({ params: campaignIdParamSchema }),
  campaignController.deleteCampaign
);

export default router;

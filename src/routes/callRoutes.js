import { Router } from 'express';
import { callController } from '../controllers/callController.js';
import { validate } from '../middleware/validate.js';
import {
  initiateTestCallSchema,
  callIdParamSchema,
  callQuerySchema,
} from '../schemas/callSchemas.js';

const router = Router();

/**
 * POST /api/calls/test
 * Triggers an outbound test call to a phone number or customer ID
 */
router.post(
  '/test',
  validate({ body: initiateTestCallSchema }),
  callController.initiateTestCall
);

/**
 * GET /api/calls
 * Lists calls with filtering and pagination
 */
router.get(
  '/',
  validate({ query: callQuerySchema }),
  callController.listCalls
);

/**
 * GET /api/calls/:id
 * Fetches call details, transcript messages, and issue context
 */
router.get(
  '/:id',
  validate({ params: callIdParamSchema }),
  callController.getCall
);

export default router;

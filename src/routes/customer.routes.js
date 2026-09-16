import { Router } from 'express';
import { customerController } from '../controllers/customer.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createCustomerSchema,
  customerIdParamSchema,
  customerQuerySchema,
} from '../schemas/customer.schemas.js';

const router = Router();

router.post(
  '/',
  validate({ body: createCustomerSchema }),
  customerController.createCustomer
);

router.get(
  '/',
  validate({ query: customerQuerySchema }),
  customerController.listCustomers
);

router.get(
  '/:id',
  validate({ params: customerIdParamSchema }),
  customerController.getCustomer
);

router.post(
  '/:id/do-not-call',
  validate({ params: customerIdParamSchema }),
  customerController.setDoNotCall
);

export default router;

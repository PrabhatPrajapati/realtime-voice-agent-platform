import { Router } from 'express';
import { customerController } from '../controllers/customerController.js';
import { validate } from '../middleware/validate.js';
import {
  createCustomerSchema,
  customerIdParamSchema,
  customerQuerySchema,
} from '../schemas/customerSchemas.js';

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

router.delete(
  '/:id',
  validate({ params: customerIdParamSchema }),
  customerController.deleteCustomer
);

export default router;

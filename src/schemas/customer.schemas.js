import { z } from 'zod';

// E.164 phone number regex (+ followed by 7 to 15 digits)
export const phoneRegex = /^\+[1-9]\d{6,14}$/;

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().regex(phoneRegex, 'Phone number must be valid E.164 format (e.g. +1234567890)'),
  email: z.string().email('Invalid email address').optional(),
  assignedCsrId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DO_NOT_CALL']).default('ACTIVE'),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerIdParamSchema = z.object({
  id: z.string().min(1, 'Customer ID is required'),
});

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DO_NOT_CALL']).optional(),
  search: z.string().optional(),
});

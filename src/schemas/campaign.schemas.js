import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100),
  description: z.string().optional(),
  concurrency: z.coerce.number().int().min(1).max(20).default(5),
  customerIds: z.array(z.string()).min(1, 'At least 1 customer ID is required'),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  concurrency: z.coerce.number().int().min(1).max(20).optional(),
});

export const campaignIdParamSchema = z.object({
  id: z.string().min(1, 'Campaign ID is required'),
});

export const campaignQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
});

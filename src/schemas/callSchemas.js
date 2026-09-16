import { z } from 'zod';
import { phoneRegex } from './customerSchemas.js';

export const initiateTestCallSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Phone number must be valid E.164 format (e.g. +1234567890)').optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
}).refine((data) => data.phone || data.customerId, {
  message: 'Either phone or customerId must be provided',
  path: ['phone'],
});

export const callIdParamSchema = z.object({
  id: z.string().min(1, 'Call ID is required'),
});

export const callQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum([
      'QUEUED',
      'DIALING',
      'RINGING',
      'ANSWERED',
      'AI_CONNECTED',
      'IN_PROGRESS',
      'TRANSFERRED',
      'COMPLETED',
      'FAILED',
    ])
    .optional(),
  outcome: z
    .enum([
      'NO_ISSUE',
      'ISSUE_FOUND',
      'HUMAN_REQUESTED',
      'CALLBACK',
      'NO_ANSWER',
      'BUSY',
      'VOICEMAIL',
      'FAILED',
      'IN_PROGRESS',
    ])
    .optional(),
  campaignId: z.string().optional(),
  customerId: z.string().optional(),
});

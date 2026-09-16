import { z } from 'zod';

export const issueCategoryEnum = z.enum([
  'LOGIN',
  'PAYMENT',
  'ACCOUNT',
  'TECHNICAL',
  'PERFORMANCE',
  'ACCESS',
  'OTHER',
]);

export const issuePriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const issueStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

export const createIssueSchema = z.object({
  callId: z.string().trim().max(100).optional(),
  customerId: z.string().trim().min(1, 'Customer ID is required').max(100),
  assignedCsrId: z.string().trim().max(100).optional(),
  summary: z.string().trim().min(3, 'Summary must be at least 3 characters').max(1000),
  category: issueCategoryEnum.default('OTHER'),
  priority: issuePriorityEnum.default('MEDIUM'),
  status: issueStatusEnum.default('OPEN'),
});

export const updateIssueSchema = createIssueSchema.partial();

export const issueQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: issueStatusEnum.optional(),
  priority: issuePriorityEnum.optional(),
  category: issueCategoryEnum.optional(),
  customerId: z.string().trim().max(100).optional(),
});

export const resolveIssueSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});

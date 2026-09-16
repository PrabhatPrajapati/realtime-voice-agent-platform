import { Router } from 'express';
import customerRoutes from './customerRoutes.js';
import callRoutes from './callRoutes.js';
import campaignRoutes from './campaignRoutes.js';
import issueRoutes from './issueRoutes.js';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { CALL_STATUS, CALL_OUTCOME, ISSUE_STATUS } from '../constants/enums.js';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// Dashboard Aggregated Stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      callsToday,
      completedCalls,
      noIssueCalls,
      issuesFound,
      noAnswerCalls,
      voicemailCalls,
      humanTransfers,
      callbacks,
      openIssues,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.call.count({ where: { createdAt: { gte: today } } }),
      prisma.call.count({ where: { status: CALL_STATUS.COMPLETED } }),
      prisma.call.count({ where: { outcome: CALL_OUTCOME.NO_ISSUE } }),
      prisma.issue.count(),
      prisma.call.count({ where: { outcome: CALL_OUTCOME.NO_ANSWER } }),
      prisma.call.count({ where: { outcome: CALL_OUTCOME.VOICEMAIL } }),
      prisma.call.count({ where: { outcome: CALL_OUTCOME.HUMAN_REQUESTED } }),
      prisma.call.count({ where: { outcome: CALL_OUTCOME.CALLBACK } }),
      prisma.issue.count({ where: { status: ISSUE_STATUS.OPEN } }),
    ]);

    return ApiResponse.success(res, {
      totalCustomers,
      callsToday,
      completedCalls,
      noIssueCalls,
      issuesFound,
      noAnswerCalls,
      voicemailCalls,
      humanTransfers,
      callbacks,
      openIssues,
    });
  })
);

// API Resources
router.use('/customers', customerRoutes);
router.use('/calls', callRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/issues', issueRoutes);

export default router;

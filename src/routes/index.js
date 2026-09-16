import { Router } from 'express';
import customerRoutes from './customer.routes.js';
import callRoutes from './call.routes.js';
import campaignRoutes from './campaign.routes.js';
import issueRoutes from './issue.routes.js';
import { prisma } from '../utils/prisma.js';

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
router.get('/stats', async (req, res, next) => {
  try {
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
      prisma.call.count({ where: { status: 'COMPLETED' } }),
      prisma.call.count({ where: { outcome: 'NO_ISSUE' } }),
      prisma.issue.count(),
      prisma.call.count({ where: { outcome: 'NO_ANSWER' } }),
      prisma.call.count({ where: { outcome: 'VOICEMAIL' } }),
      prisma.call.count({ where: { outcome: 'HUMAN_REQUESTED' } }),
      prisma.call.count({ where: { outcome: 'CALLBACK' } }),
      prisma.issue.count({ where: { status: 'OPEN' } }),
    ]);

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    next(error);
  }
});

// API Resources
router.use('/customers', customerRoutes);
router.use('/calls', callRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/issues', issueRoutes);

export default router;

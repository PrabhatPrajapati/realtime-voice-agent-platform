import { prisma } from '../utils/prisma.js';
import { campaignService } from './campaign.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export class WeeklyCheckinService {
  constructor() {
    this.timer = null;
    this.lastTriggeredDate = null;
  }

  /**
   * Triggers the weekly check-in campaign for all ACTIVE customers
   * @param {Object} [options]
   * @param {string} [options.name] - Custom campaign name
   * @param {string} [options.triggeredBy] - Trigger source (MANUAL or AUTOMATED_SCHEDULER)
   */
  async triggerWeeklyCheckIn(options = {}) {
    const { name, triggeredBy = 'AUTOMATED_SCHEDULER' } = options;

    logger.info({ triggeredBy }, 'Starting automated weekly customer check-in campaign trigger');

    // 1. Fetch all ACTIVE customers (ignore DO_NOT_CALL or INACTIVE)
    const activeCustomers = await prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
      },
    });

    if (!activeCustomers || activeCustomers.length === 0) {
      logger.warn('Weekly check-in skipped: No ACTIVE customers found in database');
      return {
        success: false,
        skipped: true,
        message: 'No ACTIVE customers found to dial. Add customers with ACTIVE status first.',
      };
    }

    const customerIds = activeCustomers.map((c) => c.id);
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const campaignName = name || `Weekly Check-In - ${dateFormatted}`;

    // 2. Create the campaign
    const campaign = await campaignService.createCampaign({
      name: campaignName,
      description: `Automated weekly customer service check-in (${triggeredBy})`,
      concurrency: env.MAX_CONCURRENT_CALLS || 5,
      customerIds,
    });

    // 3. Start the campaign (enqueues jobs in BullMQ and dials with concurrency)
    const startedCampaign = await campaignService.startCampaign(campaign.id);

    this.lastTriggeredDate = new Date();

    logger.info(
      {
        campaignId: campaign.id,
        campaignName,
        customerCount: customerIds.length,
        concurrency: env.MAX_CONCURRENT_CALLS,
      },
      '✅ Weekly Check-in Campaign successfully created and launched'
    );

    return {
      success: true,
      campaign: startedCampaign,
      customerCount: customerIds.length,
      message: `Weekly check-in started for ${customerIds.length} customer(s) with concurrency of ${env.MAX_CONCURRENT_CALLS}.`,
    };
  }

  /**
   * Initializes the automated weekly scheduler
   */
  initScheduler() {
    if (!env.ENABLE_WEEKLY_CHECKIN) {
      logger.info('Weekly Check-in Automation is DISABLED in config (ENABLE_WEEKLY_CHECKIN=false)');
      return;
    }

    const dayMap = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    const targetDayName = (env.WEEKLY_CHECKIN_DAY || 'MONDAY').toUpperCase();
    const targetDay = dayMap[targetDayName] !== undefined ? dayMap[targetDayName] : 1;

    const [targetHour, targetMinute] = (env.WEEKLY_CHECKIN_TIME || '10:00')
      .split(':')
      .map((num) => parseInt(num, 10) || 0);

    logger.info(
      {
        day: targetDayName,
        time: `${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}`,
      },
      '📅 Weekly Check-in Scheduler initialized'
    );

    // Check every minute if the scheduled day and time is reached
    this.timer = setInterval(async () => {
      try {
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const todayStr = now.toISOString().slice(0, 10);

        // Check if today matches target day, hour, and minute
        if (
          currentDay === targetDay &&
          currentHour === targetHour &&
          currentMinute === targetMinute
        ) {
          // Prevent multiple executions in the same minute
          if (this.lastTriggeredDate?.toISOString().slice(0, 10) !== todayStr) {
            logger.info('⏰ Weekly Check-in cron triggered! Initiating campaign...');
            await this.triggerWeeklyCheckIn({ triggeredBy: 'AUTOMATED_SCHEDULER' });
          }
        }
      } catch (err) {
        logger.error({ err: err.message }, 'Error executing weekly check-in scheduler tick');
      }
    }, 60000); // check every 60 seconds
  }

  /**
   * Returns current scheduler status and active customer stats
   */
  async getStatus() {
    const activeCount = await prisma.customer.count({
      where: { status: 'ACTIVE' },
    });

    return {
      enabled: env.ENABLE_WEEKLY_CHECKIN,
      scheduledDay: env.WEEKLY_CHECKIN_DAY || 'MONDAY',
      scheduledTime: env.WEEKLY_CHECKIN_TIME || '10:00',
      lastTriggeredAt: this.lastTriggeredDate,
      activeCustomersCount: activeCount,
    };
  }

  /**
   * Stop the scheduler
   */
  stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Weekly Check-in Scheduler stopped');
    }
  }
}

export const weeklyCheckinService = new WeeklyCheckinService();
export default weeklyCheckinService;

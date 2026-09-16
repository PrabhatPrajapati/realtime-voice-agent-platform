import { prisma } from '../utils/prisma.js';
import { getPaginationParams, formatPaginatedResult } from '../utils/pagination.js';
import { CAMPAIGN_STATUS, CAMPAIGN_CUSTOMER_STATUS } from '../constants/enums.js';

export class CampaignRepository {
  /**
   * Create campaign and link customer records
   */
  async create({ name, description, concurrency = 5, customerIds = [] }) {
    return prisma.campaign.create({
      data: {
        name,
        description,
        concurrency,
        totalCustomers: customerIds.length,
        completedCalls: 0,
        status: CAMPAIGN_STATUS.DRAFT,
        campaignCustomers: {
          create: customerIds.map((customerId) => ({
            customerId,
            status: CAMPAIGN_CUSTOMER_STATUS.PENDING,
          })),
        },
      },
      include: {
        campaignCustomers: {
          include: { customer: true },
        },
      },
    });
  }

  /**
   * Find campaign by ID with metrics and customers
   */
  async findById(id) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        campaignCustomers: {
          include: { customer: true },
        },
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  /**
   * Update campaign details or status
   */
  async update(id, data) {
    return prisma.campaign.update({
      where: { id },
      data,
    });
  }

  /**
   * List campaigns with formatted metrics
   */
  async findMany({ page, limit, status } = {}) {
    const { page: p, limit: l, skip, take } = getPaginationParams({ page, limit });
    const where = status ? { status } : {};

    const [total, items] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          campaignCustomers: {
            select: { status: true },
          },
        },
      }),
    ]);

    const formattedItems = items.map((c) => {
      const breakdown = Object.values(CAMPAIGN_CUSTOMER_STATUS).reduce((acc, curr) => {
        acc[curr] = 0;
        return acc;
      }, {});

      c.campaignCustomers.forEach((cc) => {
        if (breakdown[cc.status] !== undefined) {
          breakdown[cc.status]++;
        }
      });

      return {
        ...c,
        breakdown,
        progressPercent:
          c.totalCustomers > 0
            ? Math.round((c.completedCalls / c.totalCustomers) * 100)
            : 0,
      };
    });

    return formatPaginatedResult({ items: formattedItems, total, page: p, limit: l });
  }

  /**
   * Update single campaign customer record
   */
  async updateCampaignCustomer(campaignId, customerId, data) {
    return prisma.campaignCustomer.update({
      where: {
        campaignId_customerId: {
          campaignId,
          customerId,
        },
      },
      data,
    });
  }

  /**
   * Increment completed calls count
   */
  async incrementCompletedCalls(campaignId) {
    return prisma.campaign.update({
      where: { id: campaignId },
      data: {
        completedCalls: { increment: 1 },
      },
    });
  }

  /**
   * Delete campaign by ID
   * @param {string} id
   */
  async delete(id) {
    return prisma.campaign.delete({
      where: { id },
    });
  }
}

export const campaignRepository = new CampaignRepository();
export default campaignRepository;

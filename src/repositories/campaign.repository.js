import { prisma } from '../utils/prisma.js';

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
        status: 'DRAFT',
        campaignCustomers: {
          create: customerIds.map((customerId) => ({
            customerId,
            status: 'PENDING',
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
   * List campaigns
   */
  async findMany({ page = 1, limit = 20, status } = {}) {
    const skip = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaignCustomers: {
            select: { status: true },
          },
        },
      }),
    ]);

    // Format metrics summary for each campaign
    const formattedItems = items.map((c) => {
      const breakdown = {
        PENDING: 0,
        QUEUED: 0,
        CALLING: 0,
        COMPLETED: 0,
        FAILED: 0,
        NO_ANSWER: 0,
        BUSY: 0,
        VOICEMAIL: 0,
        CALLBACK: 0,
        DO_NOT_CALL: 0,
      };

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

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
}

export const campaignRepository = new CampaignRepository();
export default campaignRepository;

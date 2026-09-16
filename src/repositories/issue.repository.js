import { prisma } from '../utils/prisma.js';

export class IssueRepository {
  /**
   * Create a new issue
   */
  async create(data) {
    return prisma.issue.create({
      data,
      include: {
        customer: true,
        call: true,
      },
    });
  }

  /**
   * Find issue by ID with related call and customer
   */
  async findById(id) {
    return prisma.issue.findUnique({
      where: { id },
      include: {
        customer: true,
        call: {
          include: {
            messages: {
              orderBy: { timestamp: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Find issue by call ID
   */
  async findByCallId(callId) {
    return prisma.issue.findFirst({
      where: { callId },
      include: {
        customer: true,
      },
    });
  }

  /**
   * Update issue by ID
   */
  async update(id, data) {
    return prisma.issue.update({
      where: { id },
      data,
      include: {
        customer: true,
        call: true,
      },
    });
  }

  /**
   * List issues with filters and pagination
   */
  async findMany({
    page = 1,
    limit = 20,
    status,
    priority,
    category,
    customerId,
  } = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (customerId) where.customerId = customerId;

    const [total, items] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          call: true,
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const issueRepository = new IssueRepository();
export default issueRepository;

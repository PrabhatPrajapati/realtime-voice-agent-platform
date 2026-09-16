import { prisma } from '../utils/prisma.js';
import { getPaginationParams, formatPaginatedResult } from '../utils/pagination.js';

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
    page,
    limit,
    status,
    priority,
    category,
    customerId,
  } = {}) {
    const { page: p, limit: l, skip, take } = getPaginationParams({ page, limit });

    const where = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(category && { category }),
      ...(customerId && { customerId }),
    };

    const [total, items] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          call: true,
        },
      }),
    ]);

    return formatPaginatedResult({ items, total, page: p, limit: l });
  }
}

export const issueRepository = new IssueRepository();
export default issueRepository;

import { prisma } from '../utils/prisma.js';

export class CustomerRepository {
  /**
   * Find customer by ID
   * @param {string} id
   */
  async findById(id) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        issues: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find customer by phone number
   * @param {string} phone
   */
  async findByPhone(phone) {
    return prisma.customer.findUnique({
      where: { phone },
    });
  }

  /**
   * Create or update customer by phone
   * @param {Object} data
   */
  async upsertByPhone(data) {
    const { phone, name, email, assignedCsrId, status } = data;
    return prisma.customer.upsert({
      where: { phone },
      update: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(assignedCsrId ? { assignedCsrId } : {}),
        ...(status ? { status } : {}),
      },
      create: {
        phone,
        name: name || 'Valued Customer',
        email,
        assignedCsrId,
        status: status || 'ACTIVE',
      },
    });
  }

  /**
   * List customers with pagination and filtering
   * @param {Object} params
   */
  async findMany({ page = 1, limit = 20, status, search }) {
    const skip = (page - 1) * limit;
    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update customer status (e.g. to DO_NOT_CALL)
   * @param {string} id
   * @param {'ACTIVE'|'INACTIVE'|'DO_NOT_CALL'} status
   */
  async updateStatus(id, status) {
    return prisma.customer.update({
      where: { id },
      data: { status },
    });
  }
}

export const customerRepository = new CustomerRepository();
export default customerRepository;

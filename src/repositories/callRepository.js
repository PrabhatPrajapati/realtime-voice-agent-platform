import { prisma } from '../utils/prisma.js';
import { getPaginationParams, formatPaginatedResult } from '../utils/pagination.js';
import { CALL_STATUS, CALL_OUTCOME } from '../constants/enums.js';

export class CallRepository {
  /**
   * Create a new call record
   * @param {Object} data
   */
  async create(data) {
    return prisma.call.create({
      data: {
        customerId: data.customerId,
        campaignId: data.campaignId,
        twilioCallSid: data.twilioCallSid,
        status: data.status || CALL_STATUS.QUEUED,
        outcome: data.outcome || CALL_OUTCOME.IN_PROGRESS,
        startedAt: data.startedAt || new Date(),
      },
      include: {
        customer: true,
      },
    });
  }

  /**
   * Find call by primary ID
   * @param {string} id
   */
  async findById(id) {
    return prisma.call.findUnique({
      where: { id },
      include: {
        customer: true,
        campaign: true,
        messages: {
          orderBy: { timestamp: 'asc' },
        },
        issues: true,
      },
    });
  }

  /**
   * Find call by Twilio Call SID
   * @param {string} twilioCallSid
   */
  async findByTwilioCallSid(twilioCallSid) {
    return prisma.call.findFirst({
      where: { twilioCallSid },
      include: {
        customer: true,
        campaign: true,
        issues: true,
      },
    });
  }

  /**
   * Update call by ID
   * @param {string} id
   * @param {Object} data
   */
  async update(id, data) {
    return prisma.call.update({
      where: { id },
      data,
      include: {
        customer: true,
        issues: true,
      },
    });
  }

  /**
   * Update call by Twilio Call SID
   * @param {string} twilioCallSid
   * @param {Object} data
   */
  async updateByTwilioCallSid(twilioCallSid, data) {
    return prisma.call.update({
      where: { twilioCallSid },
      data,
      include: {
        customer: true,
      },
    });
  }

  /**
   * Add a message to call transcript
   * @param {Object} params
   * @param {string} params.callId
   * @param {'AI'|'CUSTOMER'|'SYSTEM'|'CSR'} params.speaker
   * @param {string} params.text
   */
  async addMessage({ callId, speaker, text }) {
    return prisma.callMessage.create({
      data: {
        callId,
        speaker,
        text,
      },
    });
  }

  /**
   * List calls with pagination and filtering
   * @param {Object} params
   */
  async findMany({ page, limit, status, outcome, campaignId, customerId } = {}) {
    const { page: p, limit: l, skip, take } = getPaginationParams({ page, limit });

    const where = {
      ...(status ? { status } : {}),
      ...(outcome ? { outcome } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(customerId ? { customerId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.call.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          issues: {
            select: {
              id: true,
              summary: true,
              category: true,
              priority: true,
              status: true,
            },
          },
        },
      }),
      prisma.call.count({ where }),
    ]);

    return formatPaginatedResult({ items, total, page: p, limit: l });
  }
}

export const callRepository = new CallRepository();
export default callRepository;

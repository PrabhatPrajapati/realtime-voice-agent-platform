import { issueRepository } from '../repositories/issueRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { callRepository } from '../repositories/callRepository.js';
import { logger } from '../config/logger.js';

export class IssueService {
  /**
   * Create or update issue record (Idempotent for callId)
   */
  async createIssue({
    callId,
    customerId,
    assignedCsrId,
    summary,
    category = 'OTHER',
    priority = 'MEDIUM',
    status = 'OPEN',
  }) {
    logger.info({ callId, customerId, category, priority }, 'Saving structured issue');

    // Check customer for assigned CSR if not supplied
    if (!assignedCsrId && customerId) {
      const customer = await customerRepository.findById(customerId);
      if (customer?.assignedCsrId) {
        assignedCsrId = customer.assignedCsrId;
      }
    }

    // Idempotency: If issue already exists for this callId, update it
    if (callId) {
      const existing = await issueRepository.findByCallId(callId);
      if (existing) {
        logger.info({ issueId: existing.id, callId }, 'Updating existing issue for callId');
        return issueRepository.update(existing.id, {
          summary,
          category,
          priority,
          assignedCsrId: assignedCsrId || existing.assignedCsrId,
        });
      }
    }

    const created = await issueRepository.create({
      callId,
      customerId,
      assignedCsrId: assignedCsrId || 'CSR-001',
      summary,
      category,
      priority,
      status,
    });

    // Update call outcome to ISSUE_FOUND if callId provided
    if (callId) {
      await callRepository.update(callId, {
        outcome: 'ISSUE_FOUND',
      });
    }

    return created;
  }

  /**
   * Get single issue by ID
   */
  async getIssueById(id) {
    const issue = await issueRepository.findById(id);
    if (!issue) {
      const error = new Error(`Issue with ID ${id} not found`);
      error.statusCode = 404;
      throw error;
    }
    return issue;
  }

  /**
   * Resolve an issue
   */
  async resolveIssue(id, { notes } = {}) {
    const issue = await this.getIssueById(id);
    return issueRepository.update(issue.id, {
      status: 'RESOLVED',
    });
  }

  /**
   * List issues
   */
  async listIssues(query) {
    return issueRepository.findMany(query);
  }
}

export const issueService = new IssueService();
export default issueService;

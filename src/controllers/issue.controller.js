import { issueService } from '../services/issue.service.js';

export class IssueController {
  async listIssues(req, res, next) {
    try {
      const result = await issueService.listIssues(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getIssue(req, res, next) {
    try {
      const issue = await issueService.getIssueById(req.params.id);
      res.json({ success: true, data: issue });
    } catch (error) {
      next(error);
    }
  }

  async createIssue(req, res, next) {
    try {
      const issue = await issueService.createIssue(req.body);
      res.status(201).json({ success: true, data: issue });
    } catch (error) {
      next(error);
    }
  }

  async resolveIssue(req, res, next) {
    try {
      const issue = await issueService.resolveIssue(req.params.id, req.body);
      res.json({ success: true, data: issue });
    } catch (error) {
      next(error);
    }
  }
}

export const issueController = new IssueController();
export default issueController;

import { issueService } from '../services/issueService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class IssueController {
  listIssues = asyncHandler(async (req, res) => {
    const result = await issueService.listIssues(req.query);
    return ApiResponse.paginated(res, result);
  });

  getIssue = asyncHandler(async (req, res) => {
    const issue = await issueService.getIssueById(req.params.id);
    return ApiResponse.success(res, issue);
  });

  createIssue = asyncHandler(async (req, res) => {
    const issue = await issueService.createIssue(req.body);
    return ApiResponse.created(res, issue);
  });

  resolveIssue = asyncHandler(async (req, res) => {
    const issue = await issueService.resolveIssue(req.params.id, req.body);
    return ApiResponse.success(res, issue);
  });
}

export const issueController = new IssueController();
export default issueController;

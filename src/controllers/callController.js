import { callService } from '../services/callService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class CallController {
  /**
   * POST /api/calls/test
   * Accepts: { phone?: string, customerId?: string, customerName?: string }
   */
  initiateTestCall = asyncHandler(async (req, res) => {
    const call = await callService.initiateTestCall(req.body);
    return ApiResponse.created(res, call, 'Outbound test call initiated successfully');
  });

  /**
   * GET /api/calls/:id
   */
  getCall = asyncHandler(async (req, res) => {
    const call = await callService.getCallById(req.params.id);
    return ApiResponse.success(res, call);
  });

  /**
   * GET /api/calls
   */
  listCalls = asyncHandler(async (req, res) => {
    const result = await callService.listCalls(req.query);
    return ApiResponse.paginated(res, result);
  });
}

export const callController = new CallController();
export default callController;

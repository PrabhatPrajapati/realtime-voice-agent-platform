import { callService } from '../services/callService.js';

export class CallController {
  /**
   * POST /api/calls/test
   * Accepts: { phone?: string, customerId?: string, customerName?: string }
   */
  async initiateTestCall(req, res, next) {
    try {
      const call = await callService.initiateTestCall(req.body);
      res.status(201).json({
        success: true,
        data: call,
        message: 'Outbound test call initiated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/calls/:id
   */
  async getCall(req, res, next) {
    try {
      const call = await callService.getCallById(req.params.id);
      res.json({
        success: true,
        data: call,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/calls
   */
  async listCalls(req, res, next) {
    try {
      const result = await callService.listCalls(req.query);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const callController = new CallController();
export default callController;

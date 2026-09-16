import { customerService } from '../services/customerService.js';

export class CustomerController {
  async createCustomer(req, res, next) {
    try {
      const customer = await customerService.createOrUpdateCustomer(req.body);
      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCustomer(req, res, next) {
    try {
      const customer = await customerService.getCustomerById(req.params.id);
      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  async listCustomers(req, res, next) {
    try {
      const result = await customerService.listCustomers(req.query);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async setDoNotCall(req, res, next) {
    try {
      const customer = await customerService.setDoNotCall(req.params.id);
      res.json({
        success: true,
        data: customer,
        message: 'Customer status updated to DO_NOT_CALL',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
export default customerController;

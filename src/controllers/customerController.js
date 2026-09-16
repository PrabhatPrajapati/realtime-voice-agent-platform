import { customerService } from '../services/customerService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class CustomerController {
  createCustomer = asyncHandler(async (req, res) => {
    const customer = await customerService.createOrUpdateCustomer(req.body);
    return ApiResponse.created(res, customer);
  });

  getCustomer = asyncHandler(async (req, res) => {
    const customer = await customerService.getCustomerById(req.params.id);
    return ApiResponse.success(res, customer);
  });

  listCustomers = asyncHandler(async (req, res) => {
    const result = await customerService.listCustomers(req.query);
    return ApiResponse.paginated(res, result);
  });

  setDoNotCall = asyncHandler(async (req, res) => {
    const customer = await customerService.setDoNotCall(req.params.id);
    return ApiResponse.success(res, customer, 'Customer status updated to DO_NOT_CALL');
  });

  deleteCustomer = asyncHandler(async (req, res) => {
    await customerService.deleteCustomer(req.params.id);
    return ApiResponse.success(res, null, 'Customer deleted successfully');
  });
}

export const customerController = new CustomerController();
export default customerController;

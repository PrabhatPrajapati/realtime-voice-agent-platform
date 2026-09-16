import { customerRepository } from '../repositories/customerRepository.js';
import { logger } from '../config/logger.js';
import { CUSTOMER_STATUS } from '../constants/enums.js';

export class CustomerService {
  async getCustomerById(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      const error = new Error(`Customer with ID ${id} not found`);
      error.statusCode = 404;
      throw error;
    }
    return customer;
  }

  async createOrUpdateCustomer(data) {
    return customerRepository.upsertByPhone(data);
  }

  async listCustomers(params) {
    return customerRepository.findMany(params);
  }

  async setDoNotCall(id) {
    logger.info({ customerId: id }, 'Marking customer as DO_NOT_CALL');
    return customerRepository.updateStatus(id, CUSTOMER_STATUS.DO_NOT_CALL);
  }
}

export const customerService = new CustomerService();
export default customerService;

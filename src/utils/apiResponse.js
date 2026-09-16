/**
 * Standardized API Response Helper
 * Provides a clean and consistent JSON structure for REST API responses.
 */
export class ApiResponse {
  /**
   * Send a successful JSON response (default status 200)
   * @param {import('express').Response} res
   * @param {any} data
   * @param {string} [message]
   * @param {number} [statusCode=200]
   */
  static success(res, data, message, statusCode = 200) {
    const payload = { success: true };
    if (data !== undefined) payload.data = data;
    if (message) payload.message = message;
    return res.status(statusCode).json(payload);
  }

  /**
   * Send a resource created response (status 201)
   * @param {import('express').Response} res
   * @param {any} data
   * @param {string} [message]
   */
  static created(res, data, message) {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send a paginated response
   * @param {import('express').Response} res
   * @param {Object} paginatedResult - { items, total, page, limit, totalPages }
   */
  static paginated(res, paginatedResult) {
    return res.status(200).json({
      success: true,
      ...paginatedResult,
    });
  }
}

export default ApiResponse;

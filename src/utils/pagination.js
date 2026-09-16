/**
 * Pagination Helper Utility
 * Standardizes pagination parameter extraction and formatted results across repositories.
 */

/**
 * Extracts normalized skip and take pagination parameters.
 * @param {Object} params
 * @param {number|string} [params.page=1]
 * @param {number|string} [params.limit=20]
 * @returns {{ page: number, limit: number, skip: number, take: number }}
 */
export const getPaginationParams = ({ page = 1, limit = 20 } = {}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip,
    take: parsedLimit,
  };
};

/**
 * Formats a paginated query response.
 * @param {Object} params
 * @param {Array} params.items - List of records returned from DB query
 * @param {number} params.total - Total count of matching records
 * @param {number} params.page - Current page number
 * @param {number} params.limit - Number of items per page
 * @returns {{ items: Array, total: number, page: number, limit: number, totalPages: number }}
 */
export const formatPaginatedResult = ({ items, total, page, limit }) => ({
  items,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit) || 1,
});

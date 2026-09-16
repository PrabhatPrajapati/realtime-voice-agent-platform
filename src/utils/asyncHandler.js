/**
 * Higher-order function that wraps asynchronous Express route handlers
 * and passes any unhandled error to the next() middleware.
 *
 * @param {Function} fn - Async express route handler (req, res, next) => Promise<any>
 * @returns {Function} Express middleware handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;

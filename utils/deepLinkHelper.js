/**
 * 🔗 Deep Link Helper
 * 
 * Helper functions để đơn giản hóa việc implement deep linking
 * cho các controllers mới
 * 
 * @module utils/deepLinkHelper
 */

const queryParser = require('./queryParser');

/**
 * Wrapper function cho controller endpoints với deep linking support
 * 
 * @param {Function} serviceMethod - Service method để gọi (phải return { items, pagination })
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.allowedFilters - Whitelist của filters
 * @param {Array<string>} options.allowedSortFields - Whitelist của sort fields  
 * @param {number} options.maxLimit - Max items per page
 * @param {Object} options.defaults - Default values cho pagination/sort
 * @param {string} options.dataKey - Key name for data array (default: 'items')
 * @returns {Function} Express middleware function
 */
const withDeepLink = (serviceMethod, options = {}) => {
  const {
    allowedFilters = [],
    allowedSortFields = [],
    maxLimit = 100,
    defaults = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    },
    dataKey = 'items'
  } = options;

  return async (req, res) => {
    try {
      // Parse query params
      const parsed = queryParser.parseQuery(req.query, {
        allowedFilters,
        allowedSortFields,
        maxLimit,
        defaults
      });

      // Call service method
      const result = await serviceMethod({
        page: parsed.pagination.page,
        limit: parsed.pagination.limit,
        sortBy: parsed.metadata.sortBy,
        sortOrder: parsed.metadata.sortOrder,
        filter: parsed.filter,
        search: parsed.search,
        ...req.serviceParams // Additional params từ route
      });

      // Extract data và pagination từ result
      const data = result[dataKey] || result.data || [];
      const pagination = result.pagination || {
        page: parsed.pagination.page,
        limit: parsed.pagination.limit,
        total: data.length,
        pages: 1
      };

      // Build deep link response
      const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
      const response = queryParser.buildDeepLinkResponse(
        data,
        req.query,
        baseUrl,
        {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total
        },
        {
          filtersApplied: parsed.metadata.filtersApplied,
          search: parsed.search,
          viewState: parsed.viewState
        }
      );

      return res.json(response);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };
};

/**
 * Middleware để inject additional params vào service call
 * 
 * @param {Object} params - Params to inject
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/my', 
 *   authenticateAny,
 *   injectServiceParams({ userId: req => req.user.id }),
 *   withDeepLink(boardService.listBoardsForUser, {...})
 * );
 */
const injectServiceParams = (params) => {
  return (req, res, next) => {
    req.serviceParams = {};
    Object.keys(params).forEach(key => {
      const value = params[key];
      req.serviceParams[key] = typeof value === 'function' ? value(req) : value;
    });
    next();
  };
};

/**
 * Build repository query options từ parsed query
 * Helper để chuẩn hóa params giữa service và repository
 * 
 * @param {Object} options - Options từ service
 * @returns {Object} Repository query options
 */
const buildRepoOptions = (options) => {
  const { filter, search, page, limit, sortBy, sortOrder, ...extra } = options;
  
  return {
    page: page || 1,
    limit: limit || 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
    filter: filter || {},
    search: search || null,
    ...extra
  };
};

/**
 * Validate và convert ObjectId filters
 * 
 * @param {Object} filters - Filters object
 * @param {Array<string>} objectIdFields - Fields that should be ObjectIds
 * @returns {Object} Validated filters
 */
const validateObjectIdFilters = (filters, objectIdFields = []) => {
  return queryParser.validateObjectIdFields(filters, objectIdFields);
};

/**
 * Build search query cho MongoDB
 * 
 * @param {string} searchTerm - Search term
 * @param {Array<string>} searchFields - Fields to search in
 * @returns {Object} MongoDB $or query
 */
const buildSearchQuery = (searchTerm, searchFields = []) => {
  if (!searchTerm || searchFields.length === 0) return null;

  return {
    $or: searchFields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }))
  };
};

/**
 * Apply dynamic filters to match query
 * 
 * @param {Object} matchQuery - Base match query
 * @param {Object} filters - Filters to apply
 * @param {Array<string>} allowedFields - Allowed filter fields
 * @returns {Object} Updated match query
 */
const applyDynamicFilters = (matchQuery, filters, allowedFields = []) => {
  const query = { ...matchQuery };

  Object.keys(filters).forEach(key => {
    // Skip if not in allowed list (when whitelist provided)
    if (allowedFields.length > 0 && !allowedFields.includes(key)) {
      return;
    }

    query[key] = filters[key];
  });

  return query;
};

/**
 * Standard pagination response structure
 * 
 * @param {Array} items - Data items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Pagination response
 */
const buildPaginationResponse = (items, page, limit, total) => {
  const pages = Math.ceil(total / limit);
  
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    }
  };
};

/**
 * Extract filter summary for logging
 * 
 * @param {Object} parsedQuery - Parsed query from queryParser
 * @returns {string} Filter summary
 */
const getFilterSummary = (parsedQuery) => {
  return queryParser.getFilterSummary(parsedQuery);
};

module.exports = {
  withDeepLink,
  injectServiceParams,
  buildRepoOptions,
  validateObjectIdFilters,
  buildSearchQuery,
  applyDynamicFilters,
  buildPaginationResponse,
  getFilterSummary
};


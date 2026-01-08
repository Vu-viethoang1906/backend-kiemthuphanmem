/**
 * 🔍 Dynamic Query Parser for Deep Linking
 * 
 * Parses query parameters from req.query and builds:
 * - Dynamic filter object
 * - Sort configuration
 * - Pagination settings
 * - Metadata for response
 * 
 * @module utils/queryParser
 */

/**
 * Reserved keys that are not filters
 */
const RESERVED_KEYS = [
  'page',
  'limit',
  'sortBy',
  'sortOrder',
  'q',           // search query
  'from',        // date range start
  'to',          // date range end
  'view',        // view mode (kanban, list, etc.)
  'tab',         // active tab
  'expanded',    // expanded sections
  'selected',    // selected items
];

/**
 * Parse query parameters into structured filter, sort, pagination
 * 
 * @param {Object} query - req.query object
 * @param {Object} options - Additional options
 * @param {Array<string>} options.allowedFilters - Whitelist of allowed filter keys
 * @param {Array<string>} options.allowedSortFields - Whitelist of sortable fields
 * @param {number} options.maxLimit - Maximum items per page
 * @param {Object} options.defaults - Default values
 * @returns {Object} Parsed query with filter, sort, pagination, metadata
 */
exports.parseQuery = (query, options = {}) => {
  const {
    allowedFilters = null,      // null = allow all
    allowedSortFields = null,   // null = allow all
    maxLimit = 100,
    defaults = {
      page: 1,
      limit: 10,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  } = options;

  // ==================== PAGINATION ====================
  const page = Math.max(1, parseInt(query.page) || defaults.page);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(query.limit) || defaults.limit)
  );
  const skip = (page - 1) * limit;

  // ==================== SORT ====================
  let sortBy = query.sortBy || defaults.sortBy;
  let sortOrder = query.sortOrder || defaults.sortOrder;

  // Validate sort field if whitelist provided
  if (allowedSortFields && !allowedSortFields.includes(sortBy)) {
    sortBy = defaults.sortBy;
  }

  // Normalize sort order
  sortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // ==================== SEARCH ====================
  const search = query.q ? query.q.trim() : null;

  // ==================== DATE RANGE ====================
  const dateRange = {};
  if (query.from) {
    dateRange.from = new Date(query.from);
  }
  if (query.to) {
    dateRange.to = new Date(query.to);
  }

  // ==================== FILTERS ====================
  const filters = {};
  const filtersApplied = [];

  Object.keys(query).forEach(key => {
    // Skip reserved keys
    if (RESERVED_KEYS.includes(key)) {
      return;
    }

    // Skip if whitelist provided and key not in it
    if (allowedFilters && !allowedFilters.includes(key)) {
      return;
    }

    const value = query[key];

    // Handle multiple values (comma-separated)
    if (typeof value === 'string' && value.includes(',')) {
      filters[key] = { $in: value.split(',').map(v => v.trim()) };
      filtersApplied.push({ field: key, operator: 'in', value: value.split(',') });
    }
    // Handle boolean values
    else if (value === 'true' || value === 'false') {
      filters[key] = value === 'true';
      filtersApplied.push({ field: key, operator: 'eq', value: value === 'true' });
    }
    // Handle range operators (gte, lte, gt, lt)
    else if (typeof value === 'string' && value.match(/^(gte|lte|gt|lt):/)) {
      const [operator, val] = value.split(':');
      filters[key] = { [`$${operator}`]: isNaN(val) ? val : Number(val) };
      filtersApplied.push({ field: key, operator, value: val });
    }
    else if (typeof value === 'string' && value.startsWith('~')) {
      const regexPattern = value.substring(1);
      if (regexPattern.length > 100) {
        return;
      }
      try {
        new RegExp(regexPattern, 'i');
        filters[key] = { $regex: regexPattern, $options: 'i' };
        filtersApplied.push({ field: key, operator: 'regex', value: regexPattern });
      } catch (regexError) {
        return;
      }
    }
    // Default: exact match
    else {
      filters[key] = value;
      filtersApplied.push({ field: key, operator: 'eq', value });
    }
  });

  // ==================== VIEW STATE ====================
  const viewState = {
    view: query.view || null,
    tab: query.tab || null,
    expanded: query.expanded ? query.expanded.split(',') : [],
    selected: query.selected ? query.selected.split(',') : []
  };

  // ==================== METADATA ====================
  const metadata = {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    search,
    dateRange: Object.keys(dateRange).length > 0 ? dateRange : null,
    filtersApplied,
    viewState
  };

  return {
    filter: filters,
    sort,
    pagination: { page, limit, skip },
    search,
    dateRange,
    viewState,
    metadata
  };
};

/**
 * Build response with deep link support
 * 
 * @param {Object} data - The actual data to return
 * @param {Object} query - Original req.query
 * @param {string} baseUrl - Base URL for permalink
 * @param {Object} pagination - Pagination info { page, limit, total }
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Standardized response
 */
exports.buildDeepLinkResponse = (data, query, baseUrl, pagination, metadata = {}) => {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);

  // Build permalink with all query params
  const queryString = new URLSearchParams(query).toString();
  const permalink = queryString ? `${baseUrl}?${queryString}` : baseUrl;

  // Extract current state from query
  const state = {};
  Object.keys(query).forEach(key => {
    state[key] = query[key];
  });

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    state,
    permalink,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Build MongoDB query from parsed filters
 * 
 * @param {Object} filters - Parsed filters from parseQuery
 * @param {Object} searchFields - Fields to search in when query.q is present
 * @param {string} searchTerm - Search term from query.q
 * @returns {Object} MongoDB query object
 */
exports.buildMongoQuery = (filters, searchFields = [], searchTerm = null) => {
  const query = { ...filters };

  // Add search query if present
  if (searchTerm && searchFields.length > 0) {
    query.$or = searchFields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }));
  }

  return query;
};

/**
 * Validate ObjectId fields in filters
 * 
 * @param {Object} filters - Filter object
 * @param {Array<string>} objectIdFields - Fields that should be ObjectIds
 * @returns {Object} Validated filters
 */
exports.validateObjectIdFields = (filters, objectIdFields = []) => {
  const mongoose = require('mongoose');
  const validated = { ...filters };

  objectIdFields.forEach(field => {
    if (validated[field]) {
      // Handle array of IDs
      if (validated[field].$in) {
        validated[field].$in = validated[field].$in
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
      }
      // Handle single ID
      else if (mongoose.Types.ObjectId.isValid(validated[field])) {
        validated[field] = new mongoose.Types.ObjectId(validated[field]);
      } else {
        delete validated[field]; // Remove invalid ObjectId
      }
    }
  });

  return validated;
};

/**
 * Extract filter summary for logging/debugging
 * 
 * @param {Object} parsedQuery - Result from parseQuery
 * @returns {string} Human-readable filter summary
 */
exports.getFilterSummary = (parsedQuery) => {
  const { metadata, search, pagination } = parsedQuery;
  const parts = [];

  if (search) parts.push(`search="${search}"`);
  if (metadata.filtersApplied.length > 0) {
    parts.push(`filters=${metadata.filtersApplied.length}`);
  }
  parts.push(`page=${pagination.page}`);
  parts.push(`limit=${pagination.limit}`);
  parts.push(`sort=${metadata.sortBy}:${metadata.sortOrder}`);

  return parts.join(', ');
};

module.exports = exports;


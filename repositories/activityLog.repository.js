const ActivityLog = require("../models/activityLog.model");

class ActivityLogRepository {
  async create(data) {
    const activityLog = new ActivityLog(data);
    return activityLog.save();
  }

  async findById(id) {
    return ActivityLog.findById(id)
      .populate("user_id", "username email full_name")
      .exec();
  }

  /**
   * Tìm activity logs với filter và options
   * @param {Object} filter - Filter object { user_id, startDate, endDate, action, target_type }
   * @param {Object} options - Query options { sort, limit, skip }
   * @returns {Promise<Array>}
   */
  async find(filter = {}, options = {}) {
    const query = ActivityLog.find(filter);

    // Populate user info
    query.populate("user_id", "username email full_name");

    // Apply sorting (default: newest first)
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ created_at: -1 });
    }

    // Apply pagination
    if (options.limit) {
      query.limit(parseInt(options.limit));
    }
    if (options.skip) {
      query.skip(parseInt(options.skip));
    }

    return query.exec();
  }

  /**
   * Đếm số lượng activity logs theo filter
   * @param {Object} filter - Filter object
   * @returns {Promise<Number>}
   */
  async count(filter = {}) {
    return ActivityLog.countDocuments(filter).exec();
  }

  /**
   * Tìm activity logs với filter theo user và thời gian (tối ưu)
   * @param {Object} params - { user_id, startDate, endDate, action, target_type, page, limit }
   * @returns {Promise<Object>} - { data, total, page, limit, totalPages }
   */
  async findWithFilters(params = {}) {
    const {
      user_id,
      startDate,
      endDate,
      action,
      target_type,
      page = 1,
      limit = 20,
    } = params;

    // Build filter object
    const filter = {};

    // Filter by user_id
    if (user_id) {
      filter.user_id = user_id;
    }

    // Filter by date range (efficient with index on created_at)
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) {
        filter.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set endDate to end of day for inclusive filtering
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.created_at.$lte = end;
      }
    }

    // Filter by action
    if (action) {
      filter.action = action;
    }

    // Filter by target_type
    if (target_type) {
      filter.target_type = target_type;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute queries in parallel for better performance
    const [data, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("user_id", "username email full_name")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      ActivityLog.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page: parseInt(page),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async update(id, data) {
    return ActivityLog.findByIdAndUpdate(id, data, { new: true })
      .populate("user_id", "username email full_name")
      .exec();
  }

  async delete(id) {
    return ActivityLog.findByIdAndDelete(id).exec();
  }
}

module.exports = new ActivityLogRepository();

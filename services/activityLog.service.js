const activityLogRepo = require("../repositories/activityLog.repository");

class ActivityLogService {
  /**
   * Tạo activity log mới
   * @param {Object} data - { user_id, action, target_type, target_id }
   * @returns {Promise<Object>}
   */
  async createActivityLog(data) {
    const { user_id, action, target_type, target_id } = data;

    // Validate required fields
    if (!user_id) {
      throw new Error("user_id is required");
    }
    if (!action || typeof action !== "string") {
      throw new Error("action is required and must be a string");
    }
    if (action.length > 100) {
      throw new Error("action must not exceed 100 characters");
    }
    if (target_type && target_type.length > 50) {
      throw new Error("target_type must not exceed 50 characters");
    }

    return activityLogRepo.create(data);
  }

  /**
   * Lấy activity log theo ID
   * @param {String} id
   * @returns {Promise<Object>}
   */
  async getActivityLogById(id) {
    if (!id) {
      throw new Error("Activity log ID is required");
    }

    const result = await activityLogRepo.findById(id);
    if (!result) throw new Error("Activity log not found");
    return result;
  }

  /**
   * Lấy tất cả activity logs với filter và pagination
   * @param {Object} queryParams - Query parameters từ request
   * @returns {Promise<Object>}
   */
  async getAllActivityLogs(queryParams = {}) {
    // Validate và parse query parameters
    const {
      user_id,
      startDate,
      endDate,
      action,
      target_type,
      page = 1,
      limit = 20,
    } = queryParams;

    // Validate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1) {
      throw new Error("page must be greater than 0");
    }
    if (limitNum < 1 || limitNum > 100) {
      throw new Error("limit must be between 1 and 100");
    }

    // Validate date format
    if (startDate && isNaN(Date.parse(startDate))) {
      throw new Error("startDate must be a valid date");
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      throw new Error("endDate must be a valid date");
    }

    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new Error("startDate must be before or equal to endDate");
    }

    // Build filter params
    const filterParams = {
      user_id,
      startDate,
      endDate,
      action,
      target_type,
      page: pageNum,
      limit: limitNum,
    };

    // Remove undefined values
    Object.keys(filterParams).forEach(
      (key) => filterParams[key] === undefined && delete filterParams[key]
    );

    return activityLogRepo.findWithFilters(filterParams);
  }

  /**
   * Lấy activity logs với custom filter (cho backward compatibility)
   * @param {Object} filter
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async findActivityLogs(filter = {}, options = {}) {
    return activityLogRepo.find(filter, options);
  }

  /**
   * Đếm số lượng activity logs
   * @param {Object} filter
   * @returns {Promise<Number>}
   */
  async countActivityLogs(filter = {}) {
    return activityLogRepo.count(filter);
  }

  /**
   * Cập nhật activity log
   * @param {String} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateActivityLog(id, data) {
    if (!id) {
      throw new Error("Activity log ID is required");
    }

    if (data.action && typeof data.action !== "string") {
      throw new Error("action must be a string");
    }
    if (data.action && data.action.length > 100) {
      throw new Error("action must not exceed 100 characters");
    }
    if (data.target_type && data.target_type.length > 50) {
      throw new Error("target_type must not exceed 50 characters");
    }

    const updated = await activityLogRepo.update(id, data);
    if (!updated) throw new Error("Activity log not found");
    return updated;
  }

  /**
   * Xóa activity log
   * @param {String} id
   * @returns {Promise<Object>}
   */
  async deleteActivityLog(id) {
    if (!id) {
      throw new Error("Activity log ID is required");
    }

    const deleted = await activityLogRepo.delete(id);
    if (!deleted) throw new Error("Activity log not found");
    return deleted;
  }
}

module.exports = new ActivityLogService();


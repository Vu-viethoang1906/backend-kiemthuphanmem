const activityLogService = require("../services/activityLog.service");

class ActivityLogController {
  /**
   * Tạo activity log mới
   * POST /api/activityLogs
   */
  async create(req, res) {
    try {
      const result = await activityLogService.createActivityLog(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Lấy activity log theo ID
   * GET /api/activityLogs/:id
   */
  async getById(req, res) {
    try {
      const result = await activityLogService.getActivityLogById(req.params.id);
      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Activity log not found",
        });
      }
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Lấy tất cả activity logs với filter
   * GET /api/activityLogs?user_id=xxx&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=20
   */
  async getAll(req, res) {
    try {
      const result = await activityLogService.getAllActivityLogs(req.query);
      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Lấy activity logs theo user_id
   * GET /api/activityLogs/user/:userId
   */
  async getByUserId(req, res) {
    try {
      const { userId } = req.params;
      const { startDate, endDate, page = 1, limit = 20 } = req.query;

      const result = await activityLogService.getAllActivityLogs({
        user_id: userId,
        startDate,
        endDate,
        page,
        limit,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Lấy activity logs theo khoảng thời gian
   * GET /api/activityLogs/date-range?startDate=2024-01-01&endDate=2024-12-31
   */
  async getByDateRange(req, res) {
    try {
      const { startDate, endDate, user_id, page = 1, limit = 20 } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "startDate and endDate are required",
        });
      }

      const result = await activityLogService.getAllActivityLogs({
        user_id,
        startDate,
        endDate,
        page,
        limit,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Cập nhật activity log
   * PUT /api/activityLogs/:id
   */
  async update(req, res) {
    try {
      const result = await activityLogService.updateActivityLog(
        req.params.id,
        req.body
      );
      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Activity log not found",
        });
      }
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Xóa activity log
   * DELETE /api/activityLogs/:id
   */
  async delete(req, res) {
    try {
      const result = await activityLogService.deleteActivityLog(req.params.id);
      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Activity log not found",
        });
      }
      res.json({
        success: true,
        message: "Activity log deleted successfully",
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }
}

module.exports = new ActivityLogController();


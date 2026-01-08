const notificationPreferenceService = require('../services/notificationPreference.service');
const userActivityPatternService = require('../services/userActivityPattern.service');

class NotificationPreferenceController {
  /**
   * Get user notification preferences
   * GET /api/notification-preferences
   */
  async getPreferences(req, res) {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const preferences = await notificationPreferenceService.getPreferences(user_id);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy preferences',
      });
    }
  }

  /**
   * Update user notification preferences
   * PUT /api/notification-preferences
   */
  async updatePreferences(req, res) {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const {
        smart_scheduling_enabled,
        urgent_types,
        min_delay_minutes,
        max_delay_minutes,
        quiet_hours,
        active_days,
      } = req.body;

      const updateData = {};

      if (smart_scheduling_enabled !== undefined) {
        updateData.smart_scheduling_enabled = smart_scheduling_enabled;
      }

      if (urgent_types !== undefined) {
        updateData.urgent_types = urgent_types;
      }

      if (min_delay_minutes !== undefined) {
        updateData.min_delay_minutes = min_delay_minutes;
      }

      if (max_delay_minutes !== undefined) {
        updateData.max_delay_minutes = max_delay_minutes;
      }

      if (quiet_hours !== undefined) {
        updateData.quiet_hours = quiet_hours;
      }

      if (active_days !== undefined) {
        updateData.active_days = active_days;
      }

      const preferences = await notificationPreferenceService.updatePreferences(
        user_id,
        updateData
      );

      res.json({
        success: true,
        message: 'Cập nhật preferences thành công',
        data: preferences,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật preferences',
      });
    }
  }

  /**
   * Get user activity pattern
   * GET /api/notification-preferences/activity-pattern
   */
  async getActivityPattern(req, res) {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const pattern = await userActivityPatternService.getPattern(user_id);

      res.json({
        success: true,
        data: pattern,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy activity pattern',
      });
    }
  }

  /**
   * Trigger activity pattern analysis
   * POST /api/notification-preferences/analyze-activity
   */
  async analyzeActivity(req, res) {
    try {
      const user_id = req.user?.id;
      const { days } = req.body;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const pattern = await userActivityPatternService.analyzeUserActivity(user_id, days || 30);

      res.json({
        success: true,
        message: 'Phân tích activity pattern thành công',
        data: pattern,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi phân tích activity',
      });
    }
  }
}

module.exports = new NotificationPreferenceController();

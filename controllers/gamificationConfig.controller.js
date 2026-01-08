const gamificationConfigService = require("../services/gamificationConfig.service");

class GamificationConfigController {
  // Lấy cấu hình gamification
  async getConfig(req, res) {
    try {
      const config = await gamificationConfigService.getConfig();
      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Bật gamification
  async enable(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Không có quyền truy cập",
        });
      }

      const config = await gamificationConfigService.enable(userId);
      res.json({
        success: true,
        message: "Đã bật tính năng gamification",
        data: config,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Tắt gamification
  async disable(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Không có quyền truy cập",
        });
      }

      const config = await gamificationConfigService.disable(userId);
      res.json({
        success: true,
        message: "Đã tắt tính năng gamification",
        data: config,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Toggle (bật/tắt)
  async toggle(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Không có quyền truy cập",
        });
      }

      const config = await gamificationConfigService.toggle(userId);
      res.json({
        success: true,
        message: config.is_enabled
          ? "Đã bật tính năng gamification"
          : "Đã tắt tính năng gamification",
        data: config,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Cập nhật điểm thưởng
  async updatePoints(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Không có quyền truy cập",
        });
      }

      const { points_per_task, points_deduction } = req.body;

      if (
        points_per_task === undefined ||
        points_deduction === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "points_per_task và points_deduction là bắt buộc",
        });
      }

      if (points_per_task < 0 || points_deduction < 0) {
        return res.status(400).json({
          success: false,
          message: "Điểm thưởng và điểm trừ phải >= 0",
        });
      }

      const config = await gamificationConfigService.updatePoints(
        points_per_task,
        points_deduction,
        userId
      );

      res.json({
        success: true,
        message: "Cập nhật điểm thưởng thành công",
        data: config,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new GamificationConfigController();


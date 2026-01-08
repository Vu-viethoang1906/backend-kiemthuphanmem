const atRiskDetectionService = require('../services/atRiskDetection.service');
const activityLogService = require('../services/activityLog.service');

class AtRiskDetectionController {
  async detectAtRiskTasks(req, res) {
    try {
      const { board_id } = req.query;
      const userId = req.user?.id;

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'Phát hiện tasks có nguy cơ trễ hạn',
        target_type: 'AtRiskTask',
        target_id: board_id || null,
      });

      const atRiskTasks = await atRiskDetectionService.detectAtRiskTasks(board_id || null);

      res.json({
        success: true,
        message: `Phát hiện ${atRiskTasks.length} task(s) có nguy cơ trễ hạn`,
        data: atRiskTasks,
        count: atRiskTasks.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi phát hiện at-risk tasks',
      });
    }
  }

  async getAtRiskTasksByBoard(req, res) {
    try {
      const { board_id } = req.params;
      const userId = req.user?.id;

      const atRiskTasks = await atRiskDetectionService.getAtRiskTasksByBoard(board_id);

      res.json({
        success: true,
        data: atRiskTasks,
        count: atRiskTasks.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi lấy danh sách at-risk tasks',
      });
    }
  }

  async getAtRiskTasksByUser(req, res) {
    try {
      const userId = req.user?.id || req.params.user_id;

      const atRiskTasks = await atRiskDetectionService.getAtRiskTasksByUser(userId);

      res.json({
        success: true,
        data: atRiskTasks,
        count: atRiskTasks.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi lấy danh sách at-risk tasks',
      });
    }
  }

  async markAsResolved(req, res) {
    try {
      const { task_id } = req.params;
      const userId = req.user?.id;

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'Đánh dấu task không còn nguy cơ trễ hạn',
        target_type: 'AtRiskTask',
        target_id: task_id,
      });

      const result = await atRiskDetectionService.markTaskAsResolved(task_id);

      res.json({
        success: true,
        message: 'Đã đánh dấu task không còn nguy cơ trễ hạn',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi đánh dấu task',
      });
    }
  }
}

module.exports = new AtRiskDetectionController();

const taskMatchingAIService = require('../services/taskMatchingAI.service');
const activityLogService = require('../services/activityLog.service');

class AIController {
  /**
   * Suggest best users for task assignment
   * POST /ai/tasks/:taskId/suggest-assignments
   */
  async suggestAssignments(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      const { taskId } = req.params;
      const { board_id } = req.query;
      const limit = parseInt(req.query.limit) || 5;

      if (!board_id) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu board_id trong query params',
        });
      }

      if (!taskId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu taskId',
        });
      }

      const result = await taskMatchingAIService.suggestAssignments(taskId, board_id, limit);

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã xem AI suggestions cho task assignment',
        target_type: 'Task',
        target_id: taskId,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi gợi ý assignment',
      });
    }
  }

  /**
   * Auto-assign task to best matching user
   * POST /ai/tasks/:taskId/auto-assign
   */
  async autoAssignTask(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      const { taskId } = req.params;
      const { board_id } = req.query;

      if (!board_id) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu board_id trong query params',
        });
      }

      if (!taskId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu taskId',
        });
      }

      const result = await taskMatchingAIService.autoAssignTask(taskId, board_id);

      await activityLogService.createActivityLog({
        user_id: userId,
        action: `đã auto-assign task cho ${result.assigned_user.full_name || result.assigned_user.username}`,
        target_type: 'Task',
        target_id: taskId,
      });

      return res.json({
        success: true,
        message: 'Đã tự động assign task thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi auto-assign task',
      });
    }
  }

  /**
   * Suggest due date for a task
   * POST /ai/tasks/:taskId/suggest-due-date
   */
  async suggestDueDate(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      const { taskId } = req.params;
      const { board_id } = req.query;

      if (!board_id) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu board_id trong query params',
        });
      }

      if (!taskId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu taskId',
        });
      }

      const result = await taskMatchingAIService.suggestDueDate(taskId, board_id);

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã xem AI đề xuất due_date cho task',
        target_type: 'Task',
        target_id: taskId,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi gợi ý due_date',
      });
    }
  }

  /**
   * Suggest tags for a task
   * POST /ai/tasks/:taskId/suggest-tags
   */
  async suggestTags(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      const { taskId } = req.params;
      const { board_id } = req.query;
      const limit = parseInt(req.query.limit) || 5;

      if (!board_id) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu board_id trong query params',
        });
      }

      if (!taskId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu taskId',
        });
      }

      const result = await taskMatchingAIService.suggestTags(taskId, board_id, limit);

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã xem AI gợi ý tags cho task',
        target_type: 'Task',
        target_id: taskId,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi gợi ý tags',
      });
    }
  }

  /**
   * Auto-apply tags for a task
   * POST /ai/tasks/:taskId/auto-tags
   */
  async autoApplyTags(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      const { taskId } = req.params;
      const { board_id } = req.query;
      const limit = parseInt(req.query.limit) || 5;

      if (!board_id) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu board_id trong query params',
        });
      }

      if (!taskId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu taskId',
        });
      }

      const result = await taskMatchingAIService.autoApplyTags(taskId, board_id, limit);

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã auto-apply AI tags cho task',
        target_type: 'Task',
        target_id: taskId,
      });

      return res.json({
        success: true,
        message: 'Đã gắn tags tự động',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi auto gắn tags',
      });
    }
  }
}

module.exports = new AIController();

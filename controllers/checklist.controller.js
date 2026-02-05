const Checklist = require('../models/checklist.model');
const Task = require('../models/task.model');
const activityLogService = require('../services/activityLog.service');

class ChecklistController {
  // Lấy danh sách checklist của task
  async getByTask(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user?.id;

      // Validate task exists
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task không tồn tại',
        });
      }

      const checklists = await Checklist.find({ task_id: taskId })
        .sort({ position: 1 })
        .populate('created_by', 'name email avatar');

      const totalItems = checklists.length;
      const completedItems = checklists.filter(c => c.is_completed).length;

      res.json({
        success: true,
        data: {
          items: checklists,
          progress: {
            completed: completedItems,
            total: totalItems,
            percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
          },
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Tạo checklist item mới
  async create(req, res) {
    try {
      const userId = req.user?.id;
      const { taskId } = req.params;
      const { title } = req.body;

      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Title là bắt buộc',
        });
      }

      // Validate task exists
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task không tồn tại',
        });
      }

      // Get max position
      const maxPosition = await Checklist.findOne({ task_id: taskId })
        .sort({ position: -1 })
        .select('position');

      const newPosition = (maxPosition?.position || 0) + 1;

      const checklist = new Checklist({
        task_id: taskId,
        title: title.trim(),
        created_by: userId,
        position: newPosition,
      });

      await checklist.save();
      await checklist.populate('created_by', 'name email avatar');

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã thêm checklist item',
        target_type: 'Task',
        target_id: taskId,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo checklist item thành công',
        data: checklist,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Cập nhật checklist item
  async update(req, res) {
    try {
      const userId = req.user?.id;
      const { checklistId } = req.params;
      const { title, is_completed } = req.body;

      // Validate checklist exists
      const checklist = await Checklist.findById(checklistId);
      if (!checklist) {
        return res.status(404).json({
          success: false,
          message: 'Checklist item không tồn tại',
        });
      }

      // Update fields
      if (title !== undefined && title.trim() !== '') {
        checklist.title = title.trim();
      }

      if (is_completed !== undefined) {
        checklist.is_completed = Boolean(is_completed);
      }

      await checklist.save();
      await checklist.populate('created_by', 'name email avatar');

      await activityLogService.createActivityLog({
        user_id: userId,
        action: `đã cập nhật checklist item${is_completed !== undefined ? ` - ${is_completed ? 'hoàn thành' : 'chưa hoàn thành'}` : ''}`,
        target_type: 'Task',
        target_id: checklist.task_id,
      });

      res.json({
        success: true,
        message: 'Cập nhật checklist item thành công',
        data: checklist,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Xóa checklist item
  async delete(req, res) {
    try {
      const userId = req.user?.id;
      const { checklistId } = req.params;

      const checklist = await Checklist.findById(checklistId);
      if (!checklist) {
        return res.status(404).json({
          success: false,
          message: 'Checklist item không tồn tại',
        });
      }

      const taskId = checklist.task_id;

      // Soft delete
      checklist.deleted_at = new Date();
      await checklist.save();

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã xóa checklist item',
        target_type: 'Task',
        target_id: taskId,
      });

      res.json({
        success: true,
        message: 'Xóa checklist item thành công',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Cập nhật thứ tự checklist items
  async reorder(req, res) {
    try {
      const userId = req.user?.id;
      const { taskId } = req.params;
      const { items } = req.body; // Array of { id, position }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Items là bắt buộc',
        });
      }

      // Update positions
      const updatePromises = items.map(item =>
        Checklist.findByIdAndUpdate(item.id, { position: item.position }, { new: true })
      );

      await Promise.all(updatePromises);

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã thay đổi thứ tự checklist',
        target_type: 'Task',
        target_id: taskId,
      });

      res.json({
        success: true,
        message: 'Cập nhật thứ tự checklist thành công',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Toggle completion status
  async toggle(req, res) {
    try {
      const userId = req.user?.id;
      const { checklistId } = req.params;

      const checklist = await Checklist.findById(checklistId);
      if (!checklist) {
        return res.status(404).json({
          success: false,
          message: 'Checklist item không tồn tại',
        });
      }

      checklist.is_completed = !checklist.is_completed;
      await checklist.save();
      await checklist.populate('created_by', 'name email avatar');

      await activityLogService.createActivityLog({
        user_id: userId,
        action: `đã đánh dấu checklist item ${checklist.is_completed ? 'hoàn thành' : 'chưa hoàn thành'}`,
        target_type: 'Task',
        target_id: checklist.task_id,
      });

      res.json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
        data: checklist,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new ChecklistController();

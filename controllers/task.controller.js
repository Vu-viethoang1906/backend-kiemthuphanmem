const taskService = require('../services/task.service');
const Task = require('../models/task.model');
const taskTag = require('../repositories/taskTag.repository');
const taskTagRepo = require('../repositories/taskTag.repository');
const queryParser = require('../utils/queryParser');
const { sendMail } = require('../config/mailer');
const activityLogService = require('../services/activityLog.service');
class TaskController {
  // Tạo task mới
  async create(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      const taskData = req.body;
      const task = await taskService.createTask(taskData, userId);
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã tạo task mới',
        target_type: 'Task',
        target_id: task._id,
      });
      // nếu gửi cả tag theo dạng tên task thì gán vào luôn
      if (taskData.nameTag) {
        await taskTag.addTag(taskData.nameTag, task._id);
      }

      res.status(201).json({
        success: true,
        message: 'Tạo task thành công',
        data: task,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy task theo ID
  async getById(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const task = await taskService.getTaskById(id);
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã lấy chi tiết task',
        target_type: 'Task',
        target_id: task._id,
      });
      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tất cả tasks của board với deep linking
  async getByBoard(req, res) {
    try {
      const { board_id } = req.params;
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã lấy danh sách task theo board',
        target_type: 'Board',
        target_id: board_id,
      });
      // Parse query params với queryParser
      const parsed = queryParser.parseQuery(req.query, {
        allowedFilters: [
          'column_id',
          'swimlane_id',
          'assigned_to',
          'created_by',
          'priority',
          'assigned_to',
        ],
        allowedSortFields: ['position', 'created_at', 'due_date', 'priority', 'title'],
        maxLimit: 200,
        defaults: {
          page: 1,
          limit: 50,
          sortBy: 'position',
          sortOrder: 'asc',
        },
      });

      // Validate ObjectId filters
      const validatedFilter = queryParser.validateObjectIdFields(parsed.filter, [
        'column_id',
        'swimlane_id',
        'assigned_to',
        'created_by',
      ]);

      // Get tasks from service
      const result = await taskService.getTasksByBoard(board_id, {
        page: parsed.pagination.page,
        limit: parsed.pagination.limit,
        sortBy: parsed.metadata.sortBy,
        sortOrder: parsed.metadata.sortOrder,
        filter: validatedFilter,
        search: parsed.search,
        dateRange: parsed.dateRange,
      });

      // Build deep link response
      const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
      const response = queryParser.buildDeepLinkResponse(
        result.tasks,
        req.query,
        baseUrl,
        {
          page: parsed.pagination.page,
          limit: parsed.pagination.limit,
          total: result.pagination.total,
        },
        {
          filtersApplied: parsed.metadata.filtersApplied,
          search: parsed.search,
          viewState: parsed.viewState,
          dateRange: parsed.dateRange,
        }
      );

      res.json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tasks của column
  async getByColumn(req, res) {
    try {
      const { column_id } = req.params;
      const tasks = await taskService.getTasksByColumn(column_id);
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã lấy danh sách task theo column',
        target_type: 'Column',
        target_id: column_id,
      });
      res.json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tasks được assign cho user hiện tại
  async getMyTasks(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      const tasks = await taskService.getTasksByUser(userId);

      res.json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tasks của user theo ID (admin hoặc chính mình)
  async getByUser(req, res) {
    try {
      const { user_id } = req.params;
      const currentUserId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: currentUserId,
        action: `đã lấy danh sách task của user ${user_id}`,
        target_type: 'User',
        target_id: user_id,
      });
      // Kiểm tra quyền: chỉ admin hoặc chính user đó mới xem được
      if (currentUserId !== user_id) {
        // TODO: Kiểm tra role admin ở đây nếu cần
      }

      const tasks = await taskService.getTasksByUser(user_id);

      res.json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Cập nhật task
  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updateData = req.body;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã cập nhật task',
        target_type: 'Task',
        target_id: id,
      });
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      // 1️⃣ Cập nhật thông tin cơ bản của task
      const updatedTask = await taskService.updateTask(id, updateData, userId);

      // 2️⃣ Nếu có gửi kèm tag → xử lý thêm
      if (updateData.nameTag) {
        // tìm tag cũ của nó
        const existingTags = await taskTagRepo.findByTaskId(id);

        // Nếu mỗi task chỉ có 1 tag → xóa tag cũ trước
        await taskTagRepo.deleteByTaskId(id);

        // Sau đó thêm tag mới
        await taskTagRepo.addTag(updateData.nameTag, id);
      }

      res.json({
        success: true,
        message: 'Cập nhật task thành công',
        data: updatedTask,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Xóa task
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      await taskService.deleteTask(id, userId);
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã xóa task',
        target_type: 'Task',
        target_id: id,
      });
      res.json({
        success: true,
        message: 'Xóa task thành công',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Kéo thả task (drag & drop) - Story 16
  async moveTask(req, res) {
    try {
      const { id } = req.params;
      const { new_column_id, new_swimlane_id, prev_task_id, next_task_id } = req.body;
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã di chuyển task',
        target_type: 'Task',
        target_id: id,
      });

      if (!userId)
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });

      const movedTask = await taskService.moveTask(
        id,
        new_column_id,
        prev_task_id,
        next_task_id,
        new_swimlane_id,
        userId
      );

      res.json({
        success: true,
        message: 'Di chuyển task thành công',
        data: movedTask,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Tìm kiếm tasks
  async search(req, res) {
    try {
      const { board_id } = req.params;
      const { q: searchQuery } = req.query;
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: `đã tìm kiếm task với từ khóa: ${searchQuery}`,
        target_type: 'Board',
        target_id: board_id,
      });
      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          message: 'Từ khóa tìm kiếm là bắt buộc',
        });
      }

      const tasks = await taskService.searchTasks(board_id, searchQuery);

      res.json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Thống kê tasks theo board
  async getStats(req, res) {
    try {
      const { board_id } = req.params;
      const stats = await taskService.getTaskStats(board_id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Cập nhật ngày bắt đầu/kết thúc - Story 21
  async updateDates(req, res) {
    try {
      const { id } = req.params;
      const { start_date, due_date } = req.body;
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã cập nhật ngày bắt đầu/kết thúc của task',
        target_type: 'Task',
        target_id: id,
      });
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      const updatedTask = await taskService.updateTask(id, { start_date, due_date }, userId);

      res.json({
        success: true,
        message: 'Cập nhật ngày thành công',
        data: updatedTask,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Cập nhật thời gian ước tính - Story 22
  async updateEstimate(req, res) {
    try {
      const { id } = req.params;
      const { estimate_hours } = req.body;
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã cập nhật thời gian ước tính của task',
        target_type: 'Task',
        target_id: id,
      });
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      if (estimate_hours === undefined || estimate_hours === null) {
        return res.status(400).json({
          success: false,
          message: 'estimate_hours là bắt buộc',
        });
      }

      const updatedTask = await taskService.updateTask(id, { estimate_hours }, userId);

      res.json({
        success: true,
        message: 'Cập nhật thời gian ước tính thành công',
        data: updatedTask,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // controllers/task.controller.js

  // Lấy task theo board_id và column_id
  async getByBoardAndColumn(req, res) {
    try {
      const { board_id, column_id } = req.params;
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã lấy danh sách task theo column trong board',
        target_type: 'Column',
        target_id: column_id,
      });
      const tasks = await Task.find({
        board_id,
        column_id,
        deleted_at: null, // nếu bạn lưu soft delete
      })
        .populate('created_by', 'username full_name')
        .populate('assigned_to', 'username full_name')
        .populate('swimlane_id', 'name');

      tasks.sort((a, b) => {
        if (a.swimlane_id.name < b.swimlane_id.name) return -1;
        if (a.swimlane_id.name > b.swimlane_id.name) return 1;
        return a.position - b.position; // cùng swimlane thì sort theo position
      });
      res.json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy task theo column trong board',
      });
    }
  }

  async getDataLineChart(req, res) {
    const idBoard = req.params.board_id;
    if (!idBoard) {
      return res.status(400).json({ success: false, message: 'board_id là bắt buộc' });
    }

    try {
      const result = await taskService.getData(idBoard);
      res.json({ success: true, data: result });
    } catch (error) {
      // nếu dùng TypeScript
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy task theo column trong board',
        error: error.message || error.toString(), // in chi tiết lỗi ra client
      });
    }
  }

  // Lấy lịch sử thêm sửa xóa task thay đổi của một task
  async getTaskHistory(req, res) {
    try {
      const { id } = req.params;

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      const history = await taskService.getTaskHistory(id, userId);

      res.json({
        success: true,
        count: history.length,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy lịch sử task',
        error: error.message || error.toString(),
      });
    }
  }

  async uploadAttachment(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã tải lên file đính kèm cho task',
        target_type: 'Task',
        target_id: taskId,
      });
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Chưa có file đính kèm' });
      }

      const attachment = await taskService.addAttachment(taskId, req.file, userId);

      res.status(201).json({
        success: true,
        message: 'Tải lên file đính kèm thành công',
        data: attachment,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getAttachments(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã lấy danh sách file đính kèm của task',
        target_type: 'Task',
        target_id: taskId,
      });
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }
      const task = await taskService.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
      }

      const attachments = task.attachments || [];
      res.json({
        success: true,
        data: attachments,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteAttachment(req, res) {
    try {
      const { taskId } = req.params;
      // Hỗ trợ cả query parameter và body
      const attachmentIndex = req.query.attachmentIndex || req.body.attachmentIndex;
      const userId = req.user?.id;
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã xóa file đính kèm của task',
        target_type: 'Task',
        target_id: taskId,
      });

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      if (attachmentIndex === undefined || attachmentIndex === null) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin attachment index',
        });
      }

      const result = await taskService.deleteAttachment(taskId, parseInt(attachmentIndex), userId);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ⭐ Toggle star/favorite task
  async toggleStar(req, res) {
    try {
      const userId = req.user?.id;
      const { id: taskId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      if (!taskId) {
        return res.status(400).json({ success: false, message: 'Task ID không hợp lệ' });
      }

      const result = await taskService.toggleStar(taskId, userId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ⭐ Lấy danh sách task đã được star bởi user hiện tại
  async getStarredTasks(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      const tasks = await taskService.getStarredTasks(userId);
      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new TaskController();

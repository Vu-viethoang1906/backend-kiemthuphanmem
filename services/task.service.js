const taskRepo = require('../repositories/task.repository');
const boardRepo = require('../repositories/board.repository');
const columnRepo = require('../repositories/column.repository');
const columnService = require('../services/column.service');
const swimlaneRepo = require('../repositories/swimlane.repository');
const userService = require('../services/user.service');
const boardMemberRepo = require('../repositories/boardMember.repository');
const userRepo = require('../repositories/user.repository');
const CenterMemberRepo = require('../repositories/centerMember.repo');
const userPointRepo = require('../repositories/userPoint.repository');
const notificationService = require('../services/notification.service');
const { sendNotificationToAll } = require('../config/sendNotify');
const { sendNotification } = require('../config/socket');
const googleCalendarService = require('../services/googleCalendar.service');
const logger = require('../utils/logger');
const slackService = require('../services/slack.service');
const mongoose = require('mongoose');
const historyTaskService = require('../services/historyTask.service');
const multer = require('multer');
const gamificationConfigService = require('../services/gamificationConfig.service');
const atRiskDetectionService = require('../services/atRiskDetection.service');
class TaskService {
  // Helper: Calculate isOverdue for a task
  _calculateIsOverdue(task, column) {
    // Nếu không có due_date → không overdue
    if (!task.due_date) return false;

    // Nếu column là Done → không overdue
    if (column && column.isDoneColumn === true) return false;

    // So sánh due_date với current date
    const dueDate = new Date(task.due_date);
    const now = new Date();

    // Overdue nếu due_date < now
    return dueDate < now;
  }

  // Helper: Enrich tasks with isOverdue flag
  async _enrichTasksWithOverdue(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) return [];

    // Get all column IDs
    const columnIds = [...new Set(tasks.map(t => t.column_id?._id || t.column_id).filter(Boolean))];

    // Fetch all columns at once
    const columns = await columnRepo.findById.bind(columnRepo);
    const columnMap = {};

    for (const colId of columnIds) {
      try {
        const col = await columnRepo.findById(colId);
        if (col) columnMap[colId.toString()] = col;
      } catch (err) {
        // Skip invalid columns
      }
    }

    // Enrich each task
    return tasks.map(task => {
      const taskObj = task.toObject ? task.toObject() : task;
      const columnId = taskObj.column_id?._id || taskObj.column_id;
      const column = columnMap[columnId?.toString()];

      return {
        ...taskObj,
        isOverdue: this._calculateIsOverdue(taskObj, column),
      };
    });
  }

  // Tạo task mới
  async createTask(taskData, userId) {
    try {
      // Validate required fields
      if (!taskData.board_id) throw new Error('board_id là bắt buộc');
      if (!taskData.column_id) throw new Error('column_id là bắt buộc');
      if (!taskData.title) throw new Error('title là bắt buộc');

      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(taskData.board_id)) {
        throw new Error('board_id không hợp lệ');
      }
      if (!mongoose.Types.ObjectId.isValid(taskData.column_id)) {
        throw new Error('column_id không hợp lệ');
      }
      if (taskData.swimlane_id && !mongoose.Types.ObjectId.isValid(taskData.swimlane_id)) {
        throw new Error('swimlane_id không hợp lệ');
      }
      if (taskData.assigned_to && !mongoose.Types.ObjectId.isValid(taskData.assigned_to)) {
        throw new Error('assigned_to không hợp lệ');
      }

      // Kiểm tra board tồn tại
      const board = await boardRepo.findById(taskData.board_id);
      if (!board) throw new Error('Board không tồn tại');

      // Kiểm tra user là thành viên của board
      const isMember = await boardRepo.isMember(userId, taskData.board_id);
      if (!isMember) throw new Error('Bạn không có quyền thao tác trên board này');

      // kiểm tra user có quyền trong board hoặc là người tạo hoặc là thành viên
      const isRoleMember = await boardRepo.isRoleMember(userId, taskData.board_id);
      const isCreatorFromMember = await boardRepo.isCreatorFromMember(userId, taskData.board_id);

      if (!isRoleMember && !isCreatorFromMember)
        throw new Error('Bạn không có quyền thao tác trên board này');

      // Kiểm tra column thuộc board
      const column = await columnRepo.findById(taskData.column_id);
      if (!column || column.board_id.toString() !== taskData.board_id) {
        throw new Error('Column không thuộc board này');
      }

      // Kiểm tra swimlane nếu có
      if (taskData.swimlane_id) {
        const swimlane = await swimlaneRepo.findById(taskData.swimlane_id);
        if (!swimlane || swimlane.board_id.toString() !== taskData.board_id) {
          throw new Error('Swimlane không thuộc board này');
        }
      }

      // Validate dates và datetime
      if (taskData.start_date || taskData.due_date) {
        // Parse dates - hỗ trợ cả date và datetime
        let startDate = null;
        let dueDate = null;

        if (taskData.start_date) {
          // Loại bỏ string "Invalid Date" hoặc empty string
          if (taskData.start_date === 'Invalid Date' || taskData.start_date === '' || taskData.start_date === null) {
            taskData.start_date = undefined;
          } else {
          startDate = new Date(taskData.start_date);
          if (isNaN(startDate.getTime())) {
            throw new Error('Ngày bắt đầu không hợp lệ');
            }
          }
        }

        if (taskData.due_date) {
          // Loại bỏ string "Invalid Date" hoặc empty string
          if (taskData.due_date === 'Invalid Date' || taskData.due_date === '' || taskData.due_date === null) {
            taskData.due_date = undefined;
          } else {
          dueDate = new Date(taskData.due_date);
          if (isNaN(dueDate.getTime())) {
            throw new Error('Ngày kết thúc không hợp lệ');
            }
          }
        }

        // Validate: start_date phải <= due_date (bao gồm cả time)
        if (startDate && dueDate && startDate > dueDate) {
          throw new Error('Ngày giờ bắt đầu phải nhỏ hơn hoặc bằng ngày giờ kết thúc');
        }
      }

      // Validate estimate_hours
      if (taskData.estimate_hours && taskData.estimate_hours < 0) {
        throw new Error('Thời gian ước tính phải lớn hơn 0');
      }
      let position = 0;
      const tasksInColumn = await taskRepo.findByColumn(taskData.column_id);
      if (tasksInColumn.length > 0) {
        const lastTask = tasksInColumn[tasksInColumn.length - 1];
        position = lastTask.position + 10;
      }
      // Tạo task
      const newTaskData = {
        ...taskData,
        position,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const createdTask = await taskRepo.create(newTaskData);
      // tạo history task
      await historyTaskService.createHistoryTask({
        task_id: createdTask._id,
        changed_by: userId,
        change_type: `Đã tạo mới task ${createdTask.title}`,
      });

      if (taskData.assigned_to) {
        try {
          const assignedUserId = taskData.assigned_to.toString();
          // Kiểm tra sync filter trước khi sync
          const shouldSync = await googleCalendarService.shouldSync(createdTask, assignedUserId);
          if (shouldSync) {
            const eventId = await googleCalendarService.findEventByTaskId(
              createdTask._id.toString(),
              assignedUserId
            );
            if (!eventId) {
              await googleCalendarService.createCalendarEvent(createdTask, assignedUserId);
            }
          }
        } catch (calendarError) {
          // Log error nhưng không throw để không ảnh hưởng đến việc tạo task
          logger.warn(
            `Google Calendar: Lỗi khi sync task mới ${createdTask._id}: ${calendarError.message}`
          );
        }
      }

      return createdTask;
    } catch (error) {
      throw new Error(`Lỗi tạo task: ${error.message}`);
    }
  }

  // Lấy task theo ID
  async getTaskById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Task ID không hợp lệ');
    }

    const task = await taskRepo.findById(id);
    if (!task) throw new Error('Task không tồn tại');

    return task;
  }

  // Lấy lịch sử thay đổi của một task
  async getTaskHistory(taskId, userId) {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new Error('Task ID không hợp lệ');
    }

    // Bắt buộc phải có userId để kiểm tra quyền
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('User ID không hợp lệ');
    }

    // Lấy task để biết board_id
    const task = await taskRepo.findById(taskId);
    if (!task) {
      throw new Error('Task không tồn tại');
    }

    const boardId =
      task.board_id?._id?.toString?.() || task.board_id?.toString?.() || task.board_id;

    // Kiểm tra user là member của board
    const isMember = await boardRepo.isMember(userId, boardId);
    if (!isMember) {
      throw new Error('Bạn không có quyền xem lịch sử của task này');
    }

    // Lấy lịch sử từ HistoryTask
    const history = await historyTaskService.getAllHistoryTasks(
      { task_id: taskId },
      { sort: { createdAt: -1 } }
    );

    return history;
  }

  // Lấy tasks của board
  async getTasksByBoard(board_id, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('Board ID không hợp lệ');
    }

    return await taskRepo.findByBoard(board_id, options);
  }

  // Lấy tasks của column
  async getTasksByColumn(column_id) {
    if (!mongoose.Types.ObjectId.isValid(column_id)) {
      throw new Error('Column ID không hợp lệ');
    }

    const tasks = await taskRepo.findByColumn(column_id);

    // Enrich with isOverdue flag
    return await this._enrichTasksWithOverdue(tasks);
  }

  // Lấy tasks của user (assigned)
  async getTasksByUser(user_id) {
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      throw new Error('User ID không hợp lệ');
    }

    const tasks = await taskRepo.findByAssignedUser(user_id);

    // Enrich with isOverdue flag
    return await this._enrichTasksWithOverdue(tasks);
  }

  // Cập nhật task
  async updateTask(id, updateData, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Task ID không hợp lệ');
      }

      // 1️⃣ Lấy task hiện tại
      const existingTask = await taskRepo.findById(id);
      if (!existingTask) throw new Error('Task không tồn tại');

      // 2️⃣ Check quyền
      const isMember = await boardRepo.isMember(
        userId,
        existingTask.board_id._id?.toString?.() || existingTask.board_id.toString()
      );
      if (!isMember) throw new Error('Bạn không có quyền thao tác trên board này');

      // 3️⃣ Không cho sửa task Done
      const currentColumn = await columnRepo.findById(existingTask.column_id);
      if (currentColumn?.isDone) {
        throw new Error('Task đang ở cột hoàn thành (Done), không thể chỉnh sửa');
      }

      // 4️⃣ Validate column_id
      if (updateData.column_id) {
        if (!mongoose.Types.ObjectId.isValid(updateData.column_id)) {
          throw new Error('column_id không hợp lệ');
        }

        const newColumn = await columnRepo.findById(updateData.column_id);
        if (!newColumn || newColumn.board_id.toString() !== existingTask.board_id.toString()) {
          throw new Error('Column không thuộc board này');
        }
      }

      // 5️⃣ Validate swimlane
      if (updateData.swimlane_id) {
        if (!mongoose.Types.ObjectId.isValid(updateData.swimlane_id)) {
          throw new Error('swimlane_id không hợp lệ');
        }

        const swimlane = await swimlaneRepo.findById(updateData.swimlane_id);
        if (!swimlane || swimlane.board_id.toString() !== existingTask.board_id.toString()) {
          throw new Error('Swimlane không thuộc board này');
        }
      }

      // 6️⃣ Kiểm tra logic ngày giờ bắt đầu và kết thúc
      if (updateData.start_date || updateData.due_date) {
        let startDate = null;
        let dueDate = null;

        // Parse start_date
        if (updateData.start_date) {
          // Loại bỏ string "Invalid Date" hoặc empty string
          if (updateData.start_date === 'Invalid Date' || updateData.start_date === '' || updateData.start_date === null) {
            updateData.start_date = undefined;
          } else {
          startDate = new Date(updateData.start_date);
          if (isNaN(startDate.getTime())) {
            throw new Error('Ngày giờ bắt đầu không hợp lệ');
            }
          }
        } else if (existingTask.start_date) {
          startDate = new Date(existingTask.start_date);
        }

        // Parse due_date
        if (updateData.due_date) {
          // Loại bỏ string "Invalid Date" hoặc empty string
          if (updateData.due_date === 'Invalid Date' || updateData.due_date === '' || updateData.due_date === null) {
            updateData.due_date = undefined;
          } else {
          dueDate = new Date(updateData.due_date);
          if (isNaN(dueDate.getTime())) {
            throw new Error('Ngày giờ kết thúc không hợp lệ');
            }
          }
        } else if (existingTask.due_date) {
          dueDate = new Date(existingTask.due_date);
        }

        // Validate: start_date phải <= due_date (bao gồm cả time)
        if (startDate && dueDate && startDate > dueDate) {
          throw new Error('Ngày giờ bắt đầu phải nhỏ hơn hoặc bằng ngày giờ kết thúc');
        }
      }

      // 7️⃣ Validate giờ Estimate
      if (updateData.estimate_hours !== undefined && updateData.estimate_hours < 0) {
        throw new Error('Thời gian ước tính phải lớn hơn 0');
      }

      // 8️⃣ Nếu có thay đổi người được giao -> gửi thông báo
      if (updateData.assigned_to) {
        const data = {
          user_id: updateData.assigned_to,
          title: `bạn vừa được giao nhiệm vụ: ${existingTask.title}`,
        };
        await notificationService.createNotification(data);

        sendNotification(
          'private_Notification',
          { message: `Bạn vừa có nhiệm vụ mới: ${existingTask.title}` },
          updateData.assigned_to
        );

        try {
          const assignedUser = await userService.getUserById(updateData.assigned_to);
          const assigner = await userService.getUserById(userId);
          const boardInfo = await boardRepo.findById(existingTask.board_id);

          await slackService.sendTaskAssignedNotification(
            {
              title: existingTask.title,
              description: existingTask.description,
              due_date: existingTask.due_date,
            },
            {
              full_name: assignedUser?.full_name,
              username: assignedUser?.username,
            },
            {
              title: boardInfo?.title || 'Unknown Board',
            },
            {
              full_name: assigner?.full_name,
              username: assigner?.username,
            },
            existingTask.board_id.toString()
          );
        } catch {}
      }

      // ------------------------------------------
      // 🔥 9️⃣ TẠO CHANGE LOG – HIỂN THỊ TÊN ASSIGNED_TO
      // ------------------------------------------

      async function cleanValue(key, value) {
        if (!value) return '';

        // ✔ assigned_to → trả về full_name
        if (key === 'assigned_to') {
          try {
            const user = await userService.getUserById(value?._id || value);
            return user?.full_name || user?.username || value?.toString();
          } catch {
            return value?.toString();
          }
        }

        // Date → ISO
        if (value instanceof Date) return value.toISOString();

        // ObjectId
        if (value?._bsontype === 'ObjectID') return value.toString();

        // Object (nhưng không stringify thừa)
        if (typeof value === 'object') {
          if (value.full_name) return value.full_name;
          if (value.username) return value.username;
          if (value._id) return value._id.toString();
          return JSON.stringify(value);
        }

        return String(value);
      }

      const changes = [];

      for (const key of Object.keys(updateData)) {
        const oldVal = await cleanValue(key, existingTask[key]);
        const newVal = await cleanValue(key, updateData[key]);

        if (oldVal !== newVal) {
          changes.push(`${key}: '${oldVal}' → '${newVal}'`);
        }
      }

      if (changes.length > 0) {
        await historyTaskService.createHistoryTask({
          task_id: id,
          changed_by: userId,
          change_type: changes.join(', '),
        });
      }

      // 8️⃣ Cập nhật task
      const updatedTask = await taskRepo.update(id, updateData);

      const taskAssignedTo =
        updatedTask.assigned_to?._id?.toString() || updatedTask.assigned_to?.toString();
      if (taskAssignedTo) {
        try {
          // Kiểm tra sync filter trước khi sync
          const shouldSync = await googleCalendarService.shouldSync(updatedTask, taskAssignedTo);
          if (shouldSync) {
            const eventId = await googleCalendarService.findEventByTaskId(id, taskAssignedTo);
            if (eventId) {
              await googleCalendarService.updateCalendarEvent(eventId, updatedTask, taskAssignedTo);
            } else {
              await googleCalendarService.createCalendarEvent(updatedTask, taskAssignedTo);
            }
          } else {
            // Nếu không thỏa filter, xóa event nếu có
            const eventId = await googleCalendarService.findEventByTaskId(id, taskAssignedTo);
            if (eventId) {
              await googleCalendarService.deleteCalendarEvent(eventId, taskAssignedTo);
            }
          }
        } catch (calendarError) {
          logger.warn(
            `Google Calendar: Lỗi khi sync task cập nhật ${id}: ${calendarError.message}`
          );
        }
      }

      setImmediate(async () => {
        try {
          await atRiskDetectionService.detectAtRiskTasks(updatedTask.board_id.toString());
        } catch (err) {
          console.error('Lỗi detect at-risk task:', err);
        }
      });

      return updatedTask;
    } catch (error) {
      throw new Error(`Lỗi cập nhật task: ${error.message}`);
    }
  }

  // Xóa task
  // Xóa task
  async deleteTask(id, userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Task ID không hợp lệ');
    }

    const task = await taskRepo.findById(id);
    if (!task) throw new Error('Task không tồn tại');

    // Convert userId to string for comparison
    const userIdStr = userId?.toString();

    // Kiểm tra user là thành viên của board
    const isMember = await boardRepo.isMember(
      userId,
      task.board_id._id?.toString?.() || task.board_id.toString()
    );

    if (!isMember) throw new Error('Bạn không có quyền thao tác trên board này');

    // Chỉ cho phép creator hoặc assigned user xóa
    const createdById = task.created_by?._id?.toString() || task.created_by?.toString();
    const assignedToId = task.assigned_to?._id?.toString() || task.assigned_to?.toString();

    if (createdById !== userIdStr && (!assignedToId || assignedToId !== userIdStr)) {
      throw new Error('Bạn không có quyền xóa task này');
    }
    // gửi thông báo đến người đc giao
    if (assignedToId) {
      const data = {
        user_id: assignedToId,
        title: `vừa xóa task mà bạn được giao: ${task.title}`,
        body: 'task mà bạn được giao đã bị xóa hãy kiểm tra lại',
      };
      const notification = await notificationService.createNotification(data);
    }
    const taskAssignedTo = task.assigned_to?._id?.toString() || task.assigned_to?.toString();
    if (taskAssignedTo) {
      try {
        const eventId = await googleCalendarService.findEventByTaskId(id, taskAssignedTo);
        if (eventId) {
          await googleCalendarService.deleteCalendarEvent(eventId, taskAssignedTo);
        }
      } catch (calendarError) {}
    }
    const Task = await taskRepo.findById(id);
    if (!task) return;
    // lưu lịch sử
    await historyTaskService.createHistoryTask({
      task_id: id,
      changed_by: userId,
      change_type: `đã xóa task ${Task.title}`,
    });
    // Soft delete instead of hard delete
    return await taskRepo.softDelete(id);
  }

  // Kéo thả task (drag & drop)

  // Tìm kiếm tasks
  async searchTasks(board_id, searchQuery) {
    if (!mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('Board ID không hợp lệ');
    }

    if (!searchQuery || searchQuery.trim().length < 2) {
      throw new Error('Từ khóa tìm kiếm phải có ít nhất 2 ký tự');
    }

    return await taskRepo.search(board_id, searchQuery.trim());
  }

  // Thống kê tasks theo board
  async getTaskStats(board_id) {
    if (!mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('Board ID không hợp lệ');
    }

    const stats = await taskRepo.countByBoard(board_id);
    const rawTasks = await taskRepo.findByBoard(board_id);

    // ✅ Luôn đảm bảo là mảng
    const allTasks = Array.isArray(rawTasks) ? rawTasks : rawTasks?.tasks || [];

    return {
      total_tasks: allTasks.length,
      by_column: stats,
      overdue_tasks: allTasks.filter(task => task.due_date && new Date(task.due_date) < new Date())
        .length,
      completed_tasks: allTasks.filter(
        task => task.column_id?.name && task.column_id.name.toLowerCase().includes('done')
      ).length,
    };
  }

  async moveTask(
    task_id,
    new_column_id,
    prev_task_id = null,
    next_task_id = null,
    new_swimlane_id = null,
    userId
  ) {
    try {
      // ====== Kiểm tra ID hợp lệ ======
      if (!mongoose.Types.ObjectId.isValid(task_id)) throw new Error('Task ID không hợp lệ');
      if (!mongoose.Types.ObjectId.isValid(new_column_id))
        throw new Error('Column ID không hợp lệ');
      const userIdStr = userId?.toString();
      if (!mongoose.Types.ObjectId.isValid(userIdStr)) throw new Error('User ID không hợp lệ');

      // ====== Lấy thông tin người thực hiện ======
      const user = await userService.getUserById(userIdStr);
      const userEmail = user?.email || user?.toObject?.().email;
      const userName =
        user?.full_name || (user?.toObject ? user.toObject().full_name : 'Người dùng');

      // ====== Lấy thông tin task ======
      const task = await taskRepo.findById(task_id);
      if (!task) throw new Error('Task không tồn tại');
      const titleTask = task.title;

      // ====== Lấy thông tin board ======
      const boardId = task.board_id?._id || task.board_id;
      if (!boardId) throw new Error('Task không có board_id');

      const boardDoc = await boardRepo.findById(boardId);
      if (!boardDoc) throw new Error('Board không tồn tại');
      const boardName = boardDoc?.title || boardDoc?.name || 'Không có tên board';

      // ====== Tìm cột Done (nếu có) ======
      const columnDoneBoard = await columnService.findIsDone(boardId);
      let doneColumnId = null;
      if (Array.isArray(columnDoneBoard) && columnDoneBoard.length > 0) {
        doneColumnId = columnDoneBoard[0]._id;
      }

      // ====== Đếm số task Done hiện tại (nếu có) ======
      let qualityTask = 0;
      if (doneColumnId) {
        qualityTask = await taskRepo.countTask(doneColumnId, boardId);
      }

      // ====== Lấy thông tin cột hiện tại ======
      const currentColumnId =
        task.column_id?._id?.toString?.() || task.column_id?.toString?.() || task.column_id;

      let oldColumnName = 'Không có tên cột';
      if (currentColumnId && mongoose.Types.ObjectId.isValid(currentColumnId)) {
        try {
          const oldColumn = await columnRepo.findById(currentColumnId);
          oldColumnName = oldColumn?.name || oldColumnName;
        } catch (err) {
          // Nếu không lấy được cột cũ, giữ giá trị mặc định
        }
      }

      // ====== Lấy thông tin cột đích ======
      const newColumn = await columnRepo.findById(new_column_id);
      if (!newColumn) throw new Error('Không tìm thấy cột đích trong bảng column');
      if (newColumn.board_id.toString() !== boardId.toString())
        throw new Error('Column không thuộc board này');

      const newColumnName = newColumn.name || 'Không có tên cột';
      const newisDone = newColumn.isDone || false;

      // ====== Lấy thông tin swimlane cũ và mới ======
      let oldSwimlaneName = 'Không có';
      if (task.swimlane_id) {
        const swimlaneDoc = await swimlaneRepo.findById(task.swimlane_id);
        oldSwimlaneName = swimlaneDoc?.name || 'Không có';
      }

      let newSwimlaneName = 'Không có';
      if (new_swimlane_id) {
        if (!mongoose.Types.ObjectId.isValid(new_swimlane_id))
          throw new Error('Swimlane ID không hợp lệ');
        const newSwimlane = await swimlaneRepo.findById(new_swimlane_id);
        if (!newSwimlane) throw new Error('Swimlane không tồn tại');
        if (newSwimlane.board_id.toString() !== boardId.toString())
          throw new Error('Swimlane không thuộc board này');
        newSwimlaneName = newSwimlane.name;
      }

      // ====== Lấy danh sách email trong board ======
      const boardMembers = await boardMemberRepo.findByBoardId(boardId);
      const userIds = Array.isArray(boardMembers) ? boardMembers.map(m => m.user_id) : [];
      const usersInBoard = await userRepo.findManyByIds(userIds);
      const emails = Array.isArray(usersInBoard) ? usersInBoard.map(u => u.email) : [];

      // ====== Tính toán vị trí mới (position) ======
      const [prevTask, nextTask] = await Promise.all([
        prev_task_id ? taskRepo.findById(prev_task_id) : null,
        next_task_id ? taskRepo.findById(next_task_id) : null,
      ]);

      const isSameColumn =
        task.column_id.toString() === new_column_id.toString() &&
        (task.swimlane_id || null)?.toString() === (new_swimlane_id || null)?.toString();

      const tasksInTarget = await taskRepo.findByColumnAndSwimlane(new_column_id, new_swimlane_id);

      let newPosition;
      if (tasksInTarget.length === 0) newPosition = 10;
      else if (!prevTask && nextTask) newPosition = nextTask.position / 2;
      else if (prevTask && !nextTask) newPosition = prevTask.position + 10;
      else if (prevTask && nextTask) newPosition = (prevTask.position + nextTask.position) / 2;
      else newPosition = tasksInTarget[tasksInTarget.length - 1].position + 10;

      // ====== Cập nhật task ======
      const updateData = {
        position: newPosition,
        updated_at: Date.now(),
      };

      if (newisDone) {
        updateData.done_at = Date.now();

        try {
          const taskAssignee = task.assigned_to?._id || task.assigned_to;
          const boardInfo = await boardRepo.findById(boardId);

          if (taskAssignee) {
            const assignedUser = await userService.getUserById(taskAssignee.toString());
            await slackService.sendTaskCompletedNotification(
              {
                title: titleTask,
              },
              {
                full_name: assignedUser?.full_name || assignedUser?.username || 'Unknown',
                username: assignedUser?.username,
              },
              {
                title: boardName,
              },
              boardId.toString()
            );
          }
        } catch (slackError) {}
      }
      // Nếu task bị kéo ra khỏi cột Done → bỏ done_at
      else if (task.column_id.toString() === doneColumnId?.toString()) {
        updateData.done_at = null;
      }

      if (!isSameColumn) {
        updateData.column_id = new_column_id;
        if (new_swimlane_id) updateData.swimlane_id = new_swimlane_id;

        try {
          let assignedUserName = null;
          if (task.assigned_to) {
            const assignedUser = await userService.getUserById(
              task.assigned_to._id?.toString() || task.assigned_to.toString()
            );
            assignedUserName = assignedUser?.full_name || assignedUser?.username;
          }

          await slackService.sendTaskMovedNotification(
            {
              title: titleTask,
              assigned_to_name: assignedUserName,
            },
            {
              full_name: user?.full_name,
              username: user?.username,
            },
            {
              title: boardName,
            },
            oldColumnName,
            newColumnName,
            boardId.toString()
          );
        } catch (slackError) {}
      }

      const movedTask = await taskRepo.update(task_id, updateData);

      // ====== Reorder lại task nếu cần ======
      const needReorder =
        !prevTask ||
        !nextTask ||
        Math.abs((prevTask?.position || 0) - (nextTask?.position || newPosition)) < 1;

      if (needReorder) {
        await taskRepo.reorderColumnTasks(new_column_id, new_swimlane_id);
        if (!isSameColumn) {
          await taskRepo.reorderColumnTasks(task.column_id, task.swimlane_id);
        }
      }

      // ====== Nếu board có cột Done, xử lý điểm thưởng / trừ ======
      // ✅ Kiểm tra gamification có được bật không
      const isGamificationEnabled = await gamificationConfigService.isEnabled();

      if (doneColumnId && isGamificationEnabled) {
        const qualityTasknewDone = await taskRepo.countTask(doneColumnId, boardId);

        // Lấy điểm thưởng từ config
        const pointsPerTask = await gamificationConfigService.getPointsPerTask();
        const pointsDeduction = await gamificationConfigService.getPointsDeduction();

        // 🟢 Kéo task vào cột Done → cộng điểm
        if (newisDone && qualityTasknewDone > qualityTask) {
          const taskData = await taskRepo.findById(task_id);
          const userId = taskData?.assigned_to?._id || taskData?.assigned_to;

          if (userId) {
            const centerMember = await CenterMemberRepo.findByUserId(userId);
            if (centerMember?.length > 0) {
              const centerId = centerMember[0].center_id || centerMember[0]._id;
              await userPointRepo.updatePoint(userId, centerId, pointsPerTask);

              const userPoint = await userPointRepo.findByUserAndCenter(userId, centerId);
              const totalPoints = userPoint?.total_points || 0;
              
              const doneColumn = await columnRepo.getDoneColumnByBoard(boardId);
              const completedTasks = doneColumn
                ? await Task.countDocuments({ assigned_to: userId, column_id: doneColumn._id, deleted_at: null })
                : 0;

              await behaviorService.trackBehavior(
                userId,
                centerId,
                'complete_task',
                'points',
                {
                  task_id: task_id,
                  points_earned: pointsPerTask,
                  total_points: totalPoints,
                  completion_time: new Date(),
                }
              );

              const awardedBadges = await badgeService.checkAndAwardBadges(
                userId,
                centerId,
                'complete_task',
                {
                  completed_tasks: completedTasks,
                  total_points: totalPoints,
                }
              );

              if (awardedBadges.length > 0) {
                for (const badge of awardedBadges) {
                  await behaviorService.trackBehavior(
                    userId,
                    centerId,
                    'earn_badge',
                    'badge',
                    {
                      badge_id: badge._id,
                      badge_name: badge.name,
                      reaction: 'positive',
                    }
                  );
                }
              }
            }
          }
        } else if (!newisDone && qualityTasknewDone < qualityTask) {
          // 🔴 Kéo task ra khỏi cột Done → trừ điểm
          const taskData = await taskRepo.findById(task_id);
          const userId = taskData?.assigned_to?._id || taskData?.assigned_to;

          if (userId) {
            const centerMember = await CenterMemberRepo.findByUserId(userId);
            if (centerMember?.length > 0) {
              const centerId = centerMember[0].center_id || centerMember[0]._id;
              await userPointRepo.updatePoint(userId, centerId, -pointsDeduction);
            }
          }
        }
      }

      // ====== Gửi thông báo qua mail ======
      const recipients = emails.filter(e => e && e !== userEmail);
      if (recipients.length > 0) {
        try {
          await sendNotificationToAll(
            recipients,
            userName,
            newColumnName,
            newSwimlaneName,
            titleTask,
            boardName
          );
        } catch (mailErr) {
          console.error('❌ Lỗi khi gửi email:', mailErr);
        }
      }

      // ====== Gửi thông báo real-time qua Socket và lưu vào Database ======
      const notificationMessage = `${userName} đã di chuyển task "${titleTask}" sang cột "${newColumnName}"${
        newSwimlaneName !== 'Không có' ? ` - Swimlane: ${newSwimlaneName}` : ''
      }`;

      // Gửi cho tất cả thành viên trong board (trừ người thực hiện)
      for (const memberId of userIds) {
        if (memberId.toString() !== userIdStr) {
          try {
            // 1️⃣ Tạo notification trong database
            const notificationData = {
              user_id: memberId.toString(),
              title: `Task được di chuyển`,
              body: notificationMessage,
              type: 'task_moved',
              board_id: boardId.toString(),
              task_id: task_id,
            };
            await notificationService.createNotification(notificationData);

            // 2️⃣ Gửi real-time qua Socket
            sendNotification(
              'task_moved',
              {
                message: notificationMessage,
                task_id: task_id,
                task_title: titleTask,
                board_id: boardId.toString(),
                board_name: boardName,
                column_id: new_column_id,
                column_name: newColumnName,
                swimlane_id: new_swimlane_id,
                swimlane_name: newSwimlaneName,
                moved_by: userName,
                moved_by_id: userIdStr,
                timestamp: new Date().toISOString(),
              },
              memberId.toString()
            );
          } catch (socketErr) {
            console.error('❌ Lỗi khi gửi notification:', socketErr);
          }
        }
      }

      const historyTask = await historyTaskService.createHistoryTask({
        task_id: task_id,
        changed_by: userId,
        change_type: `Di chuyển từ cột '${oldColumnName}' sang cột '${newColumnName}'`,
      });

      setImmediate(async () => {
        try {
          await atRiskDetectionService.detectAtRiskTasks(movedTask.board_id.toString());
        } catch (err) {
          console.error('Lỗi detect at-risk task:', err);
        }
      });

      return { success: true, data: movedTask };
    } catch (error) {
      console.error('🔥 Lỗi di chuyển task:', error);
      throw new Error(`Lỗi di chuyển task: ${error.message}`);
    }
  }

  async getData(idBoard) {
    const mongoose = require('mongoose');
    const Task = require('../models/task.model');

    if (!mongoose.Types.ObjectId.isValid(idBoard)) {
      throw new Error('board_id không hợp lệ');
    }

    // 1️⃣ Lấy tổng task trong board
    const totalTask = await Task.countDocuments({
      board_id: idBoard,
      deleted_at: null,
    });

    // 2️⃣ Lấy ngày bắt đầu nhỏ nhất theo start_date
    const firstTask = await Task.find({
      board_id: idBoard,
      deleted_at: null,
      start_date: { $ne: null },
    })
      .sort({ start_date: 1 })
      .limit(1)
      .lean();

    const minDate = firstTask.length ? new Date(firstTask[0].start_date) : new Date();
    const today = new Date();

    // 3️⃣ Tạo mảng tất cả ngày từ start_date → hôm nay
    const allDates = [];
    const d = new Date(minDate);
    while (d <= today) {
      allDates.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
      d.setDate(d.getDate() + 1);
    }

    // 4️⃣ Lấy dữ liệu task done theo ngày dựa trên done_at
    const doneTasks = await Task.aggregate([
      {
        $match: {
          board_id: new mongoose.Types.ObjectId(idBoard),
          deleted_at: null,
          done_at: { $ne: null },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$done_at' } },
          },
          doneCount: { $sum: 1 },
          avgEstimate: { $avg: '$estimate_hours' },
        },
      },
      { $sort: { '_id.day': 1 } },
      { $project: { _id: 0, date: '$_id.day', doneCount: 1, avgEstimate: 1 } },
    ]);

    // 5️⃣ Map dữ liệu doneTasks vào allDates để đảm bảo ngày nào cũng hiển thị
    const data = allDates.map(date => {
      const found = doneTasks.find(t => t.date === date);
      return {
        date,
        doneCount: found ? found.doneCount : 0,
        avgEstimate: found ? found.avgEstimate : 0,
      };
    });

    return { totalTask, data };
  }

  async addAttachment(taskId, file, userId) {
    // 1. Validate Task ID
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new Error('Task ID không hợp lệ');
    }

    // 2. Tìm Task
    const task = await taskRepo.findById(taskId);
    if (!task) throw new Error('Task không tồn tại');

    // 3. Kiểm tra quyền thành viên
    const boardId = task.board_id?._id?.toString() || task.board_id.toString();
    const isMember = await boardRepo.isMember(userId, boardId);

    if (!isMember) {
      throw new Error('Bạn không có quyền thao tác trên board này');
    }

    // 4. Tạo object file đính kèm
    const attachment = {
      original_name: file.originalname,
      stored_name: file.filename,
      size: file.size,
      mime_type: file.mimetype,
      uploaded_by: userId,
      uploaded_at: new Date(),

      // Đường dẫn cho FE hiển thị
      url: `/uploads/attachments/${taskId}/${userId}/${file.filename}`,
    };

    // 5. Lưu vào DB
    const updatedAttachments = task.attachments || [];
    updatedAttachments.push(attachment);

    await taskRepo.update(taskId, { attachments: updatedAttachments });

    return attachment;
  }

  async deleteAttachment(taskId, attachmentIndex, userId) {
    // 1. Validate Task ID
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new Error('Task ID không hợp lệ');
    }

    // 2. Tìm Task
    const task = await taskRepo.findById(taskId);
    if (!task) throw new Error('Task không tồn tại');

    // 3. Kiểm tra quyền thành viên
    const boardId = task.board_id?._id?.toString() || task.board_id.toString();
    const isMember = await boardRepo.isMember(userId, boardId);

    if (!isMember) {
      throw new Error('Bạn không có quyền thao tác trên board này');
    }

    // 4. Lấy attachments
    const attachments = task.attachments || [];

    if (attachmentIndex < 0 || attachmentIndex >= attachments.length) {
      throw new Error('Attachment không tồn tại');
    }

    const attachment = attachments[attachmentIndex];

    const fs = require('fs');
    const path = require('path');

    if (attachment.stored_name) {
      const filePath = path.join(
        __dirname,
        '../uploads/attachments',
        taskId.toString(),
        attachment.uploaded_by.toString(),
        attachment.stored_name
      );

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Lỗi khi xóa file:', err);
        }
      }
    }

    // 6. Xóa attachment khỏi array
    attachments.splice(attachmentIndex, 1);

    // 7. Cập nhật task
    await taskRepo.update(taskId, { attachments });

    return { success: true, message: 'Xóa file đính kèm thành công' };
  }
}

module.exports = new TaskService();

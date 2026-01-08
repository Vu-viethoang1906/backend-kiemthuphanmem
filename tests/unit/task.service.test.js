// 📄 tests/unit/task.service.test.js - Task Service Unit Tests
const mongoose = require('mongoose');

const taskRepo = require('../../repositories/task.repository');
const boardRepo = require('../../repositories/board.repository');
const columnRepo = require('../../repositories/column.repository');
const swimlaneRepo = require('../../repositories/swimlane.repository');
const userRepo = require('../../repositories/user.repository');
const CenterMemberRepo = require('../../repositories/centerMember.repo');
const userService = require('../../services/user.service');
const boardMemberRepo = require('../../repositories/boardMember.repository');
const userPointRepo = require('../../repositories/userPoint.repository');

const notificationService = require('../../services/notification.service');
const columnService = require('../../services/column.service');
const googleCalendarService = require('../../services/googleCalendar.service');
const slackService = require('../../services/slack.service');
const historyTaskService = require('../../services/historyTask.service');
const gamificationConfigService = require('../../services/gamificationConfig.service');

const TaskService = require('../../services/task.service');

// Mock repositories
jest.mock('../../repositories/task.repository');
jest.mock('../../repositories/board.repository');
jest.mock('../../repositories/column.repository');
jest.mock('../../repositories/swimlane.repository');
jest.mock('../../repositories/boardMember.repository', () => ({
  findOne: jest.fn(),
  findByBoardId: jest.fn(),
}));
jest.mock('../../repositories/userPoint.repository');
jest.mock('../../repositories/user.repository');
jest.mock('../../repositories/centerMember.repo');

// Mock services
jest.mock('../../services/notification.service');
jest.mock('../../services/column.service');
jest.mock('../../services/googleCalendar.service');
jest.mock('../../services/slack.service');
jest.mock('../../services/user.service');
jest.mock('../../services/historyTask.service');
jest.mock('../../services/gamificationConfig.service');

// Mock config modules
jest.mock('../../config/sendNotify');
jest.mock('../../config/socket');

describe('🔹 Task Service Unit Tests', () => {
  const VALID_USER_ID = new mongoose.Types.ObjectId();
  const VALID_BOARD_ID = new mongoose.Types.ObjectId();
  const VALID_TASK_ID = new mongoose.Types.ObjectId();
  const VALID_COLUMN_ID = new mongoose.Types.ObjectId();
  const DONE_COLUMN_ID = new mongoose.Types.ObjectId();
  const ASSIGNED_USER_ID = new mongoose.Types.ObjectId();

  const mockTask = {
    _id: VALID_TASK_ID,
    title: 'Test Task',
    board_id: VALID_BOARD_ID,
    column_id: VALID_COLUMN_ID,
    assigned_to: ASSIGNED_USER_ID,
    due_date: new Date('2025-12-31'),
    created_by: VALID_USER_ID,
  };

  const mockBoard = {
    _id: VALID_BOARD_ID,
    title: 'Test Board',
  };

  const mockColumn = {
    _id: VALID_COLUMN_ID,
    board_id: VALID_BOARD_ID,
    name: 'To Do',
    isDone: false,
    isDoneColumn: false,
  };

  const mockDoneColumn = {
    _id: DONE_COLUMN_ID,
    board_id: VALID_BOARD_ID,
    name: 'Done',
    isDone: true,
    isDoneColumn: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default safe mocks for shared dependencies used across tests
    boardRepo.isCreatorFromMember = jest.fn().mockResolvedValue(true);
    taskRepo.findByColumnAndSwimlane = jest.fn().mockResolvedValue([]);
    taskRepo.reorderColumnTasks = jest.fn().mockResolvedValue(undefined);
    taskRepo.countTask = jest.fn().mockResolvedValue(0);
    userRepo.findManyByIds = jest.fn().mockResolvedValue([]);
    CenterMemberRepo.findByUserId = jest.fn().mockResolvedValue([]);
    userPointRepo.updatePoint.mockResolvedValue({});
    gamificationConfigService.isEnabled.mockResolvedValue(false);
    gamificationConfigService.getPointsPerTask.mockResolvedValue(0);
    gamificationConfigService.getPointsDeduction.mockResolvedValue(0);
  });

  describe('createTask', () => {
    it('✅ should create task successfully with all valid data', async () => {
      const taskData = {
        board_id: VALID_BOARD_ID.toString(),
        column_id: VALID_COLUMN_ID.toString(),
        title: 'New Task',
        description: 'Task description',
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      boardRepo.isRoleMember.mockResolvedValue(true);
      columnRepo.findById.mockResolvedValue(mockColumn);
      taskRepo.findByColumn.mockResolvedValue([]);
      taskRepo.create.mockResolvedValue({ ...mockTask, ...taskData });
      historyTaskService.createHistoryTask.mockResolvedValue({});

      const result = await TaskService.createTask(taskData, VALID_USER_ID.toString());

      expect(taskRepo.create).toHaveBeenCalled();
      expect(historyTaskService.createHistoryTask).toHaveBeenCalled();
    });

    it('✅ should validate assigned_to ObjectId format', async () => {
      const taskData = {
        board_id: VALID_BOARD_ID.toString(),
        column_id: VALID_COLUMN_ID.toString(),
        title: 'New Task',
        assigned_to: 'invalid-id',
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      boardRepo.isRoleMember.mockResolvedValue(true);
      columnRepo.findById.mockResolvedValue(mockColumn);

      await expect(TaskService.createTask(taskData, VALID_USER_ID.toString())).rejects.toThrow(
        'assigned_to không hợp lệ'
      );
    });

    it('✅ should sync with Google Calendar when assigned_to provided', async () => {
      const taskData = {
        board_id: VALID_BOARD_ID.toString(),
        column_id: VALID_COLUMN_ID.toString(),
        title: 'New Task with Calendar',
        assigned_to: ASSIGNED_USER_ID.toString(),
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      boardRepo.isRoleMember.mockResolvedValue(true);
      columnRepo.findById.mockResolvedValue(mockColumn);
      taskRepo.findByColumn.mockResolvedValue([]);
      const createdTask = { ...mockTask, ...taskData };
      taskRepo.create.mockResolvedValue(createdTask);
      googleCalendarService.shouldSync.mockResolvedValue(true);
      historyTaskService.createHistoryTask.mockResolvedValue({});

      const result = await TaskService.createTask(taskData, VALID_USER_ID.toString());

      expect(googleCalendarService.shouldSync).toHaveBeenCalled();
    });

    it('❌ should throw wrapped error when board_id is missing', async () => {
      const taskData = {
        column_id: VALID_COLUMN_ID.toString(),
        title: 'New Task',
      };

      await expect(TaskService.createTask(taskData, VALID_USER_ID.toString())).rejects.toThrow(
        'Lỗi tạo task: board_id là bắt buộc'
      );
    });
  });

  describe('_calculateIsOverdue', () => {
    it('✅ should return false if no due_date', () => {
      const task = { ...mockTask, due_date: null };
      const result = TaskService._calculateIsOverdue(task, mockColumn);

      expect(result).toBe(false);
    });

    it('✅ should return false if column is Done', () => {
      const task = {
        ...mockTask,
        due_date: new Date('2020-01-01'),
      };
      const result = TaskService._calculateIsOverdue(task, mockDoneColumn);

      expect(result).toBe(false);
    });

    it('✅ should return true if due_date < now', () => {
      const task = {
        ...mockTask,
        due_date: new Date('2020-01-01'),
      };
      const result = TaskService._calculateIsOverdue(task, mockColumn);

      expect(result).toBe(true);
    });

    it('✅ should return false if due_date >= now', () => {
      const task = {
        ...mockTask,
        due_date: new Date('2099-12-31'),
      };
      const result = TaskService._calculateIsOverdue(task, mockColumn);

      expect(result).toBe(false);
    });
  });

  describe('_enrichTasksWithOverdue', () => {
    it('✅ should return empty array for empty input', async () => {
      const result = await TaskService._enrichTasksWithOverdue([]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('✅ should enrich tasks with isOverdue flag', async () => {
      const tasks = [mockTask];
      columnRepo.findById.mockResolvedValue(mockColumn);

      const result = await TaskService._enrichTasksWithOverdue(tasks);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('isOverdue');
    });

    it('✅ should handle task.toObject() method', async () => {
      const taskWithToObject = {
        ...mockTask,
        toObject: jest.fn().mockReturnValue(mockTask),
      };
      columnRepo.findById.mockResolvedValue(mockColumn);

      const result = await TaskService._enrichTasksWithOverdue([taskWithToObject]);

      expect(result[0]).toHaveProperty('isOverdue');
    });

    it('✅ should handle column lookup errors gracefully', async () => {
      const tasks = [mockTask];
      columnRepo.findById.mockRejectedValue(new Error('Column lookup error'));

      const result = await TaskService._enrichTasksWithOverdue(tasks);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateTask', () => {
    it('✅ should update task successfully', async () => {
      const updateData = { title: 'Updated Title' };

      taskRepo.findById.mockResolvedValue(mockTask);
      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.findById.mockResolvedValue(mockColumn);
      taskRepo.update.mockResolvedValue({ ...mockTask, ...updateData });
      historyTaskService.createHistoryTask.mockResolvedValue({});

      const result = await TaskService.updateTask(
        VALID_TASK_ID.toString(),
        updateData,
        VALID_USER_ID.toString()
      );

      expect(taskRepo.update).toHaveBeenCalled();
    });

    it('✅ should handle error gracefully', async () => {
      taskRepo.findById.mockResolvedValue(null);

      await expect(
        TaskService.updateTask(
          VALID_TASK_ID.toString(),
          { title: 'Updated' },
          VALID_USER_ID.toString()
        )
      ).rejects.toThrow();
    });
  });

  // Các test cho moveTask khá phức tạp và phụ thuộc nhiều vào hạ tầng (email, socket, slack, gamification...).
  // Để giữ bộ unit test ổn định, dễ bảo trì, tạm thời không test trực tiếp moveTask ở đây.

  describe('getData', () => {
    it('✅ should validate board_id', async () => {
      await expect(TaskService.getData('invalid-id', {})).rejects.toThrow();
    });
  });

  describe('addAttachment', () => {
    it('✅ should validate taskId', async () => {
      await expect(TaskService.addAttachment('invalid-id', {})).rejects.toThrow(
        'Task ID không hợp lệ'
      );
    });

    it('✅ should add attachment successfully', async () => {
      const file = {
        originalname: 'document.pdf',
        filename: 'stored-document.pdf',
        size: 1234,
        mimetype: 'application/pdf',
      };

      taskRepo.findById.mockResolvedValue(mockTask);
      boardRepo.isMember.mockResolvedValue(true);
      taskRepo.update.mockResolvedValue({
        ...mockTask,
        attachments: [expect.any(Object)],
      });

      const result = await TaskService.addAttachment(
        VALID_TASK_ID.toString(),
        file,
        VALID_USER_ID.toString()
      );

      expect(taskRepo.update).toHaveBeenCalled();
      expect(result).toHaveProperty('url');
    });

    it('✅ should handle board_id as string', async () => {
      const file = {
        originalname: 'document.pdf',
        filename: 'stored-document.pdf',
        size: 1234,
        mimetype: 'application/pdf',
      };

      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        board_id: VALID_BOARD_ID.toString(),
      });
      boardRepo.isMember.mockResolvedValue(true);
      taskRepo.update.mockResolvedValue({
        ...mockTask,
        attachments: [expect.any(Object)],
      });

      const result = await TaskService.addAttachment(
        VALID_TASK_ID.toString(),
        file,
        VALID_USER_ID.toString()
      );

      expect(taskRepo.update).toHaveBeenCalled();
    });
  });

  describe('deleteAttachment', () => {
    it('✅ should delete attachment successfully', async () => {
      const mockTaskWithAttachment = {
        ...mockTask,
        attachments: [{ url: 'http://example.com/file.pdf', name: 'document.pdf' }],
      };

      taskRepo.findById.mockResolvedValue(mockTaskWithAttachment);
      boardRepo.isMember.mockResolvedValue(true);
      boardMemberRepo.findOne.mockResolvedValue({ role: 'admin' });
      taskRepo.update.mockResolvedValue({
        ...mockTaskWithAttachment,
        attachments: [],
      });

      const result = await TaskService.deleteAttachment(
        VALID_TASK_ID.toString(),
        0,
        VALID_USER_ID.toString()
      );

      expect(taskRepo.update).toHaveBeenCalled();
    });

    it('✅ should throw error if attachmentIndex is invalid', async () => {
      const mockTaskWithAttachment = {
        ...mockTask,
        attachments: [{ url: 'http://example.com/file.pdf', name: 'document.pdf' }],
      };

      taskRepo.findById.mockResolvedValue(mockTaskWithAttachment);
      boardRepo.isMember.mockResolvedValue(true);

      await expect(
        TaskService.deleteAttachment(VALID_TASK_ID.toString(), 999, VALID_USER_ID.toString())
      ).rejects.toThrow();
    });

    it('✅ should throw error if user is not a board member', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        TaskService.deleteAttachment(VALID_TASK_ID.toString(), 0, VALID_USER_ID.toString())
      ).rejects.toThrow();
    });
  });
});

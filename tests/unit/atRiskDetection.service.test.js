// 📄 tests/unit/atRiskDetection.service.test.js - At Risk Detection Service Unit Tests
const AtRiskDetectionService = require('../../services/atRiskDetection.service');
const Task = require('../../models/task.model');
const Column = require('../../models/column.model');
const mongoose = require('mongoose');

// Mock repositories
jest.mock('../../repositories/atRiskTask.repository', () => ({
  upsert: jest.fn(),
  markAsResolved: jest.fn(),
  findByBoardId: jest.fn(),
  findByUserId: jest.fn(),
}));

// Mock services
jest.mock('../../services/historyTask.service', () => ({
  getAllHistoryTasks: jest.fn(),
}));

// Mock models
jest.mock('../../models/task.model');
jest.mock('../../models/column.model');

const atRiskTaskRepo = require('../../repositories/atRiskTask.repository');
const historyTaskService = require('../../services/historyTask.service');

describe('🔹 At Risk Detection Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('detectAtRiskTasks', () => {
    const validBoardId = new mongoose.Types.ObjectId();

    it('✅ should detect at-risk tasks successfully', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        title: 'Test Task',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        assigned_to: null,
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
          isDone: false,
        },
        estimate_hours: 8,
        deleted_at: null,
      };

      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTask]),
        }),
      });

      // Mock analyzeTaskRisk to return risk
      jest.spyOn(AtRiskDetectionService, 'analyzeTaskRisk').mockResolvedValue({
        risk_score: 0.8,
        reasons: [
          {
            rule_name: 'unassigned_near_deadline',
            score: 0.8,
            triggered: true,
            details: { days_until_due: 2 },
          },
        ],
      });

      atRiskTaskRepo.upsert.mockResolvedValue({});

      const result = await AtRiskDetectionService.detectAtRiskTasks(validBoardId.toString());

      expect(Task.find).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('✅ should skip tasks without due_date', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        title: 'Test Task',
        due_date: null,
        assigned_to: null,
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
          isDone: false,
        },
        deleted_at: null,
      };

      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTask]),
        }),
      });

      const result = await AtRiskDetectionService.detectAtRiskTasks(validBoardId.toString());

      expect(result).toEqual([]);
      expect(atRiskTaskRepo.upsert).not.toHaveBeenCalled();
    });

    it('✅ should skip tasks that are done', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        title: 'Test Task',
        due_date: new Date(),
        assigned_to: null,
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Done',
          isDone: true,
        },
        deleted_at: null,
      };

      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTask]),
        }),
      });

      const result = await AtRiskDetectionService.detectAtRiskTasks(validBoardId.toString());

      expect(result).toEqual([]);
      expect(atRiskTaskRepo.upsert).not.toHaveBeenCalled();
    });

    it('✅ should mark task as resolved when risk_score is 0', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        title: 'Test Task',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        assigned_to: new mongoose.Types.ObjectId(),
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
          isDone: false,
        },
        deleted_at: null,
      };

      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTask]),
        }),
      });

      jest.spyOn(AtRiskDetectionService, 'analyzeTaskRisk').mockResolvedValue({
        risk_score: 0,
        reasons: [],
      });

      atRiskTaskRepo.markAsResolved.mockResolvedValue({});

      const result = await AtRiskDetectionService.detectAtRiskTasks(validBoardId.toString());

      expect(result).toEqual([]);
      expect(atRiskTaskRepo.markAsResolved).toHaveBeenCalledWith(mockTask._id);
    });

    it('✅ should detect at-risk tasks without board_id', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        title: 'Test Task',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        assigned_to: null,
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
          isDone: false,
        },
        deleted_at: null,
      };

      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTask]),
        }),
      });

      jest.spyOn(AtRiskDetectionService, 'analyzeTaskRisk').mockResolvedValue({
        risk_score: 0.8,
        reasons: [
          {
            rule_name: 'unassigned_near_deadline',
            score: 0.8,
            triggered: true,
            details: { days_until_due: 2 },
          },
        ],
      });

      atRiskTaskRepo.upsert.mockResolvedValue({});

      const result = await AtRiskDetectionService.detectAtRiskTasks(null);

      expect(Task.find).toHaveBeenCalledWith({ deleted_at: null });
      expect(result).toBeDefined();
    });

    it('❌ should handle errors gracefully', async () => {
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(
        AtRiskDetectionService.detectAtRiskTasks(validBoardId.toString())
      ).rejects.toThrow('Lỗi phát hiện at-risk tasks');
    });
  });

  describe('analyzeTaskRisk', () => {
    it('✅ should return zero risk score when no rules triggered', async () => {
      // Create a task that should NOT trigger any rules
      const now = new Date();
      const dueDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // Exactly 10 days from now (not near deadline)
      const createdDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // Exactly 3 days ago (not stuck > 5 days)
      const assignedUserId = new mongoose.Types.ObjectId();

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: new mongoose.Types.ObjectId(),
        title: 'Test Task',
        due_date: dueDate,
        assigned_to: assignedUserId, // Has assignee - rule1 won't trigger (!task.assigned_to is false)
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
          isDone: false,
        },
        created_at: createdDate, // 3 days ago - rule2 won't trigger (needs > 5 days)
        updated_at: createdDate,
        estimate_hours: 8, // <= 16 - rule4 won't trigger (needs > 16)
        deleted_at: null,
      };

      // Verify assigned_to is truthy
      expect(mockTask.assigned_to).toBeTruthy();
      expect(mockTask.assigned_to).not.toBeNull();
      expect(mockTask.assigned_to).not.toBeUndefined();

      // Mock historyTaskService for checkStuckInColumn - return empty to use created_at
      historyTaskService.getAllHistoryTasks.mockResolvedValue([]);

      // Mock Task.find for checkUserHasManyOverdue - return empty array (no overdue tasks)
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      // Verify each rule individually to ensure none trigger
      const rule1 = await AtRiskDetectionService.checkUnassignedNearDeadline(mockTask);
      // Service logic: if (!task.assigned_to && task.due_date) { ... }
      // Since assigned_to is ObjectId (truthy), !task.assigned_to is false, so condition fails
      expect(rule1.triggered).toBe(false); // Has assigned_to, won't trigger
      expect(rule1.score).toBe(0.8); // Score is always 0.8, but triggered should be false

      const rule2 = await AtRiskDetectionService.checkStuckInColumn(mockTask);
      expect(rule2.triggered).toBe(false); // Only 3 days, won't trigger (needs > 5 days)

      const rule3 = await AtRiskDetectionService.checkUserHasManyOverdue(mockTask);
      expect(rule3.triggered).toBe(false); // No overdue tasks (empty array)

      const rule4 = await AtRiskDetectionService.checkHighEstimateLowTime(mockTask);
      expect(rule4.triggered).toBe(false); // estimate_hours = 8 <= 16, won't trigger

      // Now test analyzeTaskRisk - should return 0 since no rules triggered
      // All individual rules passed (triggered = false), so analyzeTaskRisk should also return 0
      const result = await AtRiskDetectionService.analyzeTaskRisk(mockTask);

      expect(result.risk_score).toBe(0);
      expect(result.reasons.length).toBe(0);
    });

    it('✅ should analyze task risk with multiple rules', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // Exactly 2 days from now
      const createdDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // Exactly 6 days ago

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: new mongoose.Types.ObjectId(),
        title: 'Test Task',
        due_date: dueDate,
        assigned_to: null, // Unassigned, will trigger unassigned_near_deadline
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
          isDone: false,
        },
        created_at: createdDate, // 6 days ago, will trigger stuck_in_column
        updated_at: createdDate,
        estimate_hours: 20, // > 16, will trigger high_estimate_low_time
        deleted_at: null,
      };

      // Mock historyTaskService for checkStuckInColumn
      historyTaskService.getAllHistoryTasks.mockResolvedValue([]);

      // Mock Task.find for checkUserHasManyOverdue
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await AtRiskDetectionService.analyzeTaskRisk(mockTask);

      expect(result).toHaveProperty('risk_score');
      expect(result).toHaveProperty('reasons');
      // Should have unassigned_near_deadline (0.8) + stuck_in_column (0.7) + high_estimate_low_time (0.9)
      expect(result.risk_score).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('checkUnassignedNearDeadline', () => {
    it('✅ should trigger when task is unassigned and near deadline', async () => {
      // Use a fixed date to avoid timing issues
      const now = new Date();
      const dueDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // Exactly 2 days from now

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: null,
        due_date: dueDate,
      };

      const result = await AtRiskDetectionService.checkUnassignedNearDeadline(mockTask);

      expect(result.triggered).toBe(true);
      expect(result.score).toBe(0.8);
      expect(result.details).toHaveProperty('days_until_due');
      expect(result.details.days_until_due).toBeLessThan(3);
      expect(result.details.days_until_due).toBeGreaterThanOrEqual(0);
    });

    it('✅ should not trigger when task is assigned', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: new mongoose.Types.ObjectId(),
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      };

      const result = await AtRiskDetectionService.checkUnassignedNearDeadline(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should not trigger when task has no due_date', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: null,
        due_date: null,
      };

      const result = await AtRiskDetectionService.checkUnassignedNearDeadline(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should not trigger when days until due >= 3', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: null,
        due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
      };

      const result = await AtRiskDetectionService.checkUnassignedNearDeadline(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should not trigger when task is overdue', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: null,
        due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      };

      const result = await AtRiskDetectionService.checkUnassignedNearDeadline(mockTask);

      expect(result.triggered).toBe(false);
    });
  });

  describe('checkStuckInColumn', () => {
    it('✅ should trigger when task has no history and stuck > 5 days', async () => {
      const now = new Date();
      const createdDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // Exactly 6 days ago

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
        },
        created_at: createdDate,
        updated_at: createdDate,
      };

      historyTaskService.getAllHistoryTasks.mockResolvedValue([]);

      const result = await AtRiskDetectionService.checkStuckInColumn(mockTask);

      expect(result.triggered).toBe(true);
      expect(result.score).toBe(0.7);
      expect(result.details).toHaveProperty('days_in_column');
      expect(result.details.days_in_column).toBeGreaterThan(5);
    });

    it('✅ should trigger when task has history and stuck > 5 days since last move', async () => {
      const now = new Date();
      const lastMoveDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // Exactly 6 days ago

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
        },
      };

      const mockHistory = [
        {
          _id: new mongoose.Types.ObjectId(),
          task_id: mockTask._id,
          change_type: "Di chuyển từ cột 'Backlog' sang cột 'In Progress'",
          created_at: lastMoveDate,
          createdAt: lastMoveDate,
        },
      ];

      historyTaskService.getAllHistoryTasks.mockResolvedValue(mockHistory);

      const result = await AtRiskDetectionService.checkStuckInColumn(mockTask);

      expect(result.triggered).toBe(true);
      expect(result.details).toHaveProperty('last_moved_at');
      expect(result.details.days_in_column).toBeGreaterThan(5);
    });

    it('✅ should not trigger when task stuck <= 5 days', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
        },
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      historyTaskService.getAllHistoryTasks.mockResolvedValue([]);

      const result = await AtRiskDetectionService.checkStuckInColumn(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should not trigger when task has no column_id', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        column_id: null,
      };

      const result = await AtRiskDetectionService.checkStuckInColumn(mockTask);

      expect(result.triggered).toBe(false);
    });
  });

  describe('checkUserHasManyOverdue', () => {
    it('✅ should trigger when user has > 3 overdue tasks', async () => {
      const now = new Date();
      const overdueDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: new mongoose.Types.ObjectId(),
      };

      const mockOverdueTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          due_date: overdueDate,
          column_id: { isDone: false },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          due_date: overdueDate,
          column_id: { isDone: false },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          due_date: overdueDate,
          column_id: { isDone: false },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          due_date: overdueDate,
          column_id: { isDone: false },
        },
      ];

      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOverdueTasks),
        }),
      });

      const result = await AtRiskDetectionService.checkUserHasManyOverdue(mockTask);

      expect(result.triggered).toBe(true);
      expect(result.score).toBe(0.6);
      expect(result.details.overdue_count).toBe(4);
    });

    it('✅ should not trigger when user has <= 3 overdue tasks', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: new mongoose.Types.ObjectId(),
      };

      const mockOverdueTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          column_id: { isDone: false },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          column_id: { isDone: false },
        },
      ];

      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOverdueTasks),
        }),
      });

      const result = await AtRiskDetectionService.checkUserHasManyOverdue(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should not trigger when task is not assigned', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: null,
      };

      const result = await AtRiskDetectionService.checkUserHasManyOverdue(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should filter out done tasks from overdue count', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: new mongoose.Types.ObjectId(),
      };

      const mockOverdueTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          column_id: { isDone: true }, // Done task
        },
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          column_id: { isDone: false },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          column_id: { isDone: false },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          assigned_to: mockTask.assigned_to,
          column_id: null, // No column
        },
      ];

      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOverdueTasks),
        }),
      });

      const result = await AtRiskDetectionService.checkUserHasManyOverdue(mockTask);

      expect(result.triggered).toBe(false); // Only 3 active overdue tasks
    });
  });

  describe('checkHighEstimateLowTime', () => {
    it('✅ should trigger when estimate > 16h and hours remaining < estimate', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 10 * 60 * 60 * 1000); // Exactly 10 hours from now

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        estimate_hours: 20,
        due_date: dueDate,
      };

      const result = await AtRiskDetectionService.checkHighEstimateLowTime(mockTask);

      expect(result.triggered).toBe(true);
      expect(result.score).toBe(0.9);
      expect(result.details).toHaveProperty('estimate_hours');
      expect(result.details).toHaveProperty('hours_remaining');
      expect(result.details.estimate_hours).toBe(20);
      expect(result.details.hours_remaining).toBeLessThan(20);
      expect(result.details.hours_remaining).toBeGreaterThan(0);
    });

    it('✅ should not trigger when estimate <= 16h', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        estimate_hours: 8,
        due_date: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
      };

      const result = await AtRiskDetectionService.checkHighEstimateLowTime(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should not trigger when hours remaining >= estimate', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        estimate_hours: 20,
        due_date: new Date(Date.now() + 25 * 60 * 60 * 1000), // 25 hours from now
      };

      const result = await AtRiskDetectionService.checkHighEstimateLowTime(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should not trigger when task has no estimate_hours', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        estimate_hours: null,
        due_date: new Date(Date.now() + 10 * 60 * 60 * 1000),
      };

      const result = await AtRiskDetectionService.checkHighEstimateLowTime(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should not trigger when task has no due_date', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        estimate_hours: 20,
        due_date: null,
      };

      const result = await AtRiskDetectionService.checkHighEstimateLowTime(mockTask);

      expect(result.triggered).toBe(false);
    });

    it('✅ should not trigger when task is overdue', async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        estimate_hours: 20,
        due_date: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      };

      const result = await AtRiskDetectionService.checkHighEstimateLowTime(mockTask);

      expect(result.triggered).toBe(false);
    });
  });

  describe('generateRecommendations', () => {
    it('✅ should generate recommendations for unassigned_near_deadline', () => {
      const riskAnalysis = {
        reasons: [
          {
            rule_name: 'unassigned_near_deadline',
            details: {
              days_until_due: 2,
            },
          },
        ],
      };

      const result = AtRiskDetectionService.generateRecommendations(riskAnalysis);

      expect(result).toContain(
        'Gán người thực hiện ngay lập tức cho task này (còn 2 ngày đến hạn)'
      );
      expect(result).toContain('Xem xét gia hạn deadline nếu cần thiết');
    });

    it('✅ should generate recommendations for stuck_in_column', () => {
      const riskAnalysis = {
        reasons: [
          {
            rule_name: 'stuck_in_column',
            details: {
              days_in_column: 6,
              column_name: 'In Progress',
            },
          },
        ],
      };

      const result = AtRiskDetectionService.generateRecommendations(riskAnalysis);

      expect(result).toContain(
        'Liên hệ học viên để tìm hiểu về vướng mắc (blocker) do đã bị stuck 6 ngày ở cột "In Progress"'
      );
    });

    it('✅ should generate recommendations for stuck_in_column in To Do', () => {
      const riskAnalysis = {
        reasons: [
          {
            rule_name: 'stuck_in_column',
            details: {
              days_in_column: 6,
              column_name: 'To do',
            },
          },
        ],
      };

      const result = AtRiskDetectionService.generateRecommendations(riskAnalysis);

      expect(result).toContain(
        'Task chưa được bắt đầu - cần kiểm tra xem học viên có quên hoặc trì hoãn không'
      );
    });

    it('✅ should generate recommendations for user_has_many_overdue', () => {
      const riskAnalysis = {
        reasons: [
          {
            rule_name: 'user_has_many_overdue',
            details: {
              overdue_count: 5,
            },
          },
        ],
      };

      const result = AtRiskDetectionService.generateRecommendations(riskAnalysis);

      expect(result).toContain(
        'Xem xét phân bổ lại/giảm workload cho học viên (đang có 5 task quá hạn)'
      );
      expect(result).toContain('Ưu tiên các task quan trọng và deadline gần nhất');
    });

    it('✅ should generate recommendations for high_estimate_low_time', () => {
      const riskAnalysis = {
        reasons: [
          {
            rule_name: 'high_estimate_low_time',
            details: {
              estimate_hours: 20,
              hours_remaining: 10,
            },
          },
        ],
      };

      const result = AtRiskDetectionService.generateRecommendations(riskAnalysis);

      expect(result.some(r => r.includes('Xem xét gia hạn deadline hoặc giảm scope'))).toBe(true);
      expect(result).toContain('Thêm người hỗ trợ để hoàn thành đúng hạn');
    });

    it('✅ should remove duplicate recommendations', () => {
      const riskAnalysis = {
        reasons: [
          {
            rule_name: 'unassigned_near_deadline',
            details: {
              days_until_due: 2,
            },
          },
          {
            rule_name: 'unassigned_near_deadline',
            details: {
              days_until_due: 2,
            },
          },
        ],
      };

      const result = AtRiskDetectionService.generateRecommendations(riskAnalysis);

      // Should have unique recommendations
      const uniqueResults = [...new Set(result)];
      expect(result.length).toBe(uniqueResults.length);
    });

    it('✅ should return empty array when no reasons', () => {
      const riskAnalysis = {
        reasons: [],
      };

      const result = AtRiskDetectionService.generateRecommendations(riskAnalysis);

      expect(result).toEqual([]);
    });
  });

  describe('getAtRiskTasksByBoard', () => {
    const validBoardId = new mongoose.Types.ObjectId();

    it('✅ should return existing at-risk tasks', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          task_id: new mongoose.Types.ObjectId(),
          board_id: validBoardId,
          risk_score: 0.8,
          is_resolved: false,
        },
      ];

      atRiskTaskRepo.findByBoardId.mockResolvedValue(mockTasks);

      const result = await AtRiskDetectionService.getAtRiskTasksByBoard(validBoardId.toString());

      expect(result).toEqual(mockTasks);
      expect(atRiskTaskRepo.findByBoardId).toHaveBeenCalledWith(
        expect.objectContaining({ _id: validBoardId }),
        { is_resolved: false }
      );
    });

    it('✅ should detect tasks when no existing tasks found', async () => {
      atRiskTaskRepo.findByBoardId.mockResolvedValueOnce([]);
      atRiskTaskRepo.findByBoardId.mockResolvedValueOnce([
        {
          _id: new mongoose.Types.ObjectId(),
          task_id: new mongoose.Types.ObjectId(),
          board_id: validBoardId,
          risk_score: 0.8,
          is_resolved: false,
        },
      ]);

      jest.spyOn(AtRiskDetectionService, 'detectAtRiskTasks').mockResolvedValue([]);

      const result = await AtRiskDetectionService.getAtRiskTasksByBoard(validBoardId.toString());

      expect(AtRiskDetectionService.detectAtRiskTasks).toHaveBeenCalled();
      expect(atRiskTaskRepo.findByBoardId).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAtRiskTasksByUser', () => {
    const validUserId = new mongoose.Types.ObjectId();

    it('✅ should return existing at-risk tasks', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          task_id: new mongoose.Types.ObjectId(),
          risk_score: 0.8,
          is_resolved: false,
        },
      ];

      atRiskTaskRepo.findByUserId.mockResolvedValue(mockTasks);

      const result = await AtRiskDetectionService.getAtRiskTasksByUser(validUserId.toString());

      expect(result).toEqual(mockTasks);
      expect(atRiskTaskRepo.findByUserId).toHaveBeenCalledWith(validUserId.toString(), {
        is_resolved: false,
      });
    });

    it('✅ should detect tasks when no existing tasks found', async () => {
      atRiskTaskRepo.findByUserId.mockResolvedValueOnce([]);
      atRiskTaskRepo.findByUserId.mockResolvedValueOnce([
        {
          _id: new mongoose.Types.ObjectId(),
          task_id: new mongoose.Types.ObjectId(),
          risk_score: 0.8,
          is_resolved: false,
        },
      ]);

      jest.spyOn(AtRiskDetectionService, 'detectAtRiskTasks').mockResolvedValue([]);

      const result = await AtRiskDetectionService.getAtRiskTasksByUser(validUserId.toString());

      expect(AtRiskDetectionService.detectAtRiskTasks).toHaveBeenCalled();
      expect(atRiskTaskRepo.findByUserId).toHaveBeenCalledTimes(2);
    });
  });

  describe('markTaskAsResolved', () => {
    const validTaskId = new mongoose.Types.ObjectId();

    it('✅ should mark task as resolved', async () => {
      atRiskTaskRepo.markAsResolved.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        task_id: validTaskId,
        is_resolved: true,
      });

      const result = await AtRiskDetectionService.markTaskAsResolved(validTaskId.toString());

      expect(atRiskTaskRepo.markAsResolved).toHaveBeenCalledWith(validTaskId.toString());
      expect(result).toBeDefined();
    });
  });
});

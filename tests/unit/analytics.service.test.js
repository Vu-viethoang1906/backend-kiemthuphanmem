// 📄 tests/unit/analytics.service.test.js - Analytics Service Unit Tests
const AnalyticsService = require('../../services/analytics.service');
const Task = require('../../models/task.model');
const Board = require('../../models/board.model');
const Column = require('../../models/column.model');
const HistoryTask = require('../../models/historyTask.model');
const UserPoint = require('../../models/userPoint.model');
const User = require('../../models/usersModel');
const Center = require('../../models/center.model');
const CenterMember = require('../../models/centerMember.model');
const Comment = require('../../models/comment.model');
const mongoose = require('mongoose');

// Mock models
jest.mock('../../models/task.model');
jest.mock('../../models/board.model');
jest.mock('../../models/column.model');
jest.mock('../../models/historyTask.model');
jest.mock('../../models/userPoint.model');
jest.mock('../../models/usersModel');
jest.mock('../../models/center.model');
jest.mock('../../models/centerMember.model');
jest.mock('../../models/comment.model');

// Mock services
jest.mock('../../services/boardMember.service', () => ({
  getMembers: jest.fn(),
}));

const boardMemberService = require('../../services/boardMember.service');

describe('🔹 Analytics Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLineChartData', () => {
    const validParams = {
      board_id: new mongoose.Types.ObjectId().toString(),
      start_date: '2024-01-01',
      end_date: '2024-01-07',
      granularity: 'day',
    };

    it('✅ should get line chart data successfully', async () => {
      const mockBoard = {
        _id: validParams.board_id,
        title: 'Test Board',
      };

      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validParams.board_id,
        isDone: true,
      };

      const mockTasks = [
        {
          _id: 'task1',
          board_id: validParams.board_id,
          column_id: { _id: mockDoneColumn._id },
          created_at: new Date('2024-01-02'),
          updated_at: new Date('2024-01-03'),
          due_date: new Date('2024-01-05'),
          deleted_at: null,
        },
        {
          _id: 'task2',
          board_id: validParams.board_id,
          column_id: { _id: new mongoose.Types.ObjectId() },
          created_at: new Date('2024-01-03'),
          updated_at: new Date('2024-01-04'),
          due_date: new Date('2024-01-06'),
          deleted_at: null,
        },
      ];

      Board.findById.mockResolvedValue(mockBoard);
      Column.findOne.mockResolvedValue(mockDoneColumn);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTasks),
        }),
      });

      const result = await AnalyticsService.getLineChartData(validParams);

      expect(Board.findById).toHaveBeenCalledWith(validParams.board_id);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('board');
      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('data');
    });

    it('✅ should throw error when board_id is invalid', async () => {
      await expect(
        AnalyticsService.getLineChartData({
          board_id: 'invalid-id',
          start_date: '2024-01-01',
          end_date: '2024-01-07',
        })
      ).rejects.toThrow('Board ID không hợp lệ');
    });

    it('✅ should throw error when dates are missing', async () => {
      await expect(
        AnalyticsService.getLineChartData({
          board_id: validParams.board_id,
        })
      ).rejects.toThrow();
    });

    it('✅ should throw error when start_date >= end_date', async () => {
      await expect(
        AnalyticsService.getLineChartData({
          board_id: validParams.board_id,
          start_date: '2024-01-07',
          end_date: '2024-01-01',
        })
      ).rejects.toThrow();
    });

    it('✅ should throw error when board does not exist', async () => {
      Board.findById.mockResolvedValue(null);

      await expect(AnalyticsService.getLineChartData(validParams)).rejects.toThrow(
        'Board không tồn tại'
      );
    });

    it('✅ should handle week granularity', async () => {
      const mockBoard = {
        _id: validParams.board_id,
        title: 'Test Board',
      };

      Board.findById.mockResolvedValue(mockBoard);
      Column.findOne.mockResolvedValue(null);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await AnalyticsService.getLineChartData({
        ...validParams,
        granularity: 'week',
      });

      expect(result).toBeDefined();
    });

    it('✅ should handle month granularity', async () => {
      const mockBoard = {
        _id: validParams.board_id,
        title: 'Test Board',
      };

      Board.findById.mockResolvedValue(mockBoard);
      Column.findOne.mockResolvedValue(null);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await AnalyticsService.getLineChartData({
        ...validParams,
        granularity: 'month',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getDashboardStats', () => {
    const validBoardId = new mongoose.Types.ObjectId().toString();

    it('✅ should get dashboard stats successfully', async () => {
      const mockBoard = {
        _id: validBoardId,
        title: 'Test Board',
      };

      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        isDone: true,
      };

      const mockTasks = [
        {
          _id: 'task1',
          column_id: { _id: mockDoneColumn._id },
          due_date: new Date('2024-01-05'),
          deleted_at: null,
        },
        {
          _id: 'task2',
          column_id: { _id: new mongoose.Types.ObjectId() },
          due_date: new Date('2024-01-10'),
          deleted_at: null,
        },
      ];

      Board.findById.mockResolvedValue(mockBoard);
      Column.findOne.mockResolvedValue(mockDoneColumn);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTasks),
        }),
      });

      const result = await AnalyticsService.getDashboardStats(validBoardId);

      expect(Board.findById).toHaveBeenCalledWith(validBoardId);
      expect(result).toHaveProperty('board');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('totalTasks');
      expect(result.stats).toHaveProperty('completedTasks');
      expect(result.stats).toHaveProperty('completionRate');
    });

    it('✅ should throw error when board_id is invalid', async () => {
      await expect(AnalyticsService.getDashboardStats('invalid-id')).rejects.toThrow(
        'Board ID không hợp lệ'
      );
    });

    it('✅ should throw error when board does not exist', async () => {
      Board.findById.mockResolvedValue(null);

      await expect(AnalyticsService.getDashboardStats(validBoardId)).rejects.toThrow(
        'Board không tồn tại'
      );
    });

    it('✅ should calculate completion rate correctly', async () => {
      const mockBoard = {
        _id: validBoardId,
        title: 'Test Board',
      };

      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        isDone: true,
      };

      const mockTasks = [
        {
          _id: 'task1',
          column_id: { _id: mockDoneColumn._id },
          deleted_at: null,
        },
        {
          _id: 'task2',
          column_id: { _id: mockDoneColumn._id },
          deleted_at: null,
        },
        {
          _id: 'task3',
          column_id: { _id: new mongoose.Types.ObjectId() },
          deleted_at: null,
        },
      ];

      Board.findById.mockResolvedValue(mockBoard);
      Column.findOne.mockResolvedValue(mockDoneColumn);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTasks),
        }),
      });

      const result = await AnalyticsService.getDashboardStats(validBoardId);

      expect(result.stats.totalTasks).toBe(3);
      expect(result.stats.completedTasks).toBe(2);
    });
  });

  describe('getCompletionRate', () => {
    it('✅ should get completion rate by board_id', async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: boardId,
        isDone: true,
      };

      const mockTasks = [
        {
          _id: 'task1',
          column_id: { _id: mockDoneColumn._id },
          deleted_at: null,
        },
        {
          _id: 'task2',
          column_id: { _id: new mongoose.Types.ObjectId() },
          deleted_at: null,
        },
      ];

      Column.findOne.mockResolvedValue(mockDoneColumn);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTasks),
        }),
      });

      const result = await AnalyticsService.getCompletionRate({
        board_id: boardId,
      });

      expect(result).toHaveProperty('totalTasks');
      expect(result).toHaveProperty('completedTasks');
      expect(result).toHaveProperty('completionRate');
    });

    it('✅ should return 0 completion rate when no tasks', async () => {
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await AnalyticsService.getCompletionRate({});

      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
    });
  });

  describe('_generateDateRanges', () => {
    it('✅ should generate day ranges correctly', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      const ranges = AnalyticsService._generateDateRanges(startDate, endDate, 'day');

      expect(ranges).toBeDefined();
      expect(ranges.length).toBeGreaterThan(0);
    });

    it('✅ should generate week ranges correctly', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-15');

      const ranges = AnalyticsService._generateDateRanges(startDate, endDate, 'week');

      expect(ranges).toBeDefined();
      expect(ranges.length).toBeGreaterThan(0);
    });

    it('✅ should generate month ranges correctly', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-01');

      const ranges = AnalyticsService._generateDateRanges(startDate, endDate, 'month');

      expect(ranges).toBeDefined();
      expect(ranges.length).toBeGreaterThan(0);
    });
  });

  describe('_getWeekNumber', () => {
    it('✅ should calculate week number correctly', () => {
      const date = new Date('2024-01-15');
      const weekNumber = AnalyticsService._getWeekNumber(date);

      expect(typeof weekNumber).toBe('number');
      expect(weekNumber).toBeGreaterThan(0);
    });
  });

  describe('parseColumns', () => {
    it('✅ should parse Vietnamese column change format', () => {
      const changeType = "Di chuyển từ cột 'Backlog' sang cột 'Doing'";
      const result = AnalyticsService.parseColumns(changeType);

      expect(result).toEqual({ from: 'Backlog', to: 'Doing' });
    });

    it('✅ should parse Vietnamese format with double quotes', () => {
      const changeType = 'Di chuyển từ cột "Backlog" sang cột "Doing"';
      const result = AnalyticsService.parseColumns(changeType);

      expect(result).toEqual({ from: 'Backlog', to: 'Doing' });
    });

    it('✅ should parse format without quotes', () => {
      const changeType = 'Di chuyển từ cột Backlog sang cột Doing';
      const result = AnalyticsService.parseColumns(changeType);

      expect(result).toEqual({ from: 'Backlog', to: 'Doing' });
    });

    it('✅ should return null for non-column changes', () => {
      const changeType = 'Updated task title';
      const result = AnalyticsService.parseColumns(changeType);

      expect(result).toBeNull();
    });

    it('✅ should return null for null input', () => {
      const result = AnalyticsService.parseColumns(null);

      expect(result).toBeNull();
    });

    it('✅ should return null for empty string', () => {
      const result = AnalyticsService.parseColumns('');

      expect(result).toBeNull();
    });
  });

  describe('isDone', () => {
    it('✅ should return true when column is done', async () => {
      const mockColumn = {
        name: 'Done',
        isDone: true,
      };

      Column.findOne.mockResolvedValue(mockColumn);

      const result = await AnalyticsService.isDone('Done');

      expect(result).toBe(true);
    });

    it('✅ should return false when column is not done', async () => {
      const mockColumn = {
        name: 'In Progress',
        isDone: false,
      };

      Column.findOne.mockResolvedValue(mockColumn);

      const result = await AnalyticsService.isDone('In Progress');

      expect(result).toBe(false);
    });
  });

  describe('getCycleTimeTask', () => {
    const validBoardId = new mongoose.Types.ObjectId();

    it('✅ should calculate cycle time successfully', async () => {
      const mockBoard = {
        _id: validBoardId,
        title: 'Test Board',
      };

      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Done',
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        title: 'Test Task',
        created_at: new Date('2024-01-01'),
        done_at: new Date('2024-01-05'),
        assigned_to: {
          _id: new mongoose.Types.ObjectId(),
          full_name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
        },
        swimlane_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Default',
        },
        priority: 'High',
        deleted_at: null,
      };

      const mockHistory = [
        {
          _id: new mongoose.Types.ObjectId(),
          task_id: mockTask._id,
          change_type: "Di chuyển từ cột 'Backlog' sang cột 'Doing'",
          createdAt: new Date('2024-01-02'),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          task_id: mockTask._id,
          change_type: "Di chuyển từ cột 'Doing' sang cột 'Done'",
          createdAt: new Date('2024-01-05'),
        },
      ];

      Board.findById.mockResolvedValue(mockBoard);
      Column.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([mockDoneColumn]),
      });
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockTask]),
          }),
        }),
      });
      HistoryTask.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockHistory),
      });

      const result = await AnalyticsService.getCycleTimeTask(validBoardId.toString());

      expect(result).toHaveProperty('board');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('tasks');
      expect(result.summary).toHaveProperty('averageCycleTime');
      expect(result.summary).toHaveProperty('medianCycleTime');
    });

    it('❌ should throw error when board_id is invalid', async () => {
      await expect(AnalyticsService.getCycleTimeTask('invalid-id')).rejects.toThrow(
        'Board ID không hợp lệ'
      );
    });

    it('❌ should throw error when board does not exist', async () => {
      Board.findById.mockResolvedValue(null);

      await expect(AnalyticsService.getCycleTimeTask(validBoardId.toString())).rejects.toThrow(
        'Không tìm thấy bảng'
      );
    });
  });

  describe('getThroughputAndCFD', () => {
    const validBoardId = new mongoose.Types.ObjectId();

    it('✅ should calculate throughput and CFD successfully', async () => {
      const mockBoard = {
        _id: validBoardId,
        title: 'Test Board',
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
      };

      const mockColumn = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Backlog',
      };

      const mockHistory = [
        {
          _id: new mongoose.Types.ObjectId(),
          task_id: mockTask._id,
          change_type: "Di chuyển từ cột 'Backlog' sang cột 'Doing'",
          createdAt: new Date('2024-01-02'),
        },
      ];

      Board.findById.mockResolvedValue(mockBoard);
      Task.find.mockResolvedValue([mockTask]);
      HistoryTask.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockHistory),
      });
      Column.find.mockResolvedValue([mockColumn]);

      const result = await AnalyticsService.getThroughputAndCFD(validBoardId.toString());

      expect(result).toHaveProperty('columnFlow');
      expect(result).toHaveProperty('columnAvgTimes');
      expect(result).toHaveProperty('cfd');
      expect(result).toHaveProperty('wipViolations');
    });

    it('❌ should throw error when board_id is invalid', async () => {
      await expect(AnalyticsService.getThroughputAndCFD('invalid-id')).rejects.toThrow(
        'Board ID không hợp lệ'
      );
    });

    it('❌ should throw error when board does not exist', async () => {
      Board.findById.mockResolvedValue(null);

      await expect(AnalyticsService.getThroughputAndCFD(validBoardId.toString())).rejects.toThrow(
        'Không tìm thấy bảng'
      );
    });
  });

  describe('getCompletionSpeed', () => {
    const validParams = {
      board_id: new mongoose.Types.ObjectId().toString(),
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    };

    it('✅ should calculate completion speed successfully', async () => {
      const mockBoard = {
        _id: validParams.board_id,
        title: 'Test Board',
      };

      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validParams.board_id,
        isDone: true,
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validParams.board_id,
        done_at: new Date('2024-01-15'),
        priority: 'High',
        deleted_at: null,
      };

      Board.findById.mockResolvedValue(mockBoard);
      Column.findOne.mockResolvedValue(mockDoneColumn);
      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockTask]),
      });

      const result = await AnalyticsService.getCompletionSpeed(validParams);

      expect(result).toHaveProperty('board');
      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('weeklyData');
      expect(result).toHaveProperty('averageVelocity');
    });

    it('❌ should throw error when board_id is invalid', async () => {
      await expect(
        AnalyticsService.getCompletionSpeed({
          board_id: 'invalid-id',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        })
      ).rejects.toThrow('Board ID không hợp lệ');
    });

    it('❌ should throw error when dates are missing', async () => {
      await expect(
        AnalyticsService.getCompletionSpeed({
          board_id: validParams.board_id,
        })
      ).rejects.toThrow('start_date và end_date là bắt buộc');
    });

    it('✅ should return empty data when no done column', async () => {
      const mockBoard = {
        _id: validParams.board_id,
        title: 'Test Board',
      };

      Board.findById.mockResolvedValue(mockBoard);
      Column.findOne.mockResolvedValue(null);

      const result = await AnalyticsService.getCompletionSpeed(validParams);

      expect(result).toHaveProperty('weeklyData');
      expect(result.weeklyData).toEqual([]);
      expect(result.averageVelocity).toBe(0);
    });
  });

  describe('getEstimationAccuracy', () => {
    const validParams = {
      board_id: new mongoose.Types.ObjectId().toString(),
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    };

    it('✅ should calculate estimation accuracy successfully', async () => {
      const mockBoard = {
        _id: validParams.board_id,
        title: 'Test Board',
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validParams.board_id,
        created_at: new Date('2024-01-01'),
        done_at: new Date('2024-01-05'),
        estimate_hours: 8,
        assigned_to: {
          _id: new mongoose.Types.ObjectId(),
          username: 'testuser',
          full_name: 'Test User',
        },
        priority: 'High',
        deleted_at: null,
      };

      Board.findById.mockResolvedValue(mockBoard);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTask]),
        }),
      });

      const result = await AnalyticsService.getEstimationAccuracy(validParams);

      expect(result).toHaveProperty('board');
      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('byUser');
      expect(result).toHaveProperty('byPriority');
      expect(result).toHaveProperty('distribution');
    });

    it('❌ should throw error when board_id is invalid', async () => {
      await expect(
        AnalyticsService.getEstimationAccuracy({
          board_id: 'invalid-id',
        })
      ).rejects.toThrow('Board ID không hợp lệ');
    });

    it('❌ should throw error when board does not exist', async () => {
      Board.findById.mockResolvedValue(null);

      await expect(AnalyticsService.getEstimationAccuracy(validParams)).rejects.toThrow(
        'Board không tồn tại'
      );
    });

    it('✅ should return empty data when no valid tasks', async () => {
      const mockBoard = {
        _id: validParams.board_id,
        title: 'Test Board',
      };

      Board.findById.mockResolvedValue(mockBoard);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await AnalyticsService.getEstimationAccuracy(validParams);

      expect(result.overview.totalTasks).toBe(0);
      expect(result.byUser).toEqual([]);
    });
  });

  describe('getGamificationCorrelation', () => {
    it('✅ should calculate gamification correlation successfully', async () => {
      const mockUserPoint = {
        _id: new mongoose.Types.ObjectId(),
        user_id: {
          _id: new mongoose.Types.ObjectId(),
          email: 'test@example.com',
          full_name: 'Test User',
          username: 'testuser',
        },
        points: 100,
        total_points: 200,
        level: 5,
        center_id: new mongoose.Types.ObjectId(),
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: mockUserPoint.user_id._id,
        created_by: mockUserPoint.user_id._id,
        done_at: new Date(),
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          isDone: true,
        },
        deleted_at: null,
      };

      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        isDone: true,
      };

      UserPoint.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockUserPoint]),
        }),
      });
      User.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      Column.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockDoneColumn]),
      });
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTask]),
        }),
      });

      const result = await AnalyticsService.getGamificationCorrelation({});

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('completionRateComparison');
      expect(result).toHaveProperty('correlation');
      expect(result).toHaveProperty('engagementMetrics');
      expect(result).toHaveProperty('userDetails');
    });

    it('❌ should throw error when center_id is invalid', async () => {
      await expect(
        AnalyticsService.getGamificationCorrelation({
          center_id: 'invalid-id',
        })
      ).rejects.toThrow('Center ID không hợp lệ');
    });

    it('❌ should throw error when board_id is invalid', async () => {
      await expect(
        AnalyticsService.getGamificationCorrelation({
          board_id: 'invalid-id',
        })
      ).rejects.toThrow('Board ID không hợp lệ');
    });
  });

  describe('compareCentersPerformance', () => {
    it('✅ should compare centers performance successfully', async () => {
      const mockCenter = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Center',
        status: 'active',
        address: 'Test Address',
        deleted_at: null,
      };

      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        isDone: true,
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: new mongoose.Types.ObjectId(),
        created_by: new mongoose.Types.ObjectId(),
        done_at: new Date(),
        column_id: {
          _id: mockDoneColumn._id,
          isDone: true,
        },
        deleted_at: null,
      };

      const mockCenterMember = {
        _id: new mongoose.Types.ObjectId(),
        center_id: mockCenter._id,
        user_id: new mongoose.Types.ObjectId(),
        deleted: false,
      };

      Center.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockCenter]),
      });
      Column.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockDoneColumn]),
      });
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTask]),
        }),
      });
      CenterMember.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockCenterMember]),
      });
      User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      UserPoint.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await AnalyticsService.compareCentersPerformance({});

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('centers');
      expect(result).toHaveProperty('rankings');
      expect(result).toHaveProperty('insights');
    });

    it('✅ should return empty data when no centers', async () => {
      Center.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await AnalyticsService.compareCentersPerformance({});

      expect(result.summary.totalCenters).toBe(0);
      expect(result.centers).toEqual([]);
    });

    it('❌ should throw error when board_id is invalid', async () => {
      // Service validates board_id after getting centers
      Center.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            name: 'Test Center',
            status: 'active',
          },
        ]),
      });

      await expect(
        AnalyticsService.compareCentersPerformance({
          board_id: 'invalid-id',
        })
      ).rejects.toThrow('Board ID không hợp lệ');
    });
  });

  describe('getWorkload', () => {
    const validBoardId = new mongoose.Types.ObjectId();

    it('✅ should calculate workload successfully', async () => {
      const mockBoardMember = [
        {
          user_id: {
            _id: new mongoose.Types.ObjectId(),
            username: 'user1',
          },
        },
        {
          user_id: {
            _id: new mongoose.Types.ObjectId(),
            username: 'user2',
          },
        },
      ];

      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        isDone: true,
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        assigned_to: mockBoardMember[0].user_id._id,
        column_id: mockDoneColumn._id,
        due_date: new Date('2024-01-10'),
        deleted_at: null,
      };

      boardMemberService.getMembers.mockResolvedValue(mockBoardMember);
      Column.findOne.mockResolvedValue(mockDoneColumn);
      Task.find.mockResolvedValue([mockTask]);

      const result = await AnalyticsService.getWorkload({ board_id: validBoardId.toString() });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('averageTasks');
      expect(result).toHaveProperty('variance');
    });

    it('✅ should return empty array when no board members', async () => {
      boardMemberService.getMembers.mockResolvedValue([]);

      const result = await AnalyticsService.getWorkload({ board_id: validBoardId.toString() });

      expect(result).toEqual([]);
    });

    it('❌ should throw error when done column not found', async () => {
      const mockBoardMember = [
        {
          user_id: {
            _id: new mongoose.Types.ObjectId(),
            username: 'user1',
          },
        },
      ];

      boardMemberService.getMembers.mockResolvedValue(mockBoardMember);
      Column.findOne.mockResolvedValue(null);

      // Service catches error and throws generic message
      await expect(
        AnalyticsService.getWorkload({ board_id: validBoardId.toString() })
      ).rejects.toThrow('Không thể lấy workload');
    });
  });

  describe('getHealthScore', () => {
    const validBoardId = new mongoose.Types.ObjectId();

    it('✅ should calculate health score successfully', async () => {
      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        isDone: true,
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        column_id: mockDoneColumn._id,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-05'),
        done_at: new Date('2024-01-05'),
        due_date: new Date('2024-01-10'),
        assigned_to: new mongoose.Types.ObjectId(),
        deleted_at: null,
      };

      Task.find.mockResolvedValue([mockTask]);
      Column.findOne.mockResolvedValue(mockDoneColumn);

      const result = await AnalyticsService.getHealthScore({ board_id: validBoardId.toString() });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('healthScore');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('metrics');
    });

    it('✅ should return Green status for high health score', async () => {
      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        isDone: true,
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        column_id: mockDoneColumn._id,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-05'),
        done_at: new Date('2024-01-05'),
        due_date: new Date('2024-01-10'),
        assigned_to: new mongoose.Types.ObjectId(),
        deleted_at: null,
      };

      Task.find.mockResolvedValue([mockTask]);
      Column.findOne.mockResolvedValue(mockDoneColumn);

      const result = await AnalyticsService.getHealthScore({ board_id: validBoardId.toString() });

      expect(result.status).toBeDefined();
      expect(['Green', 'Yellow', 'Red']).toContain(result.status);
    });
  });

  describe('getLeaderboard', () => {
    it('✅ should get leaderboard successfully', async () => {
      const mockUserPoint = {
        _id: new mongoose.Types.ObjectId(),
        user_id: {
          _id: new mongoose.Types.ObjectId(),
          username: 'testuser',
          full_name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        center_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Test Center',
        },
        points: 100,
        total_points: 200,
        level: 5,
        status: 'active',
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        assigned_to: {
          _id: mockUserPoint.user_id._id,
          username: 'testuser',
        },
        done_at: new Date('2024-01-15'),
        due_date: new Date('2024-01-10'),
        deleted_at: null,
      };

      UserPoint.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([mockUserPoint]),
              }),
            }),
          }),
        }),
      });
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockTask]),
        }),
      });

      const result = await AnalyticsService.getLeaderboard({});

      expect(result).toHaveProperty('leaderboard');
      expect(result).toHaveProperty('cheatDetection');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('dateRange');
    });

    it('✅ should return empty data when no user points', async () => {
      UserPoint.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const result = await AnalyticsService.getLeaderboard({});

      expect(result.leaderboard).toEqual([]);
      expect(result.summary.totalUsers).toBe(0);
    });

    it('❌ should throw error when center_id is invalid', async () => {
      await expect(
        AnalyticsService.getLeaderboard({
          center_id: 'invalid-id',
        })
      ).rejects.toThrow('Center ID không hợp lệ');
    });

    it('❌ should throw error when date format is invalid', async () => {
      // Service validates dates when both start_date and end_date are provided
      // Need to return non-empty array to trigger validation
      const mockUserPoint = {
        _id: new mongoose.Types.ObjectId(),
        user_id: {
          _id: new mongoose.Types.ObjectId(),
          username: 'testuser',
        },
        points: 100,
      };

      UserPoint.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([mockUserPoint]),
              }),
            }),
          }),
        }),
      });
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        AnalyticsService.getLeaderboard({
          start_date: 'invalid-date',
          end_date: '2024-01-31',
        })
      ).rejects.toThrow('Date phải có format YYYY-MM-DD');
    });
  });

  describe('getTaskQualityMetrics', () => {
    const validBoardId = new mongoose.Types.ObjectId();

    it('✅ should calculate task quality metrics successfully', async () => {
      const mockBoard = {
        _id: validBoardId,
        title: 'Test Board',
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        title: 'Test Task',
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
        },
        assigned_to: {
          _id: new mongoose.Types.ObjectId(),
          username: 'testuser',
          full_name: 'Test User',
        },
        attachments: [],
        deleted_at: null,
      };

      const mockComment = {
        _id: new mongoose.Types.ObjectId(),
        task_id: mockTask._id,
        attachments: [],
        deleted_at: null,
      };

      Board.findById.mockResolvedValue(mockBoard);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockTask]),
          }),
        }),
      });
      Comment.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockComment]),
      });
      HistoryTask.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await AnalyticsService.getTaskQualityMetrics({
        board_id: validBoardId.toString(),
      });

      expect(result).toHaveProperty('board');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('lowQualityTasks');
      expect(result).toHaveProperty('highChurnTasks');
      expect(result).toHaveProperty('tasks');
    });

    it('❌ should throw error when board_id is invalid', async () => {
      await expect(
        AnalyticsService.getTaskQualityMetrics({
          board_id: 'invalid-id',
        })
      ).rejects.toThrow('Board ID không hợp lệ');
    });

    it('❌ should throw error when board does not exist', async () => {
      Board.findById.mockResolvedValue(null);

      await expect(
        AnalyticsService.getTaskQualityMetrics({
          board_id: validBoardId.toString(),
        })
      ).rejects.toThrow('Board không tồn tại');
    });

    it('✅ should return empty data when no tasks', async () => {
      const mockBoard = {
        _id: validBoardId,
        title: 'Test Board',
      };

      Board.findById.mockResolvedValue(mockBoard);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await AnalyticsService.getTaskQualityMetrics({
        board_id: validBoardId.toString(),
      });

      expect(result.summary.totalTasks).toBe(0);
      expect(result.tasks).toEqual([]);
    });
  });

  describe('getOverdueAnalysis', () => {
    const validBoardId = new mongoose.Types.ObjectId();

    it('✅ should analyze overdue tasks successfully', async () => {
      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        isDone: true,
      };

      const mockTask = {
        _id: new mongoose.Types.ObjectId(),
        board_id: validBoardId,
        title: 'Overdue Task',
        due_date: new Date('2024-01-01'),
        priority: 'High',
        column_id: {
          _id: new mongoose.Types.ObjectId(),
          name: 'In Progress',
        },
        assigned_to: {
          _id: new mongoose.Types.ObjectId(),
          username: 'testuser',
          full_name: 'Test User',
          email: 'test@example.com',
        },
        deleted_at: null,
      };

      Column.findOne.mockResolvedValue(mockDoneColumn);
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockTask]),
          }),
        }),
      });

      const result = await AnalyticsService.getOverdueAnalysis(validBoardId.toString());

      expect(result).toHaveProperty('totalOverdueTasks');
      expect(result).toHaveProperty('overdueTasks');
      expect(result).toHaveProperty('breakdownByUser');
      expect(result).toHaveProperty('breakdownByPriority');
      expect(result).toHaveProperty('breakdownByColumn');
      expect(result).toHaveProperty('repeatOffenders');
      expect(result).toHaveProperty('averageOverdueDays');
    });

    it('❌ should throw error when done column not found', async () => {
      Column.findOne.mockResolvedValue(null);

      await expect(AnalyticsService.getOverdueAnalysis(validBoardId.toString())).rejects.toThrow(
        'Không tìm thấy cột Done'
      );
    });
  });

  describe('_calculateTrend', () => {
    it('✅ should calculate increasing trend', () => {
      const values = [1, 2, 3, 4, 5];
      const result = AnalyticsService._calculateTrend(values);

      expect(result).toHaveProperty('slope');
      expect(result).toHaveProperty('intercept');
      expect(result).toHaveProperty('direction');
      expect(result.direction).toBe('increasing');
    });

    it('✅ should calculate decreasing trend', () => {
      const values = [5, 4, 3, 2, 1];
      const result = AnalyticsService._calculateTrend(values);

      expect(result.direction).toBe('decreasing');
    });

    it('✅ should calculate stable trend', () => {
      const values = [5, 5, 5, 5, 5];
      const result = AnalyticsService._calculateTrend(values);

      expect(result.direction).toBe('stable');
    });

    it('✅ should return null when less than 2 values', () => {
      const values = [1];
      const result = AnalyticsService._calculateTrend(values);

      expect(result).toBeNull();
    });
  });

  describe('_forecastNextWeeks', () => {
    it('✅ should forecast next weeks successfully', () => {
      const result = AnalyticsService._forecastNextWeeks(10, 1, 10);

      expect(result).toHaveProperty('nextWeek');
      expect(result).toHaveProperty('next2Weeks');
      expect(result).toHaveProperty('next4Weeks');
      expect(result).toHaveProperty('confidence');
    });

    it('✅ should not return negative values', () => {
      const result = AnalyticsService._forecastNextWeeks(1, -10, 1);

      expect(result.nextWeek).toBeGreaterThanOrEqual(0);
      expect(result.next2Weeks).toBeGreaterThanOrEqual(0);
      expect(result.next4Weeks).toBeGreaterThanOrEqual(0);
    });
  });

  describe('_compareWithPreviousPeriod', () => {
    it('✅ should compare with previous period successfully', () => {
      const weeklyData = [
        { completedTasks: 5 },
        { completedTasks: 6 },
        { completedTasks: 7 },
        { completedTasks: 8 },
      ];

      const result = AnalyticsService._compareWithPreviousPeriod(weeklyData, 4);

      expect(result).toHaveProperty('previousPeriod');
      expect(result).toHaveProperty('currentPeriod');
      expect(result).toHaveProperty('difference');
      expect(result).toHaveProperty('percentageChange');
      expect(result).toHaveProperty('direction');
    });

    it('✅ should return null when less than 4 weeks', () => {
      const weeklyData = [{ completedTasks: 5 }, { completedTasks: 6 }];

      const result = AnalyticsService._compareWithPreviousPeriod(weeklyData, 2);

      expect(result).toBeNull();
    });
  });

  describe('_calculatePriorityBreakdown', () => {
    it('✅ should calculate priority breakdown successfully', () => {
      const weeklyData = [
        {
          priorityBreakdown: {
            High: 2,
            Medium: 3,
            Low: 1,
            None: 0,
          },
        },
        {
          priorityBreakdown: {
            High: 1,
            Medium: 2,
            Low: 2,
            None: 1,
          },
        },
      ];

      const result = AnalyticsService._calculatePriorityBreakdown(weeklyData);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('percentages');
      expect(result.total.High).toBe(3);
      expect(result.total.Medium).toBe(5);
    });
  });

  describe('_calculateMedian', () => {
    it('✅ should calculate median for odd number of values', () => {
      const values = [1, 2, 3, 4, 5];
      const result = AnalyticsService._calculateMedian(values);

      expect(result).toBe(3);
    });

    it('✅ should calculate median for even number of values', () => {
      const values = [1, 2, 3, 4];
      const result = AnalyticsService._calculateMedian(values);

      expect(result).toBe(2.5);
    });

    it('✅ should return 0 for empty array', () => {
      const result = AnalyticsService._calculateMedian([]);

      expect(result).toBe(0);
    });
  });

  describe('_interpretCorrelation', () => {
    it('✅ should interpret strong positive correlation', () => {
      const result = AnalyticsService._interpretCorrelation(0.8);

      expect(result).toContain('mạnh');
    });

    it('✅ should interpret moderate correlation', () => {
      const result = AnalyticsService._interpretCorrelation(0.5);

      expect(result).toContain('trung bình');
    });

    it('✅ should interpret weak correlation', () => {
      const result = AnalyticsService._interpretCorrelation(0.3);

      expect(result).toContain('yếu');
    });

    it('✅ should interpret very weak correlation', () => {
      const result = AnalyticsService._interpretCorrelation(0.1);

      expect(result).toContain('Không có tương quan đáng kể');
    });

    it('✅ should handle null correlation', () => {
      const result = AnalyticsService._interpretCorrelation(null);

      expect(result).toContain('Không đủ dữ liệu');
    });
  });
});

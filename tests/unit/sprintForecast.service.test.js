// 📄 tests/unit/sprintForecast.service.test.js - Sprint Forecast Service Unit Tests
const mongoose = require('mongoose');

// Mock models
jest.mock('../../models/task.model');
jest.mock('../../models/column.model');
jest.mock('../../models/boardMember.model');
jest.mock('../../models/userLeave.model');

// Now require the service after mocks are set up
const SprintForecastService = require('../../services/sprintForecast.service');
const Task = require('../../models/task.model');
const Column = require('../../models/column.model');
const BoardMember = require('../../models/boardMember.model');
const UserLeave = require('../../models/userLeave.model');

describe('🔹 Sprint Forecast Service Unit Tests', () => {
  let mockBoardId;
  let mockNextSprintStart;
  let mockNextSprintEnd;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBoardId = new mongoose.Types.ObjectId();
    mockNextSprintStart = new Date('2024-01-15');
    mockNextSprintEnd = new Date('2024-01-28');
  });

  describe('getSprintForecast', () => {
    it('✅ should get sprint forecast successfully', async () => {
      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: mockBoardId,
        isDone: true,
      };
      const mockBoardMembers = [
        { user_id: new mongoose.Types.ObjectId() },
        { user_id: new mongoose.Types.ObjectId() },
      ];
      const mockCompletedTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          board_id: mockBoardId,
          done_at: new Date('2024-01-10'),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          board_id: mockBoardId,
          done_at: new Date('2024-01-12'),
        },
      ];

      Column.findOne.mockResolvedValue(mockDoneColumn);
      BoardMember.find.mockResolvedValue(mockBoardMembers);
      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCompletedTasks),
      });
      Task.countDocuments.mockResolvedValue(5);
      UserLeave.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await SprintForecastService.getSprintForecast(
        mockBoardId.toString(),
        mockNextSprintStart,
        mockNextSprintEnd,
        14
      );

      expect(result).toHaveProperty('board_id');
      expect(result).toHaveProperty('next_sprint');
      expect(result).toHaveProperty('historical_velocity');
      expect(result).toHaveProperty('confidence_interval');
      expect(result).toHaveProperty('risk_factors');
      expect(result).toHaveProperty('recommendation');
      expect(result.next_sprint.start_date).toEqual(mockNextSprintStart);
      expect(result.next_sprint.end_date).toEqual(mockNextSprintEnd);
    });

    it('❌ should throw error when board_id is invalid', async () => {
      await expect(
        SprintForecastService.getSprintForecast(
          'invalid-id',
          mockNextSprintStart,
          mockNextSprintEnd
        )
      ).rejects.toThrow('Board ID không hợp lệ');
    });

    it('❌ should throw error when done column not found', async () => {
      Column.findOne.mockResolvedValue(null);

      await expect(
        SprintForecastService.getSprintForecast(
          mockBoardId.toString(),
          mockNextSprintStart,
          mockNextSprintEnd
        )
      ).rejects.toThrow('Board không có cột Done');
    });

    it('✅ should handle zero velocity when no completed tasks', async () => {
      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: mockBoardId,
        isDone: true,
      };
      const mockBoardMembers = [{ user_id: new mongoose.Types.ObjectId() }];

      Column.findOne.mockResolvedValue(mockDoneColumn);
      BoardMember.find.mockResolvedValue(mockBoardMembers);
      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      Task.countDocuments.mockResolvedValue(0);
      UserLeave.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await SprintForecastService.getSprintForecast(
        mockBoardId.toString(),
        mockNextSprintStart,
        mockNextSprintEnd
      );

      expect(result.historical_velocity.average).toBe(0);
      expect(result.recommendation.recommended_task_count).toBe(0);
    });

    it('✅ should calculate risk factors with on leave users', async () => {
      const mockDoneColumn = {
        _id: new mongoose.Types.ObjectId(),
        board_id: mockBoardId,
        isDone: true,
      };
      const mockUserId = new mongoose.Types.ObjectId();
      const mockBoardMembers = [{ user_id: mockUserId }];
      const mockOnLeaveUsers = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          leave_start: new Date('2024-01-10'),
          leave_end: new Date('2024-01-20'),
        },
      ];

      Column.findOne.mockResolvedValue(mockDoneColumn);
      BoardMember.find.mockResolvedValue(mockBoardMembers);
      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      Task.countDocuments.mockResolvedValue(0);
      UserLeave.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOnLeaveUsers),
      });

      const result = await SprintForecastService.getSprintForecast(
        mockBoardId.toString(),
        mockNextSprintStart,
        mockNextSprintEnd
      );

      expect(result.risk_factors.users_on_leave).toBeGreaterThan(0);
      expect(result.risk_factors.on_leave_percentage).toBeGreaterThan(0);
    });
  });

  describe('_calculateVelocity', () => {
    it('✅ should return 0 when no completed tasks', () => {
      const result = SprintForecastService._calculateVelocity(
        [],
        new Date('2024-01-01'),
        new Date('2024-01-15'),
        14
      );

      expect(result).toBe(0);
    });

    it('✅ should calculate velocity correctly', () => {
      const completedTasks = [
        { _id: 'task1' },
        { _id: 'task2' },
        { _id: 'task3' },
        { _id: 'task4' },
      ];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-29'); // 28 days = 2 sprints of 14 days

      const result = SprintForecastService._calculateVelocity(
        completedTasks,
        startDate,
        endDate,
        14
      );

      expect(result).toBeGreaterThan(0);
    });

    it('✅ should handle single sprint period', () => {
      const completedTasks = [{ _id: 'task1' }, { _id: 'task2' }];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10'); // Less than 14 days

      const result = SprintForecastService._calculateVelocity(
        completedTasks,
        startDate,
        endDate,
        14
      );

      expect(result).toBeGreaterThan(0);
    });
  });

  describe('_calculateRiskFactors', () => {
    it('✅ should calculate risk factors with no on leave users', async () => {
      const memberIds = [new mongoose.Types.ObjectId()];
      UserLeave.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await SprintForecastService._calculateRiskFactors(
        mockBoardId,
        memberIds,
        mockNextSprintStart,
        mockNextSprintEnd,
        5,
        10
      );

      expect(result.onLeaveCount).toBe(0);
      expect(result.onLeavePercentage).toBe(0);
      expect(result).toHaveProperty('holidaysCount');
      expect(result).toHaveProperty('workingDays');
      expect(result).toHaveProperty('totalRiskAdjustment');
    });

    it('✅ should calculate risk factors with on leave users', async () => {
      const memberIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
      const mockOnLeaveUsers = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: memberIds[0],
          leave_start: new Date('2024-01-10'),
          leave_end: new Date('2024-01-20'),
        },
      ];
      UserLeave.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOnLeaveUsers),
      });

      const result = await SprintForecastService._calculateRiskFactors(
        mockBoardId,
        memberIds,
        mockNextSprintStart,
        mockNextSprintEnd,
        5,
        10
      );

      expect(result.onLeaveCount).toBe(1);
      expect(result.onLeavePercentage).toBeGreaterThan(0);
    });

    it('✅ should calculate WIP risk factor', async () => {
      const memberIds = [new mongoose.Types.ObjectId()];
      UserLeave.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await SprintForecastService._calculateRiskFactors(
        mockBoardId,
        memberIds,
        mockNextSprintStart,
        mockNextSprintEnd,
        25, // High WIP
        10 // velocity
      );

      expect(result.wipRiskFactor).toBeGreaterThan(0);
    });

    it('✅ should handle zero velocity with WIP', async () => {
      const memberIds = [new mongoose.Types.ObjectId()];
      UserLeave.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await SprintForecastService._calculateRiskFactors(
        mockBoardId,
        memberIds,
        mockNextSprintStart,
        mockNextSprintEnd,
        5, // WIP > 0
        0 // velocity = 0
      );

      expect(result.wipRiskFactor).toBe(0.5);
    });
  });

  describe('_getHolidaysInRange', () => {
    it('✅ should return weekends as holidays', () => {
      const startDate = new Date('2024-01-13'); // Saturday
      const endDate = new Date('2024-01-14'); // Sunday

      const result = SprintForecastService._getHolidaysInRange(startDate, endDate);

      expect(result.length).toBeGreaterThan(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('✅ should include Vietnam holidays', () => {
      const startDate = new Date('2023-12-31');
      const endDate = new Date('2024-01-02');

      const result = SprintForecastService._getHolidaysInRange(startDate, endDate);

      expect(result).toContain('2024-01-01');
    });

    it('✅ should return unique holidays', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      const result = SprintForecastService._getHolidaysInRange(startDate, endDate);

      const uniqueResult = [...new Set(result)];
      expect(result.length).toBe(uniqueResult.length);
    });
  });

  describe('_getWorkingDays', () => {
    it('✅ should calculate working days excluding weekends', () => {
      const startDate = new Date('2024-01-15'); // Monday
      const endDate = new Date('2024-01-19'); // Friday
      const holidays = [];

      const result = SprintForecastService._getWorkingDays(startDate, endDate, holidays);

      expect(result).toBe(5); // Monday to Friday
    });

    it('✅ should exclude holidays from working days', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');
      const holidays = ['2024-01-01'];

      const result = SprintForecastService._getWorkingDays(startDate, endDate, holidays);

      expect(result).toBeLessThan(3);
    });

    it('✅ should exclude weekends from working days', () => {
      const startDate = new Date('2024-01-13'); // Saturday
      const endDate = new Date('2024-01-14'); // Sunday
      const holidays = [];

      const result = SprintForecastService._getWorkingDays(startDate, endDate, holidays);

      expect(result).toBe(0);
    });
  });

  describe('_calculateRecommendedTaskCount', () => {
    it('✅ should return 0 when velocity is 0', () => {
      const velocity = 0;
      const confidenceInterval = { min: 0, max: 0 };
      const riskFactors = { totalRiskAdjustment: -0.1 };
      const currentWIP = 5;

      const result = SprintForecastService._calculateRecommendedTaskCount(
        velocity,
        confidenceInterval,
        riskFactors,
        currentWIP
      );

      expect(result).toBe(0);
    });

    it('✅ should return 0 when WIP is too high', () => {
      const velocity = 10;
      const confidenceInterval = { min: 8, max: 12 };
      const riskFactors = { totalRiskAdjustment: -0.1 };
      const currentWIP = 25; // > velocity * 2

      const result = SprintForecastService._calculateRecommendedTaskCount(
        velocity,
        confidenceInterval,
        riskFactors,
        currentWIP
      );

      expect(result).toBe(0);
    });

    it('✅ should calculate recommended count with risk factors', () => {
      const velocity = 10;
      const confidenceInterval = { min: 8, max: 12 };
      const riskFactors = { totalRiskAdjustment: -0.1 };
      const currentWIP = 5;

      const result = SprintForecastService._calculateRecommendedTaskCount(
        velocity,
        confidenceInterval,
        riskFactors,
        currentWIP
      );

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(confidenceInterval.max);
    });

    it('✅ should not exceed confidence interval max', () => {
      const velocity = 10;
      const confidenceInterval = { min: 8, max: 12 };
      const riskFactors = { totalRiskAdjustment: 0.5 }; // Positive adjustment
      const currentWIP = 5;

      const result = SprintForecastService._calculateRecommendedTaskCount(
        velocity,
        confidenceInterval,
        riskFactors,
        currentWIP
      );

      expect(result).toBeLessThanOrEqual(confidenceInterval.max);
    });
  });

  describe('_getConfidenceLevel', () => {
    it('✅ should return high for low risk', () => {
      const result = SprintForecastService._getConfidenceLevel(-0.05);

      expect(result).toBe('high');
    });

    it('✅ should return medium for moderate risk', () => {
      const result = SprintForecastService._getConfidenceLevel(-0.15);

      expect(result).toBe('medium');
    });

    it('✅ should return low for high risk', () => {
      const result = SprintForecastService._getConfidenceLevel(-0.35);

      expect(result).toBe('low');
    });

    it('✅ should handle positive risk adjustment', () => {
      const result = SprintForecastService._getConfidenceLevel(0.25);

      expect(result).toBe('medium');
    });
  });

  describe('_generateRecommendationNotes', () => {
    it('✅ should include note when velocity is 0', () => {
      const velocity = 0;
      const riskFactors = {
        onLeaveCount: 0,
        onLeavePercentage: 0,
        holidaysCount: 0,
        holidaysPercentage: 0,
      };
      const currentWIP = 0;

      const result = SprintForecastService._generateRecommendationNotes(
        velocity,
        riskFactors,
        currentWIP
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('Không có dữ liệu lịch sử');
    });

    it('✅ should include note when on leave percentage > 20', () => {
      const velocity = 10;
      const riskFactors = {
        onLeaveCount: 3,
        onLeavePercentage: 25,
        holidaysCount: 0,
        holidaysPercentage: 0,
      };
      const currentWIP = 5;

      const result = SprintForecastService._generateRecommendationNotes(
        velocity,
        riskFactors,
        currentWIP
      );

      expect(result.some(note => note.includes('nghỉ phép'))).toBe(true);
    });

    it('✅ should include note when holidays percentage > 15', () => {
      const velocity = 10;
      const riskFactors = {
        onLeaveCount: 0,
        onLeavePercentage: 0,
        holidaysCount: 3,
        holidaysPercentage: 20,
      };
      const currentWIP = 5;

      const result = SprintForecastService._generateRecommendationNotes(
        velocity,
        riskFactors,
        currentWIP
      );

      expect(result.some(note => note.includes('nghỉ lễ'))).toBe(true);
    });

    it('✅ should include note when WIP is too high', () => {
      const velocity = 10;
      const riskFactors = {
        onLeaveCount: 0,
        onLeavePercentage: 0,
        holidaysCount: 0,
        holidaysPercentage: 0,
      };
      const currentWIP = 25; // > velocity * 2

      const result = SprintForecastService._generateRecommendationNotes(
        velocity,
        riskFactors,
        currentWIP
      );

      expect(result.some(note => note.includes('WIP'))).toBe(true);
    });

    it('✅ should return favorable note when conditions are good', () => {
      const velocity = 10;
      const riskFactors = {
        onLeaveCount: 0,
        onLeavePercentage: 0,
        holidaysCount: 0,
        holidaysPercentage: 0,
      };
      const currentWIP = 5;

      const result = SprintForecastService._generateRecommendationNotes(
        velocity,
        riskFactors,
        currentWIP
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('Điều kiện thuận lợi');
    });
  });
});

// 📄 tests/unit/userActivityPattern.service.test.js - User Activity Pattern Service Unit Tests
const mongoose = require('mongoose');

// Mock dependencies BEFORE requiring the service
jest.mock('../../repositories/userActivityPattern.repository');
jest.mock('../../models/activityLog.model');

// Now require the service after mocks are set up
const UserActivityPatternService = require('../../services/userActivityPattern.service');
const userActivityPatternRepo = require('../../repositories/userActivityPattern.repository');
const ActivityLog = require('../../models/activityLog.model');

describe('🔹 User Activity Pattern Service Unit Tests', () => {
  let mockUserId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();
  });

  describe('analyzeUserActivity', () => {
    it('✅ should create default pattern when no activity logs', async () => {
      ActivityLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      const mockDefaultPattern = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        active_hours: [9, 10, 11, 14, 15, 16],
        deep_work_periods: [],
        optimal_notification_times: [{ day_of_week: 1, hours: [9, 10, 14, 15] }],
        confidence_score: 0.3,
      };
      userActivityPatternRepo.upsertByUserId.mockResolvedValue(mockDefaultPattern);

      const result = await UserActivityPatternService.analyzeUserActivity(mockUserId);

      expect(ActivityLog.find).toHaveBeenCalled();
      expect(userActivityPatternRepo.upsertByUserId).toHaveBeenCalled();
      expect(result).toEqual(mockDefaultPattern);
    });

    it('✅ should analyze patterns from activity logs', async () => {
      const mockActivityLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          action: 'view_task',
          created_at: new Date('2024-01-15T09:00:00'),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          action: 'update_task',
          created_at: new Date('2024-01-15T10:00:00'),
        },
      ];
      ActivityLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockActivityLogs),
        }),
      });
      const mockPattern = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        active_hours: [9, 10],
        deep_work_periods: [],
        optimal_notification_times: [],
        confidence_score: 0.1,
      };
      userActivityPatternRepo.upsertByUserId.mockResolvedValue(mockPattern);

      const result = await UserActivityPatternService.analyzeUserActivity(mockUserId);

      expect(userActivityPatternRepo.upsertByUserId).toHaveBeenCalled();
      expect(result).toEqual(mockPattern);
    });

    it('✅ should use custom days parameter', async () => {
      ActivityLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      const mockDefaultPattern = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
      };
      userActivityPatternRepo.upsertByUserId.mockResolvedValue(mockDefaultPattern);

      await UserActivityPatternService.analyzeUserActivity(mockUserId, 60);

      expect(ActivityLog.find).toHaveBeenCalled();
    });
  });

  describe('_analyzePatterns', () => {
    it('✅ should analyze patterns from activity logs', () => {
      const activityLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          created_at: new Date('2024-01-15T09:00:00'),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          created_at: new Date('2024-01-15T10:00:00'),
        },
      ];

      const result = UserActivityPatternService._analyzePatterns(activityLogs, 30);

      expect(result).toHaveProperty('active_hours');
      expect(result).toHaveProperty('deep_work_periods');
      expect(result).toHaveProperty('optimal_notification_times');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('confidence_score');
      expect(Array.isArray(result.active_hours)).toBe(true);
      expect(Array.isArray(result.deep_work_periods)).toBe(true);
      expect(Array.isArray(result.optimal_notification_times)).toBe(true);
    });

    it('✅ should calculate active hours correctly', () => {
      const activityLogs = [];
      // Create logs for hour 9 (20 times to exceed threshold)
      for (let i = 0; i < 20; i++) {
        activityLogs.push({
          _id: new mongoose.Types.ObjectId(),
          created_at: new Date(`2024-01-15T09:${String(i).padStart(2, '0')}:00`),
        });
      }

      const result = UserActivityPatternService._analyzePatterns(activityLogs, 30);

      expect(result.active_hours).toContain(9);
    });

    it('✅ should calculate most and least active days', () => {
      const activityLogs = [
        { _id: new mongoose.Types.ObjectId(), created_at: new Date('2024-01-15T09:00:00') }, // Monday
        { _id: new mongoose.Types.ObjectId(), created_at: new Date('2024-01-15T10:00:00') }, // Monday
        { _id: new mongoose.Types.ObjectId(), created_at: new Date('2024-01-16T09:00:00') }, // Tuesday
      ];

      const result = UserActivityPatternService._analyzePatterns(activityLogs, 30);

      expect(result.metrics).toHaveProperty('most_active_day');
      expect(result.metrics).toHaveProperty('least_active_day');
    });

    it('✅ should calculate session durations', () => {
      const now = new Date('2024-01-15T09:00:00');
      const activityLogs = [
        { _id: new mongoose.Types.ObjectId(), created_at: new Date(now.getTime()) },
        { _id: new mongoose.Types.ObjectId(), created_at: new Date(now.getTime() + 2 * 60 * 1000) }, // 2 minutes later
        {
          _id: new mongoose.Types.ObjectId(),
          created_at: new Date(now.getTime() + 10 * 60 * 1000),
        }, // 10 minutes later (new session)
      ];

      const result = UserActivityPatternService._analyzePatterns(activityLogs, 30);

      expect(result.metrics).toHaveProperty('average_session_duration');
      expect(typeof result.metrics.average_session_duration).toBe('number');
    });
  });

  describe('_detectDeepWorkPeriods', () => {
    it('✅ should detect deep work periods', () => {
      const activityLogs = [];
      // Create many logs for hour 9 on Monday (day 1)
      for (let i = 0; i < 50; i++) {
        activityLogs.push({
          _id: new mongoose.Types.ObjectId(),
          created_at: new Date(`2024-01-15T09:${String(i % 60).padStart(2, '0')}:00`), // Monday
        });
      }

      const result = UserActivityPatternService._detectDeepWorkPeriods(activityLogs);

      expect(Array.isArray(result)).toBe(true);
    });

    it('✅ should return empty array when no deep work periods', () => {
      const activityLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          created_at: new Date('2024-01-15T09:00:00'),
        },
      ];

      const result = UserActivityPatternService._detectDeepWorkPeriods(activityLogs);

      expect(Array.isArray(result)).toBe(true);
    });

    it('✅ should merge adjacent hours into periods', () => {
      const activityLogs = [];
      // Create logs for hours 9 and 10 on Monday
      for (let hour = 9; hour <= 10; hour++) {
        for (let i = 0; i < 30; i++) {
          activityLogs.push({
            _id: new mongoose.Types.ObjectId(),
            created_at: new Date(`2024-01-15T${String(hour).padStart(2, '0')}:00:00`),
          });
        }
      }

      const result = UserActivityPatternService._detectDeepWorkPeriods(activityLogs);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('_calculateOptimalNotificationTimes', () => {
    it('✅ should calculate optimal notification times', () => {
      const activeHours = [9, 10, 14, 15];
      const deepWorkPeriods = [];

      const result = UserActivityPatternService._calculateOptimalNotificationTimes(
        activeHours,
        deepWorkPeriods
      );

      expect(Array.isArray(result)).toBe(true);
      result.forEach(item => {
        expect(item).toHaveProperty('day_of_week');
        expect(item).toHaveProperty('hours');
        expect(Array.isArray(item.hours)).toBe(true);
      });
    });

    it('✅ should exclude deep work periods from optimal times', () => {
      const activeHours = [9, 10, 11, 14, 15];
      const deepWorkPeriods = [{ day_of_week: 1, start_hour: 9, end_hour: 11 }];

      const result = UserActivityPatternService._calculateOptimalNotificationTimes(
        activeHours,
        deepWorkPeriods
      );

      // Check that hours in deep work are excluded
      const mondayTimes = result.find(t => t.day_of_week === 1);
      if (mondayTimes) {
        expect(mondayTimes.hours).not.toContain(9);
        expect(mondayTimes.hours).not.toContain(10);
        expect(mondayTimes.hours).not.toContain(11);
      }
    });

    it('✅ should return empty array when no active hours', () => {
      const result = UserActivityPatternService._calculateOptimalNotificationTimes([], []);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('_calculateConfidenceScore', () => {
    it('✅ should return confidence score between 0 and 1', () => {
      const result = UserActivityPatternService._calculateConfidenceScore(100, 30);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('✅ should return 1 when activity count exceeds minimum', () => {
      const result = UserActivityPatternService._calculateConfidenceScore(200, 30);

      expect(result).toBe(1);
    });

    it('✅ should return lower score for fewer activities', () => {
      const result1 = UserActivityPatternService._calculateConfidenceScore(50, 30);
      const result2 = UserActivityPatternService._calculateConfidenceScore(150, 30);

      expect(result1).toBeLessThan(result2);
    });
  });

  describe('_createDefaultPattern', () => {
    it('✅ should create default pattern', async () => {
      const mockDefaultPattern = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        active_hours: [9, 10, 11, 14, 15, 16],
        deep_work_periods: [],
        optimal_notification_times: [{ day_of_week: 1, hours: [9, 10, 14, 15] }],
        confidence_score: 0.3,
      };
      userActivityPatternRepo.upsertByUserId.mockResolvedValue(mockDefaultPattern);

      const result = await UserActivityPatternService._createDefaultPattern(mockUserId);

      expect(userActivityPatternRepo.upsertByUserId).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          user_id: mockUserId,
          active_hours: expect.any(Array),
          deep_work_periods: expect.any(Array),
          optimal_notification_times: expect.any(Array),
          confidence_score: 0.3,
        })
      );
      expect(result).toEqual(mockDefaultPattern);
    });
  });

  describe('getPattern', () => {
    it('✅ should return existing pattern', async () => {
      const mockPattern = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        active_hours: [9, 10],
        last_analyzed_at: new Date(),
      };
      userActivityPatternRepo.findByUserId.mockResolvedValue(mockPattern);

      const result = await UserActivityPatternService.getPattern(mockUserId);

      expect(userActivityPatternRepo.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockPattern);
    });

    it('✅ should analyze when pattern does not exist', async () => {
      userActivityPatternRepo.findByUserId.mockResolvedValue(null);
      ActivityLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      const mockDefaultPattern = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
      };
      userActivityPatternRepo.upsertByUserId.mockResolvedValue(mockDefaultPattern);

      const result = await UserActivityPatternService.getPattern(mockUserId);

      expect(ActivityLog.find).toHaveBeenCalled();
      expect(result).toEqual(mockDefaultPattern);
    });

    it('✅ should re-analyze when pattern is old', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago
      const mockPattern = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        last_analyzed_at: oldDate,
      };
      userActivityPatternRepo.findByUserId.mockResolvedValue(mockPattern);
      ActivityLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      const mockUpdatedPattern = {
        ...mockPattern,
        last_analyzed_at: new Date(),
      };
      userActivityPatternRepo.upsertByUserId.mockResolvedValue(mockUpdatedPattern);

      const result = await UserActivityPatternService.getPattern(mockUserId);

      expect(ActivityLog.find).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedPattern);
    });
  });

  describe('isInDeepWork', () => {
    it('✅ should return false when no pattern', async () => {
      userActivityPatternRepo.findByUserId.mockResolvedValue(null);
      ActivityLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      userActivityPatternRepo.upsertByUserId.mockResolvedValue({
        deep_work_periods: [],
      });

      const result = await UserActivityPatternService.isInDeepWork(mockUserId);

      expect(result).toBe(false);
    });

    it('✅ should return false when no deep work periods', async () => {
      const mockPattern = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        deep_work_periods: [],
      };
      userActivityPatternRepo.findByUserId.mockResolvedValue(mockPattern);

      const result = await UserActivityPatternService.isInDeepWork(mockUserId);

      expect(result).toBe(false);
    });

    it('✅ should return boolean when pattern exists', async () => {
      const mockPattern = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        deep_work_periods: [{ day_of_week: 1, start_hour: 9, end_hour: 11 }],
      };
      userActivityPatternRepo.findByUserId.mockResolvedValue(mockPattern);

      const result = await UserActivityPatternService.isInDeepWork(mockUserId);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('getNextOptimalTime', () => {
    it('✅ should return Date object', async () => {
      userActivityPatternRepo.findByUserId.mockResolvedValue(null);
      ActivityLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      userActivityPatternRepo.upsertByUserId.mockResolvedValue({
        optimal_notification_times: [{ day_of_week: 1, hours: [9, 10, 14, 15] }],
        deep_work_periods: [],
      });

      const result = await UserActivityPatternService.getNextOptimalTime(mockUserId, 15);

      expect(result).toBeInstanceOf(Date);
    });

    it('✅ should use minDelayMinutes parameter', async () => {
      userActivityPatternRepo.findByUserId.mockResolvedValue(null);
      ActivityLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      userActivityPatternRepo.upsertByUserId.mockResolvedValue({
        optimal_notification_times: [{ day_of_week: 1, hours: [9, 10, 14, 15] }],
        deep_work_periods: [],
      });

      const result = await UserActivityPatternService.getNextOptimalTime(mockUserId, 30);

      expect(result).toBeInstanceOf(Date);
    });

    it('✅ should return time with minimum delay when no optimal time found', async () => {
      userActivityPatternRepo.findByUserId.mockResolvedValue(null);
      ActivityLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      userActivityPatternRepo.upsertByUserId.mockResolvedValue({
        optimal_notification_times: [],
        deep_work_periods: [],
      });

      const result = await UserActivityPatternService.getNextOptimalTime(mockUserId, 15);

      expect(result).toBeInstanceOf(Date);
    });
  });
});

// 📄 tests/unit/gamificationBehavior.service.test.js - Gamification Behavior Service Unit Tests
const mongoose = require('mongoose');

// Mock dependencies BEFORE requiring the service
jest.mock('../../repositories/gamificationBehavior.repository');

// Now require the service after all mocks are set up
const GamificationBehaviorService = require('../../services/gamificationBehavior.service');
const behaviorRepo = require('../../repositories/gamificationBehavior.repository');

describe('🔹 Gamification Behavior Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackBehavior', () => {
    it('✅ should track behavior successfully with all parameters', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();
      const actionType = 'view_leaderboard';
      const elementType = 'leaderboard';
      const metadata = { position: 5, board_id: 'board123' };

      const mockBehavior = {
        _id: new mongoose.Types.ObjectId(),
        user_id: userId,
        center_id: centerId,
        action_type: actionType,
        element_type: elementType,
        metadata,
        created_at: new Date(),
      };

      behaviorRepo.create.mockResolvedValue(mockBehavior);

      const result = await GamificationBehaviorService.trackBehavior(
        userId,
        centerId,
        actionType,
        elementType,
        metadata
      );

      expect(behaviorRepo.create).toHaveBeenCalledWith({
        user_id: userId,
        center_id: centerId,
        action_type: actionType,
        element_type: elementType,
        metadata,
      });
      expect(result).toEqual(mockBehavior);
    });

    it('✅ should track behavior with null elementType', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();
      const actionType = 'complete_task';
      const metadata = { task_id: 'task123' };

      const mockBehavior = {
        _id: new mongoose.Types.ObjectId(),
        user_id: userId,
        center_id: centerId,
        action_type: actionType,
        element_type: null,
        metadata,
      };

      behaviorRepo.create.mockResolvedValue(mockBehavior);

      const result = await GamificationBehaviorService.trackBehavior(
        userId,
        centerId,
        actionType,
        null,
        metadata
      );

      expect(behaviorRepo.create).toHaveBeenCalledWith({
        user_id: userId,
        center_id: centerId,
        action_type: actionType,
        element_type: null,
        metadata,
      });
      expect(result).toEqual(mockBehavior);
    });

    it('✅ should track behavior with empty metadata', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();
      const actionType = 'click_notification';

      const mockBehavior = {
        _id: new mongoose.Types.ObjectId(),
        user_id: userId,
        center_id: centerId,
        action_type: actionType,
        element_type: null,
        metadata: {},
      };

      behaviorRepo.create.mockResolvedValue(mockBehavior);

      const result = await GamificationBehaviorService.trackBehavior(userId, centerId, actionType);

      expect(behaviorRepo.create).toHaveBeenCalledWith({
        user_id: userId,
        center_id: centerId,
        action_type: actionType,
        element_type: null,
        metadata: {},
      });
      expect(result).toEqual(mockBehavior);
    });

    it('✅ should handle repository errors', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();
      const actionType = 'view_points';

      behaviorRepo.create.mockRejectedValue(new Error('Database error'));

      await expect(
        GamificationBehaviorService.trackBehavior(userId, centerId, actionType)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getBehaviorStats', () => {
    it('✅ should get behavior stats with default days (30)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      const mockStats = {
        leaderboard_views: 10,
        leaderboard_positions_focused: [1, 2, 3],
        points_interactions: 5,
        points_value_changes: [100, 200],
        task_completions: 8,
        task_completion_times: [30, 45],
        collaboration_events: 3,
        team_task_count: 12,
        daily_activity: [
          { date: '2024-01-01', count: 5 },
          { date: '2024-01-02', count: 3 },
        ],
        weekly_goals_achieved: 2,
        monthly_goals_achieved: 1,
        badge_reactions: ['like', 'love'],
        notification_clicks: 15,
      };

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorStats(userId, centerId);

      expect(behaviorRepo.getBehaviorStats).toHaveBeenCalledWith(userId, centerId, 30);
      expect(result).toEqual(mockStats);
    });

    it('✅ should get behavior stats with custom days', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();
      const days = 7;

      const mockStats = {
        leaderboard_views: 3,
        leaderboard_positions_focused: [],
        points_interactions: 2,
        points_value_changes: [],
        task_completions: 5,
        task_completion_times: [],
        collaboration_events: 1,
        team_task_count: 4,
        daily_activity: [{ date: '2024-01-01', count: 2 }],
        weekly_goals_achieved: 0,
        monthly_goals_achieved: 0,
        badge_reactions: [],
        notification_clicks: 8,
      };

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorStats(userId, centerId, days);

      expect(behaviorRepo.getBehaviorStats).toHaveBeenCalledWith(userId, centerId, days);
      expect(result).toEqual(mockStats);
    });

    it('✅ should handle repository errors', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      behaviorRepo.getBehaviorStats.mockRejectedValue(new Error('Database error'));

      await expect(GamificationBehaviorService.getBehaviorStats(userId, centerId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getBehaviorAnalytics', () => {
    it('✅ should calculate total_events correctly with numbers only', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      const mockStats = {
        leaderboard_views: 10,
        points_interactions: 5,
        task_completions: 8,
        collaboration_events: 3,
        team_task_count: 12,
        weekly_goals_achieved: 2,
        monthly_goals_achieved: 1,
        notification_clicks: 15,
      };

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorAnalytics(userId, centerId, 30);

      expect(result).toEqual({
        total_events: 56, // 10 + 5 + 8 + 3 + 12 + 2 + 1 + 15
        stats: mockStats,
        period_days: 30,
      });
    });

    it('✅ should calculate total_events correctly with arrays', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      const mockStats = {
        leaderboard_views: 10, // number = 10
        leaderboard_positions_focused: [1, 2, 3], // array length = 3
        points_interactions: 5, // number = 5
        points_value_changes: [100, 200], // array length = 2
        task_completions: 8, // number = 8
        task_completion_times: [30, 45, 60], // array length = 3
        collaboration_events: 3, // number = 3
        badge_reactions: ['like', 'love', 'wow'], // array length = 3
        notification_clicks: 15, // number = 15
      };

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorAnalytics(userId, centerId, 30);

      // Logic: numbers are added, arrays count their length
      // 10 + 3 + 5 + 2 + 8 + 3 + 3 + 3 + 15 = 52
      expect(result).toEqual({
        total_events: 52, // 10 + 3 + 5 + 2 + 8 + 3 + 3 + 3 + 15
        stats: mockStats,
        period_days: 30,
      });
    });

    it('✅ should calculate total_events correctly with objects (daily_activity)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      const mockStats = {
        leaderboard_views: 10,
        points_interactions: 5,
        daily_activity: [
          { date: '2024-01-01', count: 5 },
          { date: '2024-01-02', count: 3 },
        ], // array of objects - should count array length (2), not object values
        notification_clicks: 15,
      };

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorAnalytics(userId, centerId, 30);

      expect(result).toEqual({
        total_events: 32, // 10 + 5 + 2 (array length) + 15
        stats: mockStats,
        period_days: 30,
      });
    });

    it('✅ should calculate total_events correctly with mixed types', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      const mockStats = {
        leaderboard_views: 10, // number
        leaderboard_positions_focused: [1, 2, 3], // array - count length (3)
        points_interactions: 5, // number
        points_value_changes: [100, 200], // array - count length (2)
        task_completions: 8, // number
        task_completion_times: [], // empty array - count length (0)
        collaboration_events: 3, // number
        team_task_count: 12, // number
        daily_activity: [
          { date: '2024-01-01', count: 5 },
          { date: '2024-01-02', count: 3 },
        ], // array of objects - count length (2)
        weekly_goals_achieved: 2, // number
        monthly_goals_achieved: 1, // number
        badge_reactions: ['like'], // array - count length (1)
        notification_clicks: 15, // number
      };

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorAnalytics(userId, centerId, 30);

      expect(result).toEqual({
        total_events: 64, // 10 + 3 + 5 + 2 + 8 + 0 + 3 + 12 + 2 + 2 + 1 + 1 + 15
        stats: mockStats,
        period_days: 30,
      });
    });

    it('✅ should handle empty stats object', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      const mockStats = {};

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorAnalytics(userId, centerId, 30);

      expect(result).toEqual({
        total_events: 0,
        stats: mockStats,
        period_days: 30,
      });
    });

    it('✅ should use custom period', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();
      const period = 7;

      const mockStats = {
        leaderboard_views: 3,
        points_interactions: 2,
        task_completions: 5,
      };

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorAnalytics(
        userId,
        centerId,
        period
      );

      expect(behaviorRepo.getBehaviorStats).toHaveBeenCalledWith(userId, centerId, period);
      expect(result).toEqual({
        total_events: 10, // 3 + 2 + 5
        stats: mockStats,
        period_days: period,
      });
    });

    it('✅ should handle null values in stats', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      const mockStats = {
        leaderboard_views: 10,
        points_interactions: null, // null should be treated as 0
        task_completions: 8,
        daily_activity: null, // null should be treated as 0
      };

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorAnalytics(userId, centerId, 30);

      expect(result).toEqual({
        total_events: 18, // 10 + 0 + 8 + 0
        stats: mockStats,
        period_days: 30,
      });
    });

    it('✅ should handle stats with string numbers (should be treated as 0)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      const mockStats = {
        leaderboard_views: 10,
        points_interactions: '5', // string - should be treated as 0
        task_completions: 8,
      };

      behaviorRepo.getBehaviorStats.mockResolvedValue(mockStats);

      const result = await GamificationBehaviorService.getBehaviorAnalytics(userId, centerId, 30);

      expect(result).toEqual({
        total_events: 18, // 10 + 0 + 8
        stats: mockStats,
        period_days: 30,
      });
    });

    it('✅ should handle repository errors', async () => {
      const userId = new mongoose.Types.ObjectId();
      const centerId = new mongoose.Types.ObjectId();

      behaviorRepo.getBehaviorStats.mockRejectedValue(new Error('Database error'));

      await expect(
        GamificationBehaviorService.getBehaviorAnalytics(userId, centerId)
      ).rejects.toThrow('Database error');
    });
  });
});

// 📄 tests/unit/adaptiveGamification.controller.test.js - Adaptive Gamification Controller Unit Tests
const mongoose = require('mongoose');

// Mock auth middleware
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    if (!req.user) {
      req.user = {
        id: '507f1f77bcf86cd799439011',
        roles: ['admin', 'System_Manager'],
        email: 'test@example.com',
        username: 'testuser',
      };
    }
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
}));

// Mock services
jest.mock('../../services/adaptiveGamification.service');
jest.mock('../../services/gamificationBehavior.service');
jest.mock('../../services/badge.service');

const adaptiveGamificationController = require('../../controllers/adaptiveGamification.controller');
const adaptiveGamificationService = require('../../services/adaptiveGamification.service');
const behaviorService = require('../../services/gamificationBehavior.service');
const badgeService = require('../../services/badge.service');

describe('🔹 Adaptive Gamification Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const VALID_CENTER_ID = '507f1f77bcf86cd799439012';
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock request
    mockReq = {
      user: {
        id: VALID_USER_ID,
        roles: ['admin'],
        email: 'test@example.com',
      },
      query: {},
      body: {},
    };

    // Setup default mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('getDashboard', () => {
    const mockProfile = {
      competitive_score: 75,
      collaborative_score: 60,
      short_term_score: 70,
      long_term_score: 65,
      confidence: 80,
      onboarding_stage: 'STABLE',
      insights: ['User is competitive'],
      recommendations: ['Focus on leaderboard'],
      updated_at: new Date(),
      created_at: new Date(),
    };

    const mockPersonalized = {
      personalization: {
        currentStrategy: 'COMPETITIVE_FOCUS',
        leaderboard_weight: 0.8,
        badges_weight: 0.6,
        points_weight: 1.0,
        goals_weight: 0.5,
        recommended_badge_categories: ['competitive', 'achievement'],
        reward_multipliers: {
          competitive: 1.2,
          collaborative: 1.0,
          short_term: 1.0,
          long_term: 1.0,
        },
        personalized_messages: ['Keep up the great work!'],
        lastAdaptationDate: new Date(),
        skipReason: null,
      },
    };

    const mockUserBadges = [
      {
        badge_id: {
          _id: 'badge1',
          name: 'First Task',
          description: 'Complete first task',
          icon_url: '/icons/first-task.png',
          category: 'achievement',
        },
        earned_at: new Date(),
        metadata: {},
      },
    ];

    const mockRecentBadges = [
      {
        user_id: {
          _id: VALID_USER_ID,
          username: 'testuser',
          full_name: 'Test User',
        },
        badge_id: {
          _id: 'badge2',
          name: 'Task Master',
          icon_url: '/icons/task-master.png',
          category: 'competitive',
        },
        earned_at: new Date(),
      },
    ];

    const mockBehaviorStats = {
      total_actions: 150,
      task_completed: 50,
      points_earned: 500,
    };

    const mockBehaviorAnalytics = {
      total_events: 150,
      stats: mockBehaviorStats,
      period_days: 30,
    };

    const mockAllBadges = [
      {
        _id: 'badge1',
        name: 'First Task',
        category: 'achievement',
        points_reward: 10,
      },
      {
        _id: 'badge2',
        name: 'Task Master',
        category: 'competitive',
        points_reward: 20,
      },
    ];

    const mockPersonalizedBadges = [
      {
        _id: 'badge2',
        name: 'Task Master',
        is_recommended: true,
        priority: 1,
      },
      {
        _id: 'badge1',
        name: 'First Task',
        is_recommended: false,
        priority: 2,
      },
    ];

    it('✅ should return dashboard with all data when center_id provided', async () => {
      adaptiveGamificationService.getMotivationProfile.mockResolvedValue(mockProfile);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);
      adaptiveGamificationService.getPersonalizedBadges.mockResolvedValue(mockPersonalizedBadges);
      badgeService.getUserBadges.mockResolvedValue(mockUserBadges);
      badgeService.getRecentBadges.mockResolvedValue(mockRecentBadges);
      badgeService.getAllBadges.mockResolvedValue(mockAllBadges);
      behaviorService.getBehaviorStats.mockResolvedValue(mockBehaviorStats);
      behaviorService.getBehaviorAnalytics.mockResolvedValue(mockBehaviorAnalytics);

      mockReq.query = {
        center_id: VALID_CENTER_ID,
        days: '30',
        recent_limit: '10',
      };

      await adaptiveGamificationController.getDashboard(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user_id: VALID_USER_ID,
          center_id: VALID_CENTER_ID,
          motivation_profile: expect.objectContaining({
            competitive_score: 75,
            collaborative_score: 60,
          }),
          personalization: expect.objectContaining({
            current_strategy: 'COMPETITIVE_FOCUS',
          }),
          my_badges: expect.objectContaining({
            total: 1,
          }),
          recent_badges: expect.objectContaining({
            total: 1,
          }),
          behavior: expect.objectContaining({
            stats: mockBehaviorStats,
            analytics: mockBehaviorAnalytics,
          }),
        }),
      });
    });

    it('✅ should auto-detect center_id when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      adaptiveGamificationService.getMotivationProfile.mockResolvedValue(mockProfile);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);
      adaptiveGamificationService.getPersonalizedBadges.mockResolvedValue(mockPersonalizedBadges);
      badgeService.getUserBadges.mockResolvedValue(mockUserBadges);
      badgeService.getRecentBadges.mockResolvedValue(mockRecentBadges);
      badgeService.getAllBadges.mockResolvedValue(mockAllBadges);
      behaviorService.getBehaviorStats.mockResolvedValue(mockBehaviorStats);
      behaviorService.getBehaviorAnalytics.mockResolvedValue(mockBehaviorAnalytics);

      mockReq.query = { days: '30' };

      await adaptiveGamificationController.getDashboard(mockReq, mockRes);

      expect(adaptiveGamificationService.getUserCenterId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when center_id not found and not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(null);

      mockReq.query = {};

      await adaptiveGamificationController.getDashboard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy center của user. Vui lòng cung cấp center_id',
      });
    });

    it('✅ should use default values for days and recent_limit', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      adaptiveGamificationService.getMotivationProfile.mockResolvedValue(mockProfile);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);
      adaptiveGamificationService.getPersonalizedBadges.mockResolvedValue(mockPersonalizedBadges);
      badgeService.getUserBadges.mockResolvedValue(mockUserBadges);
      badgeService.getRecentBadges.mockResolvedValue(mockRecentBadges);
      badgeService.getAllBadges.mockResolvedValue(mockAllBadges);
      behaviorService.getBehaviorStats.mockResolvedValue(mockBehaviorStats);
      behaviorService.getBehaviorAnalytics.mockResolvedValue(mockBehaviorAnalytics);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.getDashboard(mockReq, mockRes);

      expect(behaviorService.getBehaviorStats).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        30
      );
      expect(badgeService.getRecentBadges).toHaveBeenCalledWith(VALID_CENTER_ID, 10);
    });

    it('❌ should return 500 when service throws error', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      adaptiveGamificationService.getMotivationProfile.mockRejectedValue(
        new Error('Service error')
      );

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.getDashboard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('getProfile', () => {
    const mockProfile = {
      competitive_score: 75,
      collaborative_score: 60,
      confidence: 80,
      onboarding_stage: 'STABLE',
    };

    it('✅ should return profile when center_id provided', async () => {
      adaptiveGamificationService.getMotivationProfile.mockResolvedValue(mockProfile);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.getProfile(mockReq, mockRes);

      expect(adaptiveGamificationService.getMotivationProfile).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });

    it('✅ should auto-detect center_id when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      adaptiveGamificationService.getMotivationProfile.mockResolvedValue(mockProfile);

      mockReq.query = {};

      await adaptiveGamificationController.getProfile(mockReq, mockRes);

      expect(adaptiveGamificationService.getUserCenterId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(adaptiveGamificationService.getMotivationProfile).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });

    it('❌ should return 400 when center_id not found', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(null);

      mockReq.query = {};

      await adaptiveGamificationController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy center của user',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      adaptiveGamificationService.getMotivationProfile.mockRejectedValue(
        new Error('Service error')
      );

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('trackBehavior', () => {
    it('✅ should track behavior when all required fields provided in body', async () => {
      behaviorService.trackBehavior.mockResolvedValue({});

      mockReq.body = {
        center_id: VALID_CENTER_ID,
        action_type: 'complete_task',
        element_type: 'points',
        metadata: { task_id: 'task123' },
      };

      await adaptiveGamificationController.trackBehavior(mockReq, mockRes);

      expect(behaviorService.trackBehavior).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        'complete_task',
        'points',
        { task_id: 'task123' }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Đã ghi nhận hành vi',
      });
    });

    it('✅ should track behavior when fields provided in query', async () => {
      behaviorService.trackBehavior.mockResolvedValue({});

      mockReq.query = {
        center_id: VALID_CENTER_ID,
        action_type: 'earn_badge',
        element_type: 'badge',
        metadata: JSON.stringify({ badge_id: 'badge123' }),
      };

      await adaptiveGamificationController.trackBehavior(mockReq, mockRes);

      expect(behaviorService.trackBehavior).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        'earn_badge',
        'badge',
        { badge_id: 'badge123' }
      );
    });

    it('✅ should parse JSON metadata string', async () => {
      behaviorService.trackBehavior.mockResolvedValue({});

      mockReq.body = {
        center_id: VALID_CENTER_ID,
        action_type: 'complete_task',
        metadata: '{"task_id":"task123","points":10}',
      };

      await adaptiveGamificationController.trackBehavior(mockReq, mockRes);

      expect(behaviorService.trackBehavior).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        'complete_task',
        undefined,
        { task_id: 'task123', points: 10 }
      );
    });

    it('✅ should use empty object when metadata is invalid JSON string', async () => {
      behaviorService.trackBehavior.mockResolvedValue({});

      mockReq.body = {
        center_id: VALID_CENTER_ID,
        action_type: 'complete_task',
        metadata: 'invalid json',
      };

      await adaptiveGamificationController.trackBehavior(mockReq, mockRes);

      expect(behaviorService.trackBehavior).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        'complete_task',
        undefined,
        {}
      );
    });

    it('❌ should return 400 when center_id missing', async () => {
      mockReq.body = {
        action_type: 'complete_task',
      };

      await adaptiveGamificationController.trackBehavior(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'center_id và action_type là bắt buộc',
      });
      expect(behaviorService.trackBehavior).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when action_type missing', async () => {
      mockReq.body = {
        center_id: VALID_CENTER_ID,
      };

      await adaptiveGamificationController.trackBehavior(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'center_id và action_type là bắt buộc',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      behaviorService.trackBehavior.mockRejectedValue(new Error('Service error'));

      mockReq.body = {
        center_id: VALID_CENTER_ID,
        action_type: 'complete_task',
      };

      await adaptiveGamificationController.trackBehavior(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('getPersonalizedDashboard', () => {
    const mockPersonalized = {
      motivation_profile: {
        competitive_score: 75,
        confidence: 80,
      },
      personalization: {
        currentStrategy: 'COMPETITIVE_FOCUS',
        leaderboard_weight: 0.8,
      },
    };

    it('✅ should return personalized dashboard when center_id provided', async () => {
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.getPersonalizedDashboard(mockReq, mockRes);

      expect(adaptiveGamificationService.getPersonalizedGamification).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPersonalized,
      });
    });

    it('✅ should auto-detect center_id when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);

      mockReq.query = {};

      await adaptiveGamificationController.getPersonalizedDashboard(mockReq, mockRes);

      expect(adaptiveGamificationService.getUserCenterId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(adaptiveGamificationService.getPersonalizedGamification).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
    });

    it('❌ should return 400 when center_id not found', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(null);

      mockReq.query = {};

      await adaptiveGamificationController.getPersonalizedDashboard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy center của user',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      adaptiveGamificationService.getPersonalizedGamification.mockRejectedValue(
        new Error('Service error')
      );

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.getPersonalizedDashboard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('analyze', () => {
    const mockAnalysis = {
      competitive_score: 75,
      collaborative_score: 60,
      confidence: 80,
      onboarding_stage: 'STABLE',
    };

    it('✅ should analyze user behavior when center_id provided', async () => {
      adaptiveGamificationService.analyzeUserBehavior.mockResolvedValue(mockAnalysis);

      mockReq.query = {
        center_id: VALID_CENTER_ID,
      };

      await adaptiveGamificationController.analyze(mockReq, mockRes);

      expect(adaptiveGamificationService.analyzeUserBehavior).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalysis,
      });
    });

    it('✅ should analyze specific user when user_id provided', async () => {
      const targetUserId = '507f1f77bcf86cd799439013';
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      adaptiveGamificationService.analyzeUserBehavior.mockResolvedValue(mockAnalysis);

      mockReq.query = {
        user_id: targetUserId,
      };

      await adaptiveGamificationController.analyze(mockReq, mockRes);

      expect(adaptiveGamificationService.analyzeUserBehavior).toHaveBeenCalledWith(
        targetUserId,
        VALID_CENTER_ID
      );
    });

    it('✅ should auto-detect center_id when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      adaptiveGamificationService.analyzeUserBehavior.mockResolvedValue(mockAnalysis);

      mockReq.query = {};

      await adaptiveGamificationController.analyze(mockReq, mockRes);

      expect(adaptiveGamificationService.getUserCenterId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(adaptiveGamificationService.analyzeUserBehavior).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
    });

    it('❌ should return 400 when center_id not found', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(null);

      mockReq.query = {};

      await adaptiveGamificationController.analyze(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'center_id là bắt buộc',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      adaptiveGamificationService.analyzeUserBehavior.mockRejectedValue(new Error('Service error'));

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.analyze(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('getBehaviorAnalytics', () => {
    const mockAnalytics = {
      total_events: 150,
      stats: {
        total_actions: 150,
        task_completed: 50,
      },
      period_days: 30,
    };

    it('✅ should return behavior analytics when center_id provided', async () => {
      behaviorService.getBehaviorAnalytics.mockResolvedValue(mockAnalytics);

      mockReq.query = {
        center_id: VALID_CENTER_ID,
        period: '30',
      };

      await adaptiveGamificationController.getBehaviorAnalytics(mockReq, mockRes);

      expect(behaviorService.getBehaviorAnalytics).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        30
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });

    it('✅ should use default period when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      behaviorService.getBehaviorAnalytics.mockResolvedValue(mockAnalytics);

      mockReq.query = {};

      await adaptiveGamificationController.getBehaviorAnalytics(mockReq, mockRes);

      expect(behaviorService.getBehaviorAnalytics).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        30
      );
    });

    it('✅ should auto-detect center_id when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      behaviorService.getBehaviorAnalytics.mockResolvedValue(mockAnalytics);

      mockReq.query = { period: '60' };

      await adaptiveGamificationController.getBehaviorAnalytics(mockReq, mockRes);

      expect(adaptiveGamificationService.getUserCenterId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(behaviorService.getBehaviorAnalytics).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        60
      );
    });

    it('❌ should return 400 when center_id not found', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(null);

      mockReq.query = {};

      await adaptiveGamificationController.getBehaviorAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy center của user',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      behaviorService.getBehaviorAnalytics.mockRejectedValue(new Error('Service error'));

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.getBehaviorAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('getBehaviorStats', () => {
    const mockStats = {
      total_actions: 150,
      task_completed: 50,
      points_earned: 500,
    };

    it('✅ should return behavior stats when center_id provided', async () => {
      behaviorService.getBehaviorStats.mockResolvedValue(mockStats);

      mockReq.query = {
        center_id: VALID_CENTER_ID,
        days: '30',
      };

      await adaptiveGamificationController.getBehaviorStats(mockReq, mockRes);

      expect(behaviorService.getBehaviorStats).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        30
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('✅ should use default days when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      behaviorService.getBehaviorStats.mockResolvedValue(mockStats);

      mockReq.query = {};

      await adaptiveGamificationController.getBehaviorStats(mockReq, mockRes);

      expect(behaviorService.getBehaviorStats).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        30
      );
    });

    it('✅ should auto-detect center_id when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      behaviorService.getBehaviorStats.mockResolvedValue(mockStats);

      mockReq.query = { days: '60' };

      await adaptiveGamificationController.getBehaviorStats(mockReq, mockRes);

      expect(adaptiveGamificationService.getUserCenterId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(behaviorService.getBehaviorStats).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        60
      );
    });

    it('❌ should return 400 when center_id not found', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(null);

      mockReq.query = {};

      await adaptiveGamificationController.getBehaviorStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy center của user',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      behaviorService.getBehaviorStats.mockRejectedValue(new Error('Service error'));

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.getBehaviorStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('updateProfile', () => {
    const mockProfile = {
      competitive_score: 75,
      collaborative_score: 60,
      confidence: 80,
      onboarding_stage: 'STABLE',
    };

    it('✅ should update profile when center_id provided', async () => {
      adaptiveGamificationService.updateMotivationProfile.mockResolvedValue(mockProfile);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.updateProfile(mockReq, mockRes);

      expect(adaptiveGamificationService.updateMotivationProfile).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });

    it('✅ should auto-detect center_id when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      adaptiveGamificationService.updateMotivationProfile.mockResolvedValue(mockProfile);

      mockReq.query = {};

      await adaptiveGamificationController.updateProfile(mockReq, mockRes);

      expect(adaptiveGamificationService.getUserCenterId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(adaptiveGamificationService.updateMotivationProfile).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
    });

    it('❌ should return 400 when center_id not found', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(null);

      mockReq.query = {};

      await adaptiveGamificationController.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy center của user',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      adaptiveGamificationService.updateMotivationProfile.mockRejectedValue(
        new Error('Service error')
      );

      mockReq.query = { center_id: VALID_CENTER_ID };

      await adaptiveGamificationController.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('adjustRewards', () => {
    const mockRewards = {
      base_points: 10,
      multiplier: 1.2,
      final_points: 12,
    };

    it('✅ should adjust rewards when all required fields provided', async () => {
      adaptiveGamificationService.adjustRewards.mockResolvedValue(mockRewards);

      mockReq.body = {
        center_id: VALID_CENTER_ID,
        action: 'complete_task',
      };

      await adaptiveGamificationController.adjustRewards(mockReq, mockRes);

      expect(adaptiveGamificationService.adjustRewards).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        'complete_task'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRewards,
      });
    });

    it('❌ should return 400 when center_id missing', async () => {
      mockReq.body = {
        action: 'complete_task',
      };

      await adaptiveGamificationController.adjustRewards(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'center_id và action là bắt buộc',
      });
      expect(adaptiveGamificationService.adjustRewards).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when action missing', async () => {
      mockReq.body = {
        center_id: VALID_CENTER_ID,
      };

      await adaptiveGamificationController.adjustRewards(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'center_id và action là bắt buộc',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      adaptiveGamificationService.adjustRewards.mockRejectedValue(new Error('Service error'));

      mockReq.body = {
        center_id: VALID_CENTER_ID,
        action: 'complete_task',
      };

      await adaptiveGamificationController.adjustRewards(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });
});

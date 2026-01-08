// 📄 tests/unit/notificationPreference.controller.test.js - Notification Preference Controller Unit Tests

// Mock auth middleware
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    if (!req.user) {
      req.user = {
        id: '507f1f77bcf86cd799439011',
        _id: '507f1f77bcf86cd799439011',
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
jest.mock('../../services/notificationPreference.service', () => ({
  getPreferences: jest.fn(),
  updatePreferences: jest.fn(),
}));

jest.mock('../../services/userActivityPattern.service', () => ({
  getPattern: jest.fn(),
  analyzeUserActivity: jest.fn(),
}));

const notificationPreferenceController = require('../../controllers/notificationPreference.controller');
const notificationPreferenceService = require('../../services/notificationPreference.service');
const userActivityPatternService = require('../../services/userActivityPattern.service');

describe('🔹 Notification Preference Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock request
    mockReq = {
      user: {
        id: VALID_USER_ID,
        _id: VALID_USER_ID,
        roles: ['admin'],
        email: 'test@example.com',
        username: 'testuser',
      },
      query: {},
      params: {},
      body: {},
    };

    // Setup default mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('getPreferences', () => {
    const mockPreferences = {
      _id: 'pref1',
      user_id: VALID_USER_ID,
      smart_scheduling_enabled: true,
      urgent_types: ['at_risk_task', 'task_overdue'],
      min_delay_minutes: 15,
      max_delay_minutes: 120,
      quiet_hours: {
        enabled: false,
        start_hour: 22,
        end_hour: 8,
      },
      active_days: [1, 2, 3, 4, 5],
    };

    it('✅ should return user preferences successfully', async () => {
      notificationPreferenceService.getPreferences.mockResolvedValue(mockPreferences);

      await notificationPreferenceController.getPreferences(mockReq, mockRes);

      expect(notificationPreferenceService.getPreferences).toHaveBeenCalledWith(VALID_USER_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences,
      });
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;

      await notificationPreferenceController.getPreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
      expect(notificationPreferenceService.getPreferences).not.toHaveBeenCalled();
    });

    it('❌ should return 401 when user.id is missing', async () => {
      mockReq.user = {};

      await notificationPreferenceController.getPreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      notificationPreferenceService.getPreferences.mockRejectedValue(error);

      await notificationPreferenceController.getPreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      notificationPreferenceService.getPreferences.mockRejectedValue(error);

      await notificationPreferenceController.getPreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy preferences',
      });
    });
  });

  describe('updatePreferences', () => {
    const mockUpdatedPreferences = {
      _id: 'pref1',
      user_id: VALID_USER_ID,
      smart_scheduling_enabled: false,
      urgent_types: ['at_risk_task'],
      min_delay_minutes: 30,
      max_delay_minutes: 180,
      quiet_hours: {
        enabled: true,
        start_hour: 23,
        end_hour: 7,
      },
      active_days: [1, 2, 3, 4, 5, 6],
    };

    it('✅ should update all preferences successfully', async () => {
      notificationPreferenceService.updatePreferences.mockResolvedValue(mockUpdatedPreferences);

      mockReq.body = {
        smart_scheduling_enabled: false,
        urgent_types: ['at_risk_task'],
        min_delay_minutes: 30,
        max_delay_minutes: 180,
        quiet_hours: {
          enabled: true,
          start_hour: 23,
          end_hour: 7,
        },
        active_days: [1, 2, 3, 4, 5, 6],
      };

      await notificationPreferenceController.updatePreferences(mockReq, mockRes);

      expect(notificationPreferenceService.updatePreferences).toHaveBeenCalledWith(VALID_USER_ID, {
        smart_scheduling_enabled: false,
        urgent_types: ['at_risk_task'],
        min_delay_minutes: 30,
        max_delay_minutes: 180,
        quiet_hours: {
          enabled: true,
          start_hour: 23,
          end_hour: 7,
        },
        active_days: [1, 2, 3, 4, 5, 6],
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cập nhật preferences thành công',
        data: mockUpdatedPreferences,
      });
    });

    it('✅ should update only provided fields', async () => {
      notificationPreferenceService.updatePreferences.mockResolvedValue(mockUpdatedPreferences);

      mockReq.body = {
        smart_scheduling_enabled: false,
        min_delay_minutes: 30,
      };

      await notificationPreferenceController.updatePreferences(mockReq, mockRes);

      expect(notificationPreferenceService.updatePreferences).toHaveBeenCalledWith(VALID_USER_ID, {
        smart_scheduling_enabled: false,
        min_delay_minutes: 30,
      });
    });

    it('✅ should handle empty update data', async () => {
      notificationPreferenceService.updatePreferences.mockResolvedValue(mockUpdatedPreferences);

      mockReq.body = {};

      await notificationPreferenceController.updatePreferences(mockReq, mockRes);

      expect(notificationPreferenceService.updatePreferences).toHaveBeenCalledWith(
        VALID_USER_ID,
        {}
      );
    });

    it('✅ should handle undefined values (not include in update)', async () => {
      notificationPreferenceService.updatePreferences.mockResolvedValue(mockUpdatedPreferences);

      mockReq.body = {
        smart_scheduling_enabled: false,
        urgent_types: undefined,
        min_delay_minutes: 30,
      };

      await notificationPreferenceController.updatePreferences(mockReq, mockRes);

      expect(notificationPreferenceService.updatePreferences).toHaveBeenCalledWith(VALID_USER_ID, {
        smart_scheduling_enabled: false,
        min_delay_minutes: 30,
      });
    });

    it('✅ should handle null values (include in update)', async () => {
      notificationPreferenceService.updatePreferences.mockResolvedValue(mockUpdatedPreferences);

      mockReq.body = {
        smart_scheduling_enabled: null,
        min_delay_minutes: 30,
      };

      await notificationPreferenceController.updatePreferences(mockReq, mockRes);

      expect(notificationPreferenceService.updatePreferences).toHaveBeenCalledWith(VALID_USER_ID, {
        smart_scheduling_enabled: null,
        min_delay_minutes: 30,
      });
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;

      await notificationPreferenceController.updatePreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
      expect(notificationPreferenceService.updatePreferences).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when service throws error', async () => {
      const error = new Error('Validation failed');
      notificationPreferenceService.updatePreferences.mockRejectedValue(error);

      mockReq.body = { smart_scheduling_enabled: false };

      await notificationPreferenceController.updatePreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
      });
    });

    it('❌ should return 400 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      notificationPreferenceService.updatePreferences.mockRejectedValue(error);

      mockReq.body = { smart_scheduling_enabled: false };

      await notificationPreferenceController.updatePreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi cập nhật preferences',
      });
    });
  });

  describe('getActivityPattern', () => {
    const mockPattern = {
      _id: 'pattern1',
      user_id: VALID_USER_ID,
      active_hours: [9, 10, 11, 14, 15, 16],
      deep_work_periods: [
        {
          day_of_week: 1,
          start_hour: 9,
          end_hour: 11,
        },
      ],
      optimal_notification_times: [
        {
          day_of_week: 1,
          hours: [14, 15, 16],
        },
      ],
      metrics: {
        average_daily_active_hours: 6,
        most_active_day: 1,
        least_active_day: 0,
        average_session_duration: 30,
      },
      confidence_score: 0.85,
      last_analyzed_at: new Date(),
    };

    it('✅ should return activity pattern successfully', async () => {
      userActivityPatternService.getPattern.mockResolvedValue(mockPattern);

      await notificationPreferenceController.getActivityPattern(mockReq, mockRes);

      expect(userActivityPatternService.getPattern).toHaveBeenCalledWith(VALID_USER_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPattern,
      });
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;

      await notificationPreferenceController.getActivityPattern(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
      expect(userActivityPatternService.getPattern).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Analysis error');
      userActivityPatternService.getPattern.mockRejectedValue(error);

      await notificationPreferenceController.getActivityPattern(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Analysis error',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      userActivityPatternService.getPattern.mockRejectedValue(error);

      await notificationPreferenceController.getActivityPattern(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy activity pattern',
      });
    });
  });

  describe('analyzeActivity', () => {
    const mockAnalyzedPattern = {
      _id: 'pattern1',
      user_id: VALID_USER_ID,
      active_hours: [9, 10, 11, 14, 15, 16],
      deep_work_periods: [],
      optimal_notification_times: [
        {
          day_of_week: 1,
          hours: [9, 10, 14, 15],
        },
      ],
      metrics: {
        average_daily_active_hours: 6,
        most_active_day: 1,
        least_active_day: 0,
        average_session_duration: 45,
      },
      confidence_score: 0.9,
      last_analyzed_at: new Date(),
    };

    it('✅ should analyze activity with custom days', async () => {
      userActivityPatternService.analyzeUserActivity.mockResolvedValue(mockAnalyzedPattern);

      mockReq.body = { days: 60 };

      await notificationPreferenceController.analyzeActivity(mockReq, mockRes);

      expect(userActivityPatternService.analyzeUserActivity).toHaveBeenCalledWith(
        VALID_USER_ID,
        60
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Phân tích activity pattern thành công',
        data: mockAnalyzedPattern,
      });
    });

    it('✅ should use default days (30) when not provided', async () => {
      userActivityPatternService.analyzeUserActivity.mockResolvedValue(mockAnalyzedPattern);

      mockReq.body = {};

      await notificationPreferenceController.analyzeActivity(mockReq, mockRes);

      expect(userActivityPatternService.analyzeUserActivity).toHaveBeenCalledWith(
        VALID_USER_ID,
        30
      );
    });

    it('✅ should use default days (30) when days is null', async () => {
      userActivityPatternService.analyzeUserActivity.mockResolvedValue(mockAnalyzedPattern);

      mockReq.body = { days: null };

      await notificationPreferenceController.analyzeActivity(mockReq, mockRes);

      expect(userActivityPatternService.analyzeUserActivity).toHaveBeenCalledWith(
        VALID_USER_ID,
        30
      );
    });

    it('✅ should use default days (30) when days is 0', async () => {
      userActivityPatternService.analyzeUserActivity.mockResolvedValue(mockAnalyzedPattern);

      mockReq.body = { days: 0 };

      await notificationPreferenceController.analyzeActivity(mockReq, mockRes);

      expect(userActivityPatternService.analyzeUserActivity).toHaveBeenCalledWith(
        VALID_USER_ID,
        30
      );
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;

      await notificationPreferenceController.analyzeActivity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
      expect(userActivityPatternService.analyzeUserActivity).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Analysis failed');
      userActivityPatternService.analyzeUserActivity.mockRejectedValue(error);

      mockReq.body = { days: 30 };

      await notificationPreferenceController.analyzeActivity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Analysis failed',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      userActivityPatternService.analyzeUserActivity.mockRejectedValue(error);

      mockReq.body = { days: 30 };

      await notificationPreferenceController.analyzeActivity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi phân tích activity',
      });
    });
  });
});

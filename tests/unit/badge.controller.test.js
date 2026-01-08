// 📄 tests/unit/badge.controller.test.js - Badge Controller Unit Tests
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
jest.mock('../../services/badge.service');
jest.mock('../../services/adaptiveGamification.service');

const badgeController = require('../../controllers/badge.controller');
const badgeService = require('../../services/badge.service');
const adaptiveGamificationService = require('../../services/adaptiveGamification.service');

describe('🔹 Badge Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const VALID_CENTER_ID = '507f1f77bcf86cd799439012';
  const VALID_BADGE_ID = '507f1f77bcf86cd799439013';
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
      params: {},
      body: {},
    };

    // Setup default mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('getAllBadges', () => {
    const mockBadges = [
      {
        _id: VALID_BADGE_ID,
        name: 'First Task',
        description: 'Complete your first task',
        icon_url: '/icons/first-task.png',
        category: 'achievement',
        criteria: { type: 'task_count', value: 1 },
        points_reward: 10,
      },
      {
        _id: '507f1f77bcf86cd799439014',
        name: 'Task Master',
        description: 'Complete 10 tasks',
        icon_url: '/icons/task-master.png',
        category: 'competitive',
        criteria: { type: 'task_count', value: 10 },
        points_reward: 50,
      },
    ];

    it('✅ should return all badges successfully', async () => {
      badgeService.getAllBadges.mockResolvedValue(mockBadges);

      await badgeController.getAllBadges(mockReq, mockRes);

      expect(badgeService.getAllBadges).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockBadges,
      });
    });

    it('✅ should return empty array when no badges exist', async () => {
      badgeService.getAllBadges.mockResolvedValue([]);

      await badgeController.getAllBadges(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      badgeService.getAllBadges.mockRejectedValue(error);

      await badgeController.getAllBadges(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });

  describe('getUserBadges', () => {
    const mockUserBadges = [
      {
        badge_id: {
          _id: VALID_BADGE_ID,
          name: 'First Task',
          description: 'Complete your first task',
          icon_url: '/icons/first-task.png',
          category: 'achievement',
        },
        earned_at: new Date(),
        metadata: {},
      },
    ];

    it('✅ should return user badges when center_id provided', async () => {
      badgeService.getUserBadges.mockResolvedValue(mockUserBadges);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await badgeController.getUserBadges(mockReq, mockRes);

      expect(badgeService.getUserBadges).toHaveBeenCalledWith(VALID_USER_ID, VALID_CENTER_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUserBadges,
        total: mockUserBadges.length,
        message: null,
      });
    });

    it('✅ should auto-detect center_id when not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(VALID_CENTER_ID);
      badgeService.getUserBadges.mockResolvedValue(mockUserBadges);

      mockReq.query = {};

      await badgeController.getUserBadges(mockReq, mockRes);

      expect(adaptiveGamificationService.getUserCenterId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(badgeService.getUserBadges).toHaveBeenCalledWith(VALID_USER_ID, VALID_CENTER_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUserBadges,
        total: mockUserBadges.length,
        message: null,
      });
    });

    it('✅ should return message when user has no badges', async () => {
      badgeService.getUserBadges.mockResolvedValue([]);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await badgeController.getUserBadges(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        total: 0,
        message: 'User chưa đạt badge nào',
      });
    });

    it('❌ should return 400 when center_id not found and not provided', async () => {
      adaptiveGamificationService.getUserCenterId.mockResolvedValue(null);

      mockReq.query = {};

      await badgeController.getUserBadges(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy center của user',
      });
      expect(badgeService.getUserBadges).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Service error');
      badgeService.getUserBadges.mockRejectedValue(error);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await badgeController.getUserBadges(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('getRecentBadges', () => {
    const mockRecentBadges = [
      {
        user_id: {
          _id: VALID_USER_ID,
          username: 'testuser',
          full_name: 'Test User',
        },
        badge_id: {
          _id: VALID_BADGE_ID,
          name: 'First Task',
          icon_url: '/icons/first-task.png',
          category: 'achievement',
        },
        earned_at: new Date(),
      },
    ];

    it('✅ should return recent badges successfully', async () => {
      badgeService.getRecentBadges.mockResolvedValue(mockRecentBadges);

      mockReq.query = {
        center_id: VALID_CENTER_ID,
        limit: '10',
      };

      await badgeController.getRecentBadges(mockReq, mockRes);

      expect(badgeService.getRecentBadges).toHaveBeenCalledWith(VALID_CENTER_ID, 10);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecentBadges,
        total: mockRecentBadges.length,
        center_id: VALID_CENTER_ID,
        limit: 10,
        message: null,
      });
    });

    it('✅ should use default limit when not provided', async () => {
      badgeService.getRecentBadges.mockResolvedValue(mockRecentBadges);

      mockReq.query = {
        center_id: VALID_CENTER_ID,
      };

      await badgeController.getRecentBadges(mockReq, mockRes);

      expect(badgeService.getRecentBadges).toHaveBeenCalledWith(VALID_CENTER_ID, 10);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecentBadges,
        total: mockRecentBadges.length,
        center_id: VALID_CENTER_ID,
        limit: 10,
        message: null,
      });
    });

    it('✅ should return message when no recent badges', async () => {
      badgeService.getRecentBadges.mockResolvedValue([]);

      mockReq.query = {
        center_id: VALID_CENTER_ID,
        limit: '10',
      };

      await badgeController.getRecentBadges(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        total: 0,
        center_id: VALID_CENTER_ID,
        limit: 10,
        message: 'Chưa có badge nào được trao trong center này',
      });
    });

    it('❌ should return 400 when center_id is missing', async () => {
      mockReq.query = {};

      await badgeController.getRecentBadges(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'center_id là bắt buộc',
      });
      expect(badgeService.getRecentBadges).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Service error');
      badgeService.getRecentBadges.mockRejectedValue(error);

      mockReq.query = {
        center_id: VALID_CENTER_ID,
      };

      await badgeController.getRecentBadges(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('getBadgeById', () => {
    const mockBadge = {
      _id: VALID_BADGE_ID,
      name: 'First Task',
      description: 'Complete your first task',
      icon_url: '/icons/first-task.png',
      category: 'achievement',
      criteria: { type: 'task_count', value: 1 },
      points_reward: 10,
    };

    it('✅ should return badge by id successfully', async () => {
      badgeService.getBadgeById.mockResolvedValue(mockBadge);

      mockReq.params = { id: VALID_BADGE_ID };

      await badgeController.getBadgeById(mockReq, mockRes);

      expect(badgeService.getBadgeById).toHaveBeenCalledWith(VALID_BADGE_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockBadge,
      });
    });

    it('❌ should return 404 when badge does not exist', async () => {
      badgeService.getBadgeById.mockResolvedValue(null);

      mockReq.params = { id: VALID_BADGE_ID };

      await badgeController.getBadgeById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Badge không tồn tại',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      badgeService.getBadgeById.mockRejectedValue(error);

      mockReq.params = { id: VALID_BADGE_ID };

      await badgeController.getBadgeById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });

  describe('createBadge', () => {
    const mockBadgeData = {
      name: 'New Badge',
      description: 'New badge description',
      icon_url: '/icons/new-badge.png',
      category: 'achievement',
      criteria: { type: 'task_count', value: 5 },
      points_reward: 20,
    };

    const mockCreatedBadge = {
      _id: VALID_BADGE_ID,
      ...mockBadgeData,
    };

    it('✅ should create badge successfully with all fields', async () => {
      badgeService.createBadge.mockResolvedValue(mockCreatedBadge);

      mockReq.body = mockBadgeData;

      await badgeController.createBadge(mockReq, mockRes);

      expect(badgeService.createBadge).toHaveBeenCalledWith({
        name: mockBadgeData.name,
        description: mockBadgeData.description,
        icon_url: mockBadgeData.icon_url,
        category: mockBadgeData.category,
        criteria: mockBadgeData.criteria,
        points_reward: mockBadgeData.points_reward,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedBadge,
      });
    });

    it('✅ should create badge with default points_reward when not provided', async () => {
      badgeService.createBadge.mockResolvedValue(mockCreatedBadge);

      mockReq.body = {
        name: 'New Badge',
        description: 'New badge description',
        category: 'achievement',
        criteria: { type: 'task_count', value: 5 },
      };

      await badgeController.createBadge(mockReq, mockRes);

      expect(badgeService.createBadge).toHaveBeenCalledWith({
        name: 'New Badge',
        description: 'New badge description',
        icon_url: undefined,
        category: 'achievement',
        criteria: { type: 'task_count', value: 5 },
        points_reward: 0,
      });
    });

    it('❌ should return 400 when name is missing', async () => {
      mockReq.body = {
        description: 'New badge description',
        category: 'achievement',
        criteria: { type: 'task_count', value: 5 },
      };

      await badgeController.createBadge(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'name, description, category, criteria là bắt buộc',
      });
      expect(badgeService.createBadge).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when description is missing', async () => {
      mockReq.body = {
        name: 'New Badge',
        category: 'achievement',
        criteria: { type: 'task_count', value: 5 },
      };

      await badgeController.createBadge(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'name, description, category, criteria là bắt buộc',
      });
    });

    it('❌ should return 400 when category is missing', async () => {
      mockReq.body = {
        name: 'New Badge',
        description: 'New badge description',
        criteria: { type: 'task_count', value: 5 },
      };

      await badgeController.createBadge(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'name, description, category, criteria là bắt buộc',
      });
    });

    it('❌ should return 400 when criteria is missing', async () => {
      mockReq.body = {
        name: 'New Badge',
        description: 'New badge description',
        category: 'achievement',
      };

      await badgeController.createBadge(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'name, description, category, criteria là bắt buộc',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      badgeService.createBadge.mockRejectedValue(error);

      mockReq.body = mockBadgeData;

      await badgeController.createBadge(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });

  describe('updateBadge', () => {
    const mockUpdatedBadge = {
      _id: VALID_BADGE_ID,
      name: 'Updated Badge',
      description: 'Updated description',
      category: 'achievement',
    };

    it('✅ should update badge successfully', async () => {
      badgeService.updateBadge.mockResolvedValue(mockUpdatedBadge);

      mockReq.params = { id: VALID_BADGE_ID };
      mockReq.body = {
        name: 'Updated Badge',
        description: 'Updated description',
      };

      await badgeController.updateBadge(mockReq, mockRes);

      expect(badgeService.updateBadge).toHaveBeenCalledWith(VALID_BADGE_ID, {
        name: 'Updated Badge',
        description: 'Updated description',
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedBadge,
      });
    });

    it('❌ should return 404 when badge does not exist', async () => {
      badgeService.updateBadge.mockResolvedValue(null);

      mockReq.params = { id: VALID_BADGE_ID };
      mockReq.body = { name: 'Updated Badge' };

      await badgeController.updateBadge(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Badge không tồn tại',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      badgeService.updateBadge.mockRejectedValue(error);

      mockReq.params = { id: VALID_BADGE_ID };
      mockReq.body = { name: 'Updated Badge' };

      await badgeController.updateBadge(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });

  describe('deleteBadge', () => {
    it('✅ should delete badge successfully', async () => {
      badgeService.deleteBadge.mockResolvedValue({});

      mockReq.params = { id: VALID_BADGE_ID };

      await badgeController.deleteBadge(mockReq, mockRes);

      expect(badgeService.deleteBadge).toHaveBeenCalledWith(VALID_BADGE_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Đã xóa badge',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Badge đang được sử dụng');
      badgeService.deleteBadge.mockRejectedValue(error);

      mockReq.params = { id: VALID_BADGE_ID };

      await badgeController.deleteBadge(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Badge đang được sử dụng',
      });
    });
  });
});

// 📄 tests/unit/atRiskDetection.controller.test.js - At Risk Detection Controller Unit Tests
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
jest.mock('../../services/atRiskDetection.service');
jest.mock('../../services/activityLog.service');

const atRiskDetectionController = require('../../controllers/atRiskDetection.controller');
const atRiskDetectionService = require('../../services/atRiskDetection.service');
const activityLogService = require('../../services/activityLog.service');

describe('🔹 At Risk Detection Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const VALID_BOARD_ID = '507f1f77bcf86cd799439012';
  const VALID_TASK_ID = '507f1f77bcf86cd799439013';
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

  describe('detectAtRiskTasks', () => {
    const mockAtRiskTasks = [
      {
        task_id: VALID_TASK_ID,
        board_id: VALID_BOARD_ID,
        risk_score: 0.8,
        risk_reasons: [
          {
            rule_name: 'unassigned_near_deadline',
            score: 0.8,
            triggered: true,
            details: {
              days_until_due: 2,
            },
          },
        ],
        recommendations: ['Gán người thực hiện ngay lập tức'],
        is_resolved: false,
        task: {
          _id: VALID_TASK_ID,
          title: 'Test Task',
          due_date: new Date(),
        },
      },
    ];

    it('✅ should detect at-risk tasks successfully with board_id', async () => {
      atRiskDetectionService.detectAtRiskTasks.mockResolvedValue(mockAtRiskTasks);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.query = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.detectAtRiskTasks(mockReq, mockRes);

      expect(atRiskDetectionService.detectAtRiskTasks).toHaveBeenCalledWith(VALID_BOARD_ID);
      expect(activityLogService.createActivityLog).toHaveBeenCalledWith({
        user_id: VALID_USER_ID,
        action: 'Phát hiện tasks có nguy cơ trễ hạn',
        target_type: 'AtRiskTask',
        target_id: VALID_BOARD_ID,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: `Phát hiện ${mockAtRiskTasks.length} task(s) có nguy cơ trễ hạn`,
        data: mockAtRiskTasks,
        count: mockAtRiskTasks.length,
      });
    });

    it('✅ should detect at-risk tasks successfully without board_id', async () => {
      atRiskDetectionService.detectAtRiskTasks.mockResolvedValue(mockAtRiskTasks);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.query = {};

      await atRiskDetectionController.detectAtRiskTasks(mockReq, mockRes);

      expect(atRiskDetectionService.detectAtRiskTasks).toHaveBeenCalledWith(null);
      expect(activityLogService.createActivityLog).toHaveBeenCalledWith({
        user_id: VALID_USER_ID,
        action: 'Phát hiện tasks có nguy cơ trễ hạn',
        target_type: 'AtRiskTask',
        target_id: null,
      });
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('✅ should return empty array when no at-risk tasks found', async () => {
      atRiskDetectionService.detectAtRiskTasks.mockResolvedValue([]);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.query = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.detectAtRiskTasks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Phát hiện 0 task(s) có nguy cơ trễ hạn',
        data: [],
        count: 0,
      });
    });

    it('✅ should handle when user is not provided', async () => {
      atRiskDetectionService.detectAtRiskTasks.mockResolvedValue(mockAtRiskTasks);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.user = null;
      mockReq.query = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.detectAtRiskTasks(mockReq, mockRes);

      expect(activityLogService.createActivityLog).toHaveBeenCalledWith({
        user_id: undefined,
        action: 'Phát hiện tasks có nguy cơ trễ hạn',
        target_type: 'AtRiskTask',
        target_id: VALID_BOARD_ID,
      });
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Service error');
      atRiskDetectionService.detectAtRiskTasks.mockRejectedValue(error);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.query = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.detectAtRiskTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      atRiskDetectionService.detectAtRiskTasks.mockRejectedValue(error);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.query = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.detectAtRiskTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi phát hiện at-risk tasks',
      });
    });
  });

  describe('getAtRiskTasksByBoard', () => {
    const mockAtRiskTasks = [
      {
        task_id: VALID_TASK_ID,
        board_id: VALID_BOARD_ID,
        risk_score: 0.8,
        risk_reasons: [],
        recommendations: [],
        is_resolved: false,
      },
    ];

    it('✅ should return at-risk tasks by board successfully', async () => {
      atRiskDetectionService.getAtRiskTasksByBoard.mockResolvedValue(mockAtRiskTasks);

      mockReq.params = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.getAtRiskTasksByBoard(mockReq, mockRes);

      expect(atRiskDetectionService.getAtRiskTasksByBoard).toHaveBeenCalledWith(VALID_BOARD_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAtRiskTasks,
        count: mockAtRiskTasks.length,
      });
    });

    it('✅ should return empty array when no at-risk tasks found', async () => {
      atRiskDetectionService.getAtRiskTasksByBoard.mockResolvedValue([]);

      mockReq.params = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.getAtRiskTasksByBoard(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0,
      });
    });

    it('✅ should handle when user is not provided', async () => {
      atRiskDetectionService.getAtRiskTasksByBoard.mockResolvedValue(mockAtRiskTasks);

      mockReq.user = null;
      mockReq.params = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.getAtRiskTasksByBoard(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Board không tồn tại');
      atRiskDetectionService.getAtRiskTasksByBoard.mockRejectedValue(error);

      mockReq.params = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.getAtRiskTasksByBoard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Board không tồn tại',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      atRiskDetectionService.getAtRiskTasksByBoard.mockRejectedValue(error);

      mockReq.params = { board_id: VALID_BOARD_ID };

      await atRiskDetectionController.getAtRiskTasksByBoard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi lấy danh sách at-risk tasks',
      });
    });
  });

  describe('getAtRiskTasksByUser', () => {
    const mockAtRiskTasks = [
      {
        task_id: VALID_TASK_ID,
        board_id: VALID_BOARD_ID,
        risk_score: 0.6,
        risk_reasons: [],
        recommendations: [],
        is_resolved: false,
      },
    ];

    it('✅ should return at-risk tasks by user from req.user.id', async () => {
      atRiskDetectionService.getAtRiskTasksByUser.mockResolvedValue(mockAtRiskTasks);

      mockReq.user = { id: VALID_USER_ID };
      mockReq.params = {};

      await atRiskDetectionController.getAtRiskTasksByUser(mockReq, mockRes);

      expect(atRiskDetectionService.getAtRiskTasksByUser).toHaveBeenCalledWith(VALID_USER_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAtRiskTasks,
        count: mockAtRiskTasks.length,
      });
    });

    it('✅ should return at-risk tasks by user from req.params.user_id when req.user.id not available', async () => {
      const paramUserId = '507f1f77bcf86cd799439014';
      atRiskDetectionService.getAtRiskTasksByUser.mockResolvedValue(mockAtRiskTasks);

      mockReq.user = null;
      mockReq.params = { user_id: paramUserId };

      await atRiskDetectionController.getAtRiskTasksByUser(mockReq, mockRes);

      expect(atRiskDetectionService.getAtRiskTasksByUser).toHaveBeenCalledWith(paramUserId);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('✅ should prioritize req.user.id over req.params.user_id', async () => {
      atRiskDetectionService.getAtRiskTasksByUser.mockResolvedValue(mockAtRiskTasks);

      mockReq.user = { id: VALID_USER_ID };
      mockReq.params = { user_id: '507f1f77bcf86cd799439014' };

      await atRiskDetectionController.getAtRiskTasksByUser(mockReq, mockRes);

      expect(atRiskDetectionService.getAtRiskTasksByUser).toHaveBeenCalledWith(VALID_USER_ID);
    });

    it('✅ should return empty array when no at-risk tasks found', async () => {
      atRiskDetectionService.getAtRiskTasksByUser.mockResolvedValue([]);

      mockReq.user = { id: VALID_USER_ID };
      mockReq.params = {};

      await atRiskDetectionController.getAtRiskTasksByUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0,
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('User không tồn tại');
      atRiskDetectionService.getAtRiskTasksByUser.mockRejectedValue(error);

      mockReq.user = { id: VALID_USER_ID };
      mockReq.params = {};

      await atRiskDetectionController.getAtRiskTasksByUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User không tồn tại',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      atRiskDetectionService.getAtRiskTasksByUser.mockRejectedValue(error);

      mockReq.user = { id: VALID_USER_ID };
      mockReq.params = {};

      await atRiskDetectionController.getAtRiskTasksByUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi lấy danh sách at-risk tasks',
      });
    });
  });

  describe('markAsResolved', () => {
    const mockResult = {
      task_id: VALID_TASK_ID,
      is_resolved: true,
      resolved_at: new Date(),
    };

    it('✅ should mark task as resolved successfully', async () => {
      atRiskDetectionService.markTaskAsResolved.mockResolvedValue(mockResult);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.params = { task_id: VALID_TASK_ID };

      await atRiskDetectionController.markAsResolved(mockReq, mockRes);

      expect(atRiskDetectionService.markTaskAsResolved).toHaveBeenCalledWith(VALID_TASK_ID);
      expect(activityLogService.createActivityLog).toHaveBeenCalledWith({
        user_id: VALID_USER_ID,
        action: 'Đánh dấu task không còn nguy cơ trễ hạn',
        target_type: 'AtRiskTask',
        target_id: VALID_TASK_ID,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Đã đánh dấu task không còn nguy cơ trễ hạn',
        data: mockResult,
      });
    });

    it('✅ should handle when user is not provided', async () => {
      atRiskDetectionService.markTaskAsResolved.mockResolvedValue(mockResult);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.user = null;
      mockReq.params = { task_id: VALID_TASK_ID };

      await atRiskDetectionController.markAsResolved(mockReq, mockRes);

      expect(activityLogService.createActivityLog).toHaveBeenCalledWith({
        user_id: undefined,
        action: 'Đánh dấu task không còn nguy cơ trễ hạn',
        target_type: 'AtRiskTask',
        target_id: VALID_TASK_ID,
      });
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Task không tồn tại');
      atRiskDetectionService.markTaskAsResolved.mockRejectedValue(error);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.params = { task_id: VALID_TASK_ID };

      await atRiskDetectionController.markAsResolved(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task không tồn tại',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      atRiskDetectionService.markTaskAsResolved.mockRejectedValue(error);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.params = { task_id: VALID_TASK_ID };

      await atRiskDetectionController.markAsResolved(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi đánh dấu task',
      });
    });

    it('✅ should still log activity even if service fails', async () => {
      const error = new Error('Service error');
      atRiskDetectionService.markTaskAsResolved.mockRejectedValue(error);
      activityLogService.createActivityLog.mockResolvedValue({});

      mockReq.params = { task_id: VALID_TASK_ID };

      await atRiskDetectionController.markAsResolved(mockReq, mockRes);

      expect(activityLogService.createActivityLog).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});

// 📄 tests/unit/scheduledReport.controller.test.js - Scheduled Report Controller Unit Tests

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
jest.mock('../../services/scheduledReport.service', () => ({
  createScheduledReport: jest.fn(),
  getScheduledReportsByUserId: jest.fn(),
  getScheduledReportById: jest.fn(),
  updateScheduledReport: jest.fn(),
  deleteScheduledReport: jest.fn(),
  processScheduledReports: jest.fn(),
  sendScheduledReport: jest.fn(),
}));

const scheduledReportController = require('../../controllers/scheduledReport.controller');
const scheduledReportService = require('../../services/scheduledReport.service');

describe('🔹 Scheduled Report Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const OTHER_USER_ID = '507f1f77bcf86cd799439012';
  const VALID_BOARD_ID = '507f1f77bcf86cd799439013';
  const VALID_REPORT_ID = '507f1f77bcf86cd799439014';
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

  describe('create', () => {
    const mockScheduledReport = {
      _id: VALID_REPORT_ID,
      user_id: VALID_USER_ID,
      board_id: VALID_BOARD_ID,
      report_type: 'dashboard',
      frequency: 'daily',
      recipients: ['test@example.com'],
      report_params: {},
      is_active: true,
      next_send_at: new Date(),
    };

    it('✅ should create scheduled report successfully with array recipients', async () => {
      scheduledReportService.createScheduledReport.mockResolvedValue(mockScheduledReport);

      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com', 'user2@example.com'],
        report_params: {},
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(scheduledReportService.createScheduledReport).toHaveBeenCalledWith({
        user_id: VALID_USER_ID,
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com', 'user2@example.com'],
        report_params: {},
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Đăng ký nhận báo cáo tự động thành công',
        data: mockScheduledReport,
      });
    });

    it('✅ should create scheduled report with string recipient', async () => {
      scheduledReportService.createScheduledReport.mockResolvedValue(mockScheduledReport);

      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: 'test@example.com',
        report_params: {},
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(scheduledReportService.createScheduledReport).toHaveBeenCalledWith({
        user_id: VALID_USER_ID,
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
        report_params: {},
      });
    });

    it('✅ should filter empty recipients from array', async () => {
      scheduledReportService.createScheduledReport.mockResolvedValue(mockScheduledReport);

      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com', '', '  ', 'user2@example.com'],
        report_params: {},
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(scheduledReportService.createScheduledReport).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: ['test@example.com', 'user2@example.com'],
        })
      );
    });

    it('✅ should use empty object for report_params when not provided', async () => {
      scheduledReportService.createScheduledReport.mockResolvedValue(mockScheduledReport);

      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(scheduledReportService.createScheduledReport).toHaveBeenCalledWith(
        expect.objectContaining({
          report_params: {},
        })
      );
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;

      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
      expect(scheduledReportService.createScheduledReport).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when board_id is missing', async () => {
      mockReq.body = {
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Thiếu thông tin bắt buộc: board_id, report_type, frequency, recipients',
        received: {
          hasBoardId: false,
          hasReportType: true,
          hasFrequency: true,
          hasRecipients: true,
        },
      });
    });

    it('❌ should return 400 when report_type is missing', async () => {
      mockReq.body = {
        board_id: VALID_BOARD_ID,
        frequency: 'daily',
        recipients: ['test@example.com'],
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Thiếu thông tin bắt buộc: board_id, report_type, frequency, recipients',
        received: {
          hasBoardId: true,
          hasReportType: false,
          hasFrequency: true,
          hasRecipients: true,
        },
      });
    });

    it('❌ should return 400 when frequency is missing', async () => {
      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        recipients: ['test@example.com'],
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Thiếu thông tin bắt buộc: board_id, report_type, frequency, recipients',
        received: {
          hasBoardId: true,
          hasReportType: true,
          hasFrequency: false,
          hasRecipients: true,
        },
      });
    });

    it('❌ should return 400 when recipients is missing', async () => {
      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Thiếu thông tin bắt buộc: board_id, report_type, frequency, recipients',
        received: {
          hasBoardId: true,
          hasReportType: true,
          hasFrequency: true,
          hasRecipients: false,
        },
      });
    });

    it('❌ should return 400 when recipients is not array or string', async () => {
      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: 123,
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'recipients phải là mảng hoặc chuỗi',
      });
    });

    it('❌ should return 400 when recipients array is empty after filtering', async () => {
      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['', '  '],
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Phải có ít nhất một địa chỉ email người nhận',
      });
    });

    it('❌ should return 400 when service throws error', async () => {
      const error = new Error('Invalid email format');
      scheduledReportService.createScheduledReport.mockRejectedValue(error);

      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['invalid-email'],
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email format',
      });
    });

    it('❌ should return 400 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      scheduledReportService.createScheduledReport.mockRejectedValue(error);

      mockReq.body = {
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
      };

      await scheduledReportController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi tạo đăng ký báo cáo',
      });
    });
  });

  describe('getAll', () => {
    const mockScheduledReports = [
      {
        _id: VALID_REPORT_ID,
        user_id: VALID_USER_ID,
        board_id: VALID_BOARD_ID,
        report_type: 'dashboard',
        frequency: 'daily',
      },
    ];

    it('✅ should return all scheduled reports for user', async () => {
      scheduledReportService.getScheduledReportsByUserId.mockResolvedValue(mockScheduledReports);

      await scheduledReportController.getAll(mockReq, mockRes);

      expect(scheduledReportService.getScheduledReportsByUserId).toHaveBeenCalledWith(
        VALID_USER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockScheduledReports,
      });
    });

    it('✅ should return empty array when no reports found', async () => {
      scheduledReportService.getScheduledReportsByUserId.mockResolvedValue([]);

      await scheduledReportController.getAll(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;

      await scheduledReportController.getAll(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
      expect(scheduledReportService.getScheduledReportsByUserId).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      scheduledReportService.getScheduledReportsByUserId.mockRejectedValue(error);

      await scheduledReportController.getAll(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });

  describe('getById', () => {
    const mockScheduledReport = {
      _id: VALID_REPORT_ID,
      user_id: VALID_USER_ID,
      board_id: VALID_BOARD_ID,
      report_type: 'dashboard',
      frequency: 'daily',
    };

    it('✅ should return scheduled report by id successfully', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(mockScheduledReport);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.getById(mockReq, mockRes);

      expect(scheduledReportService.getScheduledReportById).toHaveBeenCalledWith(VALID_REPORT_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockScheduledReport,
      });
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;
      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
    });

    it('❌ should return 404 when report not found', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(null);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy đăng ký báo cáo',
      });
    });

    it('❌ should return 403 when user does not own the report', async () => {
      const otherUserReport = {
        ...mockScheduledReport,
        user_id: OTHER_USER_ID,
      };
      scheduledReportService.getScheduledReportById.mockResolvedValue(otherUserReport);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bạn không có quyền truy cập đăng ký báo cáo này',
      });
    });

    it('✅ should handle user_id as ObjectId string comparison', async () => {
      const reportWithObjectId = {
        ...mockScheduledReport,
        user_id: { toString: () => VALID_USER_ID },
      };
      scheduledReportService.getScheduledReportById.mockResolvedValue(reportWithObjectId);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.getById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: reportWithObjectId,
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      scheduledReportService.getScheduledReportById.mockRejectedValue(error);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });

  describe('update', () => {
    const mockExistingReport = {
      _id: VALID_REPORT_ID,
      user_id: VALID_USER_ID,
      board_id: VALID_BOARD_ID,
      report_type: 'dashboard',
      frequency: 'daily',
    };

    const mockUpdatedReport = {
      ...mockExistingReport,
      frequency: 'weekly',
      recipients: ['new@example.com'],
    };

    it('✅ should update scheduled report successfully', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(mockExistingReport);
      scheduledReportService.updateScheduledReport.mockResolvedValue(mockUpdatedReport);

      mockReq.params = { id: VALID_REPORT_ID };
      mockReq.body = {
        frequency: 'weekly',
        recipients: ['new@example.com'],
      };

      await scheduledReportController.update(mockReq, mockRes);

      expect(scheduledReportService.getScheduledReportById).toHaveBeenCalledWith(VALID_REPORT_ID);
      expect(scheduledReportService.updateScheduledReport).toHaveBeenCalledWith(VALID_REPORT_ID, {
        frequency: 'weekly',
        recipients: ['new@example.com'],
        report_params: undefined,
        is_active: undefined,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cập nhật đăng ký báo cáo thành công',
        data: mockUpdatedReport,
      });
    });

    it('✅ should convert string recipient to array', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(mockExistingReport);
      scheduledReportService.updateScheduledReport.mockResolvedValue(mockUpdatedReport);

      mockReq.params = { id: VALID_REPORT_ID };
      mockReq.body = {
        recipients: 'new@example.com',
      };

      await scheduledReportController.update(mockReq, mockRes);

      expect(scheduledReportService.updateScheduledReport).toHaveBeenCalledWith(
        VALID_REPORT_ID,
        expect.objectContaining({
          recipients: ['new@example.com'],
        })
      );
    });

    it('✅ should allow admin to update any report', async () => {
      const otherUserReport = {
        ...mockExistingReport,
        user_id: OTHER_USER_ID,
      };
      scheduledReportService.getScheduledReportById.mockResolvedValue(otherUserReport);
      scheduledReportService.updateScheduledReport.mockResolvedValue(mockUpdatedReport);

      mockReq.user.roles = ['admin'];
      mockReq.params = { id: VALID_REPORT_ID };
      mockReq.body = { frequency: 'weekly' };

      await scheduledReportController.update(mockReq, mockRes);

      expect(scheduledReportService.updateScheduledReport).toHaveBeenCalled();
    });

    it('✅ should allow System_Manager to update any report', async () => {
      const otherUserReport = {
        ...mockExistingReport,
        user_id: OTHER_USER_ID,
      };
      scheduledReportService.getScheduledReportById.mockResolvedValue(otherUserReport);
      scheduledReportService.updateScheduledReport.mockResolvedValue(mockUpdatedReport);

      mockReq.user.roles = ['System_Manager'];
      mockReq.params = { id: VALID_REPORT_ID };
      mockReq.body = { frequency: 'weekly' };

      await scheduledReportController.update(mockReq, mockRes);

      expect(scheduledReportService.updateScheduledReport).toHaveBeenCalled();
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;
      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
    });

    it('❌ should return 404 when report not found', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(null);

      mockReq.params = { id: VALID_REPORT_ID };
      mockReq.body = { frequency: 'weekly' };

      await scheduledReportController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy đăng ký báo cáo',
      });
    });

    it('❌ should return 403 when user does not own the report and is not admin', async () => {
      const otherUserReport = {
        ...mockExistingReport,
        user_id: OTHER_USER_ID,
      };
      scheduledReportService.getScheduledReportById.mockResolvedValue(otherUserReport);

      mockReq.user.roles = ['user'];
      mockReq.params = { id: VALID_REPORT_ID };
      mockReq.body = { frequency: 'weekly' };

      await scheduledReportController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bạn không có quyền cập nhật đăng ký báo cáo này',
      });
      expect(scheduledReportService.updateScheduledReport).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when service throws error', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(mockExistingReport);
      const error = new Error('Validation failed');
      scheduledReportService.updateScheduledReport.mockRejectedValue(error);

      mockReq.params = { id: VALID_REPORT_ID };
      mockReq.body = { frequency: 'invalid' };

      await scheduledReportController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
      });
    });
  });

  describe('delete', () => {
    const mockExistingReport = {
      _id: VALID_REPORT_ID,
      user_id: VALID_USER_ID,
      board_id: VALID_BOARD_ID,
    };

    it('✅ should delete scheduled report successfully', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(mockExistingReport);
      scheduledReportService.deleteScheduledReport.mockResolvedValue(undefined);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.delete(mockReq, mockRes);

      expect(scheduledReportService.getScheduledReportById).toHaveBeenCalledWith(VALID_REPORT_ID);
      expect(scheduledReportService.deleteScheduledReport).toHaveBeenCalledWith(VALID_REPORT_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Xóa đăng ký báo cáo thành công',
      });
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;
      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
    });

    it('❌ should return 404 when report not found', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(null);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy đăng ký báo cáo',
      });
    });

    it('❌ should return 403 when user does not own the report', async () => {
      const otherUserReport = {
        ...mockExistingReport,
        user_id: OTHER_USER_ID,
      };
      scheduledReportService.getScheduledReportById.mockResolvedValue(otherUserReport);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bạn không có quyền xóa đăng ký báo cáo này',
      });
      expect(scheduledReportService.deleteScheduledReport).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(mockExistingReport);
      const error = new Error('Delete failed');
      scheduledReportService.deleteScheduledReport.mockRejectedValue(error);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Delete failed',
      });
    });
  });

  describe('processAll', () => {
    const mockProcessResult = {
      processed: 5,
      success: 4,
      failed: 1,
    };

    it('✅ should process all scheduled reports successfully', async () => {
      scheduledReportService.processScheduledReports.mockResolvedValue(mockProcessResult);

      await scheduledReportController.processAll(mockReq, mockRes);

      expect(scheduledReportService.processScheduledReports).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Xử lý báo cáo đã hoàn thành',
        data: {
          processed: 5,
          success: 4,
          failed: 1,
        },
      });
    });

    it('✅ should handle zero processed reports', async () => {
      scheduledReportService.processScheduledReports.mockResolvedValue({
        processed: 0,
        success: 0,
        failed: 0,
      });

      await scheduledReportController.processAll(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Xử lý báo cáo đã hoàn thành',
        data: {
          processed: 0,
          success: 0,
          failed: 0,
        },
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Process failed');
      scheduledReportService.processScheduledReports.mockRejectedValue(error);

      await scheduledReportController.processAll(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Process failed',
      });
    });
  });

  describe('sendNow', () => {
    const mockScheduledReport = {
      _id: VALID_REPORT_ID,
      user_id: VALID_USER_ID,
      board_id: VALID_BOARD_ID,
      report_type: 'dashboard',
      frequency: 'daily',
      recipients: ['test@example.com'],
    };

    it('✅ should send scheduled report immediately successfully', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(mockScheduledReport);
      scheduledReportService.sendScheduledReport.mockResolvedValue({ success: true });

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.sendNow(mockReq, mockRes);

      expect(scheduledReportService.getScheduledReportById).toHaveBeenCalledWith(VALID_REPORT_ID);
      expect(scheduledReportService.sendScheduledReport).toHaveBeenCalledWith(mockScheduledReport);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Báo cáo đã được gửi thành công',
      });
    });

    it('✅ should allow admin to send any report', async () => {
      const otherUserReport = {
        ...mockScheduledReport,
        user_id: OTHER_USER_ID,
      };
      scheduledReportService.getScheduledReportById.mockResolvedValue(otherUserReport);
      scheduledReportService.sendScheduledReport.mockResolvedValue({ success: true });

      mockReq.user.roles = ['admin'];
      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.sendNow(mockReq, mockRes);

      expect(scheduledReportService.sendScheduledReport).toHaveBeenCalled();
    });

    it('✅ should allow System_Manager to send any report', async () => {
      const otherUserReport = {
        ...mockScheduledReport,
        user_id: OTHER_USER_ID,
      };
      scheduledReportService.getScheduledReportById.mockResolvedValue(otherUserReport);
      scheduledReportService.sendScheduledReport.mockResolvedValue({ success: true });

      mockReq.user.roles = ['System_Manager'];
      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.sendNow(mockReq, mockRes);

      expect(scheduledReportService.sendScheduledReport).toHaveBeenCalled();
    });

    it('❌ should return 401 when user_id is missing', async () => {
      mockReq.user = null;
      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.sendNow(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Người dùng chưa đăng nhập',
      });
    });

    it('❌ should return 404 when report not found', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(null);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.sendNow(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy đăng ký báo cáo',
      });
    });

    it('❌ should return 403 when user does not own the report and is not admin', async () => {
      const otherUserReport = {
        ...mockScheduledReport,
        user_id: OTHER_USER_ID,
      };
      scheduledReportService.getScheduledReportById.mockResolvedValue(otherUserReport);

      mockReq.user.roles = ['user'];
      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.sendNow(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bạn không có quyền gửi báo cáo này',
      });
      expect(scheduledReportService.sendScheduledReport).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      scheduledReportService.getScheduledReportById.mockResolvedValue(mockScheduledReport);
      const error = new Error('Send failed');
      scheduledReportService.sendScheduledReport.mockRejectedValue(error);

      mockReq.params = { id: VALID_REPORT_ID };

      await scheduledReportController.sendNow(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Send failed',
      });
    });
  });
});

// 📄 tests/unit/export.controller.test.js - Export Controller Unit Tests

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

// Mock bcrypt to avoid native build issues
jest.mock('bcrypt', () => ({
  compareSync: jest.fn(),
  hashSync: jest.fn(),
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock googleapis to avoid dependency issues
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(),
    },
    oauth2: jest.fn(),
    calendar: jest.fn(),
  },
}));

// Mock export service with all methods to prevent loading dependency chain
jest.mock('../../services/export.service', () => ({
  validateExportParams: jest.fn(),
  generateReportData: jest.fn(),
  exportToExcel: jest.fn(),
  exportToPDF: jest.fn(),
  generateFilename: jest.fn(),
  getDownloadUrl: jest.fn(),
  listFiles: jest.fn(),
  deleteFile: jest.fn(),
  cleanupOldFiles: jest.fn(),
}));

// Mock fs for downloadFile
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const exportController = require('../../controllers/export.controller');
const exportService = require('../../services/export.service');
const fs = require('fs');

describe('🔹 Export Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const VALID_BOARD_ID = '507f1f77bcf86cd799439012';
  const VALID_FILENAME = 'dashboard_1234567890_user507f1f77bcf86cd799439011.xlsx';
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock request
    mockReq = {
      user: {
        id: VALID_USER_ID,
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
      setHeader: jest.fn(),
      sendFile: jest.fn(),
    };
  });

  describe('exportReport', () => {
    const mockReportData = {
      reportType: 'dashboard',
      board: { id: VALID_BOARD_ID, title: 'Test Board' },
      stats: {
        totalTasks: 10,
        completedTasks: 5,
        inProgressTasks: 3,
        overdueTasks: 2,
        completionRate: 50,
      },
    };

    const mockFilePath = '/exports/dashboard_1234567890.xlsx';
    const mockDownloadUrl = '/api/exports/dashboard_1234567890.xlsx';

    it('✅ should export dashboard report to excel successfully', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);
      exportService.generateReportData.mockResolvedValue(mockReportData);
      exportService.generateFilename.mockReturnValue(VALID_FILENAME);
      exportService.exportToExcel.mockResolvedValue(mockFilePath);
      exportService.getDownloadUrl.mockReturnValue(mockDownloadUrl);

      mockReq.query = {
        report_type: 'dashboard',
        format: 'excel',
        board_id: VALID_BOARD_ID,
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(exportService.validateExportParams).toHaveBeenCalledWith('dashboard', 'excel');
      expect(exportService.generateReportData).toHaveBeenCalledWith('dashboard', {
        board_id: VALID_BOARD_ID,
        center_id: undefined,
        start_date: undefined,
        end_date: undefined,
        granularity: undefined,
        wipLimit: undefined,
        limit: undefined,
      });
      expect(exportService.exportToExcel).toHaveBeenCalledWith(mockReportData, VALID_FILENAME);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Xuất báo cáo thành công',
        data: expect.objectContaining({
          filename: VALID_FILENAME,
          downloadUrl: mockDownloadUrl,
          reportType: 'dashboard',
          format: 'excel',
          expiresAt: expect.any(String),
        }),
      });
    });

    it('✅ should export velocity report to pdf successfully', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);
      exportService.generateReportData.mockResolvedValue(mockReportData);
      exportService.generateFilename.mockReturnValue('velocity_1234567890.pdf');
      exportService.exportToPDF.mockResolvedValue(mockFilePath);
      exportService.getDownloadUrl.mockReturnValue(mockDownloadUrl);

      mockReq.query = {
        report_type: 'velocity',
        format: 'pdf',
        board_id: VALID_BOARD_ID,
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        wipLimit: '5',
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(exportService.validateExportParams).toHaveBeenCalledWith('velocity', 'pdf');
      expect(exportService.generateReportData).toHaveBeenCalledWith('velocity', {
        board_id: VALID_BOARD_ID,
        center_id: undefined,
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        granularity: undefined,
        wipLimit: 5,
        limit: undefined,
      });
      expect(exportService.exportToPDF).toHaveBeenCalled();
    });

    it('✅ should export leaderboard report without board_id', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);
      exportService.generateReportData.mockResolvedValue(mockReportData);
      exportService.generateFilename.mockReturnValue(VALID_FILENAME);
      exportService.exportToExcel.mockResolvedValue(mockFilePath);
      exportService.getDownloadUrl.mockReturnValue(mockDownloadUrl);

      mockReq.query = {
        report_type: 'leaderboard',
        format: 'excel',
        center_id: 'center123',
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(exportService.generateReportData).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('❌ should return 400 when report_type is missing', async () => {
      mockReq.query = {
        format: 'excel',
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'report_type và format là bắt buộc',
      });
      expect(exportService.validateExportParams).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when format is missing', async () => {
      mockReq.query = {
        report_type: 'dashboard',
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'report_type và format là bắt buộc',
      });
    });

    it('❌ should return 400 when validation fails', async () => {
      const error = new Error('Loại báo cáo không hợp lệ');
      exportService.validateExportParams.mockImplementation(() => {
        throw error;
      });

      mockReq.query = {
        report_type: 'invalid_type',
        format: 'excel',
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Loại báo cáo không hợp lệ',
      });
    });

    it('❌ should return 400 when board_id is missing for dashboard report', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);

      mockReq.query = {
        report_type: 'dashboard',
        format: 'excel',
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'board_id là bắt buộc cho loại báo cáo này',
      });
    });

    it('❌ should return 400 when board_id is missing for velocity report', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);

      mockReq.query = {
        report_type: 'velocity',
        format: 'excel',
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'board_id là bắt buộc cho loại báo cáo này',
      });
    });

    it('❌ should return 400 when board_id is missing for center_comparison report', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);

      mockReq.query = {
        report_type: 'center_comparison',
        format: 'excel',
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'board_id là bắt buộc cho loại báo cáo này',
      });
    });

    it('❌ should return 400 when generateReportData fails', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);
      const error = new Error('Board không tồn tại');
      exportService.generateReportData.mockRejectedValue(error);

      mockReq.query = {
        report_type: 'dashboard',
        format: 'excel',
        board_id: VALID_BOARD_ID,
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi tạo dữ liệu báo cáo: Board không tồn tại',
      });
    });

    it('❌ should return 500 when exportToExcel fails', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);
      exportService.generateReportData.mockResolvedValue(mockReportData);
      exportService.generateFilename.mockReturnValue(VALID_FILENAME);
      const error = new Error('File write error');
      exportService.exportToExcel.mockRejectedValue(error);

      mockReq.query = {
        report_type: 'dashboard',
        format: 'excel',
        board_id: VALID_BOARD_ID,
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi xuất file: File write error',
      });
    });

    it('❌ should return 500 when exportToPDF fails', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);
      exportService.generateReportData.mockResolvedValue(mockReportData);
      exportService.generateFilename.mockReturnValue('dashboard_1234567890.pdf');
      const error = new Error('PDF generation error');
      exportService.exportToPDF.mockRejectedValue(error);

      mockReq.query = {
        report_type: 'dashboard',
        format: 'pdf',
        board_id: VALID_BOARD_ID,
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi xuất file: PDF generation error',
      });
    });

    it('✅ should handle when user is not provided', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);
      exportService.generateReportData.mockResolvedValue(mockReportData);
      exportService.generateFilename.mockReturnValue(VALID_FILENAME);
      exportService.exportToExcel.mockResolvedValue(mockFilePath);
      exportService.getDownloadUrl.mockReturnValue(mockDownloadUrl);

      mockReq.user = null;
      mockReq.query = {
        report_type: 'dashboard',
        format: 'excel',
        board_id: VALID_BOARD_ID,
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(exportService.generateFilename).toHaveBeenCalledWith('dashboard', 'excel', null);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('✅ should parse wipLimit and limit as integers', async () => {
      exportService.validateExportParams.mockReturnValue(undefined);
      exportService.generateReportData.mockResolvedValue(mockReportData);
      exportService.generateFilename.mockReturnValue(VALID_FILENAME);
      exportService.exportToExcel.mockResolvedValue(mockFilePath);
      exportService.getDownloadUrl.mockReturnValue(mockDownloadUrl);

      mockReq.query = {
        report_type: 'velocity',
        format: 'excel',
        board_id: VALID_BOARD_ID,
        wipLimit: '10',
        limit: '20',
      };

      await exportController.exportReport(mockReq, mockRes);

      expect(exportService.generateReportData).toHaveBeenCalledWith('velocity', {
        board_id: VALID_BOARD_ID,
        center_id: undefined,
        start_date: undefined,
        end_date: undefined,
        granularity: undefined,
        wipLimit: 10,
        limit: 20,
      });
    });
  });

  describe('listExports', () => {
    const mockFiles = [
      {
        filename: 'dashboard_1234567890.xlsx',
        format: 'excel',
        reportType: 'dashboard',
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      },
      {
        filename: 'velocity_1234567891.pdf',
        format: 'pdf',
        reportType: 'velocity',
        expiresAt: new Date(Date.now() + 20000).toISOString(),
      },
    ];

    it('✅ should return list of exports successfully', async () => {
      exportService.listFiles.mockResolvedValue(mockFiles);

      await exportController.listExports(mockReq, mockRes);

      expect(exportService.listFiles).toHaveBeenCalledWith(VALID_USER_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockFiles,
      });
    });

    it('✅ should return empty array when no files exist', async () => {
      exportService.listFiles.mockResolvedValue([]);

      await exportController.listExports(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('✅ should handle when user is not provided', async () => {
      exportService.listFiles.mockResolvedValue(mockFiles);

      mockReq.user = null;

      await exportController.listExports(mockReq, mockRes);

      expect(exportService.listFiles).toHaveBeenCalledWith(null);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('File system error');
      exportService.listFiles.mockRejectedValue(error);

      await exportController.listExports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File system error',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      exportService.listFiles.mockRejectedValue(error);

      await exportController.listExports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy danh sách file export',
      });
    });
  });

  describe('deleteExport', () => {
    it('✅ should delete export file successfully', async () => {
      exportService.deleteFile.mockResolvedValue(undefined);

      mockReq.params = { filename: VALID_FILENAME };

      await exportController.deleteExport(mockReq, mockRes);

      expect(exportService.deleteFile).toHaveBeenCalledWith(VALID_FILENAME);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Đã xóa file export',
      });
    });

    it('❌ should return 400 when filename is missing', async () => {
      mockReq.params = {};

      await exportController.deleteExport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Tên file là bắt buộc',
      });
      expect(exportService.deleteFile).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when filename is empty string', async () => {
      mockReq.params = { filename: '' };

      await exportController.deleteExport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Tên file là bắt buộc',
      });
    });

    it('❌ should return 400 when file does not exist', async () => {
      const error = new Error('File không tồn tại hoặc đã bị xóa');
      exportService.deleteFile.mockRejectedValue(error);

      mockReq.params = { filename: VALID_FILENAME };

      await exportController.deleteExport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File không tồn tại hoặc đã bị xóa',
      });
    });

    it('❌ should return 400 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      exportService.deleteFile.mockRejectedValue(error);

      mockReq.params = { filename: VALID_FILENAME };

      await exportController.deleteExport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi xóa file',
      });
    });
  });

  describe('downloadFile', () => {
    const mockStats = {
      mtimeMs: Date.now() - 1000, // 1 second ago
    };

    it('✅ should download excel file successfully', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue(mockStats);

      mockReq.params = { filename: VALID_FILENAME };

      await exportController.downloadFile(mockReq, mockRes);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.statSync).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="${VALID_FILENAME}"`
      );
      expect(mockRes.sendFile).toHaveBeenCalled();
    });

    it('✅ should download pdf file successfully', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue(mockStats);

      mockReq.params = { filename: 'dashboard_1234567890.pdf' };

      await exportController.downloadFile(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.sendFile).toHaveBeenCalled();
    });

    it('✅ should use default content type for unknown extensions', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue(mockStats);

      mockReq.params = { filename: 'dashboard_1234567890.unknown' };

      await exportController.downloadFile(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
      expect(mockRes.sendFile).toHaveBeenCalled();
    });

    it('❌ should return 400 when filename is missing', async () => {
      mockReq.params = {};

      await exportController.downloadFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Tên file là bắt buộc',
      });
    });

    it('❌ should return 404 when file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      mockReq.params = { filename: VALID_FILENAME };

      await exportController.downloadFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File không tồn tại hoặc đã bị xóa',
      });
      expect(mockRes.sendFile).not.toHaveBeenCalled();
    });

    it('❌ should return 410 when file is expired and delete it', async () => {
      const oldStats = {
        mtimeMs: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue(oldStats);
      fs.unlinkSync.mockImplementation(() => {});

      mockReq.params = { filename: VALID_FILENAME };

      await exportController.downloadFile(mockReq, mockRes);

      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(410);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File đã hết hạn và đã bị xóa',
      });
      expect(mockRes.sendFile).not.toHaveBeenCalled();
    });

    it('✅ should handle file deletion error gracefully when file is expired', async () => {
      const oldStats = {
        mtimeMs: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue(oldStats);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      mockReq.params = { filename: VALID_FILENAME };

      await exportController.downloadFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(410);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File đã hết hạn và đã bị xóa',
      });
    });

    it('❌ should return 500 when sendFile throws error', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue(mockStats);
      mockRes.sendFile.mockImplementation(() => {
        throw new Error('File read error');
      });

      mockReq.params = { filename: VALID_FILENAME };

      await exportController.downloadFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File read error',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue(mockStats);
      const error = new Error();
      error.message = '';
      mockRes.sendFile.mockImplementation(() => {
        throw error;
      });

      mockReq.params = { filename: VALID_FILENAME };

      await exportController.downloadFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi tải file',
      });
    });
  });
});

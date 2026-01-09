// 📄 tests/unit/scheduledReport.service.test.js - Scheduled Report Service Unit Tests
const mongoose = require('mongoose');

// Mock dependencies BEFORE requiring the service
jest.mock('bcrypt', () => ({
  compareSync: jest.fn(),
  hashSync: jest.fn(),
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('fs');
jest.mock('../../repositories/scheduledReport.repository');
jest.mock('../../services/export.service');
jest.mock('../../config/mailer', () => ({
  sendMail: jest.fn(),
}));

// Now require the service after mocks are set up
const ScheduledReportService = require('../../services/scheduledReport.service');
const scheduledReportRepo = require('../../repositories/scheduledReport.repository');
const exportService = require('../../services/export.service');
const { sendMail } = require('../../config/mailer');
const fs = require('fs');

describe('🔹 Scheduled Report Service Unit Tests', () => {
  let mockUserId;
  let mockBoardId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();
    mockBoardId = new mongoose.Types.ObjectId();

    // Mock fs.readFileSync to return a dummy buffer
    fs.readFileSync.mockReturnValue(Buffer.from('dummy pdf content'));
  });

  describe('calculateNextSendTime', () => {
    it('✅ should calculate next send time for daily frequency (after 7 AM)', () => {
      const currentTime = new Date('2024-01-15T10:00:00'); // 10 AM
      const result = ScheduledReportService.calculateNextSendTime('daily', currentTime);

      expect(result).toBeInstanceOf(Date);
      // Should be next day at 7 AM
      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(7);
      expect(resultDate.getMinutes()).toBe(0);
    });

    it('✅ should calculate next send time for daily frequency (before 7 AM)', () => {
      const currentTime = new Date('2024-01-15T06:00:00'); // 6 AM
      const result = ScheduledReportService.calculateNextSendTime('daily', currentTime);

      expect(result).toBeInstanceOf(Date);
      // Should be today at 7 AM
      const resultDate = new Date(result);
      expect(resultDate.getDate()).toBe(15);
      expect(resultDate.getHours()).toBe(7);
      expect(resultDate.getMinutes()).toBe(0);
    });

    it('✅ should calculate next send time for weekly frequency', () => {
      const currentTime = new Date('2024-01-15T10:00:00'); // Monday 10 AM
      const result = ScheduledReportService.calculateNextSendTime('weekly', currentTime);

      expect(result).toBeInstanceOf(Date);
      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(7);
      expect(resultDate.getMinutes()).toBe(0);
    });

    it('✅ should calculate next send time for weekly frequency (Monday before 7 AM)', () => {
      // Set to Monday 6 AM
      const currentTime = new Date('2024-01-15T06:00:00');
      // Mock Monday (day 1)
      const result = ScheduledReportService.calculateNextSendTime('weekly', currentTime);

      expect(result).toBeInstanceOf(Date);
      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(7);
    });

    it('✅ should calculate next send time for monthly frequency', () => {
      const currentTime = new Date('2024-01-15T10:00:00'); // 15th of month
      const result = ScheduledReportService.calculateNextSendTime('monthly', currentTime);

      expect(result).toBeInstanceOf(Date);
      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(7);
      expect(resultDate.getMinutes()).toBe(0);
    });

    it('✅ should calculate next send time for monthly frequency (1st before 7 AM)', () => {
      const currentTime = new Date('2024-01-01T06:00:00'); // 1st at 6 AM
      const result = ScheduledReportService.calculateNextSendTime('monthly', currentTime);

      expect(result).toBeInstanceOf(Date);
      const resultDate = new Date(result);
      expect(resultDate.getDate()).toBe(1);
      expect(resultDate.getHours()).toBe(7);
    });

    it('✅ should use current time when currentTime not provided', () => {
      const result = ScheduledReportService.calculateNextSendTime('daily');

      expect(result).toBeInstanceOf(Date);
    });

    it('❌ should throw error for invalid frequency', () => {
      expect(() => {
        ScheduledReportService.calculateNextSendTime('invalid');
      }).toThrow('Tần suất không hợp lệ: invalid');
    });
  });

  describe('createScheduledReport', () => {
    it('✅ should create scheduled report successfully', async () => {
      const mockData = {
        user_id: mockUserId,
        board_id: mockBoardId,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
        report_params: {},
      };
      const mockCreatedReport = {
        _id: new mongoose.Types.ObjectId(),
        ...mockData,
        next_send_at: new Date(),
        is_active: true,
      };

      scheduledReportRepo.create.mockResolvedValue(mockCreatedReport);

      const result = await ScheduledReportService.createScheduledReport(mockData);

      expect(scheduledReportRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedReport);
    });

    it('✅ should calculate next_send_at when creating', async () => {
      const mockData = {
        user_id: mockUserId,
        board_id: mockBoardId,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
      };

      scheduledReportRepo.create.mockResolvedValue({});

      await ScheduledReportService.createScheduledReport(mockData);

      const createCall = scheduledReportRepo.create.mock.calls[0][0];
      expect(createCall).toHaveProperty('next_send_at');
      expect(createCall.next_send_at).toBeInstanceOf(Date);
      expect(createCall.is_active).toBe(true);
    });

    it('❌ should throw error when recipients is empty', async () => {
      const mockData = {
        user_id: mockUserId,
        board_id: mockBoardId,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: [],
      };

      await expect(ScheduledReportService.createScheduledReport(mockData)).rejects.toThrow(
        'Phải có ít nhất một địa chỉ email người nhận'
      );
    });

    it('❌ should throw error when recipients is not an array', async () => {
      const mockData = {
        user_id: mockUserId,
        board_id: mockBoardId,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: 'not-an-array',
      };

      await expect(ScheduledReportService.createScheduledReport(mockData)).rejects.toThrow(
        'Phải có ít nhất một địa chỉ email người nhận'
      );
    });

    it('❌ should throw error for invalid email format', async () => {
      const mockData = {
        user_id: mockUserId,
        board_id: mockBoardId,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['invalid-email'],
      };

      await expect(ScheduledReportService.createScheduledReport(mockData)).rejects.toThrow(
        'Địa chỉ email không hợp lệ: invalid-email'
      );
    });

    it('✅ should accept multiple valid emails', async () => {
      const mockData = {
        user_id: mockUserId,
        board_id: mockBoardId,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test1@example.com', 'test2@example.com', 'test3@example.com'],
      };

      scheduledReportRepo.create.mockResolvedValue({});

      await ScheduledReportService.createScheduledReport(mockData);

      expect(scheduledReportRepo.create).toHaveBeenCalled();
    });

    it('✅ should use default report_params when not provided', async () => {
      const mockData = {
        user_id: mockUserId,
        board_id: mockBoardId,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
      };

      scheduledReportRepo.create.mockResolvedValue({});

      await ScheduledReportService.createScheduledReport(mockData);

      const createCall = scheduledReportRepo.create.mock.calls[0][0];
      expect(createCall.report_params).toEqual({});
    });
  });

  describe('updateScheduledReport', () => {
    it('✅ should update scheduled report successfully', async () => {
      const reportId = new mongoose.Types.ObjectId();
      const updateData = {
        frequency: 'weekly',
        recipients: ['new@example.com'],
        is_active: false,
      };
      const mockUpdatedReport = {
        _id: reportId,
        ...updateData,
      };

      scheduledReportRepo.update.mockResolvedValue(mockUpdatedReport);

      const result = await ScheduledReportService.updateScheduledReport(
        reportId.toString(),
        updateData
      );

      expect(scheduledReportRepo.update).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedReport);
    });

    it('✅ should recalculate next_send_at when frequency changes', async () => {
      const reportId = new mongoose.Types.ObjectId();
      const updateData = {
        frequency: 'monthly',
      };

      scheduledReportRepo.update.mockResolvedValue({});

      await ScheduledReportService.updateScheduledReport(reportId.toString(), updateData);

      const updateCall = scheduledReportRepo.update.mock.calls[0][1];
      expect(updateCall).toHaveProperty('next_send_at');
      expect(updateCall.next_send_at).toBeInstanceOf(Date);
    });

    it('✅ should validate recipients when updating', async () => {
      const reportId = new mongoose.Types.ObjectId();
      const updateData = {
        recipients: ['invalid-email'],
      };

      await expect(
        ScheduledReportService.updateScheduledReport(reportId.toString(), updateData)
      ).rejects.toThrow('Địa chỉ email không hợp lệ: invalid-email');
    });

    it('✅ should update only provided fields', async () => {
      const reportId = new mongoose.Types.ObjectId();
      const updateData = {
        is_active: false,
      };

      scheduledReportRepo.update.mockResolvedValue({});

      await ScheduledReportService.updateScheduledReport(reportId.toString(), updateData);

      const updateCall = scheduledReportRepo.update.mock.calls[0][1];
      expect(updateCall).toHaveProperty('is_active');
      expect(updateCall.is_active).toBe(false);
      expect(updateCall).not.toHaveProperty('frequency');
      expect(updateCall).not.toHaveProperty('recipients');
    });

    it('✅ should handle report_params update', async () => {
      const reportId = new mongoose.Types.ObjectId();
      const updateData = {
        report_params: { start_date: '2024-01-01', end_date: '2024-01-31' },
      };

      scheduledReportRepo.update.mockResolvedValue({});

      await ScheduledReportService.updateScheduledReport(reportId.toString(), updateData);

      const updateCall = scheduledReportRepo.update.mock.calls[0][1];
      expect(updateCall.report_params).toEqual(updateData.report_params);
    });
  });

  describe('getScheduledReportsByUserId', () => {
    it('✅ should get scheduled reports by user id successfully', async () => {
      const mockReports = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          report_type: 'dashboard',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          report_type: 'velocity',
        },
      ];

      scheduledReportRepo.findByUserId.mockResolvedValue(mockReports);

      const result = await ScheduledReportService.getScheduledReportsByUserId(
        mockUserId.toString()
      );

      expect(scheduledReportRepo.findByUserId).toHaveBeenCalledWith(mockUserId.toString());
      expect(result).toEqual(mockReports);
    });

    it('✅ should return empty array when no reports found', async () => {
      scheduledReportRepo.findByUserId.mockResolvedValue([]);

      const result = await ScheduledReportService.getScheduledReportsByUserId(
        mockUserId.toString()
      );

      expect(result).toEqual([]);
    });
  });

  describe('getScheduledReportById', () => {
    it('✅ should get scheduled report by id successfully', async () => {
      const reportId = new mongoose.Types.ObjectId();
      const mockReport = {
        _id: reportId,
        user_id: mockUserId,
        report_type: 'dashboard',
      };

      scheduledReportRepo.findById.mockResolvedValue(mockReport);

      const result = await ScheduledReportService.getScheduledReportById(reportId.toString());

      expect(scheduledReportRepo.findById).toHaveBeenCalledWith(reportId.toString());
      expect(result).toEqual(mockReport);
    });

    it('✅ should return null when report not found', async () => {
      scheduledReportRepo.findById.mockResolvedValue(null);

      const result = await ScheduledReportService.getScheduledReportById(
        new mongoose.Types.ObjectId().toString()
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteScheduledReport', () => {
    it('✅ should delete scheduled report successfully', async () => {
      const reportId = new mongoose.Types.ObjectId();
      const mockDeletedReport = {
        _id: reportId,
      };

      scheduledReportRepo.delete.mockResolvedValue(mockDeletedReport);

      const result = await ScheduledReportService.deleteScheduledReport(reportId.toString());

      expect(scheduledReportRepo.delete).toHaveBeenCalledWith(reportId.toString());
      expect(result).toEqual(mockDeletedReport);
    });
  });

  describe('_generateHTMLSummary', () => {
    it('✅ should generate HTML summary for dashboard report', () => {
      const reportData = {
        stats: {
          totalTasks: 100,
          completedTasks: 80,
          inProgressTasks: 15,
          overdueTasks: 5,
          completionRate: 80,
        },
      };
      const boardTitle = 'Test Board';
      const reportType = 'dashboard';

      const result = ScheduledReportService._generateHTMLSummary(
        reportData,
        boardTitle,
        reportType
      );

      expect(result).toContain('Báo cáo Dashboard');
      expect(result).toContain('Test Board');
      expect(result).toContain('100');
      expect(result).toContain('80');
      expect(result).toContain('15');
      expect(result).toContain('5');
    });

    it('✅ should generate HTML summary for velocity report', () => {
      const reportData = {
        throughput: { 'Column 1': 10, 'Column 2': 20 },
        cfd: [{ date: '2024-01-01', value: 5 }],
      };
      const boardTitle = 'Test Board';
      const reportType = 'velocity';

      const result = ScheduledReportService._generateHTMLSummary(
        reportData,
        boardTitle,
        reportType
      );

      expect(result).toContain('Báo cáo Vận tốc');
      expect(result).toContain('2'); // Number of columns
      expect(result).toContain('1'); // Number of CFD points
    });

    it('✅ should generate HTML summary for leaderboard report', () => {
      const reportData = {
        summary: {
          totalUsers: 50,
          averagePoints: 100,
          averageTasksCompleted: 10,
        },
      };
      const boardTitle = 'Test Board';
      const reportType = 'leaderboard';

      const result = ScheduledReportService._generateHTMLSummary(
        reportData,
        boardTitle,
        reportType
      );

      expect(result).toContain('Báo cáo Bảng xếp hạng');
      expect(result).toContain('50');
      expect(result).toContain('100');
      expect(result).toContain('10');
    });

    it('✅ should generate HTML summary for center_comparison report', () => {
      const reportData = {
        summary: {
          totalCenters: 5,
        },
        rankings: {
          bestCenter: { name: 'Center A' },
        },
      };
      const boardTitle = 'Test Board';
      const reportType = 'center_comparison';

      const result = ScheduledReportService._generateHTMLSummary(
        reportData,
        boardTitle,
        reportType
      );

      expect(result).toContain('Báo cáo So sánh Trung tâm');
      expect(result).toContain('5');
      expect(result).toContain('Center A');
    });

    it('✅ should handle missing data gracefully', () => {
      const reportData = {};
      const boardTitle = 'Test Board';
      const reportType = 'dashboard';

      const result = ScheduledReportService._generateHTMLSummary(
        reportData,
        boardTitle,
        reportType
      );

      expect(result).toContain('Báo cáo Dashboard');
      expect(result).toContain('0'); // Default values
    });

    it('✅ should handle unknown report type', () => {
      const reportData = {};
      const boardTitle = 'Test Board';
      const reportType = 'unknown';

      const result = ScheduledReportService._generateHTMLSummary(
        reportData,
        boardTitle,
        reportType
      );

      expect(result).toContain('Báo cáo');
      expect(result).toContain('Test Board');
    });
  });

  describe('processScheduledReports', () => {
    it('✅ should return zero counts when no due reports', async () => {
      scheduledReportRepo.findDueReports.mockResolvedValue([]);

      const result = await ScheduledReportService.processScheduledReports();

      expect(result).toEqual({ processed: 0, success: 0, failed: 0 });
    });

    it('✅ should process and send due reports successfully', async () => {
      const mockDueReports = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          board_id: mockBoardId,
          report_type: 'dashboard',
          frequency: 'daily',
          recipients: ['test@example.com'],
          retry_count: 0,
        },
      ];

      scheduledReportRepo.findDueReports.mockResolvedValue(mockDueReports);
      exportService.generateReportData.mockResolvedValue({});
      exportService.generateFilename.mockReturnValue('report.pdf');
      exportService.exportToPDF.mockResolvedValue('/path/to/report.pdf');
      sendMail.mockResolvedValue();
      scheduledReportRepo.update.mockResolvedValue({});

      const result = await ScheduledReportService.processScheduledReports();

      expect(result.processed).toBe(1);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('✅ should handle failed reports and increment retry count', async () => {
      const mockDueReports = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          board_id: mockBoardId,
          report_type: 'dashboard',
          frequency: 'daily',
          recipients: ['test@example.com'],
          retry_count: 0,
        },
      ];

      scheduledReportRepo.findDueReports.mockResolvedValue(mockDueReports);
      exportService.generateReportData.mockRejectedValue(new Error('Export failed'));

      scheduledReportRepo.incrementRetryCount.mockResolvedValue({});
      scheduledReportRepo.updateLastError.mockResolvedValue({});

      const result = await ScheduledReportService.processScheduledReports();

      expect(result.processed).toBe(1);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(scheduledReportRepo.incrementRetryCount).toHaveBeenCalled();
      expect(scheduledReportRepo.updateLastError).toHaveBeenCalled();
    });

    it('✅ should deactivate report when retry count exceeds 3', async () => {
      const mockDueReports = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          board_id: mockBoardId,
          report_type: 'dashboard',
          frequency: 'daily',
          recipients: ['test@example.com'],
          retry_count: 3,
        },
      ];

      scheduledReportRepo.findDueReports.mockResolvedValue(mockDueReports);
      exportService.generateReportData.mockRejectedValue(new Error('Export failed'));

      scheduledReportRepo.incrementRetryCount.mockResolvedValue({});
      scheduledReportRepo.updateLastError.mockResolvedValue({});
      scheduledReportRepo.deactivate.mockResolvedValue({});

      await ScheduledReportService.processScheduledReports();

      expect(scheduledReportRepo.deactivate).toHaveBeenCalled();
    });

    it('✅ should process multiple reports', async () => {
      const mockDueReports = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          board_id: mockBoardId,
          report_type: 'dashboard',
          frequency: 'daily',
          recipients: ['test1@example.com'],
          retry_count: 0,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          board_id: mockBoardId,
          report_type: 'velocity',
          frequency: 'weekly',
          recipients: ['test2@example.com'],
          retry_count: 0,
        },
      ];

      scheduledReportRepo.findDueReports.mockResolvedValue(mockDueReports);
      exportService.generateReportData.mockResolvedValue({});
      exportService.generateFilename.mockReturnValue('report.pdf');
      exportService.exportToPDF.mockResolvedValue('/path/to/report.pdf');
      sendMail.mockResolvedValue();
      scheduledReportRepo.update.mockResolvedValue({});

      const result = await ScheduledReportService.processScheduledReports();

      expect(result.processed).toBe(2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('sendScheduledReport', () => {
    it('✅ should send scheduled report successfully', async () => {
      const mockScheduledReport = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        board_id: mockBoardId,
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
        report_params: {},
      };
      const mockReportData = {
        stats: {
          totalTasks: 100,
          completedTasks: 80,
        },
      };
      const mockBoard = {
        _id: mockBoardId,
        title: 'Test Board',
      };

      exportService.generateReportData.mockResolvedValue(mockReportData);
      exportService.generateFilename.mockReturnValue('dashboard_report.pdf');
      exportService.exportToPDF.mockResolvedValue('/path/to/dashboard_report.pdf');
      sendMail.mockResolvedValue();
      scheduledReportRepo.update.mockResolvedValue({});

      const result = await ScheduledReportService.sendScheduledReport({
        ...mockScheduledReport,
        board_id: mockBoard,
      });

      expect(exportService.generateReportData).toHaveBeenCalled();
      expect(exportService.exportToPDF).toHaveBeenCalled();
      expect(sendMail).toHaveBeenCalled();
      expect(scheduledReportRepo.update).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('✅ should handle board_id as ObjectId string', async () => {
      const mockScheduledReport = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        board_id: mockBoardId.toString(),
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
        report_params: {},
      };

      exportService.generateReportData.mockResolvedValue({});
      exportService.generateFilename.mockReturnValue('report.pdf');
      exportService.exportToPDF.mockResolvedValue('/path/to/report.pdf');
      sendMail.mockResolvedValue();
      scheduledReportRepo.update.mockResolvedValue({});

      await ScheduledReportService.sendScheduledReport(mockScheduledReport);

      expect(exportService.generateReportData).toHaveBeenCalledWith('dashboard', {
        board_id: mockBoardId.toString(),
      });
    });

    it('✅ should handle board_id as populated object', async () => {
      const mockScheduledReport = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        board_id: {
          _id: mockBoardId,
          title: 'Test Board',
        },
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
        report_params: {},
      };

      exportService.generateReportData.mockResolvedValue({});
      exportService.generateFilename.mockReturnValue('report.pdf');
      exportService.exportToPDF.mockResolvedValue('/path/to/report.pdf');
      sendMail.mockResolvedValue();
      scheduledReportRepo.update.mockResolvedValue({});

      await ScheduledReportService.sendScheduledReport(mockScheduledReport);

      expect(exportService.generateReportData).toHaveBeenCalledWith('dashboard', {
        board_id: mockBoardId.toString(),
      });
    });

    it('✅ should include report_params in generateReportData call', async () => {
      const mockScheduledReport = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        board_id: mockBoardId.toString(),
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
        report_params: {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      };

      exportService.generateReportData.mockResolvedValue({});
      exportService.generateFilename.mockReturnValue('report.pdf');
      exportService.exportToPDF.mockResolvedValue('/path/to/report.pdf');
      sendMail.mockResolvedValue();
      scheduledReportRepo.update.mockResolvedValue({});

      await ScheduledReportService.sendScheduledReport(mockScheduledReport);

      expect(exportService.generateReportData).toHaveBeenCalledWith('dashboard', {
        board_id: mockBoardId.toString(),
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });
    });

    it('✅ should reset retry_count and last_error on success', async () => {
      const mockScheduledReport = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        board_id: mockBoardId.toString(),
        report_type: 'dashboard',
        frequency: 'daily',
        recipients: ['test@example.com'],
        report_params: {},
      };

      exportService.generateReportData.mockResolvedValue({});
      exportService.generateFilename.mockReturnValue('report.pdf');
      exportService.exportToPDF.mockResolvedValue('/path/to/report.pdf');
      sendMail.mockResolvedValue();
      scheduledReportRepo.update.mockResolvedValue({});

      await ScheduledReportService.sendScheduledReport(mockScheduledReport);

      const updateCall = scheduledReportRepo.update.mock.calls[0][1];
      expect(updateCall.retry_count).toBe(0);
      expect(updateCall.last_error).toBeNull();
      expect(updateCall).toHaveProperty('last_sent_at');
      expect(updateCall).toHaveProperty('next_send_at');
    });

    it('✅ should calculate next_send_at after sending', async () => {
      const mockScheduledReport = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        board_id: mockBoardId.toString(),
        report_type: 'dashboard',
        frequency: 'weekly',
        recipients: ['test@example.com'],
        report_params: {},
      };

      exportService.generateReportData.mockResolvedValue({});
      exportService.generateFilename.mockReturnValue('report.pdf');
      exportService.exportToPDF.mockResolvedValue('/path/to/report.pdf');
      sendMail.mockResolvedValue();
      scheduledReportRepo.update.mockResolvedValue({});

      await ScheduledReportService.sendScheduledReport(mockScheduledReport);

      const updateCall = scheduledReportRepo.update.mock.calls[0][1];
      expect(updateCall.next_send_at).toBeInstanceOf(Date);
    });
  });
});

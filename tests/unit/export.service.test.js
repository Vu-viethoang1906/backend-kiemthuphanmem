// 📄 tests/unit/export.service.test.js - Export Service Unit Tests
const mongoose = require('mongoose');

// Mock dependencies BEFORE requiring the service
// Order matters: mock bcrypt first to prevent native build issues
jest.mock('bcrypt', () => ({
  compareSync: jest.fn(),
  hashSync: jest.fn(),
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock TaskService to prevent require chain issues
jest.mock('../../services/task.service', () => ({
  getTasksByBoard: jest.fn(),
}));

jest.mock('xlsx');
jest.mock('pdfkit');
jest.mock('fs');
jest.mock('path');
jest.mock('../../services/analytics.service');
jest.mock('../../models/board.model');

// Now require the service after all mocks are set up
const ExportService = require('../../services/export.service');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const analyticsService = require('../../services/analytics.service');
const Board = require('../../models/board.model');

describe('🔹 Export Service Unit Tests', () => {
  const mockExportsDir = '/path/to/exports';
  let mockPDFDoc;
  let mockWriteStream;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Mock path.join
    path.join.mockImplementation((...args) => args.join('/'));

    // Mock path.extname
    path.extname.mockImplementation(file => {
      const match = file.match(/\.([^.]+)$/);
      return match ? `.${match[1]}` : '';
    });

    // Mock fs.existsSync
    fs.existsSync = jest.fn().mockReturnValue(true);

    // Mock fs.mkdirSync
    fs.mkdirSync = jest.fn();

    // Mock fs.readdirSync
    fs.readdirSync = jest.fn().mockReturnValue([]);

    // Mock fs.statSync
    fs.statSync = jest.fn().mockReturnValue({
      mtimeMs: Date.now() - 1000, // 1 second ago
    });

    // Mock fs.unlinkSync
    fs.unlinkSync = jest.fn();

    // Mock fs.createWriteStream
    mockWriteStream = {
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
    fs.createWriteStream = jest.fn().mockReturnValue(mockWriteStream);

    // Mock PDFDocument
    mockPDFDoc = {
      pipe: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      end: jest.fn().mockImplementation(function () {
        // Simulate end event after end() is called
        setTimeout(() => {
          const endCallback = this.on.mock.calls.find(call => call[0] === 'end')?.[1];
          if (endCallback) {
            endCallback();
          }
        }, 0);
        return this;
      }),
      on: jest.fn().mockReturnThis(),
    };
    PDFDocument.mockImplementation(() => mockPDFDoc);

    // Mock XLSX
    XLSX.utils = {
      book_new: jest.fn().mockReturnValue({}),
      book_append_sheet: jest.fn(),
      aoa_to_sheet: jest.fn().mockReturnValue({}),
    };
    XLSX.writeFile = jest.fn();
  });

  describe('_ensureExportsDirectory', () => {
    it('✅ should create exports directory if it does not exist', () => {
      // Clear previous calls from constructor and other tests
      fs.existsSync.mockClear();
      fs.mkdirSync.mockClear();

      // Set up mock to return false (directory doesn't exist)
      fs.existsSync.mockReturnValue(false);

      // Call the method - it uses this.exportsDir which was set in constructor
      ExportService._ensureExportsDirectory();

      // Verify existsSync was called
      expect(fs.existsSync).toHaveBeenCalled();

      // Verify mkdirSync was called (should be called because existsSync returned false)
      expect(fs.mkdirSync).toHaveBeenCalled();

      // Get the last call to mkdirSync (in case it was called multiple times)
      const mkdirCalls = fs.mkdirSync.mock.calls;
      expect(mkdirCalls.length).toBeGreaterThan(0);

      // Check the last call has correct arguments
      const lastCall = mkdirCalls[mkdirCalls.length - 1];
      expect(lastCall).toBeDefined();
      expect(lastCall.length).toBeGreaterThanOrEqual(1);
      expect(lastCall[1]).toEqual({ recursive: true });
    });

    it('✅ should not create directory if it already exists', () => {
      // Clear previous calls
      fs.existsSync.mockClear();
      fs.mkdirSync.mockClear();

      fs.existsSync.mockReturnValue(true);
      ExportService._ensureExportsDirectory();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('validateExportParams', () => {
    it('✅ should not throw error for valid report type and format', () => {
      expect(() => {
        ExportService.validateExportParams('dashboard', 'excel');
      }).not.toThrow();
      expect(() => {
        ExportService.validateExportParams('velocity', 'pdf');
      }).not.toThrow();
      expect(() => {
        ExportService.validateExportParams('leaderboard', 'excel');
      }).not.toThrow();
      expect(() => {
        ExportService.validateExportParams('center_comparison', 'pdf');
      }).not.toThrow();
    });

    it('✅ should throw error for invalid report type', () => {
      expect(() => {
        ExportService.validateExportParams('invalid_type', 'excel');
      }).toThrow('Loại báo cáo không hợp lệ');
    });

    it('✅ should throw error for invalid format', () => {
      expect(() => {
        ExportService.validateExportParams('dashboard', 'invalid_format');
      }).toThrow('Định dạng không hợp lệ');
    });

    it('✅ should throw error for both invalid params', () => {
      expect(() => {
        ExportService.validateExportParams('invalid_type', 'invalid_format');
      }).toThrow('Loại báo cáo không hợp lệ');
    });
  });

  describe('generateReportData', () => {
    it('✅ should generate dashboard report data', async () => {
      const mockDashboardStats = {
        board: { _id: 'board1', title: 'Test Board' },
        stats: {
          totalTasks: 10,
          completedTasks: 5,
          inProgressTasks: 3,
          overdueTasks: 2,
          completionRate: 50,
        },
      };
      const mockLineChartData = {
        data: [{ date: '2024-01-01', total: 10, completed: 5, inProgress: 3, overdue: 2 }],
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
      };

      analyticsService.getDashboardStats.mockResolvedValue(mockDashboardStats);
      analyticsService.getLineChartData.mockResolvedValue(mockLineChartData);

      const result = await ExportService.generateReportData('dashboard', {
        board_id: 'board1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(result).toEqual({
        reportType: 'dashboard',
        board: mockDashboardStats.board,
        stats: mockDashboardStats.stats,
        chartData: mockLineChartData.data,
        dateRange: mockLineChartData.dateRange,
      });
      expect(analyticsService.getDashboardStats).toHaveBeenCalledWith('board1');
      expect(analyticsService.getLineChartData).toHaveBeenCalled();
    });

    it('✅ should generate velocity report data', async () => {
      const mockBoard = {
        _id: 'board1',
        title: 'Test Board',
      };
      const mockVelocityData = {
        columnFlow: {
          'To Do': { entered: 10, exited: 8 },
          'In Progress': { entered: 8, exited: 5 },
        },
        columnAvgTimes: {
          'To Do': 2.5,
          'In Progress': 5.0,
        },
        cfd: [{ date: '2024-01-01', 'To Do': 10, 'In Progress': 5 }],
        wipViolations: {},
      };

      Board.findById.mockResolvedValue(mockBoard);
      analyticsService.getThroughputAndCFD.mockResolvedValue(mockVelocityData);

      const result = await ExportService.generateReportData('velocity', {
        board_id: 'board1',
        wipLimit: 5,
      });

      expect(result).toEqual({
        reportType: 'velocity',
        board: { id: 'board1', title: 'Test Board' },
        throughput: {
          'To Do': { entered: 10, exited: 8, avgTime: 2.5 },
          'In Progress': { entered: 8, exited: 5, avgTime: 5.0 },
        },
        cfd: mockVelocityData.cfd,
        wipViolations: {},
      });
    });

    it('✅ should generate leaderboard report data', async () => {
      const mockLeaderboardData = {
        leaderboard: [
          {
            rank: 1,
            username: 'user1',
            fullName: 'User One',
            centerName: 'Center 1',
            points: 100,
            totalPoints: 500,
            level: 5,
            statistics: {
              tasksCompleted: 10,
              onTimeCompleted: 8,
              overdueCompleted: 2,
              onTimeRate: 80,
            },
          },
        ],
        summary: {
          totalUsers: 10,
          averagePoints: 50,
          averageTasksCompleted: 5,
        },
        cheatDetection: {},
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
      };

      analyticsService.getLeaderboard.mockResolvedValue(mockLeaderboardData);

      const result = await ExportService.generateReportData('leaderboard', {
        center_id: 'center1',
        limit: 10,
      });

      expect(result).toEqual({
        reportType: 'leaderboard',
        leaderboard: mockLeaderboardData.leaderboard,
        summary: mockLeaderboardData.summary,
        cheatDetection: mockLeaderboardData.cheatDetection,
        dateRange: mockLeaderboardData.dateRange,
      });
    });

    it('✅ should generate center comparison report data', async () => {
      const mockComparisonData = {
        summary: { totalCenters: 3 },
        centers: [
          {
            center_name: 'Center 1',
            totalUsers: 10,
            activeUsers: 8,
            totalTasks: 50,
            completedTasks: 40,
            inProgressTasks: 5,
            completionRate: 80,
            averagePointsPerUser: 50,
            averageActiveDaysPerUser: 20,
          },
        ],
        rankings: {
          bestCenter: { name: 'Center 1' },
          worstCenter: { name: 'Center 3' },
        },
      };

      analyticsService.compareCentersPerformance.mockResolvedValue(mockComparisonData);

      const result = await ExportService.generateReportData('center_comparison', {
        board_id: 'board1',
      });

      expect(result).toEqual({
        reportType: 'center_comparison',
        summary: mockComparisonData.summary,
        centers: mockComparisonData.centers,
        rankings: mockComparisonData.rankings,
      });
    });

    it('✅ should throw error for unsupported report type', async () => {
      await expect(ExportService.generateReportData('invalid_type', {})).rejects.toThrow(
        'Loại báo cáo không được hỗ trợ'
      );
    });
  });

  describe('exportToExcel', () => {
    const mockReportData = {
      reportType: 'dashboard',
      board: { title: 'Test Board' },
      stats: {
        totalTasks: 10,
        completedTasks: 5,
        inProgressTasks: 3,
        overdueTasks: 2,
        completionRate: 50,
      },
      chartData: [{ date: '2024-01-01', total: 10, completed: 5, inProgress: 3, overdue: 2 }],
    };

    it('✅ should export report to Excel successfully', async () => {
      const filename = 'dashboard_1234567890.xlsx';
      const filePath = await ExportService.exportToExcel(mockReportData, filename);

      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(3); // Summary, Details, Charts
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining(filename)
      );
      expect(filePath).toContain(filename);
    });

    it('✅ should create summary sheet with correct data', async () => {
      await ExportService.exportToExcel(mockReportData, 'test.xlsx');

      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
      const summaryCall = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
      expect(summaryCall[0][0]).toBe('BÁO CÁO TỔNG QUAN');
      expect(summaryCall[2][0]).toBe('Bảng:');
      expect(summaryCall[2][1]).toBe('Test Board');
    });

    it('✅ should not add charts sheet if no chart data', async () => {
      const dataWithoutCharts = {
        reportType: 'leaderboard',
        summary: { totalUsers: 10 },
        leaderboard: [],
      };

      await ExportService.exportToExcel(dataWithoutCharts, 'test.xlsx');

      // Should only have Summary and Details sheets
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2);
    });
  });

  describe('exportToPDF', () => {
    const mockReportData = {
      reportType: 'dashboard',
      board: { title: 'Test Board' },
      stats: {
        totalTasks: 10,
        completedTasks: 5,
        inProgressTasks: 3,
        overdueTasks: 2,
        completionRate: 50,
      },
      chartData: [{ date: '2024-01-01', total: 10, completed: 5, inProgress: 3, overdue: 2 }],
    };

    it('✅ should export report to PDF successfully', async () => {
      const filename = 'dashboard_1234567890.pdf';
      const filePath = await ExportService.exportToPDF(mockReportData, filename);

      expect(PDFDocument).toHaveBeenCalledWith({ margin: 50 });
      expect(mockPDFDoc.pipe).toHaveBeenCalledWith(mockWriteStream);
      expect(mockPDFDoc.fontSize).toHaveBeenCalled();
      expect(mockPDFDoc.text).toHaveBeenCalled();
      expect(mockPDFDoc.end).toHaveBeenCalled();
      expect(filePath).toContain(filename);
    });

    it('✅ should add correct PDF content for dashboard', async () => {
      await ExportService.exportToPDF(mockReportData, 'test.pdf');

      expect(mockPDFDoc.text).toHaveBeenCalledWith('BÁO CÁO THỐNG KÊ', { align: 'center' });
      expect(mockPDFDoc.text).toHaveBeenCalledWith('Báo cáo Dashboard', { align: 'center' });
    });

    it('✅ should handle PDF document events correctly', async () => {
      const promise = ExportService.exportToPDF(mockReportData, 'test.pdf');

      await promise;
      expect(mockPDFDoc.end).toHaveBeenCalled();
      expect(mockPDFDoc.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockPDFDoc.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('generateFilename', () => {
    it('✅ should generate filename with report type and timestamp', () => {
      const filename = ExportService.generateFilename('dashboard', 'excel');
      expect(filename).toMatch(/^dashboard_\d+\.xlsx$/);
    });

    it('✅ should generate PDF filename', () => {
      const filename = ExportService.generateFilename('velocity', 'pdf');
      expect(filename).toMatch(/^velocity_\d+\.pdf$/);
    });

    it('✅ should include user prefix when userId provided', () => {
      const userId = new mongoose.Types.ObjectId();
      const filename = ExportService.generateFilename('dashboard', 'excel', userId);
      expect(filename).toMatch(/^dashboard_\d+_user\w+\.xlsx$/);
    });

    it('✅ should sanitize userId in filename', () => {
      const filename = ExportService.generateFilename('dashboard', 'excel', 'user@123#test');
      expect(filename).toMatch(/^dashboard_\d+_useruser123test\.xlsx$/);
    });

    it('✅ should handle null userId', () => {
      const filename = ExportService.generateFilename('dashboard', 'excel', null);
      expect(filename).toMatch(/^dashboard_\d+\.xlsx$/);
    });
  });

  describe('getDownloadUrl', () => {
    it('✅ should return correct download URL', () => {
      const filename = 'dashboard_1234567890.xlsx';
      const url = ExportService.getDownloadUrl(filename);
      expect(url).toBe(`/api/exports/${filename}`);
    });
  });

  describe('cleanupOldFiles', () => {
    it('✅ should delete files older than 24 hours', async () => {
      const oldFile = 'old_file.xlsx';
      const newFile = 'new_file.xlsx';
      const now = Date.now();

      fs.readdirSync.mockReturnValue([oldFile, newFile]);
      fs.statSync
        .mockReturnValueOnce({
          mtimeMs: now - 25 * 60 * 60 * 1000, // 25 hours ago
        })
        .mockReturnValueOnce({
          mtimeMs: now - 1 * 60 * 60 * 1000, // 1 hour ago
        });

      const deletedCount = await ExportService.cleanupOldFiles();

      expect(fs.readdirSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining(oldFile));
      expect(deletedCount).toBe(1);
    });

    it('✅ should handle errors when deleting files gracefully', async () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      fs.readdirSync.mockReturnValue(['file1.xlsx']);
      fs.statSync.mockReturnValue({
        mtimeMs: Date.now() - 25 * 60 * 60 * 1000,
      });
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const deletedCount = await ExportService.cleanupOldFiles();

      expect(deletedCount).toBe(0);
      expect(console.error).toHaveBeenCalled();

      // Restore console.error
      console.error = originalError;
    });

    it('✅ should return 0 when no files to delete', async () => {
      fs.readdirSync.mockReturnValue([]);

      const deletedCount = await ExportService.cleanupOldFiles();

      expect(deletedCount).toBe(0);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('listFiles', () => {
    it('✅ should list all files when userId not provided', async () => {
      const files = ['dashboard_123.xlsx', 'velocity_456.pdf'];
      const now = Date.now();

      fs.readdirSync.mockReturnValue(files);
      fs.statSync
        .mockReturnValueOnce({
          mtimeMs: now - 1000,
        })
        .mockReturnValueOnce({
          mtimeMs: now - 2000,
        });

      const result = await ExportService.listFiles();

      expect(fs.readdirSync).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('filename');
      expect(result[0]).toHaveProperty('format');
      expect(result[0]).toHaveProperty('reportType');
      expect(result[0]).toHaveProperty('expiresAt');
      expect(result[0].format).toBe('excel');
      expect(result[1].format).toBe('pdf');
    });

    it('✅ should filter files by userId', async () => {
      const userId = 'user123';
      const files = [
        `dashboard_123_user${userId}.xlsx`,
        'velocity_456_userother.pdf',
        `leaderboard_789_user${userId}.pdf`,
      ];
      const now = Date.now();

      fs.readdirSync.mockReturnValue(files);
      fs.statSync
        .mockReturnValueOnce({
          mtimeMs: now - 1000,
        })
        .mockReturnValueOnce({
          mtimeMs: now - 1000,
        });

      const result = await ExportService.listFiles(userId);

      expect(fs.readdirSync).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result.every(f => f.filename.includes(`_user${userId}`))).toBe(true);
      expect(result[0].filename).toContain(`_user${userId}`);
      expect(result[1].filename).toContain(`_user${userId}`);
    });

    it('✅ should delete expired files immediately', async () => {
      const files = ['old_file.xlsx', 'new_file.pdf'];
      const now = Date.now();

      fs.readdirSync.mockReturnValue(files);
      fs.statSync
        .mockReturnValueOnce({
          mtimeMs: now - 25 * 60 * 60 * 1000, // 25 hours ago
        })
        .mockReturnValueOnce({
          mtimeMs: now - 1000, // 1 second ago
        });

      const result = await ExportService.listFiles();

      expect(fs.readdirSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('old_file.xlsx'));
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('new_file.pdf');
    });

    it('✅ should parse report type from filename', async () => {
      const files = ['dashboard_123.xlsx', 'velocity_456.pdf'];
      const now = Date.now();

      fs.readdirSync.mockReturnValue(files);
      fs.statSync
        .mockReturnValueOnce({
          mtimeMs: now - 1000,
        })
        .mockReturnValueOnce({
          mtimeMs: now - 2000,
        });

      const result = await ExportService.listFiles();

      expect(fs.readdirSync).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].reportType).toBe('dashboard');
      expect(result[1].reportType).toBe('velocity');
    });

    it('✅ should sort files by expiresAt descending', async () => {
      const files = ['file1.xlsx', 'file2.pdf'];
      const now = Date.now();

      fs.readdirSync.mockReturnValue(files);
      fs.statSync
        .mockReturnValueOnce({
          mtimeMs: now - 2000, // expires later (mtimeMs + maxAge)
        })
        .mockReturnValueOnce({
          mtimeMs: now - 1000, // expires earlier (mtimeMs + maxAge)
        });

      const result = await ExportService.listFiles();

      expect(fs.readdirSync).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      // File with later mtimeMs expires later (because expiresAt = mtimeMs + maxAge)
      expect(new Date(result[0].expiresAt).getTime()).toBeGreaterThan(
        new Date(result[1].expiresAt).getTime()
      );
    });
  });

  describe('deleteFile', () => {
    it('✅ should delete file successfully', async () => {
      const filename = 'dashboard_123.xlsx';
      fs.existsSync.mockReturnValue(true);

      await ExportService.deleteFile(filename);

      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining(filename));
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining(filename));
    });

    it('✅ should throw error when file does not exist', async () => {
      const filename = 'nonexistent.xlsx';
      fs.existsSync.mockReturnValue(false);

      await expect(ExportService.deleteFile(filename)).rejects.toThrow(
        'File không tồn tại hoặc đã bị xóa'
      );
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('_getDefaultStartDate and _getDefaultEndDate', () => {
    it('✅ should return default start date (30 days ago)', () => {
      const startDate = ExportService._getDefaultStartDate();
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);
      const expected = expectedDate.toISOString().split('T')[0];

      expect(startDate).toBe(expected);
    });

    it('✅ should return default end date (today)', () => {
      const endDate = ExportService._getDefaultEndDate();
      const expected = new Date().toISOString().split('T')[0];

      expect(endDate).toBe(expected);
    });
  });
});

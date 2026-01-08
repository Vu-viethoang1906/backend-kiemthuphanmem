const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const analyticsService = require('./analytics.service');

class ExportService {
  constructor() {
    this.exportsDir = path.join(__dirname, '..', 'exports');
    this._ensureExportsDirectory();
  }

  _ensureExportsDirectory() {
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  /**
   * Validate report type and format
   * @param {String} reportType - dashboard, velocity, leaderboard, center_comparison
   * @param {String} format - excel, pdf
   */
  validateExportParams(reportType, format) {
    const validReportTypes = ['dashboard', 'velocity', 'leaderboard', 'center_comparison'];
    const validFormats = ['excel', 'pdf'];

    if (!validReportTypes.includes(reportType)) {
      throw new Error(`Loại báo cáo không hợp lệ. Chỉ chấp nhận: ${validReportTypes.join(', ')}`);
    }

    if (!validFormats.includes(format)) {
      throw new Error(`Định dạng không hợp lệ. Chỉ chấp nhận: ${validFormats.join(', ')}`);
    }
  }

  /**
   * Generate report data based on report type
   */
  async generateReportData(reportType, params) {
    switch (reportType) {
      case 'dashboard':
        return await this._getDashboardData(params);
      case 'velocity':
        return await this._getVelocityData(params);
      case 'leaderboard':
        return await this._getLeaderboardData(params);
      case 'center_comparison':
        return await this._getCenterComparisonData(params);
      default:
        throw new Error(`Loại báo cáo không được hỗ trợ: ${reportType}`);
    }
  }

  async _getDashboardData(params) {
    const { board_id } = params;
    const dashboardStats = await analyticsService.getDashboardStats(board_id);
    const lineChartData = await analyticsService.getLineChartData({
      board_id,
      start_date: params.start_date || this._getDefaultStartDate(),
      end_date: params.end_date || this._getDefaultEndDate(),
      granularity: params.granularity || 'day',
    });

    return {
      reportType: 'dashboard',
      board: dashboardStats.board,
      stats: dashboardStats.stats,
      chartData: lineChartData.data,
      dateRange: lineChartData.dateRange,
    };
  }

  async _getVelocityData(params) {
    const { board_id, start_date, end_date, wipLimit } = params;
    const Board = require('../models/board.model');
    const board = await Board.findById(board_id);

    const velocityData = await analyticsService.getThroughputAndCFD(
      board_id,
      wipLimit || 5,
      start_date || null,
      end_date || null
    );

    // Transform columnFlow to throughput format
    const throughput = {};
    Object.keys(velocityData.columnFlow || {}).forEach(column => {
      throughput[column] = {
        entered: velocityData.columnFlow[column].entered || 0,
        exited: velocityData.columnFlow[column].exited || 0,
        avgTime: velocityData.columnAvgTimes?.[column] || 0,
      };
    });

    return {
      reportType: 'velocity',
      board: board ? { id: board._id, title: board.title } : null,
      throughput,
      cfd: velocityData.cfd || [],
      wipViolations: velocityData.wipViolations || {},
    };
  }

  async _getLeaderboardData(params) {
    const { center_id, limit, start_date, end_date } = params;
    const leaderboardData = await analyticsService.getLeaderboard({
      center_id,
      limit,
      start_date,
      end_date,
    });

    return {
      reportType: 'leaderboard',
      leaderboard: leaderboardData.leaderboard,
      summary: leaderboardData.summary,
      cheatDetection: leaderboardData.cheatDetection,
      dateRange: leaderboardData.dateRange,
    };
  }

  async _getCenterComparisonData(params) {
    const { board_id } = params;
    const comparisonData = await analyticsService.compareCentersPerformance({ board_id });

    return {
      reportType: 'center_comparison',
      summary: comparisonData.summary,
      centers: comparisonData.centers,
      rankings: comparisonData.rankings,
    };
  }

  async exportToExcel(reportData, filename) {
    const workbook = XLSX.utils.book_new();

    const summarySheet = this._createSummarySheet(reportData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');

    const detailsSheet = this._createDetailsSheet(reportData);
    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Chi tiết');

    const chartsSheet = this._createChartsDataSheet(reportData);
    if (chartsSheet) {
      XLSX.utils.book_append_sheet(workbook, chartsSheet, 'Dữ liệu biểu đồ');
    }

    const filePath = path.join(this.exportsDir, filename);
    XLSX.writeFile(workbook, filePath);

    return filePath;
  }

  _createSummarySheet(reportData) {
    const { reportType } = reportData;
    const rows = [];

    // Header
    rows.push(['BÁO CÁO TỔNG QUAN']);
    rows.push([]);

    if (reportType === 'dashboard') {
      rows.push(['Bảng:', reportData.board?.title || 'N/A']);
      rows.push(['Tổng số task:', reportData.stats?.totalTasks || 0]);
      rows.push(['Task đã hoàn thành:', reportData.stats?.completedTasks || 0]);
      rows.push(['Task đang thực hiện:', reportData.stats?.inProgressTasks || 0]);
      rows.push(['Task quá hạn:', reportData.stats?.overdueTasks || 0]);
      rows.push(['Tỷ lệ hoàn thành:', `${reportData.stats?.completionRate || 0}%`]);
      if (reportData.dateRange) {
        rows.push([
          'Khoảng thời gian:',
          `${reportData.dateRange.start} - ${reportData.dateRange.end}`,
        ]);
      }
    } else if (reportType === 'velocity') {
      rows.push(['Bảng:', reportData.board?.title || 'N/A']);
      rows.push(['Số cột:', Object.keys(reportData.throughput || {}).length]);
      rows.push(['Số điểm CFD:', reportData.cfd?.length || 0]);
    } else if (reportType === 'leaderboard') {
      rows.push(['Tổng số người dùng:', reportData.summary?.totalUsers || 0]);
      rows.push(['Điểm trung bình:', reportData.summary?.averagePoints || 0]);
      rows.push(['Task hoàn thành trung bình:', reportData.summary?.averageTasksCompleted || 0]);
      if (reportData.dateRange) {
        rows.push([
          'Khoảng thời gian:',
          `${reportData.dateRange.start} - ${reportData.dateRange.end}`,
        ]);
      }
    } else if (reportType === 'center_comparison') {
      rows.push(['Tổng số trung tâm:', reportData.summary?.totalCenters || 0]);
      rows.push(['Trung tâm tốt nhất:', reportData.rankings?.bestCenter?.name || 'N/A']);
      rows.push(['Trung tâm cần cải thiện:', reportData.rankings?.worstCenter?.name || 'N/A']);
    }

    rows.push([]);
    rows.push(['Ngày xuất báo cáo:', new Date().toLocaleString('vi-VN')]);

    return XLSX.utils.aoa_to_sheet(rows);
  }

  _createDetailsSheet(reportData) {
    const { reportType } = reportData;
    let rows = [];

    if (reportType === 'dashboard') {
      rows.push(['Ngày', 'Tổng task', 'Đã hoàn thành', 'Đang thực hiện', 'Quá hạn']);
      if (reportData.chartData && Array.isArray(reportData.chartData)) {
        reportData.chartData.forEach(item => {
          rows.push([
            item.date || '',
            item.total || 0,
            item.completed || 0,
            item.inProgress || 0,
            item.overdue || 0,
          ]);
        });
      }
    } else if (reportType === 'velocity') {
      rows.push(['Cột', 'Vào', 'Ra', 'Thời gian trung bình (giờ)']);
      if (reportData.throughput) {
        Object.keys(reportData.throughput).forEach(column => {
          rows.push([
            column,
            reportData.throughput[column]?.entered || 0,
            reportData.throughput[column]?.exited || 0,
            reportData.throughput[column]?.avgTime || 0,
          ]);
        });
      }
      // CFD data
      if (reportData.cfd && Array.isArray(reportData.cfd)) {
        rows.push([]);
        rows.push(['CFD - Cumulative Flow Diagram']);
        rows.push(['Ngày', ...Object.keys(reportData.cfd[0] || {}).filter(k => k !== 'date')]);
        reportData.cfd.slice(0, 100).forEach(item => {
          const date = item.date ? new Date(item.date).toLocaleDateString('vi-VN') : '';
          const values = Object.keys(item)
            .filter(k => k !== 'date')
            .map(k => item[k] || 0);
          rows.push([date, ...values]);
        });
      }
    } else if (reportType === 'leaderboard') {
      rows.push([
        'Hạng',
        'Tên người dùng',
        'Họ tên',
        'Trung tâm',
        'Điểm',
        'Tổng điểm',
        'Cấp độ',
        'Task hoàn thành',
        'Hoàn thành đúng hạn',
        'Hoàn thành trễ hạn',
        'Tỷ lệ đúng hạn (%)',
      ]);
      if (reportData.leaderboard && Array.isArray(reportData.leaderboard)) {
        reportData.leaderboard.forEach(item => {
          rows.push([
            item.rank || '',
            item.username || '',
            item.fullName || '',
            item.centerName || '',
            item.points || 0,
            item.totalPoints || 0,
            item.level || 1,
            item.statistics?.tasksCompleted || 0,
            item.statistics?.onTimeCompleted || 0,
            item.statistics?.overdueCompleted || 0,
            item.statistics?.onTimeRate || 0,
          ]);
        });
      }
    } else if (reportType === 'center_comparison') {
      rows.push([
        'Tên trung tâm',
        'Số người dùng',
        'Người dùng hoạt động',
        'Tổng task',
        'Task đã hoàn thành',
        'Task đang thực hiện',
        'Tỷ lệ hoàn thành (%)',
        'Điểm trung bình',
        'Ngày hoạt động',
      ]);
      if (reportData.centers && Array.isArray(reportData.centers)) {
        reportData.centers.forEach(center => {
          rows.push([
            center.center_name || '',
            center.totalUsers || 0,
            center.activeUsers || 0,
            center.totalTasks || 0,
            center.completedTasks || 0,
            center.inProgressTasks || 0,
            center.completionRate?.toFixed(2) || 0,
            center.averagePointsPerUser?.toFixed(2) || 0,
            center.averageActiveDaysPerUser?.toFixed(2) || 0,
          ]);
        });
      }
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  _createChartsDataSheet(reportData) {
    const { reportType } = reportData;
    let rows = [];

    if (reportType === 'dashboard' && reportData.chartData) {
      rows.push(['Ngày', 'Tổng', 'Đã hoàn thành', 'Đang thực hiện', 'Quá hạn']);
      reportData.chartData.forEach(item => {
        rows.push([
          item.date || '',
          item.total || 0,
          item.completed || 0,
          item.inProgress || 0,
          item.overdue || 0,
        ]);
      });
      return XLSX.utils.aoa_to_sheet(rows);
    }

    if (reportType === 'velocity' && reportData.cfd) {
      rows.push(['Ngày', ...Object.keys(reportData.cfd[0] || {}).filter(k => k !== 'date')]);
      reportData.cfd.forEach(item => {
        const date = item.date ? new Date(item.date).toLocaleDateString('vi-VN') : '';
        const values = Object.keys(item)
          .filter(k => k !== 'date')
          .map(k => item[k] || 0);
        rows.push([date, ...values]);
      });
      return XLSX.utils.aoa_to_sheet(rows);
    }

    return null;
  }

  async exportToPDF(reportData, filename) {
    const fs = require('fs');
    const path = require('path');
    const PDFDocument = require('pdfkit');

    // đảm bảo thư mục tồn tại
    fs.mkdirSync(this.exportsDir, { recursive: true });

    const filePath = path.join(this.exportsDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath, { mode: 0o644 });

      stream.on('finish', () => {
        resolve(filePath); // ✅ CHỈ resolve khi file ghi XONG
      });

      stream.on('error', err => {
        reject(err);
      });

      doc.on('error', err => {
        reject(err);
      });

      doc.pipe(stream);

      // ===== CONTENT =====
      doc.fontSize(20).text('BÁO CÁO THỐNG KÊ', { align: 'center' });
      doc.moveDown();

      const reportTypeNames = {
        dashboard: 'Báo cáo Dashboard',
        velocity: 'Báo cáo Vận tốc',
        leaderboard: 'Báo cáo Bảng xếp hạng',
        center_comparison: 'Báo cáo So sánh Trung tâm',
      };

      doc.fontSize(16).text(reportTypeNames[reportData.reportType] || 'Báo cáo', {
        align: 'center',
      });

      doc.moveDown(2);

      this._addPDFContent(doc, reportData);

      doc
        .moveDown()
        .fontSize(10)
        .text(`Xuất báo cáo lúc: ${new Date().toLocaleString('vi-VN')}`, { align: 'center' });

      doc.end(); // 🔚 kết thúc sau khi pipe
    });
  }

  _addPDFContent(doc, reportData) {
    const { reportType } = reportData;

    if (reportType === 'dashboard') {
      doc.fontSize(14).text('Thông tin bảng:', { underline: true });
      doc.fontSize(12).text(`Tên bảng: ${reportData.board?.title || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(14).text('Thống kê:', { underline: true });
      doc.fontSize(12);
      doc.text(`Tổng số task: ${reportData.stats?.totalTasks || 0}`);
      doc.text(`Task đã hoàn thành: ${reportData.stats?.completedTasks || 0}`);
      doc.text(`Task đang thực hiện: ${reportData.stats?.inProgressTasks || 0}`);
      doc.text(`Task quá hạn: ${reportData.stats?.overdueTasks || 0}`);
      doc.text(`Tỷ lệ hoàn thành: ${reportData.stats?.completionRate || 0}%`);
      doc.moveDown();

      if (reportData.chartData && reportData.chartData.length > 0) {
        doc.fontSize(14).text('Dữ liệu biểu đồ:', { underline: true });
        doc.fontSize(10);
        doc.text('Ngày | Tổng | Đã hoàn thành | Đang thực hiện | Quá hạn', { underline: true });
        reportData.chartData.slice(0, 50).forEach(item => {
          doc.text(
            `${item.date || ''} | ${item.total || 0} | ${item.completed || 0} | ${item.inProgress || 0} | ${item.overdue || 0}`
          );
        });
      }
    } else if (reportType === 'velocity') {
      doc.fontSize(14).text('Thông tin bảng:', { underline: true });
      doc.fontSize(12).text(`Tên bảng: ${reportData.board?.title || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(14).text('Thống kê:', { underline: true });
      doc.fontSize(12).text(`Số cột: ${Object.keys(reportData.throughput || {}).length}`);
      doc.text(`Số điểm CFD: ${reportData.cfd?.length || 0}`);
      doc.moveDown();

      if (reportData.throughput) {
        doc.fontSize(14).text('Throughput:', { underline: true });
        doc.fontSize(10);
        doc.text('Cột | Vào | Ra | Thời gian trung bình (giờ)', { underline: true });
        Object.keys(reportData.throughput).forEach(column => {
          doc.text(
            `${column} | ${reportData.throughput[column]?.entered || 0} | ${reportData.throughput[column]?.exited || 0} | ${reportData.throughput[column]?.avgTime || 0}`
          );
        });
      }
    } else if (reportType === 'leaderboard') {
      doc.fontSize(14).text('Tổng quan:', { underline: true });
      doc.fontSize(12);
      doc.text(`Tổng số người dùng: ${reportData.summary?.totalUsers || 0}`);
      doc.text(`Điểm trung bình: ${reportData.summary?.averagePoints || 0}`);
      doc.text(`Task hoàn thành trung bình: ${reportData.summary?.averageTasksCompleted || 0}`);
      doc.moveDown();

      if (reportData.leaderboard && reportData.leaderboard.length > 0) {
        doc.fontSize(14).text('Bảng xếp hạng:', { underline: true });
        doc.fontSize(10);
        doc.text('Hạng | Tên | Điểm | Task hoàn thành', { underline: true });
        reportData.leaderboard.slice(0, 50).forEach(item => {
          doc.text(
            `${item.rank || ''} | ${item.fullName || item.username || ''} | ${item.points || 0} | ${item.statistics?.tasksCompleted || 0}`
          );
        });
      }
    } else if (reportType === 'center_comparison') {
      doc.fontSize(14).text('Tổng quan:', { underline: true });
      doc.fontSize(12).text(`Tổng số trung tâm: ${reportData.summary?.totalCenters || 0}`);
      doc.moveDown();

      if (reportData.centers && reportData.centers.length > 0) {
        doc.fontSize(14).text('So sánh trung tâm:', { underline: true });
        doc.fontSize(10);
        doc.text('Tên | Người dùng | Task | Tỷ lệ hoàn thành (%)', { underline: true });
        reportData.centers.forEach(center => {
          doc.text(
            `${center.center_name || ''} | ${center.totalUsers || 0} | ${center.totalTasks || 0} | ${center.completionRate?.toFixed(2) || 0}%`
          );
        });
      }
    }
  }

  generateFilename(reportType, format, userId) {
    const timestamp = Date.now();
    const ext = format === 'excel' ? 'xlsx' : 'pdf';
    const userIdStr = userId && userId.toString ? userId.toString() : userId || '';
    // Loại bỏ ký tự không an toàn cho tên file
    const safeUserId = userIdStr.replace(/[^a-zA-Z0-9_-]/g, '');
    const userPrefix = safeUserId ? `_user${safeUserId}` : '';
    return `${reportType}_${timestamp}${userPrefix}.${ext}`;
  }

  getDownloadUrl(filename) {
    return `/api/exports/${filename}`;
  }

  async cleanupOldFiles() {
    const files = fs.readdirSync(this.exportsDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(this.exportsDir, file);
      try {
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (error) {}
    }

    return deletedCount;
  }

  /**
   * List export files (filtered by age < 24h). Optionally filter by user prefix.
   * @param {String|null} userId
   * @returns {Array<{ filename, format, reportType, expiresAt }>}
   */
  async listFiles(userId = null) {
    const files = fs.readdirSync(this.exportsDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    const results = [];

    for (const file of files) {
      // If user filter is provided, only include files that contain the user suffix
      if (userId && !file.includes(`_user${userId}`)) continue;

      const filePath = path.join(this.exportsDir, file);
      try {
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;
        if (age > maxAge) {
          // Delete expired file immediately
          fs.unlinkSync(filePath);
          continue;
        }

        const ext = path.extname(file).toLowerCase();
        const format = ext === '.xlsx' ? 'excel' : ext === '.pdf' ? 'pdf' : 'unknown';

        // Parse reportType from filename pattern: `${reportType}_${timestamp}_user${userId}.${ext}`
        const nameParts = file.split('_');
        const reportType = nameParts.length > 0 ? nameParts[0] : 'unknown';

        results.push({
          filename: file,
          format,
          reportType,
          expiresAt: new Date(stats.mtimeMs + maxAge).toISOString(),
        });
      } catch (error) {}
    }

    return results.sort((a, b) => (a.expiresAt > b.expiresAt ? -1 : 1));
  }

  /**
   * Delete a file in exports directory
   * @param {String} filename
   */
  async deleteFile(filename) {
    const filePath = path.join(this.exportsDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('File không tồn tại hoặc đã bị xóa');
    }
    fs.unlinkSync(filePath);
  }

  _getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  _getDefaultEndDate() {
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = new ExportService();

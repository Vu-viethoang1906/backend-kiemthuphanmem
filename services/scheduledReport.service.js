const scheduledReportRepo = require('../repositories/scheduledReport.repository');
const exportService = require('./export.service');
const { sendMail } = require('../config/mailer');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

class ScheduledReportService {
  /**
   * Calculate next send time based on frequency
   * @param {String} frequency - daily, weekly, monthly
   * @param {Date} currentTime - Current time (default: now)
   * @returns {Date}
   */
  calculateNextSendTime(frequency, currentTime = null) {
    const now = currentTime
      ? moment(currentTime).tz('Asia/Ho_Chi_Minh')
      : moment().tz('Asia/Ho_Chi_Minh');
    let nextSend;

    switch (frequency) {
      case 'daily':
        // Next day at 7 AM
        nextSend = now.clone().add(1, 'day').hour(7).minute(0).second(0).millisecond(0);
        // If current time is before 7 AM today, send today at 7 AM
        if (now.hour() < 7) {
          nextSend = now.clone().hour(7).minute(0).second(0).millisecond(0);
        }
        break;

      case 'weekly':
        // Next Monday at 7 AM
        const daysUntilMonday = (8 - now.day()) % 7 || 7;
        nextSend = now
          .clone()
          .add(daysUntilMonday, 'days')
          .hour(7)
          .minute(0)
          .second(0)
          .millisecond(0);
        // If today is Monday and before 7 AM, send today
        if (now.day() === 1 && now.hour() < 7) {
          nextSend = now.clone().hour(7).minute(0).second(0).millisecond(0);
        }
        break;

      case 'monthly':
        // 1st of next month at 7 AM
        nextSend = now.clone().add(1, 'month').date(1).hour(7).minute(0).second(0).millisecond(0);
        // If today is 1st and before 7 AM, send today
        if (now.date() === 1 && now.hour() < 7) {
          nextSend = now.clone().hour(7).minute(0).second(0).millisecond(0);
        }
        break;

      default:
        throw new Error(`Tần suất không hợp lệ: ${frequency}`);
    }

    return nextSend.toDate();
  }

  /**
   * Create a new scheduled report
   */
  async createScheduledReport(data) {
    const { user_id, board_id, report_type, frequency, recipients, report_params = {} } = data;

    // Validate recipients
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Phải có ít nhất một địa chỉ email người nhận');
    }

    // Validate email format - regex chuẩn, dùng được 99% case thực tế (hỗ trợ email công ty như @codegym.vn)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        throw new Error(`Địa chỉ email không hợp lệ: ${email}`);
      }
    }

    // Calculate next send time
    const next_send_at = this.calculateNextSendTime(frequency);

    const scheduledReport = await scheduledReportRepo.create({
      user_id,
      board_id,
      report_type,
      frequency,
      recipients,
      report_params,
      next_send_at,
      is_active: true,
    });

    return scheduledReport;
  }

  /**
   * Update scheduled report
   */
  async updateScheduledReport(id, data) {
    const { frequency, recipients, report_params, is_active } = data;

    const updateData = {};

    if (frequency !== undefined) {
      updateData.frequency = frequency;
      // Recalculate next_send_at if frequency changes
      updateData.next_send_at = this.calculateNextSendTime(frequency);
    }

    if (recipients !== undefined) {
      // Validate recipients
      if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('Phải có ít nhất một địa chỉ email người nhận');
      }

      // Validate email format - regex chuẩn, dùng được 99% case thực tế (hỗ trợ email công ty như @codegym.vn)
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      for (const email of recipients) {
        if (!emailRegex.test(email)) {
          throw new Error(`Địa chỉ email không hợp lệ: ${email}`);
        }
      }
      updateData.recipients = recipients;
    }

    if (report_params !== undefined) {
      updateData.report_params = report_params;
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    return await scheduledReportRepo.update(id, updateData);
  }

  /**
   * Get scheduled reports for a user
   */
  async getScheduledReportsByUserId(userId) {
    return await scheduledReportRepo.findByUserId(userId);
  }

  /**
   * Get scheduled report by ID
   */
  async getScheduledReportById(id) {
    return await scheduledReportRepo.findById(id);
  }

  /**
   * Delete scheduled report
   */
  async deleteScheduledReport(id) {
    return await scheduledReportRepo.delete(id);
  }

  /**
   * Generate HTML summary for email
   */
  _generateHTMLSummary(reportData, boardTitle, reportType) {
    const reportTypeNames = {
      dashboard: 'Báo cáo Dashboard',
      velocity: 'Báo cáo Vận tốc',
      leaderboard: 'Báo cáo Bảng xếp hạng',
      center_comparison: 'Báo cáo So sánh Trung tâm',
    };

    let summaryHTML = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .stats { margin: 20px 0; }
            .stat-item { margin: 10px 0; padding: 10px; background-color: white; border-left: 4px solid #4CAF50; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${reportTypeNames[reportType] || 'Báo cáo'}</h1>
              <p>Bảng: ${boardTitle}</p>
            </div>
            <div class="content">
              <h2>Tổng quan</h2>
    `;

    if (reportType === 'dashboard') {
      summaryHTML += `
        <div class="stats">
          <div class="stat-item"><strong>Tổng số task:</strong> ${reportData.stats?.totalTasks || 0}</div>
          <div class="stat-item"><strong>Task đã hoàn thành:</strong> ${reportData.stats?.completedTasks || 0}</div>
          <div class="stat-item"><strong>Task đang thực hiện:</strong> ${reportData.stats?.inProgressTasks || 0}</div>
          <div class="stat-item"><strong>Task quá hạn:</strong> ${reportData.stats?.overdueTasks || 0}</div>
          <div class="stat-item"><strong>Tỷ lệ hoàn thành:</strong> ${reportData.stats?.completionRate || 0}%</div>
        </div>
      `;
    } else if (reportType === 'velocity') {
      summaryHTML += `
        <div class="stats">
          <div class="stat-item"><strong>Số cột:</strong> ${Object.keys(reportData.throughput || {}).length}</div>
          <div class="stat-item"><strong>Số điểm CFD:</strong> ${reportData.cfd?.length || 0}</div>
        </div>
      `;
    } else if (reportType === 'leaderboard') {
      summaryHTML += `
        <div class="stats">
          <div class="stat-item"><strong>Tổng số người dùng:</strong> ${reportData.summary?.totalUsers || 0}</div>
          <div class="stat-item"><strong>Điểm trung bình:</strong> ${reportData.summary?.averagePoints || 0}</div>
          <div class="stat-item"><strong>Task hoàn thành trung bình:</strong> ${reportData.summary?.averageTasksCompleted || 0}</div>
        </div>
      `;
    } else if (reportType === 'center_comparison') {
      summaryHTML += `
        <div class="stats">
          <div class="stat-item"><strong>Tổng số trung tâm:</strong> ${reportData.summary?.totalCenters || 0}</div>
          <div class="stat-item"><strong>Trung tâm tốt nhất:</strong> ${reportData.rankings?.bestCenter?.name || 'N/A'}</div>
        </div>
      `;
    }

    summaryHTML += `
              <p>Xem chi tiết trong file PDF đính kèm.</p>
            </div>
            <div class="footer">
              <p>Báo cáo được tạo tự động bởi hệ thống</p>
              <p>Ngày tạo: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return summaryHTML;
  }

  /**
   * Process and send scheduled reports
   */
  async processScheduledReports() {
    const now = new Date();
    const dueReports = await scheduledReportRepo.findDueReports(now);

    if (dueReports.length === 0) {
      return { processed: 0, success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const report of dueReports) {
      try {
        await this.sendScheduledReport(report);
        successCount++;
      } catch (error) {
        failedCount++;

        // Update retry count and error
        await scheduledReportRepo.incrementRetryCount(report._id);
        await scheduledReportRepo.updateLastError(report._id, error.message);

        // If retry count exceeds 3, deactivate the report
        if (report.retry_count >= 3) {
          await scheduledReportRepo.deactivate(report._id);
        }
      }
    }

    return {
      processed: dueReports.length,
      success: successCount,
      failed: failedCount,
    };
  }

  /**
   * Send a scheduled report
   */
  async sendScheduledReport(scheduledReport) {
    try {
      const { report_type, board_id, recipients, report_params } = scheduledReport;

      // 1️⃣ board info
      const boardIdValue = board_id?._id ? board_id._id.toString() : board_id?.toString();

      const boardTitle = board_id?.title || scheduledReport.board_id?.title || 'N/A';

      // 2️⃣ Generate report data
      const reportData = await exportService.generateReportData(report_type, {
        board_id: boardIdValue,
        ...report_params,
      });

      // 3️⃣ Export PDF (timeout cứng)
      const filename = exportService.generateFilename(report_type, 'pdf', scheduledReport.user_id);

      const pdfPath = await Promise.race([
        exportService.exportToPDF(reportData, filename),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('exportToPDF TIMEOUT')), 20000)
        ),
      ]);

      // 4️⃣ HTML summary
      const htmlSummary = this._generateHTMLSummary(reportData, boardTitle, report_type);

      // 5️⃣ Email subject
      const reportTypeNames = {
        dashboard: 'Báo cáo Dashboard',
        velocity: 'Báo cáo Vận tốc',
        leaderboard: 'Báo cáo Bảng xếp hạng',
        center_comparison: 'Báo cáo So sánh Trung tâm',
      };

      const subject = `${reportTypeNames[report_type]} - ${boardTitle}`;
      const pdfBuffer = fs.readFileSync(pdfPath);
      // 6️⃣ Send mail (timeout cứng)
      await Promise.race([
        sendMail(recipients, subject, htmlSummary, [
          {
            filename,
            content: pdfBuffer,
          },
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('sendMail TIMEOUT')), 15000)),
      ]);

      // 7️⃣ Update DB
      const next_send_at = this.calculateNextSendTime(scheduledReport.frequency);

      await scheduledReportRepo.update(scheduledReport._id, {
        last_sent_at: new Date(),
        next_send_at,
        retry_count: 0,
        last_error: null,
      });

      return { success: true };
    } catch (err) {
      // lưu lỗi để lần sau thấy
      await scheduledReportRepo.update(scheduledReport._id, {
        last_error: err.message,
      });

      throw err; // để controller trả 500
    }
  }
}

module.exports = new ScheduledReportService();

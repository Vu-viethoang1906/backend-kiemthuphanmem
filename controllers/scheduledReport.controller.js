const scheduledReportService = require('../services/scheduledReport.service');

class ScheduledReportController {
  /**
   * Create a new scheduled report
   * POST /api/scheduled-reports
   */
  async create(req, res) {
    try {
      const { board_id, report_type, frequency, recipients, report_params } = req.body;
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      if (!board_id || !report_type || !frequency || !recipients) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc: board_id, report_type, frequency, recipients',
          received: {
            hasBoardId: !!board_id,
            hasReportType: !!report_type,
            hasFrequency: !!frequency,
            hasRecipients: !!recipients,
          },
        });
      }

      // Validate recipients format
      let recipientsArray = [];
      if (Array.isArray(recipients)) {
        recipientsArray = recipients.filter(r => r && r.trim() !== '');
      } else if (typeof recipients === 'string') {
        recipientsArray = [recipients].filter(r => r && r.trim() !== '');
      } else {
        return res.status(400).json({
          success: false,
          message: 'recipients phải là mảng hoặc chuỗi',
        });
      }

      if (recipientsArray.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Phải có ít nhất một địa chỉ email người nhận',
        });
      }

      const scheduledReport = await scheduledReportService.createScheduledReport({
        user_id,
        board_id,
        report_type,
        frequency,
        recipients: recipientsArray,
        report_params: report_params || {},
      });

      res.status(201).json({
        success: true,
        message: 'Đăng ký nhận báo cáo tự động thành công',
        data: scheduledReport,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi tạo đăng ký báo cáo',
      });
    }
  }

  /**
   * Get all scheduled reports for current user
   * GET /api/scheduled-reports
   */
  async getAll(req, res) {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const scheduledReports = await scheduledReportService.getScheduledReportsByUserId(user_id);

      res.json({
        success: true,
        data: scheduledReports,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách đăng ký báo cáo',
      });
    }
  }

  /**
   * Get scheduled report by ID
   * GET /api/scheduled-reports/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user?.id;
      const roles = req.user?.roles || [];
      const isAdmin = roles.includes('admin') || roles.includes('System_Manager');

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const scheduledReport = await scheduledReportService.getScheduledReportById(id);

      if (!scheduledReport) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đăng ký báo cáo',
        });
      }

      // Check if user owns this report
      if (scheduledReport.user_id.toString() !== user_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập đăng ký báo cáo này',
        });
      }

      res.json({
        success: true,
        data: scheduledReport,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thông tin đăng ký báo cáo',
      });
    }
  }

  /**
   * Update scheduled report
   * PUT /api/scheduled-reports/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user?.id;
      const roles = req.user?.roles || [];
      const isAdmin = roles.includes('admin') || roles.includes('System_Manager');
      const { frequency, recipients, report_params, is_active } = req.body;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      // Check if report exists and user owns it (or admin)
      const existingReport = await scheduledReportService.getScheduledReportById(id);
      if (!existingReport) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đăng ký báo cáo',
        });
      }

      if (existingReport.user_id.toString() !== user_id.toString() && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật đăng ký báo cáo này',
        });
      }

      const updatedReport = await scheduledReportService.updateScheduledReport(id, {
        frequency,
        recipients: recipients
          ? Array.isArray(recipients)
            ? recipients
            : [recipients]
          : undefined,
        report_params,
        is_active,
      });

      res.json({
        success: true,
        message: 'Cập nhật đăng ký báo cáo thành công',
        data: updatedReport,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật đăng ký báo cáo',
      });
    }
  }

  /**
   * Delete scheduled report
   * DELETE /api/scheduled-reports/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      // Check if report exists and user owns it
      const existingReport = await scheduledReportService.getScheduledReportById(id);
      if (!existingReport) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đăng ký báo cáo',
        });
      }

      if (existingReport.user_id.toString() !== user_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa đăng ký báo cáo này',
        });
      }

      await scheduledReportService.deleteScheduledReport(id);

      res.json({
        success: true,
        message: 'Xóa đăng ký báo cáo thành công',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xóa đăng ký báo cáo',
      });
    }
  }

  /**
   * Process all due scheduled reports (for testing/admin)
   * POST /api/scheduled-reports/process
   */
  async processAll(req, res) {
    try {
      const result = await scheduledReportService.processScheduledReports();

      res.json({
        success: true,
        message: 'Xử lý báo cáo đã hoàn thành',
        data: {
          processed: result.processed,
          success: result.success,
          failed: result.failed,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xử lý báo cáo',
      });
    }
  }

  /**
   * Send a specific scheduled report immediately (for testing)
   * POST /api/scheduled-reports/:id/send
   */
  async sendNow(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user?.id;
      const roles = req.user?.roles || [];
      const isAdmin = roles.includes('admin') || roles.includes('System_Manager');

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const scheduledReport = await scheduledReportService.getScheduledReportById(id);

      if (!scheduledReport) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đăng ký báo cáo',
        });
      }

      if (scheduledReport.user_id.toString() !== user_id.toString() && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền gửi báo cáo này',
        });
      }

      await scheduledReportService.sendScheduledReport(scheduledReport);

      return res.json({
        success: true,
        message: 'Báo cáo đã được gửi thành công',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi gửi báo cáo',
      });
    }
  }
}

module.exports = new ScheduledReportController();

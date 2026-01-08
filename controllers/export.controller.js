const exportService = require('../services/export.service');

class ExportController {
  async exportReport(req, res) {
    try {
      const {
        report_type,
        format,
        board_id,
        center_id,
        start_date,
        end_date,
        granularity,
        wipLimit,
        limit,
      } = req.query;

      if (!report_type || !format) {
        return res.status(400).json({
          success: false,
          message: 'report_type và format là bắt buộc',
        });
      }

      try {
        exportService.validateExportParams(report_type, format);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (['dashboard', 'velocity', 'center_comparison'].includes(report_type)) {
        if (!board_id) {
          return res.status(400).json({
            success: false,
            message: 'board_id là bắt buộc cho loại báo cáo này',
          });
        }
      }

      const params = {
        board_id,
        center_id,
        start_date,
        end_date,
        granularity,
        wipLimit: wipLimit ? parseInt(wipLimit) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      };

      let reportData;
      try {
        reportData = await exportService.generateReportData(report_type, params);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Lỗi khi tạo dữ liệu báo cáo: ${error.message}`,
        });
      }

      const userId = req.user?.id || null;
      const filename = exportService.generateFilename(report_type, format, userId);

      let filePath;
      try {
        if (format === 'excel') {
          filePath = await exportService.exportToExcel(reportData, filename);
        } else if (format === 'pdf') {
          filePath = await exportService.exportToPDF(reportData, filename);
        }
      } catch (error) {
        console.error('❌ Export Error:', error);
        return res.status(500).json({
          success: false,
          message: `Lỗi khi xuất file: ${error.message}`,
        });
      }

      const downloadUrl = exportService.getDownloadUrl(filename);

      res.json({
        success: true,
        message: 'Xuất báo cáo thành công',
        data: {
          filename,
          downloadUrl,
          reportType: report_type,
          format,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        },
      });
    } catch (error) {
      console.error('❌ Export Controller Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi không xác định khi xuất báo cáo',
      });
    }
  }

  async listExports(req, res) {
    try {
      const userId = req.user?.id || null;
      const files = await exportService.listFiles(userId);

      res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      console.error('❌ List Exports Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách file export',
      });
    }
  }

  async deleteExport(req, res) {
    try {
      const { filename } = req.params;
      if (!filename) {
        return res.status(400).json({
          success: false,
          message: 'Tên file là bắt buộc',
        });
      }

      await exportService.deleteFile(filename);

      res.json({
        success: true,
        message: 'Đã xóa file export',
      });
    } catch (error) {
      console.error('❌ Delete Export Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi xóa file',
      });
    }
  }

  async downloadFile(req, res) {
    try {
      const { filename } = req.params;

      if (!filename) {
        return res.status(400).json({
          success: false,
          message: 'Tên file là bắt buộc',
        });
      }

      const path = require('path');
      const fs = require('fs');
      const exportsDir = path.join(__dirname, '..', 'exports');
      const filePath = path.join(exportsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại hoặc đã bị xóa',
        });
      }

      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtimeMs;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (age > maxAge) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error('❌ Lỗi khi xóa file cũ:', error);
        }
        return res.status(410).json({
          success: false,
          message: 'File đã hết hạn và đã bị xóa',
        });
      }

      const ext = path.extname(filename).toLowerCase();
      const contentTypeMap = {
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.pdf': 'application/pdf',
      };
      const contentType = contentTypeMap[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error('❌ Download File Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tải file',
      });
    }
  }
}

module.exports = new ExportController();

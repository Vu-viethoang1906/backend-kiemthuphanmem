const backupService = require("../services/backup.service");

class BackupController {
  /**
   * Tạo backup thủ công
   */
  async createBackup(req, res) {
    try {
      const backup = await backupService.createBackup();
      res.status(201).json({
        success: true,
        message: "Backup được tạo thành công",
        data: backup,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi tạo backup",
        error: error.message,
      });
    }
  }

  /**
   * Lấy danh sách tất cả backup
   */
  async listBackups(req, res) {
    try {
      const backups = await backupService.listBackups();
      res.status(200).json({
        success: true,
        data: backups,
        total: backups.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách backup",
        error: error.message,
      });
    }
  }

  /**
   * Xóa backup
   */
  async deleteBackup(req, res) {
    try {
      const { backupName } = req.params;
      const result = await backupService.deleteBackup(backupName);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi xóa backup",
        error: error.message,
      });
    }
  }

  /**
   * Restore backup
   */
  async restoreBackup(req, res) {
    try {
      const { backupName } = req.params;
      const result = await backupService.restoreBackup(backupName);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi restore backup",
        error: error.message,
      });
    }
  }

  /**
   * Lấy thông tin backup
   */
  async getBackupInfo(req, res) {
    try {
      const { backupName } = req.params;
      const backups = await backupService.listBackups();
      const backup = backups.find((b) => b.name === backupName);

      if (!backup) {
        return res.status(404).json({
          success: false,
          message: "Backup không tồn tại",
        });
      }

      res.status(200).json({
        success: true,
        data: backup,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thông tin backup",
        error: error.message,
      });
    }
  }
}

module.exports = new BackupController();


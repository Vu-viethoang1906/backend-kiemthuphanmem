const importService = require('../services/import.service');
const multer = require('multer');
const path = require('path');

// Cấu hình multer cho file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép file CSV và Excel (.csv, .xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

class ImportController {
  // Import Task từ file - Story 27
  async importTasks(req, res) {
    try {
      const userId = req.user?.id;
      const { board_id, column_id } = req.body;
      const file = req.file;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      if (!file) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file để import' });
      }

      if (!board_id || !column_id) {
        return res.status(400).json({ success: false, message: 'board_id và column_id là bắt buộc' });
      }

      const result = await importService.importTasksFromFile(file.path, {
        board_id,
        column_id,
        user_id: userId
      });

      res.json({
        success: true,
        message: 'Import tasks thành công',
        data: {
          totalRows: result.totalRows,
          successCount: result.successCount,
          errorCount: result.errorCount,
          errors: result.errors,
          tasks: result.tasks
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lấy template file mẫu
  async getTemplate(req, res) {
    try {
      const templatePath = await importService.generateTemplateFile();
      
      res.download(templatePath, 'task-import-template.csv', (err) => {
        if (err) {
          res.status(500).json({ success: false, message: 'Lỗi khi tải template' });
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lấy lịch sử import
  async getImportHistory(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }

      const history = await importService.getImportHistory(userId);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = {
  controller: new ImportController(),
  upload: upload.single('file')
};

const express = require('express');
const scheduledReportController = require('../controllers/scheduledReport.controller');
const { authenticateAny } = require('../middlewares/auth');
const { checkBoardAccess } = require('../middlewares/boardAccess');

const router = express.Router();

// Middleware to check board access for create/update operations
const checkBoardAccessForReport = async (req, res, next) => {
  try {
    const { board_id } = req.body;
    if (board_id) {
      // Đảm bảo truyền board_id sang cả query và params để middleware downstream đọc được
      req.query = { ...(req.query || {}), board_id };
      req.params = { ...(req.params || {}), board_id };
      return checkBoardAccess(req, res, next);
    }
    // Nếu không có board_id trong body, bỏ qua check (sẽ được validate ở controller)
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi kiểm tra quyền truy cập board',
    });
  }
};

// All routes require authentication
router.post('/', authenticateAny, scheduledReportController.create);

router.get('/', authenticateAny, scheduledReportController.getAll);

router.get('/:id', authenticateAny, scheduledReportController.getById);

router.put('/:id', authenticateAny, checkBoardAccessForReport, scheduledReportController.update);

router.delete('/:id', authenticateAny, scheduledReportController.delete);

// Test endpoints - trigger processing manually
router.post('/process', authenticateAny, scheduledReportController.processAll);

router.post('/:id/send', authenticateAny, scheduledReportController.sendNow);

module.exports = router;

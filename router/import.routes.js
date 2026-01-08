const express = require('express');
const importController = require('../controllers/import.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');

const router = express.Router();

/**
 * Import Routes - Quản lý import tasks từ file
 * Tất cả routes đều cần authentication
 */

// ==================== AUTHENTICATED ROUTES ====================

// Import Task từ file - Story 27
router.post('/tasks', authenticateAny, importController.upload, importController.controller.importTasks);

// Lấy template file mẫu - Story 27
router.get('/template', authenticateAny, importController.controller.getTemplate);

// Lấy lịch sử import - Story 27
router.get('/history', authenticateAny, importController.controller.getImportHistory);

module.exports = router;

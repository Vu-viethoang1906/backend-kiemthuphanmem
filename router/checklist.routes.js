const express = require('express');
const checklistController = require('../controllers/checklist.controller');
const { authenticateAny } = require('../middlewares/auth');

const router = express.Router();

/**
 * Checklist Items Routes - Quản lý danh sách kiểm tra cho task
 */

// Lấy danh sách checklist items của task
router.get('/task/:taskId', authenticateAny, checklistController.getByTask);

// Tạo checklist item mới
router.post('/task/:taskId', authenticateAny, checklistController.create);

// Toggle completion status của checklist item
router.patch('/:checklistId/toggle', authenticateAny, checklistController.toggle);

// Cập nhật checklist item (title, is_completed)
router.put('/:checklistId', authenticateAny, checklistController.update);

// Xóa checklist item
router.delete('/:checklistId', authenticateAny, checklistController.delete);

// Cập nhật thứ tự checklist items
router.patch('/task/:taskId/reorder', authenticateAny, checklistController.reorder);

module.exports = router;

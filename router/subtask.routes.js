const express = require('express');
const subtaskController = require('../controllers/subtask.controller');
const { authenticateAny } = require('../middlewares/auth');

const router = express.Router();

/**
 * Subtask Routes - Quản lý subtask cho task
 */

// Lấy danh sách subtask của task
router.get('/task/:taskId', authenticateAny, subtaskController.getByTask);

// Tạo subtask mới
router.post('/task/:taskId', authenticateAny, subtaskController.create);

// Toggle completion status của subtask
router.patch('/:subtaskId/toggle', authenticateAny, subtaskController.toggle);

// Cập nhật subtask (title, description, assigned_to, priority, due_date, is_completed)
router.put('/:subtaskId', authenticateAny, subtaskController.update);

// Xóa subtask
router.delete('/:subtaskId', authenticateAny, subtaskController.delete);

// Cập nhật thứ tự subtasks
router.patch('/task/:taskId/reorder', authenticateAny, subtaskController.reorder);

module.exports = router;

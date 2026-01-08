const express = require('express');
const tagController = require('../controllers/tag.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');

const router = express.Router();

/**
 * Tag Routes - Quản lý tags
 * Tất cả routes đều cần authentication
 */

// ==================== AUTHENTICATED ROUTES ====================

// Tạo tag cho board- Story 44
router.post('/', authenticateAny, authorizeAny('admin System_Manager'), tagController.create);

// Lấy tất cả tags - Story 43
router.get('/', authenticateAny, tagController.getAll);

// Lấy tất cả tags của board
router.get('/board/:boardId', authenticateAny, tagController.getTagsByBoard);

// Lấy tag theo ID
router.get('/:id', authenticateAny, tagController.getById);

// Cập nhật tag - Story 45
router.put('/:id', authenticateAny, authorizeAny('admin', 'System_Manager'), tagController.update);

// Xóa tag - Story 46
router.delete('/:id', authenticateAny, authorizeAny('admin', 'System_Manager'), tagController.delete);

// ==================== TASK-TAG RELATIONSHIP ROUTES ====================

// Lấy tags của task - Story 20
router.get('/task/:taskId', authenticateAny, tagController.getByTask);

// Thêm tag vào task - Story 20
router.post('/task/:taskId/tag/:tagId', authenticateAny, tagController.addTagToTask);

// Xóa tag khỏi task - Story 20
router.delete('/task/:taskId/tag/:tagId', authenticateAny, tagController.removeTagFromTask);

module.exports = router;

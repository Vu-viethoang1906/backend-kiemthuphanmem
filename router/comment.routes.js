const express = require('express');
const commentController = require('../controllers/comment.controller');
const { authenticateAny } = require('../middlewares/auth');
const uploadCommentAttachment = require('../middlewares/commentUpload');
const router = express.Router();

/**
 * Comment Routes - Quản lý comments cho tasks
 * Tất cả routes đều cần authentication
 */

// ==================== AUTHENTICATED ROUTES ====================

// Tạo comment mới - Story 23
router.post('/', authenticateAny, commentController.create);

// Lấy comments của task - Story 23
router.get('/task/:taskId', authenticateAny, commentController.getByTask);

// 🆕 Lấy board members từ task_id để autocomplete @mentions
router.get('/task/:taskId/members', authenticateAny, commentController.getBoardMembersByTask);

// Lấy comment theo ID
router.get('/:id', authenticateAny, commentController.getById);

// Cập nhật comment - Story 23
router.put('/:id', authenticateAny, commentController.update);

// Xóa comment - Story 23
router.delete('/:id', authenticateAny, commentController.delete);

// Lấy comments của user hiện tại
router.get('/user/my', authenticateAny, commentController.getByUser);

// router upload file đính kèm
router.post(
  '/:commentId/attachment',
  authenticateAny,
  uploadCommentAttachment,
  commentController.uploadAttachment
);
// router lấy ulr của file comment
router.get('/:commentId/attachment', commentController.getAttachments);

// router xóa file đính kèm của comment
router.delete('/:commentId/attachment', authenticateAny, commentController.deleteAttachment);
router.get('/:boardId/Collaboration', authenticateAny, commentController.Collaboration);

module.exports = router;

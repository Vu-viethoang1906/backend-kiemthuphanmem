const express = require('express');
const aiController = require('../controllers/AI.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');
const { checkBoardAccess } = require('../middlewares/boardAccess');

const router = express.Router();

/**
 * AI Task Matching Routes
 * Tất cả routes đều cần authentication và board access
 */

// Suggest best users for task assignment
// POST /ai/tasks/:taskId/suggest-assignments?board_id=xxx&limit=5
router.post(
  '/tasks/:taskId/suggest-assignments',
  authenticateAny,
  checkBoardAccess,
  aiController.suggestAssignments
);

// Auto-assign task to best matching user
// POST /ai/tasks/:taskId/auto-assign?board_id=xxx
router.post(
  '/tasks/:taskId/auto-assign',
  authenticateAny,
  checkBoardAccess,
  aiController.autoAssignTask
);

// Suggest due date for a task
// POST /ai/tasks/:taskId/suggest-due-date?board_id=xxx
router.post(
  '/tasks/:taskId/suggest-due-date',
  authenticateAny,
  checkBoardAccess,
  aiController.suggestDueDate
);

// Suggest tags for a task
// POST /ai/tasks/:taskId/suggest-tags?board_id=xxx&limit=5
router.post(
  '/tasks/:taskId/suggest-tags',
  authenticateAny,
  checkBoardAccess,
  aiController.suggestTags
);

// Auto apply tags for a task
// POST /ai/tasks/:taskId/auto-tags?board_id=xxx&limit=5
router.post(
  '/tasks/:taskId/auto-tags',
  authenticateAny,
  checkBoardAccess,
  aiController.autoApplyTags
);

module.exports = router;

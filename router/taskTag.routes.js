const express = require('express');
const router = express.Router();
const taskTagController = require('../controllers/taskTag.controller');
const { authenticateAny } = require('../middlewares/auth');

// 🔹 Gắn tag vào task
router.post('/', authenticateAny, taskTagController.addTag);

// 🔹 Lấy danh sách tag theo task
router.get('/task/:taskId', authenticateAny, taskTagController.getTagsByTask);

// 🔹 Lấy danh sách task theo tag
router.get('/tag/:tagId', authenticateAny, taskTagController.getTasksByTag);

// 🔹 Gỡ tag khỏi task
router.delete('/', authenticateAny, taskTagController.removeTag);

module.exports = router;

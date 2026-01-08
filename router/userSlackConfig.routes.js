const express = require('express');
const router = express.Router();
const { authenticateAny } = require('../middlewares/auth');
const userSlackConfigController = require('../controllers/userSlackConfig.controller');
// Lấy config Slack của user hiện tại
router.get(
  '/config',
  authenticateAny,
  userSlackConfigController.getMyConfig
);

// Cập nhật config Slack của user
router.put(
  '/config',
  authenticateAny,
  userSlackConfigController.updateMyConfig
);

// Bật/tắt thông báo Slack
router.put(
  '/config/toggle',
  authenticateAny,
  userSlackConfigController.toggleNotifications
);

// Test webhook URL
router.post(
  '/config/test',
  authenticateAny,
  userSlackConfigController.testWebhook
);

// Xóa config Slack của user
router.delete(
  '/config',
  authenticateAny,
  userSlackConfigController.deleteMyConfig
);

module.exports = router;


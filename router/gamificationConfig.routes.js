const express = require("express");
const gamificationConfigController = require("../controllers/gamificationConfig.controller");
const { authenticateAny, authorizeAny } = require("../middlewares/auth");

const router = express.Router();

/**
 * Gamification Config Routes - Quản lý bật/tắt tính năng gamification
 * Chỉ Admin và System_Manager mới có quyền
 */

// ==================== GET ROUTES ====================

// Lấy cấu hình gamification (mọi user đã đăng nhập đều xem được)
router.get(
  "/",
  authenticateAny,
  gamificationConfigController.getConfig
);

// ==================== ADMIN ROUTES ====================

// Bật gamification
router.post(
  "/enable",
  authenticateAny,
  authorizeAny("admin System_Manager"),
  gamificationConfigController.enable
);

// Tắt gamification
router.post(
  "/disable",
  authenticateAny,
  authorizeAny("admin System_Manager"),
  gamificationConfigController.disable
);

// Toggle gamification (bật/tắt)
router.post(
  "/toggle",
  authenticateAny,
  authorizeAny("admin System_Manager"),
  gamificationConfigController.toggle
);

// Cập nhật điểm thưởng
router.put(
  "/points",
  authenticateAny,
  authorizeAny("admin System_Manager"),
  gamificationConfigController.updatePoints
);

module.exports = router;


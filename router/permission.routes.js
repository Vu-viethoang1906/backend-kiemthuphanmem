// router/permission.routes.js
const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permission.controller");
const { authenticateAny, authorizeAny } = require("../middlewares/auth");

// ==================== PERMISSION ROUTES ====================

// Tạo permission mới (chỉ admin / manage permission)
router.post(
  "/",
  authenticateAny,

  permissionController.create
);

// Lấy tất cả permission (xem permission)
router.get(
  "/",
  authenticateAny,

  permissionController.getAll
);

// Lấy permission theo ID
router.get(
  "/:id",
  authenticateAny,

  permissionController.getById
);

// Cập nhật permission (chỉ admin / manage permission)
router.put(
  "/:id",
  authenticateAny,

  permissionController.update
);

// Xóa permission (chỉ admin / manage permission)
router.delete(
  "/:id",
  authenticateAny,

  permissionController.delete
);

module.exports = router;

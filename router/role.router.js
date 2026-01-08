const express = require("express");
const roleController = require("../controllers/role.controller");
const { authenticateAny, authorizeAny } = require("../middlewares/auth");

const router = express.Router();

/**
 * Role Router - Định nghĩa các routes cho Role management
 * Base path: /api/role
 */

// ==================== PUBLIC ROUTES ====================

// Lấy role của user hiện tại
router.get(
  "/my-role",
  authenticateAny,
  authorizeAny("ROLE_VIEW"),
  roleController.getUserRole
);

// ==================== ADMIN / PERMISSION ROUTES ====================

// Lấy tất cả roles
router.get(
  "/",
  authenticateAny,
  authorizeAny("ROLE_VIEW"),
  roleController.getAllRoles
);

// Lấy role theo tên
router.get(
  "/name/:name",
  authenticateAny,
  authorizeAny("ROLE_VIEW"),
  roleController.getRoleByName
);

// Lấy role theo ID
router.get(
  "/:id",
  authenticateAny,
  authorizeAny("ROLE_VIEW"),
  roleController.getRoleById
);

// Tạo role mới
router.post(
  "/",
  authenticateAny,
  authorizeAny("ROLE_CREATE"),
  roleController.createRole
);

// Cập nhật role
router.put(
  "/:id",
  authenticateAny,
  authorizeAny("ROLE_UPDATE"),
  roleController.updateRole
);

// Xóa role
router.delete(
  "/:id",
  authenticateAny,
  authorizeAny("ROLE_DELETE"),
  roleController.deleteRole
);

module.exports = router;

const express = require("express");
const router = express.Router();
const rolePermissionController = require("../controllers/rolePermission.controller");
const { authenticateAny, authorizeAny } = require("../middlewares/auth");
// Tạo liên kết role - permission
router.post("/", rolePermissionController.create);

// Lấy tất cả
router.get(
  "/",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_ALL_PERMISSION ROLE_VIEW"),
  rolePermissionController.getAll
);

// Lấy theo ID
router.get(
  "/:id",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_ALL_PERMISSION ROLE_VIEW"),
  rolePermissionController.getById
);

// Lấy danh sách permission theo role
router.get(
  "/role/:roleId",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_ALL_PERMISSION ROLE_VIEW"),
  authenticateAny,
  rolePermissionController.getByRole
);

// Cập nhật permisson cho từng người dùng
router.put(
  "/RolePermission",
  authenticateAny,
  authorizeAny("admin System_Manager UPDATE_PERMISSION ROLE_EDIT"),
  authenticateAny,
  rolePermissionController.update
);

// cập nhất permission cho role theo id role
router.put(
  "/updatePermisson",
  authenticateAny,
  authorizeAny("admin System_Manager UPDATE_PERMISSION ROLE_EDIT"),
  authenticateAny,
  rolePermissionController.updatePermisson
);

// Xóa
router.delete(
  "/:id",
  authenticateAny,
  authorizeAny(
    "admin System_Manager ROLE_DELETE DELETE_PERMISSION ROLE_DELETE"
  ),
  rolePermissionController.delete
);
// lấy danh sách tên permission theo tên role
router.get(
  "/nameRole/:name",
  authenticateAny,
  authorizeAny(
    "admin System_Manager VIEW_ALL_PERMISSION ROLE_VIEW VIEW_ALL_PERMISSION"
  ),
  rolePermissionController.getPermissionsByNameRole
);
module.exports = router;

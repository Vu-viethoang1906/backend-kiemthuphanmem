const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticateAny, authorizeAny, adminAny } = require('../middlewares/auth');

const router = express.Router();

router.post('/getprofile', authenticateAny, userController.viewProfile);

router.get('/myRoles', authenticateAny, (req, res) => {
  res.json({
    email: req.user.email,
    username: req.user.username,
    roles: req.user.roles || [req.user.role],
  });
});

router.get('/me', authenticateAny, userController.getMe);

// Cập nhật profile chính mình
router.put('/me', authenticateAny, userController.updateMyProfile);

// Đổi mật khẩu
router.put('/change-password', authenticateAny, userController.changePassword);

// Lấy user theo email / name (cụ thể)
router.get('/email/:email', authenticateAny, userController.getByEmail);
router.get('/name/:name', authenticateAny, userController.getByName);
router.get(
  '/phone/:numberphone',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  userController.getByNumberPhone
);

// Keycloak CRUD routes
router.put('/keycloak/:id', authenticateAny, userController.updateKeycloakUser);
router.get('/keycloak', authenticateAny, userController.getAllKeycloakUsers);
router.get('/keycloak/id/:id', authenticateAny, userController.getKeycloakUserById);
router.get('/keycloak/username/:username', authenticateAny, userController.getKeycloakUserByName);
router.get('/keycloak/email/:email', authenticateAny, userController.getKeycloakUserByMail);
router.post('/keycloak', authenticateAny, userController.createKeycloakUser);
router.post('/keycloak/createUserPass', authenticateAny, userController.createKeycloakUserPassword);
router.delete('/keycloak/:id', authenticateAny, userController.deleteKeycloakUser);
router.post('/cloneUser', userController.cloneUser);

// ==================== ADMIN ONLY ROUTES ====================

// Lấy toàn bộ user (chỉ admin)
router.get(
  '/selectAll',
  authenticateAny,
  authorizeAny('System_Manager USER_VIEW_ALL'),
  userController.SelectAll
);

// tìm kiếm người dùng theo tên hoặc mail gần đúng
router.get('/findUsers', userController.findUsers);

router.get(
  '/admin/deleted',
  authenticateAny,
  authorizeAny('System_Manager USER_VIEW_ALL'),
  userController.getAllDeletedRecords
);

router.get('/search', authenticateAny, userController.searchUsers);
// Lấy user theo ID (admin hoặc chính mình)
router.get(
  '/:id',
  authenticateAny,
  authorizeAny('VIEW_ALL VIEW_USER USER_VIEW_ALL System_Manager'),
  userController.getById
);

// Tạo mới user (chỉ admin)
router.post(
  '/',
  authenticateAny,
  authorizeAny('USER_CREATE System_Manager admin'),
  userController.create
);

// Cập nhật user (admin hoặc chính mình)
router.put(
  '/:id',
  authenticateAny,
  authorizeAny('USER_CREATE System_Manager admin'),
  userController.update
);

// Xóa user (chỉ admin)
router.delete(
  '/:id',
  authenticateAny,
  authorizeAny('USER_DELETE System_Manager admin'),
  userController.delete
);

// Soft delete user (chỉ admin)
router.delete(
  '/soft/:id',
  authenticateAny,
  authorizeAny('System_Manager admin'),
  userController.softDelete
);

// Restore user (chỉ admin)
router.put(
  '/restore/:id',
  authenticateAny,
  authorizeAny('System_Manager admin'),
  userController.restore
);

// Get all users with deleted (admin hoặc System_Manager)
router.get(
  '/admin/with-deleted',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  userController.getAllWithDeleted
);

// Get all deleted records (admin hoặc System_Manager)
router.get(
  '/admin/deleted',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  userController.getAllDeletedRecords
);

module.exports = router;

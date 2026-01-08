'use strict';

const express = require('express');
const router = express.Router();

const sidebarItemController = require('../controllers/sidebarItem.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');
const { uploadSidebarIcon } = require('../config/multer');
const {
  validateSidebarItem,
  validateSidebarItemUpdate,
  validateBasicSidebarUpdate,
} = require('../validations/sidebarItem.validation');

// =============================
// PUBLIC ROUTES
// =============================

// Lấy menu theo type
router.get('/menu/:menuType', sidebarItemController.getMenuItems);

// Lấy sidebar basic info (tất cả user đăng nhập)
router.get('/basic', authenticateAny, sidebarItemController.getSidebarConfig);

// =============================
// ADMIN ROUTES (ADMIN ONLY)
// =============================

// Lấy tất cả item
router.get('/', authenticateAny, authorizeAny('System_Manager'), sidebarItemController.getAllItems);

// Update basic info
router.put(
  '/basic/:key',
  authenticateAny,
  authorizeAny('System_Manager'),
  validateBasicSidebarUpdate,
  sidebarItemController.updateBasicItem
);

// Upload icon cho basic item
router.post(
  '/basic/:key/icon',
  authenticateAny,
  authorizeAny('System_Manager'),

  uploadSidebarIcon.single('icon'),
  sidebarItemController.uploadBasicIcon
);

// Create sidebar item
router.post(
  '/',
  authenticateAny,
  authorizeAny('System_Manager'),

  validateSidebarItem,
  sidebarItemController.createItem
);

// Update order của menu
router.put(
  '/:menuType/order',
  authenticateAny,
  authorizeAny('System_Manager'),
  sidebarItemController.updateMenuOrder
);

// Update item
router.put(
  '/:id',
  authenticateAny,
  authorizeAny('System_Manager'),
  validateSidebarItemUpdate,
  sidebarItemController.updateItem
);

// Delete item
router.delete(
  '/:id',
  authenticateAny,
  authorizeAny('System_Manager'),
  sidebarItemController.deleteItem
);

module.exports = router;

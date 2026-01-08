const express = require("express");
const router = express.Router();
const templateSwimlaneController = require("../controllers/templateSwimlane.controller");
const { authenticateAny, authorizeAny } = require('../middlewares/auth');

// CRUD routes với kiểm soát quyền
router.post(
  "/", 
  authenticateAny, 
  authorizeAny('TEMPLATE_CREATE'), // chỉ user có quyền TEMPLATE_CREATE mới được tạo
  (req, res) => templateSwimlaneController.create(req, res)
);

router.get(
  "/", 
  authenticateAny, 
  authorizeAny('TEMPLATE_CREATE TEMPLATE_VIEW'), // quyền xem tất cả template swimlane
  (req, res) => templateSwimlaneController.getAll(req, res)
);

router.get(
  "/template/:templateId", 
  authenticateAny, 
  authorizeAny('TEMPLATE_CREATE TEMPLATE_UPDATE'), 
  (req, res) => templateSwimlaneController.getByTemplate(req, res)
);

router.get(
  "/:id", 
  authenticateAny, 
  authorizeAny('TEMPLATE_CREATE TEMPLATE_UPDATE'), 
  (req, res) => templateSwimlaneController.getById(req, res)
);

router.put(
  "/:id", 
  authenticateAny, 
  authorizeAny('TEMPLATE_UPDATE TEMPLATE_DELETE'), // chỉ user có quyền TEMPLATE_EDIT mới được cập nhật
  (req, res) => templateSwimlaneController.update(req, res)
);

router.delete(
  "/:id", 
  authenticateAny, 
  authorizeAny('TEMPLATE_UPDATE'), // nếu muốn riêng quyền xóa, tạo TEMPLATE_DELETE
  (req, res) => templateSwimlaneController.delete(req, res)
);

module.exports = router;

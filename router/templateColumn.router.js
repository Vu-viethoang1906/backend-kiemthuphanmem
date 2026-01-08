const express = require('express');
const router = express.Router();
const templateColumnController = require('../controllers/templateColumn.controller');
const { authenticateAny } = require('../middlewares/auth');

// CRUD routes
router.post("/", authenticateAny, (req, res) => templateColumnController.create(req, res));
router.get("/", authenticateAny, (req, res) => templateColumnController.getAll(req, res));
router.get("/template/:templateId", authenticateAny, (req, res) => templateColumnController.getByTemplate(req, res));
router.get("/:id", authenticateAny, (req, res) => templateColumnController.getById(req, res));
router.put("/:id", authenticateAny, (req, res) => templateColumnController.update(req, res));
router.delete("/:id", authenticateAny, (req, res) => templateColumnController.delete(req, res));

module.exports = router;



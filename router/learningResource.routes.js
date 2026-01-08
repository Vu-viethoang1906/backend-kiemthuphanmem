const express = require('express');
const router = express.Router();
const learningResourceController = require('../controllers/learningResource.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');

// Public routes (authenticated users)
router.get('/', authenticateAny, (req, res) => learningResourceController.getAll(req, res));
router.get('/:id', authenticateAny, (req, res) => learningResourceController.getById(req, res));
router.post('/recommend-for-task', authenticateAny, (req, res) => learningResourceController.recommendForTask(req, res));

// Admin routes (create, update, delete)
router.post('/', authenticateAny, authorizeAny('admin System_Manager'), (req, res) => learningResourceController.create(req, res));
router.put('/:id', authenticateAny, authorizeAny('admin System_Manager'), (req, res) => learningResourceController.update(req, res));
router.delete('/:id', authenticateAny, authorizeAny('admin System_Manager'), (req, res) => learningResourceController.delete(req, res));

module.exports = router;


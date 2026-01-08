const express = require('express');
const router = express.Router();
const { authenticateAny ,authorizeAny } = require('../middlewares/auth');
const templateController = require('../controllers/template.controller');
const templateColumnRouter = require('./templateColumn.router');
const templateSwimlaneRouter = require('./templateSwimlane.router');

// List templates
router.get('/', authenticateAny, authorizeAny('TEMPLATE_VIEW'), templateController.list);

// Create template
router.post('/', authenticateAny,authorizeAny('TEMPLATE_CREATE') , templateController.create);

// Get template by id
router.get('/:id', authenticateAny,authorizeAny('TEMPLATE_VIEW'), templateController.getById);

// Update template
router.put('/:id', authenticateAny, authorizeAny('TEMPLATE_UPDATE') ,templateController.update);

// Delete template
router.delete('/:id', authenticateAny,authorizeAny('TEMPLATE_DELETE') , templateController.remove);

// Nested routes - phải đặt sau các routes chính
router.use('/:template_id/columns', templateColumnRouter);
router.use('/:template_id/swimlanes', templateSwimlaneRouter);

module.exports = router;



const express = require('express');
const router = express.Router();
const columnController = require('../controllers/column.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');
const { route } = require('./user.routes');
router.put(
  '/board/:idBoard/isdoneColumn/:idcolumn',
  authenticateAny,
  authorizeAny('BOARD_UPDATE'),
  columnController.ColumnIsDone
);
router.post('/', authenticateAny, columnController.create);
router.get('/:id', authenticateAny, columnController.getOne);
router.get('/board/:boardId', authenticateAny, columnController.getByBoard);
router.put('/:id', authenticateAny, columnController.update);
router.delete('/:id', authenticateAny, columnController.delete);
router.put('/:id/move', authenticateAny, columnController.move);
router.put('/board/:boardId/reorder', authenticateAny, columnController.reorder);

module.exports = router;

const express = require('express');
const exportController = require('../controllers/export.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');
const { checkBoardAccess } = require('../middlewares/boardAccess');

const router = express.Router();

const conditionalBoardAccess = async (req, res, next) => {
  const { report_type, board_id } = req.query;

  if (['dashboard', 'velocity', 'center_comparison'].includes(report_type) && board_id) {
    return checkBoardAccess(req, res, next);
  }

  next();
};

router.get('/export', authenticateAny, conditionalBoardAccess, exportController.exportReport);
router.get('/exports/list', authenticateAny, exportController.listExports);
router.delete('/exports/:filename', authenticateAny, exportController.deleteExport);

router.get('/exports/:filename', authenticateAny, exportController.downloadFile);

module.exports = router;

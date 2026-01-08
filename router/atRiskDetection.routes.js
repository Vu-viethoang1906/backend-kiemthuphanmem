const express = require('express');
const router = express.Router();
const atRiskDetectionController = require('../controllers/atRiskDetection.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');

router.post(
  '/detect',
  authenticateAny,
  authorizeAny('VIEW_BOARD admin System_Manager'),
  atRiskDetectionController.detectAtRiskTasks
);

router.get(
  '/board/:board_id',
  authenticateAny,
  authorizeAny('VIEW_BOARD admin System_Manager'),
  atRiskDetectionController.getAtRiskTasksByBoard
);

router.get(
  '/user',
  authenticateAny,
  authorizeAny('VIEW_BOARD admin System_Manager'),
  atRiskDetectionController.getAtRiskTasksByUser
);

router.get(
  '/user/:user_id',
  authenticateAny,
  authorizeAny('VIEW_BOARD admin System_Manager'),
  atRiskDetectionController.getAtRiskTasksByUser
);

router.put(
  '/resolve/:task_id',
  authenticateAny,
  authorizeAny('VIEW_BOARD admin System_Manager'),
  atRiskDetectionController.markAsResolved
);

module.exports = router;

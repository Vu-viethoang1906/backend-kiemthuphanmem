const express = require('express');
const router = express.Router();
const { authenticateAny } = require('../middlewares/auth');
const boardSlackConfigController = require('../controllers/boardSlackConfig.controller');
router.get(
  '/:board_id/config',
  authenticateAny,
  boardSlackConfigController.getBoardConfig
);
router.put(
  '/:board_id/config',
  authenticateAny,
  boardSlackConfigController.updateBoardConfig
);

router.put(
  '/:board_id/config/toggle',
  authenticateAny,
  boardSlackConfigController.toggleNotifications
);
router.post(
  '/:board_id/config/test',
  authenticateAny,
  boardSlackConfigController.testWebhook
);
router.delete(
  '/:board_id/config',
  authenticateAny,
  boardSlackConfigController.deleteBoardConfig
);

module.exports = router;


const express = require('express');
const router = express.Router();
const sprintForecastController = require('../controllers/sprintForecast.controller');
const { authenticateAny } = require('../middlewares/auth');
const { checkBoardAccess } = require('../middlewares/boardAccess');

router.get(
  '/board/:board_id/forecast',
  authenticateAny,
  checkBoardAccess,
  sprintForecastController.getForecast
);

module.exports = router;

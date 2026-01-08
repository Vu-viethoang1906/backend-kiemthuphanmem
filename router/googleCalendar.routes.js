const express = require('express');
const googleCalendarController = require('../controllers/googleCalendar.controller');
const { authenticateAny } = require('../middlewares/auth');

const router = express.Router();

router.get('/auth/url', authenticateAny, googleCalendarController.getAuthUrl);

router.get('/auth/callback', googleCalendarController.handleCallback);

router.get('/status', authenticateAny, googleCalendarController.getStatus);

router.post('/sync/enable', authenticateAny, googleCalendarController.enableSync);

router.post('/sync/disable', authenticateAny, googleCalendarController.disableSync);

router.post('/sync/task/:taskId', authenticateAny, googleCalendarController.syncTask);

router.post('/sync/all', authenticateAny, googleCalendarController.syncAll);

router.post('/unsync/all', authenticateAny, googleCalendarController.unsyncAll);

module.exports = router;


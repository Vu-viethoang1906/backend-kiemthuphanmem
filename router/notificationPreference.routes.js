const express = require('express');
const notificationPreferenceController = require('../controllers/notificationPreference.controller');
const { authenticateAny } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateAny, notificationPreferenceController.getPreferences);
router.put('/', authenticateAny, notificationPreferenceController.updatePreferences);
router.get(
  '/activity-pattern',
  authenticateAny,
  notificationPreferenceController.getActivityPattern
);
router.post('/analyze-activity', authenticateAny, notificationPreferenceController.analyzeActivity);

module.exports = router;

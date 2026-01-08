const express = require('express');
const router = express.Router();
const adaptiveGamificationController = require('../controllers/adaptiveGamification.controller');
const badgeController = require('../controllers/badge.controller');
const { authenticateAny } = require('../middlewares/auth');

// Main dashboard - API chính, trả về tất cả thông tin
router.get('/', authenticateAny, adaptiveGamificationController.getDashboard);

// Behavior tracking
router.post('/track-behavior', authenticateAny, adaptiveGamificationController.trackBehavior);
router.get('/track-behavior', authenticateAny, adaptiveGamificationController.trackBehavior);

// Analysis
router.post('/analyze', authenticateAny, adaptiveGamificationController.analyze);
router.get('/analyze', authenticateAny, adaptiveGamificationController.analyze);

// Motivation Profile
router.get('/profile', authenticateAny, adaptiveGamificationController.getProfile);
router.put('/profile', authenticateAny, adaptiveGamificationController.updateProfile);

// Personalized Gamification
router.get('/personalized', authenticateAny, adaptiveGamificationController.getPersonalizedDashboard);

// Behavior Analytics & Stats
router.get('/behavior/analytics', authenticateAny, adaptiveGamificationController.getBehaviorAnalytics);
router.get('/behavior/stats', authenticateAny, adaptiveGamificationController.getBehaviorStats);

// Reward Adjustment
router.post('/adjust-rewards', authenticateAny, adaptiveGamificationController.adjustRewards);

// Badges Management
router.get('/badges', authenticateAny, badgeController.getAllBadges);
router.post('/badges', authenticateAny, badgeController.createBadge);
router.get('/badges/:id', authenticateAny, badgeController.getBadgeById);
router.put('/badges/:id', authenticateAny, badgeController.updateBadge);
router.delete('/badges/:id', authenticateAny, badgeController.deleteBadge);

module.exports = router;



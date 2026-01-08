const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPath.controller');
const { authenticateAny } = require('../middlewares/auth');

router.get('/', authenticateAny, learningPathController.getLearningPath);
router.post('/generate', authenticateAny, learningPathController.generateLearningPath);
router.get('/skills', authenticateAny, learningPathController.getSkills);
router.get('/recommendations', authenticateAny, learningPathController.getRecommendations);
router.post('/recommendations/:id/accept', authenticateAny, learningPathController.acceptRecommendation);
router.get('/progress', authenticateAny, learningPathController.getProgress);
router.put('/stage/:stageNumber/complete', authenticateAny, learningPathController.completeStage);

module.exports = router;


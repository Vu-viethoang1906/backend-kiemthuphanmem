const express = require('express');
const router = express.Router();
const nlpController = require('../controllers/nlp.controller');
const { authenticateAny } = require('../middlewares/auth');

router.post('/parse', authenticateAny, (req, res) => nlpController.parse(req, res));
router.post('/propose', authenticateAny, (req, res) => nlpController.propose(req, res));
router.post('/recommend', authenticateAny, (req, res) => nlpController.recommend(req, res));
router.post('/summarize', authenticateAny, (req, res) => nlpController.summarize(req, res));
module.exports = router;

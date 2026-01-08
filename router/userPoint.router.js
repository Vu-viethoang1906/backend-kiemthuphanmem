const express = require('express');
const userPointController = require('../controllers/userPoint.controller');

const router = express.Router();
const { authenticateAny, authorizeAny } = require('../middlewares/auth');


router.get('/', authenticateAny, authorizeAny('admin System_Manager'), userPointController.getAllUserPoints);
router.get('/user/:userId', authenticateAny, userPointController.getByUser);
router.get('/user/:userId/center/:centerId', authenticateAny, userPointController.getByUserAndCenter);
router.post('/', authenticateAny, authorizeAny('admin System_Manager'), userPointController.createUserPoint);
router.put('/:id', authenticateAny, authorizeAny('admin System_Manager'), userPointController.updateUserPoint);
router.delete('/:id', authenticateAny, authorizeAny('admin System_Manager'), userPointController.deleteUserPoint);

module.exports = router;

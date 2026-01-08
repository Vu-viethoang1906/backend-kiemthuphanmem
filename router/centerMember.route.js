const express = require('express');
const router = express.Router();
const centerMemberController = require('../controllers/centerMember.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');
router.post('/', authenticateAny , centerMemberController.addMember);
router.get('/my-centers', authenticateAny, centerMemberController.getCentersByUser);
router.get('/:center_id/members',authenticateAny , centerMemberController.getMembersByCenter);
router.delete('/:id', authenticateAny, centerMemberController.removeMember);
router.get('/', authenticateAny , centerMemberController.getAll)
module.exports = router;

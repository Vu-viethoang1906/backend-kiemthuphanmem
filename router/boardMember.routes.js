const express = require("express");
const router = express.Router();
const boardMemberController = require("../controllers/boardMember.controller");
const { authenticateAny, authorizeAny } = require('../middlewares/auth');


router.get(
  "/all",
  authenticateAny,
  authorizeAny('admin System_Manager VIEW_ALL_BOARD VIEW_BOARD'), 
  boardMemberController.selectAll
);


router.get(
  "/board/:board_id",
  authenticateAny,
  authorizeAny('System_Manager admin VIEW_ALL_BOARD  VIEW_BOARD'), 
  boardMemberController.getMembers
);

router.post(
  "/board/:board_id",
  authenticateAny,
  authorizeAny('BOARD_MANAGE_MEMBERS admin System_Manager BOARD_UPDATE '), 
  boardMemberController.addMember
);
router.put(
  "/board/:board_id/user/:user_id",
  authenticateAny,
  authorizeAny('BOARD_MANAGE_MEMBERS System_Manager admin BOARD_UPDATE' ), 
  boardMemberController.updateRole
);
router.delete(
  "/board/:board_id/user/:user_id",
  authenticateAny,
  authorizeAny('BOARD_MANAGE_MEMBERS System_Manager admin'), 
  boardMemberController.removeMember
);
router.get(
  "/user/boards",
  authenticateAny,
  authorizeAny('VIEW_BOARD System_Manager admin'), 
  boardMemberController.getBoardsByUser
);

module.exports = router;

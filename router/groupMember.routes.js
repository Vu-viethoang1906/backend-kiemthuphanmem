const express = require("express");
const router = express.Router();
const groupMemberController = require("../controllers/groupMember.controller");
const { authenticateAny ,authorizeAny} = require("../middlewares/auth");

// Thêm thành viên vào group (1 hoặc nhiều thành viên)
router.post("/", authenticateAny, authorizeAny('admin System_Manager UPDATE_GROUP' ),groupMemberController.addMember);

// Lấy danh sách thành viên trong group
router.post("/list",authenticateAny, authorizeAny('admin System_Manager VIEW_GROUP' ), groupMemberController.getMembers);

// Lấy danh sách thành viên theo group_id
router.get("/:group_id", authenticateAny, authorizeAny('admin System_Manager VIEW_GROUP' ),groupMemberController.getMembersByGroup);

// Cập nhật thông tin thành viên (bao gồm role)
router.put("/member", authenticateAny, authorizeAny('admin System_Manager UPDATE_GROUP' ),groupMemberController.updateMember);

// Xóa thành viên
router.delete("/", authenticateAny, authorizeAny('admin System_Manager UPDATE_GROUP' ),groupMemberController.removeMember);

// Xóa thành viên (Admin hệ thống)
router.delete("/admin", authenticateAny, authorizeAny('admin System_Manager DELETE_GROUP' ),groupMemberController.adminRemoveMember);

// kiểm tra mình đang ở group nào


// xem bảng groupmember (admin only)
router.get("/admin/all", authenticateAny, authorizeAny('admin System_Manager ' ), groupMemberController.selectAll);

//
router.post("/getGroupUser",authenticateAny , authorizeAny('admin System_Manager VIEW_GROUP' ), groupMemberController.selecGroupUser);
module.exports = router;

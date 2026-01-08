const express = require("express");
const router = express.Router();
const backupController = require("../controllers/backup.controller");
const { authenticateAny, authorizeAny } = require("../middlewares/auth");

// Tất cả các route đều yêu cầu authentication và quyền admin hoặc System_Manager
router.use(authenticateAny);
router.use(authorizeAny("admin", "System_Manager"));

// Tạo backup thủ công
router.post("/create", backupController.createBackup.bind(backupController));

// Lấy danh sách tất cả backup
router.get("/list", backupController.listBackups.bind(backupController));

// Lấy thông tin một backup cụ thể
router.get("/:backupName", backupController.getBackupInfo.bind(backupController));

// Restore backup
router.post("/restore/:backupName", backupController.restoreBackup.bind(backupController));

// Xóa backup
router.delete("/:backupName", backupController.deleteBackup.bind(backupController));

module.exports = router;


const express = require("express");
const router = express.Router();
const deploymentController = require("../controllers/deployment.controller");
const { authenticateAny, authorizeAny } = require("../middlewares/auth");

// Tất cả các route đều yêu cầu authentication và quyền admin hoặc System_Manager
router.use(authenticateAny);
router.use(authorizeAny("admin System_Manager"));

// Lấy version hiện tại đang chạy trên production
router.get("/current-version", deploymentController.getCurrentVersion.bind(deploymentController));

// Lấy deployment hiện tại đang chạy trên production
router.get(
  "/current-production",
  deploymentController.getCurrentProductionDeployment.bind(deploymentController)
);

// Lấy lịch sử deployment
router.get("/history", deploymentController.getDeploymentHistory.bind(deploymentController));

// Lấy thống kê deployment
router.get("/stats", deploymentController.getDeploymentStats.bind(deploymentController));

// Lấy thông tin một deployment cụ thể
router.get("/:deploymentId", deploymentController.getDeploymentById.bind(deploymentController));

// Tạo deployment record mới (thường được gọi từ CI/CD)
router.post("/create", deploymentController.createDeployment.bind(deploymentController));

// Cập nhật status của deployment
router.patch(
  "/:deploymentId/status",
  deploymentController.updateDeploymentStatus.bind(deploymentController)
);

module.exports = router;


const deploymentService = require("../services/deployment.service");

class DeploymentController {
  /**
   * Lấy version hiện tại đang chạy trên production
   */
  async getCurrentVersion(req, res) {
    try {
      const currentVersion = await deploymentService.getCurrentVersion();
      const buildInfo = await deploymentService.getBuildInfo();
      const currentDeployment = await deploymentService.getCurrentProductionDeployment();

      res.status(200).json({
        success: true,
        data: {
          version: currentVersion.version,
          source: currentVersion.source,
          build_info: buildInfo,
          deployment: currentDeployment,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy version hiện tại",
        error: error.message,
      });
    }
  }

  /**
   * Lấy lịch sử deployment
   */
  async getDeploymentHistory(req, res) {
    try {
      const {
        environment,
        status,
        limit = 50,
        skip = 0,
        sortBy = "deployed_at",
        sortOrder = "desc",
      } = req.query;

      const result = await deploymentService.getDeploymentHistory({
        environment,
        status,
        limit: parseInt(limit),
        skip: parseInt(skip),
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        data: result.deployments,
        pagination: {
          total: result.total,
          limit: result.limit,
          skip: result.skip,
          hasMore: result.skip + result.deployments.length < result.total,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy lịch sử deployment",
        error: error.message,
      });
    }
  }

  /**
   * Lấy thông tin một deployment cụ thể
   */
  async getDeploymentById(req, res) {
    try {
      const { deploymentId } = req.params;
      const deployment = await deploymentService.getDeploymentById(deploymentId);

      res.status(200).json({
        success: true,
        data: deployment,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || "Deployment không tồn tại",
      });
    }
  }

  /**
   * Tạo deployment record mới (thường được gọi từ CI/CD hoặc manual)
   */
  async createDeployment(req, res) {
    try {
      const deploymentData = {
        ...req.body,
        deployed_by: req.user?.id,
        deployed_by_username: req.user?.username,
      };

      const deployment = await deploymentService.createDeployment(deploymentData);

      res.status(201).json({
        success: true,
        message: "Deployment record đã được tạo",
        data: deployment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi tạo deployment record",
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật status của deployment
   */
  async updateDeploymentStatus(req, res) {
    try {
      const { deploymentId } = req.params;
      const { status, notes } = req.body;

      if (!status || !["success", "failed", "in_progress", "rolled_back"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status không hợp lệ",
        });
      }

      const deployment = await deploymentService.updateDeploymentStatus(
        deploymentId,
        status,
        notes
      );

      res.status(200).json({
        success: true,
        message: "Deployment status đã được cập nhật",
        data: deployment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi cập nhật deployment status",
        error: error.message,
      });
    }
  }

  /**
   * Lấy thống kê deployment
   */
  async getDeploymentStats(req, res) {
    try {
      const { environment = "production" } = req.query;
      const stats = await deploymentService.getDeploymentStats(environment);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thống kê deployment",
        error: error.message,
      });
    }
  }

  /**
   * Lấy deployment hiện tại đang chạy trên production
   */
  async getCurrentProductionDeployment(req, res) {
    try {
      const deployment = await deploymentService.getCurrentProductionDeployment();

      res.status(200).json({
        success: true,
        data: deployment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy deployment hiện tại",
        error: error.message,
      });
    }
  }
}

module.exports = new DeploymentController();


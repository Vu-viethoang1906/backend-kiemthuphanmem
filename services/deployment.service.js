const Deployment = require("../models/deployment.model");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

class DeploymentService {
  /**
   * Lấy version hiện tại từ environment variable hoặc git
   */
  async getCurrentVersion() {
    try {
      // Ưu tiên lấy từ environment variable (được set khi deploy)
      if (process.env.APP_VERSION) {
        return {
          version: process.env.APP_VERSION,
          source: "environment",
        };
      }

      // Nếu không có, thử lấy từ git
      try {
        const { stdout } = await execAsync("git rev-parse --short HEAD", {
          cwd: __dirname + "/..",
        });
        return {
          version: stdout.trim(),
          source: "git",
        };
      } catch (gitError) {
        // Nếu không có git, lấy từ package.json
        const packageJsonPath = path.join(__dirname, "..", "package.json");
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, "utf-8")
        );
        return {
          version: packageJson.version || "unknown",
          source: "package.json",
        };
      }
    } catch (error) {
      console.error("Error getting current version:", error);
      return {
        version: "unknown",
        source: "unknown",
      };
    }
  }

  /**
   * Lấy thông tin build hiện tại
   */
  async getBuildInfo() {
    try {
      const nodeVersion = process.version;
      let npmVersion = "unknown";
      try {
        const { stdout } = await execAsync("npm --version");
        npmVersion = stdout.trim();
      } catch (e) {
        // Ignore
      }

      return {
        node_version: nodeVersion,
        npm_version: npmVersion,
        build_time: process.env.BUILD_TIME
          ? new Date(process.env.BUILD_TIME)
          : new Date(),
        environment: process.env.NODE_ENV || "production",
      };
    } catch (error) {
      return {
        node_version: process.version,
        npm_version: "unknown",
        build_time: new Date(),
        environment: process.env.NODE_ENV || "production",
      };
    }
  }

  /**
   * Tạo deployment record mới
   */
  async createDeployment(deploymentData) {
    try {
      const buildInfo = await this.getBuildInfo();
      const currentVersion = await this.getCurrentVersion();

      const deployment = new Deployment({
        version: deploymentData.version || currentVersion.version,
        environment: deploymentData.environment || "production",
        branch: deploymentData.branch,
        commit_hash: deploymentData.commit_hash || currentVersion.version,
        commit_message: deploymentData.commit_message,
        deployed_by: deploymentData.deployed_by,
        deployed_by_username: deploymentData.deployed_by_username,
        status: deploymentData.status || "success",
        notes: deploymentData.notes,
        build_info: {
          ...buildInfo,
          ...deploymentData.build_info,
        },
        rollback_to: deploymentData.rollback_to,
      });

      await deployment.save();
      return deployment;
    } catch (error) {
      console.error("Error creating deployment:", error);
      throw error;
    }
  }

  /**
   * Lấy deployment history
   */
  async getDeploymentHistory(filters = {}) {
    try {
      const {
        environment,
        status,
        limit = 50,
        skip = 0,
        sortBy = "deployed_at",
        sortOrder = "desc",
      } = filters;

      const query = {};
      if (environment) {
        query.environment = environment;
      }
      if (status) {
        query.status = status;
      }

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const deployments = await Deployment.find(query)
        .populate("deployed_by", "username email full_name")
        .populate("rollback_to", "version deployed_at")
        .sort(sort)
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const total = await Deployment.countDocuments(query);

      return {
        deployments,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      };
    } catch (error) {
      console.error("Error getting deployment history:", error);
      throw error;
    }
  }

  /**
   * Lấy deployment hiện tại đang chạy trên production
   */
  async getCurrentProductionDeployment() {
    try {
      const deployment = await Deployment.findOne({
        environment: "production",
        status: "success",
      })
        .populate("deployed_by", "username email full_name")
        .sort({ deployed_at: -1 });

      if (!deployment) {
        // Nếu không có trong DB, trả về thông tin từ system
        const currentVersion = await this.getCurrentVersion();
        const buildInfo = await this.getBuildInfo();
        return {
          version: currentVersion.version,
          source: currentVersion.source,
          environment: "production",
          build_info: buildInfo,
          deployed_at: buildInfo.build_time,
          status: "success",
          isFromSystem: true,
        };
      }

      return deployment;
    } catch (error) {
      console.error("Error getting current production deployment:", error);
      throw error;
    }
  }

  /**
   * Lấy deployment theo ID
   */
  async getDeploymentById(deploymentId) {
    try {
      const deployment = await Deployment.findById(deploymentId)
        .populate("deployed_by", "username email full_name")
        .populate("rollback_to", "version deployed_at status");

      if (!deployment) {
        throw new Error("Deployment không tồn tại");
      }

      return deployment;
    } catch (error) {
      console.error("Error getting deployment by ID:", error);
      throw error;
    }
  }

  /**
   * Cập nhật status của deployment
   */
  async updateDeploymentStatus(deploymentId, status, notes = null) {
    try {
      const deployment = await Deployment.findByIdAndUpdate(
        deploymentId,
        {
          status,
          ...(notes && { notes }),
        },
        { new: true }
      )
        .populate("deployed_by", "username email full_name")
        .populate("rollback_to", "version deployed_at status");

      if (!deployment) {
        throw new Error("Deployment không tồn tại");
      }

      return deployment;
    } catch (error) {
      console.error("Error updating deployment status:", error);
      throw error;
    }
  }

  /**
   * Lấy thống kê deployment
   */
  async getDeploymentStats(environment = "production") {
    try {
      const total = await Deployment.countDocuments({ environment });
      const success = await Deployment.countDocuments({
        environment,
        status: "success",
      });
      const failed = await Deployment.countDocuments({
        environment,
        status: "failed",
      });
      const inProgress = await Deployment.countDocuments({
        environment,
        status: "in_progress",
      });
      const rolledBack = await Deployment.countDocuments({
        environment,
        status: "rolled_back",
      });

      // Lấy deployment gần nhất
      const lastDeployment = await Deployment.findOne({ environment })
        .sort({ deployed_at: -1 })
        .populate("deployed_by", "username");

      return {
        total,
        success,
        failed,
        in_progress: inProgress,
        rolled_back: rolledBack,
        last_deployment: lastDeployment
          ? {
              version: lastDeployment.version,
              deployed_at: lastDeployment.deployed_at,
              status: lastDeployment.status,
              deployed_by: lastDeployment.deployed_by_username,
            }
          : null,
      };
    } catch (error) {
      console.error("Error getting deployment stats:", error);
      throw error;
    }
  }
}

module.exports = new DeploymentService();


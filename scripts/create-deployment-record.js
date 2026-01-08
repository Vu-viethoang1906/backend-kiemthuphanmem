/**
 * Script để tạo deployment record
 * Có thể được gọi từ CI/CD pipeline hoặc manual
 * 
 * Usage:
 *   node scripts/create-deployment-record.js --environment=production --version=abc123 --branch=main --status=success
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Deployment = require("../models/deployment.model");
const deploymentService = require("../services/deployment.service");

// Parse command line arguments
const args = process.argv.slice(2);
const params = {};
args.forEach((arg) => {
  const [key, value] = arg.replace("--", "").split("=");
  if (key && value) {
    params[key] = value;
  }
});

async function createDeploymentRecord() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    const currentVersion = await deploymentService.getCurrentVersion();
    const buildInfo = await deploymentService.getBuildInfo();

    // Create deployment record
    const deploymentData = {
      version: params.version || currentVersion.version,
      environment: params.environment || "production",
      branch: params.branch || process.env.GIT_BRANCH || "unknown",
      commit_hash: params.commit_hash || params.version || currentVersion.version,
      commit_message: params.commit_message || process.env.GIT_COMMIT_MESSAGE || "",
      status: params.status || "success",
      notes: params.notes || "",
      build_info: buildInfo,
    };

    const deployment = await deploymentService.createDeployment(deploymentData);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating deployment record:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createDeploymentRecord();


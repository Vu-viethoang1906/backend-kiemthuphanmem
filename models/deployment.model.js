const mongoose = require("mongoose");
const { Schema } = mongoose;

const DeploymentSchema = new Schema(
  {
    version: {
      type: String,
      required: true,
      index: true,
    },
    environment: {
      type: String,
      required: true,
      enum: ["production", "staging", "development"],
      default: "production",
      index: true,
    },
    branch: {
      type: String,
    },
    commit_hash: {
      type: String,
      index: true,
    },
    commit_message: {
      type: String,
    },
    deployed_by: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      index: true,
    },
    deployed_by_username: {
      type: String,
    },
    status: {
      type: String,
      enum: ["success", "failed", "in_progress", "rolled_back"],
      default: "success",
      index: true,
    },
    deployed_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
    },
    build_info: {
      node_version: String,
      npm_version: String,
      build_time: Date,
    },
    rollback_to: {
      type: mongoose.Types.ObjectId,
      ref: "Deployment",
    },
  },
  {
    collection: "deployments",
    timestamps: true,
  }
);

// Compound indexes for efficient queries
DeploymentSchema.index({ environment: 1, deployed_at: -1 });
DeploymentSchema.index({ environment: 1, status: 1, deployed_at: -1 });

const Deployment = mongoose.model("Deployment", DeploymentSchema);
module.exports = Deployment;


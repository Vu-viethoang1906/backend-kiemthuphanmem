const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const ActivityLogSchema = new Schema(
  {
    user_id: { type: mongoose.Types.ObjectId, ref: "User", index: true },
    action: { type: String, maxlength: 100 },
    target_type: { type: String, maxlength: 50 },
    target_id: { type: String },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { collection: "activity_logs" }
);

// Compound index for efficient filtering by user and time
ActivityLogSchema.index({ user_id: 1, created_at: -1 });

const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);
module.exports = ActivityLog;

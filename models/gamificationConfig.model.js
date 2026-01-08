const mongoose = require("mongoose");
const { Schema } = mongoose;

const GamificationConfigSchema = new Schema(
  {
    // Chỉ có 1 bản ghi duy nhất trong collection
    is_enabled: {
      type: Boolean,
      default: true, // Mặc định bật
    },
    // Điểm thưởng khi hoàn thành task (mặc định 10)
    points_per_task: {
      type: Number,
      default: 10,
      min: 0,
    },
    // Điểm trừ khi kéo task ra khỏi Done (mặc định 10)
    points_deduction: {
      type: Number,
      default: 10,
      min: 0,
    },
    // Ghi chú/description
    description: {
      type: String,
      maxlength: 500,
    },
    // Người cập nhật lần cuối
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    collection: "GamificationConfig",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Đảm bảo chỉ có 1 document
GamificationConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    // Tạo config mặc định nếu chưa có
    config = await this.create({
      is_enabled: true,
      points_per_task: 10,
      points_deduction: 10,
    });
  }
  return config;
};

module.exports = mongoose.model("GamificationConfig", GamificationConfigSchema);


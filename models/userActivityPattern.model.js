const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserActivityPatternSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Active hours - giờ hoạt động thường xuyên (0-23)
    active_hours: {
      type: [Number], // Array of hours [9, 10, 11, 14, 15, 16]
      default: [],
    },
    // Deep work periods - thời gian tập trung (không nên disturb)
    deep_work_periods: [
      {
        day_of_week: { type: Number, min: 0, max: 6 }, // 0 = Sunday, 1 = Monday, etc.
        start_hour: { type: Number, min: 0, max: 23 },
        end_hour: { type: Number, min: 0, max: 23 },
      },
    ],
    // Optimal notification times - thời điểm tốt nhất để gửi notification
    optimal_notification_times: [
      {
        day_of_week: { type: Number, min: 0, max: 6 },
        hours: { type: [Number] }, // Array of hours [9, 10, 14, 15]
      },
    ],
    // Activity metrics
    metrics: {
      average_daily_active_hours: { type: Number, default: 0 },
      most_active_day: { type: Number, min: 0, max: 6 }, // 0 = Sunday
      least_active_day: { type: Number, min: 0, max: 6 },
      average_session_duration: { type: Number, default: 0 }, // in minutes
    },
    // Last analysis timestamp
    last_analyzed_at: { type: Date, default: Date.now },
    // Pattern confidence score (0-1)
    confidence_score: { type: Number, default: 0, min: 0, max: 1 },
  },
  {
    collection: 'UserActivityPatterns',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

UserActivityPatternSchema.index({ user_id: 1 });
UserActivityPatternSchema.index({ last_analyzed_at: 1 });

module.exports = mongoose.model('UserActivityPattern', UserActivityPatternSchema);

const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationPreferenceSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Enable/disable smart scheduling
    smart_scheduling_enabled: {
      type: Boolean,
      default: true,
    },
    // Notification types that are always urgent (never delayed)
    urgent_types: {
      type: [String],
      default: ['at_risk_task', 'task_overdue', 'system_alert'],
    },
    // Minimum delay for non-urgent notifications (in minutes)
    min_delay_minutes: {
      type: Number,
      default: 15,
      min: 0,
      max: 1440, // Max 24 hours
    },
    // Maximum delay for non-urgent notifications (in minutes)
    max_delay_minutes: {
      type: Number,
      default: 120,
      min: 0,
      max: 1440,
    },
    // Quiet hours - không gửi notification trong khoảng thời gian này
    quiet_hours: {
      enabled: { type: Boolean, default: false },
      start_hour: { type: Number, min: 0, max: 23, default: 22 },
      end_hour: { type: Number, min: 0, max: 23, default: 8 },
    },
    // Days of week when smart scheduling is active
    active_days: {
      type: [Number], // [1, 2, 3, 4, 5] = Monday to Friday
      default: [1, 2, 3, 4, 5],
    },
  },
  {
    collection: 'NotificationPreferences',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

NotificationPreferenceSchema.index({ user_id: 1 });

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema);

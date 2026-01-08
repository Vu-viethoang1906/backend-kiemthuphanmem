const mongoose = require('mongoose');
const { Schema } = mongoose;

const ScheduledReportSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    board_id: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    report_type: {
      type: String,
      enum: ['dashboard', 'velocity', 'leaderboard', 'center_comparison'],
      required: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    recipients: {
      type: [String], // Array of email addresses
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Phải có ít nhất một địa chỉ email người nhận',
      },
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    last_sent_at: {
      type: Date,
      default: null,
    },
    next_send_at: {
      type: Date,
      required: true,
      index: true,
    },
    retry_count: {
      type: Number,
      default: 0,
    },
    last_error: {
      type: String,
      default: null,
    },
    // Additional report parameters
    report_params: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'ScheduledReports',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for efficient querying
ScheduledReportSchema.index({ user_id: 1, board_id: 1 });
ScheduledReportSchema.index({ is_active: 1, next_send_at: 1 });

module.exports = mongoose.model('ScheduledReport', ScheduledReportSchema);

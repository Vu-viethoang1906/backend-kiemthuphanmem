const mongoose = require('mongoose');
const { Schema } = mongoose;

const AtRiskTaskSchema = new Schema(
  {
    task_id: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    board_id: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    risk_score: {
      type: Number,
      required: true,
      min: 0,
    },
    risk_reasons: [
      {
        rule_name: {
          type: String,
          enum: [
            'unassigned_near_deadline',
            'stuck_in_column',
            'user_has_many_overdue',
            'high_estimate_low_time',
          ],
          required: true,
        },
        score: {
          type: Number,
          required: true,
        },
        details: {
          type: Schema.Types.Mixed,
        },
      },
    ],
    detected_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    resolved_at: {
      type: Date,
      default: null,
    },
    is_resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    recommendations: [
      {
        type: String,
      },
    ],
    notified_users: [
      {
        user_id: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        notified_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    collection: 'AtRiskTasks',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes for performance
AtRiskTaskSchema.index({ task_id: 1, is_resolved: 1 });
AtRiskTaskSchema.index({ board_id: 1, is_resolved: 1 });
AtRiskTaskSchema.index({ risk_score: -1, is_resolved: 1 });

module.exports = mongoose.model('AtRiskTask', AtRiskTaskSchema);

const mongoose = require('mongoose');
const { Schema } = mongoose;

const GamificationBehaviorSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    center_id: {
      type: Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      index: true,
    },
    action_type: {
      type: String,
      required: true,
      enum: [
        'view_leaderboard',
        'view_points',
        'earn_badge',
        'complete_task',
        'collaborate',
        'react_to_gamification',
        'view_badge',
        'click_notification',
        'set_goal',
        'achieve_goal',
      ],
    },
    element_type: {
      type: String,
      enum: ['points', 'leaderboard', 'badge', 'goal', 'notification', 'other'],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'GamificationBehaviors',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

GamificationBehaviorSchema.index({ user_id: 1, created_at: -1 });
GamificationBehaviorSchema.index({ center_id: 1, created_at: -1 });
GamificationBehaviorSchema.index({ action_type: 1, created_at: -1 });
GamificationBehaviorSchema.index({ deleted_at: 1 });

GamificationBehaviorSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('GamificationBehavior', GamificationBehaviorSchema);




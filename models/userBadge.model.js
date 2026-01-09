const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserBadgeSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    badge_id: {
      type: Schema.Types.ObjectId,
      ref: 'Badge',
      required: true,
    },
    center_id: {
      type: Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
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
    collection: 'UserBadges',
    timestamps: { createdAt: 'earned_at', updatedAt: 'updated_at' },
  }
);

UserBadgeSchema.index({ user_id: 1, center_id: 1, earned_at: -1 });
UserBadgeSchema.index({ badge_id: 1 });
UserBadgeSchema.index({ user_id: 1, badge_id: 1, center_id: 1 }, { unique: true });
UserBadgeSchema.index({ deleted_at: 1 });

UserBadgeSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('UserBadge', UserBadgeSchema);

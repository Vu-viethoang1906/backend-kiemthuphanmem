const mongoose = require('mongoose');
const { Schema } = mongoose;

const BadgeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon_url: {
      type: String,
    },
    category: {
      type: String,
      enum: ['competitive', 'collaborative', 'individual', 'team', 'achievement'],
      required: true,
    },
    criteria: {
      type: Schema.Types.Mixed,
      required: true,
    },
    points_reward: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'Badges',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

BadgeSchema.index({ category: 1, is_active: 1 });
BadgeSchema.index({ deleted_at: 1 });

BadgeSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('Badge', BadgeSchema);




const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserMotivationProfileSchema = new Schema(
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
    competitive_score: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    collaborative_score: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    short_term_score: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    long_term_score: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    onboarding_stage: {
      type: String,
      enum: ['AWAITING_INITIAL_DATA', 'TESTING_COMPETITIVE', 'TESTING_COLLABORATIVE', 'TESTING_SHORT_TERM', 'TESTING_LONG_TERM', 'STABLE'],
      default: 'AWAITING_INITIAL_DATA',
    },
    insights: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
    analysis_version: {
      type: String,
      default: '1.0',
    },
    last_adaptation_date: {
      type: Date,
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'UserMotivationProfiles',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

UserMotivationProfileSchema.index({ user_id: 1, center_id: 1 }, { unique: true });
UserMotivationProfileSchema.index({ deleted_at: 1 });

UserMotivationProfileSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('UserMotivationProfile', UserMotivationProfileSchema);




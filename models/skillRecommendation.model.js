const mongoose = require('mongoose');
const { Schema } = mongoose;

const SkillRecommendationSchema = new Schema(
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
    recommended_skill_id: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
      index: true,
    },
    recommendation_type: {
      type: String,
      enum: ['next_skill', 'gap_filling', 'advanced'],
      required: true,
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    reason: {
      type: String,
    },
    confidence_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    prerequisites_met: {
      type: Boolean,
      default: false,
    },
    estimated_difficulty: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    suggested_tasks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    viewed_at: {
      type: Date,
      default: null,
    },
    accepted: {
      type: Boolean,
      default: false,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'SkillRecommendations',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

SkillRecommendationSchema.index({ user_id: 1, center_id: 1, accepted: 1 });
SkillRecommendationSchema.index({ deleted_at: 1 });
SkillRecommendationSchema.index({ priority: -1, confidence_score: -1 });

SkillRecommendationSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('SkillRecommendation', SkillRecommendationSchema);


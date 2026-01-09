const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSkillSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    center_id: {
      type: Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
    },
    skill_id: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    proficiency_level: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    confidence_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    evidence_tasks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    learned_at: {
      type: Date,
      default: null,
    },
    last_practiced_at: {
      type: Date,
      default: null,
    },
    mastery_date: {
      type: Date,
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'UserSkills',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

UserSkillSchema.index({ user_id: 1, center_id: 1, skill_id: 1 }, { unique: true });
UserSkillSchema.index({ deleted_at: 1 });
UserSkillSchema.index({ proficiency_level: 1 });

UserSkillSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('UserSkill', UserSkillSchema);

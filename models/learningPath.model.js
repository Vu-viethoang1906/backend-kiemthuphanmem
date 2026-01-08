const mongoose = require('mongoose');
const { Schema } = mongoose;

const StageSchema = new Schema({
  stage_number: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  skills: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
    },
  ],
  suggested_tasks: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
  ],
  difficulty_level: {
    type: Number,
    min: 1,
    max: 5,
    default: 1,
  },
  estimated_duration_days: {
    type: Number,
    min: 0,
    default: 0,
  },
  completed_at: {
    type: Date,
    default: null,
  },
  is_completed: {
    type: Boolean,
    default: false,
  },
});

const LearningPathSchema = new Schema(
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
    path_name: {
      type: String,
      required: true,
    },
    current_stage: {
      type: Number,
      default: 1,
      min: 1,
    },
    stages: {
      type: [StageSchema],
      default: [],
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    target_completion_date: {
      type: Date,
      default: null,
    },
    progress_percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'LearningPaths',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

LearningPathSchema.index({ user_id: 1, center_id: 1, status: 1 });
LearningPathSchema.index({ deleted_at: 1 });

LearningPathSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('LearningPath', LearningPathSchema);


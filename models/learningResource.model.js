const mongoose = require('mongoose');
const { Schema } = mongoose;

const LearningResourceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    resource_type: {
      type: String,
      enum: ['tutorial', 'video', 'article', 'docs', 'blog', 'code_example', 'course', 'book'],
      required: true,
      index: true,
    },
    language: {
      type: String,
      trim: true,
      default: null, // e.g., "JavaScript", "Python", "React"
    },
    snippet: {
      type: String,
      trim: true,
      default: null, // For code examples
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    skills: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Skill',
      },
    ],
    difficulty_level: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    duration_minutes: {
      type: Number,
      min: 0,
      default: null, // For videos/courses
    },
    author: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      trim: true,
      default: null, // e.g., "MDN", "YouTube", "Stack Overflow"
    },
    view_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
    is_featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'LearningResources',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
LearningResourceSchema.index({ title: 'text', description: 'text', tags: 'text' });
LearningResourceSchema.index({ resource_type: 1, is_active: 1, deleted_at: 1 });
LearningResourceSchema.index({ skills: 1 });
LearningResourceSchema.index({ deleted_at: 1 });

// Middleware to filter soft-deleted records
LearningResourceSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('LearningResource', LearningResourceSchema);


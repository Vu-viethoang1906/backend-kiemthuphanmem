const mongoose = require('mongoose');
const { Schema } = mongoose;

const SkillSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    description: {
      type: String,
    },
    difficulty_level: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    prerequisites: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Skill',
      },
    ],
    estimated_hours: {
      type: Number,
      min: 0,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
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
    collection: 'Skills',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

SkillSchema.index({ name: 1, category: 1 }, { unique: true });
SkillSchema.index({ deleted_at: 1 });
SkillSchema.index({ is_active: 1, deleted_at: 1 });

SkillSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

// Tự động lấy category từ tags nếu không có category
SkillSchema.pre('save', function (next) {
  if (!this.category && this.tags && this.tags.length > 0) {
    this.category = this.tags[0];
  }
  if (!this.category) {
    this.category = 'Other';
  }
  next();
});

module.exports = mongoose.model('Skill', SkillSchema);


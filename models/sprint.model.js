const mongoose = require('mongoose');
const { Schema } = mongoose;

const SprintSchema = new Schema(
  {
    board_id: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    start_date: {
      type: Date,
      required: true,
      index: true,
    },
    end_date: {
      type: Date,
      required: true,
      index: true,
    },
    sprint_duration_days: {
      type: Number,
      default: 14,
    },
    completed_tasks_count: {
      type: Number,
      default: 0,
    },
    velocity: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'planned',
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'Sprints',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

SprintSchema.index({ board_id: 1, start_date: -1 });
SprintSchema.index({ board_id: 1, end_date: -1 });
SprintSchema.index({ deleted_at: 1 });

SprintSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('Sprint', SprintSchema);

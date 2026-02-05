const mongoose = require('mongoose');

const ChecklistSchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
    position: {
      type: Number,
      default: 0,
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'Checklists',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Auto filter deleted items
ChecklistSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('Checklist', ChecklistSchema);

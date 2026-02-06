const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema(
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
    description: {
      type: String,
    },
    assigned_to: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
    },
    due_date: {
      type: Date,
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
    completed_at: {
      type: Date,
      default: null,
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
    collection: 'Subtasks',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Auto filter deleted items
SubtaskSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

// Validate due_date before saving
SubtaskSchema.pre('save', function (next) {
  if (this.due_date && (isNaN(new Date(this.due_date).getTime()) || this.due_date === 'Invalid Date')) {
    this.due_date = undefined;
  }
  next();
});

// Validate due_date before updating
SubtaskSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  const update = this.getUpdate();
  
  if (update && typeof update === 'object') {
    const data = update.$set || update;
    
    if (data.due_date) {
      const date = new Date(data.due_date);
      if (isNaN(date.getTime()) || data.due_date === 'Invalid Date') {
        if (update.$set) {
          update.$set.due_date = undefined;
        } else {
          delete data.due_date;
        }
      }
    }
  }
  
  next();
});

module.exports = mongoose.model('Subtask', SubtaskSchema);

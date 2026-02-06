const mongoose = require("mongoose");

const AttachmentSchema = new mongoose.Schema({
  original_name: String,
  stored_name: String,
  size: Number,
  mime_type: String,
  url: String,
  uploaded_by: { type: mongoose.Types.ObjectId, ref: "User" },
  uploaded_at: { type: Date, default: Date.now },
});

const TaskSchema = new mongoose.Schema(
  {
    board_id: {
      type: mongoose.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    column_id: {
      type: mongoose.Types.ObjectId,
      ref: "Column",
      required: true,
    },
    swimlane_id: {
      type: mongoose.Types.ObjectId,
      ref: "Swimlane",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
    },
    start_date: {
      type: Date,
    },
    due_date: {
      type: Date,
    },
    estimate_hours: {
      type: Number,
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assigned_to: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    deleted_at: { type: Date, default: null },

    // 🆕 THÊM MẢNG FILE ĐÍNH KÈM
    attachments: { type: [AttachmentSchema], default: [] },

    // 🆕 BACKLOG & SPRINT FIELDS
    sprint_id: {
      type: mongoose.Types.ObjectId,
      ref: "Sprint",
      default: null,
      index: true,
    },
    backlog_position: {
      type: Number,
      default: 0,
      index: true,
    },
    story_points: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    position: {
      type: Number,
      default: 0,
    },

    done_at: { type: Date, default: null },
  },
  {
    collection: "Tasks",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// FILTER: bỏ deleted_at = null
TaskSchema.index({ deleted_at: 1 });

TaskSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty("deleted_at") && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

// Validate dates before saving
TaskSchema.pre('save', function (next) {
  // Validate start_date
  if (this.start_date && (isNaN(new Date(this.start_date).getTime()) || this.start_date === 'Invalid Date')) {
    this.start_date = undefined;
  }

  // Validate due_date
  if (this.due_date && (isNaN(new Date(this.due_date).getTime()) || this.due_date === 'Invalid Date')) {
    this.due_date = undefined;
  }

  next();
});

// Validate dates before updating
TaskSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  const update = this.getUpdate();

  if (update && typeof update === 'object') {
    // Handle $set and direct updates
    const data = update.$set || update;

    if (data.start_date) {
      const date = new Date(data.start_date);
      if (isNaN(date.getTime()) || data.start_date === 'Invalid Date') {
        if (update.$set) {
          update.$set.start_date = undefined;
        } else {
          delete data.start_date;
        }
      }
    }

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

module.exports = mongoose.model("Task", TaskSchema);

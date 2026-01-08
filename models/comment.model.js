const mongoose = require('mongoose');
const { Collaboration } = require('../controllers/comment.controller');

const AttachmentSchema = new mongoose.Schema({
  original_name: String,
  stored_name: String,
  size: Number,
  mime_type: String,
  url: String,
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploaded_at: { type: Date, default: Date.now },
});

const CommentSchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: { type: String, required: true },

    user_tag_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    Collaboration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comments',
      default: null,
    },

    // 🆕 Thêm attachments
    attachments: { type: [AttachmentSchema], default: [] },

    created_at: { type: Date, default: Date.now },
    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'Comments',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Index for soft delete
CommentSchema.index({ deleted_at: 1 });

// Middleware to filter soft-deleted records
CommentSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('Comment', CommentSchema);

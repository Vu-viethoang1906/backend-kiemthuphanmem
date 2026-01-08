const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true, // tránh khoảng trắng
    },
    color: {
      type: String,
      maxlength: 20,
      default: '#007bff',
    },
    category: {
      type: String,
      maxlength: 100,
      trim: true,
      default: null,
    },
    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'Tags',
    timestamps: true,
  }
);

// ✅ Unique theo cặp (board_id, name)
TagSchema.index({ board_id: 1, name: 1 }, { unique: true });
TagSchema.index({ board_id: 1, category: 1 });

// Index for soft delete
TagSchema.index({ deleted_at: 1 });

// Middleware filter soft delete
TagSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('Tag', TagSchema);

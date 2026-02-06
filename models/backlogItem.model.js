const mongoose = require('mongoose');

const BacklogItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium', index: true },
    story_points: { type: Number, min: 0, max: 100, default: null },
    backlog_position: { type: Number, default: 0, index: true },

    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assigned_to: { type: mongoose.Types.ObjectId, ref: 'User', default: null, index: true },

    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'BacklogItems',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

BacklogItemSchema.index({ created_by: 1, backlog_position: 1 });
BacklogItemSchema.index({ deleted_at: 1 });

BacklogItemSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('BacklogItem', BacklogItemSchema);


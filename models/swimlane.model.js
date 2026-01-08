const mongoose = require('mongoose');
const { Schema } = mongoose;

const SwimlaneSchema = new Schema({
  board_id: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  name: { type: String, required: true, maxlength: 100 },
  order: { type: Number, required: true },
  collapsed: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null }
}, { collection: 'Swimlanes', timestamps: true });

// Index for soft delete
SwimlaneSchema.index({ deleted_at: 1 });

// Middleware to filter soft-deleted records
SwimlaneSchema.pre(/^find/, function(next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('Swimlane', SwimlaneSchema);

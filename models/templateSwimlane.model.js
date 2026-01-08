const mongoose = require('mongoose');
const { Schema } = mongoose;

const TemplateSwimlaneSchema = new Schema({

template_id: {type: Schema.Types.ObjectId , ref: 'Template', required: true, index: true },
name: { type: String, maxlength: 100 },
order_index: { type: Number },
deleted_at: { type: Date, default: null }
}, { collection: 'TemplateSwimlanes', timestamps: true });

// Index for soft delete
TemplateSwimlaneSchema.index({ deleted_at: 1 });

// Middleware to filter soft-deleted records
TemplateSwimlaneSchema.pre(/^find/, function(next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('TemplateSwimlane', TemplateSwimlaneSchema);

const mongoose = require('mongoose');

const BoardSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  created_by: { 
    type: mongoose.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  is_template: { 
    type: Boolean, 
    default: false 
  },
  deleted_at: { 
    type: Date, 
    default: null 
  },

}, { 
  collection: 'Boards',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

BoardSchema.index({ deleted_at: 1 });

BoardSchema.pre(/^find/, function(next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('Board', BoardSchema);

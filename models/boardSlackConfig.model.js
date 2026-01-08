const mongoose = require('mongoose');
const { Schema } = mongoose;
const BoardSlackConfigSchema = new Schema({
  // ID của board
  board_id: {
    type: Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
    unique: true,
    index: true
  },
  
  // Webhook URL của board (từ Slack Incoming Webhooks)
  webhook_url: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Bật/tắt thông báo task mới
  notify_task_created: {
    type: Boolean,
    default: true
  },
  
  // Bật/tắt thông báo task được giao
  notify_task_assigned: {
    type: Boolean,
    default: true
  },
  
  // Bật/tắt thông báo task hoàn thành
  notify_task_completed: {
    type: Boolean,
    default: true
  },
  
  // Bật/tắt thông báo comment mới
  notify_comment_added: {
    type: Boolean,
    default: true
  },
  
  // Trạng thái (active/inactive)
  is_active: {
    type: Boolean,
    default: false // Mặc định tắt cho đến khi admin/owner config
  },
  
  // Thông tin bổ sung
  channel_name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Người config (admin/owner của board)
  configured_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Ghi chú
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  collection: 'BoardSlackConfigs',
  timestamps: true
});

// Indexes
BoardSlackConfigSchema.index({ board_id: 1 });
BoardSlackConfigSchema.index({ is_active: 1 });

// Virtual để populate board
BoardSlackConfigSchema.virtual('board', {
  ref: 'Board',
  localField: 'board_id',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
BoardSlackConfigSchema.set('toJSON', { virtuals: true });
BoardSlackConfigSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BoardSlackConfig', BoardSlackConfigSchema);


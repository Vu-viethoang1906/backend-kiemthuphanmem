const mongoose = require('mongoose');
const { Schema } = mongoose;
const UserSlackConfigSchema = new Schema({
  // ID của user
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Webhook URL của user (từ Slack Incoming Webhooks)
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
    default: true
  },
  
  // Thông tin bổ sung
  channel_name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Ghi chú của user
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  collection: 'UserSlackConfigs',
  timestamps: true
});

// Indexes
UserSlackConfigSchema.index({ user_id: 1 });
UserSlackConfigSchema.index({ is_active: 1 });

// Virtual để populate user
UserSlackConfigSchema.virtual('user', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
UserSlackConfigSchema.set('toJSON', { virtuals: true });
UserSlackConfigSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UserSlackConfig', UserSlackConfigSchema);


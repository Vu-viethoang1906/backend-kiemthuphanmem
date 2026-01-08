const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, maxlength: 200 },
    body: { type: String, maxlength: 1000 },
    type: { type: String, maxlength: 50 },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'normal', 'low'],
      default: 'normal',
      index: true,
    },
    created_at: { type: Date, default: Date.now },
    scheduled_at: { type: Date, index: true }, // Thời điểm được lên lịch để gửi
    sent_at: { type: Date }, // Thời điểm thực sự gửi
    read_at: { type: Date },
    board_id: { type: Schema.Types.ObjectId, ref: 'Board' },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task' },
  },
  { collection: 'Notifications' }
);

// Index for finding scheduled notifications
NotificationSchema.index({ scheduled_at: 1, sent_at: 1 });
NotificationSchema.index({ user_id: 1, scheduled_at: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);

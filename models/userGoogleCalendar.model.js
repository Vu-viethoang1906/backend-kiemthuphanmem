const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserGoogleCalendarSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  access_token: {
    type: String,
    required: true
  },
  refresh_token: {
    type: String,
    required: true
  },
  calendar_id: {
    type: String,
    default: 'primary',
    trim: true
  },
  is_sync_enabled: {
    type: Boolean,
    default: false
  },
  sync_filter: {
    only_with_dates: {
      type: Boolean,
      default: true
    },
    include_completed: {
      type: Boolean,
      default: false
    },
    board_ids: [{
      type: Schema.Types.ObjectId,
      ref: 'Board'
    }]
  },
  expires_at: {
    type: Date
  },
  last_sync_at: {
    type: Date
  }
}, {
  collection: 'UserGoogleCalendars',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

UserGoogleCalendarSchema.index({ user_id: 1 });
UserGoogleCalendarSchema.index({ is_sync_enabled: 1 });

module.exports = mongoose.model('UserGoogleCalendar', UserGoogleCalendarSchema);


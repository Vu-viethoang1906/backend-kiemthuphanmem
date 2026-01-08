const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserLeaveSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    board_id: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      index: true,
    },
    leave_start: {
      type: Date,
      required: true,
      index: true,
    },
    leave_end: {
      type: Date,
      required: true,
      index: true,
    },
    leave_type: {
      type: String,
      enum: ['annual', 'sick', 'personal', 'holiday'],
      default: 'personal',
    },
    reason: {
      type: String,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'UserLeaves',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

UserLeaveSchema.index({ user_id: 1, leave_start: 1, leave_end: 1 });
UserLeaveSchema.index({ board_id: 1, leave_start: 1, leave_end: 1 });
UserLeaveSchema.index({ deleted_at: 1 });

UserLeaveSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model('UserLeave', UserLeaveSchema);

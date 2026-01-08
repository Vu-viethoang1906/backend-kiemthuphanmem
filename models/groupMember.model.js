const mongoose = require('mongoose');
const { Schema } = mongoose;

const allowedRoles = ["Người tạo", "Quản trị viên", "Người xem"]; // các quyền hợp lệ

const GroupMemberSchema = new Schema({
  group_id: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role_in_group: {
    type: String,
    enum: allowedRoles, // chỉ cho phép những giá trị này
    maxlength: 50,
    default: "Người xem", // mặc định khi chưa chỉ định
  },
}, { collection: 'GroupMembers', timestamps: true });

module.exports = mongoose.model('GroupMember', GroupMemberSchema);

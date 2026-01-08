const mongoose = require('mongoose');
const { Schema } = mongoose;

const CenterMemberSchema = new Schema({
  center_id: { type: Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role_in_center: {
    type: String,
    enum: ['Center_Admin', 'Manager', 'Staff', 'Member'],
    default: 'Member',
    required: true,
  },
  deleted: { type: Boolean, default: false }, // ✅ Xóa mềm
}, { collection: 'CenterMembers', timestamps: true });

// ✅ Index unique chỉ áp dụng cho bản ghi chưa bị xóa
CenterMemberSchema.index(
  { center_id: 1, user_id: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted: false }, // ✅ chỉ áp dụng khi deleted=false
    name: 'CenterMember_index_3'
  }
);

// ✅ Middleware: luôn chỉ lấy bản ghi chưa xóa
CenterMemberSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted') && !query.$or) {
    this.where({ deleted: false });
  }
  next();
});

const CenterMember = mongoose.model('CenterMember', CenterMemberSchema);
module.exports = CenterMember;

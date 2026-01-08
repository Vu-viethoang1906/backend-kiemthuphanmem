const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * UserRole Schema - Định nghĩa cấu trúc dữ liệu cho bảng UserRoles
 * Collection: UserRoles
 * Liên kết giữa User và Role (Many-to-Many)
 */
const UserRoleSchema = new Schema({
  // ID của user
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ID của role
  role_id: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  
  // Ngày gán role
  assigned_at: {
    type: Date,
    default: Date.now
  },
  
  // Người gán role
  assigned_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Trạng thái role
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  collection: 'UserRoles',
  timestamps: true
});

// Compound unique index để tránh duplicate user-role
UserRoleSchema.index(
  { user_id: 1, role_id: 1 },
  { 
    name: 'UserRole_index_0', 
    unique: true 
  }
);

// Indexes để tối ưu hóa truy vấn
UserRoleSchema.index({ user_id: 1 });
UserRoleSchema.index({ role_id: 1 });
UserRoleSchema.index({ status: 1 });

// Virtual để populate thông tin user
UserRoleSchema.virtual('user', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
});

// Virtual để populate thông tin role
UserRoleSchema.virtual('role', {
  ref: 'Role',
  localField: 'role_id',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
UserRoleSchema.set('toJSON', { virtuals: true });
UserRoleSchema.set('toObject', { virtuals: true });

const UserRole = mongoose.models.UserRole || mongoose.model('UserRole', UserRoleSchema);

module.exports = UserRole;

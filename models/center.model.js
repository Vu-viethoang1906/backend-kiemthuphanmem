const mongoose = require('mongoose');

/**
 * Center Schema - Định nghĩa cấu trúc dữ liệu cho bảng Centers
 * Collection: Centers
 */
const CenterSchema = new mongoose.Schema({
  // Tên center
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // Địa chỉ center
  address: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Mô tả center
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Trạng thái center
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  
  // Thông tin liên hệ
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 100
  },
  
  // Soft delete
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  collection: 'Centers',
  timestamps: true
});

// Indexes để tối ưu hóa truy vấn
CenterSchema.index({ name: 1 });
CenterSchema.index({ status: 1 });
CenterSchema.index({ createdAt: -1 });
CenterSchema.index({ deleted_at: 1 });

// Middleware to filter soft-deleted records
CenterSchema.pre(/^find/, function(next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty('deleted_at') && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

// Virtual để lấy số lượng members của center
CenterSchema.virtual('memberCount', {
  ref: 'CenterMember',
  localField: '_id',
  foreignField: 'center_id',
  count: true
});

// Virtual để lấy số lượng groups của center
CenterSchema.virtual('groupCount', {
  ref: 'Group',
  localField: '_id',
  foreignField: 'center_id',
  count: true
});

// Ensure virtual fields are serialized
CenterSchema.set('toJSON', { virtuals: true });
CenterSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Center', CenterSchema);

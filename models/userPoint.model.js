const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * UserPoint Schema - Định nghĩa cấu trúc dữ liệu cho bảng UserPoints
 * Collection: UserPoints
 * Quản lý điểm của user trong từng center
 */
const UserPointSchema = new Schema({
  // ID của user
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ID của center
  center_id: {
    type: Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  
  // Số điểm hiện tại
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Tổng điểm đã tích lũy
  total_points: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Cấp độ hiện tại
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Trạng thái
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  collection: 'UserPoints',
  timestamps: true
});

// Compound unique index - một user chỉ có 1 bản ghi cho mỗi center
UserPointSchema.index(
  { user_id: 1, center_id: 1 }, 
  { 
    name: 'UserPoint_index_9', 
    unique: true 
  }
);

// Indexes để tối ưu hóa truy vấn
UserPointSchema.index({ user_id: 1 });
UserPointSchema.index({ center_id: 1 });
UserPointSchema.index({ points: -1 });
UserPointSchema.index({ level: -1 });
UserPointSchema.index({ status: 1 });

// Virtual để populate thông tin user
UserPointSchema.virtual('user', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
});

// Virtual để populate thông tin center
UserPointSchema.virtual('center', {
  ref: 'Center',
  localField: 'center_id',
  foreignField: '_id',
  justOne: true
});

// Method để cập nhật điểm
UserPointSchema.methods.addPoints = function(points) {
  this.points += points;
  this.total_points += points;
  return this.save();
};

// Method để cập nhật cấp độ
UserPointSchema.methods.updateLevel = function() {
  // Logic tính cấp độ dựa trên điểm (có thể tùy chỉnh)
  const newLevel = Math.floor(this.points / 100) + 1;
  this.level = newLevel;
  return this.save();
};

// Ensure virtual fields are serialized
UserPointSchema.set('toJSON', { virtuals: true });
UserPointSchema.set('toObject', { virtuals: true });

const UserPoint = mongoose.model('UserPoint', UserPointSchema);
module.exports = UserPoint;

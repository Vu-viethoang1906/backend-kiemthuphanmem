const UserPoint = require('../models/userPoint.model');

class UserPointRepository {
  async findAll() {
    return UserPoint.find().populate('user_id').populate('center_id').lean();
  }

  async findByUser(userId) {
    return UserPoint.find({ user_id: userId }).populate('center_id').lean();
  }

  async findByUserAndCenter(userId, centerId) {
    return UserPoint.findOne({ user_id: userId, center_id: centerId }).lean();
  }

  async create(data) {
    return UserPoint.create(data);
  }

  async update(id, data) {
    return UserPoint.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return UserPoint.findByIdAndDelete(id).lean();
  }
  // cập nhật điểm cho user qua id user và center
async updatePoint(userId, centerId, addPoint) {
    try {
      let userPoint = await UserPoint.findOne({ user_id: userId, center_id: centerId });

      // Nếu chưa có bản ghi thì tạo mới
      if (!userPoint) {
        userPoint = new UserPoint({
          user_id: userId,
          center_id: centerId,
          points: 0,
          total_points: 0,
          level: 1
        });
      }

      // Tính điểm mới, tránh âm
      const newPoints = Math.max(0, (userPoint.points || 0) + addPoint);
      const newTotalPoints = Math.max(0, (userPoint.total_points || 0) + addPoint);

      userPoint.points = newPoints;
      userPoint.total_points = newTotalPoints;

      // Cập nhật cấp độ (mỗi 100 điểm = 1 level)
      userPoint.level = Math.max(1, Math.floor(userPoint.total_points / 100) + 1);

      await userPoint.save();

      return {
        success: true,
        message: `Cập nhật điểm thành công (${addPoint >= 0 ? 'Cộng' : 'Trừ'} ${Math.abs(addPoint)} điểm)`,
        data: userPoint
      };
    } catch (error) {
      console.error('❌ Lỗi khi cập nhật điểm:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new UserPointRepository();

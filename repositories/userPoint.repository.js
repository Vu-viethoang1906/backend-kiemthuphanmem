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

  /**
   * Đồng bộ UserPoint khi user đổi center: chỉ còn 1 bản ghi ứng với center mới.
   * - Nếu đã có bản ghi cho newCenterId: xóa các bản ghi còn lại (center cũ).
   * - Nếu chưa có: cập nhật một bản ghi cũ sang center mới (giữ điểm), xóa các bản còn lại.
   */
  async updateCenterForUser(userId, newCenterId) {
    const all = await UserPoint.find({ user_id: userId });
    if (!all.length) return;

    const newIdStr = newCenterId.toString();
    const forNewCenter = all.find(r => r.center_id && r.center_id.toString() === newIdStr);

    if (forNewCenter) {
      await UserPoint.deleteMany({
        user_id: userId,
        center_id: { $ne: newCenterId },
      });
    } else {
      const toKeep = all[0];
      await UserPoint.updateOne({ _id: toKeep._id }, { $set: { center_id: newCenterId } });
      await UserPoint.deleteMany({
        user_id: userId,
        _id: { $ne: toKeep._id },
      });
    }
  }

  // cập nhật điểm cho user qua id user và center
  async updatePoint(userId, centerId, addPoint) {
    try {
      const uid = userId && (userId.toString ? userId.toString() : userId);
      const cid = centerId && (centerId.toString ? centerId.toString() : centerId);
      if (!uid || !cid) {
        return { success: false, message: 'user_id và center_id là bắt buộc' };
      }
      let userPoint = await UserPoint.findOne({ user_id: uid, center_id: cid });

      // Nếu chưa có bản ghi thì tạo mới
      if (!userPoint) {
        userPoint = new UserPoint({
          user_id: uid,
          center_id: cid,
          points: 0,
          total_points: 0,
          level: 1,
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
        data: userPoint,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new UserPointRepository();

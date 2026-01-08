const UserBadge = require('../models/userBadge.model');

class UserBadgeRepository {
  async create(data) {
    return UserBadge.create(data);
  }

  async findByUserAndCenter(userId, centerId) {
    return UserBadge.find({ user_id: userId, center_id: centerId })
      .populate('badge_id')
      .sort({ earned_at: -1 })
      .lean();
  }

  async findByUserBadgeAndCenter(userId, badgeId, centerId) {
    return UserBadge.findOne({ user_id: userId, badge_id: badgeId, center_id: centerId });
  }

  async countByBadge(badgeId, centerId) {
    return UserBadge.countDocuments({ badge_id: badgeId, center_id: centerId });
  }

  async getRecentBadges(centerId, limit = 10) {
    return UserBadge.find({ center_id: centerId })
      .populate('user_id', 'username full_name')
      .populate('badge_id', 'name icon_url category')
      .sort({ earned_at: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = new UserBadgeRepository();




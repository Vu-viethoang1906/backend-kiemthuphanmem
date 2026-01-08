const UserMotivationProfile = require('../models/userMotivationProfile.model');

class UserMotivationProfileRepository {
  async findByUserAndCenter(userId, centerId) {
    return UserMotivationProfile.findOne({ user_id: userId, center_id: centerId });
  }

  async create(data) {
    return UserMotivationProfile.create(data);
  }

  async update(userId, centerId, data) {
    return UserMotivationProfile.findOneAndUpdate(
      { user_id: userId, center_id: centerId },
      { $set: data },
      { new: true, upsert: true }
    );
  }

  async findAllByCenter(centerId) {
    return UserMotivationProfile.find({ center_id: centerId })
      .populate('user_id', 'username full_name email')
      .lean();
  }
}

module.exports = new UserMotivationProfileRepository();




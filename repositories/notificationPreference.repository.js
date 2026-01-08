const NotificationPreference = require('../models/notificationPreference.model');

class NotificationPreferenceRepository {
  async create(data) {
    return await NotificationPreference.create(data);
  }

  async findById(id) {
    return await NotificationPreference.findById(id);
  }

  async findByUserId(userId) {
    return await NotificationPreference.findOne({ user_id: userId });
  }

  async upsertByUserId(userId, data) {
    return await NotificationPreference.findOneAndUpdate({ user_id: userId }, data, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  async update(userId, data) {
    return await NotificationPreference.findOneAndUpdate({ user_id: userId }, data, { new: true });
  }

  async delete(userId) {
    return await NotificationPreference.findOneAndDelete({ user_id: userId });
  }
}

module.exports = new NotificationPreferenceRepository();

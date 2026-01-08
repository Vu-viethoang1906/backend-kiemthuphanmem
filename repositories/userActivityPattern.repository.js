const UserActivityPattern = require('../models/userActivityPattern.model');

class UserActivityPatternRepository {
  async create(data) {
    return await UserActivityPattern.create(data);
  }

  async findById(id) {
    return await UserActivityPattern.findById(id);
  }

  async findByUserId(userId) {
    return await UserActivityPattern.findOne({ user_id: userId });
  }

  async upsertByUserId(userId, data) {
    return await UserActivityPattern.findOneAndUpdate({ user_id: userId }, data, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  async update(userId, data) {
    return await UserActivityPattern.findOneAndUpdate({ user_id: userId }, data, { new: true });
  }

  async delete(userId) {
    return await UserActivityPattern.findOneAndDelete({ user_id: userId });
  }
}

module.exports = new UserActivityPatternRepository();

const Badge = require('../models/badge.model');

class BadgeRepository {
  async create(data) {
    return Badge.create(data);
  }

  async findAll(filters = {}) {
    const query = { ...filters };
    if (!filters.hasOwnProperty('is_active')) {
      query.is_active = true;
    }
    return Badge.find(query).lean();
  }

  async findById(id) {
    return Badge.findById(id);
  }

  async findByCategory(category) {
    return Badge.find({ category, is_active: true }).lean();
  }

  async update(id, data) {
    return Badge.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async delete(id) {
    return Badge.findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true });
  }
}

module.exports = new BadgeRepository();




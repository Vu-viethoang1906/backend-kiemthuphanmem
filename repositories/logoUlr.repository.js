const LogoUlr = require("../models/LogoUlr.model");

class LogoUlrRepository {
  async create(data) {
    return LogoUlr.create(data);
  }

  async findById(id) {
    return LogoUlr.findById(id);
  }

  async findOne(filter = {}, options = {}) {
    const query = LogoUlr.findOne(filter);
    if (options.sort) query.sort(options.sort);
    return query.exec();
  }

  async find(filter = {}, options = {}) {
    const query = LogoUlr.find(filter);

    if (options.sort) query.sort(options.sort);
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);

    return query.exec();
  }

  async update(id, data) {
    return LogoUlr.findByIdAndUpdate(id, data, { new: true });
  }

  async unsetAllActive(exceptId = null) {
    const filter = {};
    if (exceptId) {
      filter._id = { $ne: exceptId };
    }
    return LogoUlr.updateMany(filter, { $set: { is_active: false } }).exec();
  }

  async delete(id) {
    return LogoUlr.findByIdAndDelete(id);
  }
}

module.exports = new LogoUlrRepository();

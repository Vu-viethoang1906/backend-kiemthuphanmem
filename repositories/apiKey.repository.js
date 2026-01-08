const ApiKey = require("../models/apiKey.model");

class ApiKeyRepository {
  async create(data) {
    return await ApiKey.create(data);
  }

  async findAll() {
    return await ApiKey.find().sort({ createdAt: -1 });
  }

  async findById(id) {
    return await ApiKey.findById(id);
  }

  async findByKey(key) {
    return await ApiKey.findOne({ key });
  }

  async findByDescription(description) {
    return await ApiKey.findOne({ description: description });
  }

  async findActiveKey(key) {
    return await ApiKey.findOne({ key, revoked: false });
  }

  async update(id, data) {
    return await ApiKey.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await ApiKey.findByIdAndDelete(id);
  }
}

module.exports = new ApiKeyRepository();

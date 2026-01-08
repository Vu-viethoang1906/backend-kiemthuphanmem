const centerRepo = require('../repositories/center.repository');

class CenterService {
  async viewAll(options = {}) {
    return await centerRepo.findAll(options);
  }

  async getById(id) {
    return await centerRepo.findById(id);
  }

  async createCenter(data) {
    return await centerRepo.create(data);
  }

  async updateCenter(id, data) {
    return await centerRepo.update(id, data);
  }

  async deleteCenter(id) {
    // Soft delete instead of hard delete
    return await centerRepo.softDelete(id);
  }

}

module.exports = new CenterService();

const userPointRepo = require('../repositories/userPoint.repository');

class UserPointService {
  async viewAll() {
    return await userPointRepo.findAll();
  }

  async getByUser(userId) {
    return await userPointRepo.findByUser(userId);
  }

  async getByUserAndCenter(userId, centerId) {
    return await userPointRepo.findByUserAndCenter(userId, centerId);
  }

  async create(data) {
    return await userPointRepo.create(data);
  }

  async update(id, data) {
    return await userPointRepo.update(id, data);
  }

  async delete(id) {
    return await userPointRepo.delete(id);
  }
}

module.exports = new UserPointService();

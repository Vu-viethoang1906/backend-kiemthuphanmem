const centerRepo = require('../repositories/center.repository');
// repository file is named centerMember.repo.js in this codebase
const centerMemberRepo = require('../repositories/centerMember.repo');
const boardMember = require('../repositories/boardMember.repository');

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

  async viewMemberBoards(idUser, idCenter) {
    try {
      // Verify user is member of center (repo exposes isMember(center_id, user_id))
      const isMember = await centerMemberRepo.isMember(idCenter, idUser);
      console.log('[center.service] viewMemberBoards isMember:', !!isMember, 'idCenter=', idCenter, 'idUser=', idUser);
      if (!isMember) throw new Error('User is not a member of this center');

      // Get all boards for this user
      const userBoards = await boardMember.getBoardsByUser(idUser);

      return userBoards;
    } catch (error) {
      throw new Error(`Error getting member boards: ${error.message}`);
    }
  }

}

module.exports = new CenterService();

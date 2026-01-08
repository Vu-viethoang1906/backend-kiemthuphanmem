const swimlaneRepo = require('../repositories/swimlane.repository');

class SwimlaneService {
  async createSwimlane({ board_id, name, order, userId }) {
    if (!userId) throw new Error('Không xác thực');
    const boardRepo = require('../repositories/board.repository');
    const isMember = await boardRepo.isMember(userId, board_id);
    if (!isMember) throw new Error('Bạn không có quyền thao tác trên board này');
    return await swimlaneRepo.create({ board_id, name, order });
  }

  async getSwimlane(id, userId) {
    const sl = await swimlaneRepo.findById(id);
    if (!sl) return null;
    const boardRepo = require('../repositories/board.repository');
    const isMember = await boardRepo.isMember(userId, sl.board_id.toString());
    if (!isMember) throw new Error('Bạn không có quyền xem swimlane này');
    return sl;
  }

  async getSwimlanesByBoard(boardId, userId ,roles = []) {
    const boardRepo = require('../repositories/board.repository');
    const isMember = await boardRepo.isMember(userId, boardId);
     if (roles.includes('admin') || roles.includes('System_Manager')) {
    return await swimlaneRepo.findAllByBoard(boardId);
  }
    if (!isMember) throw new Error('Bạn không có quyền xem board này');
    return await swimlaneRepo.findAllByBoard(boardId);
  }

  async updateSwimlane(id, data, userId) {
    const sl = await swimlaneRepo.findById(id);
    if (!sl) return null;
    const boardRepo = require('../repositories/board.repository');
    const isMember = await boardRepo.isMember(userId, sl.board_id.toString());
    if (!isMember) throw new Error('Bạn không có quyền thao tác trên board này');
    return await swimlaneRepo.update(id, data);
  }

  async deleteSwimlane(id, userId) {
    const sl = await swimlaneRepo.findById(id);
    if (!sl) return null;
    const boardRepo = require('../repositories/board.repository');
    const isMember = await boardRepo.isMember(userId, sl.board_id.toString());
    if (!isMember) throw new Error('Bạn không có quyền thao tác trên board này');
    // Soft delete instead of hard delete
    return await swimlaneRepo.softDelete(id);
  }

  // Toggle collapse swimlane
  async toggleCollapse(id, collapsed, userId) {
    const sl = await swimlaneRepo.findById(id);
    if (!sl) return null;
    const boardRepo = require('../repositories/board.repository');
    const isMember = await boardRepo.isMember(userId, sl.board_id.toString());
    if (!isMember) throw new Error('Bạn không có quyền thao tác trên board này');
    
    return await swimlaneRepo.update(id, { collapsed });
  }

  // Reorder swimlanes
 // Reorder swimlanes
async reorderSwimlanes(boardId, swimlaneIds, userId) {
  const boardRepo = require('../repositories/board.repository');
  const swimlaneRepo = require('../repositories/swimlane.repository');
  const mongoose = require('mongoose');

  const isMember = await boardRepo.isMember(userId, boardId);
  if (!isMember) throw new Error('Bạn không có quyền thao tác trên board này');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const results = [];

    for (let i = 0; i < swimlaneIds.length; i++) {
      const id = swimlaneIds[i];
      const result = await swimlaneRepo.update(id, { order: i }, session);
      if (result) results.push(result);
    }

    await session.commitTransaction();
    session.endSession();

    return results;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}


}

module.exports = new SwimlaneService();

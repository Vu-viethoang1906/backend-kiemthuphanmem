const Board = require('../models/board.model');
const BoardMember = require('../models/boardMember.model');
const mongoose = require('mongoose');

class BoardRepository {
  async selectedAll() {
    return Board.find().lean();
  }

  async findById(boardId) {
    return Board.findById(boardId).lean();
  }

  async findByIds(boardIds) {
    return Board.find({ _id: { $in: boardIds } }).lean();
  }

  async findByCreator(userId) {
    const creatorMembers = await BoardMember.find({ 
      user_id: userId, 
      Creator: true 
    }).lean();
    
    if (creatorMembers.length === 0) return [];
    
    const boardIds = creatorMembers.map(m => m.board_id);
    return Board.find({ _id: { $in: boardIds } }).lean();
  }

  async create(boardData) {
    const board = await Board.create(boardData);
    return board;
  }
    // Tạo board có transaction
  async createWithSession(boardData, session) {
    const board = await Board.create([boardData], { session });
    return board[0]; // vì create([]) trả mảng
  }

  async findMembersByUser(userId) {
    return BoardMember.find({ user_id: userId }).lean();
  }

  async isMember(userId, boardId) {
    const doc = await BoardMember.findOne({ user_id: userId, board_id: boardId }).select('_id').lean();
    return !!doc;
  }

  // Kiểm tra user có phải creator thông qua BoardMember
 async isCreatorFromMember(userId, boardId) {
  const doc = await BoardMember.findOne({ 
    user_id: userId, 
    board_id: boardId, 
    role_in_board: "Người tạo"
  }).select('_id').lean();
  return !!doc; // true nếu là người tạo, false nếu không
}

  async isRoleMember(userId, boardId) {
      const doc = await BoardMember.findOne({ 
      user_id: userId, 
      board_id: boardId, 
      role_in_board: 'Thành viên' 
    }).select('_id').lean();
    return !!doc;
  }
  async countDocuments(){

  }

  async updateById(boardId, updateData) {
    updateData.updated_at = new Date();
    return Board.findByIdAndUpdate(boardId, updateData, { new: true, runValidators: true }).lean();
  }

  async deleteById(boardId) {
    return Board.findByIdAndDelete(boardId).lean();
  }

  async findByTitleAndUser(title, userId) {
  // tìm board có title này mà user là thành viên
  return await Board.findOne({ title })
    .where("_id")
    .in(
      await BoardMember.find({ user_id: userId }).distinct("board_id")
    )
    .lean();
}
// lấy bảng theo id
async getBoardById(board_id){
try {
      return await Board.findById(board_id).lean();
    } catch (error) {
      throw error;
    }
}

// ==================== SOFT DELETE METHODS ====================

/**
 * Soft delete board
 */
async softDelete(id) {
  try {
    return await Board.findByIdAndUpdate(
      id,
      { deleted_at: new Date() },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Get all boards including soft-deleted ones (admin only)
 */
async findAllWithDeleted(options = {}) {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const query = {
      $or: [
        { deleted_at: null },
        { deleted_at: { $ne: null } }
      ]
    };

    const [boards, total] = await Promise.all([
      Board.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Board.countDocuments(query)
    ]);

    return {
      boards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw error;
  }
}
async findOne(filter) {
  try {
    return await Board.findOne(filter).lean();
  } catch (error) {
    throw error;
  }
}
async findAllWithDeleted(options = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      const query = { $or: [{ deleted_at: null }, { deleted_at: { $ne: null } }] };

      const [boards, total] = await Promise.all([
        Board.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Board.countDocuments(query)
      ]);

      return {
        boards,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new BoardRepository();



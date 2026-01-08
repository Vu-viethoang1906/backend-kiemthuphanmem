const BoardMember = require("../models/boardMember.model");
const mongoose = require('mongoose');

class BoardMemberRepository {
  // Thêm 1 thành viên vào board
async addMember({ user_id, board_id, role_in_board, Creator = false }, session) {
    const boardMember = new BoardMember({ user_id, board_id, role_in_board, Creator });
    return await boardMember.save({ session });
  }

  // Tìm tất cả thành viên trong 1 board
  async getMembersByBoard(board_id) {
    return await BoardMember.find({ board_id })
      .populate("user_id", "email username avatar_url") // populate thông tin user (nếu muốn)
      .lean();
  }

  // Kiểm tra 1 user đã ở trong board chưa
  async findMember(user_id, board_id) {
    return await BoardMember.findOne({ user_id, board_id }).lean();
  }

  // Xoá thành viên khỏi board
  async removeMember(user_id, board_id) {
    return await BoardMember.deleteOne({ user_id, board_id });
  }

  // Cập nhật role của thành viên trong board
  async updateRole(user_id, board_id, role_in_board) {
    return await BoardMember.findOneAndUpdate(
      { user_id, board_id },
      { role_in_board },
      { new: true }
    ).lean();
  }

  async selectAll(){
   return await BoardMember.find().lean();
  }


  async findWithBoards(filter) {
    return BoardMember.find(filter)
      .populate("board_id")   // populate sang bảng Board
      .exec();
  }

// ✅ boardMemberRepo.js
async getBoardsByUser(user_id) {
  const boards = await BoardMember.find({ user_id })
    .populate({
      path: "board_id",
      select: "title description created_at updated_at is_template"
    })
    .lean();

  // 🧹 Loại bỏ bản ghi null (phòng khi board bị xóa)
  return boards.filter(bm => bm.board_id != null);
}



  async deleteManyByBoard(board_id, session = null) {
    const query = BoardMember.deleteMany({ board_id });
    return session ? query.session(session) : query;
  }

  async countCreators(board_id) {
  if (!mongoose.Types.ObjectId.isValid(board_id)) {
    throw new Error("board_id không hợp lệ");
  }

  const count = await BoardMember.countDocuments({
    board_id,
    role_in_board: "Người tạo",
  });

  return count;
}
async countMembers(board_id) {
  return BoardMember.countDocuments({
    board_id,
    deleted: { $ne: true } // nếu bạn có xóa mềm
  });
}

async findByBoardId (idBoard){
  return BoardMember.find({board_id: idBoard}).lean();
}
}
module.exports = new BoardMemberRepository();

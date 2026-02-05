const mongoose = require('mongoose');
const boardMemberRepo = require('../repositories/boardMember.repository');
const userRepo = require('../repositories/user.repository');
const boardRepo = require('../repositories/board.repository');
const UserRoleRepo = require('../repositories/userRole.repository');
const notificationService = require('../services/notification.service');
const { sendNotification } = require('../config/socket');
class BoardMemberService {
  // Xem tất cả BoardMember
  async selectAll() {
    return await boardMemberRepo.selectAll();
  }
  async notification(idUser, idBoard, role, type) {
    try {
      if (!idUser) throw new Error('ko có id user');
      if (!idBoard) throw new Error('ko có id board');

      const board = await boardRepo.findById(idBoard);
      if (!board) throw new Error('Board không tồn tại');

      let title = '';
      let body = '';

      // ✅ Dùng switch để tạo nội dung theo loại thông báo
      switch (type) {
        case 'add_member':
          title = `Bạn vừa được thêm vào bảng "${board.title}"`;
          body = `Bạn đã được thêm vào bảng với quyền: ${role}`;
          break;

        case 'remove_member':
          title = `Bạn đã bị xóa khỏi bảng "${board.title}"`;
          body = 'Bạn không còn là thành viên trong bảng này.';
          break;

        case 'update_role':
          title = `Vai trò của bạn trong bảng "${board.title}" đã thay đổi`;
          body = `Vai trò mới của bạn là: ${role}`;
          break;

        default:
          title = `Hoạt động mới trong bảng "${board.title}"`;
          body = 'Có một thay đổi liên quan đến bạn trong bảng này.';
          break;
      }

      const data = {
        user_id: idUser,
        title,
        body,
      };

      const resultNotif = await notificationService.createNotification(data);
      return resultNotif;
    } catch (error) {
      throw new Error('Không gửi được notification');
    }
  }

  // Thêm user vào board
  async addMember({ requester_id, user_id, board_id, role_in_board }) {
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      throw new Error('user_id không hợp lệ');
    }
    if (!mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('board_id không hợp lệ');
    }

    // Nếu không có role_in_board, dùng default từ model
    if (!role_in_board) {
      role_in_board = 'Thành viên'; // Default value từ model
    }

    // Validate role theo enum trong model
    const validRoles = ['Người tạo', 'Thành viên', 'Người Xem'];
    if (!validRoles.includes(role_in_board)) {
      throw new Error(`role_in_board không hợp lệ. Giá trị hợp lệ: ${validRoles.join(', ')}`);
    }

    // Kiểm tra người thêm (requester)
    const requester = await userRepo.findById(requester_id);
    if (!requester) throw new Error('Người thực hiện không tồn tại');

    // Kiểm tra board tồn tại
    const board = await boardRepo.getBoardById(board_id);
    if (!board) throw new Error('Board không tồn tại');

    // ✅ Lấy thông tin membership của người đang thực hiện
    const requesterMember = await boardMemberRepo.findMember(requester_id, board_id);
    if (!requesterMember) {
      throw new Error('Bạn không phải thành viên của board này');
    }

    // ✅ Kiểm tra quyền của người thêm
    const allowedRoles = ['Người tạo', 'Thành viên'];
    if (!allowedRoles.includes(requesterMember.role_in_board)) {
      throw new Error('Chỉ người tạo hoặc thành viên mới có quyền thêm thành viên');
    }

    // Kiểm tra user được thêm có tồn tại
    const user = await userRepo.findById(user_id);
    if (!user) throw new Error('Người dùng được thêm không tồn tại');

    // Kiểm tra user đã là thành viên chưa
    const existing = await boardMemberRepo.findMember(user_id, board_id);
    if (existing) throw new Error('User đã là thành viên trong board này');

    // ✅ Thêm thành viên
    const addMember = await boardMemberRepo.addMember({
      user_id,
      board_id,
      role_in_board,
    });

    const dataNotifile = await this.notification(user_id, board_id, role_in_board, 'add_member');
    // gửi thông báo đến cho người dùng
    sendNotification(
      'private_Notification',
      {
        message: 'bạn vừa được thêm vào bảng',
      },
      user_id
    );
    return addMember;
  }

  async getMembers(board_id) {
    if (!mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('board_id không hợp lệ');
    }
    return await boardMemberRepo.getMembersByBoard(board_id);
  }

  // Cập nhật role
  async updateRole(requester_id, user_id, board_id, role_in_board) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      throw new Error('user_id không hợp lệ');
    }
    if (!mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('board_id không hợp lệ');
    }

    // Kiểm tra role hợp lệ
    const validRoles = ['Người tạo', 'Thành viên', 'Người Xem'];
    if (!validRoles.includes(role_in_board)) {
      throw new Error('role_in_board không hợp lệ');
    }

    // Kiểm tra user & board tồn tại
    const user = await userRepo.findById(user_id);
    if (!user) throw new Error('Người dùng không tồn tại');

    const board = await boardRepo.getBoardById(board_id);
    if (!board) throw new Error('Board không tồn tại');

    // Kiểm tra quyền người yêu cầu (requester)
    const isRequesterCreator = await boardRepo.isCreatorFromMember(requester_id, board_id);
    if (!isRequesterCreator) {
      throw new Error('Chỉ người tạo board mới được thay đổi vai trò thành viên');
    }

    // Lấy thông tin thành viên bị đổi role
    const targetMember = await boardMemberRepo.findMember(user_id, board_id);
    if (!targetMember) throw new Error('Không tìm thấy thành viên trong board');
    // Không được hạ cấp người tạo cuối cùng
    if (targetMember.role_in_board === 'Người tạo') {
      const creatorCount = await boardMemberRepo.countCreators(board_id);
      if (creatorCount === 1 && role_in_board !== 'Người tạo') {
        throw new Error('Không thể hạ cấp người tạo cuối cùng trong bảng');
      }
    }

    // Thực hiện cập nhật
    const member = await boardMemberRepo.updateRole(user_id, board_id, role_in_board);
    if (!member) throw new Error('Cập nhật vai trò thất bại');
    const dataNotifile = await this.notification(user_id, board_id, role_in_board, 'update_role');
    sendNotification(
      'private_Notification',
      {
        message: 'bạn vừa được thêm cập nhật quyền',
      },
      user_id
    );
    return member;
  }

  // Xoá thành viên
  async removeMember(requester_id, user_id, board_id) {
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      throw new Error('user_id không hợp lệ');
    }
    if (!mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('board_id không hợp lệ');
    }

    // Đếm số lượng thành viên hiện có trong board
    const memberCount = await boardMemberRepo.countMembers(board_id);
    if (memberCount <= 1) {
      throw new Error('Không thể xóa thành viên cuối cùng trong bảng');
    }

    // Cho phép người dùng tự xóa chính mình (rời board)
    if (requester_id.toString() !== user_id) {
      // Xóa người khác: chỉ người tạo board hoặc admin hệ thống. Thành viên được thêm vào không có quyền xóa người khác.
      const isCreator = await boardRepo.isCreatorFromMember(requester_id, board_id);
      const requester = await userRepo.findById(requester_id);
      if (!requester) throw new Error('Người thực hiện không tồn tại');

      const roles = await UserRoleRepo.findRoleByUser(requester_id);
      const systemRoles = (roles || []).map(r => r.name);
      const isSystemManagerOrAdmin =
        systemRoles.includes('System_Manager') || systemRoles.includes('admin');

      if (!isCreator && !isSystemManagerOrAdmin) {
        throw new Error(
          'Chỉ người tạo board mới có quyền xóa thành viên khỏi board. Thành viên được thêm vào không có quyền này.'
        );
      }
    }
    // Không cho xóa người tạo cuối cùng
    const targetMember = await boardMemberRepo.findMember(user_id, board_id);
    if (!targetMember) throw new Error('Không tìm thấy thành viên để xoá');
    if (targetMember.role_in_board === 'Người tạo') {
      const creatorCount = await boardMemberRepo.countCreators(board_id);
      if (creatorCount === 1) {
        throw new Error('Không thể xóa người tạo cuối cùng của bảng');
      }
    }

    // Thực hiện xóa
    const result = await boardMemberRepo.removeMember(user_id, board_id);
    if (result.deletedCount === 0) {
      throw new Error('Không tìm thấy thành viên để xoá');
    }
    const dataNotifile = await this.notification(user_id, board_id, '', 'remove_member');

    sendNotification(
      'private_Notification',
      {
        message: 'bạn vừa được xóa khỏi bảng',
      },
      user_id
    );
    return true;
  }

  // ✅ boardMemberService.js
  async getBoardsByUser(user_id, roles = []) {
    const idUser = typeof user_id === 'object' ? user_id.toString() : user_id;

    const user = await userRepo.findById(idUser);
    if (!user) throw new Error('Người dùng không tồn tại');

    const boards = await boardMemberRepo.getBoardsByUser(idUser);

    // Trả về danh sách board kèm vai trò
    return boards.map(bm => ({
      ...bm.board_id, // dữ liệu từ bảng Board
      role_in_board: bm.role_in_board,
      idBoarMenber: bm._id, // thêm vai trò
    }));
  }
}

module.exports = new BoardMemberService();

/**
 * Middleware kiểm tra quyền truy cập Board
 * User phải là member của board để xem analytics
 */

const boardMemberRepo = require('../repositories/boardMember.repository');
const boardRepo = require('../repositories/board.repository');
const mongoose = require('mongoose');

/**
 * Check user có quyền truy cập board không
 * User phải là member của board (Người tạo, Thành viên, Người Xem, Khách)
 */
const checkBoardAccess = async (req, res, next) => {
  try {
    // Get board_id từ params hoặc query
    const board_id = req.params.board_id || req.query.board_id;

    if (!board_id) {
      return res.status(400).json({
        success: false,
        message: 'board_id là bắt buộc',
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(board_id)) {
      return res.status(400).json({
        success: false,
        message: 'board_id không hợp lệ',
      });
    }

    // Check board tồn tại
    const board = await boardRepo.getBoardById(board_id);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board không tồn tại',
      });
    }

    // Check user đã authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực',
      });
    }

    const user_id = req.user.id;

    // ✅ Check user có là member của board không
    const membership = await boardMemberRepo.findMember(user_id, board_id);

    if (!membership) {
      // User không phải member → Kiểm tra xem có phải admin/System_Manager không
      const { roles = [] } = req.user;
      const isAdmin = roles.includes('admin') || roles.includes('System_Manager');

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message:
            'Bạn không có quyền truy cập board này. Chỉ thành viên của board mới có thể xem analytics.',
        });
      }
    }

    // ✅ User có quyền truy cập
    // Attach board info và membership vào request để controller/service sử dụng
    req.board = board;
    req.boardMembership = membership;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra quyền truy cập board',
      error: error.message,
    });
  }
};

/**
 * Check user có quyền EDIT board không
 * Chỉ Người tạo và Thành viên mới có quyền edit
 */
const checkBoardEditAccess = async (req, res, next) => {
  try {
    const board_id = req.params.board_id || req.query.board_id;
    const user_id = req.user?.id;

    if (!board_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin board_id hoặc user',
      });
    }

    // Check membership
    const membership = await boardMemberRepo.findMember(user_id, board_id);

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không phải thành viên của board này',
      });
    }

    // Check role
    const allowedRoles = ['Người tạo', 'Thành viên'];
    if (!allowedRoles.includes(membership.role_in_board)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Người tạo và Thành viên mới có quyền chỉnh sửa board',
      });
    }

    req.boardMembership = membership;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra quyền chỉnh sửa board',
    });
  }
};

module.exports = {
  checkBoardAccess,
  checkBoardEditAccess,
};

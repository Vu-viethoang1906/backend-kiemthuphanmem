const boardMemberService = require('../services/boardMember.service');
const mongoose = require('mongoose');
const { emitToUser, emitToUsers } = require('../config/socket');
const boardRepo = require('../repositories/board.repository');
const boardMemberRepo = require('../repositories/boardMember.repository');

class BoardMemberController {
  // Xem danh sách board mà user có quyền
  // Xem danh sách board mà user có quyền (dùng POST)
  async getBoardsByUser(req, res) {
    try {
      const user_id = req.user?.id || req.user?._id;
      const { roles = [] } = req.query; // Query params thay vì body

      const boards = await boardMemberService.getBoardsByUser(
        user_id,
        Array.isArray(roles) ? roles : []
      );

      res.json({ success: true, data: boards });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async selectAll(req, res) {
    try {
      const member = await boardMemberService.selectAll();
      res.status(201).json({ success: true, data: member });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async addMember(req, res) {
    try {
      const board_id = req.params.board_id;
      const { user_id, role_in_board } = req.body;
      const requester_id = req.user?.id;
      const member = await boardMemberService.addMember({
        requester_id,
        user_id,
        board_id,
        role_in_board,
      });

      // ✅ Emit socket event: board_member_added (wrap trong try-catch để không ảnh hưởng response)
      try {
        // Lấy thông tin board
        const board = await boardRepo.findById(board_id);

        if (board && user_id) {
          // ⭐ QUAN TRỌNG: Emit đến user được thêm vào
          emitToUser(
            'board_member_added',
            {
              boardId: board_id,
              board: {
                _id: board._id,
                title: board.title,
                description: board.description,
                is_template: board.is_template,
                created_at: board.created_at,
              },
              userId: user_id.toString(),
              addedBy: requester_id,
              role: role_in_board || member.role_in_board,
              timestamp: new Date().toISOString(),
            },
            user_id.toString()
          );

          // Emit đến tất cả members hiện tại của board (trừ user vừa được thêm)
          const boardMembers = await boardMemberRepo.findByBoardId(board_id);
          const otherMemberIds = boardMembers
            .map(m => m.user_id?.toString())
            .filter(id => id && id !== user_id.toString());

          if (otherMemberIds.length > 0) {
            emitToUsers(
              'board_member_added',
              {
                boardId: board_id,
                board: {
                  _id: board._id,
                  title: board.title,
                  description: board.description,
                },
                userId: user_id.toString(),
                addedBy: requester_id,
                role: role_in_board || member.role_in_board,
                timestamp: new Date().toISOString(),
              },
              otherMemberIds
            );
          }
        }
      } catch (socketError) {
        // Log lỗi socket nhưng không làm fail request
        console.error('❌ Socket emit error in addMember:', socketError);
      }

      res.status(201).json({ success: true, data: member });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getMembers(req, res) {
    try {
      const boardId = req.params.board_id;

      if (!boardId) {
        return res.status(400).json({ success: false, message: 'board_id là bắt buộc' });
      }

      const members = await boardMemberService.getMembers(boardId);
      res.json({ success: true, data: members });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateRole(req, res) {
    try {
      const { board_id, user_id } = req.params;
      const { role_in_board } = req.body;
      const requester_id = req.user.id; // người đang thực hiện hành động

      const member = await boardMemberService.updateRole(
        requester_id,
        user_id,
        board_id,
        role_in_board
      );
      res.json({ success: true, data: member });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async removeMember(req, res) {
    try {
      const requester_id = req.user?.id;
      const { board_id, user_id } = req.params;

      // ✅ Lấy danh sách members TRƯỚC KHI xóa
      const boardMembers = await boardMemberRepo.findByBoardId(board_id);
      const memberIds = boardMembers.map(m => m.user_id?.toString()).filter(Boolean);

      await boardMemberService.removeMember(requester_id, user_id, board_id);

      // ✅ Emit socket event: board_member_removed (wrap trong try-catch)
      try {
        // ⭐ QUAN TRỌNG: Emit đến user bị xóa
        emitToUser(
          'board_member_removed',
          {
            boardId: board_id,
            userId: user_id.toString(),
            removedBy: requester_id,
            timestamp: new Date().toISOString(),
          },
          user_id.toString()
        );

        // Emit đến tất cả members còn lại của board
        const remainingMemberIds = memberIds.filter(id => id !== user_id.toString());
        if (remainingMemberIds.length > 0) {
          emitToUsers(
            'board_member_removed',
            {
              boardId: board_id,
              userId: user_id.toString(),
              removedBy: requester_id,
              timestamp: new Date().toISOString(),
            },
            remainingMemberIds
          );
        }
      } catch (socketError) {
        // Log lỗi socket nhưng không làm fail request
        console.error('❌ Socket emit error in removeMember:', socketError);
      }

      res.json({ success: true, message: 'Xoá thành viên thành công' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new BoardMemberController();

const boardService = require('../services/board.service');
const queryParser = require('../utils/queryParser');
const activityLogService = require('../services/activityLog.service');
const { emitToUser, emitToUsers, broadcast } = require('../config/socket');
const boardMemberRepo = require('../repositories/boardMember.repository');
class BoardController {
  // đang xem theo kiêu người dùng
  // selectALl

  async selectedAll(req, res) {
    try {
      const userId = req.user?.id;

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'Xem danh sách board',
        target_type: 'Board',
        target_id: null,
      });

      // Parse query params
      const parsed = queryParser.parseQuery(req.query, {
        allowedFilters: ['is_template'],
        allowedSortFields: ['created_at', 'updated_at', 'title'],
        maxLimit: 100,
        defaults: {
          page: 1,
          limit: 10,
          sortBy: 'created_at',
          sortOrder: 'desc',
        },
      });

      // Get boards from service
      const result = await boardService.selectedAll({
        page: parsed.pagination.page,
        limit: parsed.pagination.limit,
        sortBy: parsed.metadata.sortBy,
        sortOrder: parsed.metadata.sortOrder,
        filter: parsed.filter,
        search: parsed.search,
      });

      // Build deep link response
      const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
      const response = queryParser.buildDeepLinkResponse(
        result.boards,
        req.query,
        baseUrl,
        {
          page: parsed.pagination.page,
          limit: parsed.pagination.limit,
          total: result.pagination.total,
        },
        {
          filtersApplied: parsed.metadata.filtersApplied,
          search: parsed.search,
          viewState: parsed.viewState,
        }
      );

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  }
  async listMyBoards(req, res) {
    try {
      const userId = req.user?.id;

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'Xem danh sách board',
        target_type: 'Board',
        target_id: null,
      });

      // Parse query params
      const parsed = queryParser.parseQuery(req.query, {
        allowedFilters: ['is_template'],
        allowedSortFields: ['created_at', 'updated_at', 'title'],
        maxLimit: 100,
        defaults: {
          page: 1,
          limit: 10,
          sortBy: 'created_at',
          sortOrder: 'desc',
        },
      });

      // Get boards from service
      const result = await boardService.listBoardsForUser(userId, {
        page: parsed.pagination.page,
        limit: parsed.pagination.limit,
        sortBy: parsed.metadata.sortBy,
        sortOrder: parsed.metadata.sortOrder,
        filter: parsed.filter,
        search: parsed.search,
      });

      // Build deep link response
      const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
      const response = queryParser.buildDeepLinkResponse(
        result.boards,
        req.query,
        baseUrl,
        {
          page: parsed.pagination.page,
          limit: parsed.pagination.limit,
          total: result.pagination.total,
        },
        {
          filtersApplied: parsed.metadata.filtersApplied,
          search: parsed.search,
          viewState: parsed.viewState,
        }
      );

      res.json(response);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

  async listUserBoards(req, res) {
    try {
      const userId = req.params.idUser;
      const user_Id = req.user?.id;

      await activityLogService.createActivityLog({
        user_id: user_Id,
        action: 'Xem danh sách của user',
        target_type: 'Board',
        target_id: null,
      });

      const boards = await boardService.listBoardsForUser(userId);
      res.json({ success: true, count: boards.length, data: boards });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

  async createBoard(req, res) {
    try {
      const userId = req.user?.id;
      const { title, description, is_template } = req.body;
      const board = await boardService.createBoard({
        title,
        description,
        is_template,
        userId,
      });
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã tạo board mới',
        target_type: 'Board',
        target_id: board._id,
      });

      // ✅ Emit socket event: board_created
      emitToUser(
        'board_created',
        {
          boardId: board._id.toString(),
          board: {
            _id: board._id,
            title: board.title,
            description: board.description,
            is_template: board.is_template,
            created_by: board.created_by,
            created_at: board.created_at,
          },
          createdBy: userId,
          timestamp: new Date().toISOString(),
        },
        userId
      );

      res.status(201).json({ success: true, data: board });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getBoardDetail(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const roles = req.user?.roles || []; // <-- lấy danh sách role

      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã lấy chi tiết board',
        target_type: 'Board',
        target_id: id,
      });
      // Nếu là admin hoặc System_Manager => bỏ qua kiểm tra quyền
      if (roles.includes('admin') || roles.includes('System_Manager')) {
        const board = await boardService.getBoardById(id);
        if (!board) return res.status(404).json({ success: false, message: 'Board không tồn tại' });
        return res.json({ success: true, data: board });
      }

      // Còn lại: kiểm tra quyền như bình thường
      const board = await boardService.getBoardIfPermitted(id, userId);
      if (board === null)
        return res.status(404).json({ success: false, message: 'Board không tồn tại' });
      if (board === 'forbidden')
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập board này',
        });

      res.json({ success: true, data: board });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

  async updateBoard(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updated = await boardService.updateBoard(id, req.body, userId);
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã update chi tiết board',
        target_type: 'Board',
        target_id: id,
      });
      if (updated === null)
        return res.status(404).json({ success: false, message: 'Board không tồn tại' });

      // ✅ Emit socket event: board_updated
      // Lấy danh sách members của board để emit đến họ
      const boardMembers = await boardMemberRepo.findByBoardId(id);
      const memberIds = boardMembers.map(m => m.user_id?.toString()).filter(Boolean);

      emitToUsers(
        'board_updated',
        {
          boardId: id,
          board: {
            _id: updated._id,
            title: updated.title,
            description: updated.description,
            is_template: updated.is_template,
            updated_at: updated.updated_at,
          },
          updatedBy: userId,
          changes: req.body, // Các fields đã thay đổi
          timestamp: new Date().toISOString(),
        },
        memberIds
      );

      res.json({ success: true, data: updated });
    } catch (err) {
      if (err.message === 'FORBIDDEN') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền cập nhật board này',
        });
      }
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

  async deleteBoard(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      // ✅ Lấy danh sách members TRƯỚC KHI xóa board
      const boardMembers = await boardMemberRepo.findByBoardId(id);
      const memberIds = boardMembers.map(m => m.user_id?.toString()).filter(Boolean);

      await boardService.deleteBoard(id, userId);
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã xóa board',
        target_type: 'Board',
        target_id: id,
      });

      // ✅ Emit socket event: board_deleted
      emitToUsers(
        'board_deleted',
        {
          boardId: id,
          deletedBy: userId,
          timestamp: new Date().toISOString(),
        },
        memberIds
      );

      res.json({ success: true, message: 'Xóa board thành công' });
    } catch (err) {
      if (err.message === 'FORBIDDEN') {
        return res.status(403).json({ success: false, message: 'Chỉ creator được phép xóa board' });
      }
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }

  async cloneBoard(req, res) {
    try {
      const userId = req.user?.id;
      const { templateId } = req.params; // lấy id template từ URL
      const { title, description } = req.body || {}; // dữ liệu tạo board mới
      await activityLogService.createActivityLog({
        user_id: userId,
        action: 'đã clone template về board',
        target_type: 'Board',
        target_id: templateId,
      });
      // Validate input
      if (!templateId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu templateId',
        });
      }

      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Tên board không được để trống',
        });
      }

      // userId lấy từ token
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không xác thực' });
      }

      // Gọi service clone
      const result = await boardService.cloneBoard(templateId, {
        title,
        description,
        userId,
      });

      // ✅ Emit socket event: board_created (khi clone board)
      if (result && result.board) {
        emitToUser(
          'board_created',
          {
            boardId: result.board._id.toString(),
            board: {
              _id: result.board._id,
              title: result.board.title,
              description: result.board.description,
              is_template: result.board.is_template,
              created_by: result.board.created_by,
              created_at: result.board.created_at,
            },
            createdBy: userId,
            timestamp: new Date().toISOString(),
          },
          userId
        );
      }

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Clone board thất bại',
      });
    }
  }

  // Cấu hình Board settings - Story 24
  async configureBoardSettings(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { columns, swimlanes } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không xác thực' });
      }

      // Kiểm tra quyền truy cập board
      const board = await boardService.getBoardIfPermitted(id, userId);
      if (board === null)
        return res.status(404).json({ success: false, message: 'Board không tồn tại' });
      if (board === 'forbidden')
        return res.status(403).json({
          success: false,
          message: 'Không có quyền cấu hình board này',
        });

      const result = await boardService.configureBoardSettings(id, { columns, swimlanes }, userId);

      res.json({
        success: true,
        message: 'Cấu hình board thành công',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Thu gọn/mở rộng Swimlane - Story 26
  async toggleSwimlane(req, res) {
    try {
      const userId = req.user?.id;
      const { boardId, swimlaneId } = req.params;
      const { collapsed } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không xác thực' });
      }

      const result = await boardService.toggleSwimlaneCollapse(
        boardId,
        swimlaneId,
        collapsed,
        userId
      );

      res.json({
        success: true,
        message: `Swimlane đã được ${collapsed ? 'thu gọn' : 'mở rộng'}`,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new BoardController();

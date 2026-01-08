const groupService = require("../services/group.service");
const queryParser = require("../utils/queryParser");

class GroupController {
  async create(req, res) {
    try {
      const userId = req.user?.id;
      const { center_id, name, description } = req.body;

      const group = await groupService.createGroup({
        center_id,
        name,
        description,
        userId,
      });
      res.json({ success: true, data: group });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const group = await groupService.getGroupById(req.params.id);
      res.json({ success: true, data: group });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async getAll(req, res) {
    try {
      // Parse query params với queryParser
      const parsed = queryParser.parseQuery(req.query, {
        allowedFilters: ["center_id"],
        allowedSortFields: ["createdAt", "updatedAt", "name"],
        maxLimit: 100,
        defaults: {
          page: 1,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });

      // Get groups from service
      const result = await groupService.getAllGroups({
        page: parsed.pagination.page,
        limit: parsed.pagination.limit,
        sortBy: parsed.metadata.sortBy,
        sortOrder: parsed.metadata.sortOrder,
        filter: parsed.filter,
        search: parsed.search,
      });

      // Build deep link response
      const baseUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}${
        req.path
      }`;
      const response = queryParser.buildDeepLinkResponse(
        result.groups,
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
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async update(req, res) {
    try {
      const userId = req.user?.id;
      const group = await groupService.updateGroup(
        req.params.id,
        req.body,
        userId
      );
      res.json({ success: true, data: group });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      const userId = req.user?.id;
      await groupService.deleteGroup(req.params.id, userId);
      res.json({ success: true, message: "Xoá group thành công" });
    } catch (err) {
      // Xử lý lỗi thân thiện hơn
      if (err.message.includes("Chỉ người tạo group mới được xóa group")) {
        return res.status(403).json({
          success: false,
          message:
            "Bạn không có quyền xóa group này. Chỉ người tạo group mới có thể xóa.",
        });
      }

      if (err.message.includes("Bạn không phải thành viên của group này")) {
        return res.status(403).json({
          success: false,
          message: "Bạn không phải thành viên của group này",
        });
      }

      if (err.message.includes("ID group không hợp lệ")) {
        return res.status(400).json({
          success: false,
          message: "ID group không hợp lệ",
        });
      }

      if (err.message.includes("Không tìm thấy group để xoá")) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy group để xóa",
        });
      }

      // Lỗi khác
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // Xóa group (Admin hệ thống)
  async adminDelete(req, res) {
    try {
      const adminId = req.user?.id;
      const roles = req.user?.roles;

      await groupService.adminDeleteGroup(req.params.id, roles);
      res.json({ success: true, message: "Admin xóa group thành công" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminViewBoard(req, res) {
    try {
      const { idUser, idGroup } = req.body;
      if (!idUser) throw new Error("chưa nhập idUser");
      if (!idGroup) throw new Error("chưa nhập idGroup");
      const BoardUser = await groupService.viewBoardMember(idUser, idGroup);
      return res.json({
        success: true,
        data: BoardUser,
      });
    } catch (error) {
      throw new Error(`lỗi lấy bảng của user: ${error.message}`);
    }
  }
}

module.exports = new GroupController();

const rolePermissionService = require("../services/rolePermission.service");

class RolePermissionController {
  async create(req, res) {
    try {
      const newRP = await rolePermissionService.createRolePermission(req.body);
      res.status(201).json({ success: true, data: newRP });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const list = await rolePermissionService.getAllRolePermissions();
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const data = await rolePermissionService.getRolePermissionById(
        req.params.id
      );
      if (!data)
        return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getByRole(req, res) {
    try {
      const data = await rolePermissionService.getPermissionsByRole(
        req.params.roleId
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const { currentUserId, permissions } = req.body; // từ FE gửi

      if (!currentUserId || !permissions) {
        return res
          .status(400)
          .json({ success: false, message: "Thiếu userId hoặc permissions" });
      }

      // Gọi service để xử lý logic role riêng/nếu trùng
      const result = await rolePermissionService.updateRolePermissions(
        currentUserId,
        permissions
      );

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error("❌ Lỗi cập nhật rolePermission:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updatePermisson(req, res) {
    try {
      const { idRole, permissions } = req.body; // từ FE gửi

      if (!idRole || !permissions) {
        return res
          .status(400)
          .json({ success: false, message: "Thiếu userId hoặc permissions" });
      }

      // Gọi service để xử lý logic
      const result = await rolePermissionService.updateByRoleId(
        idRole,
        permissions
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      await rolePermissionService.deleteRolePermission(req.params.id);
      res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  async getPermissionsByNameRole(req, res) {
    try {
      const nameRole = req.params.name;

      // Gọi service để lấy danh sách quyền theo tên role
      const permissions = await rolePermissionService.getPermissionsByNameRole(
        nameRole
      );

      res.status(200).json({ success: true, data: permissions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new RolePermissionController();

const permissionService = require("../services/permission.service");

class PermissionController {
  async create(req, res) {
    try {
      const permission = await permissionService.createPermission(req.body);
      res.status(201).json({ success: true, data: permission });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const permissions = await permissionService.getAllPermissions();
      res.status(200).json({ success: true, data: permissions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const permission = await permissionService.getPermissionById(
        req.params.id
      );
      res.status(200).json({ success: true, data: permission });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const updated = await permissionService.updatePermission(
        req.params.id,
        req.body
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      await permissionService.deletePermission(req.params.id);
      res
        .status(200)
        .json({ success: true, message: "Permission deleted successfully" });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PermissionController();

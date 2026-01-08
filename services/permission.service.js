// services/permission.service.js
const permissionRepository = require("../repositories/permission.repository");

class PermissionService {
  async createPermission(data) {
    const existing = await permissionRepository.findByCode(data.code);

    if (existing) {
      throw new Error("Permission code already exists");
    }
    return await permissionRepository.create(data);
  }

  async getAllPermissions() {
    return await permissionRepository.findAll();
  }

  async getPermissionById(id) {
    const permission = await permissionRepository.findById(id);
    if (!permission) throw new Error("Permission not found");
    return permission;
  }

  async updatePermission(id, data) {
    const permission = await permissionRepository.update(id, data);
    if (!permission) throw new Error("Permission not found");
    return permission;
  }

  async deletePermission(id) {
    const permission = await permissionRepository.delete(id);
    if (!permission) throw new Error("Permission not found");
    return permission;
  }

  async getByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      console.warn("⚠️ Giá trị ids không hợp lệ:", ids);
      throw new Error("Danh sách ID không hợp lệ");
    }
    return await permissionRepository.findByIds(ids);
  }
}

module.exports = new PermissionService();

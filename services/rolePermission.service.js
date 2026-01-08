const rolePermissionRepository = require('../repositories/rolePermission.repository');
const roleRepository = require('../repositories/role.repository');
const UserRole = require('../models/userRole.model.js');
const Role = require('../models/role.model.js');
const userRoleRepository = require('../repositories/userRole.repository.js');
const mongoose = require('mongoose');
class RolePermissionService {
  async createRolePermission(data) {
    return await rolePermissionRepository.create(data);
  }

  async getAllRolePermissions() {
    return await rolePermissionRepository.findAll();
  }

  async getRolePermissionById(id) {
    return await rolePermissionRepository.findById(id);
  }

  async getPermissionsByRole(roleId) {
    return await rolePermissionRepository.findByRoleId(roleId);
  }

  async updateRolePermission(id, data) {
    return await rolePermissionRepository.update(id, data);
  }

  async deleteRolePermission(id) {
    return await rolePermissionRepository.delete(id);
  }

  async deleteRolePermissionsByRole(roleId) {
    return await rolePermissionRepository.deleteByRoleId(roleId);
  }

  /**
   * ✅ Lấy RolePermission theo danh sách ID
   */
  async getByIds(ids) {
    return await rolePermissionRepository.findByIds(ids);
  }

  /**
   * ✅ Lấy RolePermission theo danh sách role_id
   */
  async getByRoleIds(roleIds) {
    return await rolePermissionRepository.findByRoleIds(roleIds);
  }

  async getPermissionsByNameRole(nameRole) {
    const role = await roleRepository.findByName(nameRole);
    if (!role) {
      throw new Error(`Không tìm thấy role có tên "${nameRole}"`);
    }

    // Tìm tất cả quyền gắn với role này
    const rolePermissions = await rolePermissionRepository.findByRoleIds([role._id]);

    // Trả về danh sách permission (đã populate)
    return rolePermissions.map(rp => rp.permission_id);
  }

  async updateByRoleId(roleId, permissionIds) {
    const role = await roleRepository.findById(roleId);

    if (!role) {
      return { success: false, message: 'Role không tồn tại' };
    }

    // ✅ So sánh chuẩn, không phân biệt hoa thường
    if (role?.name?.trim().toLowerCase() === 'system_manager') {
      return {
        success: false,
        message: 'Không thể sửa quyền của role hệ thống',
      };
    }

    // 1️⃣ Xóa quyền cũ
    await rolePermissionRepository.deleteByRoleId(roleId);

    // 2️⃣ Thêm quyền mới
    const newRolePermissions = permissionIds.map(pid => ({
      role_id: roleId,
      permission_id: pid,
    }));

    if (newRolePermissions.length > 0) {
      await rolePermissionRepository.insertMany(newRolePermissions);
    }

    return { success: true, message: 'Cập nhật quyền cho role thành công' };
  }

  async countUsersByRole(roleId) {
    try {
      const role = await Role.findById(roleId);
      if (!role) {
        return 0;
      }

      const count = await UserRole.countDocuments({
        role_id: role._id,
        status: 'active',
      });
      return count;
    } catch (error) {
      return 0;
    }
  }
  async updateRolePermissions(userId, permissionIds) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1️⃣ Lấy tất cả role của user
      const userRoles = await userRoleRepository.findRolesByUser(userId);

      let roleId;

      if (userRoles.length > 0) {
        const currentRole = userRoles[0].role_id;

        // Nếu bản ghi userRole tồn tại nhưng role_id null (tham chiếu bị thiếu),
        // xử lý như user chưa có role: tạo role mới cho user
        if (!currentRole || !currentRole._id) {
          const newRole = await Role.create([{ name: `role_for_${userId}` }], {
            session,
          });
          roleId = newRole[0]._id;

          // Gán role mới cho user
          await UserRole.create([{ user_id: userId, role_id: roleId }], {
            session,
          });
        } else {
          const count = await this.countUsersByRole(currentRole._id);

          if (count > 1) {
            // 🧱 Nếu có nhiều user đang dùng role này → tạo role riêng
            const existingPrivateRole = await Role.findOne({
              name: `role_for_${userId}`,
            });
            if (existingPrivateRole) {
              roleId = existingPrivateRole._id;
            } else {
              const newRole = await Role.create([{ name: `role_for_${userId}` }], { session });
              roleId = newRole[0]._id;

              // Gán role mới cho user
              await UserRole.create([{ user_id: userId, role_id: roleId }], {
                session,
              });
            }
          } else {
            // ✅ Nếu chỉ mình user này có role đó → dùng luôn role cũ
            roleId = currentRole._id;
          }
        }
      } else {
        // 🧩 Nếu user chưa có role nào → tạo mới hoàn toàn
        const newRole = await Role.create([{ name: `role_for_${userId}` }], {
          session,
        });
        roleId = newRole[0]._id;

        await UserRole.create([{ user_id: userId, role_id: roleId }], {
          session,
        });
      }

      // 2️⃣ Xóa permission cũ của role này
      await rolePermissionRepository.deleteByRoleId(roleId, { session });

      // 3️⃣ Thêm permission mới
      if (permissionIds?.length > 0) {
        const newPermissions = permissionIds.map(pid => ({
          role_id: roleId,
          permission_id: pid,
        }));

        const inserted = await rolePermissionRepository.insertMany(newPermissions, { session });
      }

      await session.commitTransaction();
      session.endSession();
      return { success: true, roleId };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

module.exports = new RolePermissionService();

const userRoleRepo = require("../repositories/userRole.repository");
const roleRepository = require("../repositories/role.repository");

/**
 * UserRole Service - Xử lý business logic cho UserRole
 * Chứa các methods xử lý logic nghiệp vụ liên quan đến user-role
 */
class UserRoleService {
  /** Lấy tất cả user-role */
  async viewAll(options = {}) {
    try {
      // If no options, return old format for backward compatibility
      if (Object.keys(options).length === 0) {
        const userRoles = await userRoleRepo.findAll();
        return userRoles;
      }

      // With options, return paginated format
      return await userRoleRepo.findAll(options);
    } catch (error) {
      throw error;
    }
  }

  /** Lấy 1 role của user (nếu mỗi user chỉ có 1 role) */
  async getRole(userId) {
    try {
      const role = await userRoleRepo.findRoleByUser(userId);
      if (role) {
      } else {
      }
      return role;
    } catch (error) {
      throw error;
    }
  }

  /** Lấy tất cả role của user (nếu 1 user có nhiều role) */
  async getRoles(userId) {
    try {
      const roles = await userRoleRepo.findRolesByUser(userId);
      return roles;
    } catch (error) {
      throw error;
    }
  }

  /** Thêm mới user-role */
  async create(userRoleData) {
    try {
      if (!userRoleData.user_id) throw new Error("user_id bị thiếu");
      if (!userRoleData.role_id) throw new Error("role_id bị thiếu");

      const role = await roleRepository.findById(userRoleData.role_id);
      if (role?.name === "System_Manager") {
        throw new Error("Không thể gán role System_Manager cho user khác");
      }

      const exists = await userRoleRepo.findByUserAndRole(
        userRoleData.user_id,
        userRoleData.role_id
      );
      if (exists) {
        return exists;
      }

      const newUserRole = await userRoleRepo.create(userRoleData);
      return newUserRole;
    } catch (error) {
      throw error;
    }
  }

  /** Cập nhật role của user-role record */
  async update(userRoleId, updateData) {
    try {
      const userRole = await userRoleRepo.findById(userRoleId);
      if (!userRole) throw new Error("User-role không tồn tại");

      // Check role cũ
      const role = await roleRepository.findById(userRole.role_id);
      if (role?.name === "System_Manager") {
        throw new Error("Không thể gán role System_Manager cho user khác");
      }

      // Check role mới
      if (updateData.role_id) {
        const newRole = await roleRepository.findById(updateData.role_id);
        if (newRole?.name === "System_Manager") {
          throw new Error("Không thể gán System_Manager khi update");
        }
      }

      const updatedUserRole = await userRoleRepo.update(userRoleId, updateData);
      return updatedUserRole;
    } catch (error) {
      throw error;
    }
  }

  /** Xóa 1 user-role theo id */
  async delete(userRoleId) {
    try {
      const userRole = await userRoleRepo.findById(userRoleId);
      if (!userRole) throw new Error("User-role không tồn tại");
      const role = await roleRepository.findById(userRole.role_id);
      if (role?.name === "System_Manager") {
        throw new Error("Không thể gán role System_Manager cho user khác");
      }
      const deleted = await userRoleRepo.delete(userRoleId);
      return deleted;
    } catch (error) {
      throw error;
    }
  }

  /** Xóa tất cả role của 1 user */
  async deleteByUser(userId) {
    try {
      // Lấy danh sách roles hiện có của user
      const userRoles = await userRoleRepo.findByUser(userId);

      // Lấy thêm tên role để check System_Manager
      const rolesWithName = await Promise.all(
        userRoles.map(async (ur) => {
          const role = await roleRepository.findById(ur.role_id);
          return { ...ur, name: role?.name };
        })
      );

      const protectedRoles = ["System_Manager"];
      const rolesToDelete = rolesWithName.filter(
        (r) => !protectedRoles.includes(r.name)
      );

      if (rolesToDelete.length === 0) {
        return { deletedCount: 0 };
      }

      const result = await userRoleRepo.deleteManyByIds(
        rolesToDelete.map((r) => r._id)
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  /** Tìm 1 user-role theo user_id và role_id */
  async findByUserAndRole(user_id, role_id) {
    if (!user_id) throw new Error("user_id bị thiếu");
    if (!role_id) throw new Error("role_id bị thiếu");

    return await userRoleRepo.findByUserAndRole(user_id, role_id);
  }

  /** Lấy danh sách user theo role name */
  async findIdRoleByName(nameRole) {
    const role = await roleRepository.findByName(nameRole);
    if (!role) throw new Error("Không tìm thấy role");

    const idRole = role.data.data._id;
    if (!idRole) throw new Error("Không tìm thấy id role");

    const users = await userRoleRepo.findUserByIdRole(idRole);
    return users.data;
  }

  async createIfNotExists(userId, roleId) {
    if (!userId || !roleId) return null;

    const existing = await UserRole.findOne({
      user_id: userId,
      role_id: roleId,
    });

    if (existing) return existing;

    const newUserRole = new UserRole({
      user_id: userId,
      role_id: roleId,
    });

    return await newUserRole.save();
  }
}

module.exports = new UserRoleService();

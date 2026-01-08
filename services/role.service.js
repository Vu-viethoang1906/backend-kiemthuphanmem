const RoleRepository = require("../repositories/role.repository");
const UserRoleRepository = require("../repositories/userRole.repository");

/**
 * Role Service - Xử lý logic nghiệp vụ cho Role
 * Chứa các methods xử lý business logic cho Role
 */
class RoleService {
  /**
   * Lấy tất cả roles
   * @returns {Array} Danh sách tất cả roles
   */
  async getAllRoles() {
    try {
      const roles = await RoleRepository.findAll();
      return roles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy role theo ID
   * @param {String} id - ID của role
   * @returns {Object|null} Thông tin role hoặc null
   */
  async getRoleById(id) {
    try {
      const role = await RoleRepository.findById(id);
      if (role) {
      } else {
      }
      return role;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy role theo tên
   * @param {String} name - Tên của role
   * @returns {Object|null} Thông tin role hoặc null
   */
  async getRoleByName(name) {
    try {
      const role = await RoleRepository.findByName(name);
      if (role) {
      } else {
      }
      return role;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tạo role mới
   * @param {Object} roleData - Dữ liệu role mới
   * @returns {Object} Role đã tạo
   */
  async createRole(roleData) {
    try {
      // Validate input
      if (!roleData.name || !roleData.name.trim()) {
        throw new Error("Tên role là bắt buộc");
      }

      // Check if role already exists
      const existingRole = await RoleRepository.findByName(
        roleData.name.trim()
      );
      
      if (existingRole) {
        const error = new Error("Tên role đã tồn tại");
        error.statusCode = 409; // Conflict
        throw error;
      }

      const newRole = await RoleRepository.create(roleData);
      return newRole;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cập nhật role
   * @param {String} id - ID của role
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Object|null} Role đã cập nhật hoặc null
   */
  async updateRole(id, updateData) {
    try {
      // Check if role exists
      const existingRole = await RoleRepository.findById(id);
      if (!existingRole) {
        return null;
      }

      // ❌ Không cho cập nhật role System_Manager
      if (existingRole.name === "System_Manager") {
        throw new Error("Role System_Manager không được cập nhật");
      }

      // Nếu đổi tên, kiểm tra tên mới đã tồn tại chưa
      if (updateData.name && updateData.name !== existingRole.name) {
        const nameExists = await RoleRepository.findByName(
          updateData.name.trim()
        );
        if (nameExists) {
          const error = new Error("Tên role đã tồn tại");
          error.statusCode = 409; // Conflict
          throw error;
        }

        if (updateData.name === "admin" || updateData.name === "user")
          throw new Error("Tên role này của hệ thống ko đc sửa");
      }

      const updatedRole = await RoleRepository.update(id, updateData);
      
      return updatedRole;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Xóa role
   * @param {String} id - ID của role
   * @returns {Object|null} Role đã xóa hoặc null
   */
  async deleteRole(id) {
    try {
      // Check if role exists
      const existingRole = await RoleRepository.findById(id);
      if (!existingRole) {
        return null;
      }

      // ❌ Không cho xóa role System_Manager
      if (
        existingRole.name === "System_Manager" ||
        existingRole.name === "admin"
      ) {
        throw new Error("Role System_Manager không được xóa");
      }

      // Check if role is being used by any user
      const usersWithRole = await UserRoleRepository.findByRoleId(id);
      if (usersWithRole && usersWithRole.length > 0) {
        throw new Error("Không thể xóa role đang được sử dụng bởi user");
      }

      const deletedRole = await RoleRepository.delete(id);
      return deletedRole;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy role của user
   * @param {String} userId - ID của user
   * @returns {String|null} Tên role hoặc null
   */
  async getUserRoles(userId) {
    try {
      const roles = await RoleRepository.GetRoles(userId);
      return roles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy role của user (legacy method - deprecated)
   * @deprecated Use getUserRole instead
   * @param {String} userId - ID của user
   * @returns {String|null} Tên role hoặc null
   */
  async viewRole(userId) {
    return this.getUserRole(userId);
  }
  async getIdByName(nameRole) {
    try {
      return await RoleRepository.getIdByName(nameRole);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RoleService();

const roleModel = require('../models/role.model');
const userRoleModel = require('../models/userRole.model');

/**
 * Role Repository - Xử lý logic tương tác với database cho Role
 * Chứa các methods CRUD cơ bản và tìm kiếm role
 */
class RoleRepository {

  /**
   * Tìm role theo ID
   * @param {String} id - ID của role
   * @returns {Object|null} Thông tin role hoặc null
   */
  async findById(id) {
    try {
      const role = await roleModel.findById(id).lean();
      if (role) {
      } else {
      }
      return role;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tìm role theo tên
   * @param {String} name - Tên của role
   * @returns {Object|null} Thông tin role hoặc null
   */
  async findByName(name) {
    try {
      const role = await roleModel.findOne({ name: name.trim() }).lean();
      if (role) {
      } else {
      }
      return role;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy tất cả roles
   * @returns {Array} Danh sách tất cả roles
   */
  async findAll() {
    try {
      const roles = await roleModel.find().lean();
      return roles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tạo role mới
   * @param {Object} roleData - Dữ liệu role mới
   * @returns {Object} Role đã tạo
   */
  async create(roleData) {
    try {
      const newRole = await roleModel.create(roleData);
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
async update(id, updateData) {
  try {

    // 1️⃣ Lấy role hiện tại
    const existingRole = await roleModel.findById(id).lean();
    if (!existingRole) {
      return { success: false, message: "Role không tồn tại" };
    }

    // 2️⃣ Chặn role admin/user/System_Manager mà không ném lỗi
    const protectedRoles = ["System_Manager", "admin", "user"];
    if (protectedRoles.includes((existingRole.name || "").trim())) {
      return { success: false, message: `Role ${existingRole.name} không được cập nhật` };
    }

    // 3️⃣ Update role
    const updatedRole = await roleModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    return { success: true, data: updatedRole };
  } catch (error) {
    return { success: false, message: error.message || "Có lỗi xảy ra" };
  }
}


  /**
   * Xóa role
   * @param {String} id - ID của role
   * @returns {Object|null} Role đã xóa hoặc null
   */
  async delete(id) {
    try {
      const deletedRole = await roleModel.findByIdAndDelete(id).lean();
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
  async GetRoles(userId) {
  try {
    // Lấy tất cả role_id của user
    const userRoles = await userRoleModel.find({ user_id: userId }).lean();
    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    // Lấy thông tin name của từng role
    const roleIds = userRoles.map(ur => ur.role_id);
    const roles = await roleModel.find({ _id: { $in: roleIds } }).select('name').lean();

    const roleNames = roles.map(r => r.name);
    return roleNames;

  } catch (error) {
    throw error;
  }
}


  /**
   * Kiểm tra role có tồn tại không
   * @param {String} id - ID của role
   * @returns {Boolean} True nếu tồn tại, false nếu không
   */
  async exists(id) {
    try {
      const count = await roleModel.countDocuments({ _id: id });
      const exists = count > 0;
      return exists;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Đếm số lượng roles
   * @returns {Number} Số lượng roles
   */
  async count() {
    try {
      const count = await roleModel.countDocuments();
      return count;
    } catch (error) {
      throw error;
    }
  }
  async getIdByName(nameRole){
    try {
       const Role = await this.findByName(nameRole);
       const RoleId = Role._id;
  return RoleId ;
    } catch (error) {
       throw error;
    }
 
  }

}


module.exports = new RoleRepository();
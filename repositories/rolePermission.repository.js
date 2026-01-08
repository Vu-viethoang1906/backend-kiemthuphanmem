const RolePermission = require('../models/rolePermission.model');

class RolePermissionRepository {
  async create(data) {
    return await RolePermission.create(data);
  }

  async findAll() {
    return await RolePermission.find()
      .populate('role_id')
      .populate('permission_id')
      .exec();
  }

  async findById(id) {
    return await RolePermission.findById(id)
      .populate('role_id')
      .populate('permission_id')
      .exec();
  }

  async findByRoleId(roleId) {
    return await RolePermission.find({ role_id: roleId })
      .populate('permission_id')
      .exec();
  }

  async update(id, data) {
    return await RolePermission.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await RolePermission.findByIdAndDelete(id);
  }

  async deleteByRoleId(roleId) {
    return await RolePermission.deleteMany({ role_id: roleId });
  }

  
  /**
   * ✅ Lấy tất cả RolePermission theo danh sách ID (RolePermission._id)
   */
  async findByIds(ids) {
    return await RolePermission.find({ _id: { $in: ids } })
      .populate('role_id')
      .populate('permission_id');
  }

  /**
   * ✅ Lấy tất cả RolePermission theo danh sách role_id
   */
  async findByRoleIds(roleIds) {
    return await RolePermission.find({ role_id: { $in: roleIds } })
      .populate('role_id')
      .populate('permission_id');
  }

  async findbyNameRole(nameRole){
    return await RolePermission.find({
    })
  }


  async insertMany(list) {
  return await RolePermission.insertMany(list);
}

}

module.exports = new RolePermissionRepository();

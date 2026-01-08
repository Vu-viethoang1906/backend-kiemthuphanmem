const UserRole = require("../models/userRole.model");
const Role = require("../models/role.model");

class UserRoleRepository {
  // Tìm role theo user_id
  async findRoleByUser(userId) {
    const userRoles = await UserRole.find({
      user_id: userId.toString(),
    }).lean();
    if (!userRoles || userRoles.length === 0) return [];

    const roles = await Role.find({
      _id: { $in: userRoles.map((ur) => ur.role_id) },
    }).lean();
    return roles;
  }

  async findAll(options = {}) {
    // Backward compatible - no options
    if (Object.keys(options).length === 0) {
      return await UserRole.find()
        .populate("user_id", "email username full_name")
        .populate("role_id", "name description")
        .lean();
    }

    // With options - paginated with filter/search
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "created_at",
        sortOrder = "desc",
        filter = {},
        search = null,
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      const matchQuery = {};

      // Apply filters
      if (filter.user_id) matchQuery.user_id = filter.user_id;
      if (filter.role_id) matchQuery.role_id = filter.role_id;
      if (filter.status) matchQuery.status = filter.status;

      const pipeline = [
        { $match: matchQuery },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "Roles",
            localField: "role_id",
            foreignField: "_id",
            as: "role",
          },
        },
        {
          $addFields: {
            user_info: { $arrayElemAt: ["$user", 0] },
            role_info: { $arrayElemAt: ["$role", 0] },
          },
        },
      ];

      // Apply search
      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { "user_info.email": { $regex: search, $options: "i" } },
              { "user_info.username": { $regex: search, $options: "i" } },
              { "user_info.full_name": { $regex: search, $options: "i" } },
              { "role_info.name": { $regex: search, $options: "i" } },
            ],
          },
        });
      }

      // Count total
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await UserRole.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Add sort, skip, limit
      pipeline.push({ $sort: sort });
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      // Project final shape
      pipeline.push({
        $project: {
          _id: 1,
          user_id: 1,
          role_id: 1,
          status: 1,
          assigned_by: 1,
          created_at: 1,
          updated_at: 1,
          user_info: {
            _id: "$user_info._id",
            email: "$user_info.email",
            username: "$user_info.username",
            full_name: "$user_info.full_name",
          },
          role_info: {
            _id: "$role_info._id",
            name: "$role_info.name",
            description: "$role_info.description",
          },
        },
      });

      const userRoles = await UserRole.aggregate(pipeline);

      return {
        userRoles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async findRolesByUser(userId) {
    return await UserRole.find({ user_id: userId.toString() })
      .populate("role_id")
      .lean();
  }

  async findUserByIdRole(roleId) {
    return await UserRole.find({ role_id: roleId.toString() }).lean();
  }

  async create(userRoleData) {
    return await UserRole.create(userRoleData);
  }

  async update(userRoleId, updateData) {
    return await UserRole.findByIdAndUpdate(userRoleId, updateData, {
      new: true,
    }).lean();
  }

  async delete(userRoleId) {
    return await UserRole.findByIdAndDelete(userRoleId).lean();
  }

  async deleteByUser(userId) {
    return await UserRole.deleteMany({ user_id: userId.toString() });
  }

  async findByUserAndRole(user_id, role_id) {
    return await UserRole.findOne({ user_id, role_id });
  }

  /**
   *
   * @param {string} roleName
   */

  async countUsersByRole(roleId) {
    try {
      const count = await UserRole.countDocuments({
        role_id: roleId,
        status: "active",
      });

      const users = await UserRole.find({
        role_id: roleId,
        status: "active",
      }).populate("user_id", "username email");

      return count;
    } catch (error) {
      return 0;
    }
  }
  async deleteManyByIds(ids) {
    return await UserRole.deleteMany({ _id: { $in: ids } });
  }

  async findByUser(userId) {
    if (!userId) throw new Error("❌ userId bị thiếu");

    const userRoles = await UserRole.find({ user_id: userId }).populate(
      "role_id"
    );

    return userRoles;
  }

  async updateByIdUser(idCreate, idUser, roleUpdate) {
    try {
      // Kiểm tra roleUpdate xem có System_Manager không
      if (Array.isArray(roleUpdate)) {
        roleUpdate = roleUpdate[0]; // lấy phần tử đầu tiên nếu là mảng
      }

      if (roleUpdate === "System_Manager") {
        throw new Error("⚠️ Không được gán role System_Manager");
      }

      // Lấy role hiện tại của user
      const currentRoles = await UserRole.find({ user_id: idUser }).populate(
        "role_id"
      );
      const hasSystemManager = currentRoles.some(
        (r) => r.role_id && r.role_id.name === "System_Manager"
      );

      if (hasSystemManager) {
        throw new Error("⚠️ Không thể sửa role của user System_Manager");
      }

      // Tìm id role mới
      const role = await Role.findOne({ name: roleUpdate });
      if (!role) throw new Error(`Không tìm thấy role với tên: ${roleUpdate}`);

      const idrole = role._id;

      // Xóa tất cả role cũ của user
      await UserRole.deleteMany({ user_id: idUser });

      // Tạo role mới
      const newUserRole = {
        user_id: idUser,
        role_id: idrole,
        assigned_by: idCreate,
        status: "active",
      };

      const result = await UserRole.create(newUserRole);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /* Tìm 1 user-role theo ID
   * @param {string} userRoleId - ID của user-role
   * @returns {Promise<Object|null>} user-role hoặc null nếu không tìm thấy
   */
  async findById(userRoleId) {
    if (!userRoleId) throw new Error("userRoleId bị thiếu");

    try {
      const userRole = await UserRole.findById(userRoleId).lean();
      return userRole;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy tất cả user đang có role theo roleId
   * @param roleId
   * @returns array UserRole
   */
  async findByRoleId(roleId) {
    try {
      if (!roleId) {
        throw new Error("Role ID không được để trống");
      }

      // Query tất cả user có role này
      const usersWithRole = await UserRole.find({ role_id: roleId });

      return usersWithRole;
    } catch (error) {
      throw error;
    }
  }
  async findUsersByRoleIds(roleIds) {
    return UserRole.find({
      role_id: { $in: roleIds },
      user_id: { $exists: true, $ne: null }, // chỉ lấy bản ghi có user_id hợp lệ
    });
  }
}

module.exports = new UserRoleRepository();

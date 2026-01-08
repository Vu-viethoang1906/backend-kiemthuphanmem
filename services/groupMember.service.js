const mongoose = require("mongoose");
const groupMemberRepo = require("../repositories/groupMember.repository");
const userRepo = require("../repositories/user.repository");
const groupRepo = require("../repositories/group.repository");
const UserRole = require("../models/userRole.model");
const notificationSevice = require("../services/notification.service");

class GroupMemberService {
  async checkOwner(user_id, group_id) {
    if (!mongoose.Types.ObjectId.isValid(group_id)) {
      throw new Error("group_id không hợp lệ");
    }
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      throw new Error("user_id không hợp lệ");
    }

    const user = await userRepo.findById(user_id);
    if (!user) throw new Error("Người dùng không tồn tại");

    // Check system role
    const systemUserRole = await UserRole.findOne({ user_id }).populate(
      "role_id"
    );
    const isSystemAdmin =
      systemUserRole?.role_id?.name &&
      ["System_Manager", "admin"].includes(systemUserRole.role_id.name);

    if (isSystemAdmin) {
      return true;
    }

    const member = await groupMemberRepo.findMember(user_id, group_id);
    if (!member || member.role_in_group.toLowerCase().trim() !== "người tạo") {
      throw new Error("Bạn không có quyền thực hiện hành động này");
    }
  }

  async addMember({
    requester_id,
    user_id,
    group_id,
    role_in_group = "Người xem",
  }) {
    const requester = await userRepo.findById(requester_id);
    if (!requester) throw new Error("Người yêu cầu không tồn tại");

    // Check system role
    const systemUserRole = await UserRole.findOne({
      user_id: requester_id,
    }).populate("role_id");
    const isSystemAdmin =
      systemUserRole?.role_id?.name &&
      ["System_Manager", "admin"].includes(systemUserRole.role_id.name);

    if (!isSystemAdmin) {
      const requesterMember = await groupMemberRepo.findMember(
        requester_id,
        group_id
      );
      if (!requesterMember)
        throw new Error("Bạn không phải thành viên của group này");

      const requesterRole = requesterMember.role_in_group.toLowerCase().trim();

      if (requesterRole !== "người tạo" && requesterRole !== "quản trị viên") {
        throw new Error(
          "Chỉ người tạo hoặc quản trị viên mới có thể thêm thành viên"
        );
      }
    }

    const user = await userRepo.findById(user_id);
    if (!user) throw new Error("Người dùng không tồn tại");

    const group = await groupRepo.findById(group_id);
    if (!group) throw new Error("Group không tồn tại");

    const existing = await groupMemberRepo.findMember(user_id, group_id);
    if (existing) throw new Error("User đã là thành viên trong group này");

    return await groupMemberRepo.addMember({
      user_id,
      group_id,
      role_in_group,
    });
  }

  async updateMember({ requester_id, user_id, group_id, updateData }) {
    const mongoose = require("mongoose");

    if (!mongoose.Types.ObjectId.isValid(requester_id))
      throw new Error("requester_id không hợp lệ");
    if (!mongoose.Types.ObjectId.isValid(user_id))
      throw new Error("user_id không hợp lệ");
    if (!mongoose.Types.ObjectId.isValid(group_id))
      throw new Error("group_id không hợp lệ");
    const Group = await groupRepo.findById(group_id);
    if (!Group) throw new Error("Group ko tồn tại");
    const requesterMember = await groupMemberRepo.findMember(
      requester_id,
      group_id
    );
    if (!requesterMember)
      throw new Error("Bạn không phải thành viên của group này");

    const requesterRole = requesterMember.role_in_group?.toLowerCase().trim();
    const isOwner = requesterRole === "người tạo";
    const isAdmin = ["quản trị viên", "người quản lý"].includes(requesterRole);

    const isSelf = requester_id === user_id;

    const systemUser = await UserRole.findOne({
      user_id: requester_id,
    }).populate("role_id");
    const isSystemManager = systemUser?.role_id?.name === "System_Manager";

    if (!isOwner && !isAdmin && !isSystemManager && !isSelf) {
      throw new Error("Bạn không có quyền cập nhật thông tin thành viên này");
    }

    const allowedFields = {};

    if (updateData.role_in_group !== undefined) {
      if (!isOwner && !isAdmin && !isSystemManager) {
        throw new Error(
          "Chỉ Người tạo, Quản trị viên hoặc System_Manager mới có thể thay đổi role"
        );
      }

      const validRoles = ["Người tạo", "Quản trị viên", "Người xem"];
      const newRole = updateData.role_in_group.trim();

      if (!validRoles.includes(newRole)) {
        throw new Error("role_in_group không hợp lệ");
      }

      const targetMember = await groupMemberRepo.findMember(user_id, group_id);
      if (!targetMember)
        throw new Error("Không tìm thấy thành viên để cập nhật");

      const targetCurrentRole = targetMember.role_in_group?.trim();
      if (targetCurrentRole === "Người tạo" && newRole !== "Người tạo") {
        const owners = await groupMemberRepo.findMembersByRole(
          group_id,
          "Người tạo"
        );
        if (owners.length <= 1) {
          throw new Error("Không thể hạ cấp Người tạo cuối cùng của group");
        }
      }

      allowedFields.role_in_group = newRole;
    }

    if (Object.keys(allowedFields).length === 0) {
      throw new Error("Không có dữ liệu hợp lệ để cập nhật");
    }

    const updatedMember = await groupMemberRepo.updateMember(
      user_id,
      group_id,
      allowedFields
    );
    if (!updatedMember) throw new Error("Không thể cập nhật thành viên");
    // thông báo khi cập nhật thành công

    const dataNotifile = {
      user_id: user_id,
      title: `Thông báo từ Group: ${Group.name}`,
      body: `Bạn vừa được thay đổi quyền ${updatedMember.role_in_group}`,
    };
    const resultNotifile = await notificationSevice.createNotification(
      dataNotifile
    );

    return updatedMember;
  }

  async removeMember({ requester_id, user_id, group_id }) {
    const requester = await userRepo.findById(requester_id);
    if (!requester) throw new Error("Người yêu cầu không tồn tại");

    const members = await groupMemberRepo.findAllByGroup(group_id);
    if (!members || members.length === 0) {
      throw new Error("Nhóm không có thành viên nào");
    }
    const Group = await groupRepo.findById(group_id);
    if (!Group) throw new Error("Group ko tồn tại");
    if (members.length === 1) {
      throw new Error("Không thể xóa thành viên cuối cùng của nhóm");
    }

    // Check system role
    const systemUserRole = await UserRole.findOne({
      user_id: requester_id,
    }).populate("role_id");
    const isSystemAdmin =
      systemUserRole?.role_id?.name &&
      ["System_Manager", "admin"].includes(systemUserRole.role_id.name);

    if (!isSystemAdmin) {
      const requesterMember = await groupMemberRepo.findMember(
        requester_id,
        group_id
      );
      if (!requesterMember)
        throw new Error("Bạn không phải thành viên của group này");

      const requesterRole = requesterMember.role_in_group?.trim().toLowerCase();

      if (!["người tạo", "quản trị viên"].includes(requesterRole)) {
        throw new Error(
          "Chỉ người tạo hoặc quản trị viên mới có thể xóa thành viên"
        );
      }

      if (requester_id === user_id && requesterRole === "người tạo") {
        throw new Error("Người tạo group không thể xóa chính mình");
      }
    }

    const targetMember = await groupMemberRepo.findMember(user_id, group_id);
    if (!targetMember) throw new Error("Không tìm thấy thành viên để xóa");

    const targetRole = targetMember.role_in_group?.trim().toLowerCase();

    if (["người tạo", "quản trị viên"].includes(targetRole)) {
      const remainingLeaders = members.filter(
        (m) =>
          m.user_id.toString() !== user_id.toString() &&
          ["người tạo", "quản trị viên"].includes(
            m.role_in_group?.trim().toLowerCase()
          )
      );

      if (remainingLeaders.length === 0) {
        throw new Error(
          "Không thể xóa vì nhóm sẽ không còn Người tạo hoặc Quản trị viên nào"
        );
      }
    }

    const result = await groupMemberRepo.removeMember(user_id, group_id);
    if (result.deletedCount === 0) {
      throw new Error("Không thể xóa thành viên, có thể đã bị xóa trước đó");
    }
    const dataNotifile = {
      user_id: user_id,
      title: `Thông báo từ Group: ${Group.name}`,
      body: `Bạn vừa bị xóa khỏi nhóm`,
    };
    const resultNotifile = await notificationSevice.createNotification(
      dataNotifile
    );

    return true;
  }

  async getMembers(group_id) {
    const groupRepo = require("../repositories/group.repository");
    const group = await groupRepo.findById(group_id);
    if (!group) throw new Error("Group không tồn tại hoặc đã bị xóa");
    return await groupMemberRepo.getMembersByGroup(group_id);
  }

  async selectAll() {
    const groupMembers = await groupMemberRepo.selectAll();
    if (!groupMembers) throw new Error("Không thể truy xuất dữ liệu");
    return groupMembers;
  }

  async getGroupbyUser(id) {
    const groupUser = await groupMemberRepo.getByGroupMembers(id);
    if (!groupUser) throw new Error("Không thể truy xuất dữ liệu");
    return groupUser;
  }

  async addBulkMembers({ requester_id, group_id, members }) {
    const requester = await userRepo.findById(requester_id);
    if (!requester) throw new Error("Người yêu cầu không tồn tại");
    const Group = await groupRepo.findById(group_id);
    if (!Group) throw new Error("Group ko tồn tại");

    // Check system role
    const systemUserRole = await UserRole.findOne({
      user_id: requester_id,
    }).populate("role_id");
    const isSystemAdmin =
      systemUserRole?.role_id?.name &&
      ["System_Manager", "admin"].includes(systemUserRole.role_id.name);

    if (!isSystemAdmin) {
      const requesterMember = await groupMemberRepo.findMember(
        requester_id,
        group_id
      );

      if (!requesterMember)
        throw new Error("Bạn không phải thành viên của group này");

      const requesterRole = requesterMember.role_in_group.toLowerCase().trim();
      if (!["người tạo", "quản trị viên"].includes(requesterRole)) {
        throw new Error(
          "Chỉ người tạo hoặc quản trị viên mới có thể thêm thành viên"
        );
      }
    }

    if (!Array.isArray(members) || members.length === 0) {
      throw new Error("Danh sách thành viên không hợp lệ");
    }
    if (members.length > 50) {
      throw new Error("Không thể thêm quá 50 thành viên cùng lúc");
    }

    const group = await groupRepo.findById(group_id);
    if (!group) throw new Error("Group không tồn tại");

    const results = { success: [], errors: [], total: members.length };

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      try {
        if (!member.user_id) {
          results.errors.push({ index: i, error: "user_id là bắt buộc" });
          continue;
        }

        const user = await userRepo.findById(member.user_id);
        if (!user) {
          results.errors.push({ index: i, error: "Người dùng không tồn tại" });
          continue;
        }

        const existing = await groupMemberRepo.findMember(
          member.user_id,
          group_id
        );
        if (existing) {
          results.errors.push({
            index: i,
            error: "User đã là thành viên trong group này",
          });
          continue;
        }

        const role_in_group = member.role_in_group || "Người xem";
        const newMember = await groupMemberRepo.addMember({
          user_id: member.user_id,
          group_id,
          role_in_group,
        });
        //lấy

        // add thông báo cho người được thêm
        const dataNotifile = {
          user_id: member.user_id,
          title: `Chào mừng bạn đến với group ${Group.name}`,
          body: "Bạn vừa được thêm vào group hãy bắt đầu công việc với team mình nhé",
        };
        const resultNotifile = await notificationSevice.createNotification(
          dataNotifile
        );

        results.success.push({
          index: i,
          user_id: member.user_id,
          username: user.username,
          email: user.email,
          role_in_group: role_in_group,
          member_id: newMember._id,
        });
      } catch (error) {
        results.errors.push({ index: i, error: error.message });
      }
    }

    return results;
  }

  async adminRemoveMember({ admin_id, user_id, group_id }) {
    const mongoose = require("mongoose");

    if (!mongoose.Types.ObjectId.isValid(admin_id)) {
      throw new Error("admin_id không hợp lệ");
    }
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      throw new Error("user_id không hợp lệ");
    }
    if (!mongoose.Types.ObjectId.isValid(group_id)) {
      throw new Error("group_id không hợp lệ");
    }

    const group = await groupRepo.findById(group_id);
    if (!group) throw new Error("Group không tồn tại");

    const member = await groupMemberRepo.findMember(user_id, group_id);
    if (!member) throw new Error("Thành viên không tồn tại trong group này");

    const result = await groupMemberRepo.removeMember(user_id, group_id);
    if (result.deletedCount === 0) throw new Error("Không thể xóa thành viên");

    return true;
  }
}

module.exports = new GroupMemberService();

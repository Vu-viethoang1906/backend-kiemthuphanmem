const centerMemberRepo = require('../repositories/centerMember.repo');
const userRepo = require('../repositories/user.repository');
const centerRepo = require('../repositories/center.repository');
const { sendNotification } = require('../config/socket');
const notificationService = require('./notification.service');
const UserRole = require('../models/userRole.model');
class CenterMemberService {
  async addMember(center_id, user_id, role_in_center) {
    const user = await userRepo.findById(user_id);

    if (!user) throw new Error('Người dùng không tồn tại');

    const center = await centerRepo.findById(center_id);
    if (!center) throw new Error('Trung tâm không tồn tại');

    const SoftDelete = await centerMemberRepo.softDelete(user_id);

    const exists = await centerMemberRepo.isMember(center_id, user_id);
    if (exists) throw new Error('Thành viên đã tồn tại trong trung tâm');

    const centerMember = await centerMemberRepo.create({
      center_id,
      user_id,
      role_in_center,
    });

    sendNotification(
      'private_Notification',
      {
        message: `Bạn ${user.username} đã được thêm vào trung tâm ${center.name}`,
        member: centerMember,
      },
      user_id
    );
    sendNotification('system_notification', {
      message: `Thông báo hệ thống ${user.username} đã được thêm vào trung tâm ${center.name}`,
      member: centerMember,
    });
    // lưu thông báo cho người dùng vào database
    const data = {
      user_id: user_id,
      title: `Thông báo đến ${user.username}`,
      body: `Bạn vừa được thêm vào trung tâm ${center.name}`,
    };
    await notificationService.createNotification(data);
    return centerMember;
  }

  async getCentersByUser(user_id) {
    const members = await centerMemberRepo.findByUserId(user_id);
    return members.map(m => ({
      ...m.center_id,
      role_in_center: m.role_in_center,
      member_id: m._id,
    }));
  }

  async getMembersByCenter(center_id) {
    const members = await centerMemberRepo.findByCenterId(center_id);
    return members.map(m => ({
      ...m.user_id,
      role_in_center: m.role_in_center,
      member_id: m._id,
    }));
  }

  async removeMember(member_id, requester_id) {
    const member = await centerMemberRepo.findById(member_id);
    if (!member) throw new Error('Không tìm thấy thành viên');

    const center_id = member.center_id;
    const center = await centerRepo.findById(center_id);
    if (!center) throw new Error('Trung tâm không tồn tại');

    // Chỉ quản lý center (Center_Admin, Manager) hoặc admin hệ thống mới được xóa thành viên
    const systemUserRole = await UserRole.findOne({ user_id: requester_id })
      .populate('role_id')
      .lean();
    const isSystemAdmin =
      systemUserRole?.role_id?.name &&
      ['System_Manager', 'admin'].includes(systemUserRole.role_id.name);

    if (!isSystemAdmin) {
      const requesterMember = await centerMemberRepo.findMemberByCenterAndUser(
        center_id,
        requester_id
      );
      if (!requesterMember) throw new Error('Bạn không phải thành viên của trung tâm này');
      const role = (requesterMember.role_in_center || '').trim();
      if (role !== 'Center_Admin' && role !== 'Manager') {
        throw new Error(
          'Chỉ quản lý trung tâm (Center_Admin, Manager) mới có thể xóa thành viên khỏi center'
        );
      }
    }

    await centerMemberRepo.delete(member_id);

    const removedUserId = member.user_id?.toString?.() || member.user_id;
    sendNotification(
      'new-member-added',
      {
        message: `Bạn đã bị xóa khỏi trung tâm ${center.name}`,
      },
      removedUserId
    );

    const notifData = {
      user_id: removedUserId,
      title: `Thông báo từ trung tâm ${center.name}`,
      body: 'Bạn đã được xóa khỏi trung tâm',
    };
    await notificationService.createNotification(notifData);

    return true;
  }
  async getAll() {
    return centerMemberRepo.findAll();
  }
}

module.exports = new CenterMemberService();

// services/notificationService.js
const notificationRepo = require('../repositories/notification.repository');
const smartNotificationService = require('./smartNotification.service');

const notificationService = {
  async createNotification(data) {
    if (!data.user_id || !data.title) {
      throw new Error('Thiếu thông tin bắt buộc: user_id hoặc title');
    }
    // Use smart notification scheduling
    return await smartNotificationService.scheduleNotification({
      ...data,
      priority: data.priority || 'normal',
    });
  },

  async getNotificationsByUser(userId) {
    if (!userId) throw new Error('Thiếu userId');
    return await notificationRepo.findByUserId(userId);
  },

  async markAsRead(notificationId) {
    const notification = await notificationRepo.findById(notificationId);
    if (!notification) throw new Error('Không tìm thấy thông báo');
    return await notificationRepo.markAsRead(notificationId);
  },

  async deleteNotification(notificationId) {
    const notification = await notificationRepo.findById(notificationId);
    if (!notification) throw new Error('Không tìm thấy thông báo để xóa');
    return await notificationRepo.delete(notificationId);
  },
  async deleteNotificationbyUser(idUser) {
    return await notificationRepo.findAndDelete(idUser);
  },
};

module.exports = notificationService;

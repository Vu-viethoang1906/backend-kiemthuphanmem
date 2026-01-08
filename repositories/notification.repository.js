// repositories/notificationRepo.js
const Notification = require('../models/notification.model');

const notificationRepo = {
  async create(data) {
    return await Notification.create(data);
  },

  async findByUserId(userId) {
    return await Notification.find({ user_id: userId }).sort({
      created_at: -1,
    });
  },

  async findById(id) {
    return await Notification.findById(id);
  },

  async markAsRead(id) {
    return await Notification.findByIdAndUpdate(id, { read_at: new Date() }, { new: true });
  },

  async delete(id) {
    return await Notification.findByIdAndDelete(id);
  },
  async findAndDelete(id) {
    return await Notification.deleteMany({
      user_id: id,
      read_at: { $ne: null },
    });
  },

  async findScheduledNotifications(now) {
    return await Notification.find({
      scheduled_at: { $lte: now },
      sent_at: null,
    }).sort({ scheduled_at: 1 });
  },

  async markAsSent(id) {
    return await Notification.findByIdAndUpdate(id, { sent_at: new Date() }, { new: true });
  },

  async update(id, data) {
    return await Notification.findByIdAndUpdate(id, data, { new: true });
  },
};

module.exports = notificationRepo;

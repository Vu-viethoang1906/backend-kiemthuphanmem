// controllers/notificationController.js
const notificationService = require("../services/notification.service");

const notificationController = {
  async create(req, res) {
    try {
      const result = await notificationService.createNotification(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getByUser(req, res) {
    try {
      const { userId } = req.params;
      const notifications = await notificationService.getNotificationsByUser(
        userId
      );
      res.json({ success: true, data: notifications });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const result = await notificationService.markAsRead(id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      await notificationService.deleteNotification(id);
      res.json({ success: true, message: "Đã xóa thông báo" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
  async deleteByUser(req, res) {
    try {
      const { idUser } = req.params;
      await notificationService.deleteNotificationbyUser(idUser);
      res.json({ success: true, message: "Đã xóa thông báo" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};

module.exports = notificationController;

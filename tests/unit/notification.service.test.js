// 📄 tests/unit/notification.service.test.js - Notification Service Unit Tests
jest.mock('../../repositories/notification.repository');
jest.mock('../../services/smartNotification.service');
jest.mock('../../repositories/notificationPreference.repository');

const notificationService = require('../../services/notification.service');
const notificationRepo = require('../../repositories/notification.repository');
const smartNotificationService = require('../../services/smartNotification.service');

describe('🔹 Notification Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: smartNotificationService returns notification immediately
    smartNotificationService.scheduleNotification.mockImplementation(async data => {
      const created = await notificationRepo.create({
        ...data,
        sent_at: new Date(),
        scheduled_at: new Date(),
      });
      return created;
    });
  });

  describe('createNotification', () => {
    it('✅ should create notification when mandatory fields are provided', async () => {
      const payload = { user_id: '507f1f77bcf86cd799439011', title: 'Hello' };
      const created = { _id: 'n1', ...payload };
      notificationRepo.create.mockResolvedValue(created);

      const res = await notificationService.createNotification(payload);
      expect(smartNotificationService.scheduleNotification).toHaveBeenCalledWith({
        ...payload,
        priority: 'normal',
      });
      expect(res).toBe(created);
    });

    it('❌ should throw when user_id missing', async () => {
      await expect(notificationService.createNotification({ title: 'No user' })).rejects.toThrow(
        'Thiếu thông tin bắt buộc: user_id hoặc title'
      );
    });

    it('❌ should throw when title missing', async () => {
      await expect(
        notificationService.createNotification({ user_id: '507f1f77bcf86cd799439011' })
      ).rejects.toThrow('Thiếu thông tin bắt buộc: user_id hoặc title');
    });
  });

  describe('getNotificationsByUser', () => {
    it('✅ should return notifications for a user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const list = [{ _id: 'n1', user_id: userId }];
      notificationRepo.findByUserId.mockResolvedValue(list);

      const res = await notificationService.getNotificationsByUser(userId);
      expect(notificationRepo.findByUserId).toHaveBeenCalledWith(userId);
      expect(res).toBe(list);
    });

    it('❌ should throw when userId missing', async () => {
      await expect(notificationService.getNotificationsByUser(null)).rejects.toThrow(
        'Thiếu userId'
      );
    });
  });

  describe('markAsRead', () => {
    it('✅ should mark notification as read when exists', async () => {
      const id = 'n1';
      const found = { _id: id };
      const updated = { _id: id, read_at: new Date() };

      notificationRepo.findById.mockResolvedValue(found);
      notificationRepo.markAsRead.mockResolvedValue(updated);

      const res = await notificationService.markAsRead(id);
      expect(notificationRepo.findById).toHaveBeenCalledWith(id);
      expect(notificationRepo.markAsRead).toHaveBeenCalledWith(id);
      expect(res).toBe(updated);
    });

    it('❌ should throw when notification not found', async () => {
      notificationRepo.findById.mockResolvedValue(null);
      await expect(notificationService.markAsRead('missing')).rejects.toThrow(
        'Không tìm thấy thông báo'
      );
    });
  });

  describe('deleteNotification', () => {
    it('✅ should delete notification when exists', async () => {
      const id = 'n1';
      const found = { _id: id };
      notificationRepo.findById.mockResolvedValue(found);
      notificationRepo.delete.mockResolvedValue(found);

      const res = await notificationService.deleteNotification(id);
      expect(notificationRepo.findById).toHaveBeenCalledWith(id);
      expect(notificationRepo.delete).toHaveBeenCalledWith(id);
      expect(res).toBe(found);
    });

    it('❌ should throw when not found', async () => {
      notificationRepo.findById.mockResolvedValue(null);
      await expect(notificationService.deleteNotification('missing')).rejects.toThrow(
        'Không tìm thấy thông báo để xóa'
      );
    });
  });

  describe('deleteNotificationbyUser', () => {
    it('✅ should call findAndDelete and return result', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const resValue = { deletedCount: 2 };
      notificationRepo.findAndDelete.mockResolvedValue(resValue);

      const res = await notificationService.deleteNotificationbyUser(userId);
      expect(notificationRepo.findAndDelete).toHaveBeenCalledWith(userId);
      expect(res).toBe(resValue);
    });
  });
});

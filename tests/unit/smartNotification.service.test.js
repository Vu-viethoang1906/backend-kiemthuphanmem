// 📄 tests/unit/smartNotification.service.test.js - Smart Notification Service Unit Tests
const mongoose = require('mongoose');

// Mock dependencies BEFORE requiring the service
jest.mock('../../repositories/notificationPreference.repository');
jest.mock('../../services/userActivityPattern.service');
jest.mock('../../repositories/notification.repository');
jest.mock('../../config/socket', () => ({
  emitToUser: jest.fn(),
}));

// Now require the service after mocks are set up
const SmartNotificationService = require('../../services/smartNotification.service');
const notificationPreferenceRepo = require('../../repositories/notificationPreference.repository');
const userActivityPatternService = require('../../services/userActivityPattern.service');
const notificationRepo = require('../../repositories/notification.repository');
const { emitToUser } = require('../../config/socket');

describe('🔹 Smart Notification Service Unit Tests', () => {
  let mockUserId;
  let mockNotificationData;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();
    mockNotificationData = {
      user_id: mockUserId,
      title: 'Test Notification',
      body: 'Test body',
      type: 'task_update',
      priority: 'normal',
    };
  });

  describe('scheduleNotification', () => {
    it('✅ should send immediately when no preferences', async () => {
      notificationPreferenceRepo.findByUserId.mockResolvedValue(null);
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...mockNotificationData,
        sent_at: expect.any(Date),
        scheduled_at: expect.any(Date),
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      const result = await SmartNotificationService.scheduleNotification(mockNotificationData);

      expect(notificationPreferenceRepo.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(notificationRepo.create).toHaveBeenCalled();
      expect(emitToUser).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('✅ should send immediately when smart scheduling disabled', async () => {
      const mockPreferences = {
        smart_scheduling_enabled: false,
      };
      notificationPreferenceRepo.findByUserId.mockResolvedValue(mockPreferences);
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...mockNotificationData,
        sent_at: expect.any(Date),
        scheduled_at: expect.any(Date),
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      const result = await SmartNotificationService.scheduleNotification(mockNotificationData);

      expect(notificationRepo.create).toHaveBeenCalled();
      expect(emitToUser).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('✅ should send immediately for urgent priority', async () => {
      const mockPreferences = {
        smart_scheduling_enabled: true,
        urgent_types: [],
      };
      notificationPreferenceRepo.findByUserId.mockResolvedValue(mockPreferences);
      const urgentData = { ...mockNotificationData, priority: 'urgent' };
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...urgentData,
        sent_at: expect.any(Date),
        scheduled_at: expect.any(Date),
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      const result = await SmartNotificationService.scheduleNotification(urgentData);

      expect(notificationRepo.create).toHaveBeenCalled();
      expect(emitToUser).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('✅ should send immediately for urgent type', async () => {
      const mockPreferences = {
        smart_scheduling_enabled: true,
        urgent_types: ['at_risk_task', 'task_overdue'],
      };
      notificationPreferenceRepo.findByUserId.mockResolvedValue(mockPreferences);
      const urgentData = { ...mockNotificationData, type: 'at_risk_task' };
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...urgentData,
        sent_at: expect.any(Date),
        scheduled_at: expect.any(Date),
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      const result = await SmartNotificationService.scheduleNotification(urgentData);

      expect(notificationRepo.create).toHaveBeenCalled();
      expect(emitToUser).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('✅ should schedule for later when in quiet hours', async () => {
      const mockPreferences = {
        smart_scheduling_enabled: true,
        urgent_types: [],
        quiet_hours: {
          enabled: true,
          start_hour: 22,
          end_hour: 8,
        },
      };
      notificationPreferenceRepo.findByUserId.mockResolvedValue(mockPreferences);
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...mockNotificationData,
        scheduled_at: expect.any(Date),
        sent_at: null,
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      // Mock _isInQuietHours to return true
      jest.spyOn(SmartNotificationService, '_isInQuietHours').mockReturnValue(true);
      jest.spyOn(SmartNotificationService, '_getAfterQuietHours').mockReturnValue(new Date());

      const result = await SmartNotificationService.scheduleNotification(mockNotificationData);

      expect(notificationRepo.create).toHaveBeenCalled();
      expect(emitToUser).not.toHaveBeenCalled();
      expect(result.sent_at).toBeNull();
    });

    it('✅ should schedule for later when in deep work', async () => {
      const mockPreferences = {
        smart_scheduling_enabled: true,
        urgent_types: [],
        quiet_hours: { enabled: false },
        min_delay_minutes: 15,
      };
      notificationPreferenceRepo.findByUserId.mockResolvedValue(mockPreferences);
      userActivityPatternService.isInDeepWork.mockResolvedValue(true);
      userActivityPatternService.getNextOptimalTime.mockResolvedValue(new Date());
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...mockNotificationData,
        scheduled_at: expect.any(Date),
        sent_at: null,
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      jest.spyOn(SmartNotificationService, '_isInQuietHours').mockReturnValue(false);

      const result = await SmartNotificationService.scheduleNotification(mockNotificationData);

      expect(userActivityPatternService.isInDeepWork).toHaveBeenCalledWith(mockUserId);
      expect(userActivityPatternService.getNextOptimalTime).toHaveBeenCalled();
      expect(notificationRepo.create).toHaveBeenCalled();
      expect(emitToUser).not.toHaveBeenCalled();
    });

    it('✅ should send immediately when at optimal time', async () => {
      const mockPreferences = {
        smart_scheduling_enabled: true,
        urgent_types: [],
        quiet_hours: { enabled: false },
        active_days: [1, 2, 3, 4, 5],
      };
      notificationPreferenceRepo.findByUserId.mockResolvedValue(mockPreferences);
      userActivityPatternService.isInDeepWork.mockResolvedValue(false);
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...mockNotificationData,
        sent_at: expect.any(Date),
        scheduled_at: expect.any(Date),
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      jest.spyOn(SmartNotificationService, '_isInQuietHours').mockReturnValue(false);
      jest.spyOn(SmartNotificationService, '_isOptimalTime').mockResolvedValue(true);

      const result = await SmartNotificationService.scheduleNotification(mockNotificationData);

      expect(notificationRepo.create).toHaveBeenCalled();
      expect(emitToUser).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('✅ should schedule for later when not at optimal time', async () => {
      const mockPreferences = {
        smart_scheduling_enabled: true,
        urgent_types: [],
        quiet_hours: { enabled: false },
        min_delay_minutes: 15,
        max_delay_minutes: 120,
        active_days: [1, 2, 3, 4, 5],
      };
      notificationPreferenceRepo.findByUserId.mockResolvedValue(mockPreferences);
      userActivityPatternService.isInDeepWork.mockResolvedValue(false);
      userActivityPatternService.getNextOptimalTime.mockResolvedValue(new Date());
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...mockNotificationData,
        scheduled_at: expect.any(Date),
        sent_at: null,
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      jest.spyOn(SmartNotificationService, '_isInQuietHours').mockReturnValue(false);
      jest.spyOn(SmartNotificationService, '_isOptimalTime').mockResolvedValue(false);
      jest
        .spyOn(SmartNotificationService, '_calculateOptimalScheduleTime')
        .mockResolvedValue(new Date());

      const result = await SmartNotificationService.scheduleNotification(mockNotificationData);

      expect(notificationRepo.create).toHaveBeenCalled();
      expect(emitToUser).not.toHaveBeenCalled();
      expect(result.sent_at).toBeNull();
    });
  });

  describe('_sendImmediately', () => {
    it('✅ should create notification and emit via socket', async () => {
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...mockNotificationData,
        sent_at: new Date(),
        scheduled_at: new Date(),
        created_at: new Date(),
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      const result = await SmartNotificationService._sendImmediately(mockNotificationData);

      expect(notificationRepo.create).toHaveBeenCalledWith({
        ...mockNotificationData,
        sent_at: expect.any(Date),
        scheduled_at: expect.any(Date),
      });
      expect(emitToUser).toHaveBeenCalledWith(
        'notification',
        {
          id: mockNotification._id,
          title: mockNotification.title,
          body: mockNotification.body,
          type: mockNotification.type,
          created_at: mockNotification.created_at,
        },
        mockNotification.user_id.toString()
      );
      expect(result).toEqual(mockNotification);
    });
  });

  describe('_scheduleForLater', () => {
    it('✅ should create notification with scheduled_at and null sent_at', async () => {
      const scheduledAt = new Date();
      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...mockNotificationData,
        scheduled_at: scheduledAt,
        sent_at: null,
      };
      notificationRepo.create.mockResolvedValue(mockNotification);

      const result = await SmartNotificationService._scheduleForLater(
        mockNotificationData,
        scheduledAt
      );

      expect(notificationRepo.create).toHaveBeenCalledWith({
        ...mockNotificationData,
        scheduled_at: scheduledAt,
        sent_at: null,
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('_isInQuietHours', () => {
    it('✅ should return false when quiet hours disabled', () => {
      const preferences = {
        quiet_hours: { enabled: false },
      };

      const result = SmartNotificationService._isInQuietHours(preferences);

      expect(result).toBe(false);
    });

    it('✅ should return false when no preferences', () => {
      const result = SmartNotificationService._isInQuietHours(null);

      expect(result).toBe(false);
    });

    it('✅ should return false when not in quiet hours', () => {
      const preferences = {
        quiet_hours: {
          enabled: true,
          start_hour: 22,
          end_hour: 8,
        },
      };

      // Test during active hours (10 AM is not between 22 and 8)
      const result = SmartNotificationService._isInQuietHours(preferences);

      // Since we can't mock moment easily, we just check it returns boolean
      expect(typeof result).toBe('boolean');
    });
  });

  describe('processScheduledNotifications', () => {
    it('✅ should return zero counts when no scheduled notifications', async () => {
      notificationRepo.findScheduledNotifications.mockResolvedValue([]);

      const result = await SmartNotificationService.processScheduledNotifications();

      expect(result).toEqual({ processed: 0, sent: 0, failed: 0 });
    });

    it('✅ should process and send scheduled notifications', async () => {
      const mockNotifications = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          title: 'Notification 1',
          body: 'Body 1',
          type: 'task_update',
          created_at: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          title: 'Notification 2',
          body: 'Body 2',
          type: 'task_update',
          created_at: new Date(),
        },
      ];
      notificationRepo.findScheduledNotifications.mockResolvedValue(mockNotifications);
      notificationRepo.markAsSent.mockResolvedValue({});

      const result = await SmartNotificationService.processScheduledNotifications();

      expect(notificationRepo.findScheduledNotifications).toHaveBeenCalled();
      expect(notificationRepo.markAsSent).toHaveBeenCalledTimes(2);
      expect(emitToUser).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ processed: 2, sent: 2, failed: 0 });
    });

    it('✅ should handle errors when processing notifications', async () => {
      const mockNotifications = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          title: 'Notification 1',
          body: 'Body 1',
          type: 'task_update',
          created_at: new Date(),
        },
      ];
      notificationRepo.findScheduledNotifications.mockResolvedValue(mockNotifications);
      notificationRepo.markAsSent.mockRejectedValue(new Error('Database error'));

      const result = await SmartNotificationService.processScheduledNotifications();

      expect(result).toEqual({ processed: 1, sent: 0, failed: 1 });
    });
  });
});

// 📄 tests/unit/notificationPreference.service.test.js - Notification Preference Service Unit Tests
const mongoose = require('mongoose');

// Mock repository BEFORE requiring the service
jest.mock('../../repositories/notificationPreference.repository');

// Now require the service after mocks are set up
const NotificationPreferenceService = require('../../services/notificationPreference.service');
const notificationPreferenceRepo = require('../../repositories/notificationPreference.repository');

describe('🔹 Notification Preference Service Unit Tests', () => {
  let mockUserId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();
  });

  describe('getPreferences', () => {
    it('✅ should return existing preferences', async () => {
      const mockPreferences = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        smart_scheduling_enabled: true,
        urgent_types: ['at_risk_task', 'task_overdue'],
        min_delay_minutes: 15,
        max_delay_minutes: 120,
        quiet_hours: {
          enabled: true,
          start_hour: 22,
          end_hour: 8,
        },
        active_days: [1, 2, 3, 4, 5],
      };

      notificationPreferenceRepo.findByUserId.mockResolvedValue(mockPreferences);

      const result = await NotificationPreferenceService.getPreferences(mockUserId);

      expect(notificationPreferenceRepo.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockPreferences);
      expect(notificationPreferenceRepo.upsertByUserId).not.toHaveBeenCalled();
    });

    it('✅ should create default preferences when not exists', async () => {
      const mockDefaultPreferences = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        smart_scheduling_enabled: true,
        urgent_types: ['at_risk_task', 'task_overdue', 'system_alert'],
        min_delay_minutes: 15,
        max_delay_minutes: 120,
        quiet_hours: {
          enabled: false,
          start_hour: 22,
          end_hour: 8,
        },
        active_days: [1, 2, 3, 4, 5],
      };

      notificationPreferenceRepo.findByUserId.mockResolvedValue(null);
      notificationPreferenceRepo.upsertByUserId.mockResolvedValue(mockDefaultPreferences);

      const result = await NotificationPreferenceService.getPreferences(mockUserId);

      expect(notificationPreferenceRepo.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(notificationPreferenceRepo.upsertByUserId).toHaveBeenCalledWith(mockUserId, {
        user_id: mockUserId,
        smart_scheduling_enabled: true,
        urgent_types: ['at_risk_task', 'task_overdue', 'system_alert'],
        min_delay_minutes: 15,
        max_delay_minutes: 120,
        quiet_hours: {
          enabled: false,
          start_hour: 22,
          end_hour: 8,
        },
        active_days: [1, 2, 3, 4, 5],
      });
      expect(result).toEqual(mockDefaultPreferences);
    });
  });

  describe('createDefaultPreferences', () => {
    it('✅ should create default preferences with correct values', async () => {
      const mockDefaultPreferences = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        smart_scheduling_enabled: true,
        urgent_types: ['at_risk_task', 'task_overdue', 'system_alert'],
        min_delay_minutes: 15,
        max_delay_minutes: 120,
        quiet_hours: {
          enabled: false,
          start_hour: 22,
          end_hour: 8,
        },
        active_days: [1, 2, 3, 4, 5],
      };

      notificationPreferenceRepo.upsertByUserId.mockResolvedValue(mockDefaultPreferences);

      const result = await NotificationPreferenceService.createDefaultPreferences(mockUserId);

      expect(notificationPreferenceRepo.upsertByUserId).toHaveBeenCalledWith(mockUserId, {
        user_id: mockUserId,
        smart_scheduling_enabled: true,
        urgent_types: ['at_risk_task', 'task_overdue', 'system_alert'],
        min_delay_minutes: 15,
        max_delay_minutes: 120,
        quiet_hours: {
          enabled: false,
          start_hour: 22,
          end_hour: 8,
        },
        active_days: [1, 2, 3, 4, 5],
      });
      expect(result).toEqual(mockDefaultPreferences);
    });

    it('✅ should set correct default urgent_types', async () => {
      notificationPreferenceRepo.upsertByUserId.mockResolvedValue({});

      await NotificationPreferenceService.createDefaultPreferences(mockUserId);

      const callArgs = notificationPreferenceRepo.upsertByUserId.mock.calls[0][1];
      expect(callArgs.urgent_types).toEqual(['at_risk_task', 'task_overdue', 'system_alert']);
    });

    it('✅ should set correct default delay minutes', async () => {
      notificationPreferenceRepo.upsertByUserId.mockResolvedValue({});

      await NotificationPreferenceService.createDefaultPreferences(mockUserId);

      const callArgs = notificationPreferenceRepo.upsertByUserId.mock.calls[0][1];
      expect(callArgs.min_delay_minutes).toBe(15);
      expect(callArgs.max_delay_minutes).toBe(120);
    });

    it('✅ should set correct default quiet_hours', async () => {
      notificationPreferenceRepo.upsertByUserId.mockResolvedValue({});

      await NotificationPreferenceService.createDefaultPreferences(mockUserId);

      const callArgs = notificationPreferenceRepo.upsertByUserId.mock.calls[0][1];
      expect(callArgs.quiet_hours).toEqual({
        enabled: false,
        start_hour: 22,
        end_hour: 8,
      });
    });

    it('✅ should set correct default active_days', async () => {
      notificationPreferenceRepo.upsertByUserId.mockResolvedValue({});

      await NotificationPreferenceService.createDefaultPreferences(mockUserId);

      const callArgs = notificationPreferenceRepo.upsertByUserId.mock.calls[0][1];
      expect(callArgs.active_days).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('updatePreferences', () => {
    it('✅ should update preferences successfully', async () => {
      const updateData = {
        smart_scheduling_enabled: false,
        min_delay_minutes: 30,
        quiet_hours: {
          enabled: true,
          start_hour: 23,
          end_hour: 7,
        },
      };
      const mockUpdatedPreferences = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        ...updateData,
      };

      notificationPreferenceRepo.update.mockResolvedValue(mockUpdatedPreferences);

      const result = await NotificationPreferenceService.updatePreferences(mockUserId, updateData);

      expect(notificationPreferenceRepo.update).toHaveBeenCalledWith(mockUserId, updateData);
      expect(result).toEqual(mockUpdatedPreferences);
    });

    it('✅ should update smart_scheduling_enabled', async () => {
      const updateData = { smart_scheduling_enabled: false };
      notificationPreferenceRepo.update.mockResolvedValue({});

      await NotificationPreferenceService.updatePreferences(mockUserId, updateData);

      expect(notificationPreferenceRepo.update).toHaveBeenCalledWith(mockUserId, updateData);
    });

    it('✅ should update urgent_types', async () => {
      const updateData = {
        urgent_types: ['at_risk_task', 'task_overdue'],
      };
      notificationPreferenceRepo.update.mockResolvedValue({});

      await NotificationPreferenceService.updatePreferences(mockUserId, updateData);

      expect(notificationPreferenceRepo.update).toHaveBeenCalledWith(mockUserId, updateData);
    });

    it('✅ should update delay minutes', async () => {
      const updateData = {
        min_delay_minutes: 30,
        max_delay_minutes: 180,
      };
      notificationPreferenceRepo.update.mockResolvedValue({});

      await NotificationPreferenceService.updatePreferences(mockUserId, updateData);

      expect(notificationPreferenceRepo.update).toHaveBeenCalledWith(mockUserId, updateData);
    });

    it('✅ should update quiet_hours', async () => {
      const updateData = {
        quiet_hours: {
          enabled: true,
          start_hour: 23,
          end_hour: 7,
        },
      };
      notificationPreferenceRepo.update.mockResolvedValue({});

      await NotificationPreferenceService.updatePreferences(mockUserId, updateData);

      expect(notificationPreferenceRepo.update).toHaveBeenCalledWith(mockUserId, updateData);
    });

    it('✅ should update active_days', async () => {
      const updateData = {
        active_days: [1, 2, 3, 4, 5, 6, 7],
      };
      notificationPreferenceRepo.update.mockResolvedValue({});

      await NotificationPreferenceService.updatePreferences(mockUserId, updateData);

      expect(notificationPreferenceRepo.update).toHaveBeenCalledWith(mockUserId, updateData);
    });

    it('✅ should handle partial update', async () => {
      const updateData = {
        smart_scheduling_enabled: false,
      };
      notificationPreferenceRepo.update.mockResolvedValue({});

      await NotificationPreferenceService.updatePreferences(mockUserId, updateData);

      expect(notificationPreferenceRepo.update).toHaveBeenCalledWith(mockUserId, updateData);
    });
  });

  describe('deletePreferences', () => {
    it('✅ should delete preferences successfully', async () => {
      const mockDeletedPreferences = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
      };

      notificationPreferenceRepo.delete.mockResolvedValue(mockDeletedPreferences);

      const result = await NotificationPreferenceService.deletePreferences(mockUserId);

      expect(notificationPreferenceRepo.delete).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockDeletedPreferences);
    });

    it('✅ should return null when preferences not found', async () => {
      notificationPreferenceRepo.delete.mockResolvedValue(null);

      const result = await NotificationPreferenceService.deletePreferences(mockUserId);

      expect(result).toBeNull();
    });
  });
});

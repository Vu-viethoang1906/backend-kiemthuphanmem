const notificationPreferenceRepo = require('../repositories/notificationPreference.repository');

class NotificationPreferenceService {
  /**
   * Get user preferences (create default if not exists)
   */
  async getPreferences(userId) {
    let preferences = await notificationPreferenceRepo.findByUserId(userId);

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  /**
   * Create default preferences
   */
  async createDefaultPreferences(userId) {
    return await notificationPreferenceRepo.upsertByUserId(userId, {
      user_id: userId,
      smart_scheduling_enabled: true,
      urgent_types: ['at_risk_task', 'task_overdue', 'system_alert'],
      min_delay_minutes: 15,
      max_delay_minutes: 120,
      quiet_hours: {
        enabled: false,
        start_hour: 22,
        end_hour: 8,
      },
      active_days: [1, 2, 3, 4, 5], // Monday to Friday
    });
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId, data) {
    return await notificationPreferenceRepo.update(userId, data);
  }

  /**
   * Delete user preferences
   */
  async deletePreferences(userId) {
    return await notificationPreferenceRepo.delete(userId);
  }
}

module.exports = new NotificationPreferenceService();

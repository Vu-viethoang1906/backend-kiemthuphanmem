const notificationPreferenceRepo = require('../repositories/notificationPreference.repository');
const userActivityPatternService = require('./userActivityPattern.service');
const notificationRepo = require('../repositories/notification.repository');
const ActivityLog = require('../models/activityLog.model');
const { emitToUser, isUserOnline } = require('../config/socket');
const moment = require('moment-timezone');

class SmartNotificationService {
  /**
   * Schedule a notification at optimal time
   * @param {Object} notificationData - { user_id, title, body, type, priority, board_id, task_id }
   * @returns {Promise<Object>} Created notification
   */
  async scheduleNotification(notificationData) {
    const { user_id, type, priority } = notificationData;

    // Get user preferences
    const preferences = await notificationPreferenceRepo.findByUserId(user_id);

    // Check if smart scheduling is enabled
    if (!preferences || !preferences.smart_scheduling_enabled) {
      // Send immediately
      return await this._sendImmediately(notificationData);
    }

    // Check if notification is urgent
    const isUrgent =
      priority === 'urgent' ||
      (preferences.urgent_types && preferences.urgent_types.includes(type));

    if (isUrgent) {
      // Send urgent notifications immediately
      return await this._sendImmediately(notificationData);
    }

    // Check quiet hours
    if (this._isInQuietHours(preferences)) {
      // Schedule for after quiet hours
      const scheduledAt = this._getAfterQuietHours(preferences);
      return await this._scheduleForLater(notificationData, scheduledAt);
    }

    // Check real-time user availability (online và không đang focused work)
    const isAvailable = await this._isUserAvailableForNotification(user_id);
    if (!isAvailable) {
      // User không available (offline hoặc đang focused work)
      const minDelay = preferences.min_delay_minutes || 15;
      const scheduledAt = await userActivityPatternService.getNextOptimalTime(user_id, minDelay);
      return await this._scheduleForLater(notificationData, scheduledAt);
    }

    // Check if user is in deep work (historical pattern)
    const isInDeepWork = await userActivityPatternService.isInDeepWork(user_id);
    if (isInDeepWork) {
      // Schedule for later
      const minDelay = preferences.min_delay_minutes || 15;
      const scheduledAt = await userActivityPatternService.getNextOptimalTime(user_id, minDelay);
      return await this._scheduleForLater(notificationData, scheduledAt);
    }

    // Check if current time is optimal
    const isOptimalTime = await this._isOptimalTime(user_id, preferences);
    if (isOptimalTime) {
      // Send immediately
      return await this._sendImmediately(notificationData);
    }

    // Schedule for optimal time
    const minDelay = preferences.min_delay_minutes || 15;
    const maxDelay = preferences.max_delay_minutes || 120;
    const scheduledAt = await this._calculateOptimalScheduleTime(
      user_id,
      minDelay,
      maxDelay,
      preferences
    );

    return await this._scheduleForLater(notificationData, scheduledAt);
  }

  /**
   * Send notification immediately
   */
  async _sendImmediately(notificationData) {
    const notification = await notificationRepo.create({
      ...notificationData,
      sent_at: new Date(),
      scheduled_at: new Date(),
    });

    // Emit via socket
    emitToUser(
      'notification',
      {
        id: notification._id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        created_at: notification.created_at,
      },
      notification.user_id.toString()
    );

    return notification;
  }

  /**
   * Schedule notification for later
   */
  async _scheduleForLater(notificationData, scheduledAt) {
    const notification = await notificationRepo.create({
      ...notificationData,
      scheduled_at: scheduledAt,
      sent_at: null,
    });

    return notification;
  }

  /**
   * Check if current time is optimal for notification
   */
  async _isOptimalTime(userId, preferences) {
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const dayOfWeek = now.day();
    const hour = now.hour();

    // Check if day is active
    if (preferences.active_days && !preferences.active_days.includes(dayOfWeek)) {
      return false;
    }

    // Get user pattern
    const pattern = await userActivityPatternService.getPattern(userId);

    // Check if current hour is in optimal times
    const optimalDay = pattern.optimal_notification_times.find(t => t.day_of_week === dayOfWeek);

    if (!optimalDay || !optimalDay.hours.includes(hour)) {
      return false;
    }

    // Check if not in deep work
    const isDeepWork = pattern.deep_work_periods.some(
      period =>
        period.day_of_week === dayOfWeek && hour >= period.start_hour && hour <= period.end_hour
    );

    return !isDeepWork;
  }

  /**
   * Calculate optimal schedule time
   */
  async _calculateOptimalScheduleTime(userId, minDelay, maxDelay, preferences) {
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const minTime = now.clone().add(minDelay, 'minutes');
    const maxTime = now.clone().add(maxDelay, 'minutes');

    // Try to find optimal time within delay range
    const optimalTime = await userActivityPatternService.getNextOptimalTime(userId, minDelay);

    const optimalMoment = moment(optimalTime).tz('Asia/Ho_Chi_Minh');

    // If optimal time is within max delay, use it
    if (optimalMoment.isBefore(maxTime) || optimalMoment.isSame(maxTime)) {
      return optimalTime;
    }

    // Otherwise, use max delay time but check if it's not in quiet hours
    let candidateTime = maxTime.clone();

    // Adjust if in quiet hours
    if (preferences.quiet_hours && preferences.quiet_hours.enabled) {
      const quietStart = preferences.quiet_hours.start_hour;
      const quietEnd = preferences.quiet_hours.end_hour;
      const candidateHour = candidateTime.hour();

      if (candidateHour >= quietStart || candidateHour < quietEnd) {
        candidateTime.hour(quietEnd).minute(0).second(0);
      }
    }

    return candidateTime.toDate();
  }

  /**
   * Check if current time is in quiet hours
   */
  _isInQuietHours(preferences) {
    if (!preferences || !preferences.quiet_hours || !preferences.quiet_hours.enabled) {
      return false;
    }

    const now = moment().tz('Asia/Ho_Chi_Minh');
    const currentHour = now.hour();
    const quietStart = preferences.quiet_hours.start_hour;
    const quietEnd = preferences.quiet_hours.end_hour;

    // Handle quiet hours that span midnight (e.g., 22:00 - 08:00)
    if (quietStart > quietEnd) {
      return currentHour >= quietStart || currentHour < quietEnd;
    }

    return currentHour >= quietStart && currentHour < quietEnd;
  }

  /**
   * Get time after quiet hours
   */
  _getAfterQuietHours(preferences) {
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const quietEnd = preferences.quiet_hours.end_hour;

    let afterQuiet = now.clone().hour(quietEnd).minute(0).second(0);

    // If quiet end is in the past, move to next day
    if (afterQuiet.isBefore(now)) {
      afterQuiet.add(1, 'day');
    }

    return afterQuiet.toDate();
  }

  /**
   * Check if user is available for notification (online and not in focused work)
   */
  async _isUserAvailableForNotification(userId) {
    // Check if user is online via socket
    const online = isUserOnline(userId?.toString());
    
    if (!online) {
      return false; // User is offline
    }

    // Check recent activity to detect focused work
    // If user has been very active in last 5 minutes, they might be in focused work
    const fiveMinutesAgo = moment().subtract(5, 'minutes').toDate();
    const recentActivityCount = await ActivityLog.countDocuments({
      user_id: userId,
      created_at: { $gte: fiveMinutesAgo },
    });

    // If user has more than 10 activities in last 5 minutes, likely in focused work
    if (recentActivityCount > 10) {
      return false; // User is likely in focused work
    }

    // If online and not in intense activity, consider available
    // The deep work period check (historical pattern) is already done separately
    return true;
  }

  /**
   * Process scheduled notifications and send them
   */
  async processScheduledNotifications() {
    const now = new Date();
    const scheduledNotifications = await notificationRepo.findScheduledNotifications(now);

    if (scheduledNotifications.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const notification of scheduledNotifications) {
      try {
        // Mark as sent
        await notificationRepo.markAsSent(notification._id);

        // Emit via socket
        emitToUser(
          'notification',
          {
            id: notification._id,
            title: notification.title,
            body: notification.body,
            type: notification.type,
            created_at: notification.created_at,
          },
          notification.user_id.toString()
        );

        sentCount++;
      } catch (error) {
        failedCount++;
      }
    }

    return {
      processed: scheduledNotifications.length,
      sent: sentCount,
      failed: failedCount,
    };
  }
}

module.exports = new SmartNotificationService();

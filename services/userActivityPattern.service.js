const userActivityPatternRepo = require('../repositories/userActivityPattern.repository');
const ActivityLog = require('../models/activityLog.model');
const moment = require('moment-timezone');

class UserActivityPatternService {
  /**
   * Analyze user activity patterns from activity logs
   * @param {String} userId
   * @param {Number} days - Number of days to analyze (default: 30)
   */
  async analyzeUserActivity(userId, days = 30) {
    const endDate = moment().tz('Asia/Ho_Chi_Minh').toDate();
    const startDate = moment().tz('Asia/Ho_Chi_Minh').subtract(days, 'days').toDate();

    // Get activity logs for the user
    const activityLogs = await ActivityLog.find({
      user_id: userId,
      created_at: { $gte: startDate, $lte: endDate },
    })
      .sort({ created_at: 1 })
      .lean();

    if (activityLogs.length === 0) {
      // Return default pattern if no activity
      return await this._createDefaultPattern(userId);
    }

    // Analyze patterns
    const patterns = this._analyzePatterns(activityLogs, days);

    // Update or create pattern
    const pattern = await userActivityPatternRepo.upsertByUserId(userId, {
      ...patterns,
      last_analyzed_at: new Date(),
    });

    return pattern;
  }

  /**
   * Analyze activity logs to extract patterns
   */
  _analyzePatterns(activityLogs, days = 30) {
    const hourCounts = {}; // { hour: count }
    const dayCounts = {}; // { dayOfWeek: count }
    const sessions = []; // Array of session durations
    let currentSession = null;

    // Process each activity log
    for (const log of activityLogs) {
      const logMoment = moment(log.created_at).tz('Asia/Ho_Chi_Minh');
      const hour = logMoment.hour();
      const dayOfWeek = logMoment.day();

      // Count hours
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;

      // Count days
      dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;

      // Track sessions (activities within 5 minutes are considered same session)
      if (!currentSession) {
        currentSession = {
          start: logMoment,
          lastActivity: logMoment,
        };
      } else {
        const minutesDiff = logMoment.diff(currentSession.lastActivity, 'minutes');
        if (minutesDiff <= 5) {
          currentSession.lastActivity = logMoment;
        } else {
          // End current session
          const duration = currentSession.lastActivity.diff(currentSession.start, 'minutes');
          sessions.push(duration);
          // Start new session
          currentSession = {
            start: logMoment,
            lastActivity: logMoment,
          };
        }
      }
    }

    // Close last session
    if (currentSession) {
      const duration = currentSession.lastActivity.diff(currentSession.start, 'minutes');
      sessions.push(duration);
    }

    // Calculate active hours (hours with activity >= threshold)
    const totalActivities = activityLogs.length;
    const threshold = totalActivities * 0.05; // 5% of total activities
    const activeHours = Object.keys(hourCounts)
      .filter(hour => hourCounts[hour] >= threshold)
      .map(Number)
      .sort((a, b) => a - b);

    // Find most/least active days
    let mostActiveDay = 0;
    let leastActiveDay = 0;
    let maxCount = 0;
    let minCount = Infinity;

    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostActiveDay = parseInt(day);
      }
      if (count < minCount) {
        minCount = count;
        leastActiveDay = parseInt(day);
      }
    }

    // Calculate average session duration
    const avgSessionDuration =
      sessions.length > 0 ? sessions.reduce((sum, d) => sum + d, 0) / sessions.length : 0;

    // Detect deep work periods (long sessions during specific hours)
    const deepWorkPeriods = this._detectDeepWorkPeriods(activityLogs);

    // Calculate optimal notification times (active hours excluding deep work)
    const optimalNotificationTimes = this._calculateOptimalNotificationTimes(
      activeHours,
      deepWorkPeriods
    );

    // Calculate confidence score based on data quality
    const confidenceScore = this._calculateConfidenceScore(activityLogs.length, days);

    return {
      active_hours: activeHours,
      deep_work_periods: deepWorkPeriods,
      optimal_notification_times: optimalNotificationTimes,
      metrics: {
        average_daily_active_hours: activeHours.length,
        most_active_day: mostActiveDay,
        least_active_day: leastActiveDay,
        average_session_duration: Math.round(avgSessionDuration),
      },
      confidence_score: confidenceScore,
    };
  }

  /**
   * Detect deep work periods (long uninterrupted activity)
   */
  _detectDeepWorkPeriods(activityLogs) {
    const deepWorkPeriods = [];
    const dayHourGroups = {}; // { "day_hour": count }

    // Group activities by day of week and hour
    for (const log of activityLogs) {
      const logMoment = moment(log.created_at).tz('Asia/Ho_Chi_Minh');
      const dayOfWeek = logMoment.day();
      const hour = logMoment.hour();
      const key = `${dayOfWeek}_${hour}`;

      dayHourGroups[key] = (dayHourGroups[key] || 0) + 1;
    }

    // Find periods with high activity (potential deep work)
    const threshold = activityLogs.length * 0.02; // 2% of total activities

    for (const [key, count] of Object.entries(dayHourGroups)) {
      if (count >= threshold) {
        const [dayOfWeek, hour] = key.split('_').map(Number);
        // Check if this hour is part of a continuous period
        const existingPeriod = deepWorkPeriods.find(
          p => p.day_of_week === dayOfWeek && Math.abs(p.start_hour - hour) <= 1
        );

        if (existingPeriod) {
          existingPeriod.end_hour = Math.max(existingPeriod.end_hour, hour);
        } else {
          deepWorkPeriods.push({
            day_of_week: dayOfWeek,
            start_hour: hour,
            end_hour: hour,
          });
        }
      }
    }

    return deepWorkPeriods;
  }

  /**
   * Calculate optimal notification times
   */
  _calculateOptimalNotificationTimes(activeHours, deepWorkPeriods) {
    const optimalTimes = [];
    const dayGroups = {}; // { dayOfWeek: [hours] }

    // Group active hours by day of week
    for (let day = 0; day < 7; day++) {
      dayGroups[day] = activeHours.filter(hour => {
        // Exclude hours that are in deep work periods
        return !deepWorkPeriods.some(
          period =>
            period.day_of_week === day && hour >= period.start_hour && hour <= period.end_hour
        );
      });
    }

    // Convert to format
    for (const [day, hours] of Object.entries(dayGroups)) {
      if (hours.length > 0) {
        optimalTimes.push({
          day_of_week: parseInt(day),
          hours: hours,
        });
      }
    }

    return optimalTimes;
  }

  /**
   * Calculate confidence score (0-1)
   */
  _calculateConfidenceScore(activityCount, days) {
    // More activities = higher confidence
    const minActivities = days * 5; // At least 5 activities per day
    const confidence = Math.min(activityCount / minActivities, 1);
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Create default pattern when no activity data
   */
  async _createDefaultPattern(userId) {
    const defaultPattern = {
      user_id: userId,
      active_hours: [9, 10, 11, 14, 15, 16], // Default business hours
      deep_work_periods: [],
      optimal_notification_times: [
        { day_of_week: 1, hours: [9, 10, 14, 15] }, // Monday
        { day_of_week: 2, hours: [9, 10, 14, 15] }, // Tuesday
        { day_of_week: 3, hours: [9, 10, 14, 15] }, // Wednesday
        { day_of_week: 4, hours: [9, 10, 14, 15] }, // Thursday
        { day_of_week: 5, hours: [9, 10, 14, 15] }, // Friday
      ],
      metrics: {
        average_daily_active_hours: 6,
        most_active_day: 1, // Monday
        least_active_day: 0, // Sunday
        average_session_duration: 30,
      },
      confidence_score: 0.3, // Low confidence for default
    };

    return await userActivityPatternRepo.upsertByUserId(userId, defaultPattern);
  }

  /**
   * Get user activity pattern
   */
  async getPattern(userId) {
    let pattern = await userActivityPatternRepo.findByUserId(userId);

    if (!pattern) {
      // Analyze if no pattern exists
      pattern = await this.analyzeUserActivity(userId);
    } else {
      // Re-analyze if pattern is old (older than 7 days)
      const daysSinceAnalysis = moment().diff(moment(pattern.last_analyzed_at), 'days');
      if (daysSinceAnalysis > 7) {
        pattern = await this.analyzeUserActivity(userId);
      }
    }

    return pattern;
  }

  /**
   * Check if user is in deep work period
   */
  async isInDeepWork(userId) {
    const pattern = await this.getPattern(userId);
    if (!pattern || !pattern.deep_work_periods || pattern.deep_work_periods.length === 0) {
      return false;
    }

    const now = moment().tz('Asia/Ho_Chi_Minh');
    const currentDay = now.day();
    const currentHour = now.hour();

    return pattern.deep_work_periods.some(
      period =>
        period.day_of_week === currentDay &&
        currentHour >= period.start_hour &&
        currentHour <= period.end_hour
    );
  }

  /**
   * Get next optimal notification time
   */
  async getNextOptimalTime(userId, minDelayMinutes = 15) {
    const pattern = await this.getPattern(userId);
    const now = moment().tz('Asia/Ho_Chi_Minh');

    // Add minimum delay
    let candidateTime = now.clone().add(minDelayMinutes, 'minutes');

    // Find next optimal time
    const maxAttempts = 7; // Try up to 7 days
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const dayOfWeek = candidateTime.day();
      const hour = candidateTime.hour();

      // Check if this time is optimal
      const optimalDay = pattern.optimal_notification_times.find(t => t.day_of_week === dayOfWeek);

      if (optimalDay && optimalDay.hours.includes(hour)) {
        // Check if not in deep work
        const isDeepWork = pattern.deep_work_periods.some(
          period =>
            period.day_of_week === dayOfWeek && hour >= period.start_hour && hour <= period.end_hour
        );

        if (!isDeepWork) {
          return candidateTime.toDate();
        }
      }

      // Move to next hour
      candidateTime.add(1, 'hour');
    }

    // If no optimal time found, return time with minimum delay
    return now.clone().add(minDelayMinutes, 'minutes').toDate();
  }
}

module.exports = new UserActivityPatternService();

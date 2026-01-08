const behaviorRepo = require('../repositories/gamificationBehavior.repository');

class GamificationBehaviorService {
  async trackBehavior(userId, centerId, actionType, elementType = null, metadata = {}) {
    return behaviorRepo.create({
      user_id: userId,
      center_id: centerId,
      action_type: actionType,
      element_type: elementType,
      metadata,
    });
  }

  async getBehaviorStats(userId, centerId, days = 30) {
    return behaviorRepo.getBehaviorStats(userId, centerId, days);
  }

  async getBehaviorAnalytics(userId, centerId, period = 30) {
    const stats = await this.getBehaviorStats(userId, centerId, period);
    return {
      total_events: Object.values(stats).reduce((sum, val) => {
        if (Array.isArray(val)) return sum + val.length;
        if (typeof val === 'object' && val !== null) return sum;
        return sum + (typeof val === 'number' ? val : 0);
      }, 0),
      stats,
      period_days: period,
    };
  }
}

module.exports = new GamificationBehaviorService();




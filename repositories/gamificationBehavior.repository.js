const GamificationBehavior = require('../models/gamificationBehavior.model');

class GamificationBehaviorRepository {
  async create(data) {
    return GamificationBehavior.create(data);
  }

  async findByUserAndPeriod(userId, centerId, startDate, endDate) {
    return GamificationBehavior.find({
      user_id: userId,
      center_id: centerId,
      created_at: { $gte: startDate, $lte: endDate },
    }).lean();
  }

  async countByActionType(userId, centerId, actionType, startDate, endDate) {
    return GamificationBehavior.countDocuments({
      user_id: userId,
      center_id: centerId,
      action_type: actionType,
      created_at: { $gte: startDate, $lte: endDate },
    });
  }

  async getBehaviorStats(userId, centerId, days = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const behaviors = await this.findByUserAndPeriod(userId, centerId, startDate, endDate);

    const stats = {
      leaderboard_views: 0,
      leaderboard_positions_focused: [],
      points_interactions: 0,
      points_value_changes: [],
      task_completions: 0,
      task_completion_times: [],
      collaboration_events: 0,
      team_task_count: 0,
      daily_activity: {},
      weekly_goals_achieved: 0,
      monthly_goals_achieved: 0,
      badge_reactions: [],
      notification_clicks: 0,
    };

    behaviors.forEach((behavior) => {
      switch (behavior.action_type) {
        case 'view_leaderboard':
          stats.leaderboard_views++;
          if (behavior.metadata?.position) {
            stats.leaderboard_positions_focused.push(behavior.metadata.position);
          }
          break;
        case 'view_points':
          stats.points_interactions++;
          if (behavior.metadata?.points_value) {
            stats.points_value_changes.push(behavior.metadata.points_value);
          }
          break;
        case 'complete_task':
          stats.task_completions++;
          if (behavior.metadata?.completion_time) {
            stats.task_completion_times.push(behavior.metadata.completion_time);
          }
          break;
        case 'collaborate':
          stats.collaboration_events++;
          if (behavior.metadata?.team_size) {
            stats.team_task_count += behavior.metadata.team_size;
          }
          break;
        case 'achieve_goal':
          if (behavior.metadata?.goal_type === 'weekly') {
            stats.weekly_goals_achieved++;
          } else if (behavior.metadata?.goal_type === 'monthly') {
            stats.monthly_goals_achieved++;
          }
          break;
        case 'earn_badge':
        case 'view_badge':
          if (behavior.metadata?.reaction) {
            stats.badge_reactions.push(behavior.metadata.reaction);
          }
          break;
        case 'click_notification':
          stats.notification_clicks++;
          break;
      }

      const dateKey = new Date(behavior.created_at).toISOString().split('T')[0];
      stats.daily_activity[dateKey] = (stats.daily_activity[dateKey] || 0) + 1;
    });

    stats.daily_activity = Object.entries(stats.daily_activity).map(([date, count]) => ({
      date,
      count,
    }));

    return stats;
  }
}

module.exports = new GamificationBehaviorRepository();




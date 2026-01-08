const badgeRepo = require('../repositories/badge.repository');
const userBadgeRepo = require('../repositories/userBadge.repository');
const userPointRepo = require('../repositories/userPoint.repository');
const gamificationConfigService = require('./gamificationConfig.service');

class BadgeService {
  async getAllBadges(filters = {}) {
    return badgeRepo.findAll(filters);
  }

  async getBadgeById(id) {
    return badgeRepo.findById(id);
  }

  async getUserBadges(userId, centerId) {
    return userBadgeRepo.findByUserAndCenter(userId, centerId);
  }

  async checkAndAwardBadges(userId, centerId, action, metadata = {}) {
    const adaptiveGamificationService = require('./adaptiveGamification.service');
    const badges = await badgeRepo.findAll({ is_active: true });
    const awardedBadges = [];

    const personalized = await adaptiveGamificationService.getPersonalizedGamification(userId, centerId);
    const multipliers = personalized.personalization.reward_multipliers || {};

    for (const badge of badges) {
      const hasBadge = await userBadgeRepo.findByUserBadgeAndCenter(
        userId,
        badge._id,
        centerId
      );

      if (hasBadge) continue;

      if (this.checkBadgeCriteria(badge, action, metadata)) {
        await userBadgeRepo.create({
          user_id: userId,
          badge_id: badge._id,
          center_id: centerId,
          metadata: { awarded_for: action, ...metadata },
        });

        const categoryMultiplier = multipliers[badge.category] || 1.0;
        const finalPoints = Math.round((badge.points_reward || 0) * categoryMultiplier);

        if (finalPoints > 0) {
          await userPointRepo.updatePoint(userId, centerId, finalPoints);
        }

        awardedBadges.push({
          ...badge,
          points_awarded: finalPoints,
          multiplier_applied: categoryMultiplier,
        });
      }
    }

    return awardedBadges;
  }

  checkBadgeCriteria(badge, action, metadata) {
    const criteria = badge.criteria;

    switch (criteria.type) {
      case 'task_count':
        return metadata.completed_tasks >= criteria.value;
      case 'points_threshold':
        return metadata.total_points >= criteria.value;
      case 'streak_days':
        return metadata.streak_days >= criteria.value;
      case 'collaboration_count':
        return metadata.collaboration_count >= criteria.value;
      case 'first_place':
        return metadata.leaderboard_position === 1;
      case 'top_10':
        return metadata.leaderboard_position <= 10;
      default:
        return false;
    }
  }

  async getAvailableBadges(centerId) {
    return badgeRepo.findAll();
  }

  async getRecentBadges(centerId, limit = 10) {
    return userBadgeRepo.getRecentBadges(centerId, limit);
  }

  async createBadge(data) {
    return badgeRepo.create(data);
  }

  async updateBadge(id, data) {
    return badgeRepo.update(id, data);
  }

  async deleteBadge(id) {
    return badgeRepo.delete(id);
  }

  async getBadgesByCategory(category) {
    return badgeRepo.findByCategory(category);
  }
}

module.exports = new BadgeService();



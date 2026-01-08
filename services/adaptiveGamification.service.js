const motivationProfileRepo = require('../repositories/userMotivationProfile.repository');
const behaviorRepo = require('../repositories/gamificationBehavior.repository');
const behaviorService = require('./gamificationBehavior.service');
const adaptiveGamificationAI = require('./adaptiveGamificationAI.service');
const CenterMemberRepo = require('../repositories/centerMember.repo');

class AdaptiveGamificationService {
  async analyzeUserBehavior(userId, centerId) {
    const stats = await behaviorService.getBehaviorStats(userId, centerId, 30);
    const analysis = await adaptiveGamificationAI.analyzeBehaviorPatterns(stats);

    const onboardingStage = this._determineOnboardingStage(analysis);
    
    await motivationProfileRepo.update(userId, centerId, {
      ...analysis,
      onboarding_stage: onboardingStage,
      analysis_version: '1.0',
      last_adaptation_date: new Date(),
    });

    return { ...analysis, onboarding_stage: onboardingStage };
  }

  _determineOnboardingStage(profile) {
    if (profile.confidence < 30) {
      return 'AWAITING_INITIAL_DATA';
    }
    
    if (profile.confidence >= 30 && profile.confidence < 60) {
      if (profile.competitive_score > 60) return 'TESTING_COMPETITIVE';
      if (profile.collaborative_score > 60) return 'TESTING_COLLABORATIVE';
      if (profile.short_term_score > 60) return 'TESTING_SHORT_TERM';
      if (profile.long_term_score > 60) return 'TESTING_LONG_TERM';
    }
    
    if (profile.confidence >= 60) {
      return 'STABLE';
    }
    
    return 'AWAITING_INITIAL_DATA';
  }

  async updateMotivationProfile(userId, centerId) {
    return this.analyzeUserBehavior(userId, centerId);
  }

  async getMotivationProfile(userId, centerId) {
    let profile = await motivationProfileRepo.findByUserAndCenter(userId, centerId);

    if (!profile || profile.confidence < 30) {
      profile = await this.analyzeUserBehavior(userId, centerId);
    }

    return profile;
  }

  async getPersonalizedGamification(userId, centerId) {
    const profile = await this.getMotivationProfile(userId, centerId);
    const currentConfig = {};

    const shouldAdapt = this._shouldAdapt(profile);
    let personalization;
    
    if (shouldAdapt) {
      try {
        personalization = await adaptiveGamificationAI.generatePersonalization(
          profile,
          currentConfig
        );
        personalization.currentStrategy = this._determineStrategy(profile);
        personalization.lastAdaptationDate = new Date();
      } catch (error) {
        console.error('❌ Lỗi khi generate personalization:', error);
        personalization = this._getDefaultPersonalization(profile);
      }
    } else {
      personalization = this._getDefaultPersonalization(profile);
      personalization.skipReason = 'Cooldown period active';
    }

    return {
      motivation_profile: profile,
      personalization,
    };
  }

  _shouldAdapt(profile) {
    if (!profile.last_adaptation_date) return true;
    const daysSinceLastAdaptation = (Date.now() - new Date(profile.last_adaptation_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastAdaptation >= 7;
  }

  _determineStrategy(profile) {
    if (profile.confidence < 30) {
      return 'UNIFORM_PUSH';
    }
    if (profile.competitive_score > 70) {
      return 'COMPETITIVE_FOCUS';
    }
    if (profile.collaborative_score > 70) {
      return 'COLLABORATIVE_FOCUS';
    }
    if (profile.short_term_score > 70) {
      return 'SHORT_TERM_FOCUS';
    }
    if (profile.long_term_score > 70) {
      return 'LONG_TERM_FOCUS';
    }
    return 'BALANCED';
  }

  _getDefaultPersonalization(profile) {
    return {
      leaderboard_weight: 0.5,
      badges_weight: 0.5,
      points_weight: 1.0,
      goals_weight: 0.5,
      recommended_badge_categories: [],
      reward_multipliers: {
        competitive: 1.0,
        collaborative: 1.0,
        short_term: 1.0,
        long_term: 1.0,
      },
      personalized_messages: [],
      currentStrategy: 'UNIFORM_PUSH',
    };
  }

  async getPersonalizedBadges(userId, centerId, allBadges) {
    const profile = await this.getMotivationProfile(userId, centerId);
    const personalized = await this.getPersonalizedGamification(userId, centerId);
    
    const recommendedCategories = personalized.personalization.recommended_badge_categories || [];
    const multipliers = personalized.personalization.reward_multipliers || {};

    const personalizedBadges = allBadges.map(badge => {
      let adjustedPoints = badge.points_reward || 0;
      const categoryMultiplier = multipliers[badge.category] || 1.0;
      adjustedPoints = Math.round(adjustedPoints * categoryMultiplier);

      const isRecommended = recommendedCategories.includes(badge.category);
      const priority = isRecommended ? 1 : 2;

      return {
        ...badge,
        adjusted_points_reward: adjustedPoints,
        is_recommended: isRecommended,
        priority,
        multiplier_applied: categoryMultiplier,
      };
    }).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.adjusted_points_reward - a.adjusted_points_reward;
    });

    return personalizedBadges;
  }

  async adjustRewards(userId, centerId, action) {
    const profile = await this.getMotivationProfile(userId, centerId);
    const personalization = await adaptiveGamificationAI.generatePersonalization(
      profile,
      {}
    );

    let multiplier = 1.0;
    if (action === 'complete_task') {
      if (profile.competitive_score > 70) {
        multiplier = personalization.reward_multipliers.competitive || 1.0;
      } else if (profile.collaborative_score > 70) {
        multiplier = personalization.reward_multipliers.collaborative || 1.0;
      }
    }

    return {
      base_points: 10,
      multiplier,
      final_points: Math.round(10 * multiplier),
    };
  }

  async getUserCenterId(userId) {
    const centerMember = await CenterMemberRepo.findByUserId(userId);
    if (centerMember && centerMember.length > 0) {
      return centerMember[0].center_id || centerMember[0]._id;
    }
    return null;
  }
}

module.exports = new AdaptiveGamificationService();



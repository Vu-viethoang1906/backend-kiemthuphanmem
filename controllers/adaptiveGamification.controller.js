const adaptiveGamificationService = require('../services/adaptiveGamification.service');
const behaviorService = require('../services/gamificationBehavior.service');
const badgeService = require('../services/badge.service');

class AdaptiveGamificationController {
  async getDashboard(req, res) {
    try {
      const userId = req.user.id;
      const { center_id, days = 30, recent_limit = 10 } = req.query;

      let centerId = center_id;
      if (!centerId) {
        centerId = await adaptiveGamificationService.getUserCenterId(userId);
        if (!centerId) {
          return res.status(400).json({
            success: false,
            message: 'Không tìm thấy center của user. Vui lòng cung cấp center_id',
          });
        }
      }

      const [profile, personalized, userBadges, recentBadges, behaviorStats, allBadges, behaviorAnalytics] = await Promise.all([
        adaptiveGamificationService.getMotivationProfile(userId, centerId),
        adaptiveGamificationService.getPersonalizedGamification(userId, centerId),
        badgeService.getUserBadges(userId, centerId),
        badgeService.getRecentBadges(centerId, parseInt(recent_limit)),
        behaviorService.getBehaviorStats(userId, centerId, parseInt(days)),
        badgeService.getAllBadges(),
        behaviorService.getBehaviorAnalytics(userId, centerId, parseInt(days)),
      ]);

      const personalizedBadges = await adaptiveGamificationService.getPersonalizedBadges(userId, centerId, allBadges);

      res.json({
        success: true,
        data: {
          user_id: userId,
          center_id: centerId,
          motivation_profile: {
            competitive_score: profile.competitive_score,
            collaborative_score: profile.collaborative_score,
            short_term_score: profile.short_term_score,
            long_term_score: profile.long_term_score,
            confidence: profile.confidence,
            onboarding_stage: profile.onboarding_stage || 'AWAITING_INITIAL_DATA',
            insights: profile.insights,
            recommendations: profile.recommendations,
            last_updated: profile.updated_at || profile.created_at,
          },
          personalization: {
            current_strategy: personalized.personalization.currentStrategy || 'UNIFORM_PUSH',
            leaderboard_weight: personalized.personalization.leaderboard_weight,
            badges_weight: personalized.personalization.badges_weight,
            points_weight: personalized.personalization.points_weight,
            goals_weight: personalized.personalization.goals_weight,
            recommended_badge_categories: personalized.personalization.recommended_badge_categories,
            reward_multipliers: personalized.personalization.reward_multipliers,
            personalized_messages: personalized.personalization.personalized_messages,
            last_adaptation_date: personalized.personalization.lastAdaptationDate,
            skip_reason: personalized.personalization.skipReason,
          },
          my_badges: {
            total: userBadges.length,
            badges: userBadges.map(b => ({
              _id: b.badge_id?._id || b.badge_id,
              name: b.badge_id?.name,
              description: b.badge_id?.description,
              icon_url: b.badge_id?.icon_url,
              category: b.badge_id?.category,
              earned_at: b.earned_at,
              metadata: b.metadata,
            })),
          },
          recent_badges: {
            total: recentBadges.length,
            badges: recentBadges.map(b => ({
              user: {
                _id: b.user_id?._id || b.user_id,
                username: b.user_id?.username,
                full_name: b.user_id?.full_name,
              },
              badge: {
                _id: b.badge_id?._id || b.badge_id,
                name: b.badge_id?.name,
                icon_url: b.badge_id?.icon_url,
                category: b.badge_id?.category,
              },
              earned_at: b.earned_at,
            })),
          },
          behavior: {
            stats: behaviorStats,
            analytics: behaviorAnalytics,
            period_days: parseInt(days),
          },
          available_badges: {
            total: allBadges.length,
            badges: allBadges,
          },
          personalized_badges: {
            total: personalizedBadges.length,
            recommended: personalizedBadges.filter(b => b.is_recommended),
            badges: personalizedBadges,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const { center_id } = req.query;

      if (!center_id) {
        const centerId = await adaptiveGamificationService.getUserCenterId(userId);
        if (!centerId) {
          return res.status(400).json({
            success: false,
            message: 'Không tìm thấy center của user',
          });
        }

        const profile = await adaptiveGamificationService.getMotivationProfile(userId, centerId);
        return res.json({ success: true, data: profile });
      }

      const profile = await adaptiveGamificationService.getMotivationProfile(userId, center_id);
      res.json({ success: true, data: profile });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async trackBehavior(req, res) {
    try {
      const userId = req.user.id;
      const center_id = req.body?.center_id || req.query?.center_id;
      const action_type = req.body?.action_type || req.query?.action_type;
      const element_type = req.body?.element_type || req.query?.element_type;
      const metadata = req.body?.metadata || req.query?.metadata || {};

      if (!center_id || !action_type) {
        return res.status(400).json({
          success: false,
          message: 'center_id và action_type là bắt buộc',
        });
      }

      let parsedMetadata = metadata;
      if (typeof metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (e) {
          parsedMetadata = {};
        }
      }

      await behaviorService.trackBehavior(userId, center_id, action_type, element_type, parsedMetadata);

      res.json({ success: true, message: 'Đã ghi nhận hành vi' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPersonalizedDashboard(req, res) {
    try {
      const userId = req.user.id;
      const { center_id } = req.query;

      if (!center_id) {
        const centerId = await adaptiveGamificationService.getUserCenterId(userId);
        if (!centerId) {
          return res.status(400).json({
            success: false,
            message: 'Không tìm thấy center của user',
          });
        }

        const result = await adaptiveGamificationService.getPersonalizedGamification(
          userId,
          centerId
        );
        return res.json({ success: true, data: result });
      }

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        userId,
        center_id
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async analyze(req, res) {
    try {
      const userId = req.user.id;
      const { center_id, user_id } = req.query;

      const targetUserId = user_id || userId;
      const centerId = center_id || (await adaptiveGamificationService.getUserCenterId(targetUserId));

      if (!centerId) {
        return res.status(400).json({
          success: false,
          message: 'center_id là bắt buộc',
        });
      }

      const analysis = await adaptiveGamificationService.analyzeUserBehavior(targetUserId, centerId);
      res.json({ success: true, data: analysis });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBehaviorAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { center_id, period = 30 } = req.query;

      if (!center_id) {
        const centerId = await adaptiveGamificationService.getUserCenterId(userId);
        if (!centerId) {
          return res.status(400).json({
            success: false,
            message: 'Không tìm thấy center của user',
          });
        }

        const analytics = await behaviorService.getBehaviorAnalytics(userId, centerId, parseInt(period));
        return res.json({ success: true, data: analytics });
      }

      const analytics = await behaviorService.getBehaviorAnalytics(userId, center_id, parseInt(period));
      res.json({ success: true, data: analytics });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBehaviorStats(req, res) {
    try {
      const userId = req.user.id;
      const { center_id, days = 30 } = req.query;

      if (!center_id) {
        const centerId = await adaptiveGamificationService.getUserCenterId(userId);
        if (!centerId) {
          return res.status(400).json({
            success: false,
            message: 'Không tìm thấy center của user',
          });
        }

        const stats = await behaviorService.getBehaviorStats(userId, centerId, parseInt(days));
        return res.json({ success: true, data: stats });
      }

      const stats = await behaviorService.getBehaviorStats(userId, center_id, parseInt(days));
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { center_id } = req.query;

      if (!center_id) {
        const centerId = await adaptiveGamificationService.getUserCenterId(userId);
        if (!centerId) {
          return res.status(400).json({
            success: false,
            message: 'Không tìm thấy center của user',
          });
        }

        const profile = await adaptiveGamificationService.updateMotivationProfile(userId, centerId);
        return res.json({ success: true, data: profile });
      }

      const profile = await adaptiveGamificationService.updateMotivationProfile(userId, center_id);
      res.json({ success: true, data: profile });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async adjustRewards(req, res) {
    try {
      const userId = req.user.id;
      const { center_id, action } = req.body;

      if (!center_id || !action) {
        return res.status(400).json({
          success: false,
          message: 'center_id và action là bắt buộc',
        });
      }

      const rewards = await adaptiveGamificationService.adjustRewards(userId, center_id, action);
      res.json({ success: true, data: rewards });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AdaptiveGamificationController();



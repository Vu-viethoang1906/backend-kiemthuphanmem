// 📄 tests/unit/adaptiveGamification.service.test.js - Adaptive Gamification Service Unit Tests

const adaptiveGamificationService = require('../../services/adaptiveGamification.service');
const motivationProfileRepo = require('../../repositories/userMotivationProfile.repository');
const behaviorService = require('../../services/gamificationBehavior.service');
const adaptiveGamificationAI = require('../../services/adaptiveGamificationAI.service');
const CenterMemberRepo = require('../../repositories/centerMember.repo');

// Mock dependencies
jest.mock('../../repositories/userMotivationProfile.repository');
jest.mock('../../services/gamificationBehavior.service');
jest.mock('../../services/adaptiveGamificationAI.service');
jest.mock('../../repositories/centerMember.repo');

describe('🔹 Adaptive Gamification Service Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const VALID_CENTER_ID = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeUserBehavior', () => {
    it('✅ should analyze user behavior and update profile successfully', async () => {
      const mockStats = {
        leaderboard_views: 10,
        task_completions: 5,
        collaboration_events: 3,
      };

      const mockAnalysis = {
        competitive_score: 75,
        collaborative_score: 60,
        short_term_score: 70,
        long_term_score: 50,
        confidence: 65,
        insights: ['User is competitive'],
        recommendations: ['Focus on leaderboard'],
      };

      behaviorService.getBehaviorStats.mockResolvedValue(mockStats);
      adaptiveGamificationAI.analyzeBehaviorPatterns.mockResolvedValue(mockAnalysis);
      motivationProfileRepo.update.mockResolvedValue({
        ...mockAnalysis,
        onboarding_stage: 'STABLE',
      });

      const result = await adaptiveGamificationService.analyzeUserBehavior(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(behaviorService.getBehaviorStats).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        30
      );
      expect(adaptiveGamificationAI.analyzeBehaviorPatterns).toHaveBeenCalledWith(mockStats);
      expect(motivationProfileRepo.update).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        expect.objectContaining({
          competitive_score: 75,
          collaborative_score: 60,
          short_term_score: 70,
          long_term_score: 50,
          confidence: 65,
          onboarding_stage: 'STABLE',
          analysis_version: '1.0',
          last_adaptation_date: expect.any(Date),
        })
      );
      expect(result).toEqual({
        ...mockAnalysis,
        onboarding_stage: 'STABLE',
      });
    });

    it('✅ should determine onboarding stage as AWAITING_INITIAL_DATA when confidence < 30', async () => {
      const mockStats = {};
      const mockAnalysis = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 20,
        insights: [],
        recommendations: [],
      };

      behaviorService.getBehaviorStats.mockResolvedValue(mockStats);
      adaptiveGamificationAI.analyzeBehaviorPatterns.mockResolvedValue(mockAnalysis);
      motivationProfileRepo.update.mockResolvedValue({
        ...mockAnalysis,
        onboarding_stage: 'AWAITING_INITIAL_DATA',
      });

      const result = await adaptiveGamificationService.analyzeUserBehavior(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.onboarding_stage).toBe('AWAITING_INITIAL_DATA');
      expect(motivationProfileRepo.update).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        expect.objectContaining({
          onboarding_stage: 'AWAITING_INITIAL_DATA',
        })
      );
    });

    it('✅ should determine onboarding stage as TESTING_COMPETITIVE when confidence 30-60 and competitive > 60', async () => {
      const mockStats = {};
      const mockAnalysis = {
        competitive_score: 65,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 45,
        insights: [],
        recommendations: [],
      };

      behaviorService.getBehaviorStats.mockResolvedValue(mockStats);
      adaptiveGamificationAI.analyzeBehaviorPatterns.mockResolvedValue(mockAnalysis);
      motivationProfileRepo.update.mockResolvedValue({
        ...mockAnalysis,
        onboarding_stage: 'TESTING_COMPETITIVE',
      });

      const result = await adaptiveGamificationService.analyzeUserBehavior(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.onboarding_stage).toBe('TESTING_COMPETITIVE');
    });

    it('✅ should determine onboarding stage as TESTING_COLLABORATIVE when confidence 30-60 and collaborative > 60', async () => {
      const mockStats = {};
      const mockAnalysis = {
        competitive_score: 50,
        collaborative_score: 65,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 45,
        insights: [],
        recommendations: [],
      };

      behaviorService.getBehaviorStats.mockResolvedValue(mockStats);
      adaptiveGamificationAI.analyzeBehaviorPatterns.mockResolvedValue(mockAnalysis);
      motivationProfileRepo.update.mockResolvedValue({
        ...mockAnalysis,
        onboarding_stage: 'TESTING_COLLABORATIVE',
      });

      const result = await adaptiveGamificationService.analyzeUserBehavior(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.onboarding_stage).toBe('TESTING_COLLABORATIVE');
    });

    it('✅ should determine onboarding stage as STABLE when confidence >= 60', async () => {
      const mockStats = {};
      const mockAnalysis = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 70,
        insights: [],
        recommendations: [],
      };

      behaviorService.getBehaviorStats.mockResolvedValue(mockStats);
      adaptiveGamificationAI.analyzeBehaviorPatterns.mockResolvedValue(mockAnalysis);
      motivationProfileRepo.update.mockResolvedValue({
        ...mockAnalysis,
        onboarding_stage: 'STABLE',
      });

      const result = await adaptiveGamificationService.analyzeUserBehavior(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.onboarding_stage).toBe('STABLE');
    });

    it('❌ should handle error from behaviorService', async () => {
      const error = new Error('Failed to get behavior stats');
      behaviorService.getBehaviorStats.mockRejectedValue(error);

      await expect(
        adaptiveGamificationService.analyzeUserBehavior(VALID_USER_ID, VALID_CENTER_ID)
      ).rejects.toThrow('Failed to get behavior stats');
    });
  });

  describe('updateMotivationProfile', () => {
    it('✅ should call analyzeUserBehavior', async () => {
      const mockResult = {
        competitive_score: 75,
        onboarding_stage: 'STABLE',
      };

      jest.spyOn(adaptiveGamificationService, 'analyzeUserBehavior').mockResolvedValue(mockResult);

      const result = await adaptiveGamificationService.updateMotivationProfile(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(adaptiveGamificationService.analyzeUserBehavior).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getMotivationProfile', () => {
    it('✅ should return existing profile when confidence >= 30', async () => {
      const mockProfile = {
        competitive_score: 75,
        collaborative_score: 60,
        confidence: 65,
        onboarding_stage: 'STABLE',
      };

      motivationProfileRepo.findByUserAndCenter.mockResolvedValue(mockProfile);

      const result = await adaptiveGamificationService.getMotivationProfile(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(motivationProfileRepo.findByUserAndCenter).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(result).toEqual(mockProfile);
      expect(behaviorService.getBehaviorStats).not.toHaveBeenCalled();
    });

    it('✅ should analyze and return new profile when profile does not exist', async () => {
      const mockAnalysis = {
        competitive_score: 75,
        collaborative_score: 60,
        confidence: 65,
        onboarding_stage: 'STABLE',
      };

      motivationProfileRepo.findByUserAndCenter.mockResolvedValue(null);
      jest
        .spyOn(adaptiveGamificationService, 'analyzeUserBehavior')
        .mockResolvedValue(mockAnalysis);

      const result = await adaptiveGamificationService.getMotivationProfile(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(adaptiveGamificationService.analyzeUserBehavior).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(result).toEqual(mockAnalysis);
    });

    it('✅ should analyze and return new profile when confidence < 30', async () => {
      const mockProfile = {
        competitive_score: 50,
        confidence: 20,
      };

      const mockAnalysis = {
        competitive_score: 75,
        confidence: 65,
        onboarding_stage: 'STABLE',
      };

      motivationProfileRepo.findByUserAndCenter.mockResolvedValue(mockProfile);
      jest
        .spyOn(adaptiveGamificationService, 'analyzeUserBehavior')
        .mockResolvedValue(mockAnalysis);

      const result = await adaptiveGamificationService.getMotivationProfile(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(adaptiveGamificationService.analyzeUserBehavior).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('getPersonalizedGamification', () => {
    it('✅ should return personalized gamification when should adapt', async () => {
      const mockProfile = {
        competitive_score: 75,
        collaborative_score: 60,
        confidence: 65,
        last_adaptation_date: null,
      };

      const mockPersonalization = {
        leaderboard_weight: 0.8,
        badges_weight: 0.7,
        points_weight: 1.0,
        goals_weight: 0.5,
        recommended_badge_categories: ['competitive'],
        reward_multipliers: {
          competitive: 1.2,
          collaborative: 1.0,
          short_term: 1.0,
          long_term: 1.0,
        },
        personalized_messages: [],
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(adaptiveGamificationAI.generatePersonalization).toHaveBeenCalledWith(mockProfile, {});
      expect(result).toEqual({
        motivation_profile: mockProfile,
        personalization: {
          ...mockPersonalization,
          currentStrategy: 'COMPETITIVE_FOCUS',
          lastAdaptationDate: expect.any(Date),
        },
      });
    });

    it('✅ should return default personalization when should not adapt (cooldown)', async () => {
      const mockProfile = {
        competitive_score: 75,
        collaborative_score: 60,
        confidence: 65,
        last_adaptation_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(adaptiveGamificationAI.generatePersonalization).not.toHaveBeenCalled();
      expect(result).toEqual({
        motivation_profile: mockProfile,
        personalization: {
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
          skipReason: 'Cooldown period active',
        },
      });
    });

    it('✅ should return default personalization when AI generation fails', async () => {
      const mockProfile = {
        competitive_score: 75,
        collaborative_score: 60,
        confidence: 65,
        last_adaptation_date: null,
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockRejectedValue(
        new Error('AI service error')
      );

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result).toEqual({
        motivation_profile: mockProfile,
        personalization: {
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
        },
      });
    });

    it('✅ should determine strategy as COMPETITIVE_FOCUS when competitive_score > 70', async () => {
      const mockProfile = {
        competitive_score: 75,
        collaborative_score: 50,
        confidence: 65,
        last_adaptation_date: null,
      };

      const mockPersonalization = {
        leaderboard_weight: 0.8,
        badges_weight: 0.5,
        points_weight: 1.0,
        goals_weight: 0.5,
        recommended_badge_categories: [],
        reward_multipliers: {},
        personalized_messages: [],
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.personalization.currentStrategy).toBe('COMPETITIVE_FOCUS');
    });

    it('✅ should determine strategy as COLLABORATIVE_FOCUS when collaborative_score > 70', async () => {
      const mockProfile = {
        competitive_score: 50,
        collaborative_score: 75,
        confidence: 65,
        last_adaptation_date: null,
      };

      const mockPersonalization = {
        leaderboard_weight: 0.5,
        badges_weight: 0.7,
        points_weight: 1.0,
        goals_weight: 0.5,
        recommended_badge_categories: [],
        reward_multipliers: {},
        personalized_messages: [],
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.personalization.currentStrategy).toBe('COLLABORATIVE_FOCUS');
    });

    it('✅ should determine strategy as SHORT_TERM_FOCUS when short_term_score > 70', async () => {
      const mockProfile = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 75,
        confidence: 65,
        last_adaptation_date: null,
      };

      const mockPersonalization = {
        leaderboard_weight: 0.5,
        badges_weight: 0.5,
        points_weight: 1.0,
        goals_weight: 0.7,
        recommended_badge_categories: [],
        reward_multipliers: {},
        personalized_messages: [],
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.personalization.currentStrategy).toBe('SHORT_TERM_FOCUS');
    });

    it('✅ should determine strategy as LONG_TERM_FOCUS when long_term_score > 70', async () => {
      const mockProfile = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 75,
        confidence: 65,
        last_adaptation_date: null,
      };

      const mockPersonalization = {
        leaderboard_weight: 0.5,
        badges_weight: 0.5,
        points_weight: 1.0,
        goals_weight: 0.7,
        recommended_badge_categories: [],
        reward_multipliers: {},
        personalized_messages: [],
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.personalization.currentStrategy).toBe('LONG_TERM_FOCUS');
    });

    it('✅ should determine strategy as BALANCED when no score > 70', async () => {
      const mockProfile = {
        competitive_score: 60,
        collaborative_score: 60,
        short_term_score: 60,
        long_term_score: 60,
        confidence: 65,
        last_adaptation_date: null,
      };

      const mockPersonalization = {
        leaderboard_weight: 0.5,
        badges_weight: 0.5,
        points_weight: 1.0,
        goals_weight: 0.5,
        recommended_badge_categories: [],
        reward_multipliers: {},
        personalized_messages: [],
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.personalization.currentStrategy).toBe('BALANCED');
    });

    it('✅ should determine strategy as UNIFORM_PUSH when confidence < 30', async () => {
      const mockProfile = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 20,
        last_adaptation_date: null,
      };

      const mockPersonalization = {
        leaderboard_weight: 0.5,
        badges_weight: 0.5,
        points_weight: 1.0,
        goals_weight: 0.5,
        recommended_badge_categories: [],
        reward_multipliers: {},
        personalized_messages: [],
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedGamification(
        VALID_USER_ID,
        VALID_CENTER_ID
      );

      expect(result.personalization.currentStrategy).toBe('UNIFORM_PUSH');
    });
  });

  describe('getPersonalizedBadges', () => {
    it('✅ should return personalized badges with adjusted points and priority', async () => {
      const mockProfile = {
        competitive_score: 75,
        collaborative_score: 60,
        confidence: 65,
      };

      const mockPersonalization = {
        personalization: {
          recommended_badge_categories: ['competitive', 'achievement'],
          reward_multipliers: {
            competitive: 1.2,
            collaborative: 1.0,
            short_term: 1.0,
            long_term: 1.0,
          },
        },
      };

      const allBadges = [
        {
          _id: 'badge1',
          name: 'Top Performer',
          category: 'competitive',
          points_reward: 100,
        },
        {
          _id: 'badge2',
          name: 'Team Player',
          category: 'collaborative',
          points_reward: 80,
        },
        {
          _id: 'badge3',
          name: 'Daily Streak',
          category: 'achievement',
          points_reward: 50,
        },
      ];

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(adaptiveGamificationService, 'getPersonalizedGamification')
        .mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedBadges(
        VALID_USER_ID,
        VALID_CENTER_ID,
        allBadges
      );

      expect(result).toHaveLength(3);
      expect(result[0]._id).toBe('badge1');
      expect(result[0].adjusted_points_reward).toBe(120); // 100 * 1.2
      expect(result[0].is_recommended).toBe(true);
      expect(result[0].priority).toBe(1);
      expect(result[0].multiplier_applied).toBe(1.2);

      expect(result[1]._id).toBe('badge3');
      expect(result[1].adjusted_points_reward).toBe(50); // 50 * 1.0
      expect(result[1].is_recommended).toBe(true);
      expect(result[1].priority).toBe(1);

      expect(result[2]._id).toBe('badge2');
      expect(result[2].adjusted_points_reward).toBe(80); // 80 * 1.0
      expect(result[2].is_recommended).toBe(false);
      expect(result[2].priority).toBe(2);
    });

    it('✅ should sort badges by priority then by adjusted points', async () => {
      const mockProfile = {
        competitive_score: 75,
        confidence: 65,
      };

      const mockPersonalization = {
        personalization: {
          recommended_badge_categories: ['competitive'],
          reward_multipliers: {
            competitive: 1.2,
            collaborative: 1.0,
          },
        },
      };

      const allBadges = [
        { _id: 'badge1', name: 'Badge 1', category: 'collaborative', points_reward: 200 },
        { _id: 'badge2', name: 'Badge 2', category: 'competitive', points_reward: 100 },
        { _id: 'badge3', name: 'Badge 3', category: 'collaborative', points_reward: 150 },
      ];

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(adaptiveGamificationService, 'getPersonalizedGamification')
        .mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedBadges(
        VALID_USER_ID,
        VALID_CENTER_ID,
        allBadges
      );

      // Badge 2 should be first (priority 1, adjusted 120)
      expect(result[0]._id).toBe('badge2');
      // Badge 1 should be second (priority 2, adjusted 200)
      expect(result[1]._id).toBe('badge1');
      // Badge 3 should be third (priority 2, adjusted 150)
      expect(result[2]._id).toBe('badge3');
    });

    it('✅ should handle badges without points_reward', async () => {
      const mockProfile = {
        competitive_score: 75,
        confidence: 65,
      };

      const mockPersonalization = {
        personalization: {
          recommended_badge_categories: [],
          reward_multipliers: {},
        },
      };

      const allBadges = [{ _id: 'badge1', name: 'Badge 1', category: 'competitive' }];

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(adaptiveGamificationService, 'getPersonalizedGamification')
        .mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.getPersonalizedBadges(
        VALID_USER_ID,
        VALID_CENTER_ID,
        allBadges
      );

      expect(result[0].adjusted_points_reward).toBe(0);
    });
  });

  describe('adjustRewards', () => {
    it('✅ should adjust rewards for complete_task with competitive profile', async () => {
      const mockProfile = {
        competitive_score: 75,
        collaborative_score: 50,
        confidence: 65,
      };

      const mockPersonalization = {
        reward_multipliers: {
          competitive: 1.2,
          collaborative: 1.0,
          short_term: 1.0,
          long_term: 1.0,
        },
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.adjustRewards(
        VALID_USER_ID,
        VALID_CENTER_ID,
        'complete_task'
      );

      expect(result).toEqual({
        base_points: 10,
        multiplier: 1.2,
        final_points: 12,
      });
    });

    it('✅ should adjust rewards for complete_task with collaborative profile', async () => {
      const mockProfile = {
        competitive_score: 50,
        collaborative_score: 75,
        confidence: 65,
      };

      const mockPersonalization = {
        reward_multipliers: {
          competitive: 1.0,
          collaborative: 1.3,
          short_term: 1.0,
          long_term: 1.0,
        },
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.adjustRewards(
        VALID_USER_ID,
        VALID_CENTER_ID,
        'complete_task'
      );

      expect(result).toEqual({
        base_points: 10,
        multiplier: 1.3,
        final_points: 13,
      });
    });

    it('✅ should return default multiplier when profile scores <= 70', async () => {
      const mockProfile = {
        competitive_score: 60,
        collaborative_score: 60,
        confidence: 65,
      };

      const mockPersonalization = {
        reward_multipliers: {
          competitive: 1.0,
          collaborative: 1.0,
          short_term: 1.0,
          long_term: 1.0,
        },
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.adjustRewards(
        VALID_USER_ID,
        VALID_CENTER_ID,
        'complete_task'
      );

      expect(result).toEqual({
        base_points: 10,
        multiplier: 1.0,
        final_points: 10,
      });
    });

    it('✅ should handle other action types', async () => {
      const mockProfile = {
        competitive_score: 75,
        collaborative_score: 50,
        confidence: 65,
      };

      const mockPersonalization = {
        reward_multipliers: {
          competitive: 1.2,
          collaborative: 1.0,
          short_term: 1.0,
          long_term: 1.0,
        },
      };

      jest
        .spyOn(adaptiveGamificationService, 'getMotivationProfile')
        .mockResolvedValue(mockProfile);
      adaptiveGamificationAI.generatePersonalization.mockResolvedValue(mockPersonalization);

      const result = await adaptiveGamificationService.adjustRewards(
        VALID_USER_ID,
        VALID_CENTER_ID,
        'other_action'
      );

      expect(result).toEqual({
        base_points: 10,
        multiplier: 1.0,
        final_points: 10,
      });
    });
  });

  describe('getUserCenterId', () => {
    it('✅ should return center_id from centerMember', async () => {
      const mockCenterMember = [
        {
          _id: 'center_member_id',
          center_id: VALID_CENTER_ID,
          user_id: VALID_USER_ID,
        },
      ];

      CenterMemberRepo.findByUserId.mockResolvedValue(mockCenterMember);

      const result = await adaptiveGamificationService.getUserCenterId(VALID_USER_ID);

      expect(CenterMemberRepo.findByUserId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(result).toBe(VALID_CENTER_ID);
    });

    it('✅ should return center_id from _id when center_id is not present', async () => {
      const mockCenterMember = [
        {
          _id: VALID_CENTER_ID,
          user_id: VALID_USER_ID,
        },
      ];

      CenterMemberRepo.findByUserId.mockResolvedValue(mockCenterMember);

      const result = await adaptiveGamificationService.getUserCenterId(VALID_USER_ID);

      expect(result).toBe(VALID_CENTER_ID);
    });

    it('✅ should return null when no centerMember found', async () => {
      CenterMemberRepo.findByUserId.mockResolvedValue([]);

      const result = await adaptiveGamificationService.getUserCenterId(VALID_USER_ID);

      expect(result).toBeNull();
    });

    it('✅ should return null when centerMember is null', async () => {
      CenterMemberRepo.findByUserId.mockResolvedValue(null);

      const result = await adaptiveGamificationService.getUserCenterId(VALID_USER_ID);

      expect(result).toBeNull();
    });
  });
});

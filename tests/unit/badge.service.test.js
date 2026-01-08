// 📄 tests/unit/badge.service.test.js - Badge Service Unit Tests
const mongoose = require('mongoose');

// Mock repositories
jest.mock('../../repositories/badge.repository');
jest.mock('../../repositories/userBadge.repository');
jest.mock('../../repositories/userPoint.repository');
jest.mock('../../services/adaptiveGamification.service');

const BadgeService = require('../../services/badge.service');
const badgeRepo = require('../../repositories/badge.repository');
const userBadgeRepo = require('../../repositories/userBadge.repository');
const userPointRepo = require('../../repositories/userPoint.repository');

describe('🔹 Badge Service Unit Tests', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockCenterId = new mongoose.Types.ObjectId();
  const mockBadgeId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllBadges', () => {
    it('✅ should return all badges with filters', async () => {
      const filters = { category: 'achievement' };
      const mockBadges = [
        { _id: mockBadgeId, name: 'First Task', category: 'achievement' },
        { _id: new mongoose.Types.ObjectId(), name: 'Task Master', category: 'achievement' },
      ];

      badgeRepo.findAll.mockResolvedValue(mockBadges);

      const result = await BadgeService.getAllBadges(filters);

      expect(badgeRepo.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockBadges);
    });

    it('✅ should return all badges without filters', async () => {
      const mockBadges = [{ _id: mockBadgeId, name: 'First Task' }];

      badgeRepo.findAll.mockResolvedValue(mockBadges);

      const result = await BadgeService.getAllBadges();

      expect(badgeRepo.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual(mockBadges);
    });
  });

  describe('getBadgeById', () => {
    it('✅ should return badge by id', async () => {
      const mockBadge = {
        _id: mockBadgeId,
        name: 'First Task',
        category: 'achievement',
        points_reward: 100,
      };

      badgeRepo.findById.mockResolvedValue(mockBadge);

      const result = await BadgeService.getBadgeById(mockBadgeId);

      expect(badgeRepo.findById).toHaveBeenCalledWith(mockBadgeId);
      expect(result).toEqual(mockBadge);
    });

    it('✅ should return null when badge not found', async () => {
      badgeRepo.findById.mockResolvedValue(null);

      const result = await BadgeService.getBadgeById(mockBadgeId);

      expect(badgeRepo.findById).toHaveBeenCalledWith(mockBadgeId);
      expect(result).toBeNull();
    });
  });

  describe('getUserBadges', () => {
    it('✅ should return user badges for center', async () => {
      const mockUserBadges = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: mockUserId,
          badge_id: mockBadgeId,
          center_id: mockCenterId,
          earned_at: new Date(),
        },
      ];

      userBadgeRepo.findByUserAndCenter.mockResolvedValue(mockUserBadges);

      const result = await BadgeService.getUserBadges(mockUserId, mockCenterId);

      expect(userBadgeRepo.findByUserAndCenter).toHaveBeenCalledWith(mockUserId, mockCenterId);
      expect(result).toEqual(mockUserBadges);
    });

    it('✅ should return empty array when user has no badges', async () => {
      userBadgeRepo.findByUserAndCenter.mockResolvedValue([]);

      const result = await BadgeService.getUserBadges(mockUserId, mockCenterId);

      expect(result).toEqual([]);
    });
  });

  describe('checkAndAwardBadges', () => {
    let adaptiveGamificationService;

    beforeEach(() => {
      // Mock adaptiveGamificationService
      adaptiveGamificationService = require('../../services/adaptiveGamification.service');
    });

    it('✅ should award badge when criteria is met', async () => {
      const mockBadge = {
        _id: mockBadgeId,
        name: 'Task Master',
        category: 'achievement',
        points_reward: 100,
        criteria: { type: 'task_count', value: 10 },
        is_active: true,
      };

      const mockPersonalized = {
        personalization: {
          reward_multipliers: {
            achievement: 1.5,
          },
        },
      };

      badgeRepo.findAll.mockResolvedValue([mockBadge]);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);
      userBadgeRepo.findByUserBadgeAndCenter.mockResolvedValue(null); // User doesn't have badge
      userBadgeRepo.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      userPointRepo.updatePoint.mockResolvedValue();

      const metadata = {
        completed_tasks: 15, // Meets criteria (>= 10)
        total_points: 500,
      };

      const result = await BadgeService.checkAndAwardBadges(
        mockUserId,
        mockCenterId,
        'complete_task',
        metadata
      );

      expect(badgeRepo.findAll).toHaveBeenCalledWith({ is_active: true });
      expect(adaptiveGamificationService.getPersonalizedGamification).toHaveBeenCalledWith(
        mockUserId,
        mockCenterId
      );
      expect(userBadgeRepo.findByUserBadgeAndCenter).toHaveBeenCalledWith(
        mockUserId,
        mockBadgeId,
        mockCenterId
      );
      expect(userBadgeRepo.create).toHaveBeenCalledWith({
        user_id: mockUserId,
        badge_id: mockBadgeId,
        center_id: mockCenterId,
        metadata: { awarded_for: 'complete_task', ...metadata },
      });
      expect(userPointRepo.updatePoint).toHaveBeenCalledWith(mockUserId, mockCenterId, 150); // 100 * 1.5
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...mockBadge,
        points_awarded: 150,
        multiplier_applied: 1.5,
      });
    });

    it('✅ should not award badge when user already has it', async () => {
      const mockBadge = {
        _id: mockBadgeId,
        name: 'Task Master',
        category: 'achievement',
        points_reward: 100,
        criteria: { type: 'task_count', value: 10 },
        is_active: true,
      };

      const mockPersonalized = {
        personalization: {
          reward_multipliers: {},
        },
      };

      badgeRepo.findAll.mockResolvedValue([mockBadge]);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);
      userBadgeRepo.findByUserBadgeAndCenter.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
      }); // User already has badge

      const metadata = {
        completed_tasks: 15,
      };

      const result = await BadgeService.checkAndAwardBadges(
        mockUserId,
        mockCenterId,
        'complete_task',
        metadata
      );

      expect(userBadgeRepo.create).not.toHaveBeenCalled();
      expect(userPointRepo.updatePoint).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('✅ should not award badge when criteria is not met', async () => {
      const mockBadge = {
        _id: mockBadgeId,
        name: 'Task Master',
        category: 'achievement',
        points_reward: 100,
        criteria: { type: 'task_count', value: 10 },
        is_active: true,
      };

      const mockPersonalized = {
        personalization: {
          reward_multipliers: {},
        },
      };

      badgeRepo.findAll.mockResolvedValue([mockBadge]);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);
      userBadgeRepo.findByUserBadgeAndCenter.mockResolvedValue(null);

      const metadata = {
        completed_tasks: 5, // Does not meet criteria (< 10)
      };

      const result = await BadgeService.checkAndAwardBadges(
        mockUserId,
        mockCenterId,
        'complete_task',
        metadata
      );

      expect(userBadgeRepo.create).not.toHaveBeenCalled();
      expect(userPointRepo.updatePoint).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('✅ should award multiple badges when multiple criteria are met', async () => {
      const mockBadge1 = {
        _id: mockBadgeId,
        name: 'Task Master',
        category: 'achievement',
        points_reward: 100,
        criteria: { type: 'task_count', value: 10 },
        is_active: true,
      };

      const mockBadge2 = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Point Collector',
        category: 'points',
        points_reward: 200,
        criteria: { type: 'points_threshold', value: 500 },
        is_active: true,
      };

      const mockPersonalized = {
        personalization: {
          reward_multipliers: {
            achievement: 1.5,
            points: 2.0,
          },
        },
      };

      badgeRepo.findAll.mockResolvedValue([mockBadge1, mockBadge2]);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);
      userBadgeRepo.findByUserBadgeAndCenter
        .mockResolvedValueOnce(null) // Badge 1 not owned
        .mockResolvedValueOnce(null); // Badge 2 not owned
      userBadgeRepo.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      userPointRepo.updatePoint.mockResolvedValue();

      const metadata = {
        completed_tasks: 15, // Meets badge1 criteria
        total_points: 600, // Meets badge2 criteria
      };

      const result = await BadgeService.checkAndAwardBadges(
        mockUserId,
        mockCenterId,
        'complete_task',
        metadata
      );

      expect(userBadgeRepo.create).toHaveBeenCalledTimes(2);
      expect(userPointRepo.updatePoint).toHaveBeenCalledTimes(2);
      expect(userPointRepo.updatePoint).toHaveBeenNthCalledWith(1, mockUserId, mockCenterId, 150); // 100 * 1.5
      expect(userPointRepo.updatePoint).toHaveBeenNthCalledWith(2, mockUserId, mockCenterId, 400); // 200 * 2.0
      expect(result).toHaveLength(2);
    });

    it('✅ should not update points when finalPoints is 0', async () => {
      const mockBadge = {
        _id: mockBadgeId,
        name: 'Free Badge',
        category: 'achievement',
        points_reward: 0, // No points reward
        criteria: { type: 'task_count', value: 10 },
        is_active: true,
      };

      const mockPersonalized = {
        personalization: {
          reward_multipliers: {},
        },
      };

      badgeRepo.findAll.mockResolvedValue([mockBadge]);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);
      userBadgeRepo.findByUserBadgeAndCenter.mockResolvedValue(null);
      userBadgeRepo.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      const metadata = {
        completed_tasks: 15,
      };

      const result = await BadgeService.checkAndAwardBadges(
        mockUserId,
        mockCenterId,
        'complete_task',
        metadata
      );

      expect(userBadgeRepo.create).toHaveBeenCalled();
      expect(userPointRepo.updatePoint).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].points_awarded).toBe(0);
    });

    it('✅ should use default multiplier 1.0 when category multiplier is missing', async () => {
      const mockBadge = {
        _id: mockBadgeId,
        name: 'Task Master',
        category: 'achievement',
        points_reward: 100,
        criteria: { type: 'task_count', value: 10 },
        is_active: true,
      };

      const mockPersonalized = {
        personalization: {
          reward_multipliers: {}, // No multiplier for achievement
        },
      };

      badgeRepo.findAll.mockResolvedValue([mockBadge]);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);
      userBadgeRepo.findByUserBadgeAndCenter.mockResolvedValue(null);
      userBadgeRepo.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      userPointRepo.updatePoint.mockResolvedValue();

      const metadata = {
        completed_tasks: 15,
      };

      const result = await BadgeService.checkAndAwardBadges(
        mockUserId,
        mockCenterId,
        'complete_task',
        metadata
      );

      expect(userPointRepo.updatePoint).toHaveBeenCalledWith(mockUserId, mockCenterId, 100); // 100 * 1.0
      expect(result[0].multiplier_applied).toBe(1.0);
    });

    it('✅ should handle empty badges list', async () => {
      const mockPersonalized = {
        personalization: {
          reward_multipliers: {},
        },
      };

      badgeRepo.findAll.mockResolvedValue([]);
      adaptiveGamificationService.getPersonalizedGamification.mockResolvedValue(mockPersonalized);

      const result = await BadgeService.checkAndAwardBadges(
        mockUserId,
        mockCenterId,
        'complete_task',
        {}
      );

      expect(result).toEqual([]);
      expect(userBadgeRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('checkBadgeCriteria', () => {
    it('✅ should return true for task_count criteria when met', () => {
      const badge = {
        criteria: { type: 'task_count', value: 10 },
      };
      const metadata = { completed_tasks: 15 };

      const result = BadgeService.checkBadgeCriteria(badge, 'complete_task', metadata);

      expect(result).toBe(true);
    });

    it('✅ should return false for task_count criteria when not met', () => {
      const badge = {
        criteria: { type: 'task_count', value: 10 },
      };
      const metadata = { completed_tasks: 5 };

      const result = BadgeService.checkBadgeCriteria(badge, 'complete_task', metadata);

      expect(result).toBe(false);
    });

    it('✅ should return true for points_threshold criteria when met', () => {
      const badge = {
        criteria: { type: 'points_threshold', value: 500 },
      };
      const metadata = { total_points: 600 };

      const result = BadgeService.checkBadgeCriteria(badge, 'earn_points', metadata);

      expect(result).toBe(true);
    });

    it('✅ should return false for points_threshold criteria when not met', () => {
      const badge = {
        criteria: { type: 'points_threshold', value: 500 },
      };
      const metadata = { total_points: 400 };

      const result = BadgeService.checkBadgeCriteria(badge, 'earn_points', metadata);

      expect(result).toBe(false);
    });

    it('✅ should return true for streak_days criteria when met', () => {
      const badge = {
        criteria: { type: 'streak_days', value: 7 },
      };
      const metadata = { streak_days: 10 };

      const result = BadgeService.checkBadgeCriteria(badge, 'daily_login', metadata);

      expect(result).toBe(true);
    });

    it('✅ should return false for streak_days criteria when not met', () => {
      const badge = {
        criteria: { type: 'streak_days', value: 7 },
      };
      const metadata = { streak_days: 5 };

      const result = BadgeService.checkBadgeCriteria(badge, 'daily_login', metadata);

      expect(result).toBe(false);
    });

    it('✅ should return true for collaboration_count criteria when met', () => {
      const badge = {
        criteria: { type: 'collaboration_count', value: 5 },
      };
      const metadata = { collaboration_count: 8 };

      const result = BadgeService.checkBadgeCriteria(badge, 'collaborate', metadata);

      expect(result).toBe(true);
    });

    it('✅ should return false for collaboration_count criteria when not met', () => {
      const badge = {
        criteria: { type: 'collaboration_count', value: 5 },
      };
      const metadata = { collaboration_count: 3 };

      const result = BadgeService.checkBadgeCriteria(badge, 'collaborate', metadata);

      expect(result).toBe(false);
    });

    it('✅ should return true for first_place criteria when position is 1', () => {
      const badge = {
        criteria: { type: 'first_place', value: null },
      };
      const metadata = { leaderboard_position: 1 };

      const result = BadgeService.checkBadgeCriteria(badge, 'leaderboard_update', metadata);

      expect(result).toBe(true);
    });

    it('✅ should return false for first_place criteria when position is not 1', () => {
      const badge = {
        criteria: { type: 'first_place', value: null },
      };
      const metadata = { leaderboard_position: 2 };

      const result = BadgeService.checkBadgeCriteria(badge, 'leaderboard_update', metadata);

      expect(result).toBe(false);
    });

    it('✅ should return true for top_10 criteria when position is <= 10', () => {
      const badge = {
        criteria: { type: 'top_10', value: 10 },
      };
      const metadata = { leaderboard_position: 5 };

      const result = BadgeService.checkBadgeCriteria(badge, 'leaderboard_update', metadata);

      expect(result).toBe(true);
    });

    it('✅ should return true for top_10 criteria when position is exactly 10', () => {
      const badge = {
        criteria: { type: 'top_10', value: 10 },
      };
      const metadata = { leaderboard_position: 10 };

      const result = BadgeService.checkBadgeCriteria(badge, 'leaderboard_update', metadata);

      expect(result).toBe(true);
    });

    it('✅ should return false for top_10 criteria when position is > 10', () => {
      const badge = {
        criteria: { type: 'top_10', value: 10 },
      };
      const metadata = { leaderboard_position: 11 };

      const result = BadgeService.checkBadgeCriteria(badge, 'leaderboard_update', metadata);

      expect(result).toBe(false);
    });

    it('✅ should return false for unknown criteria type', () => {
      const badge = {
        criteria: { type: 'unknown_type', value: 10 },
      };
      const metadata = { some_value: 15 };

      const result = BadgeService.checkBadgeCriteria(badge, 'some_action', metadata);

      expect(result).toBe(false);
    });

    it('✅ should handle edge case: exactly equal to threshold', () => {
      const badge = {
        criteria: { type: 'task_count', value: 10 },
      };
      const metadata = { completed_tasks: 10 };

      const result = BadgeService.checkBadgeCriteria(badge, 'complete_task', metadata);

      expect(result).toBe(true);
    });
  });

  describe('getAvailableBadges', () => {
    it('✅ should return all available badges', async () => {
      const mockBadges = [
        { _id: mockBadgeId, name: 'First Task', is_active: true },
        { _id: new mongoose.Types.ObjectId(), name: 'Task Master', is_active: true },
      ];

      badgeRepo.findAll.mockResolvedValue(mockBadges);

      const result = await BadgeService.getAvailableBadges(mockCenterId);

      expect(badgeRepo.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(mockBadges);
    });
  });

  describe('getRecentBadges', () => {
    it('✅ should return recent badges with default limit', async () => {
      const mockRecentBadges = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: { _id: mockUserId, username: 'user1' },
          badge_id: { _id: mockBadgeId, name: 'First Task' },
          earned_at: new Date(),
        },
      ];

      userBadgeRepo.getRecentBadges.mockResolvedValue(mockRecentBadges);

      const result = await BadgeService.getRecentBadges(mockCenterId);

      expect(userBadgeRepo.getRecentBadges).toHaveBeenCalledWith(mockCenterId, 10);
      expect(result).toEqual(mockRecentBadges);
    });

    it('✅ should return recent badges with custom limit', async () => {
      const limit = 5;
      const mockRecentBadges = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: { _id: mockUserId, username: 'user1' },
          badge_id: { _id: mockBadgeId, name: 'First Task' },
          earned_at: new Date(),
        },
      ];

      userBadgeRepo.getRecentBadges.mockResolvedValue(mockRecentBadges);

      const result = await BadgeService.getRecentBadges(mockCenterId, limit);

      expect(userBadgeRepo.getRecentBadges).toHaveBeenCalledWith(mockCenterId, limit);
      expect(result).toEqual(mockRecentBadges);
    });
  });

  describe('createBadge', () => {
    it('✅ should create a new badge', async () => {
      const badgeData = {
        name: 'New Badge',
        category: 'achievement',
        points_reward: 100,
        criteria: { type: 'task_count', value: 10 },
        is_active: true,
      };

      const mockCreatedBadge = {
        _id: mockBadgeId,
        ...badgeData,
      };

      badgeRepo.create.mockResolvedValue(mockCreatedBadge);

      const result = await BadgeService.createBadge(badgeData);

      expect(badgeRepo.create).toHaveBeenCalledWith(badgeData);
      expect(result).toEqual(mockCreatedBadge);
    });
  });

  describe('updateBadge', () => {
    it('✅ should update badge by id', async () => {
      const updateData = {
        name: 'Updated Badge',
        points_reward: 150,
      };

      const mockUpdatedBadge = {
        _id: mockBadgeId,
        name: 'Updated Badge',
        points_reward: 150,
      };

      badgeRepo.update.mockResolvedValue(mockUpdatedBadge);

      const result = await BadgeService.updateBadge(mockBadgeId, updateData);

      expect(badgeRepo.update).toHaveBeenCalledWith(mockBadgeId, updateData);
      expect(result).toEqual(mockUpdatedBadge);
    });
  });

  describe('deleteBadge', () => {
    it('✅ should delete badge by id', async () => {
      const mockDeletedBadge = {
        _id: mockBadgeId,
        deleted_at: new Date(),
      };

      badgeRepo.delete.mockResolvedValue(mockDeletedBadge);

      const result = await BadgeService.deleteBadge(mockBadgeId);

      expect(badgeRepo.delete).toHaveBeenCalledWith(mockBadgeId);
      expect(result).toEqual(mockDeletedBadge);
    });
  });

  describe('getBadgesByCategory', () => {
    it('✅ should return badges by category', async () => {
      const category = 'achievement';
      const mockBadges = [
        { _id: mockBadgeId, name: 'First Task', category: 'achievement' },
        { _id: new mongoose.Types.ObjectId(), name: 'Task Master', category: 'achievement' },
      ];

      badgeRepo.findByCategory.mockResolvedValue(mockBadges);

      const result = await BadgeService.getBadgesByCategory(category);

      expect(badgeRepo.findByCategory).toHaveBeenCalledWith(category);
      expect(result).toEqual(mockBadges);
    });

    it('✅ should return empty array when no badges in category', async () => {
      const category = 'nonexistent';

      badgeRepo.findByCategory.mockResolvedValue([]);

      const result = await BadgeService.getBadgesByCategory(category);

      expect(result).toEqual([]);
    });
  });
});

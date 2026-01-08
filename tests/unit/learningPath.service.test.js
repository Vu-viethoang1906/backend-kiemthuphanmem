// 📄 tests/unit/learningPath.service.test.js - Learning Path Service Unit Tests
const mongoose = require('mongoose');

// Mock dependencies BEFORE requiring the service
jest.mock('../../models/task.model');
jest.mock('../../models/taskTag.model');
jest.mock('../../models/tag.model');
jest.mock('../../models/skill.model');
jest.mock('../../repositories/userSkill.repository');
jest.mock('../../repositories/learningPath.repository');
jest.mock('../../repositories/skillRecommendation.repository');
jest.mock('../../services/skillExtraction.service');
jest.mock('../../services/learningPathAI.service');

// Now require the service after all mocks are set up
const LearningPathService = require('../../services/learningPath.service');
const Task = require('../../models/task.model');
const TaskTag = require('../../models/taskTag.model');
const Tag = require('../../models/tag.model');
const Skill = require('../../models/skill.model');
const userSkillRepo = require('../../repositories/userSkill.repository');
const learningPathRepo = require('../../repositories/learningPath.repository');
const skillRecommendationRepo = require('../../repositories/skillRecommendation.repository');
const skillExtractionService = require('../../services/skillExtraction.service');
const learningPathAI = require('../../services/learningPathAI.service');

describe('🔹 Learning Path Service Unit Tests', () => {
  let mockUserId;
  let mockCenterId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();
    mockCenterId = new mongoose.Types.ObjectId();
  });

  describe('generateLearningPath', () => {
    it('✅ should create new learning path successfully', async () => {
      const mockUserSkills = [{ skill_id: { name: 'JavaScript' }, proficiency_level: 3 }];
      const mockAllSkills = [
        { _id: new mongoose.Types.ObjectId(), name: 'JavaScript', is_active: true },
        { _id: new mongoose.Types.ObjectId(), name: 'React', is_active: true },
      ];
      const mockSkillGaps = { missing_skills: ['React'] };
      const mockAIPath = {
        path_name: 'Full-stack Developer Path',
        stages: [
          {
            stage_number: 1,
            title: 'Foundation',
            description: 'Learn basics',
            skills: ['JavaScript', 'React'],
            difficulty_level: 1,
            estimated_duration_days: 30,
          },
        ],
      };
      const mockCreatedPath = {
        _id: new mongoose.Types.ObjectId(),
        user_id: mockUserId,
        center_id: mockCenterId,
        path_name: 'Full-stack Developer Path',
        stages: [],
        current_stage: 1,
        status: 'active',
      };

      skillExtractionService.extractSkillsFromCompletedTasks.mockResolvedValue();
      userSkillRepo.findByUserAndCenter.mockResolvedValue(mockUserSkills);
      Skill.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAllSkills),
      });
      learningPathAI.analyzeSkillGaps.mockResolvedValue(mockSkillGaps);
      learningPathAI.generateLearningPath.mockResolvedValue(mockAIPath);
      Skill.findOne
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockAllSkills[0]),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockAllSkills[1]),
        });
      learningPathRepo.findByUserAndCenter.mockResolvedValue(null);
      learningPathRepo.create.mockResolvedValue(mockCreatedPath);

      const result = await LearningPathService.generateLearningPath(mockUserId, mockCenterId);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('path_name');
      expect(result.status).toBe('active');
    });

    it('✅ should update existing learning path', async () => {
      const mockUserSkills = [];
      const mockAllSkills = [];
      const mockAIPath = {
        path_name: 'Updated Path',
        stages: [],
      };
      const mockExistingPath = {
        _id: new mongoose.Types.ObjectId(),
      };
      const mockUpdatedPath = {
        ...mockExistingPath,
        path_name: 'Updated Path',
      };

      skillExtractionService.extractSkillsFromCompletedTasks.mockResolvedValue();
      userSkillRepo.findByUserAndCenter.mockResolvedValue(mockUserSkills);
      Skill.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAllSkills),
      });
      learningPathAI.analyzeSkillGaps.mockResolvedValue({});
      learningPathAI.generateLearningPath.mockResolvedValue(mockAIPath);
      learningPathRepo.findByUserAndCenter.mockResolvedValue(mockExistingPath);
      learningPathRepo.update.mockResolvedValue(mockUpdatedPath);

      const result = await LearningPathService.generateLearningPath(mockUserId, mockCenterId);

      expect(result).toBeDefined();
      expect(result.path_name).toBe('Updated Path');
    });

    it('✅ should handle skills not found in database', async () => {
      const mockAIPath = {
        path_name: 'Test Path',
        stages: [
          {
            stage_number: 1,
            title: 'Stage 1',
            skills: ['NonExistentSkill'],
          },
        ],
      };
      const mockCreatedPath = {
        _id: new mongoose.Types.ObjectId(),
        path_name: 'Test Path',
        stages: [],
      };

      skillExtractionService.extractSkillsFromCompletedTasks.mockResolvedValue();
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);
      Skill.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      learningPathAI.analyzeSkillGaps.mockResolvedValue({});
      learningPathAI.generateLearningPath.mockResolvedValue(mockAIPath);
      Skill.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      learningPathRepo.findByUserAndCenter.mockResolvedValue(null);
      learningPathRepo.create.mockResolvedValue(mockCreatedPath);

      const result = await LearningPathService.generateLearningPath(mockUserId, mockCenterId);

      expect(result).toBeDefined();
    });

    it('✅ should handle empty stages from AI', async () => {
      const mockAIPath = {
        path_name: 'Empty Path',
        stages: [],
      };
      const mockCreatedPath = {
        _id: new mongoose.Types.ObjectId(),
        path_name: 'Empty Path',
        stages: [],
      };

      skillExtractionService.extractSkillsFromCompletedTasks.mockResolvedValue();
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);
      Skill.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      learningPathAI.analyzeSkillGaps.mockResolvedValue({});
      learningPathAI.generateLearningPath.mockResolvedValue(mockAIPath);
      learningPathRepo.findByUserAndCenter.mockResolvedValue(null);
      learningPathRepo.create.mockResolvedValue(mockCreatedPath);

      const result = await LearningPathService.generateLearningPath(mockUserId, mockCenterId);

      expect(result.stages).toEqual([]);
    });

    it('✅ should use default values for stage properties', async () => {
      const mockAIPath = {
        path_name: 'Test Path',
        stages: [
          {
            stage_number: 1,
            title: 'Stage 1',
            description: 'Description',
            skills: [],
          },
        ],
      };

      skillExtractionService.extractSkillsFromCompletedTasks.mockResolvedValue();
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);
      Skill.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      learningPathAI.analyzeSkillGaps.mockResolvedValue({});
      learningPathAI.generateLearningPath.mockResolvedValue(mockAIPath);
      learningPathRepo.findByUserAndCenter.mockResolvedValue(null);
      learningPathRepo.create.mockResolvedValue({});

      await LearningPathService.generateLearningPath(mockUserId, mockCenterId);

      expect(learningPathRepo.create).toHaveBeenCalled();
    });
  });

  describe('getLearningPath', () => {
    it('✅ should return existing learning path with progress', async () => {
      const mockPath = {
        _id: new mongoose.Types.ObjectId(),
        path_name: 'Test Path',
      };
      const progress = 50;

      learningPathRepo.findByUserAndCenter.mockResolvedValue(mockPath);
      learningPathRepo.calculateProgress.mockResolvedValue(progress);
      learningPathRepo.update.mockResolvedValue({
        ...mockPath,
        progress_percentage: progress,
      });

      const result = await LearningPathService.getLearningPath(mockUserId, mockCenterId);

      expect(result).toBeDefined();
      expect(result.progress_percentage).toBe(progress);
    });

    it('✅ should generate learning path when not exists', async () => {
      const mockGeneratedPath = {
        _id: new mongoose.Types.ObjectId(),
        path_name: 'Generated Path',
      };

      learningPathRepo.findByUserAndCenter.mockResolvedValueOnce(null);
      skillExtractionService.extractSkillsFromCompletedTasks.mockResolvedValue();
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);
      Skill.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      learningPathAI.analyzeSkillGaps.mockResolvedValue({});
      learningPathAI.generateLearningPath.mockResolvedValue({
        path_name: 'Generated Path',
        stages: [],
      });
      learningPathRepo.findByUserAndCenter.mockResolvedValueOnce(null);
      learningPathRepo.create.mockResolvedValue(mockGeneratedPath);
      learningPathRepo.calculateProgress.mockResolvedValue(0);
      learningPathRepo.update.mockResolvedValue(mockGeneratedPath);

      const result = await LearningPathService.getLearningPath(mockUserId, mockCenterId);

      expect(result).toBeDefined();
    });

    it('✅ should handle null path after generation', async () => {
      learningPathRepo.findByUserAndCenter.mockResolvedValueOnce(null);
      skillExtractionService.extractSkillsFromCompletedTasks.mockResolvedValue();
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);
      Skill.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      learningPathAI.analyzeSkillGaps.mockResolvedValue({});
      learningPathAI.generateLearningPath.mockResolvedValue({
        path_name: 'Test Path',
        stages: [],
      });
      learningPathRepo.findByUserAndCenter.mockResolvedValueOnce(null);
      learningPathRepo.create.mockResolvedValue(null);

      const result = await LearningPathService.getLearningPath(mockUserId, mockCenterId);

      expect(result).toBeNull();
    });
  });

  describe('getRecommendations', () => {
    it('✅ should return existing recommendations when enough', async () => {
      const limit = 10;
      const mockRecommendations = Array.from({ length: 15 }, (_, i) => ({
        _id: new mongoose.Types.ObjectId(),
        recommended_skill_id: new mongoose.Types.ObjectId(),
        priority: 10 - i,
      }));

      skillRecommendationRepo.findByUserAndCenter.mockResolvedValue(mockRecommendations);

      const result = await LearningPathService.getRecommendations(mockUserId, mockCenterId, limit);

      expect(result).toHaveLength(limit);
    });

    it('✅ should create new recommendations when not enough', async () => {
      const limit = 10;
      const mockExistingRecommendations = [
        {
          _id: new mongoose.Types.ObjectId(),
          recommended_skill_id: { _id: new mongoose.Types.ObjectId() },
          priority: 8,
        },
      ];
      const mockAllSkills = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'React',
          category: 'Frontend',
          difficulty_level: 3,
          tags: [],
        },
      ];
      const mockAIRecommendations = {
        recommendations: [
          {
            skill_name: 'React',
            recommendation_type: 'next_skill',
            priority: 9,
            reason: 'Good next step',
            confidence_score: 85,
            prerequisites_met: true,
            estimated_difficulty: 3,
          },
        ],
      };

      skillRecommendationRepo.findByUserAndCenter.mockResolvedValue(mockExistingRecommendations);
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);
      // Mock Task.find for countDocuments
      Task.find.mockReturnValueOnce({
        countDocuments: jest.fn().mockResolvedValue(5),
      });
      Skill.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAllSkills),
      });
      learningPathAI.recommendNextSkills.mockResolvedValue(mockAIRecommendations);
      Skill.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAllSkills[0]),
      });
      Tag.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      // Mock Task.find for _findSuggestedTasks
      Task.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      skillRecommendationRepo.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      skillRecommendationRepo.findById.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      const result = await LearningPathService.getRecommendations(mockUserId, mockCenterId, limit);

      expect(result.length).toBeLessThanOrEqual(limit);
    });

    it('✅ should handle skill name case-insensitive matching', async () => {
      const mockAllSkills = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'React',
          difficulty_level: 3,
          tags: [],
        },
      ];
      const mockAIRecommendations = {
        recommendations: [
          {
            skill_name: 'REACT',
            priority: 9,
          },
        ],
      };

      skillRecommendationRepo.findByUserAndCenter.mockResolvedValue([]);
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);
      // Mock Task.find for countDocuments
      Task.find.mockReturnValueOnce({
        countDocuments: jest.fn().mockResolvedValue(0),
      });
      Skill.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAllSkills),
      });
      learningPathAI.recommendNextSkills.mockResolvedValue(mockAIRecommendations);
      Skill.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAllSkills[0]),
      });
      Tag.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      // Mock Task.find for _findSuggestedTasks
      Task.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      skillRecommendationRepo.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      skillRecommendationRepo.findById.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      await LearningPathService.getRecommendations(mockUserId, mockCenterId, 10);

      expect(skillRecommendationRepo.create).toHaveBeenCalled();
    });

    it('✅ should skip recommendations for skills already recommended', async () => {
      const existingSkillId = new mongoose.Types.ObjectId();
      const mockExistingRecommendations = [
        {
          _id: new mongoose.Types.ObjectId(),
          recommended_skill_id: existingSkillId,
          priority: 8,
        },
      ];
      const mockAllSkills = [
        {
          _id: existingSkillId,
          name: 'React',
          tags: [],
        },
      ];
      const mockAIRecommendations = {
        recommendations: [
          {
            skill_name: 'React',
            priority: 9,
          },
        ],
      };

      skillRecommendationRepo.findByUserAndCenter.mockResolvedValue(mockExistingRecommendations);
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);
      Task.find.mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(0),
      });
      Skill.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAllSkills),
      });
      learningPathAI.recommendNextSkills.mockResolvedValue(mockAIRecommendations);

      const result = await LearningPathService.getRecommendations(mockUserId, mockCenterId, 10);

      expect(skillRecommendationRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockExistingRecommendations);
    });

    it('✅ should sort recommendations by priority descending', async () => {
      const mockRecommendations = [
        { _id: new mongoose.Types.ObjectId(), priority: 5 },
        { _id: new mongoose.Types.ObjectId(), priority: 8 },
      ];

      skillRecommendationRepo.findByUserAndCenter.mockResolvedValue(mockRecommendations);
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);
      Task.find.mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(0),
      });
      Skill.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      learningPathAI.recommendNextSkills.mockResolvedValue({ recommendations: [] });

      const result = await LearningPathService.getRecommendations(mockUserId, mockCenterId, 10);

      const priorities = result.map(r => r.priority);
      expect(priorities).toEqual([8, 5]);
    });
  });

  describe('completeStage', () => {
    it('✅ should complete stage and move to next stage', async () => {
      const stageNumber = 1;
      const mockPath = {
        _id: new mongoose.Types.ObjectId(),
        stages: [
          { stage_number: 1, is_completed: false },
          { stage_number: 2, is_completed: false },
        ],
        current_stage: 1,
      };
      const mockUpdatedPath = {
        ...mockPath,
        current_stage: 2,
      };

      learningPathRepo.findByUserAndCenter.mockResolvedValue(mockPath);
      learningPathRepo.updateStage.mockResolvedValue(mockPath);
      learningPathRepo.update.mockResolvedValue(mockUpdatedPath);
      learningPathRepo.findById.mockResolvedValue(mockUpdatedPath);

      const result = await LearningPathService.completeStage(mockUserId, mockCenterId, stageNumber);

      expect(result).toBeDefined();
      expect(result.current_stage).toBe(2);
    });

    it('✅ should complete final stage and mark path as completed', async () => {
      const stageNumber = 2;
      const mockPath = {
        _id: new mongoose.Types.ObjectId(),
        stages: [
          { stage_number: 1, is_completed: true },
          { stage_number: 2, is_completed: false },
        ],
        current_stage: 2,
      };
      const mockCompletedPath = {
        ...mockPath,
        status: 'completed',
        progress_percentage: 100,
      };

      learningPathRepo.findByUserAndCenter.mockResolvedValue(mockPath);
      learningPathRepo.updateStage.mockResolvedValue(mockPath);
      learningPathRepo.update.mockResolvedValue(mockCompletedPath);
      learningPathRepo.findById.mockResolvedValue(mockCompletedPath);

      const result = await LearningPathService.completeStage(mockUserId, mockCenterId, stageNumber);

      expect(result.status).toBe('completed');
      expect(result.progress_percentage).toBe(100);
    });

    it('❌ should throw error when path not found', async () => {
      learningPathRepo.findByUserAndCenter.mockResolvedValue(null);

      await expect(LearningPathService.completeStage(mockUserId, mockCenterId, 1)).rejects.toThrow(
        'Learning path not found'
      );
    });
  });

  describe('updateProgress', () => {
    it('✅ should update progress successfully', async () => {
      const mockPath = {
        _id: new mongoose.Types.ObjectId(),
      };
      const progress = 75;
      const mockUpdatedPath = {
        ...mockPath,
        progress_percentage: progress,
      };

      learningPathRepo.findByUserAndCenter.mockResolvedValue(mockPath);
      learningPathRepo.calculateProgress.mockResolvedValue(progress);
      learningPathRepo.update.mockResolvedValue(mockUpdatedPath);

      const result = await LearningPathService.updateProgress(mockUserId, mockCenterId);

      expect(result).toBeDefined();
      expect(result.progress_percentage).toBe(progress);
    });

    it('✅ should return null when path not found', async () => {
      learningPathRepo.findByUserAndCenter.mockResolvedValue(null);

      const result = await LearningPathService.updateProgress(mockUserId, mockCenterId);

      expect(result).toBeNull();
    });
  });

  describe('_findSuggestedTasks', () => {
    it('✅ should find tasks by skill tags', async () => {
      const mockSkillId = new mongoose.Types.ObjectId();
      const mockSkill = {
        _id: mockSkillId,
        name: 'React',
        tags: ['react', 'frontend'],
      };
      const mockTags = [
        { _id: new mongoose.Types.ObjectId(), name: 'react' },
        { _id: new mongoose.Types.ObjectId(), name: 'frontend' },
      ];
      const mockTaskTags = [
        { task_id: new mongoose.Types.ObjectId() },
        { task_id: new mongoose.Types.ObjectId() },
      ];
      const mockTasks = [
        { _id: mockTaskTags[0].task_id, title: 'Task 1', priority: 5 },
        { _id: mockTaskTags[1].task_id, title: 'Task 2', priority: 3 },
      ];

      Skill.findById.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(mockSkill),
      });
      Tag.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTags),
      });
      TaskTag.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTaskTags),
      });
      // First Task.find call - for tasks by tags
      Task.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      // Second Task.find call - for tasks by name/category (won't be called if enough tasks from tags)
      Task.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await LearningPathService._findSuggestedTasks(mockSkill, mockCenterId, 5);

      expect(result).toEqual(mockTasks);
    });

    it('✅ should find tasks by skill name/category when tags not enough', async () => {
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'React',
        category: 'Frontend',
        tags: [],
      };
      const mockTasks = [{ _id: new mongoose.Types.ObjectId(), title: 'React Task', priority: 5 }];

      Skill.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSkill),
      });
      Tag.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });

      const result = await LearningPathService._findSuggestedTasks(mockSkill, mockCenterId, 5);

      expect(result).toEqual(mockTasks);
    });

    it('✅ should return empty array when skill not found', async () => {
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
      };

      Skill.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await LearningPathService._findSuggestedTasks(mockSkill, mockCenterId, 5);

      expect(result).toEqual([]);
    });

    it('✅ should limit results to specified limit', async () => {
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'React',
        tags: ['react'],
      };
      const mockTags = [{ _id: new mongoose.Types.ObjectId() }];
      const mockTaskTags = Array.from({ length: 10 }, () => ({
        task_id: new mongoose.Types.ObjectId(),
      }));
      const mockTasks = Array.from({ length: 10 }, (_, i) => ({
        _id: mockTaskTags[i].task_id,
        title: `Task ${i}`,
      }));

      Skill.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSkill),
      });
      Tag.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTags),
      });
      TaskTag.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTaskTags),
      });
      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });

      const result = await LearningPathService._findSuggestedTasks(mockSkill, mockCenterId, 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('✅ should handle skill passed as ObjectId string', async () => {
      const skillId = new mongoose.Types.ObjectId();
      const skillIdString = skillId.toString();
      const mockSkill = {
        _id: skillId,
        name: 'React',
        tags: [],
      };

      Skill.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSkill),
      });
      Tag.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await LearningPathService._findSuggestedTasks(skillIdString, mockCenterId, 5);

      expect(result).toEqual([]);
    });
  });
});

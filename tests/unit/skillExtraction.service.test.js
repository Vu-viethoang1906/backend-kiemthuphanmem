// 📄 tests/unit/skillExtraction.service.test.js - Skill Extraction Service Unit Tests
const mongoose = require('mongoose');

// Mock dependencies BEFORE requiring the service
jest.mock('../../models/task.model');
jest.mock('../../models/taskTag.model');
jest.mock('../../models/tag.model');
jest.mock('../../models/skill.model');
jest.mock('../../repositories/userSkill.repository');
jest.mock('../../repositories/skill.repository');
jest.mock('../../services/learningPathAI.service');

// Now require the service after mocks are set up
const SkillExtractionService = require('../../services/skillExtraction.service');
const Task = require('../../models/task.model');
const TaskTag = require('../../models/taskTag.model');
const Tag = require('../../models/tag.model');
const Skill = require('../../models/skill.model');
const userSkillRepo = require('../../repositories/userSkill.repository');
const skillRepo = require('../../repositories/skill.repository');
const learningPathAI = require('../../services/learningPathAI.service');

describe('🔹 Skill Extraction Service Unit Tests', () => {
  let mockUserId;
  let mockCenterId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();
    mockCenterId = new mongoose.Types.ObjectId();
  });

  describe('extractSkillsFromCompletedTasks', () => {
    it('✅ should return empty result when no completed tasks', async () => {
      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await SkillExtractionService.extractSkillsFromCompletedTasks(
        mockUserId,
        mockCenterId
      );

      expect(result).toEqual({ extracted: 0, skills: [] });
      expect(learningPathAI.extractSkillsFromTasks).not.toHaveBeenCalled();
    });

    it('✅ should extract skills from completed tasks successfully', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Build React Component',
          description: 'Create a button component',
          done_at: new Date(),
        },
      ];
      const mockTaskTag = {
        task_id: mockTasks[0]._id,
        tag_id: new mongoose.Types.ObjectId(),
      };
      const mockTag = {
        _id: mockTaskTag.tag_id,
        name: 'react',
      };
      const mockAIResult = {
        skills: [
          {
            name: 'React',
            category: 'Frontend',
            proficiency_level: 60,
            confidence: 80,
            evidence: ['Build React Component'],
          },
        ],
        overall_confidence: 75,
      };
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'React',
        category: 'react',
        tags: ['react'],
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTaskTag),
      });
      Tag.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTag),
      });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);
      skillRepo.findByName.mockResolvedValue(null);
      skillRepo.create.mockResolvedValue(mockSkill);
      skillRepo.findById.mockResolvedValue(mockSkill);
      userSkillRepo.updateProficiency.mockResolvedValue({});
      userSkillRepo.addEvidenceTask.mockResolvedValue({});

      const result = await SkillExtractionService.extractSkillsFromCompletedTasks(
        mockUserId,
        mockCenterId
      );

      expect(result).toBeDefined();
      expect(result.extracted).toBe(1);
      expect(result.skills).toHaveLength(1);
      expect(result.confidence).toBe(75);
    });

    it('✅ should handle tasks without tags', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Build Component',
          description: 'Create component',
          done_at: new Date(),
        },
      ];
      const mockAIResult = {
        skills: [
          {
            name: 'JavaScript',
            proficiency_level: 50,
            confidence: 70,
            evidence: ['Build Component'],
          },
        ],
        overall_confidence: 70,
      };
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'JavaScript',
        tags: [],
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);
      skillRepo.findByName.mockResolvedValue(null);
      skillRepo.create.mockResolvedValue(mockSkill);
      skillRepo.findById.mockResolvedValue(mockSkill);
      userSkillRepo.updateProficiency.mockResolvedValue({});
      userSkillRepo.addEvidenceTask.mockResolvedValue({});

      const result = await SkillExtractionService.extractSkillsFromCompletedTasks(
        mockUserId,
        mockCenterId
      );

      expect(result.extracted).toBe(1);
    });

    it('✅ should use existing skill when found', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'React Task',
          description: 'Task description',
          done_at: new Date(),
        },
      ];
      const mockAIResult = {
        skills: [
          {
            name: 'React',
            proficiency_level: 60,
            evidence: ['React Task'],
          },
        ],
        overall_confidence: 75,
      };
      const mockExistingSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'React',
        category: 'Frontend',
        tags: ['react'],
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);
      skillRepo.findByName.mockResolvedValue(mockExistingSkill);
      skillRepo.findById.mockResolvedValue(mockExistingSkill);
      userSkillRepo.updateProficiency.mockResolvedValue({});
      userSkillRepo.addEvidenceTask.mockResolvedValue({});

      const result = await SkillExtractionService.extractSkillsFromCompletedTasks(
        mockUserId,
        mockCenterId
      );

      expect(skillRepo.create).not.toHaveBeenCalled();
      expect(result.extracted).toBe(1);
    });

    it('✅ should update skill tags when new tags found', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'React Task',
          done_at: new Date(),
        },
      ];
      const mockTaskTag = {
        task_id: mockTasks[0]._id,
        tag_id: new mongoose.Types.ObjectId(),
      };
      const mockTag = {
        _id: mockTaskTag.tag_id,
        name: 'frontend',
      };
      const mockAIResult = {
        skills: [
          {
            name: 'React',
            proficiency_level: 60,
            evidence: ['React Task'],
          },
        ],
        overall_confidence: 75,
      };
      const mockExistingSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'React',
        tags: ['react'],
      };
      const mockUpdatedSkill = {
        ...mockExistingSkill,
        tags: ['react', 'frontend'],
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTaskTag),
      });
      Tag.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTag),
      });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);
      skillRepo.findByName.mockResolvedValue(mockExistingSkill);
      skillRepo.update.mockResolvedValue(mockUpdatedSkill);
      skillRepo.findById.mockResolvedValue(mockUpdatedSkill);
      userSkillRepo.updateProficiency.mockResolvedValue({});
      userSkillRepo.addEvidenceTask.mockResolvedValue({});

      await SkillExtractionService.extractSkillsFromCompletedTasks(mockUserId, mockCenterId);

      expect(skillRepo.update).toHaveBeenCalled();
    });

    it('✅ should find related tasks by evidence', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Build React Component',
          done_at: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Create React App',
          done_at: new Date(),
        },
      ];
      const mockAIResult = {
        skills: [
          {
            name: 'React',
            proficiency_level: 60,
            evidence: ['Build React Component', 'Create React App'],
          },
        ],
        overall_confidence: 75,
      };
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'React',
        tags: [],
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);
      skillRepo.findByName.mockResolvedValue(null);
      skillRepo.create.mockResolvedValue(mockSkill);
      skillRepo.findById.mockResolvedValue(mockSkill);
      userSkillRepo.updateProficiency.mockResolvedValue({});
      userSkillRepo.addEvidenceTask.mockResolvedValue({});

      await SkillExtractionService.extractSkillsFromCompletedTasks(mockUserId, mockCenterId);

      expect(userSkillRepo.addEvidenceTask).toHaveBeenCalledTimes(2);
    });

    it('✅ should use most common tag as category', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'React Task 1',
          done_at: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'React Task 2',
          done_at: new Date(),
        },
      ];
      const mockTaskTags = [
        { task_id: mockTasks[0]._id, tag_id: new mongoose.Types.ObjectId() },
        { task_id: mockTasks[1]._id, tag_id: new mongoose.Types.ObjectId() },
      ];
      const mockTags = [
        { _id: mockTaskTags[0].tag_id, name: 'react' },
        { _id: mockTaskTags[1].tag_id, name: 'react' },
      ];
      const mockAIResult = {
        skills: [
          {
            name: 'React',
            proficiency_level: 60,
            evidence: ['React Task 1', 'React Task 2'],
          },
        ],
        overall_confidence: 75,
      };
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'React',
        category: 'react',
        tags: ['react'],
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockTaskTags[0]),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockTaskTags[1]),
        });
      Tag.findById
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockTags[0]),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockTags[1]),
        });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);
      skillRepo.findByName.mockResolvedValue(null);
      skillRepo.create.mockResolvedValue(mockSkill);
      skillRepo.findById.mockResolvedValue(mockSkill);
      userSkillRepo.updateProficiency.mockResolvedValue({});
      userSkillRepo.addEvidenceTask.mockResolvedValue({});

      await SkillExtractionService.extractSkillsFromCompletedTasks(mockUserId, mockCenterId);

      const createCall = skillRepo.create.mock.calls[0][0];
      expect(createCall.category).toBe('react');
    });

    it('✅ should use evidence as tags when no tags found', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'JavaScript Task',
          done_at: new Date(),
        },
      ];
      const mockAIResult = {
        skills: [
          {
            name: 'JavaScript',
            proficiency_level: 50,
            evidence: ['JavaScript Task'],
          },
        ],
        overall_confidence: 70,
      };
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'JavaScript',
        tags: ['JavaScript Task'],
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);
      skillRepo.findByName.mockResolvedValue(null);
      skillRepo.create.mockResolvedValue(mockSkill);
      skillRepo.findById.mockResolvedValue(mockSkill);
      userSkillRepo.updateProficiency.mockResolvedValue({});
      userSkillRepo.addEvidenceTask.mockResolvedValue({});

      await SkillExtractionService.extractSkillsFromCompletedTasks(mockUserId, mockCenterId);

      const createCall = skillRepo.create.mock.calls[0][0];
      expect(createCall.tags).toContain('JavaScript Task');
    });

    it('✅ should handle skills with no evidence', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Task',
          done_at: new Date(),
        },
      ];
      const mockAIResult = {
        skills: [
          {
            name: 'JavaScript',
            proficiency_level: 50,
            evidence: [],
          },
        ],
        overall_confidence: 70,
      };
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'JavaScript',
        tags: [],
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);
      skillRepo.findByName.mockResolvedValue(null);
      skillRepo.create.mockResolvedValue(mockSkill);
      skillRepo.findById.mockResolvedValue(mockSkill);
      userSkillRepo.updateProficiency.mockResolvedValue({});

      await SkillExtractionService.extractSkillsFromCompletedTasks(mockUserId, mockCenterId);

      expect(userSkillRepo.addEvidenceTask).not.toHaveBeenCalled();
    });

    it('✅ should handle empty skills array from AI', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Task',
          done_at: new Date(),
        },
      ];
      const mockAIResult = {
        skills: [],
        overall_confidence: 0,
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);

      const result = await SkillExtractionService.extractSkillsFromCompletedTasks(
        mockUserId,
        mockCenterId
      );

      expect(result.extracted).toBe(0);
      expect(result.skills).toEqual([]);
    });

    it('✅ should estimate difficulty from proficiency level', async () => {
      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Task',
          done_at: new Date(),
        },
      ];
      const mockAIResult = {
        skills: [
          {
            name: 'Advanced Skill',
            proficiency_level: 85,
            evidence: ['Task'],
          },
        ],
        overall_confidence: 80,
      };
      const mockSkill = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Advanced Skill',
        difficulty_level: 5,
      };

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      });
      TaskTag.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      learningPathAI.extractSkillsFromTasks.mockResolvedValue(mockAIResult);
      skillRepo.findByName.mockResolvedValue(null);
      skillRepo.create.mockResolvedValue(mockSkill);
      skillRepo.findById.mockResolvedValue(mockSkill);
      userSkillRepo.updateProficiency.mockResolvedValue({});
      userSkillRepo.addEvidenceTask.mockResolvedValue({});

      await SkillExtractionService.extractSkillsFromCompletedTasks(mockUserId, mockCenterId);

      const createCall = skillRepo.create.mock.calls[0][0];
      expect(createCall.difficulty_level).toBe(5);
    });
  });

  describe('_estimateDifficulty', () => {
    it('✅ should return 5 for proficiency >= 80', () => {
      expect(SkillExtractionService._estimateDifficulty(80)).toBe(5);
      expect(SkillExtractionService._estimateDifficulty(90)).toBe(5);
      expect(SkillExtractionService._estimateDifficulty(100)).toBe(5);
    });

    it('✅ should return 4 for proficiency >= 60 and < 80', () => {
      expect(SkillExtractionService._estimateDifficulty(60)).toBe(4);
      expect(SkillExtractionService._estimateDifficulty(70)).toBe(4);
      expect(SkillExtractionService._estimateDifficulty(79)).toBe(4);
    });

    it('✅ should return 3 for proficiency >= 40 and < 60', () => {
      expect(SkillExtractionService._estimateDifficulty(40)).toBe(3);
      expect(SkillExtractionService._estimateDifficulty(50)).toBe(3);
      expect(SkillExtractionService._estimateDifficulty(59)).toBe(3);
    });

    it('✅ should return 2 for proficiency >= 20 and < 40', () => {
      expect(SkillExtractionService._estimateDifficulty(20)).toBe(2);
      expect(SkillExtractionService._estimateDifficulty(30)).toBe(2);
      expect(SkillExtractionService._estimateDifficulty(39)).toBe(2);
    });

    it('✅ should return 1 for proficiency < 20', () => {
      expect(SkillExtractionService._estimateDifficulty(0)).toBe(1);
      expect(SkillExtractionService._estimateDifficulty(10)).toBe(1);
      expect(SkillExtractionService._estimateDifficulty(19)).toBe(1);
    });
  });
});

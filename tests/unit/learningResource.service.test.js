// 📄 tests/unit/learningResource.service.test.js - Learning Resource Service Unit Tests
const mongoose = require('mongoose');

// Mock repository BEFORE requiring the service
jest.mock('../../repositories/learningResource.repository');

// Now require the service after mocks are set up
const LearningResourceService = require('../../services/learningResource.service');
const learningResourceRepo = require('../../repositories/learningResource.repository');

describe('🔹 Learning Resource Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createResource', () => {
    it('✅ should create resource successfully', async () => {
      const mockData = {
        title: 'React Tutorial',
        description: 'Learn React basics',
        url: 'https://example.com/react',
        resource_type: 'tutorial',
      };
      const mockCreatedResource = {
        _id: new mongoose.Types.ObjectId(),
        ...mockData,
        created_at: new Date(),
      };

      learningResourceRepo.create.mockResolvedValue(mockCreatedResource);

      const result = await LearningResourceService.createResource(mockData);

      expect(learningResourceRepo.create).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockCreatedResource);
    });

    it('✅ should handle resource with all fields', async () => {
      const mockData = {
        title: 'Advanced JavaScript',
        description: 'Deep dive into JS',
        url: 'https://example.com/js',
        resource_type: 'article',
        skills: [new mongoose.Types.ObjectId()],
        difficulty_level: 3,
        duration_minutes: 60,
        author: 'John Doe',
        source: 'MDN',
        tags: ['javascript', 'advanced'],
      };

      learningResourceRepo.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        ...mockData,
      });

      const result = await LearningResourceService.createResource(mockData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Advanced JavaScript');
    });
  });

  describe('getResourceById', () => {
    it('✅ should get resource by id successfully', async () => {
      const resourceId = new mongoose.Types.ObjectId();
      const mockResource = {
        _id: resourceId,
        title: 'Test Resource',
        url: 'https://example.com',
        resource_type: 'tutorial',
      };

      learningResourceRepo.findById.mockResolvedValue(mockResource);

      const result = await LearningResourceService.getResourceById(resourceId.toString());

      expect(learningResourceRepo.findById).toHaveBeenCalledWith(resourceId.toString());
      expect(result).toEqual(mockResource);
    });

    it('✅ should return null when resource not found', async () => {
      learningResourceRepo.findById.mockResolvedValue(null);

      const result = await LearningResourceService.getResourceById(
        new mongoose.Types.ObjectId().toString()
      );

      expect(result).toBeNull();
    });
  });

  describe('getAllResources', () => {
    it('✅ should get all resources with default filters', async () => {
      const mockResources = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Resource 1',
          resource_type: 'tutorial',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Resource 2',
          resource_type: 'video',
        },
      ];

      learningResourceRepo.find.mockResolvedValue(mockResources);

      const result = await LearningResourceService.getAllResources();

      expect(learningResourceRepo.find).toHaveBeenCalledWith({}, {});
      expect(result).toEqual(mockResources);
    });

    it('✅ should get resources with filters', async () => {
      const filters = { resource_type: 'tutorial', is_active: true };
      const mockResources = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Tutorial 1',
          resource_type: 'tutorial',
        },
      ];

      learningResourceRepo.find.mockResolvedValue(mockResources);

      const result = await LearningResourceService.getAllResources(filters);

      expect(learningResourceRepo.find).toHaveBeenCalledWith(filters, {});
      expect(result).toEqual(mockResources);
    });

    it('✅ should get resources with options', async () => {
      const options = { limit: 10, skip: 0, sort: { created_at: -1 } };
      const mockResources = [];

      learningResourceRepo.find.mockResolvedValue(mockResources);

      const result = await LearningResourceService.getAllResources({}, options);

      expect(learningResourceRepo.find).toHaveBeenCalledWith({}, options);
      expect(result).toEqual(mockResources);
    });
  });

  describe('updateResource', () => {
    it('✅ should update resource successfully', async () => {
      const resourceId = new mongoose.Types.ObjectId();
      const mockExistingResource = {
        _id: resourceId,
        title: 'Old Title',
      };
      const updateData = { title: 'New Title' };
      const mockUpdatedResource = {
        ...mockExistingResource,
        ...updateData,
      };

      learningResourceRepo.findById.mockResolvedValue(mockExistingResource);
      learningResourceRepo.update.mockResolvedValue(mockUpdatedResource);

      const result = await LearningResourceService.updateResource(
        resourceId.toString(),
        updateData,
        new mongoose.Types.ObjectId().toString()
      );

      expect(learningResourceRepo.findById).toHaveBeenCalledWith(resourceId.toString());
      expect(learningResourceRepo.update).toHaveBeenCalledWith(resourceId.toString(), updateData);
      expect(result).toEqual(mockUpdatedResource);
    });

    it('❌ should throw error when resource not found', async () => {
      learningResourceRepo.findById.mockResolvedValue(null);

      await expect(
        LearningResourceService.updateResource(
          new mongoose.Types.ObjectId().toString(),
          { title: 'New Title' },
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Learning resource not found');

      expect(learningResourceRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteResource', () => {
    it('✅ should delete resource successfully', async () => {
      const resourceId = new mongoose.Types.ObjectId();
      const mockDeletedResource = {
        _id: resourceId,
        deleted_at: new Date(),
      };

      learningResourceRepo.delete.mockResolvedValue(mockDeletedResource);

      const result = await LearningResourceService.deleteResource(resourceId.toString());

      expect(learningResourceRepo.delete).toHaveBeenCalledWith(resourceId.toString());
      expect(result).toEqual(mockDeletedResource);
    });
  });

  describe('searchResources', () => {
    it('✅ should search resources by keywords successfully', async () => {
      const keywords = ['react', 'tutorial'];
      const limit = 10;
      const mockResources = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'React Tutorial',
          resource_type: 'tutorial',
        },
      ];

      learningResourceRepo.searchByKeywords.mockResolvedValue(mockResources);

      const result = await LearningResourceService.searchResources(keywords, limit);

      expect(learningResourceRepo.searchByKeywords).toHaveBeenCalledWith(keywords, limit);
      expect(result).toEqual(mockResources);
    });

    it('✅ should use default limit when not provided', async () => {
      const keywords = ['javascript'];

      learningResourceRepo.searchByKeywords.mockResolvedValue([]);

      await LearningResourceService.searchResources(keywords);

      expect(learningResourceRepo.searchByKeywords).toHaveBeenCalledWith(keywords, 10);
    });
  });

  describe('getResourcesBySkills', () => {
    it('✅ should get resources by skills successfully', async () => {
      const skillIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
      ];
      const limit = 10;
      const mockResources = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Resource 1',
          skills: [skillIds[0]],
        },
      ];

      learningResourceRepo.findBySkills.mockResolvedValue(mockResources);

      const result = await LearningResourceService.getResourcesBySkills(skillIds, limit);

      expect(learningResourceRepo.findBySkills).toHaveBeenCalledWith(skillIds, limit);
      expect(result).toEqual(mockResources);
    });

    it('✅ should return empty array when skillIds is not an array', async () => {
      const result = await LearningResourceService.getResourcesBySkills(null, 10);

      expect(result).toEqual([]);
      expect(learningResourceRepo.findBySkills).not.toHaveBeenCalled();
    });

    it('✅ should return empty array when skillIds is empty', async () => {
      const result = await LearningResourceService.getResourcesBySkills([], 10);

      expect(result).toEqual([]);
      expect(learningResourceRepo.findBySkills).not.toHaveBeenCalled();
    });

    it('✅ should filter out invalid ObjectIds', async () => {
      const skillIds = [
        new mongoose.Types.ObjectId().toString(),
        'invalid-id',
        new mongoose.Types.ObjectId().toString(),
      ];
      const validIds = skillIds.filter(id => mongoose.Types.ObjectId.isValid(id));

      learningResourceRepo.findBySkills.mockResolvedValue([]);

      await LearningResourceService.getResourcesBySkills(skillIds, 10);

      expect(learningResourceRepo.findBySkills).toHaveBeenCalledWith(validIds, 10);
    });

    it('✅ should return empty array when all IDs are invalid', async () => {
      const skillIds = ['invalid-id-1', 'invalid-id-2'];

      const result = await LearningResourceService.getResourcesBySkills(skillIds, 10);

      expect(result).toEqual([]);
      expect(learningResourceRepo.findBySkills).not.toHaveBeenCalled();
    });

    it('✅ should use default limit when not provided', async () => {
      const skillIds = [new mongoose.Types.ObjectId().toString()];

      learningResourceRepo.findBySkills.mockResolvedValue([]);

      await LearningResourceService.getResourcesBySkills(skillIds);

      expect(learningResourceRepo.findBySkills).toHaveBeenCalledWith(skillIds, 10);
    });
  });

  describe('getResourcesByType', () => {
    it('✅ should get resources by type successfully', async () => {
      const resourceType = 'tutorial';
      const limit = 10;
      const mockResources = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Tutorial 1',
          resource_type: 'tutorial',
        },
      ];

      learningResourceRepo.findByResourceType.mockResolvedValue(mockResources);

      const result = await LearningResourceService.getResourcesByType(resourceType, limit);

      expect(learningResourceRepo.findByResourceType).toHaveBeenCalledWith(resourceType, limit);
      expect(result).toEqual(mockResources);
    });

    it('✅ should use default limit when not provided', async () => {
      const resourceType = 'video';

      learningResourceRepo.findByResourceType.mockResolvedValue([]);

      await LearningResourceService.getResourcesByType(resourceType);

      expect(learningResourceRepo.findByResourceType).toHaveBeenCalledWith(resourceType, 10);
    });
  });

  describe('recommendResourcesForTask', () => {
    it('✅ should recommend resources for task successfully', async () => {
      const mockTask = {
        title: 'Build React Component',
        description: 'Create a reusable button component',
        tags: ['react', 'frontend'],
      };
      const limit = 5;

      const mockKeywordResults = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'React Tutorial',
          resource_type: 'tutorial',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'React Video',
          resource_type: 'video',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'React Code Example',
          resource_type: 'code_example',
        },
      ];

      learningResourceRepo.searchByKeywords.mockResolvedValue(mockKeywordResults);

      const result = await LearningResourceService.recommendResourcesForTask(mockTask, limit);

      expect(result).toHaveProperty('tutorials');
      expect(result).toHaveProperty('videos');
      expect(result).toHaveProperty('codeExamples');
      expect(result.tutorials.length).toBeGreaterThan(0);
      expect(result.videos.length).toBeGreaterThan(0);
      expect(result.codeExamples.length).toBeGreaterThan(0);
    });

    it('✅ should extract keywords from task title and description', async () => {
      const mockTask = {
        title: 'Learn JavaScript',
        description: 'Master the basics',
        tags: [],
      };

      learningResourceRepo.searchByKeywords.mockResolvedValue([]);
      learningResourceRepo.findByResourceType.mockResolvedValue([]);

      await LearningResourceService.recommendResourcesForTask(mockTask, 5);

      const keywords = learningResourceRepo.searchByKeywords.mock.calls[0][0];
      expect(keywords).toContain('Learn');
      expect(keywords).toContain('JavaScript');
      expect(keywords).toContain('Master');
      expect(keywords).toContain('the');
      expect(keywords).toContain('basics');
    });

    it('✅ should extract keywords from tags as strings', async () => {
      const mockTask = {
        title: 'Test Task',
        description: 'Test',
        tags: ['react', 'javascript', 'frontend'],
      };

      learningResourceRepo.searchByKeywords.mockResolvedValue([]);
      learningResourceRepo.findByResourceType.mockResolvedValue([]);

      await LearningResourceService.recommendResourcesForTask(mockTask, 5);

      const keywords = learningResourceRepo.searchByKeywords.mock.calls[0][0];
      expect(keywords).toContain('react');
      expect(keywords).toContain('javascript');
      expect(keywords).toContain('frontend');
    });

    it('✅ should extract keywords from tags as objects', async () => {
      const mockTask = {
        title: 'Test Task',
        description: 'Test',
        tags: [
          { name: 'react', _id: new mongoose.Types.ObjectId() },
          { name: 'javascript', _id: new mongoose.Types.ObjectId() },
        ],
      };

      learningResourceRepo.searchByKeywords.mockResolvedValue([]);
      learningResourceRepo.findByResourceType.mockResolvedValue([]);

      await LearningResourceService.recommendResourcesForTask(mockTask, 5);

      const keywords = learningResourceRepo.searchByKeywords.mock.calls[0][0];
      expect(keywords).toContain('react');
      expect(keywords).toContain('javascript');
    });

    it('✅ should categorize resources by type', async () => {
      const mockTask = { title: 'Test', description: 'Test' };
      const mockKeywordResults = [
        { _id: new mongoose.Types.ObjectId(), resource_type: 'tutorial' },
        { _id: new mongoose.Types.ObjectId(), resource_type: 'article' },
        { _id: new mongoose.Types.ObjectId(), resource_type: 'docs' },
        { _id: new mongoose.Types.ObjectId(), resource_type: 'blog' },
        { _id: new mongoose.Types.ObjectId(), resource_type: 'video' },
        { _id: new mongoose.Types.ObjectId(), resource_type: 'course' },
        { _id: new mongoose.Types.ObjectId(), resource_type: 'code_example' },
      ];

      learningResourceRepo.searchByKeywords.mockResolvedValue(mockKeywordResults);
      learningResourceRepo.findByResourceType.mockResolvedValue([]);

      const result = await LearningResourceService.recommendResourcesForTask(mockTask, 10);

      expect(result.tutorials.length).toBeGreaterThan(0);
      expect(result.videos.length).toBeGreaterThan(0);
      expect(result.codeExamples.length).toBeGreaterThan(0);
    });

    it('✅ should fill missing resources from resource type search', async () => {
      const mockTask = { title: 'Test', description: 'Test' };
      const limit = 5;

      learningResourceRepo.searchByKeywords.mockResolvedValue([]);
      learningResourceRepo.findByResourceType
        .mockResolvedValueOnce([{ _id: new mongoose.Types.ObjectId(), resource_type: 'tutorial' }])
        .mockResolvedValueOnce([{ _id: new mongoose.Types.ObjectId(), resource_type: 'video' }])
        .mockResolvedValueOnce([
          { _id: new mongoose.Types.ObjectId(), resource_type: 'code_example' },
        ]);

      const result = await LearningResourceService.recommendResourcesForTask(mockTask, limit);

      expect(result.tutorials.length).toBeGreaterThan(0);
      expect(result.videos.length).toBeGreaterThan(0);
      expect(result.codeExamples.length).toBeGreaterThan(0);
    });

    it('✅ should avoid duplicate resources', async () => {
      const mockTask = { title: 'Test', description: 'Test' };
      const duplicateId = new mongoose.Types.ObjectId();
      const mockKeywordResults = [{ _id: duplicateId, resource_type: 'tutorial' }];
      const mockTutorials = [
        { _id: duplicateId, resource_type: 'tutorial' },
        { _id: new mongoose.Types.ObjectId(), resource_type: 'tutorial' },
      ];

      learningResourceRepo.searchByKeywords.mockResolvedValue(mockKeywordResults);
      learningResourceRepo.findByResourceType
        .mockResolvedValueOnce(mockTutorials)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await LearningResourceService.recommendResourcesForTask(mockTask, 5);

      // Should not have duplicate
      const tutorialIds = result.tutorials.map(t => t._id.toString());
      const uniqueIds = [...new Set(tutorialIds)];
      expect(tutorialIds.length).toBe(uniqueIds.length);
    });

    it('✅ should handle task without title', async () => {
      const mockTask = {
        description: 'Test description',
        tags: ['test'],
      };

      learningResourceRepo.searchByKeywords.mockResolvedValue([]);
      learningResourceRepo.findByResourceType.mockResolvedValue([]);

      await LearningResourceService.recommendResourcesForTask(mockTask, 5);

      expect(learningResourceRepo.searchByKeywords).toHaveBeenCalled();
    });

    it('✅ should handle task without description', async () => {
      const mockTask = {
        title: 'Test title',
        tags: ['test'],
      };

      learningResourceRepo.searchByKeywords.mockResolvedValue([]);
      learningResourceRepo.findByResourceType.mockResolvedValue([]);

      await LearningResourceService.recommendResourcesForTask(mockTask, 5);

      expect(learningResourceRepo.searchByKeywords).toHaveBeenCalled();
    });

    it('✅ should handle task without tags', async () => {
      const mockTask = {
        title: 'Test title',
        description: 'Test description',
      };

      learningResourceRepo.searchByKeywords.mockResolvedValue([]);
      learningResourceRepo.findByResourceType.mockResolvedValue([]);

      await LearningResourceService.recommendResourcesForTask(mockTask, 5);

      expect(learningResourceRepo.searchByKeywords).toHaveBeenCalled();
    });

    it('✅ should use default limit when not provided', async () => {
      const mockTask = { title: 'Test' };

      learningResourceRepo.searchByKeywords.mockResolvedValue([]);
      learningResourceRepo.findByResourceType.mockResolvedValue([]);

      await LearningResourceService.recommendResourcesForTask(mockTask);

      expect(learningResourceRepo.searchByKeywords).toHaveBeenCalledWith(expect.any(Array), 20); // limit * 2
    });
  });

  describe('trackView', () => {
    it('✅ should increment view count successfully', async () => {
      const resourceId = new mongoose.Types.ObjectId();
      const mockUpdatedResource = {
        _id: resourceId,
        view_count: 1,
      };

      learningResourceRepo.incrementViewCount.mockResolvedValue(mockUpdatedResource);

      const result = await LearningResourceService.trackView(resourceId.toString());

      expect(learningResourceRepo.incrementViewCount).toHaveBeenCalledWith(resourceId.toString());
      expect(result).toEqual(mockUpdatedResource);
    });

    it('✅ should handle null when resource not found', async () => {
      learningResourceRepo.incrementViewCount.mockResolvedValue(null);

      const result = await LearningResourceService.trackView(
        new mongoose.Types.ObjectId().toString()
      );

      expect(result).toBeNull();
    });
  });
});

// 📄 tests/unit/learningResource.controller.test.js - Learning Resource Controller Unit Tests

// Mock auth middleware
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    if (!req.user) {
      req.user = {
        id: '507f1f77bcf86cd799439011',
        _id: '507f1f77bcf86cd799439011',
        roles: ['admin', 'System_Manager'],
        email: 'test@example.com',
        username: 'testuser',
      };
    }
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
}));

// Mock services
jest.mock('../../services/learningResource.service', () => ({
  createResource: jest.fn(),
  getResourceById: jest.fn(),
  getAllResources: jest.fn(),
  updateResource: jest.fn(),
  deleteResource: jest.fn(),
  searchResources: jest.fn(),
  recommendResourcesForTask: jest.fn(),
  trackView: jest.fn(),
}));

// Mock mongoose
jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(),
    },
  },
}));

// Mock models
jest.mock('../../models/task.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../../models/taskTag.model', () => ({
  find: jest.fn(),
}));

jest.mock('../../models/tag.model', () => ({}));

const learningResourceController = require('../../controllers/learningResource.controller');
const learningResourceService = require('../../services/learningResource.service');
const mongoose = require('mongoose');
const Task = require('../../models/task.model');
const TaskTag = require('../../models/taskTag.model');

describe('🔹 Learning Resource Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const VALID_RESOURCE_ID = '507f1f77bcf86cd799439012';
  const VALID_TASK_ID = '507f1f77bcf86cd799439013';
  const VALID_SKILL_ID = '507f1f77bcf86cd799439014';
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock request
    mockReq = {
      user: {
        id: VALID_USER_ID,
        _id: VALID_USER_ID,
        roles: ['admin'],
        email: 'test@example.com',
        username: 'testuser',
      },
      query: {},
      params: {},
      body: {},
    };

    // Setup default mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Setup default mongoose mock
    mongoose.Types.ObjectId.isValid.mockReturnValue(true);
  });

  describe('create', () => {
    const mockResourceData = {
      title: 'JavaScript Basics',
      description: 'Learn JavaScript fundamentals',
      resource_type: 'tutorial',
      url: 'https://example.com/js-basics',
      skills: [VALID_SKILL_ID],
    };

    const mockCreatedResource = {
      _id: VALID_RESOURCE_ID,
      ...mockResourceData,
      created_by: VALID_USER_ID,
      created_at: new Date(),
    };

    it('✅ should create learning resource successfully', async () => {
      learningResourceService.createResource.mockResolvedValue(mockCreatedResource);

      mockReq.body = mockResourceData;

      await learningResourceController.create(mockReq, mockRes);

      expect(learningResourceService.createResource).toHaveBeenCalledWith({
        ...mockResourceData,
        created_by: VALID_USER_ID,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockCreatedResource,
      });
    });

    it('✅ should handle when user is not provided', async () => {
      learningResourceService.createResource.mockResolvedValue(mockCreatedResource);

      mockReq.user = null;
      mockReq.body = mockResourceData;

      await learningResourceController.create(mockReq, mockRes);

      expect(learningResourceService.createResource).toHaveBeenCalledWith({
        ...mockResourceData,
        created_by: null,
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Validation failed');
      learningResourceService.createResource.mockRejectedValue(error);

      mockReq.body = mockResourceData;

      await learningResourceController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
      });
    });
  });

  describe('getById', () => {
    const mockResource = {
      _id: VALID_RESOURCE_ID,
      title: 'JavaScript Basics',
      description: 'Learn JavaScript fundamentals',
      resource_type: 'tutorial',
      url: 'https://example.com/js-basics',
      view_count: 10,
    };

    it('✅ should return learning resource by id successfully', async () => {
      learningResourceService.getResourceById.mockResolvedValue(mockResource);
      learningResourceService.trackView.mockResolvedValue(undefined);

      mockReq.params = { id: VALID_RESOURCE_ID };

      await learningResourceController.getById(mockReq, mockRes);

      expect(learningResourceService.getResourceById).toHaveBeenCalledWith(VALID_RESOURCE_ID);
      expect(learningResourceService.trackView).toHaveBeenCalledWith(VALID_RESOURCE_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockResource,
      });
    });

    it('❌ should return 404 when resource not found', async () => {
      learningResourceService.getResourceById.mockResolvedValue(null);

      mockReq.params = { id: VALID_RESOURCE_ID };

      await learningResourceController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Learning resource not found',
      });
      expect(learningResourceService.trackView).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      learningResourceService.getResourceById.mockRejectedValue(error);

      mockReq.params = { id: VALID_RESOURCE_ID };

      await learningResourceController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database error',
      });
    });
  });

  describe('getAll', () => {
    const mockResources = [
      {
        _id: 'resource1',
        title: 'Resource 1',
        resource_type: 'tutorial',
        view_count: 100,
        is_featured: true,
      },
      {
        _id: 'resource2',
        title: 'Resource 2',
        resource_type: 'video',
        view_count: 50,
        is_featured: false,
      },
    ];

    it('✅ should return all resources with default pagination', async () => {
      learningResourceService.getAllResources.mockResolvedValue(mockResources);

      mockReq.query = {};

      await learningResourceController.getAll(mockReq, mockRes);

      expect(learningResourceService.getAllResources).toHaveBeenCalledWith(
        {},
        {
          limit: 20,
          skip: 0,
          sort: { is_featured: -1, view_count: -1, created_at: -1 },
        }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockResources,
        count: 2,
      });
    });

    it('✅ should filter by resource_type', async () => {
      learningResourceService.getAllResources.mockResolvedValue([mockResources[0]]);

      mockReq.query = { resource_type: 'tutorial' };

      await learningResourceController.getAll(mockReq, mockRes);

      expect(learningResourceService.getAllResources).toHaveBeenCalledWith(
        { resource_type: 'tutorial' },
        expect.any(Object)
      );
    });

    it('✅ should filter by skill_id when valid ObjectId', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      learningResourceService.getAllResources.mockResolvedValue(mockResources);

      mockReq.query = { skill_id: VALID_SKILL_ID };

      await learningResourceController.getAll(mockReq, mockRes);

      expect(learningResourceService.getAllResources).toHaveBeenCalledWith(
        { skills: VALID_SKILL_ID },
        expect.any(Object)
      );
    });

    it('✅ should not filter by skill_id when invalid ObjectId', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      learningResourceService.getAllResources.mockResolvedValue(mockResources);

      mockReq.query = { skill_id: 'invalid-id' };

      await learningResourceController.getAll(mockReq, mockRes);

      expect(learningResourceService.getAllResources).toHaveBeenCalledWith({}, expect.any(Object));
    });

    it('✅ should use custom limit and skip', async () => {
      learningResourceService.getAllResources.mockResolvedValue(mockResources);

      mockReq.query = { limit: '10', skip: '5' };

      await learningResourceController.getAll(mockReq, mockRes);

      expect(learningResourceService.getAllResources).toHaveBeenCalledWith(
        {},
        {
          limit: 10,
          skip: 5,
          sort: { is_featured: -1, view_count: -1, created_at: -1 },
        }
      );
    });

    it('✅ should search resources when search query provided', async () => {
      learningResourceService.searchResources.mockResolvedValue(mockResources);

      mockReq.query = { search: 'javascript', limit: '10' };

      await learningResourceController.getAll(mockReq, mockRes);

      expect(learningResourceService.searchResources).toHaveBeenCalledWith('javascript', 10);
      expect(learningResourceService.getAllResources).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockResources,
        count: 2,
      });
    });

    it('✅ should return empty array when no resources found', async () => {
      learningResourceService.getAllResources.mockResolvedValue([]);

      mockReq.query = {};

      await learningResourceController.getAll(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: [],
        count: 0,
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      learningResourceService.getAllResources.mockRejectedValue(error);

      mockReq.query = {};

      await learningResourceController.getAll(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database error',
      });
    });
  });

  describe('update', () => {
    const mockUpdatedResource = {
      _id: VALID_RESOURCE_ID,
      title: 'Updated JavaScript Basics',
      description: 'Updated description',
      resource_type: 'tutorial',
    };

    it('✅ should update learning resource successfully', async () => {
      learningResourceService.updateResource.mockResolvedValue(mockUpdatedResource);

      mockReq.params = { id: VALID_RESOURCE_ID };
      mockReq.body = { title: 'Updated JavaScript Basics' };

      await learningResourceController.update(mockReq, mockRes);

      expect(learningResourceService.updateResource).toHaveBeenCalledWith(
        VALID_RESOURCE_ID,
        { title: 'Updated JavaScript Basics' },
        VALID_USER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockUpdatedResource,
      });
    });

    it('✅ should handle when user is not provided', async () => {
      learningResourceService.updateResource.mockResolvedValue(mockUpdatedResource);

      mockReq.user = null;
      mockReq.params = { id: VALID_RESOURCE_ID };
      mockReq.body = { title: 'Updated' };

      await learningResourceController.update(mockReq, mockRes);

      expect(learningResourceService.updateResource).toHaveBeenCalledWith(
        VALID_RESOURCE_ID,
        { title: 'Updated' },
        undefined
      );
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Resource not found');
      learningResourceService.updateResource.mockRejectedValue(error);

      mockReq.params = { id: VALID_RESOURCE_ID };
      mockReq.body = { title: 'Updated' };

      await learningResourceController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Resource not found',
      });
    });
  });

  describe('delete', () => {
    it('✅ should delete learning resource successfully', async () => {
      learningResourceService.deleteResource.mockResolvedValue(undefined);

      mockReq.params = { id: VALID_RESOURCE_ID };

      await learningResourceController.delete(mockReq, mockRes);

      expect(learningResourceService.deleteResource).toHaveBeenCalledWith(VALID_RESOURCE_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Learning resource deleted successfully',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Resource not found');
      learningResourceService.deleteResource.mockRejectedValue(error);

      mockReq.params = { id: VALID_RESOURCE_ID };

      await learningResourceController.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Resource not found',
      });
    });
  });

  describe('recommendForTask', () => {
    const mockTask = {
      _id: VALID_TASK_ID,
      title: 'Build REST API',
      description: 'Create a REST API using Node.js and Express',
      assigned_to: {
        _id: VALID_USER_ID,
        username: 'testuser',
        full_name: 'Test User',
      },
    };

    const mockTaskTags = [
      {
        _id: 'tag1',
        task_id: VALID_TASK_ID,
        tag_id: {
          _id: 'tagid1',
          name: 'Node.js',
        },
      },
      {
        _id: 'tag2',
        task_id: VALID_TASK_ID,
        tag_id: {
          _id: 'tagid2',
          name: 'Express',
        },
      },
    ];

    const mockRecommendations = {
      tutorials: [
        {
          _id: 'tut1',
          title: 'Node.js Tutorial',
          resource_type: 'tutorial',
        },
      ],
      videos: [
        {
          _id: 'vid1',
          title: 'Express Video',
          resource_type: 'video',
        },
      ],
      codeExamples: [
        {
          _id: 'code1',
          title: 'REST API Example',
          resource_type: 'code_example',
        },
      ],
    };

    it('✅ should recommend resources for task successfully', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTaskTags),
      };
      Task.findById.mockReturnValue(mockTaskQuery);
      TaskTag.find.mockReturnValue(mockTaskTagQuery);
      learningResourceService.recommendResourcesForTask.mockResolvedValue(mockRecommendations);

      mockReq.body = { task_id: VALID_TASK_ID };

      await learningResourceController.recommendForTask(mockReq, mockRes);

      expect(Task.findById).toHaveBeenCalledWith(VALID_TASK_ID);
      expect(mockTaskQuery.populate).toHaveBeenCalledWith('assigned_to', 'username full_name');
      expect(mockTaskQuery.lean).toHaveBeenCalled();
      expect(TaskTag.find).toHaveBeenCalledWith({ task_id: mockTask._id });
      expect(mockTaskTagQuery.populate).toHaveBeenCalledWith('tag_id', 'name');
      expect(mockTaskTagQuery.lean).toHaveBeenCalled();
      expect(learningResourceService.recommendResourcesForTask).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: VALID_TASK_ID,
          title: mockTask.title,
          tags: expect.arrayContaining([
            expect.objectContaining({ name: 'Node.js' }),
            expect.objectContaining({ name: 'Express' }),
          ]),
        }),
        10
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          task_id: VALID_TASK_ID,
          task_title: mockTask.title,
          recommendations: mockRecommendations,
        },
      });
    });

    it('✅ should handle task with no tags', async () => {
      const taskWithoutTags = { ...mockTask };
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(taskWithoutTags),
      };
      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      Task.findById.mockReturnValue(mockTaskQuery);
      TaskTag.find.mockReturnValue(mockTaskTagQuery);
      learningResourceService.recommendResourcesForTask.mockResolvedValue(mockRecommendations);

      mockReq.body = { task_id: VALID_TASK_ID };

      await learningResourceController.recommendForTask(mockReq, mockRes);

      expect(learningResourceService.recommendResourcesForTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [],
        }),
        10
      );
    });

    it('✅ should handle task with null tags', async () => {
      const taskWithNullTags = { ...mockTask, tags: null };
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(taskWithNullTags),
      };
      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      Task.findById.mockReturnValue(mockTaskQuery);
      TaskTag.find.mockReturnValue(mockTaskTagQuery);
      learningResourceService.recommendResourcesForTask.mockResolvedValue(mockRecommendations);

      mockReq.body = { task_id: VALID_TASK_ID };

      await learningResourceController.recommendForTask(mockReq, mockRes);

      expect(learningResourceService.recommendResourcesForTask).toHaveBeenCalled();
    });

    it('❌ should return 400 when task_id is missing', async () => {
      mockReq.body = {};

      await learningResourceController.recommendForTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'task_id is required',
      });
      expect(Task.findById).not.toHaveBeenCalled();
    });

    it('❌ should return 404 when task not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      Task.findById.mockReturnValue(mockQuery);

      mockReq.body = { task_id: VALID_TASK_ID };

      await learningResourceController.recommendForTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Task not found',
      });
      expect(learningResourceService.recommendResourcesForTask).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(error),
      };
      Task.findById.mockReturnValue(mockQuery);

      mockReq.body = { task_id: VALID_TASK_ID };

      await learningResourceController.recommendForTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database error',
      });
    });

    it('✅ should filter out null tags from taskTags', async () => {
      const taskTagsWithNull = [
        ...mockTaskTags,
        {
          _id: 'tag3',
          task_id: VALID_TASK_ID,
          tag_id: null,
        },
      ];
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(taskTagsWithNull),
      };
      Task.findById.mockReturnValue(mockTaskQuery);
      TaskTag.find.mockReturnValue(mockTaskTagQuery);
      learningResourceService.recommendResourcesForTask.mockResolvedValue(mockRecommendations);

      mockReq.body = { task_id: VALID_TASK_ID };

      await learningResourceController.recommendForTask(mockReq, mockRes);

      expect(learningResourceService.recommendResourcesForTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining([
            expect.objectContaining({ name: 'Node.js' }),
            expect.objectContaining({ name: 'Express' }),
          ]),
        }),
        10
      );
    });
  });
});

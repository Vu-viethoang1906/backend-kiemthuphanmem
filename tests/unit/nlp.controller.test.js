// 📄 tests/unit/nlp.controller.test.js - NLP Controller Unit Tests

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
jest.mock('../../services/nlp.service', () => ({
  parseNaturalQuery: jest.fn(),
  generateTaskDescription: jest.fn(),
  recommendLearningResources: jest.fn(),
  summarizeComments: jest.fn(),
}));

jest.mock('../../services/taskQueryBuilder.service', () => jest.fn());

jest.mock('../../services/comment.service', () => ({
  getCommentsByTask: jest.fn(),
}));

// Mock models
jest.mock('../../models/task.model', () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../../models/board.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../../models/column.model', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../models/swimlane.model', () => ({}));

jest.mock('../../models/usersModel', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../models/taskTag.model', () => ({
  find: jest.fn(),
}));

jest.mock('../../models/tag.model', () => ({}));

// Mock Fuse.js
jest.mock('fuse.js', () => {
  return jest.fn().mockImplementation((items, options) => ({
    search: jest.fn(keyword => {
      // Simple mock: return items that match keyword in title or description
      const results = items
        .filter(item => {
          const title = (item.title || '').toLowerCase();
          const description = (item.description || '').toLowerCase();
          const searchTerm = keyword.toLowerCase();
          return title.includes(searchTerm) || description.includes(searchTerm);
        })
        .map(item => ({ item }));
      return results;
    }),
  }));
});

const nlpController = require('../../controllers/nlp.controller');
const nlpService = require('../../services/nlp.service');
const buildTaskQuery = require('../../services/taskQueryBuilder.service');
const Task = require('../../models/task.model');
const Column = require('../../models/column.model');
const TaskTag = require('../../models/taskTag.model');
const commentService = require('../../services/comment.service');
const Fuse = require('fuse.js');

describe('🔹 NLP Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const VALID_TASK_ID = '507f1f77bcf86cd799439012';
  const VALID_BOARD_ID = '507f1f77bcf86cd799439013';
  const VALID_COLUMN_ID = '507f1f77bcf86cd799439014';
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
  });

  describe('parse', () => {
    const mockNLPResult = {
      intent: 'QUERY_TASKS',
      filters: {
        assignee: 'me',
        priority: 'High',
      },
    };

    const mockTasks = [
      {
        _id: VALID_TASK_ID,
        title: 'Test Task',
        description: 'Test Description',
        assigned_to: {
          _id: VALID_USER_ID,
          username: 'testuser',
          full_name: 'Test User',
        },
        column_id: {
          _id: VALID_COLUMN_ID,
          name: 'Todo',
          order: 1,
        },
        swimlane_id: null,
      },
    ];

    it('✅ should parse natural query and return tasks successfully', async () => {
      nlpService.parseNaturalQuery.mockResolvedValue(mockNLPResult);
      buildTaskQuery.mockResolvedValue({ assigned_to: VALID_USER_ID, priority: 'High' });

      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      };
      Task.find.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      mockReq.body = { query: 'tasks của tôi priority cao' };

      await nlpController.parse(mockReq, mockRes);

      expect(nlpService.parseNaturalQuery).toHaveBeenCalledWith('tasks của tôi priority cao');
      expect(buildTaskQuery).toHaveBeenCalled();
      expect(Task.find).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        tasks: mockTasks,
      });
    });

    it('✅ should add board_id to filters when provided', async () => {
      const nlpResultWithBoard = {
        ...mockNLPResult,
        filters: { assignee: 'me' },
      };
      nlpService.parseNaturalQuery.mockResolvedValue(nlpResultWithBoard);
      buildTaskQuery.mockResolvedValue({ assigned_to: VALID_USER_ID });

      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      };
      Task.find.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      mockReq.body = { query: 'tasks của tôi', board_id: VALID_BOARD_ID };

      await nlpController.parse(mockReq, mockRes);

      expect(buildTaskQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          board_id: VALID_BOARD_ID,
        }),
        expect.any(Object),
        VALID_USER_ID
      );
    });

    it('✅ should handle status Done and find done column', async () => {
      const nlpResultDone = {
        ...mockNLPResult,
        filters: { status: 'Done' },
      };
      nlpService.parseNaturalQuery.mockResolvedValue(nlpResultDone);
      buildTaskQuery.mockResolvedValue({ assigned_to: VALID_USER_ID });

      const mockDoneColumn = {
        _id: VALID_COLUMN_ID,
        board_id: VALID_BOARD_ID,
        isDone: true,
      };
      Column.findOne.mockResolvedValue(mockDoneColumn);

      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      };
      Task.find.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      mockReq.body = { query: 'tasks đã xong', board_id: VALID_BOARD_ID };

      await nlpController.parse(mockReq, mockRes);

      expect(Column.findOne).toHaveBeenCalledWith({
        board_id: VALID_BOARD_ID,
        isDone: true,
      });
      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({
          column_id: VALID_COLUMN_ID,
        })
      );
    });

    it('✅ should exclude done tasks when no status filter', async () => {
      const nlpResultNoStatus = {
        ...mockNLPResult,
        filters: {},
      };
      nlpService.parseNaturalQuery.mockResolvedValue(nlpResultNoStatus);
      buildTaskQuery.mockResolvedValue({ assigned_to: VALID_USER_ID });

      const mockDoneColumn = {
        _id: VALID_COLUMN_ID,
        board_id: VALID_BOARD_ID,
        isDone: true,
      };
      Column.findOne.mockResolvedValue(mockDoneColumn);

      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      };
      Task.find.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      mockReq.body = { query: 'tasks của tôi', board_id: VALID_BOARD_ID };

      await nlpController.parse(mockReq, mockRes);

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({
          column_id: { $ne: VALID_COLUMN_ID },
        })
      );
    });

    it('✅ should populate tags for tasks', async () => {
      nlpService.parseNaturalQuery.mockResolvedValue(mockNLPResult);
      buildTaskQuery.mockResolvedValue({ assigned_to: VALID_USER_ID });

      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      };
      Task.find.mockReturnValue(mockTaskQuery);

      const mockTaskTags = [
        {
          task_id: VALID_TASK_ID,
          tag_id: {
            _id: 'tag1',
            name: 'Frontend',
            color: '#FF0000',
          },
        },
      ];
      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTaskTags),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      mockReq.body = { query: 'tasks của tôi' };

      await nlpController.parse(mockReq, mockRes);

      expect(TaskTag.find).toHaveBeenCalledWith({
        task_id: { $in: [VALID_TASK_ID] },
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        tasks: expect.arrayContaining([
          expect.objectContaining({
            tags: expect.arrayContaining([
              expect.objectContaining({
                name: 'Frontend',
                color: '#FF0000',
              }),
            ]),
          }),
        ]),
      });
    });

    it('✅ should apply fuzzy search when keyword filter exists', async () => {
      const nlpResultWithKeyword = {
        ...mockNLPResult,
        filters: { keyword: 'test' },
      };
      nlpService.parseNaturalQuery.mockResolvedValue(nlpResultWithKeyword);
      buildTaskQuery.mockResolvedValue({ assigned_to: VALID_USER_ID });

      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      };
      Task.find.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      mockReq.body = { query: 'tìm task test' };

      await nlpController.parse(mockReq, mockRes);

      expect(Fuse).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('❌ should return 400 when query is missing', async () => {
      mockReq.body = {};

      await nlpController.parse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Query is required',
      });
      expect(nlpService.parseNaturalQuery).not.toHaveBeenCalled();
    });

    it('✅ should handle when user is not provided', async () => {
      nlpService.parseNaturalQuery.mockResolvedValue(mockNLPResult);
      buildTaskQuery.mockResolvedValue({});

      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      Task.find.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      mockReq.user = null;
      mockReq.body = { query: 'tasks' };

      await nlpController.parse(mockReq, mockRes);

      expect(buildTaskQuery).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), null);
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('NLP service error');
      nlpService.parseNaturalQuery.mockRejectedValue(error);

      mockReq.body = { query: 'test query' };

      await nlpController.parse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'NLP service error',
      });
    });
  });

  describe('propose', () => {
    const mockProposal = {
      success: true,
      title: 'Build REST API',
      description: 'Tạo REST API với Node.js và Express',
      acceptanceCriteria: ['API phải có CRUD operations', 'API phải có validation'],
      subtasks: ['Setup project', 'Create routes', 'Add validation'],
    };

    it('✅ should generate task description successfully', async () => {
      nlpService.generateTaskDescription.mockResolvedValue(mockProposal);

      mockReq.body = { title: 'Build REST API', boardId: VALID_BOARD_ID };

      await nlpController.propose(mockReq, mockRes);

      expect(nlpService.generateTaskDescription).toHaveBeenCalledWith(
        'Build REST API',
        VALID_BOARD_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockProposal,
      });
    });

    it('✅ should handle when boardId is not provided', async () => {
      nlpService.generateTaskDescription.mockResolvedValue(mockProposal);

      mockReq.body = { title: 'Build REST API' };

      await nlpController.propose(mockReq, mockRes);

      expect(nlpService.generateTaskDescription).toHaveBeenCalledWith('Build REST API', undefined);
    });

    it('❌ should return 400 when title is missing', async () => {
      mockReq.body = {};

      await nlpController.propose(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Title is required',
      });
      expect(nlpService.generateTaskDescription).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('AI generation failed');
      nlpService.generateTaskDescription.mockRejectedValue(error);

      mockReq.body = { title: 'Build REST API' };

      await nlpController.propose(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AI generation failed',
      });
    });
  });

  describe('recommend', () => {
    const mockTask = {
      _id: VALID_TASK_ID,
      title: 'Build REST API',
      description: 'Create REST API with Node.js',
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
    ];

    const mockRecommendations = {
      success: true,
      taskTitle: 'Build REST API',
      source: 'database',
      tutorials: [{ title: 'Node.js Tutorial', url: 'https://example.com' }],
      videos: [{ title: 'REST API Video', url: 'https://example.com/video' }],
      codeExamples: [{ title: 'API Example', language: 'JavaScript' }],
    };

    it('✅ should recommend learning resources successfully', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTaskTags),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      nlpService.recommendLearningResources.mockResolvedValue(mockRecommendations);

      mockReq.body = { idTask: VALID_TASK_ID, useDatabase: true };

      await nlpController.recommend(mockReq, mockRes);

      expect(Task.findById).toHaveBeenCalledWith(VALID_TASK_ID);
      expect(TaskTag.find).toHaveBeenCalledWith({ task_id: VALID_TASK_ID });
      expect(nlpService.recommendLearningResources).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: VALID_TASK_ID,
          title: mockTask.title,
          tags: expect.arrayContaining([expect.objectContaining({ name: 'Node.js' })]),
        }),
        true
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockRecommendations,
      });
    });

    it('✅ should use default useDatabase = true when not provided', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTaskTags),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      nlpService.recommendLearningResources.mockResolvedValue(mockRecommendations);

      mockReq.body = { idTask: VALID_TASK_ID };

      await nlpController.recommend(mockReq, mockRes);

      expect(nlpService.recommendLearningResources).toHaveBeenCalledWith(expect.any(Object), true);
    });

    it('✅ should handle task with no tags', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      nlpService.recommendLearningResources.mockResolvedValue(mockRecommendations);

      mockReq.body = { idTask: VALID_TASK_ID };

      await nlpController.recommend(mockReq, mockRes);

      expect(nlpService.recommendLearningResources).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [],
        }),
        true
      );
    });

    it('❌ should return 400 when task not found', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      mockReq.body = { idTask: VALID_TASK_ID };

      await nlpController.recommend(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Task with title is required',
      });
      expect(nlpService.recommendLearningResources).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when task has no title', async () => {
      const taskWithoutTitle = { ...mockTask, title: null };
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(taskWithoutTitle),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      mockReq.body = { idTask: VALID_TASK_ID };

      await nlpController.recommend(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Task with title is required',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      const mockTaskTagQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTaskTags),
      };
      TaskTag.find.mockReturnValue(mockTaskTagQuery);

      const error = new Error('Recommendation failed');
      nlpService.recommendLearningResources.mockRejectedValue(error);

      mockReq.body = { idTask: VALID_TASK_ID };

      await nlpController.recommend(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Recommendation failed',
      });
    });
  });

  describe('summarize', () => {
    const mockTask = {
      _id: VALID_TASK_ID,
      title: 'Build REST API',
      description: 'Create REST API',
      assigned_to: {
        _id: VALID_USER_ID,
        username: 'testuser',
        full_name: 'Test User',
      },
    };

    const mockComments = [
      {
        _id: 'comment1',
        task_id: VALID_TASK_ID,
        user_id: {
          _id: VALID_USER_ID,
          username: 'testuser',
          full_name: 'Test User',
        },
        content: 'This is a comment',
        created_at: new Date(),
      },
      {
        _id: 'comment2',
        task_id: VALID_TASK_ID,
        user_id: {
          _id: 'user2',
          username: 'user2',
          full_name: 'User 2',
        },
        content: 'Another comment',
        created_at: new Date(),
      },
    ];

    const mockSummary = {
      success: true,
      taskTitle: 'Build REST API',
      taskId: VALID_TASK_ID,
      summary: 'Tóm tắt cuộc thảo luận',
      keyPoints: ['Điểm 1', 'Điểm 2'],
      decisions: ['Quyết định 1'],
      actionItems: ['Hành động 1'],
      unresolvedIssues: [],
      participants: ['Test User', 'User 2'],
      totalComments: 2,
    };

    it('✅ should summarize comments successfully', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      commentService.getCommentsByTask.mockResolvedValue(mockComments);
      nlpService.summarizeComments.mockResolvedValue(mockSummary);

      mockReq.body = { taskId: VALID_TASK_ID };

      await nlpController.summarize(mockReq, mockRes);

      expect(Task.findById).toHaveBeenCalledWith(VALID_TASK_ID);
      expect(commentService.getCommentsByTask).toHaveBeenCalledWith(VALID_TASK_ID);
      expect(nlpService.summarizeComments).toHaveBeenCalledWith(mockComments, {
        id: VALID_TASK_ID,
        title: mockTask.title,
        description: mockTask.description || '',
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockSummary,
      });
    });

    it('✅ should handle task with no description', async () => {
      const taskWithoutDescription = { ...mockTask, description: null };
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(taskWithoutDescription),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      commentService.getCommentsByTask.mockResolvedValue(mockComments);
      nlpService.summarizeComments.mockResolvedValue(mockSummary);

      mockReq.body = { taskId: VALID_TASK_ID };

      await nlpController.summarize(mockReq, mockRes);

      expect(nlpService.summarizeComments).toHaveBeenCalledWith(mockComments, {
        id: VALID_TASK_ID,
        title: mockTask.title,
        description: '',
      });
    });

    it('✅ should return success when no comments found', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      commentService.getCommentsByTask.mockResolvedValue([]);

      mockReq.body = { taskId: VALID_TASK_ID };

      await nlpController.summarize(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          success: false,
          message: 'Không có comments để tóm tắt',
          totalComments: 0,
        },
      });
      expect(nlpService.summarizeComments).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when taskId is missing', async () => {
      mockReq.body = {};

      await nlpController.summarize(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Task ID is required',
      });
      expect(Task.findById).not.toHaveBeenCalled();
    });

    it('❌ should return 404 when task not found', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      mockReq.body = { taskId: VALID_TASK_ID };

      await nlpController.summarize(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Task not found',
      });
      expect(commentService.getCommentsByTask).not.toHaveBeenCalled();
    });

    it('❌ should return 500 when service throws error', async () => {
      const mockTaskQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      Task.findById.mockReturnValue(mockTaskQuery);

      const error = new Error('Summarization failed');
      commentService.getCommentsByTask.mockRejectedValue(error);

      mockReq.body = { taskId: VALID_TASK_ID };

      await nlpController.summarize(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Summarization failed',
      });
    });
  });
});

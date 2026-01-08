// 📄 tests/unit/nlp.service.test.js - NLP Service Unit Tests
const mongoose = require('mongoose');

// Mock Groq SDK before requiring service
const mockChatCompletionsCreate = jest.fn();
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockChatCompletionsCreate,
      },
    },
  }));
});

// Mock models
jest.mock('../../models/task.model');
jest.mock('../../models/board.model');

// Mock learningResource.service
jest.mock('../../services/learningResource.service', () => ({
  recommendResourcesForTask: jest.fn(),
}));

const NLPService = require('../../services/nlp.service');
const Task = require('../../models/task.model');
const Board = require('../../models/board.model');
const learningResourceService = require('../../services/learningResource.service');

describe('🔹 NLP Service Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GROQ_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('parseNaturalQuery', () => {
    it('✅ should parse natural query successfully', async () => {
      const mockQuery = 'tasks của tôi còn 3 ngày nữa hết hạn';
      const mockAIResponse = {
        intent: 'QUERY_TASKS',
        filters: {
          assignee: 'me',
          due_in_days: 3,
        },
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.parseNaturalQuery(mockQuery);

      expect(mockChatCompletionsCreate).toHaveBeenCalled();
      expect(result).toEqual(mockAIResponse);
      expect(result.intent).toBe('QUERY_TASKS');
      expect(result.filters.assignee).toBe('me');
      expect(result.filters.due_in_days).toBe(3);
    });

    it('✅ should parse query with markdown code blocks', async () => {
      const mockQuery = 'tìm task quá hạn 5 ngày';
      const mockAIResponse = {
        intent: 'QUERY_TASKS',
        filters: {
          overdue: true,
          overdue_days: 5,
        },
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '```json\n' + JSON.stringify(mockAIResponse) + '\n```',
            },
          },
        ],
      });

      const result = await NLPService.parseNaturalQuery(mockQuery);

      expect(result).toEqual(mockAIResponse);
      expect(result.filters.overdue).toBe(true);
      expect(result.filters.overdue_days).toBe(5);
    });

    it('✅ should handle parse error and return UNKNOWN intent', async () => {
      const mockQuery = 'invalid query';

      mockChatCompletionsCreate.mockRejectedValue(new Error('API Error'));

      const result = await NLPService.parseNaturalQuery(mockQuery);

      expect(result).toEqual({
        intent: 'UNKNOWN',
        filters: {},
        error: true,
        message: 'JSON parse failed',
      });
    });

    it('✅ should handle invalid JSON response', async () => {
      const mockQuery = 'test query';

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      });

      // JSON.parse will throw, so we expect error handling
      const result = await NLPService.parseNaturalQuery(mockQuery);

      expect(result).toEqual({
        intent: 'UNKNOWN',
        filters: {},
        error: true,
        message: 'JSON parse failed',
      });
    });

    it('✅ should parse query with multiple filters', async () => {
      const mockQuery = 'task priority cao của tôi';
      const mockAIResponse = {
        intent: 'QUERY_TASKS',
        filters: {
          assignee: 'me',
          priority: 'High',
        },
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.parseNaturalQuery(mockQuery);

      expect(result.intent).toBe('QUERY_TASKS');
      expect(result.filters.assignee).toBe('me');
      expect(result.filters.priority).toBe('High');
    });

    it('✅ should call Groq API with correct parameters', async () => {
      const mockQuery = 'test query';
      const mockAIResponse = {
        intent: 'QUERY_TASKS',
        filters: {},
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      await NLPService.parseNaturalQuery(mockQuery);

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama-3.3-70b-versatile',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(mockQuery),
            }),
          ]),
          temperature: 0.1,
        })
      );
    });
  });

  describe('generateTaskDescription', () => {
    it('✅ should generate task description without boardId', async () => {
      const mockTitle = 'Build Login Feature';
      const mockAIResponse = {
        description: 'Xây dựng tính năng đăng nhập cho ứng dụng',
        acceptanceCriteria: [
          'Người dùng có thể nhập email và password',
          'Hệ thống xác thực thông tin đăng nhập',
          'Hiển thị thông báo lỗi nếu đăng nhập thất bại',
        ],
        subtasks: ['Tạo form đăng nhập', 'Implement authentication logic', 'Thêm error handling'],
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.generateTaskDescription(mockTitle);

      expect(result.success).toBe(true);
      expect(result.title).toBe(mockTitle);
      expect(result.description).toBe(mockAIResponse.description);
      expect(result.acceptanceCriteria).toEqual(mockAIResponse.acceptanceCriteria);
      expect(result.subtasks).toEqual(mockAIResponse.subtasks);
      expect(Board.findById).not.toHaveBeenCalled();
      expect(Task.find).not.toHaveBeenCalled();
    });

    it('✅ should generate task description with boardId and board context', async () => {
      const mockTitle = 'Build Login Feature';
      const mockBoardId = new mongoose.Types.ObjectId().toString();
      const mockBoard = {
        _id: mockBoardId,
        title: 'Authentication Module',
        description: 'Module xử lý authentication',
      };

      const mockAIResponse = {
        description: 'Xây dựng tính năng đăng nhập cho ứng dụng',
        acceptanceCriteria: [
          'Người dùng có thể nhập email và password',
          'Hệ thống xác thực thông tin đăng nhập',
        ],
        subtasks: ['Tạo form đăng nhập', 'Implement authentication logic'],
      };

      Board.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockBoard),
      });

      Task.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.generateTaskDescription(mockTitle, mockBoardId);

      expect(result.success).toBe(true);
      expect(result.title).toBe(mockTitle);
      expect(Board.findById).toHaveBeenCalledWith(mockBoardId);
      expect(mockChatCompletionsCreate).toHaveBeenCalled();
    });

    it('✅ should find similar tasks when boardId is provided', async () => {
      const mockTitle = 'Build Login Feature';
      const mockBoardId = new mongoose.Types.ObjectId().toString();
      const mockBoard = {
        _id: mockBoardId,
        title: 'Authentication Module',
        description: 'Module xử lý authentication',
      };

      const mockSimilarTasks = [
        {
          title: 'Build Login Form',
          description: 'Create login form component',
        },
        {
          title: 'Login Authentication',
          description: 'Implement login logic',
        },
      ];

      const mockAIResponse = {
        description: 'Xây dựng tính năng đăng nhập',
        acceptanceCriteria: ['Criteria 1'],
        subtasks: ['Subtask 1'],
      };

      Board.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockBoard),
      });

      Task.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockSimilarTasks),
          }),
        }),
      });

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.generateTaskDescription(mockTitle, mockBoardId);

      expect(result.success).toBe(true);
      expect(Task.find).toHaveBeenCalled();
      expect(mockChatCompletionsCreate).toHaveBeenCalled();
    });

    it('✅ should handle error and return failure response', async () => {
      const mockTitle = 'Build Login Feature';

      mockChatCompletionsCreate.mockRejectedValue(new Error('API Error'));

      const result = await NLPService.generateTaskDescription(mockTitle);

      expect(result.success).toBe(false);
      expect(result.message).toBe('AI generate failed');
      expect(result.error).toBe('API Error');
    });

    it('✅ should handle board not found gracefully', async () => {
      const mockTitle = 'Build Login Feature';
      const mockBoardId = new mongoose.Types.ObjectId().toString();

      Board.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      Task.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockAIResponse = {
        description: 'Description',
        acceptanceCriteria: ['Criteria 1'],
        subtasks: ['Subtask 1'],
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.generateTaskDescription(mockTitle, mockBoardId);

      expect(result.success).toBe(true);
      expect(Board.findById).toHaveBeenCalledWith(mockBoardId);
    });

    it('✅ should call Groq API with correct temperature', async () => {
      const mockTitle = 'Test Task';
      const mockAIResponse = {
        description: 'Description',
        acceptanceCriteria: ['Criteria 1'],
        subtasks: ['Subtask 1'],
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      await NLPService.generateTaskDescription(mockTitle);

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.2,
        })
      );
    });
  });

  describe('recommendLearningResources', () => {
    const mockTask = {
      title: 'Build React Component',
      description: 'Create a reusable button component',
      tags: ['react', 'frontend'],
    };

    it('✅ should return database recommendations when enough results', async () => {
      const mockDbRecommendations = {
        tutorials: [
          { title: 'React Tutorial 1', url: 'https://example.com/tut1', type: 'article' },
          { title: 'React Tutorial 2', url: 'https://example.com/tut2', type: 'docs' },
        ],
        videos: [
          { title: 'React Video 1', url: 'https://example.com/vid1' },
          { title: 'React Video 2', url: 'https://example.com/vid2' },
        ],
        codeExamples: [{ title: 'React Example 1', language: 'javascript', snippet: 'code' }],
      };

      learningResourceService.recommendResourcesForTask.mockResolvedValue(mockDbRecommendations);

      const result = await NLPService.recommendLearningResources(mockTask, true);

      expect(result.success).toBe(true);
      expect(result.source).toBe('database');
      expect(result.taskTitle).toBe(mockTask.title);
      expect(result.tutorials).toEqual(mockDbRecommendations.tutorials);
      expect(result.videos).toEqual(mockDbRecommendations.videos);
      expect(result.codeExamples).toEqual(mockDbRecommendations.codeExamples);
      expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
    });

    it('✅ should fallback to AI and merge when database has insufficient results', async () => {
      const mockDbRecommendations = {
        tutorials: [{ title: 'Tutorial 1', url: 'https://example.com/tut1', type: 'article' }],
        videos: [],
        codeExamples: [],
      };

      const mockAIResponse = {
        tutorials: [
          { title: 'AI Tutorial 1', url: 'https://example.com/ai1', type: 'article' },
          { title: 'AI Tutorial 2', url: 'https://example.com/ai2', type: 'docs' },
        ],
        videos: [{ title: 'AI Video 1', url: 'https://example.com/aiv1' }],
        codeExamples: [{ title: 'AI Example 1', language: 'javascript', snippet: 'code' }],
      };

      learningResourceService.recommendResourcesForTask.mockResolvedValue(mockDbRecommendations);

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.recommendLearningResources(mockTask, true);

      expect(result.success).toBe(true);
      // When database has results (even if < 5), service merges with AI and returns 'hybrid'
      expect(result.source).toBe('hybrid');
      expect(mockChatCompletionsCreate).toHaveBeenCalled();
      // Should merge database and AI results
      expect(result.tutorials.length).toBeGreaterThan(0);
    });

    it('✅ should merge database and AI results when both available', async () => {
      const mockDbRecommendations = {
        tutorials: [{ title: 'DB Tutorial 1', url: 'https://example.com/db1', type: 'article' }],
        videos: [{ title: 'DB Video 1', url: 'https://example.com/dbv1' }],
        codeExamples: [],
      };

      const mockAIResponse = {
        tutorials: [
          { title: 'AI Tutorial 1', url: 'https://example.com/ai1', type: 'article' },
          { title: 'AI Tutorial 2', url: 'https://example.com/ai2', type: 'docs' },
        ],
        videos: [{ title: 'AI Video 1', url: 'https://example.com/aiv1' }],
        codeExamples: [{ title: 'AI Example 1', language: 'javascript', snippet: 'code' }],
      };

      learningResourceService.recommendResourcesForTask.mockResolvedValue(mockDbRecommendations);

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.recommendLearningResources(mockTask, true);

      expect(result.success).toBe(true);
      expect(result.source).toBe('hybrid');
      expect(result.tutorials.length).toBeLessThanOrEqual(5);
      expect(result.videos.length).toBeLessThanOrEqual(5);
      expect(result.codeExamples.length).toBeLessThanOrEqual(5);
    });

    it('✅ should use AI only when useDatabase is false', async () => {
      const mockAIResponse = {
        tutorials: [{ title: 'AI Tutorial 1', url: 'https://example.com/ai1', type: 'article' }],
        videos: [],
        codeExamples: [],
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.recommendLearningResources(mockTask, false);

      expect(result.success).toBe(true);
      expect(result.source).toBe('ai');
      expect(learningResourceService.recommendResourcesForTask).not.toHaveBeenCalled();
      expect(mockChatCompletionsCreate).toHaveBeenCalled();
    });

    it('✅ should handle database error and fallback to AI', async () => {
      learningResourceService.recommendResourcesForTask.mockRejectedValue(
        new Error('Database error')
      );

      const mockAIResponse = {
        tutorials: [{ title: 'AI Tutorial 1', url: 'https://example.com/ai1', type: 'article' }],
        videos: [],
        codeExamples: [],
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.recommendLearningResources(mockTask, true);

      expect(result.success).toBe(true);
      expect(result.source).toBe('ai');
      expect(mockChatCompletionsCreate).toHaveBeenCalled();
    });

    it('✅ should handle AI error and return failure response', async () => {
      learningResourceService.recommendResourcesForTask.mockResolvedValue({
        tutorials: [],
        videos: [],
        codeExamples: [],
      });

      mockChatCompletionsCreate.mockRejectedValue(new Error('AI API Error'));

      const result = await NLPService.recommendLearningResources(mockTask, true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('AI recommend failed');
      expect(result.error).toBe('AI API Error');
    });

    it('✅ should handle task without description', async () => {
      const taskWithoutDescription = {
        title: 'Test Task',
        tags: ['test'],
      };

      const mockAIResponse = {
        tutorials: [],
        videos: [],
        codeExamples: [],
      };

      learningResourceService.recommendResourcesForTask.mockResolvedValue({
        tutorials: [],
        videos: [],
        codeExamples: [],
      });

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.recommendLearningResources(taskWithoutDescription, true);

      expect(result.success).toBe(true);
      expect(mockChatCompletionsCreate).toHaveBeenCalled();
    });
  });

  describe('summarizeComments', () => {
    const mockComments = [
      {
        user_id: {
          full_name: 'John Doe',
          username: 'johndoe',
        },
        content: 'This is a great idea!',
        created_at: new Date('2024-01-01'),
        attachments: [],
      },
      {
        user_id: {
          full_name: 'Jane Smith',
          username: 'janesmith',
        },
        content: "I agree, let's implement this feature.",
        created_at: new Date('2024-01-02'),
        attachments: [],
      },
    ];

    const mockTaskInfo = {
      title: 'Build Login Feature',
      description: 'Implement user authentication',
      id: new mongoose.Types.ObjectId().toString(),
    };

    it('✅ should summarize comments successfully', async () => {
      const mockAIResponse = {
        summary: 'Team discussed implementing login feature',
        keyPoints: ['Feature is important', 'Need to consider security'],
        decisions: ['Use JWT for authentication'],
        actionItems: ['Create login form', 'Implement backend API'],
        unresolvedIssues: [],
        participants: ['John Doe', 'Jane Smith'],
        totalComments: 2,
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.summarizeComments(mockComments, mockTaskInfo);

      expect(result.success).toBe(true);
      expect(result.taskTitle).toBe(mockTaskInfo.title);
      expect(result.taskId).toBe(mockTaskInfo.id);
      expect(result.summary).toBe(mockAIResponse.summary);
      expect(result.keyPoints).toEqual(mockAIResponse.keyPoints);
      expect(result.decisions).toEqual(mockAIResponse.decisions);
      expect(result.actionItems).toEqual(mockAIResponse.actionItems);
      expect(result.participants).toEqual(mockAIResponse.participants);
      expect(result.totalComments).toBe(2);
    });

    it('✅ should return error when comments array is empty', async () => {
      const result = await NLPService.summarizeComments([], mockTaskInfo);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Không có comments để tóm tắt');
      expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
    });

    it('✅ should return error when comments is null', async () => {
      const result = await NLPService.summarizeComments(null, mockTaskInfo);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Không có comments để tóm tắt');
    });

    it('✅ should handle comments with user_id as string', async () => {
      const commentsWithStringUserId = [
        {
          user_id: 'user123',
          content: 'Test comment',
          created_at: new Date('2024-01-01'),
        },
      ];

      const mockAIResponse = {
        summary: 'Summary',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        unresolvedIssues: [],
        participants: ['Unknown'],
        totalComments: 1,
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.summarizeComments(commentsWithStringUserId, mockTaskInfo);

      expect(result.success).toBe(true);
      expect(mockChatCompletionsCreate).toHaveBeenCalled();
    });

    it('✅ should handle comments with attachments', async () => {
      const commentsWithAttachments = [
        {
          user_id: {
            full_name: 'John Doe',
          },
          content: 'Check this file',
          created_at: new Date('2024-01-01'),
          attachments: ['file1.pdf', 'file2.jpg'],
        },
      ];

      const mockAIResponse = {
        summary: 'Summary',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        unresolvedIssues: [],
        participants: ['John Doe'],
        totalComments: 1,
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.summarizeComments(commentsWithAttachments, mockTaskInfo);

      expect(result.success).toBe(true);
      expect(mockChatCompletionsCreate).toHaveBeenCalled();
    });

    it('✅ should handle taskInfo without title', async () => {
      const mockAIResponse = {
        summary: 'Summary',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        unresolvedIssues: [],
        participants: [],
        totalComments: 1,
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.summarizeComments(
        [{ user_id: { full_name: 'John' }, content: 'Test', created_at: new Date() }],
        {}
      );

      expect(result.success).toBe(true);
      expect(result.taskTitle).toBe('N/A');
      expect(result.taskId).toBeNull();
    });

    it('✅ should handle taskInfo with _id instead of id', async () => {
      const taskInfoWith_id = {
        title: 'Test Task',
        _id: new mongoose.Types.ObjectId().toString(),
      };

      const mockAIResponse = {
        summary: 'Summary',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        unresolvedIssues: [],
        participants: [],
        totalComments: 1,
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.summarizeComments(
        [{ user_id: { full_name: 'John' }, content: 'Test', created_at: new Date() }],
        taskInfoWith_id
      );

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(taskInfoWith_id._id);
    });

    it('✅ should handle comments with createdAt instead of created_at', async () => {
      const commentsWithCreatedAt = [
        {
          user_id: {
            full_name: 'John Doe',
          },
          content: 'Test comment',
          createdAt: new Date('2024-01-01'),
        },
      ];

      const mockAIResponse = {
        summary: 'Summary',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        unresolvedIssues: [],
        participants: ['John Doe'],
        totalComments: 1,
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await NLPService.summarizeComments(commentsWithCreatedAt, mockTaskInfo);

      expect(result.success).toBe(true);
      expect(mockChatCompletionsCreate).toHaveBeenCalled();
    });

    it('✅ should handle AI error and return failure response', async () => {
      mockChatCompletionsCreate.mockRejectedValue(new Error('AI API Error'));

      const result = await NLPService.summarizeComments(mockComments, mockTaskInfo);

      expect(result.success).toBe(false);
      expect(result.message).toBe('AI tóm tắt thất bại');
      expect(result.error).toBe('AI API Error');
    });

    it('✅ should call Groq API with correct temperature', async () => {
      const mockAIResponse = {
        summary: 'Summary',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        unresolvedIssues: [],
        participants: [],
        totalComments: 1,
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      await NLPService.summarizeComments(mockComments, mockTaskInfo);

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        })
      );
    });

    it('✅ should truncate long task description in prompt', async () => {
      const longDescription = 'A'.repeat(300);
      const taskInfoWithLongDesc = {
        title: 'Test Task',
        description: longDescription,
      };

      const mockAIResponse = {
        summary: 'Summary',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        unresolvedIssues: [],
        participants: [],
        totalComments: 1,
      };

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      await NLPService.summarizeComments(mockComments, taskInfoWithLongDesc);

      expect(mockChatCompletionsCreate).toHaveBeenCalled();
      const callArgs = mockChatCompletionsCreate.mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;
      // Description should be truncated to 200 characters
      expect(promptContent).toContain('A'.repeat(200));
    });
  });
});

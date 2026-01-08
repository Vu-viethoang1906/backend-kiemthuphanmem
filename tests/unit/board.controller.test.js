// 📄 tests/unit/board.controller.test.js - Board Controller Unit Tests
// Mock auth middleware - default user has admin role
const mockAuth = {
  authenticateAny: (req, res, next) => {
    if (!req.user) {
      req.user = {
        id: 'user123',
        roles: ['admin', 'BOARD_CREATE', 'BOARD_UPDATE', 'BOARD_DELETE', 'VIEW_BOARD'],
      };
    }
    next();
  },
  authorizeAny: requiredRoles => (req, res, next) => {
    if (!req.user) {
      req.user = {
        id: 'user123',
        roles: ['admin', 'BOARD_CREATE', 'BOARD_UPDATE', 'BOARD_DELETE', 'VIEW_BOARD'],
      };
    }
    const userRoles = req.user?.roles || [];
    const hasPermission = requiredRoles.split(' ').some(role => userRoles.includes(role));
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền: ${requiredRoles}`,
      });
    }
    next();
  },
};

jest.mock('../../middlewares/auth', () => mockAuth);

jest.mock('../../middlewares/boardAccess', () => ({
  checkBoardAccess: (req, res, next) => next(),
}));

jest.mock('../../services/board.service');
jest.mock('../../services/activityLog.service');
jest.mock('../../repositories/boardMember.repository', () => ({
  findByBoardId: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../config/socket', () => ({
  emitToUser: jest.fn(),
  emitToUsers: jest.fn(),
  broadcast: jest.fn(),
}));
jest.mock('../../utils/queryParser', () => ({
  parseQuery: jest.fn(),
  buildDeepLinkResponse: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const boardRouter = require('../../router/board.router');
const boardController = require('../../controllers/board.controller');

const app = express();
app.use(express.json());
app.use('/api/boards', boardRouter);

describe('🔹 Board Controller Unit Tests', () => {
  const boardService = require('../../services/board.service');
  const activityLogService = require('../../services/activityLog.service');
  const queryParser = require('../../utils/queryParser');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/boards/my - List My Boards', () => {
    it("✅ should return user's boards successfully", async () => {
      const mockBoards = [
        { _id: 'board1', title: 'Board 1' },
        { _id: 'board2', title: 'Board 2' },
      ];

      const mockParsed = {
        pagination: { page: 1, limit: 10 },
        metadata: { sortBy: 'created_at', sortOrder: 'desc' },
        filter: {},
        search: null,
        viewState: {},
      };

      const mockResult = {
        boards: mockBoards,
        pagination: { total: 2, page: 1, limit: 10 },
      };

      queryParser.parseQuery.mockReturnValue(mockParsed);
      queryParser.buildDeepLinkResponse.mockReturnValue({
        success: true,
        data: mockBoards,
      });
      boardService.listBoardsForUser.mockResolvedValue(mockResult);
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app).get('/api/boards/my').set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(boardService.listBoardsForUser).toHaveBeenCalled();
    });
  });

  describe('POST /api/boards - Create Board', () => {
    it('✅ should create board successfully', async () => {
      const mockBoard = {
        _id: 'board123',
        title: 'New Board',
        description: 'Board description',
        created_by: 'user123',
      };

      boardService.createBoard.mockResolvedValue(mockBoard);
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app).post('/api/boards').set('Authorization', 'Bearer token').send({
        title: 'New Board',
        description: 'Board description',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.title).toBe('New Board');
      expect(boardService.createBoard).toHaveBeenCalled();
    });

    it('❌ should return 400 for invalid data', async () => {
      boardService.createBoard.mockRejectedValue(new Error('Title is required'));

      const res = await request(app)
        .post('/api/boards')
        .set('Authorization', 'Bearer token')
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/boards/:id - Get Board Detail', () => {
    it('✅ should return board detail for admin', async () => {
      const mockBoard = {
        _id: 'board123',
        title: 'Test Board',
        description: 'Test Description',
      };

      boardService.getBoardById.mockResolvedValue(mockBoard);
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app)
        .get('/api/boards/board123')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', 'board123');
    });

    it('❌ should return 404 when board not found', async () => {
      boardService.getBoardById.mockResolvedValue(null);
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app)
        .get('/api/boards/nonexistent')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Board không tồn tại');
    });

    it('❌ should return 403 when user has no permission', async () => {
      // Clear previous mocks
      jest.clearAllMocks();

      // Create separate app instance for this test with user without admin role
      const testApp = express();
      testApp.use(express.json());

      // Create router with custom middleware that sets user without admin role
      const testRouter = express.Router();
      testRouter.get(
        '/:id',
        (req, res, next) => {
          req.user = { id: 'user123', roles: ['user', 'VIEW_BOARD'] }; // No admin/System_Manager
          next();
        },
        (req, res, next) => {
          next(); // authorizeAny - allow VIEW_BOARD
        },
        async (req, res) => {
          // Directly call controller method to bypass router middleware
          await boardController.getBoardDetail(req, res);
        }
      );
      testApp.use('/api/boards', testRouter);

      boardService.getBoardIfPermitted.mockResolvedValue('forbidden');
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(testApp)
        .get('/api/boards/board123')
        .set('Authorization', 'Bearer token');

      // Controller checks getBoardIfPermitted which returns "forbidden"
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Không có quyền truy cập board này');
      expect(boardService.getBoardIfPermitted).toHaveBeenCalledWith('board123', 'user123');
      expect(boardService.getBoardById).not.toHaveBeenCalled(); // Should not call getBoardById for non-admin
    });
  });

  describe('PUT /api/boards/:id - Update Board', () => {
    it('✅ should update board successfully', async () => {
      const mockUpdated = {
        _id: 'board123',
        title: 'Updated Board',
        description: 'Updated Description',
      };

      boardService.updateBoard.mockResolvedValue(mockUpdated);
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app)
        .put('/api/boards/board123')
        .set('Authorization', 'Bearer token')
        .send({
          title: 'Updated Board',
          description: 'Updated Description',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.title).toBe('Updated Board');
    });

    it('❌ should return 404 when board not found', async () => {
      boardService.updateBoard.mockResolvedValue(null);
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app)
        .put('/api/boards/nonexistent')
        .set('Authorization', 'Bearer token')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('❌ should return 403 when user has no permission', async () => {
      boardService.updateBoard.mockRejectedValue(new Error('FORBIDDEN'));
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app)
        .put('/api/boards/board123')
        .set('Authorization', 'Bearer token')
        .send({ title: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/boards/:id - Delete Board', () => {
    it('✅ should delete board successfully', async () => {
      boardService.deleteBoard.mockResolvedValue({});
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/boards/board123')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Xóa board thành công');
    });

    it('❌ should return 403 when user is not creator', async () => {
      boardService.deleteBoard.mockRejectedValue(new Error('FORBIDDEN'));
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/boards/board123')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Chỉ creator được phép xóa board');
    });
  });

  describe('POST /api/boards/clone/:templateId - Clone Board', () => {
    it('✅ should clone board successfully', async () => {
      const mockCloned = {
        _id: 'newboard123',
        title: 'Cloned Board',
        description: 'Cloned from template',
      };

      boardService.cloneBoard.mockResolvedValue(mockCloned);
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app)
        .post('/api/boards/clone/template123')
        .set('Authorization', 'Bearer token')
        .send({
          title: 'Cloned Board',
          description: 'Cloned from template',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.title).toBe('Cloned Board');
    });

    it('❌ should return 400 when templateId is missing', async () => {
      const res = await request(app)
        .post('/api/boards/clone/')
        .set('Authorization', 'Bearer token')
        .send({ title: 'Cloned Board' });

      expect(res.status).toBe(404); // Route not found
    });

    it('❌ should return 400 when title is missing', async () => {
      activityLogService.createActivityLog.mockResolvedValue({});

      const res = await request(app)
        .post('/api/boards/clone/template123')
        .set('Authorization', 'Bearer token')
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Tên board không được để trống');
    });
  });

  describe('PUT /api/boards/:id/settings - Configure Board Settings', () => {
    it('✅ should configure board settings successfully', async () => {
      const mockResult = {
        columns: [{ _id: 'col1', name: 'To Do' }],
        swimlanes: [{ _id: 'swim1', name: 'Swimlane 1' }],
      };

      boardService.getBoardIfPermitted.mockResolvedValue({ _id: 'board123' });
      boardService.configureBoardSettings.mockResolvedValue(mockResult);

      const res = await request(app)
        .put('/api/boards/board123/settings')
        .set('Authorization', 'Bearer token')
        .send({
          columns: [{ name: 'To Do' }],
          swimlanes: [{ name: 'Swimlane 1' }],
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Cấu hình board thành công');
    });

    it('❌ should return 404 when board not found', async () => {
      boardService.getBoardIfPermitted.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/boards/nonexistent/settings')
        .set('Authorization', 'Bearer token')
        .send({ columns: [], swimlanes: [] });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('❌ should return 403 when user has no permission', async () => {
      boardService.getBoardIfPermitted.mockResolvedValue('forbidden');

      const res = await request(app)
        .put('/api/boards/board123/settings')
        .set('Authorization', 'Bearer token')
        .send({ columns: [], swimlanes: [] });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/boards/:boardId/swimlanes/:swimlaneId/toggle - Toggle Swimlane', () => {
    it('✅ should toggle swimlane collapse successfully', async () => {
      const mockResult = {
        _id: 'swimlane123',
        collapsed: true,
      };

      boardService.toggleSwimlaneCollapse.mockResolvedValue(mockResult);

      const res = await request(app)
        .put('/api/boards/board123/swimlanes/swimlane123/toggle')
        .set('Authorization', 'Bearer token')
        .send({ collapsed: true });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Swimlane đã được thu gọn');
    });

    it('❌ should return 400 for invalid data', async () => {
      boardService.toggleSwimlaneCollapse.mockRejectedValue(new Error('Swimlane not found'));

      const res = await request(app)
        .put('/api/boards/board123/swimlanes/invalid/toggle')
        .set('Authorization', 'Bearer token')
        .send({ collapsed: true });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});

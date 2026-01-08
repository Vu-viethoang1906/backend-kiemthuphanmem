// 📄 tests/unit/boardMember.controller.test.js - Board Member Controller Unit Tests
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: 'user123',
      _id: 'user123',
      roles: ['admin', 'System_Manager', 'VIEW_BOARD', 'BOARD_MANAGE_MEMBERS', 'BOARD_UPDATE'],
    };
    next();
  },
  authorizeAny: requiredRoles => (req, res, next) => {
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
  adminAny: (req, res, next) => next(),
}));

// Mock board member service
jest.mock('../../services/boardMember.service', () => ({
  getBoardsByUser: jest.fn(),
  selectAll: jest.fn(),
  addMember: jest.fn(),
  getMembers: jest.fn(),
  updateRole: jest.fn(),
  removeMember: jest.fn(),
}));

jest.mock('../../repositories/boardMember.repository', () => ({
  findByBoardId: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../repositories/board.repository', () => ({
  findById: jest.fn().mockResolvedValue({ _id: 'board123', title: 'Test Board' }),
}));

jest.mock('../../config/socket', () => ({
  emitToUser: jest.fn(),
  emitToUsers: jest.fn(),
  broadcast: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const boardMemberRouter = require('../../router/boardMember.routes');

const app = express();
app.use(express.json());
app.use('/api/boardMembers', boardMemberRouter);

describe('🔹 Board Member Controller Unit Tests', () => {
  const boardMemberService = require('../../services/boardMember.service');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/boardMembers/user/boards - Get Boards By User', () => {
    it('✅ should return boards for current user', async () => {
      const mockBoards = [
        { _id: 'board1', name: 'Board 1' },
        { _id: 'board2', name: 'Board 2' },
      ];

      boardMemberService.getBoardsByUser.mockResolvedValue(mockBoards);

      const res = await request(app).get('/api/boardMembers/user/boards').query({ roles: 'admin' }); // Query params are strings, not arrays

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveLength(2);
      // Controller converts query param to array if needed
      expect(boardMemberService.getBoardsByUser).toHaveBeenCalledWith('user123', expect.any(Array));
    });

    it('✅ should handle empty roles array', async () => {
      const mockBoards = [];
      boardMemberService.getBoardsByUser.mockResolvedValue(mockBoards);

      const res = await request(app).get('/api/boardMembers/user/boards');

      expect(res.status).toBe(200);
      expect(boardMemberService.getBoardsByUser).toHaveBeenCalledWith('user123', []);
    });
  });

  describe('GET /api/boardMembers/all - Select All', () => {
    it('✅ should return all board members', async () => {
      const mockMembers = [
        { _id: 'member1', board_id: 'board1', user_id: 'user1' },
        { _id: 'member2', board_id: 'board2', user_id: 'user2' },
      ];

      boardMemberService.selectAll.mockResolvedValue(mockMembers);

      const res = await request(app).get('/api/boardMembers/all');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveLength(2);
      expect(boardMemberService.selectAll).toHaveBeenCalled();
    });
  });

  describe('POST /api/boardMembers/board/:board_id - Add Member', () => {
    it('✅ should add member to board successfully', async () => {
      const mockMember = {
        _id: 'member123',
        board_id: 'board123',
        user_id: 'user456',
        role_in_board: 'Member',
      };

      boardMemberService.addMember.mockResolvedValue(mockMember);

      const res = await request(app)
        .post('/api/boardMembers/board/board123')
        .send({ user_id: 'user456', role_in_board: 'Member' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', 'member123');
      expect(boardMemberService.addMember).toHaveBeenCalledWith({
        requester_id: 'user123',
        user_id: 'user456',
        board_id: 'board123',
        role_in_board: 'Member',
      });
    });

    it('❌ should return 400 for service error', async () => {
      boardMemberService.addMember.mockRejectedValue(new Error('User already a member'));

      const res = await request(app)
        .post('/api/boardMembers/board/board123')
        .send({ user_id: 'user456', role_in_board: 'Member' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/boardMembers/board/:board_id - Get Members', () => {
    it('✅ should return members of a board', async () => {
      const mockMembers = [
        { _id: 'member1', user_id: 'user1', role_in_board: 'Admin' },
        { _id: 'member2', user_id: 'user2', role_in_board: 'Member' },
      ];

      boardMemberService.getMembers.mockResolvedValue(mockMembers);

      const res = await request(app).get('/api/boardMembers/board/board123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveLength(2);
      expect(boardMemberService.getMembers).toHaveBeenCalledWith('board123');
    });

    it('❌ should return 400 when board_id is missing', async () => {
      // Test controller directly
      const boardMemberController = require('../../controllers/boardMember.controller');
      const mockReq = {
        params: {},
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await boardMemberController.getMembers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'board_id là bắt buộc',
      });
    });
  });

  describe('PUT /api/boardMembers/board/:board_id/user/:user_id - Update Role', () => {
    it('✅ should update member role successfully', async () => {
      const mockUpdated = {
        _id: 'member123',
        role_in_board: 'Admin',
      };

      boardMemberService.updateRole.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put('/api/boardMembers/board/board123/user/user456')
        .send({ role_in_board: 'Admin' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('role_in_board', 'Admin');
      expect(boardMemberService.updateRole).toHaveBeenCalledWith(
        'user123',
        'user456',
        'board123',
        'Admin'
      );
    });
  });

  describe('DELETE /api/boardMembers/board/:board_id/user/:user_id - Remove Member', () => {
    it('✅ should remove member from board successfully', async () => {
      boardMemberService.removeMember.mockResolvedValue(true);

      const res = await request(app).delete('/api/boardMembers/board/board123/user/user456');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Xoá thành viên thành công');
      expect(boardMemberService.removeMember).toHaveBeenCalledWith(
        'user123',
        'user456',
        'board123'
      );
    });
  });
});

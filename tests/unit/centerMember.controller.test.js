jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: 'user123', _id: 'user123' };
    next();
  },
  authorizeAny: requiredRoles => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock center member service
jest.mock('../../services/centerMember.service', () => ({
  addMember: jest.fn(),
  getCentersByUser: jest.fn(),
  getMembersByCenter: jest.fn(),
  removeMember: jest.fn(),
  getAll: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const centerMemberRouter = require('../../router/centerMember.route');

const app = express();
app.use(express.json());
app.use('/api/centerMembers', centerMemberRouter);

describe('🔹 Center Member Controller Unit Tests', () => {
  const centerMemberService = require('../../services/centerMember.service');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/centerMembers - Add Member', () => {
    it('✅ should add member to center successfully', async () => {
      const mockMember = {
        _id: 'member123',
        center_id: 'center123',
        user_id: 'user123',
        role_in_center: 'Member',
      };

      centerMemberService.addMember.mockResolvedValue(mockMember);

      const memberData = {
        center_id: 'center123',
        user_id: 'user123',
        role_in_center: 'Member',
      };

      const res = await request(app).post('/api/centerMembers').send(memberData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(centerMemberService.addMember).toHaveBeenCalledWith('center123', 'user123', 'Member');
    });

    it('❌ should return 400 for invalid data', async () => {
      centerMemberService.addMember.mockRejectedValue(new Error('center_id is required'));

      const res = await request(app).post('/api/centerMembers').send({ user_id: 'user123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'center_id is required');
    });
  });

  describe('GET /api/centerMembers/my-centers - Get Centers By User', () => {
    it('✅ should return centers for current user', async () => {
      const mockCenters = [
        { _id: 'center1', name: 'Center 1' },
        { _id: 'center2', name: 'Center 2' },
      ];

      centerMemberService.getCentersByUser.mockResolvedValue(mockCenters);

      const res = await request(app).get('/api/centerMembers/my-centers');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(centerMemberService.getCentersByUser).toHaveBeenCalledWith('user123');
    });

    it('❌ should return 400 for service error', async () => {
      centerMemberService.getCentersByUser.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/centerMembers/my-centers');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/centerMembers/:center_id/members - Get Members By Center', () => {
    it('✅ should return members of a center', async () => {
      const mockMembers = [
        { _id: 'member1', user_id: 'user1', role_in_center: 'Admin' },
        { _id: 'member2', user_id: 'user2', role_in_center: 'Member' },
      ];

      centerMemberService.getMembersByCenter.mockResolvedValue(mockMembers);

      const res = await request(app).get('/api/centerMembers/center123/members');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(centerMemberService.getMembersByCenter).toHaveBeenCalledWith('center123');
    });

    it('❌ should return 400 for invalid center_id', async () => {
      centerMemberService.getMembersByCenter.mockRejectedValue(new Error('Center không tồn tại'));

      const res = await request(app).get('/api/centerMembers/invalid/members');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/centerMembers/:id - Remove Member', () => {
    it('✅ should remove member successfully', async () => {
      centerMemberService.removeMember.mockResolvedValue(true);

      const res = await request(app).delete('/api/centerMembers/member123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Xóa thành viên thành công');
      expect(centerMemberService.removeMember).toHaveBeenCalledWith('member123');
    });

    it('❌ should return 400 for non-existent member', async () => {
      centerMemberService.removeMember.mockRejectedValue(new Error('Thành viên không tồn tại'));

      const res = await request(app).delete('/api/centerMembers/nonexistent');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/centerMembers - Get All', () => {
    it('✅ should return all center members', async () => {
      const mockMembers = [
        { _id: 'member1', center_id: 'center1', user_id: 'user1' },
        { _id: 'member2', center_id: 'center2', user_id: 'user2' },
      ];

      centerMemberService.getAll.mockResolvedValue(mockMembers);

      const res = await request(app).get('/api/centerMembers');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(centerMemberService.getAll).toHaveBeenCalled();
    });

    it('✅ should handle empty result', async () => {
      centerMemberService.getAll.mockResolvedValue([]);

      const res = await request(app).get('/api/centerMembers');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });
});

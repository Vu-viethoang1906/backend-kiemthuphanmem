// 📄 tests/unit/googleCalendar.controller.test.js - Google Calendar Controller Unit Tests
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: 'user123', _id: 'user123' };
    next();
  },
  authorizeAny: requiredRoles => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock Google Calendar service
jest.mock('../../services/googleCalendar.service', () => ({
  getAuthUrl: jest.fn(),
  authenticateUser: jest.fn(),
  getCalendarStatus: jest.fn(),
  enableSync: jest.fn(),
  disableSync: jest.fn(),
  shouldSync: jest.fn(),
  findEventByTaskId: jest.fn(),
  createCalendarEvent: jest.fn(),
  updateCalendarEvent: jest.fn(),
  updateLastSyncAt: jest.fn(),
  unsyncAll: jest.fn(),
  delete: jest.fn(),
}));

// Mock task service and repository
jest.mock('../../services/task.service', () => ({
  getTasksByUser: jest.fn(),
}));

jest.mock('../../repositories/task.repository', () => ({
  findById: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const googleCalendarRouter = require('../../router/googleCalendar.routes');

const app = express();
app.use(express.json());
app.use('/api/calendar', googleCalendarRouter);

describe('🔹 Google Calendar Controller Unit Tests', () => {
  const googleCalendarService = require('../../services/googleCalendar.service');
  const taskService = require('../../services/task.service');
  const taskRepo = require('../../repositories/task.repository');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'test';
  });

  describe('GET /api/calendar/auth/url - Get Auth URL', () => {
    it('✅ should return auth URL successfully', async () => {
      const mockAuthUrl = 'https://accounts.google.com/o/oauth2/auth?client_id=test';

      googleCalendarService.getAuthUrl.mockReturnValue(mockAuthUrl);

      const res = await request(app).get('/api/calendar/auth/url');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('authUrl', mockAuthUrl);
      expect(googleCalendarService.getAuthUrl).toHaveBeenCalled();
    });

    it('❌ should return 400 for service error', async () => {
      googleCalendarService.getAuthUrl.mockImplementation(() => {
        throw new Error('Service error');
      });

      const res = await request(app).get('/api/calendar/auth/url');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/calendar/auth/callback - Handle Callback', () => {
    it('✅ should handle callback successfully with code', async () => {
      const mockConfig = {
        is_sync_enabled: true,
      };

      googleCalendarService.authenticateUser.mockResolvedValue(mockConfig);

      const res = await request(app)
        .get('/api/calendar/auth/callback')
        .query({ code: 'auth-code-123' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('calendar?connected=true');
      expect(googleCalendarService.authenticateUser).toHaveBeenCalledWith('auth-code-123');
    });

    it('❌ should redirect with error when oauth error occurs', async () => {
      const res = await request(app)
        .get('/api/calendar/auth/callback')
        .query({ error: 'access_denied' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('calendar?error=');
    });

    it('❌ should redirect with error when code is missing', async () => {
      const res = await request(app).get('/api/calendar/auth/callback');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('calendar?error=');
    });

    it('❌ should redirect with error when service fails', async () => {
      googleCalendarService.authenticateUser.mockRejectedValue(new Error('Authentication failed'));

      const res = await request(app)
        .get('/api/calendar/auth/callback')
        .query({ code: 'invalid-code' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('calendar?error=');
    });
  });

  describe('GET /api/calendar/status - Get Calendar Status', () => {
    it('✅ should return calendar status successfully', async () => {
      const mockStatus = {
        isConnected: true,
        isSyncEnabled: true,
      };

      googleCalendarService.getCalendarStatus.mockResolvedValue(mockStatus);

      const res = await request(app).get('/api/calendar/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.isConnected).toBe(true);
      expect(googleCalendarService.getCalendarStatus).toHaveBeenCalledWith('user123');
    });

    it('❌ should return 401 when user is not authenticated', async () => {
      // Test controller directly without user
      const googleCalendarController = require('../../controllers/googleCalendar.controller');
      const mockReq = {
        user: undefined, // No user
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await googleCalendarController.getStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không có quyền truy cập',
      });
    });
  });

  describe('POST /api/calendar/sync/enable - Enable Sync', () => {
    it('✅ should enable sync successfully', async () => {
      const mockConfig = {
        is_sync_enabled: true,
        sync_filter: { only_with_dates: true },
      };

      googleCalendarService.enableSync.mockResolvedValue(mockConfig);

      const res = await request(app)
        .post('/api/calendar/sync/enable')
        .send({ sync_filter: { only_with_dates: true } });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Đã bật đồng bộ Google Calendar');
      expect(res.body.data.isSyncEnabled).toBe(true);
      expect(googleCalendarService.enableSync).toHaveBeenCalledWith('user123', {
        only_with_dates: true,
      });
    });

    it('❌ should return 401 when user is not authenticated', async () => {
      // Test controller directly without user
      const googleCalendarController = require('../../controllers/googleCalendar.controller');
      const mockReq = {
        body: { sync_filter: {} },
        user: undefined, // No user
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await googleCalendarController.enableSync(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không có quyền truy cập',
      });
    });
  });

  describe('POST /api/calendar/sync/disable - Disable Sync', () => {
    it('✅ should disable sync successfully', async () => {
      googleCalendarService.disableSync.mockResolvedValue(true);

      const res = await request(app).post('/api/calendar/sync/disable');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Đã tắt đồng bộ Google Calendar');
      expect(googleCalendarService.disableSync).toHaveBeenCalledWith('user123');
    });
  });

  describe('POST /api/calendar/sync/task/:taskId - Sync Task', () => {
    it('✅ should sync task successfully', async () => {
      const mockTask = {
        _id: 'task123',
        assigned_to: { _id: 'user123' },
        title: 'Test Task',
      };

      taskRepo.findById.mockResolvedValue(mockTask);
      googleCalendarService.shouldSync.mockResolvedValue(true);
      googleCalendarService.findEventByTaskId.mockResolvedValue(null);
      googleCalendarService.createCalendarEvent.mockResolvedValue('event123');

      const res = await request(app).post('/api/calendar/sync/task/task123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Đồng bộ task thành công');
      expect(googleCalendarService.createCalendarEvent).toHaveBeenCalled();
    });

    it('✅ should update existing event', async () => {
      const mockTask = {
        _id: 'task123',
        assigned_to: { _id: 'user123' },
        title: 'Test Task',
      };

      taskRepo.findById.mockResolvedValue(mockTask);
      googleCalendarService.shouldSync.mockResolvedValue(true);
      googleCalendarService.findEventByTaskId.mockResolvedValue('event123');
      googleCalendarService.updateCalendarEvent.mockResolvedValue(true);

      const res = await request(app).post('/api/calendar/sync/task/task123');

      expect(res.status).toBe(200);
      expect(googleCalendarService.updateCalendarEvent).toHaveBeenCalled();
    });

    it('❌ should return 404 for non-existent task', async () => {
      taskRepo.findById.mockResolvedValue(null);

      const res = await request(app).post('/api/calendar/sync/task/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Task không tồn tại');
    });

    it('❌ should return 403 when user is not assigned to task', async () => {
      const mockTask = {
        _id: 'task123',
        assigned_to: { _id: 'otheruser' },
      };

      taskRepo.findById.mockResolvedValue(mockTask);

      const res = await request(app).post('/api/calendar/sync/task/task123');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Bạn không có quyền đồng bộ task này');
    });

    it("❌ should return 400 when task doesn't meet sync filter", async () => {
      const mockTask = {
        _id: 'task123',
        assigned_to: { _id: 'user123' },
      };

      taskRepo.findById.mockResolvedValue(mockTask);
      googleCalendarService.shouldSync.mockResolvedValue(false);

      const res = await request(app).post('/api/calendar/sync/task/task123');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Task này không thỏa điều kiện sync filter');
    });
  });

  describe('POST /api/calendar/sync/all - Sync All Tasks', () => {
    it('✅ should sync all tasks successfully', async () => {
      const mockTasks = [
        { _id: 'task1', toObject: () => ({ _id: 'task1', title: 'Task 1' }) },
        { _id: 'task2', toObject: () => ({ _id: 'task2', title: 'Task 2' }) },
      ];

      const mockStatus = {
        isConnected: true,
        isSyncEnabled: true,
      };

      googleCalendarService.getCalendarStatus.mockResolvedValue(mockStatus);
      taskService.getTasksByUser.mockResolvedValue(mockTasks);
      googleCalendarService.shouldSync.mockResolvedValue(true);
      googleCalendarService.findEventByTaskId.mockResolvedValue(null);
      googleCalendarService.createCalendarEvent.mockResolvedValue('event123');

      const res = await request(app).post('/api/calendar/sync/all');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.successCount).toBe(2);
      expect(res.body.data.total).toBe(2);
    });

    it('❌ should return 400 when not connected or sync disabled', async () => {
      const mockStatus = {
        isConnected: false,
        isSyncEnabled: false,
      };

      googleCalendarService.getCalendarStatus.mockResolvedValue(mockStatus);

      const res = await request(app).post('/api/calendar/sync/all');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty(
        'message',
        'Chưa kết nối Google Calendar hoặc sync đã bị tắt'
      );
    });
  });

  describe('POST /api/calendar/unsync/all - Unsync All', () => {
    it('✅ should unsync all events successfully', async () => {
      const mockResult = {
        deletedCount: 5,
        errorCount: 0,
      };

      googleCalendarService.unsyncAll.mockResolvedValue(mockResult);
      googleCalendarService.delete.mockResolvedValue({ success: true });

      const res = await request(app).post('/api/calendar/unsync/all');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('5 events');
      expect(res.body.data.deletedCount).toBe(5);
      expect(googleCalendarService.unsyncAll).toHaveBeenCalledWith('user123');
    });

    it('❌ should return 401 when user is not authenticated', async () => {
      // Test controller directly without user
      const googleCalendarController = require('../../controllers/googleCalendar.controller');
      const mockReq = {
        user: undefined, // No user
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await googleCalendarController.unsyncAll(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không có quyền truy cập',
      });
    });
  });
});

// 📄 tests/integration/taskApi.test.js - Task API Integration Tests
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

const taskRouter = require('../../router/task.routes');
const Task = require('../../models/task.model');
const Board = require('../../models/board.model');
const BoardMember = require('../../models/boardMember.model');
const Column = require('../../models/column.model');
const Swimlane = require('../../models/swimlane.model');
const User = require('../../models/usersModel');
const TaskTag = require('../../models/taskTag.model');
const Tag = require('../../models/tag.model');

// Mock middleware để bypass authentication
const mockTestUserId = '507f1f77bcf86cd799439011';
// Mock ApiKeyService để không gọi database thật
jest.mock('../../services/apiKey.service', () => ({
  getApiKeyByDescription: jest.fn().mockResolvedValue({
    key: 'fake_encrypted_key', // giá trị dummy
  }),
}));

// Mock GoogleCalendarService nếu cần
jest.mock('../../services/googleCalendar.service', () => {
  const originalModule = jest.requireActual('../../services/googleCalendar.service');
  return {
    ...originalModule,
    GoogleCalendarService: jest.fn().mockImplementation(() => ({
      _initOAuth2Client: jest.fn(),
      // mock các method khác nếu cần
    })),
  };
});
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: mockTestUserId,
      roles: ['admin', 'System_Manager'],
      email: 'test@example.com',
      username: 'testuser',
    };
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock notification service để tránh gửi email thật
jest.mock('../../services/notification.service', () => ({
  createNotification: jest.fn().mockResolvedValue({ _id: 'notification123' }),
}));

// Mock socket để tránh kết nối socket thật
jest.mock('../../config/socket', () => ({
  sendNotification: jest.fn(),
}));

// Mock sendNotify để tránh gửi email thật
jest.mock('../../config/sendNotify', () => ({
  sendNotificationToAll: jest.fn().mockResolvedValue(),
}));

describe('🔹 Task API Integration Tests', () => {
  let app;
  let testBoardId;
  let testColumnId;
  let testSwimlaneId;
  let testTaskId;
  let testUserId;

  beforeAll(async () => {
    // Kết nối database test
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    // Tạo test user nếu chưa có
    const existingUser = await User.findById(mockTestUserId);
    if (!existingUser) {
      await User.create({
        _id: new mongoose.Types.ObjectId(mockTestUserId),
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        status: 'active',
        typeAccount: 'Local',
      });
    }
    testUserId = mockTestUserId;

    app = express();
    app.use(express.json());
    app.use('/api/tasks', taskRouter);
  });

  beforeEach(async () => {
    // Cleanup trước mỗi test
    await Task.deleteMany({ title: { $regex: /^\[TEST\]/ } });
    await TaskTag.deleteMany({});
    await Tag.deleteMany({ name: { $regex: /^\[TEST\]/ } });

    // Tạo test board
    const board = await Board.create({
      title: `[TEST] Task Test Board ${Date.now()}`,
      created_by: new mongoose.Types.ObjectId(testUserId),
    });
    testBoardId = board._id;

    // Tạo board member
    await BoardMember.create({
      board_id: testBoardId,
      user_id: new mongoose.Types.ObjectId(testUserId),
      role_in_board: 'Người tạo',
      Creator: true,
    });

    // Tạo test column
    const column = await Column.create({
      board_id: testBoardId,
      name: 'To Do',
      order: 0,
      isDone: false,
    });
    testColumnId = column._id;

    // Tạo test swimlane
    const swimlane = await Swimlane.create({
      board_id: testBoardId,
      name: 'Default',
      order: 0,
    });
    testSwimlaneId = swimlane._id;
  });

  afterAll(async () => {
    // Cleanup sau tất cả tests
    await Task.deleteMany({ title: { $regex: /^\[TEST\]/ } });
    await TaskTag.deleteMany({});
    await Tag.deleteMany({ name: { $regex: /^\[TEST\]/ } });
    await Board.deleteMany({ title: { $regex: /^\[TEST\]/ } });
    await BoardMember.deleteMany({});
    await Column.deleteMany({});
    await Swimlane.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('POST /api/tasks - Create Task', () => {
    it('✅ should create task with real data', async () => {
      const timestamp = Date.now();
      const taskData = {
        title: `[TEST] Integration Test Task ${timestamp}`,
        description: 'Task created for integration testing',
        board_id: testBoardId.toString(),
        column_id: testColumnId.toString(),
        swimlane_id: testSwimlaneId.toString(),
        priority: 'High',
        start_date: '2024-01-01',
        due_date: '2024-01-31',
        estimate_hours: 8,
      };

      const res = await request(app).post('/api/tasks').send(taskData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Tạo task thành công');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.title).toBe(`[TEST] Integration Test Task ${timestamp}`);
      expect(res.body.data.board_id.toString()).toBe(testBoardId.toString());
      expect(res.body.data.column_id.toString()).toBe(testColumnId.toString());

      // Lưu ID để dùng cho các test khác
      testTaskId = res.body.data._id;
    });

    it('✅ should create task with minimal required fields', async () => {
      const timestamp = Date.now();
      const taskData = {
        title: `[TEST] Minimal Task ${timestamp}`,
        board_id: testBoardId.toString(),
        column_id: testColumnId.toString(),
      };

      const res = await request(app).post('/api/tasks').send(taskData);

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(`[TEST] Minimal Task ${timestamp}`);
    });

    it('✅ should create task with tag', async () => {
      // Tạo tag trước
      const tag = await Tag.create({
        name: `[TEST] Task Tag ${Date.now()}`,
        color: '#ff0000',
        board_id: testBoardId,
      });

      const timestamp = Date.now();
      const taskData = {
        title: `[TEST] Task With Tag ${timestamp}`,
        board_id: testBoardId.toString(),
        column_id: testColumnId.toString(),
        nameTag: tag.name,
      };

      const res = await request(app).post('/api/tasks').send(taskData);

      // Log response để debug nếu fail
      if (res.status !== 201) {
      }

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(`[TEST] Task With Tag ${timestamp}`);

      // Verify tag được gán
      const taskTag = await TaskTag.findOne({ task_id: res.body.data._id });
      expect(taskTag).not.toBeNull();
    });

    it('❌ should reject task without required fields', async () => {
      const taskData = {
        description: 'Missing title and board_id',
      };

      const res = await request(app).post('/api/tasks').send(taskData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('❌ should reject task with invalid date range', async () => {
      const taskData = {
        title: '[TEST] Invalid Date Task',
        board_id: testBoardId.toString(),
        column_id: testColumnId.toString(),
        start_date: '2024-01-31',
        due_date: '2024-01-01', // Invalid: start > due
      };

      const res = await request(app).post('/api/tasks').send(taskData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/:id - Get Task By ID', () => {
    it('✅ should return task detail from database', async () => {
      // Tạo test task
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Detail Task ${timestamp}`,
        description: 'Task for detail test',
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const res = await request(app).get(`/api/tasks/${task._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.title).toBe(`[TEST] Detail Task ${timestamp}`);
      expect(res.body.data._id).toBe(task._id.toString());
    });

    it('❌ should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/tasks/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Task không tồn tại');
    });
  });

  describe('GET /api/tasks/board/:board_id - Get Tasks By Board', () => {
    it('✅ should return tasks for a board', async () => {
      // Tạo test tasks
      const timestamp = Date.now();
      await Task.create({
        title: `[TEST] Board Task 1 ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });
      await Task.create({
        title: `[TEST] Board Task 2 ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 20,
      });

      const res = await request(app).get(`/api/tasks/board/${testBoardId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);

      // Kiểm tra có task với title chứa [TEST]
      const testTasks = res.body.data.filter(
        task => task && task.title && task.title.includes('[TEST]')
      );
      expect(testTasks.length).toBeGreaterThanOrEqual(2);
    });

    it('✅ should handle query parameters for filtering', async () => {
      const res = await request(app)
        .get(`/api/tasks/board/${testBoardId}`)
        .query({ column_id: testColumnId.toString(), page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/tasks/column/:column_id - Get Tasks By Column', () => {
    it('✅ should return tasks for a column', async () => {
      // Tạo test tasks
      const timestamp = Date.now();
      await Task.create({
        title: `[TEST] Column Task 1 ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const res = await request(app).get(`/api/tasks/column/${testColumnId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/tasks/my/assigned - Get My Tasks', () => {
    it('✅ should return tasks assigned to current user', async () => {
      // Tạo test task assigned to user
      const timestamp = Date.now();
      await Task.create({
        title: `[TEST] My Assigned Task ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        assigned_to: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const res = await request(app).get('/api/tasks/my/assigned');

      // Log response để debug nếu fail
      if (res.status !== 200) {
      }

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PUT /api/tasks/:id - Update Task', () => {
    it('✅ should update task in database', async () => {
      // Tạo test task
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Update Task ${timestamp}`,
        description: 'Original description',
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const updateData = {
        title: `[TEST] Updated Task ${timestamp}`,
        description: 'Updated description',
        priority: 'Medium',
      };

      const res = await request(app).put(`/api/tasks/${task._id}`).send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Cập nhật task thành công');
      expect(res.body.data.title).toBe(`[TEST] Updated Task ${timestamp}`);
      expect(res.body.data.description).toBe('Updated description');

      // Verify trong database
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.title).toBe(`[TEST] Updated Task ${timestamp}`);
      expect(updatedTask.description).toBe('Updated description');
    });

    it('✅ should update task with tag', async () => {
      // Tạo task và tag
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Update Tag Task ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const tag = await Tag.create({
        name: `[TEST] Update Tag ${timestamp}`,
        color: '#ff0000',
        board_id: testBoardId,
      });

      const updateData = {
        title: `[TEST] Updated With Tag ${timestamp}`,
        nameTag: tag.name,
      };

      const res = await request(app).put(`/api/tasks/${task._id}`).send(updateData);

      // Log response để debug nếu fail
      if (res.status !== 200) {
      }

      expect(res.status).toBe(200);

      // Verify tag được gán
      const taskTag = await TaskTag.findOne({ task_id: task._id });
      expect(taskTag).not.toBeNull();
    });
  });

  describe('DELETE /api/tasks/:id - Delete Task', () => {
    it('✅ should soft delete task in database', async () => {
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Delete Task ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const res = await request(app).delete(`/api/tasks/${task._id}`);

      // Debug info
      if (res.status !== 200) {
        console.error('DELETE TASK response status:', res.status);
        console.error('DELETE TASK response body:', JSON.stringify(res.body, null, 2));
      }

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Xóa task thành công');
      const deletedTask = await Task.findOne({
        _id: task._id,
        deleted_at: { $ne: null },
      });
      expect(deletedTask).not.toBeNull();
      expect(deletedTask.deleted_at).not.toBeNull();
    });
  });

  describe('PUT /api/tasks/:id/move - Move Task (Drag & Drop)', () => {
    it('✅ should move task to different column', async () => {
      // Tạo task và column mới
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Move Task ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const newColumn = await Column.create({
        board_id: testBoardId,
        name: 'In Progress',
        order: 1,
        isDone: false,
      });

      const moveData = {
        new_column_id: newColumn._id.toString(),
        prev_task_id: null,
        next_task_id: null,
      };

      const res = await request(app).put(`/api/tasks/${task._id}/move`).send(moveData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Di chuyển task thành công');
      expect(res.body.data).toHaveProperty('data');

      // Verify trong database
      const movedTask = await Task.findById(task._id);
      expect(movedTask.column_id.toString()).toBe(newColumn._id.toString());
    });
  });

  describe('GET /api/tasks/board/:board_id/search - Search Tasks', () => {
    it('✅ should search tasks successfully', async () => {
      // Tạo test task
      const timestamp = Date.now();
      await Task.create({
        title: `[TEST] Searchable Task ${timestamp}`,
        description: 'This task can be searched',
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const res = await request(app)
        .get(`/api/tasks/board/${testBoardId}/search`)
        .query({ q: 'Searchable' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('❌ should return 400 for missing search query', async () => {
      const res = await request(app).get(`/api/tasks/board/${testBoardId}/search`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Từ khóa tìm kiếm là bắt buộc');
    });
  });
  //
  describe('GET /api/tasks/board/:board_id/stats - Get Task Stats', () => {
    it('✅ should return task statistics', async () => {
      // Tạo test tasks
      const timestamp = Date.now();
      await Task.create({
        title: `[TEST] Stats Task 1 ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const res = await request(app).get(`/api/tasks/board/${testBoardId}/stats`);

      // Log response để debug nếu fail
      if (res.status !== 200) {
      }

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('total_tasks');
      expect(res.body.data).toHaveProperty('by_column');
      expect(res.body.data).toHaveProperty('overdue_tasks');
      expect(res.body.data).toHaveProperty('completed_tasks');
    });
  });

  describe('PUT /api/tasks/:id/dates - Update Task Dates', () => {
    it('✅ should update task dates successfully', async () => {
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Date Task ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const dateData = {
        start_date: new Date('2024-01-01').toISOString(),
        due_date: new Date('2024-01-31').toISOString(),
      };

      const res = await request(app).put(`/api/tasks/${task._id}/dates`).send(dateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Cập nhật ngày thành công');
      expect(res.body.data).toHaveProperty('start_date');
      expect(res.body.data).toHaveProperty('due_date');
    });
  });

  describe('PUT /api/tasks/:id/estimate - Update Estimate Hours', () => {
    it('✅ should update estimate hours successfully', async () => {
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Estimate Task ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const estimateData = {
        estimate_hours: 8,
      };

      const res = await request(app).put(`/api/tasks/${task._id}/estimate`).send(estimateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Cập nhật thời gian ước tính thành công');
      expect(res.body.data.estimate_hours).toBe(8);
    });

    it('❌ should return 400 for missing estimate_hours', async () => {
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Estimate Task ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const res = await request(app).put(`/api/tasks/${task._id}/estimate`).send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('estimate_hours là bắt buộc');
    });
  });

  describe('GET /api/tasks/board/:board_id/column/:column_id - Get Tasks By Board And Column', () => {
    it('✅ should return tasks for board and column', async () => {
      // Tạo test task
      const timestamp = Date.now();
      await Task.create({
        title: `[TEST] Board Column Task ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      const res = await request(app).get(`/api/tasks/board/${testBoardId}/column/${testColumnId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/tasks/board/:board_id/lineChart - Get Line Chart Data', () => {
    it('✅ should return line chart data', async () => {
      // Tạo test task với done_at
      const timestamp = Date.now();
      await Task.create({
        title: `[TEST] Line Chart Task ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
        done_at: new Date(),
        estimate_hours: 4,
      });

      const res = await request(app).post(`/api/tasks/board/${testBoardId}/lineChart`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('totalTask');
      expect(res.body.data).toHaveProperty('data');
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });
  });

  describe('Database Operations', () => {
    it('✅ should handle database connection', async () => {
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    it('✅ should create and query tasks directly', async () => {
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Direct DB Test ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      expect(task._id).toBeDefined();
      expect(task.title).toBe(`[TEST] Direct DB Test ${timestamp}`);

      // Query task
      const foundTask = await Task.findById(task._id);
      expect(foundTask).toBeDefined();
      expect(foundTask.title).toBe(`[TEST] Direct DB Test ${timestamp}`);
    });
  });

  describe('Error Handling with Real Database', () => {
    it('❌ should handle invalid ObjectId', async () => {
      const res = await request(app).get('/api/tasks/invalid-id');

      // Có thể trả về 400 (validation error) hoặc 500 (server error)
      expect([400, 404, 500]).toContain(res.status);
    });

    it('✅ should filter soft-deleted tasks', async () => {
      const timestamp = Date.now();
      const task = await Task.create({
        title: `[TEST] Soft Deleted ${timestamp}`,
        board_id: testBoardId,
        column_id: testColumnId,
        created_by: new mongoose.Types.ObjectId(testUserId),
        position: 10,
      });

      // Soft delete
      await Task.findByIdAndUpdate(task._id, { deleted_at: new Date() });

      // Should not appear in list
      const res = await request(app).get(`/api/tasks/board/${testBoardId}`);
      const found = res.body.data.find(t => t._id === task._id.toString());
      expect(found).toBeUndefined();
    });
  });
});

// tests/integration/loginApi.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');

dotenv.config({ path: '.env.test' });

const groupRouter = require('../../router/group.routes');
const Role = require('../../models/role.model');
const usersModel = require('../../models/usersModel');
const roleModel = require('../../models/role.model');
const userRole = require('../../models/userRole.model');
const permissionModel = require('../../models/Permission.model');
const groupModel = require('../../models/group.model');
const groupMemberModel = require('../../models/groupMember.model');

// Mock middleware auth
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: '68f04aa8a8d72d344f0b9151',
      roles: [
        'admin',
        'System_Manager',
        'VIEW_GROUP_ALL',
        'CREATE_GROUP',
        'UPDATE_GROUP',
        'VIEW_GROUP',
        'DELETE_GROUP',
      ],
      email: 'admin@example.com',
      username: 'admin',
    };
    next();
  },
  authorizeAny: requiredRoles => (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasPermission = requiredRoles.split(' ').some(role => userRoles.includes(role));
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Yêu cầu quyền: ${requiredRoles}`,
      });
    }
    next();
  },
}));

let app;
let server;

describe('🔹 Integration Test: /api/groups', () => {
  beforeAll(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI không được định nghĩa trong .env.test');
    }
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    app = express();
    app.use(express.json());
    app.use('/api/groups', groupRouter);
    server = http.createServer(app);
  });

  beforeEach(async () => {
    // Clean before each test to ensure isolation
    await groupMemberModel.deleteMany({});
    await groupModel.deleteMany({});
    await userRole.deleteMany({});
    await permissionModel.deleteMany({});
    await roleModel.deleteMany({});
    await Role.deleteMany({});
    await usersModel.deleteMany({});
  });

  afterEach(async () => {
    // Cleanup theo thứ tự để tránh foreign key constraints
    await groupMemberModel.deleteMany({});
    await groupModel.deleteMany({});
    await userRole.deleteMany({});
    await permissionModel.deleteMany({});
    await roleModel.deleteMany({});
    await Role.deleteMany({});
    await usersModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('GET /api/groups/', () => {
    test('✅ Trả danh sách group', async () => {
      // Tạo user mới thay vì dùng hardcoded ID để tránh duplicate key error
      const user = await usersModel.create({
        email: `nhatx5-${Date.now()}@gmail.com`,
        username: `nhut-${Date.now()}`,
        password_hash: '123',
      });
      const userId = user._id;
      const groupId = new mongoose.Types.ObjectId();

      // Tạo group với center_id là userId
      const group = await groupModel.create({
        _id: groupId,
        center_id: userId.toString(),
        name: 'groupTest',
        description: 'test',
      });

      await groupMemberModel.create({
        group_id: groupId.toString(),
        user_id: userId.toString(),
        role_in_group: 'Người xem',
      });

      const res = await request(app).get('/api/groups/');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('name', 'groupTest');
    });

    test('✅ Trả danh sách group ko có group', async () => {
      const res = await request(app).get('/api/groups/');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/groups/', () => {
    test('tạo mới group thành công', async () => {
      // Sử dụng userId khớp với mock auth
      const userId = new mongoose.Types.ObjectId('68f04aa8a8d72d344f0b9151');
      await usersModel.create({
        _id: userId,
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
        password_hash: '123',
      });

      const data = {
        center_id: userId.toString(),
        name: 'groupTest',
        description: 'test',
      };
      const res = await request(app).post('/api/groups/').send(data);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('center_id', userId.toString());
    });

    test('tạo mới group thiếu centerID', async () => {
      const data = {
        name: 'groupTest',
        description: 'test',
      };
      const res = await request(app).post('/api/groups/').send(data);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('tạo mới group thiếu name', async () => {
      const data = {
        description: 'test',
      };
      const res = await request(app).post('/api/groups/').send(data);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Tên group là bắt buộc và phải là chuỗi hợp lệ');
    });
  });

  describe('PUT /api/group', () => {
    test('cập nhật thành công', async () => {
      // Sử dụng userId khớp với mock auth
      const userId = new mongoose.Types.ObjectId('68f04aa8a8d72d344f0b9151');
      const groupId = new mongoose.Types.ObjectId();

      // Tạo user trước với ID khớp với mock auth
      await usersModel.create({
        _id: userId,
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
        password_hash: '123',
      });

      await groupModel.create({
        _id: groupId,
        name: 'groupTestPut',
        center_id: userId.toString(),
        description: 'cập nhật',
      });
      await groupMemberModel.create({
        group_id: groupId.toString(),
        user_id: userId.toString(),
        role_in_group: 'Người tạo',
      });
      const data = {
        name: 'group',
      };
      const res = await request(app).put(`/api/groups/${groupId.toString()}`).send(data);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('name', 'group');
    });
    test('cập nhật bị trùng tên', async () => {
      // Sử dụng userId khớp với mock auth
      const userId = new mongoose.Types.ObjectId('68f04aa8a8d72d344f0b9151');
      const groupId1 = new mongoose.Types.ObjectId();
      const groupId2 = new mongoose.Types.ObjectId();

      // Tạo user trước với ID khớp với mock auth
      await usersModel.create({
        _id: userId,
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
        password_hash: '123',
      });

      await groupModel.create({
        _id: groupId1,
        name: 'groupTestPut',
        center_id: userId.toString(),
        description: 'cập nhật',
      });
      await groupModel.create({
        _id: groupId2,
        name: 'groupTestPut1',
        center_id: userId.toString(),
        description: 'cập nhật',
      });
      await groupMemberModel.create({
        group_id: groupId1.toString(),
        user_id: userId.toString(),
        role_in_group: 'Người tạo',
      });
      const data = {
        name: 'groupTestPut1',
      };
      const res = await request(app).put(`/api/groups/${groupId1.toString()}`).send(data);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Tên group đã tồn tại trong center này');
      //  expect(res.body.data).toHaveProperty("name", "group");
    });
  });
  describe('GET /api/groups/:id', () => {
    test('✅ Lấy group theo ID thành công', async () => {
      // Sử dụng userId khớp với mock auth
      const userId = new mongoose.Types.ObjectId('68f04aa8a8d72d344f0b9151');
      const groupId = new mongoose.Types.ObjectId();

      // Tạo user trước với ID khớp với mock auth
      await usersModel.create({
        _id: userId,
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
        password_hash: '123',
      });

      const group = await groupModel.create({
        _id: groupId,
        name: 'GroupGetById',
        center_id: userId.toString(),
        description: 'Test get group by ID',
      });

      const res = await request(app).get(`/api/groups/${groupId.toString()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('name', 'GroupGetById');
    });

    test('❌ Lấy group không tồn tại', async () => {
      const res = await request(app).get(`/api/groups/68f04aa8a8d72d344f0999`);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });
  describe('DELETE /api/groups/:id', () => {
    test('✅ Xóa group thành công khi là người tạo', async () => {
      // Sử dụng userId khớp với mock auth
      const userId = new mongoose.Types.ObjectId('68f04aa8a8d72d344f0b9151');
      const groupId = new mongoose.Types.ObjectId();

      // Tạo user trước với ID khớp với mock auth
      await usersModel.create({
        _id: userId,
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
        password_hash: '123',
      });

      await groupModel.create({
        _id: groupId,
        name: 'GroupToDelete',
        center_id: userId.toString(),
        description: 'Xóa group test',
      });

      await groupMemberModel.create({
        group_id: groupId.toString(),
        user_id: userId.toString(),
        role_in_group: 'Người tạo',
      });

      const res = await request(app).delete(`/api/groups/${groupId.toString()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Xoá group thành công');
    });

    test('❌ Xóa group không phải người tạo', async () => {
      // Tạo ObjectId mới để tránh duplicate key
      const userId = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();
      const groupId = new mongoose.Types.ObjectId();

      // Tạo users
      await usersModel.create({
        _id: userId,
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
        password_hash: '123',
      });
      await usersModel.create({
        _id: otherUserId,
        email: `other-${Date.now()}@example.com`,
        username: `otheruser-${Date.now()}`,
        password_hash: '123',
      });

      await groupModel.create({
        _id: groupId,
        name: 'GroupFailDelete',
        center_id: userId.toString(),
        description: 'Không được phép xóa',
      });

      await groupMemberModel.create({
        group_id: groupId.toString(),
        user_id: otherUserId.toString(),
        role_in_group: 'Người xem',
      });

      const res = await request(app).delete(`/api/groups/${groupId.toString()}`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/groups/admin/:id', () => {
    test('❌ Admin xóa group không tồn tại', async () => {
      const res = await request(app).delete('/api/groups/admin/68f04aa8a8d72d344f0999');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  //   describe("POST /api/groups/getBoarMember", () => {
  //     test("✅ Lấy bảng user thành công", async () => {
  //       // giả lập dữ liệu
  //       await usersModel.create({
  //         _id: "68f04aa8a8d72d344f0b9151",
  //         email: "nhatx5@gmail.com",
  //         username: "nhut",
  //         password_hash: "123",
  //       });

  //       await groupModel.create({
  //         _id: "68f04aa8a8d72d344f0b9152",
  //         center_id: "68f04aa8a8d72d344f0b9151",
  //         name: "groupBoard",
  //         description: "test",
  //       });

  //       const data = {
  //         idUser: "68f04aa8a8d72d344f0b9151",
  //         idGroup: "68f04aa8a8d72d344f0b9152",
  //       };

  //       const res = await request(app)
  //         .post("/api/groups/getBoarMember")
  //         .send(data);
  //       expect(res.status).toBe(200);
  //       expect(res.body).toHaveProperty("success", true);
  //     });

  //     test("❌ Thiếu idUser", async () => {
  //       const data = { idGroup: "68f04aa8a8d72d344f0b9152" };
  //       const res = await request(app)
  //         .post("/api/groups/getBoarMember")
  //         .send(data);
  //       expect(res.status).toBe(400);
  //     });
  //   });
});

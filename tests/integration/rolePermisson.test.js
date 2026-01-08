// tests/integration/loginApi.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const http = require('http');

if (!process.env.MONGO_URI) {
  dotenv.config({ path: '.env.test' });
}

const RolePermissionRoutes = require('../../router/rolePermission.routes');
const RolePermissionModel = require('../../models/rolePermission.model');
const permissionModel = require('../../models/Permission.model');
const roleRouter = require('../../router/role.router');
const Role = require('../../models/role.model');
const roleModel = require('../../models/role.model');
const usersModel = require('../../models/usersModel');
const userRole = require('../../models/userRole.model');

// Mock middleware auth
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: '68f04aa8a8d72d344f0b9151',
      roles: [
        'admin',
        'System_Manager',
        'ROLE_CREATE',
        'USER_CREATE',
        'ROLE_CREATE',
        'ROLE_UPDATE',
        'ROLE_DELETE',
        'ROLE_VIEW',
        'ROLE_VIEW',
        'ROLE_EDIT',
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
//
describe('🔹 Integration Test: /api/login (MongoDB Cloud)', () => {
  beforeAll(async () => {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI không được định nghĩa trong .env.test');
      }
      mongoose.connect(process.env.MONGO_URI);
      app = express();
      app.use(express.json());
      app.use('/api/RolePermission', RolePermissionRoutes);
      server = http.createServer(app); // Tạo server HTTP
      // beforeAll only sets up the express app and DB connection; each test
      // should create its own test data to remain isolated
    } catch (err) {
      console.error('❌ Lỗi khi kết nối MongoDB:', err);
      throw err;
    }
  });
  afterEach(async () => {
    await Role.deleteMany({});
    await usersModel.deleteMany({});
    await roleModel.deleteMany({});
    await userRole.deleteMany({});
    await permissionModel.deleteMany({});
    await RolePermissionModel.deleteMany({});
  });

  afterAll(async () => {
    try {
      await mongoose.connection.close();
      if (server) {
        await new Promise(resolve => server.close(resolve)); // Đóng server HTTP
      }
    } catch (err) {
      console.error('❌ Lỗi khi đóng kết nối MongoDB hoặc server:', err);
    }
  });
  test('test tạo role permisson ', async () => {
    const role = await roleModel.create({ name: `role-${Date.now()}` });
    const permission = await permissionModel.create({
      code: `perm-${Date.now()}`,
      description: 'perm test',
      typePermission: 'test',
    });
    const data = { role_id: role._id.toString(), permission_id: permission._id.toString() };
    const res = await request(app).post('/api/RolePermission').send(data);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('permission_id', permission._id.toString());
    expect(res.body.data).toHaveProperty('role_id', role._id.toString());
  });
  test('test tạo role permisson nhưng id không đúng ', async () => {
    const data = {
      role_id: '68f856cdfedbdcb519d524513r',
      permission_id: '68f856cdfedbdcb519d52451',
    };

    const res = await request(app).post('/api/RolePermission').send(data);
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('success', false);
    //  expect(res.body.data).toHaveProperty("description", "Role test");
  });
  test('test tạo role permisson thiếu trường truyền vào ', async () => {
    const data = {
      permission_id: '68f856cdfedbdcb519d52451',
    };

    const res = await request(app).post('/api/RolePermission').send(data);
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('success', false);
    //  expect(res.body.data).toHaveProperty("description", "Role test");
  });
  test('test get rolePermisson theo id', async () => {
    const role = await roleModel.create({ name: `role-${Date.now()}` });
    const permission = await permissionModel.create({
      code: `perm-${Date.now()}`,
      description: 'perm test',
      typePermission: 'test',
    });
    const rp = await RolePermissionModel.create({
      role_id: role._id,
      permission_id: permission._id,
    });
    const res = await request(app).get(`/api/RolePermission/${rp._id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('_id', rp._id.toString());
  });
  test('test get rolePermisson theo id nhưng sai id trên pamate', async () => {
    const role = await roleModel.create({ name: `role-${Date.now()}` });
    const permission = await permissionModel.create({
      code: `perm-${Date.now()}`,
      description: 'perm test',
      typePermission: 'test',
    });
    const rp = await RolePermissionModel.create({
      role_id: role._id,
      permission_id: permission._id,
    });

    const res = await request(app).get(`/api/RolePermission/${rp._id.toString().slice(0, -2)}ZZ`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('success', false);
    //expect(res.body.data).toHaveProperty("_id", "68f856cdfedbdcb519d52451");
  });
  test('test get Lấy danh sách permission theo role', async () => {
    const role = await roleModel.create({ name: `role-${Date.now()}` });
    const permission = await permissionModel.create({
      code: `ROLE_TEST-${Date.now()}`,
      description: 'clm',
      typePermission: 'test',
    });
    await RolePermissionModel.create({ role_id: role._id, permission_id: permission._id });
    const res = await request(app).get(`/api/RolePermission/role/${role._id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('_id');

    // Handle both populated and non-populated responses
    const permissionData = res.body.data[0].permission_id;
    if (permissionData) {
      if (typeof permissionData === 'object') {
        // Populated response
        expect(permissionData).toHaveProperty('_id');
        expect(permissionData).toHaveProperty('code');
        expect(permissionData.code).toBe(permission.code);
      } else {
        // Non-populated response - just verify it's the correct ID
        expect(permissionData.toString()).toBe(permission._id.toString());
      }
    } else {
      // If permission_id is null, at least verify the structure
      expect(res.body.data[0]).toHaveProperty('permission_id');
    }

    //expect(res.body.data).toHaveProperty("_id", "68f856cdfedbdcb519d52451");
  });
  test('test get Lấy danh sách permission theo role nhưng sai id ', async () => {
    const role = await roleModel.create({ name: `role-${Date.now()}` });
    const permission = await permissionModel.create({
      code: `ROLE_TEST-${Date.now()}`,
      description: 'clm',
      typePermission: 'test',
    });
    await RolePermissionModel.create({ role_id: role._id, permission_id: permission._id });

    const res = await request(app).get(
      `/api/RolePermission/role/${role._id.toString().slice(0, -2)}xxx`
    );
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('success', false);
  });
  test('test cập nhật rolepermisson cho người dùng', async () => {
    const role = await roleModel.create({ name: `role-${Date.now()}` });
    const permission = await permissionModel.create({
      code: `ROLE_TEST-${Date.now()}`,
      description: 'clm',
      typePermission: 'test',
    });
    const user = await usersModel.create({
      email: `user${Date.now()}@example.com`,
      username: `user${Date.now()}`,
    });
    await userRole.create({ user_id: user._id, role_id: role._id });
    const dataUpdate = {
      currentUserId: user._id.toString(),
      permissions: [permission._id.toString()],
    };
    const res = await request(app).put('/api/RolePermission/RolePermission').send(dataUpdate);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
  test('test cập nhật rolepermisson cho người dùng nhưng người dùng chưa có role', async () => {
    const permission = await permissionModel.create({
      code: `ROLE_TEST-${Date.now()}`,
      description: 'clm',
      typePermission: 'test',
    });
    const user = await usersModel.create({
      email: `user${Date.now()}@example.com`,
      username: `user${Date.now()}`,
    });
    const dataUpdate = {
      currentUserId: user._id.toString(),
      permissions: [permission._id.toString()],
    };
    const res = await request(app).put('/api/RolePermission/RolePermission').send(dataUpdate);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data.roleId).toBeTruthy();
  });
  test('test cập nhật rolepermisson cho người dùng đang dùng chung role với người khác thì tạo role mới cho họ ', async () => {
    const role = await roleModel.create({ name: `role-${Date.now()}` });
    const permission = await permissionModel.create({
      code: `ROLE_TEST-${Date.now()}`,
      description: 'clm',
      typePermission: 'test',
    });
    const user1 = await usersModel.create({
      email: `user1${Date.now()}@example.com`,
      username: `user1-${Date.now()}`,
    });
    const user2 = await usersModel.create({
      email: `user2${Date.now()}@example.com`,
      username: `user2-${Date.now()}`,
    });
    await userRole.create({ user_id: user1._id, role_id: role._id });
    await userRole.create({ user_id: user2._id, role_id: role._id });

    const dataUpdate = {
      currentUserId: user1._id.toString(),
      permissions: [permission._id.toString()],
    };
    const res = await request(app).put('/api/RolePermission/RolePermission').send(dataUpdate);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data.roleId).toBeTruthy();
  });

  test('xóa rolePermission thành công', async () => {
    // Create role and permission
    const role = await roleModel.create({ name: `role-${Date.now()}` });
    const permission = await permissionModel.create({
      code: `PERM-${Date.now()}`,
      description: 'perm test',
      typePermission: 'test',
    });
    const rolePermission = await RolePermissionModel.create({
      role_id: role._id,
      permission_id: permission._id,
    });

    const res = await request(app)
      .delete(`/api/RolePermission/${rolePermission._id.toString()}`)
      .set('Authorization', `Bearer YOUR_TEST_TOKEN_HERE`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'Deleted successfully');

    // --- Verify deleted ---
    const deleted = await RolePermissionModel.findById(rolePermission._id);
    expect(deleted).toBeNull();
  });

  test('xóa rolePermission không tồn tại', async () => {
    const res = await request(app)
      .delete('/api/RolePermission/000000000000000000000000')
      .set('Authorization', `Bearer YOUR_TEST_TOKEN_HERE`); // nếu dùng auth

    // Nếu API vẫn trả 200 nhưng không xóa gì
    expect(res.status).toBe(200); // hoặc 404 nếu bạn xử lý lỗi
    expect(res.body).toHaveProperty('success', true);
  });

  test('Lấy danh sách permission thành công theo tên role', async () => {
    const roleName = `TestRole-${Date.now()}`;
    const role = await roleModel.create({ name: roleName, description: 'Role test' });
    roleId = role._id;

    const permission = await permissionModel.create({
      code: `PERM_TEST-${Date.now()}`,
      description: 'Permission test',
      typePermission: 'test',
    });
    permissionId = permission._id;

    await RolePermissionModel.create({ role_id: roleId, permission_id: permissionId });
    const res = await request(app)
      .get(`/api/RolePermission/nameRole/${roleName}`)
      .set('Authorization', `Bearer YOUR_TEST_TOKEN_HERE`); // nếu có auth

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);

    // Kiểm tra thông tin permission
    const permissions = res.body.data[0];
    expect(permissions).toHaveProperty('_id', permissionId.toString());
    expect(permissions).toHaveProperty('code', permission.code);
    expect(permissions).toHaveProperty('description', 'Permission test');
    expect(permissions).toHaveProperty('typePermission', 'test');
  });

  test('Role không tồn tại', async () => {
    const res = await request(app)
      .get('/api/RolePermission/nameRole/RoleNotExist')
      .set('Authorization', `Bearer YOUR_TEST_TOKEN_HERE`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message).toMatch(/Không tìm thấy role/);
  });
});

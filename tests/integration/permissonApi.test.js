// tests/integration/loginApi.test.js
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const http = require("http");

if (!process.env.MONGO_URI) {
  dotenv.config({ path: ".env.test" });
}
const permissionRoutes = require("../../router/permission.routes");
const permissionModel = require("../../models/Permission.model");
const roleRouter = require("../../router/role.router");
const Role = require("../../models/role.model");
const roleModel = require("../../models/role.model");
const usersModel = require("../../models/usersModel");
const userRole = require("../../models/userRole.model");
const { send } = require("process");
// Mock middleware auth
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: "68f04aa8a8d72d344f0b9151",
      roles: ["admin", "System_Manager"],
      email: "admin@example.com",
      username: "admin",
    };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasPermission = requiredRoles
      .split(" ")
      .some((role) => userRoles.includes(role));
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Yêu cầu quyền: ${requiredRoles}`,
      });
    }
    next();
  },
}));

describe("🔹 Integration Test", () => {
  beforeAll(async () => {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI không được định nghĩa trong .env.test");
      }
      await mongoose.connect(process.env.MONGO_URI);
      app = express();
      app.use(express.json());
      app.use("/api/permission", permissionRoutes);
      server = http.createServer(app); // Tạo server HTTP
    } catch (err) {
      console.error("❌ Lỗi khi kết nối MongoDB:", err);
      throw err;
    }
  });
  afterEach(async () => {
    await Role.deleteMany({});
    await usersModel.deleteMany({});
    await roleModel.deleteMany({});
    await userRole.deleteMany({});
    await permissionModel.deleteMany({});
  });

  afterAll(async () => {
    try {
      await mongoose.connection.close();
      if (server) {
        await new Promise((resolve) => server.close(resolve)); // Đóng server HTTP
      }
    } catch (err) {
      console.error("❌ Lỗi khi đóng kết nối MongoDB hoặc server:", err);
    }
  });

  test("test tạo role thành công ", async () => {
    const data = {
      code: "ROlE_TEST",
      description: "Role test",
      typePermission: "nhóm test",
    };
    const res = await request(app).post("/api/permission").send(data);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.data).toHaveProperty("description", "Role test");
  });
  test("test tạo role thiếu một số trường bắt buộc ", async () => {
    const data = {
      code: "ROlE_TEST",
      description: "Role test",
      //  typePermission: "nhóm test",
    };
    const res = await request(app).post("/api/permission").send(data);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });
  test("test tạo role bị trùng trong csdl ", async () => {
    const data = {
      code: "ROlE_TEST",
      description: "Role test",
      typePermission: "nhóm test",
    };
    await permissionModel.create({
      code: "ROlE_TEST",
      description: "Role test",
      typePermission: "nhóm test",
    });
    const res = await request(app).post("/api/permission").send(data);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });
  test("test tạo role bị tên nhưng khác type ", async () => {
    const data = {
      code: "ROlE_TEST",
      description: "Role test",
      typePermission: "nhóm test 1",
    };
    await permissionModel.create({
      code: "ROlE_TEST",
      description: "Role test",
      typePermission: "nhóm test",
    });
    const res = await request(app).post("/api/permission").send(data);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });
  test("test lấy ra tất cả permisson", async () => {
    await permissionModel.create({
      code: "ROlE_TEST 1",
      description: "Role test",
      typePermission: "nhóm test",
    });
    await permissionModel.create({
      code: "ROlE_TEST 2",
      description: "Role test",
      typePermission: "nhóm test",
    });
    const res = await request(app).get("/api/permission");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.data[0]).toHaveProperty("code", "ROlE_TEST 1");
    expect(res.body.data[1]).toHaveProperty("code", "ROlE_TEST 2");
  });

  test("test lấy permisson theo id của permisson", async () => {
    await permissionModel.create({
      _id: "68f856cdfedbdcb519d52451",
      code: "ROlE_TEST 1",
      description: "Role test",
      typePermission: "nhóm test",
    });

    const res = await request(app).get(
      "/api/permission/68f856cdfedbdcb519d52451"
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.data).toHaveProperty("_id", "68f856cdfedbdcb519d52451");
  });
  test("test lấy permisson theo id của permisson sai id", async () => {
    await permissionModel.create({
      _id: "68f856cdfedbdcb519d52451",
      code: "ROlE_TEST 1",
      description: "Role test",
      typePermission: "nhóm test",
    });

    const res = await request(app).get(
      "/api/permission/68f856cdfedbdcb519d52453"
    );
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
  });
  test("test cập nhật permisson nhưng sai id ko có trong data base", async () => {
    await permissionModel.create({
      _id: "68f856cdfedbdcb519d52451",
      code: "ROlE_TEST 1",
      description: "Role test",
      typePermission: "nhóm test",
    });
    const data = {
      description: "Role test 1",
    };

    const res = await request(app)
      .put("/api/permission/68f856cdfedbdcb519d52453")
      .send(data);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });
  test("test cập nhật permisson ", async () => {
    await permissionModel.create({
      _id: "68f856cdfedbdcb519d52451",
      code: "ROlE_TEST 1",
      description: "Role test",
      typePermission: "nhóm test",
    });
    const data = {
      description: "Role test 1",
    };

    const res = await request(app)
      .put("/api/permission/68f856cdfedbdcb519d52451")
      .send(data);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });
  test("test cập nhật permisson nhưng tên code truyền vào lại trùng", async () => {
    await permissionModel.create({
      _id: "68f856cdfedbdcb519d52451",
      code: "ROlE_TEST 1",
      description: "Role test",
      typePermission: "nhóm test",
    });
    await permissionModel.create({
      _id: "68f856cdfedbdcb519d52452",
      code: "ROlE_TEST 2",
      description: "Role test",
      typePermission: "nhóm test",
    });
    const data = {
      code: "ROlE_TEST 2",
    };

    const res = await request(app)
      .put("/api/permission/68f856cdfedbdcb519d52451")
      .send(data);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });
  test("test cập nhật permisson sai id ", async () => {
    await permissionModel.create({
      _id: "68f856cdfedbdcb519d52451",
      code: "ROlE_TEST 1",
      description: "Role test",
      typePermission: "nhóm test",
    });
    const data = {
      description: "Role test 1",
    };

    const res = await request(app)
      .put("/api/permission/68f856cdfedbdcb551")
      .send(data);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });
  test("test xóa permission thành công ", async () => {
    await permissionModel.create({
      _id: "68f856cdfedbdcb519d52451",
      code: "ROlE_TEST 1",
      description: "Role test",
      typePermission: "nhóm test",
    });
    const res = await request(app).delete(
      "/api/permission/68f856cdfedbdcb519d52451"
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  test("test xóa permission sai id ", async () => {
    await permissionModel.create({
      _id: "68f856cdfedbdcb519d52451",
      code: "ROlE_TEST 1",
      description: "Role test",
      typePermission: "nhóm test",
    });
    const res = await request(app).delete("/api/permission/ffffsd3rwafsf");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
  });
});

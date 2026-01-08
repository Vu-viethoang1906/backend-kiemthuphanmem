// tests/integration/userApi.test.js
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");

dotenv.config({ path: ".env.test" });

const userRouter = require("../../router/user.routes");
const roleRouter = require("../../router/role.router");
const User = require("../../models/usersModel");
const Role = require("../../models/role.model");

// Mock middleware auth (dynamic roles via global.testUserRoles)
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: global.testUserId,
      roles: global.testUserRoles || ["admin", "System_Manager", "ROLE_CREATE", "USER_CREATE"],
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

// Mock services
jest.mock("../../services/keycloak.service", () => ({
  createUserWithPassword: jest.fn().mockResolvedValue({
    id: "keycloak123",
    username: "newbie",
    email: "newbie@example.com",
  }),
  getUsers: jest.fn().mockResolvedValue([]),
  getUserByUsername: jest.fn().mockResolvedValue([]),
  getUserByEmail: jest.fn().mockResolvedValue([]),
  getUserById: jest.fn().mockResolvedValue(null),
  updateUser: jest.fn().mockResolvedValue(true),
  deleteUser: jest.fn().mockResolvedValue(true),
  changeUserPassword: jest.fn().mockResolvedValue(true),
  deactivateUserOnKeycloak: jest.fn().mockResolvedValue(true),
  restoreUserOnKeycloak: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../services/userRole.service", () => ({
  create: jest.fn().mockResolvedValue({}),
  getRoles: jest.fn().mockResolvedValue([{ role_id: { name: "user" } }]),
}));

jest.mock("../../services/centerMember.service", () => ({
  getCentersByUser: jest.fn().mockResolvedValue([]),
}));

// Thêm mock cho roleService
jest.mock("../../services/role.service", () => ({
  getIdByName: jest.fn().mockResolvedValue("role123"),
  createRole: jest.fn().mockImplementation(async (roleData) => {
    const Role = require("../../models/role.model");
    return await Role.create(roleData);
  }),
  getRoleByName: jest.fn().mockResolvedValue({ _id: "role123", name: "user" }),
}));

// Mock node-cron to prevent open handles
jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

describe("🔹 Integration Test: /api (MongoDB Cloud)", () => {
  let app;

  beforeAll(async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      app = express();
      app.use(express.json());
      app.use("/api/user", userRouter);
      app.use("/api/role", roleRouter);
    } catch (err) {
      console.error("❌ Lỗi khi kết nối MongoDB:", err);
      throw err;
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
    await Role.deleteMany({});
    const user = await User.create({
      username: "nhat",
      email: "nhat@example.com",
      status: "active",
      typeAccount: "Local",
      password_hash: await bcrypt.hash("password123", 10),
    });
    global.testUserId = user._id.toString();
    // defaults to admin roles
    global.testUserRoles = ["admin", "System_Manager", "ROLE_CREATE", "USER_CREATE"];

    // Create a second user and add phone_number directly via db to bypass schema
    const phoneUser = await User.create({
      username: "phoneuser",
      email: "phoneuser@example.com",
      status: "active",
      typeAccount: "Local",
      password_hash: await bcrypt.hash("passwordPhone", 10),
    });
    await mongoose.connection.db.collection('users').updateOne(
      { _id: phoneUser._id },
      { $set: { phone_number: "0123456789" } }
    );
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Role.deleteMany({});
  });

  afterAll(async () => {
    try {
      await mongoose.connection.close();
    } catch (err) {
      console.error("❌ Lỗi khi đóng kết nối MongoDB:", err);
    }
  });

  describe("POST /api/user", () => {
    test("✅ Tạo user mới", async () => {
      const newUser = {
        username: "newbie",
        email: "newbie@example.com",
        full_name: "Newbie User",
        password: "password123",
        status: "active",
        roles: ["user"],
      };
      const res = await request(app).post("/api/user").send(newUser);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("username", "newbie");
      expect(res.body.data).toHaveProperty("email", "newbie@example.com");

      const checkInDb = await User.findOne({ username: "newbie" });
      expect(checkInDb).not.toBeNull();
      expect(checkInDb.email).toBe("newbie@example.com");
    });
  });

  describe("GET /api/user/selectAll", () => {
    test("✅ Trả danh sách người dùng", async () => {
      const res = await request(app).get("/api/user/selectAll");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      const hasNhat = res.body.users.some((u) => u.username === "nhat");
      expect(hasNhat).toBe(true);
    });
  });

  describe("POST /api/role", () => {
    test("✅ Tạo role mới", async () => {
      const newRole = {
        name: "test-role-" + Date.now(),
        description: "Role người dùng",
      };
      const res = await request(app).post("/api/role").send(newRole);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("name", newRole.name);
      expect(res.body.data).toHaveProperty("description", "Role người dùng");

      const checkInDb = await Role.findOne({ name: newRole.name });
      expect(checkInDb).not.toBeNull();
      expect(checkInDb.description).toBe("Role người dùng");
    });
  });

  describe("GET /api/user/me", () => {
    test("✅ should return full profile of current user", async () => {
      const res = await request(app).get("/api/user/me");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data).toHaveProperty("username");
    });
  });

  describe("POST /api/user/getprofile", () => {
    test("✅ should return profile with roles and centers", async () => {
      const res = await request(app)
        .post("/api/user/getprofile")
        .send({ userId: global.testUserId });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("username");
    });
  });

  describe("PUT /api/user/me - updateMyProfile", () => {
    test("✅ should update current user's profile", async () => {
      const update = { full_name: "Updated Name" };
      const res = await request(app).put("/api/user/me").send(update);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const u = await User.findById(global.testUserId);
      expect(u.full_name).toBe("Updated Name");
    });
  });

  describe("PUT /api/user/change-password", () => {
    test("✅ should change password if current_password is correct", async () => {
      const payload = { current_password: "password123", new_password: "newPassword123" };
      const res = await request(app).put("/api/user/change-password").send(payload);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await User.findById(global.testUserId);
      const matches = await bcrypt.compare("newPassword123", updated.password_hash);
      expect(matches).toBe(true);
    });

    test("❌ should return 400 when new_password too short", async () => {
      const payload = { current_password: "password123", new_password: "a" };
      const res = await request(app).put("/api/user/change-password").send(payload);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/user/email/:email and /api/user/name/:name", () => {
    test("✅ should get user by email", async () => {
      const res = await request(app).get("/api/user/email/nhat@example.com");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("nhat@example.com");
    });

    test("✅ should get user by username", async () => {
      const res = await request(app).get("/api/user/name/nhat");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe("nhat");
    });
  });

  describe("GET /api/user/phone/:numberphone (admin only)", () => {
    test("✅ admin can get user by phone", async () => {
      // Ensure global.testUserRoles includes admin
      global.testUserRoles = ["admin"];
      const res = await request(app).get("/api/user/phone/0123456789");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone_number).toBe("0123456789");
    });

    test("❌ non-admin gets 403 for phone lookup", async () => {
      // Not admin
      global.testUserRoles = ["user"];
      const res = await request(app).get("/api/user/phone/0123456789");
      expect(res.status).toBe(403);
      // restore default
      global.testUserRoles = ["admin", "System_Manager", "ROLE_CREATE", "USER_CREATE"];
    });
  });

  describe("POST /api/user/cloneUser", () => {
    test("✅ should clone user from Keycloak and create local SSO user", async () => {
      // prepare keycloak mock
      const kc = require("../../services/keycloak.service");
      kc.getUserByUsername.mockResolvedValueOnce([
        { id: "kc-999", username: "kcuser", email: "kcuser@example.com", firstName: "KC", lastName: "User" },
      ]);

      const res = await request(app).post("/api/user/cloneUser").send({ username: "kcuser" });
      expect(res.status).toBe(201);
      expect(res.body.username).toBe("kcuser");

      // verify DB entry
      const kcUser = await User.findOne({ username: "kcuser" });
      expect(kcUser).not.toBeNull();
      expect(kcUser.idSSO).toBe("kc-999");
    });

    test("❌ should return 400 when username missing", async () => {
      const res = await request(app).post("/api/user/cloneUser").send({});
      expect(res.status).toBe(400);
    });
  });
});

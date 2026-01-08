// 📄 tests/integration/groupCreate.test.js
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");

dotenv.config({ path: ".env.test" });

// Flexible mock user id and roles so tests can override via global variables
const mockTestUserId = global.__MOCK_USER_ID__ || "507f1f77bcf86cd799439011";

jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: global.__MOCK_USER_ID__ || mockTestUserId,
      roles:
        global.__MOCK_USER_ROLES__ || [
          "admin",
          "System_Manager",
          "CREATE_GROUP",
          "VIEW_GROUP",
        ],
      email: "test@example.com",
      username: "testuser",
    };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const required = typeof requiredRoles === "string" ? requiredRoles.split(" ") : requiredRoles;
    const hasPermission = required.some((role) => userRoles.includes(role));
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: `Yêu cầu quyền: ${requiredRoles}` });
    }
    next();
  },
}));

const groupRouter = require("../../router/group.routes");

// Models
const Role = require("../../models/role.model");
const usersModel = require("../../models/usersModel");
const roleModel = require("../../models/role.model");
const userRole = require("../../models/userRole.model");
const permissionModel = require("../../models/Permission.model");
const groupModel = require("../../models/group.model");
const groupMemberModel = require("../../models/groupMember.model");

describe("🔹 Integration Test: Create Group (POST /api/groups)", () => {
  let app;
  let server;

  beforeAll(async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI không được định nghĩa trong .env.test");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Ensure the user exists in DB for member creation checks
    const existingUser = await usersModel.findById(mockTestUserId);
    if (!existingUser) {
      await usersModel.create({
        _id: new mongoose.Types.ObjectId(mockTestUserId),
        email: "test@example.com",
        username: "testuser",
        full_name: "Test User",
        status: "active",
        typeAccount: "Local",
      });
    }

    app = express();
    app.use(express.json());
    app.use("/api/groups", groupRouter);
    server = http.createServer(app);
  });

  afterEach(async () => {
    // Clean up created data after each test
    await Role.deleteMany({});
    await usersModel.deleteMany({ _id: { $ne: mockTestUserId } }); // keep test user
    await roleModel.deleteMany({});
    await userRole.deleteMany({});
    await permissionModel.deleteMany({});
    await groupModel.deleteMany({});
    await groupMemberModel.deleteMany({});
    // Reset role override
    global.__MOCK_USER_ROLES__ = undefined;
    global.__MOCK_USER_ID__ = mockTestUserId;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  test("✅ should create group successfully with valid payload", async () => {
    const centerId = new mongoose.Types.ObjectId();
    const data = {
      center_id: centerId.toString(),
      name: "Integration Test Group",
      description: "Group created for integration testing",
    };

    const res = await request(app).post("/api/groups/").send(data);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("name", "Integration Test Group");
    expect(res.body.data).toHaveProperty("center_id");

    // DB checks
    const createdGroup = await groupModel.findOne({ name: "Integration Test Group" }).lean();
    expect(createdGroup).toBeDefined();

    const member = await groupMemberModel.findOne({ group_id: createdGroup._id.toString() }).lean();
    expect(member).toBeDefined();
    expect(member.user_id.toString()).toBe(mockTestUserId);
    expect(member.role_in_group).toBe("Người tạo");
  });

  test("✅ should trim name and save trimmed value", async () => {
    const data = { name: "  Group Trim Test  ", description: "trim test" };
    const res = await request(app).post("/api/groups/").send(data);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Group Trim Test");
  });

  test("❌ should return 400 when name is missing", async () => {
    const res = await request(app).post("/api/groups/").send({ description: "no name" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Tên group là bắt buộc và phải là chuỗi hợp lệ");
  });

  test("❌ should return 400 when name is blank whitespace only", async () => {
    const res = await request(app).post("/api/groups/").send({ name: "   " });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Tên group là bắt buộc và phải là chuỗi hợp lệ");
  });

  test("❌ should return 400 when center_id is invalid", async () => {
    const res = await request(app).post("/api/groups/").send({ center_id: "badid", name: "Name" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("center_id không hợp lệ");
  });

  test("❌ should return 400 when userId from token is invalid", async () => {
    global.__MOCK_USER_ID__ = "invalid";
    const data = { name: "Name", center_id: new mongoose.Types.ObjectId().toString() };
    const res = await request(app).post("/api/groups/").send(data);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("userId không hợp lệ");
    // reset
    global.__MOCK_USER_ID__ = mockTestUserId;
  });

  test("❌ should return 400 on duplicate name within same center", async () => {
    const centerId = new mongoose.Types.ObjectId();
    await groupModel.create({ center_id: centerId, name: "Duplicate" });

    const data = { center_id: centerId.toString(), name: "Duplicate" };
    const res = await request(app).post("/api/groups/").send(data);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Tên group đã tồn tại trong center này");
  });

  test("❌ should return 400 when description exceeds max length (301)", async () => {
    const longDesc = "a".repeat(301);
    const data = { name: "LongDescGroup", description: longDesc };
    const res = await request(app).post("/api/groups/").send(data);
    // Mongoose schema max length will cause validation -> service catches and returns 400
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("❌ should return 403 when user lacks CREATE_GROUP permission", async () => {
    global.__MOCK_USER_ROLES__ = ["VIEW_GROUP"]; // no CREATE_GROUP
    const data = { name: "Name", center_id: new mongoose.Types.ObjectId().toString() };
    const res = await request(app).post("/api/groups/").send(data);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test("✅ should allow create without center_id (current system behavior)", async () => {
    const data = { name: "NoCenterGroup", description: "test" };
    const res = await request(app).post("/api/groups/").send(data);
    // According to existing tests, this succeeds
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("_id");
    // Member added
    const member = await groupMemberModel.findOne({ group_id: res.body.data._id }).lean();
    expect(member).toBeDefined();
    expect(member.user_id.toString()).toBe(mockTestUserId);
  });

  test("❌ should return 400 when name longer than 200 chars", async () => {
    const longName = "a".repeat(201);
    const data = { name: longName };
    const res = await request(app).post("/api/groups/").send(data);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("Race condition: concurrent requests for same name - at least one must succeed", async () => {
    const centerId = new mongoose.Types.ObjectId();
    const payload = { center_id: centerId.toString(), name: "RaceGroup" };

    const [r1, r2] = await Promise.all([request(app).post("/api/groups/").send(payload), request(app).post("/api/groups/").send(payload)]);

    // At least one request should succeed; verify DB has at least one group
    const statuses = [r1.status, r2.status];
    expect(statuses.some((s) => s === 200)).toBe(true);
    const createdCount = await groupModel.countDocuments({ name: "RaceGroup", center_id: centerId });
    expect(createdCount).toBeGreaterThanOrEqual(1);
  });
});

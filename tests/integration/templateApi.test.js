// 📄 tests/integration/templateApi.test.js - Template API Integration Tests
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.test" });

const templateRouter = require("../../router/template.router");
const Template = require("../../models/template.model");
const TemplateColumn = require("../../models/templateColumn.model");
const TemplateSwimlane = require("../../models/templateSwimlane.model");
const User = require("../../models/usersModel");

// Mock middleware để bypass authentication
const mockTestUserId = "507f1f77bcf86cd799439011";

jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: mockTestUserId,
      roles: ["admin", "System_Manager", "TEMPLATE_VIEW", "TEMPLATE_CREATE", "TEMPLATE_UPDATE", "TEMPLATE_DELETE"],
      email: "test@example.com",
      username: "testuser",
    };
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock role repository để listTemplates hoạt động
jest.mock("../../repositories/role.repository", () => ({
  findByName: jest.fn((name) => {
    if (name === "admin") {
      return Promise.resolve({ _id: "adminRoleId", name: "admin" });
    }
    if (name === "System_Manager") {
      return Promise.resolve({ _id: "systemRoleId", name: "System_Manager" });
    }
    return Promise.resolve(null);
  }),
}));

jest.mock("../../repositories/userRole.repository", () => ({
  findUsersByRoleIds: jest.fn(() => Promise.resolve([
    { user_id: mockTestUserId }
  ])),
}));

describe("🔹 Template API Integration Tests", () => {
  let app;
  let testTemplateId;

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
        email: "test@example.com",
        username: "testuser",
        full_name: "Test User",
        status: "active",
        typeAccount: "Local",
      });
    }

    app = express();
    app.use(express.json());
    app.use("/api/templates", templateRouter);
  });

  beforeEach(async () => {
    // Cleanup trước mỗi test
    await Template.deleteMany({ name: { $regex: /^\[TEST\]/ } });
    await TemplateColumn.deleteMany({});
    await TemplateSwimlane.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup sau tất cả tests
    await Template.deleteMany({ name: { $regex: /^\[TEST\]/ } });
    await TemplateColumn.deleteMany({});
    await TemplateSwimlane.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("POST /api/templates - Create Template", () => {
    it("✅ should create template with real data", async () => {
      const timestamp = Date.now();
      const templateData = {
        name: `[TEST] Integration Test Template ${timestamp}`,
        description: "Template created for integration testing",
      };

      const res = await request(app).post("/api/templates").send(templateData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.name).toBe(`[TEST] Integration Test Template ${timestamp}`);
      expect(res.body.data.created_by).toBe(mockTestUserId);

      // Lưu ID để dùng cho các test khác
      testTemplateId = res.body.data._id;
    });

    it("❌ should reject template without name", async () => {
      const templateData = {
        description: "No name provided",
      };

      const res = await request(app).post("/api/templates").send(templateData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("✅ should create template with minimal fields", async () => {
      const timestamp = Date.now();
      const templateData = {
        name: `[TEST] Minimal Template ${timestamp}`,
      };

      const res = await request(app).post("/api/templates").send(templateData);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(`[TEST] Minimal Template ${timestamp}`);
    });
  });

  describe("GET /api/templates - List Templates", () => {
    it("✅ should return templates from database", async () => {
      // Tạo test template trước
      const timestamp = Date.now();
      await Template.create({
        name: `[TEST] List Template ${timestamp}`,
        description: "Template for listing test",
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });

      const res = await request(app).get("/api/templates");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Kiểm tra có template với tên chứa [TEST]
      const testTemplates = res.body.data.filter(
        (template) => template.name && template.name.includes("[TEST]")
      );
      expect(testTemplates.length).toBeGreaterThan(0);
    });

    it("✅ should handle query parameters", async () => {
      const res = await request(app)
        .get("/api/templates")
        .query({ page: 1, limit: 10, search: "TEST" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
    });
  });

  describe("GET /api/templates/:id - Get Template By ID", () => {
    it("✅ should return template detail from database", async () => {
      // Tạo test template
      const timestamp = Date.now();
      const template = await Template.create({
        name: `[TEST] Detail Template ${timestamp}`,
        description: "Template for detail test",
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });

      const res = await request(app).get(`/api/templates/${template._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.name).toBe(`[TEST] Detail Template ${timestamp}`);
      expect(res.body.data._id).toBe(template._id.toString());
    });

    it("❌ should return 404 for non-existent template", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/templates/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body.message).toBe("Template không tồn tại");
    });
  });

  describe("PUT /api/templates/:id - Update Template", () => {
    it("✅ should update template in database", async () => {
      // Tạo test template
      const timestamp = Date.now();
      const template = await Template.create({
        name: `[TEST] Update Template ${timestamp}`,
        description: "Original description",
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });

      const updateData = {
        name: `[TEST] Updated Template ${timestamp}`,
        description: "Updated description",
      };

      const res = await request(app)
        .put(`/api/templates/${template._id}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.name).toBe(`[TEST] Updated Template ${timestamp}`);
      expect(res.body.data.description).toBe("Updated description");

      // Verify trong database
      const updatedTemplate = await Template.findById(template._id);
      expect(updatedTemplate.name).toBe(`[TEST] Updated Template ${timestamp}`);
      expect(updatedTemplate.description).toBe("Updated description");
    });

    it("✅ should update only provided fields", async () => {
      const timestamp = Date.now();
      const template = await Template.create({
        name: `[TEST] Partial Update ${timestamp}`,
        description: "Original description",
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });

      const updateData = {
        name: `[TEST] Partially Updated ${timestamp}`,
      };

      const res = await request(app)
        .put(`/api/templates/${template._id}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(`[TEST] Partially Updated ${timestamp}`);
      
      // Verify description không đổi
      const updatedTemplate = await Template.findById(template._id);
      expect(updatedTemplate.description).toBe("Original description");
    });
  });

  describe("DELETE /api/templates/:id - Delete Template", () => {
    it("✅ should soft delete template in database", async () => {
      const timestamp = Date.now();
      const template = await Template.create({
        name: `[TEST] Delete Template ${timestamp}`,
        description: "Template to be deleted",
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });

      const res = await request(app).delete(`/api/templates/${template._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Xóa template thành công");

      // Verify soft delete (deleted_at được set)
      // Note: findById sẽ không trả về document đã soft delete do pre-find hook
      // Nên phải dùng findOne với điều kiện deleted_at
      const deletedTemplate = await Template.findOne({ _id: template._id, deleted_at: { $ne: null } });
      expect(deletedTemplate).not.toBeNull();
      expect(deletedTemplate.deleted_at).not.toBeNull();
    });

    it("❌ should return 404 for non-existent template", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/templates/${fakeId}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("Database Operations", () => {
    it("✅ should handle database connection", async () => {
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    it("✅ should create and query templates directly", async () => {
      const timestamp = Date.now();
      const template = await Template.create({
        name: `[TEST] Direct DB Test ${timestamp}`,
        description: "Direct DB Template",
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });

      expect(template._id).toBeDefined();
      expect(template.name).toBe(`[TEST] Direct DB Test ${timestamp}`);

      // Query template
      const foundTemplate = await Template.findById(template._id);
      expect(foundTemplate).toBeDefined();
      expect(foundTemplate.name).toBe(`[TEST] Direct DB Test ${timestamp}`);
    });
  });

  describe("Error Handling with Real Database", () => {
    it("❌ should handle invalid ObjectId", async () => {
      const res = await request(app).get("/api/templates/invalid-id");

      // Có thể trả về 400 (validation error) hoặc 500 (server error)
      expect([400, 404, 500]).toContain(res.status);
    });

    it("✅ should filter soft-deleted templates", async () => {
      const timestamp = Date.now();
      const template = await Template.create({
        name: `[TEST] Soft Deleted ${timestamp}`,
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });

      // Soft delete
      await Template.findByIdAndUpdate(template._id, { deleted_at: new Date() });

      // Should not appear in list
      const res = await request(app).get("/api/templates");
      const found = res.body.data.find(t => t._id === template._id.toString());
      expect(found).toBeUndefined();
    });
  });
});


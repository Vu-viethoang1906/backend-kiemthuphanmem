// 📄 tests/integration/templateSwimlaneService.test.js - Template Swimlane Service Integration Tests
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.test" });

const templateSwimlaneService = require("../../services/templateSwimlane.service");
const Template = require("../../models/template.model");
const TemplateSwimlane = require("../../models/templateSwimlane.model");
const User = require("../../models/usersModel");

// Test user IDs
const mockTestUserId = "507f1f77bcf86cd799439011";
const mockOtherUserId = "507f1f77bcf86cd799439012";

describe("🔹 Template Swimlane Service Integration Tests", () => {
  let testTemplateId;
  let testSwimlaneId;
  let adminUser;
  let creatorUser;
  let regularUser;

  beforeAll(async () => {
    // Kết nối database test
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    // Tạo test users nếu chưa có
    const existingAdmin = await User.findById(mockTestUserId);
    if (!existingAdmin) {
      await User.create({
        _id: new mongoose.Types.ObjectId(mockTestUserId),
        email: "admin@test.com",
        username: "admintest",
        full_name: "Admin Test User",
        status: "active",
        typeAccount: "Local",
      });
    }

    const existingCreator = await User.findById(mockOtherUserId);
    if (!existingCreator) {
      await User.create({
        _id: new mongoose.Types.ObjectId(mockOtherUserId),
        email: "creator@test.com",
        username: "creatortest",
        full_name: "Creator Test User",
        status: "active",
        typeAccount: "Local",
      });
    }

    // Setup user objects for service calls
    adminUser = {
      id: mockTestUserId,
      _id: mockTestUserId,
      roles: ["admin", "System_Manager"],
      email: "admin@test.com",
      username: "admintest",
    };

    creatorUser = {
      id: mockOtherUserId,
      _id: mockOtherUserId,
      roles: ["user"],
      email: "creator@test.com",
      username: "creatortest",
    };

    regularUser = {
      id: new mongoose.Types.ObjectId().toString(),
      _id: new mongoose.Types.ObjectId().toString(),
      roles: ["user"],
      email: "regular@test.com",
      username: "regularuser",
    };
  });

  beforeEach(async () => {
    // Cleanup trước mỗi test
    await TemplateSwimlane.deleteMany({ name: { $regex: /^\[TEST\]/ } });
    await Template.deleteMany({ name: { $regex: /^\[TEST\]/ } });

    // Tạo test template cho mỗi test
    const timestamp = Date.now();
    const template = await Template.create({
      name: `[TEST] Template ${timestamp}`,
      description: "Test template for swimlane tests",
      created_by: new mongoose.Types.ObjectId(creatorUser.id),
    });
    testTemplateId = template._id.toString();
  });

  afterAll(async () => {
    // Cleanup sau tất cả tests
    await TemplateSwimlane.deleteMany({ name: { $regex: /^\[TEST\]/ } });
    await Template.deleteMany({ name: { $regex: /^\[TEST\]/ } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("list(template_id) - List Swimlanes by Template", () => {
    it("✅ should return swimlanes sorted by order_index", async () => {
      // Tạo swimlanes với order_index khác nhau
      await TemplateSwimlane.create([
        {
          template_id: testTemplateId,
          name: "[TEST] Swimlane 3",
          order_index: 3,
        },
        {
          template_id: testTemplateId,
          name: "[TEST] Swimlane 1",
          order_index: 1,
        },
        {
          template_id: testTemplateId,
          name: "[TEST] Swimlane 2",
          order_index: 2,
        },
      ]);

      const result = await templateSwimlaneService.list(testTemplateId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0].name).toBe("[TEST] Swimlane 1");
      expect(result[1].name).toBe("[TEST] Swimlane 2");
      expect(result[2].name).toBe("[TEST] Swimlane 3");
    });

    it("✅ should return empty array when template has no swimlanes", async () => {
      const result = await templateSwimlaneService.list(testTemplateId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("❌ should throw error for invalid template_id", async () => {
      await expect(
        templateSwimlaneService.list("invalid_id")
      ).rejects.toThrow("template_id không hợp lệ");
    });

    it("✅ should filter soft-deleted swimlanes", async () => {
      // Tạo swimlane và soft delete
      const swimlane = await TemplateSwimlane.create({
        template_id: testTemplateId,
        name: "[TEST] Deleted Swimlane",
        order_index: 1,
      });

      await TemplateSwimlane.findByIdAndUpdate(swimlane._id, {
        deleted_at: new Date(),
      });

      const result = await templateSwimlaneService.list(testTemplateId);

      expect(result.length).toBe(0);
      expect(
        result.find((s) => s._id.toString() === swimlane._id.toString())
      ).toBeUndefined();
    });
  });

  describe("create(template_id, data, user) - Create Swimlane", () => {
    it("✅ should create swimlane successfully with valid data", async () => {
      const swimlaneData = {
        name: "[TEST] New Swimlane",
        order_index: 1,
      };

      const result = await templateSwimlaneService.create(
        testTemplateId,
        swimlaneData,
        creatorUser
      );

      expect(result).toBeDefined();
      expect(result._id).toBeDefined();
      expect(result.name).toBe("[TEST] New Swimlane");
      expect(result.template_id.toString()).toBe(testTemplateId);
      expect(result.order_index).toBe(1);

      // Verify trong database
      const saved = await TemplateSwimlane.findById(result._id);
      expect(saved).toBeDefined();
      expect(saved.name).toBe("[TEST] New Swimlane");
    });

    it("✅ should create swimlane with default order_index when not provided", async () => {
      const swimlaneData = {
        name: "[TEST] Default Order",
      };

      const result = await templateSwimlaneService.create(
        testTemplateId,
        swimlaneData,
        creatorUser
      );

      expect(result.order_index).toBe(0);
    });

    it("✅ should trim whitespace from name", async () => {
      const swimlaneData = {
        name: "  [TEST] Trimmed Name  ",
        order_index: 1,
      };

      const result = await templateSwimlaneService.create(
        testTemplateId,
        swimlaneData,
        creatorUser
      );

      expect(result.name).toBe("[TEST] Trimmed Name");
    });

    it("✅ should allow admin to create swimlane", async () => {
      const swimlaneData = {
        name: "[TEST] Admin Created",
        order_index: 1,
      };

      const result = await templateSwimlaneService.create(
        testTemplateId,
        swimlaneData,
        adminUser
      );

      expect(result).toBeDefined();
      expect(result.name).toBe("[TEST] Admin Created");
    });

    it("✅ should allow System_Manager to create swimlane", async () => {
      const systemManagerUser = {
        id: new mongoose.Types.ObjectId().toString(),
        roles: ["System_Manager"],
      };

      const swimlaneData = {
        name: "[TEST] System Manager Created",
        order_index: 1,
      };

      const result = await templateSwimlaneService.create(
        testTemplateId,
        swimlaneData,
        systemManagerUser
      );

      expect(result).toBeDefined();
      expect(result.name).toBe("[TEST] System Manager Created");
    });

    it("❌ should throw error for invalid template_id", async () => {
      const swimlaneData = {
        name: "[TEST] Invalid Template",
        order_index: 1,
      };

      await expect(
        templateSwimlaneService.create("invalid_id", swimlaneData, creatorUser)
      ).rejects.toThrow("template_id không hợp lệ");
    });

    it("❌ should throw error when name is missing", async () => {
      const swimlaneData = {
        order_index: 1,
      };

      await expect(
        templateSwimlaneService.create(testTemplateId, swimlaneData, creatorUser)
      ).rejects.toThrow("name là bắt buộc");
    });

    it("❌ should throw error when name is empty string", async () => {
      const swimlaneData = {
        name: "   ",
        order_index: 1,
      };

      await expect(
        templateSwimlaneService.create(testTemplateId, swimlaneData, creatorUser)
      ).rejects.toThrow("name là bắt buộc");
    });

    it("❌ should throw error when template does not exist", async () => {
      const fakeTemplateId = new mongoose.Types.ObjectId().toString();
      const swimlaneData = {
        name: "[TEST] Non-existent Template",
        order_index: 1,
      };

      await expect(
        templateSwimlaneService.create(fakeTemplateId, swimlaneData, creatorUser)
      ).rejects.toThrow("Template không tồn tại");
    });

    it("❌ should throw error when user is not creator and has no permission", async () => {
      const swimlaneData = {
        name: "[TEST] Unauthorized",
        order_index: 1,
      };

      await expect(
        templateSwimlaneService.create(testTemplateId, swimlaneData, regularUser)
      ).rejects.toThrow("Không có quyền thực hiện thao tác này");
    });
  });

  describe("update(id, data, user) - Update Swimlane", () => {
    let testSwimlane;

    beforeEach(async () => {
      // Tạo swimlane để update
      testSwimlane = await TemplateSwimlane.create({
        template_id: testTemplateId,
        name: "[TEST] Original Name",
        order_index: 1,
      });
      testSwimlaneId = testSwimlane._id.toString();
    });

    it("✅ should update swimlane name successfully", async () => {
      const updateData = {
        name: "[TEST] Updated Name",
      };

      const result = await templateSwimlaneService.update(
        testSwimlaneId,
        updateData,
        creatorUser
      );

      expect(result.name).toBe("[TEST] Updated Name");
      expect(result.order_index).toBe(1); // Không đổi

      // Verify trong database
      const updated = await TemplateSwimlane.findById(testSwimlaneId);
      expect(updated.name).toBe("[TEST] Updated Name");
    });

    it("✅ should update order_index successfully", async () => {
      const updateData = {
        order_index: 5,
      };

      const result = await templateSwimlaneService.update(
        testSwimlaneId,
        updateData,
        creatorUser
      );

      expect(result.order_index).toBe(5);
      expect(result.name).toBe("[TEST] Original Name"); // Không đổi
    });

    it("✅ should update both name and order_index", async () => {
      const updateData = {
        name: "[TEST] Updated Both",
        order_index: 10,
      };

      const result = await templateSwimlaneService.update(
        testSwimlaneId,
        updateData,
        creatorUser
      );

      expect(result.name).toBe("[TEST] Updated Both");
      expect(result.order_index).toBe(10);
    });

    it("✅ should trim whitespace from name", async () => {
      const updateData = {
        name: "  [TEST] Trimmed Update  ",
      };

      const result = await templateSwimlaneService.update(
        testSwimlaneId,
        updateData,
        creatorUser
      );

      expect(result.name).toBe("[TEST] Trimmed Update");
    });

    it("✅ should set order_index to 0 when provided invalid value", async () => {
      const updateData = {
        order_index: "invalid",
      };

      const result = await templateSwimlaneService.update(
        testSwimlaneId,
        updateData,
        creatorUser
      );

      expect(result.order_index).toBe(0);
    });

    it("✅ should allow admin to update swimlane", async () => {
      const updateData = {
        name: "[TEST] Admin Updated",
      };

      const result = await templateSwimlaneService.update(
        testSwimlaneId,
        updateData,
        adminUser
      );

      expect(result.name).toBe("[TEST] Admin Updated");
    });

    it("❌ should throw error for invalid id", async () => {
      const updateData = {
        name: "[TEST] Invalid ID",
      };

      await expect(
        templateSwimlaneService.update("invalid_id", updateData, creatorUser)
      ).rejects.toThrow("id không hợp lệ");
    });

    it("❌ should throw error when swimlane does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        name: "[TEST] Non-existent",
      };

      await expect(
        templateSwimlaneService.update(fakeId, updateData, creatorUser)
      ).rejects.toThrow("Không tìm thấy TemplateSwimlane");
    });

    it("❌ should throw error when template does not exist", async () => {
      // Tạo swimlane với template không tồn tại
      const fakeTemplateId = new mongoose.Types.ObjectId();
      const swimlane = await TemplateSwimlane.create({
        template_id: fakeTemplateId,
        name: "[TEST] Orphan Swimlane",
        order_index: 1,
      });

      const updateData = {
        name: "[TEST] Update Orphan",
      };

      await expect(
        templateSwimlaneService.update(
          swimlane._id.toString(),
          updateData,
          creatorUser
        )
      ).rejects.toThrow("Template không tồn tại");
    });

    it("❌ should throw error when user is not creator and has no permission", async () => {
      const updateData = {
        name: "[TEST] Unauthorized Update",
      };

      await expect(
        templateSwimlaneService.update(testSwimlaneId, updateData, regularUser)
      ).rejects.toThrow("Không có quyền thực hiện thao tác này");
    });
  });

  describe("remove(id, user) - Remove Swimlane (Soft Delete)", () => {
    let testSwimlane;

    beforeEach(async () => {
      // Tạo swimlane để xóa
      testSwimlane = await TemplateSwimlane.create({
        template_id: testTemplateId,
        name: "[TEST] To Be Deleted",
        order_index: 1,
      });
      testSwimlaneId = testSwimlane._id.toString();
    });

    it("✅ should soft delete swimlane successfully", async () => {
      const result = await templateSwimlaneService.remove(
        testSwimlaneId,
        creatorUser
      );

      expect(result).toBe(true);

      // Verify soft delete (deleted_at được set)
      const deleted = await TemplateSwimlane.findOne({
        _id: testSwimlaneId,
        deleted_at: { $ne: null },
      });
      expect(deleted).not.toBeNull();
      expect(deleted.deleted_at).not.toBeNull();

      // Verify không xuất hiện trong findById
      await expect(
        templateSwimlaneService.findById(testSwimlaneId)
      ).rejects.toThrow("Không tìm thấy TemplateSwimlane");
    });

    it("✅ should allow admin to delete swimlane", async () => {
      const result = await templateSwimlaneService.remove(
        testSwimlaneId,
        adminUser
      );

      expect(result).toBe(true);
    });

    it("❌ should throw error for invalid id", async () => {
      await expect(
        templateSwimlaneService.remove("invalid_id", creatorUser)
      ).rejects.toThrow("id không hợp lệ");
    });

    it("❌ should throw error when swimlane does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        templateSwimlaneService.remove(fakeId, creatorUser)
      ).rejects.toThrow("Không tìm thấy TemplateSwimlane");
    });

    it("❌ should throw error when user is not creator and has no permission", async () => {
      await expect(
        templateSwimlaneService.remove(testSwimlaneId, regularUser)
      ).rejects.toThrow("Không có quyền thực hiện thao tác này");
    });
  });

  describe("findAll() - Find All Swimlanes", () => {
    it("✅ should return all swimlanes sorted by order_index", async () => {
      // Tạo swimlanes cho nhiều templates
      const template2 = await Template.create({
        name: "[TEST] Template 2",
        created_by: new mongoose.Types.ObjectId(creatorUser.id),
      });

      await TemplateSwimlane.create([
        {
          template_id: testTemplateId,
          name: "[TEST] Swimlane 2",
          order_index: 2,
        },
        {
          template_id: testTemplateId,
          name: "[TEST] Swimlane 1",
          order_index: 1,
        },
        {
          template_id: template2._id,
          name: "[TEST] Swimlane 3",
          order_index: 3,
        },
      ]);

      const result = await templateSwimlaneService.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);

      // Kiểm tra có swimlanes với [TEST]
      const testSwimlanes = result.filter((s) =>
        s.name && s.name.includes("[TEST]")
      );
      expect(testSwimlanes.length).toBeGreaterThanOrEqual(3);
    });

    it("✅ should filter soft-deleted swimlanes", async () => {
      const swimlane = await TemplateSwimlane.create({
        template_id: testTemplateId,
        name: "[TEST] To Be Deleted",
        order_index: 1,
      });

      await TemplateSwimlane.findByIdAndUpdate(swimlane._id, {
        deleted_at: new Date(),
      });

      const result = await templateSwimlaneService.findAll();

      expect(
        result.find((s) => s._id.toString() === swimlane._id.toString())
      ).toBeUndefined();
    });
  });

  describe("findById(id) - Find Swimlane By ID", () => {
    let testSwimlane;

    beforeEach(async () => {
      testSwimlane = await TemplateSwimlane.create({
        template_id: testTemplateId,
        name: "[TEST] Find By ID",
        order_index: 1,
      });
      testSwimlaneId = testSwimlane._id.toString();
    });

    it("✅ should return swimlane by id", async () => {
      const result = await templateSwimlaneService.findById(testSwimlaneId);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(testSwimlaneId);
      expect(result.name).toBe("[TEST] Find By ID");
      expect(result.template_id.toString()).toBe(testTemplateId);
    });

    it("❌ should throw error for invalid id", async () => {
      await expect(
        templateSwimlaneService.findById("invalid_id")
      ).rejects.toThrow("id không hợp lệ");
    });

    it("❌ should throw error when swimlane does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        templateSwimlaneService.findById(fakeId)
      ).rejects.toThrow("Không tìm thấy TemplateSwimlane");
    });

    it("❌ should throw error for soft-deleted swimlane", async () => {
      await TemplateSwimlane.findByIdAndUpdate(testSwimlaneId, {
        deleted_at: new Date(),
      });

      await expect(
        templateSwimlaneService.findById(testSwimlaneId)
      ).rejects.toThrow("Không tìm thấy TemplateSwimlane");
    });
  });

  describe("findByTemplate(templateId) - Find Swimlanes By Template", () => {
    it("✅ should return swimlanes for specific template", async () => {
      // Tạo template khác
      const template2 = await Template.create({
        name: "[TEST] Template 2",
        created_by: new mongoose.Types.ObjectId(creatorUser.id),
      });

      // Tạo swimlanes cho cả 2 templates
      await TemplateSwimlane.create([
        {
          template_id: testTemplateId,
          name: "[TEST] Template 1 Swimlane 1",
          order_index: 1,
        },
        {
          template_id: testTemplateId,
          name: "[TEST] Template 1 Swimlane 2",
          order_index: 2,
        },
        {
          template_id: template2._id,
          name: "[TEST] Template 2 Swimlane",
          order_index: 1,
        },
      ]);

      const result = await templateSwimlaneService.findByTemplate(
        testTemplateId
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result.every((s) => s.template_id.toString() === testTemplateId)).toBe(
        true
      );
      expect(result[0].name).toBe("[TEST] Template 1 Swimlane 1");
      expect(result[1].name).toBe("[TEST] Template 1 Swimlane 2");
    });

    it("✅ should return empty array when template has no swimlanes", async () => {
      const result = await templateSwimlaneService.findByTemplate(testTemplateId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("✅ should return swimlanes sorted by order_index", async () => {
      await TemplateSwimlane.create([
        {
          template_id: testTemplateId,
          name: "[TEST] Swimlane 3",
          order_index: 3,
        },
        {
          template_id: testTemplateId,
          name: "[TEST] Swimlane 1",
          order_index: 1,
        },
        {
          template_id: testTemplateId,
          name: "[TEST] Swimlane 2",
          order_index: 2,
        },
      ]);

      const result = await templateSwimlaneService.findByTemplate(testTemplateId);

      expect(result.length).toBe(3);
      expect(result[0].order_index).toBe(1);
      expect(result[1].order_index).toBe(2);
      expect(result[2].order_index).toBe(3);
    });

    it("❌ should throw error for invalid templateId", async () => {
      await expect(
        templateSwimlaneService.findByTemplate("invalid_id")
      ).rejects.toThrow("templateId không hợp lệ");
    });
  });

  describe("checkPermission(template, user) - Permission Checking", () => {
    let testTemplate;

    beforeEach(async () => {
      testTemplate = await Template.findById(testTemplateId).lean();
    });

    it("✅ should allow creator to perform action", () => {
      expect(() => {
        templateSwimlaneService.checkPermission(testTemplate, creatorUser);
      }).not.toThrow();
    });

    it("✅ should allow admin to perform action", () => {
      expect(() => {
        templateSwimlaneService.checkPermission(testTemplate, adminUser);
      }).not.toThrow();
    });

    it("✅ should allow System_Manager to perform action", () => {
      const systemManagerUser = {
        id: new mongoose.Types.ObjectId().toString(),
        roles: ["System_Manager"],
      };

      expect(() => {
        templateSwimlaneService.checkPermission(testTemplate, systemManagerUser);
      }).not.toThrow();
    });

    it("❌ should throw error when user is not creator and has no admin role", () => {
      expect(() => {
        templateSwimlaneService.checkPermission(testTemplate, regularUser);
      }).toThrow("Không có quyền thực hiện thao tác này");
    });

    it("✅ should handle ObjectId comparison correctly", () => {
      // Test với ObjectId object và string
      const templateWithObjectId = {
        ...testTemplate,
        created_by: new mongoose.Types.ObjectId(creatorUser.id),
      };

      expect(() => {
        templateSwimlaneService.checkPermission(templateWithObjectId, creatorUser);
      }).not.toThrow();
    });
  });

  describe("Database Operations & Edge Cases", () => {
    it("✅ should handle database connection", async () => {
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    it("✅ should create and query swimlanes directly", async () => {
      const swimlane = await TemplateSwimlane.create({
        template_id: testTemplateId,
        name: "[TEST] Direct DB Test",
        order_index: 1,
      });

      expect(swimlane._id).toBeDefined();
      expect(swimlane.name).toBe("[TEST] Direct DB Test");

      // Query swimlane
      const found = await TemplateSwimlane.findById(swimlane._id);
      expect(found).toBeDefined();
      expect(found.name).toBe("[TEST] Direct DB Test");
    });

    it("✅ should handle multiple swimlanes with same order_index", async () => {
      await TemplateSwimlane.create([
        {
          template_id: testTemplateId,
          name: "[TEST] Same Order 1",
          order_index: 1,
        },
        {
          template_id: testTemplateId,
          name: "[TEST] Same Order 2",
          order_index: 1,
        },
      ]);

      const result = await templateSwimlaneService.list(testTemplateId);
      expect(result.length).toBe(2);
      expect(result.every((s) => s.order_index === 1)).toBe(true);
    });

    it("✅ should handle negative order_index", async () => {
      const swimlane = await TemplateSwimlane.create({
        template_id: testTemplateId,
        name: "[TEST] Negative Order",
        order_index: -1,
      });

      const result = await templateSwimlaneService.list(testTemplateId);
      expect(result.length).toBe(1);
      expect(result[0].order_index).toBe(-1);
    });

    it("✅ should handle very long name", async () => {
      const longName = "[TEST] " + "A".repeat(90); // Max 100 chars
      const swimlaneData = {
        name: longName,
        order_index: 1,
      };

      const result = await templateSwimlaneService.create(
        testTemplateId,
        swimlaneData,
        creatorUser
      );

      expect(result.name).toBe(longName);
    });
  });
});


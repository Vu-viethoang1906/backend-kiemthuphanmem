// 📄 tests/unit/templateSwimlane.service.test.js - Template Swimlane Service Unit Tests

const mongoose = require("mongoose");

// Mock dependencies before requiring service
jest.mock("../../models/templateSwimlane.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock("../../models/template.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../repositories/templateSwimlane.repository", () => ({
  softDelete: jest.fn(),
}));

const templateSwimlaneService = require("../../services/templateSwimlane.service");
const TemplateSwimlane = require("../../models/templateSwimlane.model");
const Template = require("../../models/template.model");
const templateSwimlaneRepo = require("../../repositories/templateSwimlane.repository");

// Test constants
const VALID_TEMPLATE_ID = "507f1f77bcf86cd799439011";
const VALID_SWIMLANE_ID = "507f1f77bcf86cd799439012";
const VALID_USER_ID = "507f1f77bcf86cd799439013";
const OTHER_USER_ID = "507f1f77bcf86cd799439014"; // Valid ObjectId for other user
const INVALID_ID = "invalid-id";

describe("🔹 Template Swimlane Service Unit Tests", () => {
  // Helper function to mock findById().lean()
  const mockFindByIdLean = (model, value) => {
    model.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(value),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("✅ should return sorted swimlanes by template_id", async () => {
      const mockSwimlanes = [
        { _id: "swim1", name: "Swimlane 1", template_id: VALID_TEMPLATE_ID, order_index: 1 },
        { _id: "swim2", name: "Swimlane 2", template_id: VALID_TEMPLATE_ID, order_index: 2 },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSwimlanes),
      };
      TemplateSwimlane.find.mockReturnValue(mockQuery);

      const result = await templateSwimlaneService.list(VALID_TEMPLATE_ID);

      expect(TemplateSwimlane.find).toHaveBeenCalledWith({ template_id: VALID_TEMPLATE_ID });
      expect(mockQuery.sort).toHaveBeenCalledWith({ order_index: 1 });
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result).toEqual(mockSwimlanes);
    });

    it("❌ should throw error when template_id is invalid", async () => {
      await expect(templateSwimlaneService.list(INVALID_ID)).rejects.toThrow(
        "template_id không hợp lệ"
      );
      expect(TemplateSwimlane.find).not.toHaveBeenCalled();
    });

    it("✅ should return empty array when no swimlanes found", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TemplateSwimlane.find.mockReturnValue(mockQuery);

      const result = await templateSwimlaneService.list(VALID_TEMPLATE_ID);

      expect(result).toEqual([]);
    });
  });

  describe("checkPermission", () => {
    it("✅ should allow creator of template", () => {
      const template = {
        _id: "template123",
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const user = {
        id: VALID_USER_ID,
        roles: [],
      };

      expect(() => templateSwimlaneService.checkPermission(template, user)).not.toThrow();
    });

    it("✅ should allow user with admin role", () => {
      const template = {
        _id: "template123",
        created_by: new mongoose.Types.ObjectId(OTHER_USER_ID),
      };
      const user = {
        id: VALID_USER_ID,
        roles: ["admin"],
      };

      expect(() => templateSwimlaneService.checkPermission(template, user)).not.toThrow();
    });

    it("✅ should allow user with System_Manager role", () => {
      const template = {
        _id: "template123",
        created_by: new mongoose.Types.ObjectId(OTHER_USER_ID),
      };
      const user = {
        id: VALID_USER_ID,
        roles: ["System_Manager"],
      };

      expect(() => templateSwimlaneService.checkPermission(template, user)).not.toThrow();
    });

    it("❌ should throw error when user is not creator and has no allowed role", () => {
      const template = {
        _id: "template123",
        created_by: new mongoose.Types.ObjectId(OTHER_USER_ID),
      };
      const user = {
        id: VALID_USER_ID,
        roles: ["user", "member"],
      };

      expect(() => templateSwimlaneService.checkPermission(template, user)).toThrow(
        "Không có quyền thực hiện thao tác này"
      );
    });

    it("✅ should handle ObjectId comparison correctly", () => {
      const template = {
        _id: "template123",
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const user = {
        id: VALID_USER_ID,
        roles: [],
      };

      expect(() => templateSwimlaneService.checkPermission(template, user)).not.toThrow();
    });
  });

  describe("create", () => {
    const mockUser = {
      id: VALID_USER_ID,
      roles: ["admin"],
    };

    it("✅ should create swimlane successfully", async () => {
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
        name: "New Swimlane",
        order_index: 0,
      };

      Template.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTemplate),
      });
      TemplateSwimlane.create.mockResolvedValue(mockSwimlane);

      const result = await templateSwimlaneService.create(
        VALID_TEMPLATE_ID,
        { name: "New Swimlane", order_index: 0 },
        mockUser
      );

      expect(Template.findById).toHaveBeenCalledWith(VALID_TEMPLATE_ID);
      expect(TemplateSwimlane.create).toHaveBeenCalledWith({
        template_id: VALID_TEMPLATE_ID,
        name: "New Swimlane",
        order_index: 0,
      });
      expect(result).toEqual(mockSwimlane);
    });

    it("✅ should trim name before creating", async () => {
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        name: "Trimmed Name",
        order_index: 0,
      };

      mockFindByIdLean(Template, mockTemplate);
      TemplateSwimlane.create.mockResolvedValue(mockSwimlane);

      await templateSwimlaneService.create(
        VALID_TEMPLATE_ID,
        { name: "  Trimmed Name  ", order_index: 0 },
        mockUser
      );

      expect(TemplateSwimlane.create).toHaveBeenCalledWith({
        template_id: VALID_TEMPLATE_ID,
        name: "Trimmed Name",
        order_index: 0,
      });
    });

    it("✅ should use default order_index 0 when not provided", async () => {
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        name: "Swimlane",
        order_index: 0,
      };

      mockFindByIdLean(Template, mockTemplate);
      TemplateSwimlane.create.mockResolvedValue(mockSwimlane);

      await templateSwimlaneService.create(VALID_TEMPLATE_ID, { name: "Swimlane" }, mockUser);

      expect(TemplateSwimlane.create).toHaveBeenCalledWith({
        template_id: VALID_TEMPLATE_ID,
        name: "Swimlane",
        order_index: 0,
      });
    });

    it("✅ should use default order_index 0 when invalid", async () => {
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        name: "Swimlane",
        order_index: 0,
      };

      mockFindByIdLean(Template, mockTemplate);
      TemplateSwimlane.create.mockResolvedValue(mockSwimlane);

      await templateSwimlaneService.create(
        VALID_TEMPLATE_ID,
        { name: "Swimlane", order_index: "invalid" },
        mockUser
      );

      expect(TemplateSwimlane.create).toHaveBeenCalledWith({
        template_id: VALID_TEMPLATE_ID,
        name: "Swimlane",
        order_index: 0,
      });
    });

    it("❌ should throw error when template_id is invalid", async () => {
      await expect(
        templateSwimlaneService.create(INVALID_ID, { name: "Swimlane" }, mockUser)
      ).rejects.toThrow("template_id không hợp lệ");
      expect(Template.findById).not.toHaveBeenCalled();
    });

    it("❌ should throw error when name is missing", async () => {
      await expect(
        templateSwimlaneService.create(VALID_TEMPLATE_ID, {}, mockUser)
      ).rejects.toThrow("name là bắt buộc");
    });

    it("❌ should throw error when name is empty string", async () => {
      await expect(
        templateSwimlaneService.create(VALID_TEMPLATE_ID, { name: "" }, mockUser)
      ).rejects.toThrow("name là bắt buộc");
    });

    it("❌ should throw error when name is only whitespace", async () => {
      await expect(
        templateSwimlaneService.create(VALID_TEMPLATE_ID, { name: "   " }, mockUser)
      ).rejects.toThrow("name là bắt buộc");
    });

    it("❌ should throw error when template not found", async () => {
      mockFindByIdLean(Template, null);

      await expect(
        templateSwimlaneService.create(VALID_TEMPLATE_ID, { name: "Swimlane" }, mockUser)
      ).rejects.toThrow("Template không tồn tại");
    });

    it("❌ should throw error when user has no permission", async () => {
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(OTHER_USER_ID),
      };
      const userWithoutPermission = {
        id: VALID_USER_ID,
        roles: ["user"],
      };

      mockFindByIdLean(Template, mockTemplate);

      await expect(
        templateSwimlaneService.create(VALID_TEMPLATE_ID, { name: "Swimlane" }, userWithoutPermission)
      ).rejects.toThrow("Không có quyền thực hiện thao tác này");
    });
  });

  describe("update", () => {
    const mockUser = {
      id: VALID_USER_ID,
      roles: ["admin"],
    };

    it("✅ should update swimlane successfully", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
        name: "Old Name",
        order_index: 0,
      };
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockUpdated = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
        name: "New Name",
        order_index: 1,
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, mockTemplate);
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockUpdated),
      };
      TemplateSwimlane.findByIdAndUpdate.mockReturnValue(mockQuery);

      const result = await templateSwimlaneService.update(
        VALID_SWIMLANE_ID,
        { name: "New Name", order_index: 1 },
        mockUser
      );

      expect(TemplateSwimlane.findById).toHaveBeenCalledWith(VALID_SWIMLANE_ID);
      expect(Template.findById).toHaveBeenCalledWith(VALID_TEMPLATE_ID);
      expect(TemplateSwimlane.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_SWIMLANE_ID,
        { name: "New Name", order_index: 1 },
        { new: true }
      );
      expect(result).toEqual(mockUpdated);
    });

    it("✅ should trim name when updating", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
        name: "Old Name",
      };
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockUpdated = {
        _id: VALID_SWIMLANE_ID,
        name: "Trimmed Name",
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, mockTemplate);
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockUpdated),
      };
      TemplateSwimlane.findByIdAndUpdate.mockReturnValue(mockQuery);

      await templateSwimlaneService.update(
        VALID_SWIMLANE_ID,
        { name: "  Trimmed Name  " },
        mockUser
      );

      expect(TemplateSwimlane.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_SWIMLANE_ID,
        { name: "Trimmed Name" },
        { new: true }
      );
    });

    it("✅ should only update provided fields", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
        name: "Old Name",
        order_index: 0,
      };
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockUpdated = {
        _id: VALID_SWIMLANE_ID,
        name: "New Name",
        order_index: 0,
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, mockTemplate);
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockUpdated),
      };
      TemplateSwimlane.findByIdAndUpdate.mockReturnValue(mockQuery);

      await templateSwimlaneService.update(VALID_SWIMLANE_ID, { name: "New Name" }, mockUser);

      expect(TemplateSwimlane.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_SWIMLANE_ID,
        { name: "New Name" },
        { new: true }
      );
    });

    it("✅ should use default order_index 0 when invalid", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
      };
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockUpdated = {
        _id: VALID_SWIMLANE_ID,
        order_index: 0,
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, mockTemplate);
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockUpdated),
      };
      TemplateSwimlane.findByIdAndUpdate.mockReturnValue(mockQuery);

      await templateSwimlaneService.update(
        VALID_SWIMLANE_ID,
        { order_index: "invalid" },
        mockUser
      );

      expect(TemplateSwimlane.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_SWIMLANE_ID,
        { order_index: 0 },
        { new: true }
      );
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(
        templateSwimlaneService.update(INVALID_ID, { name: "New Name" }, mockUser)
      ).rejects.toThrow("id không hợp lệ");
      expect(TemplateSwimlane.findById).not.toHaveBeenCalled();
    });

    it("❌ should throw error when swimlane not found", async () => {
      mockFindByIdLean(TemplateSwimlane, null);

      await expect(
        templateSwimlaneService.update(VALID_SWIMLANE_ID, { name: "New Name" }, mockUser)
      ).rejects.toThrow("Không tìm thấy TemplateSwimlane");
    });

    it("❌ should throw error when template not found", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, null);

      await expect(
        templateSwimlaneService.update(VALID_SWIMLANE_ID, { name: "New Name" }, mockUser)
      ).rejects.toThrow("Template không tồn tại");
    });

    it("❌ should throw error when user has no permission", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
      };
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(OTHER_USER_ID),
      };
      const userWithoutPermission = {
        id: VALID_USER_ID,
        roles: ["user"],
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, mockTemplate);

      await expect(
        templateSwimlaneService.update(VALID_SWIMLANE_ID, { name: "New Name" }, userWithoutPermission)
      ).rejects.toThrow("Không có quyền thực hiện thao tác này");
    });

    it("❌ should throw error when update fails", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
      };
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, mockTemplate);
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      TemplateSwimlane.findByIdAndUpdate.mockReturnValue(mockQuery);

      await expect(
        templateSwimlaneService.update(VALID_SWIMLANE_ID, { name: "New Name" }, mockUser)
      ).rejects.toThrow("Cập nhật thất bại");
    });
  });

  describe("remove", () => {
    const mockUser = {
      id: VALID_USER_ID,
      roles: ["admin"],
    };

    it("✅ should soft delete swimlane successfully", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
        name: "Swimlane to delete",
      };
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockDeleted = {
        _id: VALID_SWIMLANE_ID,
        deleted_at: new Date(),
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, mockTemplate);
      templateSwimlaneRepo.softDelete.mockResolvedValue(mockDeleted);

      const result = await templateSwimlaneService.remove(VALID_SWIMLANE_ID, mockUser);

      expect(TemplateSwimlane.findById).toHaveBeenCalledWith(VALID_SWIMLANE_ID);
      expect(Template.findById).toHaveBeenCalledWith(VALID_TEMPLATE_ID);
      expect(templateSwimlaneRepo.softDelete).toHaveBeenCalledWith(VALID_SWIMLANE_ID);
      expect(result).toBe(true);
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(templateSwimlaneService.remove(INVALID_ID, mockUser)).rejects.toThrow(
        "id không hợp lệ"
      );
      expect(TemplateSwimlane.findById).not.toHaveBeenCalled();
    });

    it("❌ should throw error when swimlane not found", async () => {
      mockFindByIdLean(TemplateSwimlane, null);

      await expect(templateSwimlaneService.remove(VALID_SWIMLANE_ID, mockUser)).rejects.toThrow(
        "Không tìm thấy TemplateSwimlane"
      );
    });

    it("❌ should throw error when template not found", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, null);

      await expect(templateSwimlaneService.remove(VALID_SWIMLANE_ID, mockUser)).rejects.toThrow(
        "Template không tồn tại"
      );
    });

    it("❌ should throw error when user has no permission", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
      };
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(OTHER_USER_ID),
      };
      const userWithoutPermission = {
        id: VALID_USER_ID,
        roles: ["user"],
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, mockTemplate);

      await expect(
        templateSwimlaneService.remove(VALID_SWIMLANE_ID, userWithoutPermission)
      ).rejects.toThrow("Không có quyền thực hiện thao tác này");
    });

    it("❌ should throw error when softDelete fails", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
      };
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };

      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      mockFindByIdLean(Template, mockTemplate);
      templateSwimlaneRepo.softDelete.mockResolvedValue(null);

      await expect(templateSwimlaneService.remove(VALID_SWIMLANE_ID, mockUser)).rejects.toThrow(
        "Xóa thất bại"
      );
    });
  });

  describe("findAll", () => {
    it("✅ should return all swimlanes sorted by order_index", async () => {
      const mockSwimlanes = [
        { _id: "swim1", name: "Swimlane 1", order_index: 1 },
        { _id: "swim2", name: "Swimlane 2", order_index: 2 },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSwimlanes),
      };
      TemplateSwimlane.find.mockReturnValue(mockQuery);

      const result = await templateSwimlaneService.findAll();

      expect(TemplateSwimlane.find).toHaveBeenCalledWith();
      expect(mockQuery.sort).toHaveBeenCalledWith({ order_index: 1 });
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result).toEqual(mockSwimlanes);
    });

    it("✅ should return empty array when no swimlanes found", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TemplateSwimlane.find.mockReturnValue(mockQuery);

      const result = await templateSwimlaneService.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("✅ should return swimlane by id", async () => {
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        name: "Swimlane 1",
        template_id: VALID_TEMPLATE_ID,
        order_index: 1,
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockSwimlane),
      };
      TemplateSwimlane.findById.mockReturnValue(mockQuery);

      const result = await templateSwimlaneService.findById(VALID_SWIMLANE_ID);

      expect(TemplateSwimlane.findById).toHaveBeenCalledWith(VALID_SWIMLANE_ID);
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result).toEqual(mockSwimlane);
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(templateSwimlaneService.findById(INVALID_ID)).rejects.toThrow(
        "id không hợp lệ"
      );
      expect(TemplateSwimlane.findById).not.toHaveBeenCalled();
    });

    it("❌ should throw error when swimlane not found", async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      TemplateSwimlane.findById.mockReturnValue(mockQuery);

      await expect(templateSwimlaneService.findById(VALID_SWIMLANE_ID)).rejects.toThrow(
        "Không tìm thấy TemplateSwimlane"
      );
    });
  });

  describe("findByTemplate", () => {
    it("✅ should return swimlanes by templateId sorted by order_index", async () => {
      const mockSwimlanes = [
        { _id: "swim1", name: "Swimlane 1", template_id: VALID_TEMPLATE_ID, order_index: 1 },
        { _id: "swim2", name: "Swimlane 2", template_id: VALID_TEMPLATE_ID, order_index: 2 },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSwimlanes),
      };
      TemplateSwimlane.find.mockReturnValue(mockQuery);

      const result = await templateSwimlaneService.findByTemplate(VALID_TEMPLATE_ID);

      expect(TemplateSwimlane.find).toHaveBeenCalledWith({ template_id: VALID_TEMPLATE_ID });
      expect(mockQuery.sort).toHaveBeenCalledWith({ order_index: 1 });
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result).toEqual(mockSwimlanes);
    });

    it("❌ should throw error when templateId is invalid", async () => {
      await expect(templateSwimlaneService.findByTemplate(INVALID_ID)).rejects.toThrow(
        "templateId không hợp lệ"
      );
      expect(TemplateSwimlane.find).not.toHaveBeenCalled();
    });

    it("✅ should return empty array when no swimlanes found for template", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TemplateSwimlane.find.mockReturnValue(mockQuery);

      const result = await templateSwimlaneService.findByTemplate(VALID_TEMPLATE_ID);

      expect(result).toEqual([]);
    });
  });

  describe("Edge Cases & Integration", () => {
    const mockUser = {
      id: VALID_USER_ID,
      roles: ["admin"],
    };

    it("✅ should handle create -> update -> remove flow", async () => {
      // Create
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        template_id: VALID_TEMPLATE_ID,
        name: "Test Swimlane",
        order_index: 0,
      };

      mockFindByIdLean(Template, mockTemplate);
      TemplateSwimlane.create.mockResolvedValue(mockSwimlane);

      const created = await templateSwimlaneService.create(
        VALID_TEMPLATE_ID,
        { name: "Test Swimlane" },
        mockUser
      );
      expect(created).toEqual(mockSwimlane);

      // Update
      const mockUpdated = {
        ...mockSwimlane,
        name: "Updated Swimlane",
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockUpdated),
      };
      mockFindByIdLean(TemplateSwimlane, mockSwimlane);
      TemplateSwimlane.findByIdAndUpdate.mockReturnValue(mockQuery);

      const updated = await templateSwimlaneService.update(
        VALID_SWIMLANE_ID,
        { name: "Updated Swimlane" },
        mockUser
      );
      expect(updated.name).toBe("Updated Swimlane");

      // Remove
      const mockDeleted = {
        _id: VALID_SWIMLANE_ID,
        deleted_at: new Date(),
      };
      templateSwimlaneRepo.softDelete.mockResolvedValue(mockDeleted);

      const removed = await templateSwimlaneService.remove(VALID_SWIMLANE_ID, mockUser);
      expect(removed).toBe(true);
    });

    it("✅ should handle multiple roles in user", () => {
      const template = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(OTHER_USER_ID),
      };
      const user = {
        id: VALID_USER_ID,
        roles: ["user", "admin", "member"],
      };

      expect(() => templateSwimlaneService.checkPermission(template, user)).not.toThrow();
    });

    it("✅ should handle order_index as string", async () => {
      const mockTemplate = {
        _id: VALID_TEMPLATE_ID,
        created_by: new mongoose.Types.ObjectId(VALID_USER_ID),
      };
      const mockSwimlane = {
        _id: VALID_SWIMLANE_ID,
        name: "Swimlane",
        order_index: 5,
      };

      mockFindByIdLean(Template, mockTemplate);
      TemplateSwimlane.create.mockResolvedValue(mockSwimlane);

      await templateSwimlaneService.create(
        VALID_TEMPLATE_ID,
        { name: "Swimlane", order_index: "5" },
        mockUser
      );

      expect(TemplateSwimlane.create).toHaveBeenCalledWith({
        template_id: VALID_TEMPLATE_ID,
        name: "Swimlane",
        order_index: 5,
      });
    });
  });
});


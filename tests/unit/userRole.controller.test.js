// 📄 tests/unit/userRole.controller.test.js - User Role Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", roles: ["admin", "System_Manager", "ROLE_VIEW", "ROLE_CREATE", "ROLE_UPDATE", "ROLE_DELETE"] };
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
        message: `Bạn không có quyền: ${requiredRoles}`,
      });
    }
    next();
  },
  adminAny: (req, res, next) => next(),
}));

// Mock services
jest.mock("../../services/userRole.service", () => ({
  viewAll: jest.fn(),
  getRole: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteByUser: jest.fn(),
  getRoles: jest.fn(),
}));

jest.mock("../../services/rolePermission.service", () => ({
  getByRoleIds: jest.fn(),
}));

jest.mock("../../services/permission.service", () => ({
  getByIds: jest.fn(),
}));

jest.mock("../../utils/queryParser", () => ({
  parseQuery: jest.fn(),
  validateObjectIdFields: jest.fn(),
  buildDeepLinkResponse: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const userRoleRouter = require("../../router/userRole.router");

const app = express();
app.use(express.json());
app.use("/api/userRoles", userRoleRouter);

describe("🔹 User Role Controller Unit Tests", () => {
  const userRoleService = require("../../services/userRole.service");
  const rolePermissionService = require("../../services/rolePermission.service");
  const permissionService = require("../../services/permission.service");
  const queryParser = require("../../utils/queryParser");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/userRoles/all - Select All User Roles", () => {
    it("✅ should return all user roles without query params", async () => {
      const mockUserRoles = [
        { _id: "ur1", user_id: "user1", role_id: "role1" },
        { _id: "ur2", user_id: "user2", role_id: "role2" },
      ];

      userRoleService.viewAll.mockResolvedValue(mockUserRoles);

      const res = await request(app).get("/api/userRoles/all");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("count", 2);
      expect(res.body.data).toHaveLength(2);
      expect(userRoleService.viewAll).toHaveBeenCalled();
    });

    it("✅ should return filtered user roles with query params", async () => {
      const mockResult = {
        userRoles: [
          { _id: "ur1", user_id: "user1", role_id: "role1" },
        ],
        pagination: { total: 1, page: 1, limit: 10 },
      };

      queryParser.parseQuery.mockReturnValue({
        filter: { user_id: "user1" },
        pagination: { page: 1, limit: 10 },
        metadata: { sortBy: "created_at", sortOrder: "desc", filtersApplied: true },
        search: null,
        viewState: {},
      });

      queryParser.validateObjectIdFields.mockReturnValue({ user_id: "user1" });
      queryParser.buildDeepLinkResponse.mockReturnValue({
        success: true,
        data: mockResult.userRoles,
      });

      userRoleService.viewAll.mockResolvedValue(mockResult);

      const res = await request(app)
        .get("/api/userRoles/all")
        .query({ user_id: "user1", page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(queryParser.parseQuery).toHaveBeenCalled();
      expect(userRoleService.viewAll).toHaveBeenCalled();
    });

    it("❌ should return 500 for service error", async () => {
      userRoleService.viewAll.mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/api/userRoles/all");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("GET /api/userRoles/user/:userId - Get Role By User", () => {
    it("✅ should return role for a user", async () => {
      const mockRole = {
        _id: "role123",
        name: "Admin",
        user_id: "user123",
      };

      userRoleService.getRole.mockResolvedValue(mockRole);

      const res = await request(app).get("/api/userRoles/user/user123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "role123");
      expect(userRoleService.getRole).toHaveBeenCalledWith("user123");
    });

    it("❌ should return 404 when role not found", async () => {
      userRoleService.getRole.mockResolvedValue(null);

      const res = await request(app).get("/api/userRoles/user/user123");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Không tìm thấy role");
    });
  });

  describe("POST /api/userRoles - Create User Role", () => {
    it("✅ should create user role successfully", async () => {
      const mockUserRole = {
        _id: "ur123",
        user_id: "user123",
        role_id: "role123",
      };

      userRoleService.create.mockResolvedValue(mockUserRole);

      const userRoleData = {
        user_id: "user123",
        role_id: "role123",
      };

      const res = await request(app)
        .post("/api/userRoles")
        .send(userRoleData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Tạo user-role thành công");
      expect(res.body.data).toHaveProperty("_id", "ur123");
      expect(userRoleService.create).toHaveBeenCalledWith(userRoleData);
    });

    it("❌ should return 400 for invalid data", async () => {
      userRoleService.create.mockRejectedValue(
        new Error("user_id is required")
      );

      const res = await request(app)
        .post("/api/userRoles")
        .send({ role_id: "role123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("PUT /api/userRoles/:id - Update User Role", () => {
    it("✅ should update user role successfully", async () => {
      const mockUpdated = {
        _id: "ur123",
        status: "active",
      };

      userRoleService.update.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put("/api/userRoles/ur123")
        .send({ status: "active" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Cập nhật user-role thành công");
      expect(userRoleService.update).toHaveBeenCalledWith(
        "ur123",
        { status: "active" }
      );
    });

    it("❌ should return 404 when user role not found", async () => {
      userRoleService.update.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/userRoles/nonexistent")
        .send({ status: "active" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/userRoles/:id - Delete User Role", () => {
    it("✅ should delete user role successfully", async () => {
      userRoleService.delete.mockResolvedValue(true);

      const res = await request(app).delete("/api/userRoles/ur123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Xóa user-role thành công");
      expect(userRoleService.delete).toHaveBeenCalledWith("ur123");
    });

    it("❌ should return 404 when user role not found", async () => {
      userRoleService.delete.mockResolvedValue(null);

      const res = await request(app).delete("/api/userRoles/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/userRoles/user/:userId - Delete Roles By User", () => {
    it("✅ should delete all roles for a user", async () => {
      userRoleService.deleteByUser.mockResolvedValue({ deletedCount: 3 });

      const res = await request(app).delete("/api/userRoles/user/user123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("deletedCount", 3);
      expect(userRoleService.deleteByUser).toHaveBeenCalledWith("user123");
    });
  });

  describe("GET /api/userRoles/permissionUser - Get Permission", () => {
    it("✅ should return permissions for a user", async () => {
      const mockUserRoles = [
        { role_id: { _id: "role1", name: "Admin" } },
        { role_id: { _id: "role2", name: "User" } },
      ];

      const mockRolePermissions = [
        { permission_id: { _id: "perm1" } },
        { permission_id: { _id: "perm2" } },
      ];

      const mockPermissions = [
        { _id: "perm1", code: "VIEW_TASK" },
        { _id: "perm2", code: "CREATE_TASK" },
      ];

      userRoleService.getRoles.mockResolvedValue(mockUserRoles);
      rolePermissionService.getByRoleIds.mockResolvedValue(mockRolePermissions);
      permissionService.getByIds.mockResolvedValue(mockPermissions);

      // Test controller directly since route uses body
      const userRoleController = require("../../controllers/userRole.controller");
      const mockReq = {
        body: { id: "user123" },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await userRoleController.getpermission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: expect.any(Number),
        data: expect.any(Array),
        role: expect.any(Array),
      });
      expect(userRoleService.getRoles).toHaveBeenCalledWith("user123");
    });

    it("❌ should return 400 when id is missing", async () => {
      // Test controller directly
      const userRoleController = require("../../controllers/userRole.controller");
      const mockReq = {
        body: {},
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await userRoleController.getpermission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Thiếu id người dùng",
      });
    });

    it("❌ should return 404 when user has no roles", async () => {
      userRoleService.getRoles.mockResolvedValue([]);

      // Test controller directly
      const userRoleController = require("../../controllers/userRole.controller");
      const mockReq = {
        body: { id: "user123" },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await userRoleController.getpermission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Người dùng chưa có vai trò nào",
      });
    });
  });
});


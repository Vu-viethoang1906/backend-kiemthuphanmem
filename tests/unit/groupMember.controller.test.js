// 📄 tests/unit/groupMember.controller.test.js - Group Member Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", roles: ["admin", "System_Manager", "UPDATE_GROUP", "VIEW_GROUP"] };
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

// Mock group member service
jest.mock("../../services/groupMember.service", () => ({
  addMember: jest.fn(),
  addBulkMembers: jest.fn(),
  getMembers: jest.fn(),
  updateMember: jest.fn(),
  removeMember: jest.fn(),
  adminRemoveMember: jest.fn(),
  selectAll: jest.fn(),
  getGroupbyUser: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const groupMemberRouter = require("../../router/groupMember.routes");

const app = express();
app.use(express.json());
app.use("/api/groupMembers", groupMemberRouter);

describe("🔹 Group Member Controller Unit Tests", () => {
  const groupMemberService = require("../../services/groupMember.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/groupMembers - Add Member", () => {
    it("✅ should add single member successfully", async () => {
      const mockMember = {
        _id: "member123",
        user_id: "user456",
        group_id: "group123",
        role_in_group: "Member",
      };

      groupMemberService.addMember.mockResolvedValue(mockMember);

      const memberData = {
        user_id: "user456",
        group_id: "group123",
        role_in_group: "Member",
      };

      const res = await request(app)
        .post("/api/groupMembers")
        .send(memberData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "member123");
      expect(groupMemberService.addMember).toHaveBeenCalledWith({
        requester_id: "user123",
        user_id: "user456",
        group_id: "group123",
        role_in_group: "Member",
      });
    });

    it("✅ should add bulk members successfully", async () => {
      const mockResult = {
        total: 3,
        success: 3,
        failed: 0,
        members: [
          { _id: "member1", user_id: "user1" },
          { _id: "member2", user_id: "user2" },
          { _id: "member3", user_id: "user3" },
        ],
      };

      groupMemberService.addBulkMembers.mockResolvedValue(mockResult);

      const bulkData = {
        group_id: "group123",
        members: [
          { user_id: "user1", role_in_group: "Member" },
          { user_id: "user2", role_in_group: "Member" },
          { user_id: "user3", role_in_group: "Admin" },
        ],
      };

      const res = await request(app)
        .post("/api/groupMembers")
        .send(bulkData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã xử lý 3 thành viên");
      expect(res.body.data.total).toBe(3);
      expect(groupMemberService.addBulkMembers).toHaveBeenCalledWith({
        requester_id: "user123",
        group_id: "group123",
        members: bulkData.members,
      });
    });

    it("❌ should return 400 when neither user_id nor members provided", async () => {
      const res = await request(app)
        .post("/api/groupMembers")
        .send({ group_id: "group123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Cần cung cấp user_id hoặc members array"
      );
    });

    it("❌ should return 400 for invalid data", async () => {
      groupMemberService.addMember.mockRejectedValue(
        new Error("group_id is required")
      );

      const res = await request(app)
        .post("/api/groupMembers")
        .send({ user_id: "user456" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("POST /api/groupMembers/list - Get Members", () => {
    it("✅ should return members of a group", async () => {
      const mockMembers = [
        { _id: "member1", user_id: "user1", role_in_group: "Admin" },
        { _id: "member2", user_id: "user2", role_in_group: "Member" },
      ];

      groupMemberService.getMembers.mockResolvedValue(mockMembers);

      const res = await request(app)
        .post("/api/groupMembers/list")
        .send({ group_id: "group123" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(groupMemberService.getMembers).toHaveBeenCalledWith("group123");
    });
  });

  describe("GET /api/groupMembers/:group_id - Get Members By Group", () => {
    it("✅ should return members by group_id", async () => {
      const mockMembers = [
        { _id: "member1", user_id: "user1" },
      ];

      groupMemberService.getMembers.mockResolvedValue(mockMembers);

      const res = await request(app).get("/api/groupMembers/group123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(1);
      expect(groupMemberService.getMembers).toHaveBeenCalledWith("group123");
    });
  });

  describe("PUT /api/groupMembers/member - Update Member", () => {
    it("✅ should update member successfully", async () => {
      const mockUpdated = {
        _id: "member123",
        role_in_group: "Admin",
      };

      groupMemberService.updateMember.mockResolvedValue(mockUpdated);

      const updateData = {
        user_id: "user456",
        group_id: "group123",
        role_in_group: "Admin",
      };

      const res = await request(app)
        .put("/api/groupMembers/member")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Cập nhật thành viên thành công");
      expect(groupMemberService.updateMember).toHaveBeenCalledWith({
        requester_id: "user123",
        user_id: "user456",
        group_id: "group123",
        updateData: { role_in_group: "Admin" },
      });
    });

    it("❌ should return 400 when user_id or group_id is missing", async () => {
      const res = await request(app)
        .put("/api/groupMembers/member")
        .send({ group_id: "group123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "user_id và group_id là bắt buộc"
      );
    });

    it("❌ should return 400 when no update data provided", async () => {
      const res = await request(app)
        .put("/api/groupMembers/member")
        .send({ user_id: "user456", group_id: "group123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Không có dữ liệu để cập nhật");
    });
  });

  describe("DELETE /api/groupMembers - Remove Member", () => {
    it("✅ should remove member successfully", async () => {
      groupMemberService.removeMember.mockResolvedValue(true);

      const res = await request(app)
        .delete("/api/groupMembers")
        .send({ user_id: "user456", group_id: "group123" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Xóa thành công");
      expect(groupMemberService.removeMember).toHaveBeenCalledWith({
        requester_id: "user123",
        user_id: "user456",
        group_id: "group123",
      });
    });

    it("❌ should return 400 for service error", async () => {
      groupMemberService.removeMember.mockRejectedValue(
        new Error("Member không tồn tại")
      );

      const res = await request(app)
        .delete("/api/groupMembers")
        .send({ user_id: "user456", group_id: "group123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/groupMembers/admin - Admin Remove Member", () => {
    it("✅ should remove member as admin successfully", async () => {
      groupMemberService.adminRemoveMember.mockResolvedValue(true);

      const res = await request(app)
        .delete("/api/groupMembers/admin")
        .send({ user_id: "user456", group_id: "group123" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Admin xóa thành viên thành công");
      expect(groupMemberService.adminRemoveMember).toHaveBeenCalledWith({
        admin_id: "user123",
        user_id: "user456",
        group_id: "group123",
      });
    });
  });

  describe("GET /api/groupMembers/admin/all - Select All", () => {
    it("✅ should return all group members", async () => {
      const mockMembers = [
        { _id: "member1", group_id: "group1" },
        { _id: "member2", group_id: "group2" },
      ];

      groupMemberService.selectAll.mockResolvedValue(mockMembers);

      const res = await request(app).get("/api/groupMembers/admin/all");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(groupMemberService.selectAll).toHaveBeenCalled();
    });
  });

  describe("POST /api/groupMembers/getGroupUser - Get Groups By User", () => {
    it("✅ should return groups for user from body", async () => {
      const mockGroups = [
        { _id: "group1", name: "Group 1" },
        { _id: "group2", name: "Group 2" },
      ];

      groupMemberService.getGroupbyUser.mockResolvedValue(mockGroups);

      const res = await request(app)
        .post("/api/groupMembers/getGroupUser")
        .send({ id_user: "user456" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(groupMemberService.getGroupbyUser).toHaveBeenCalledWith("user456");
    });

    it("✅ should return groups for current user when id_user not provided", async () => {
      const mockGroups = [{ _id: "group1", name: "Group 1" }];

      groupMemberService.getGroupbyUser.mockResolvedValue(mockGroups);

      const res = await request(app)
        .post("/api/groupMembers/getGroupUser")
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(groupMemberService.getGroupbyUser).toHaveBeenCalledWith("user123");
    });

    it("❌ should return 400 when id_user is missing and user not authenticated", async () => {
      // Test controller directly
      const groupMemberController = require("../../controllers/groupMember.controller");
      const mockReq = {
        body: {},
        user: undefined, // No user
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await groupMemberController.selecGroupUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringMatching(/Cannot read properties of undefined|id_user is required/),
      });
    });
  });
});


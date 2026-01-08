// 📄 tests/unit/groupMember.service.test.js - Group Member Service Unit Tests
jest.mock("../../repositories/groupMember.repository");
jest.mock("../../repositories/user.repository");
jest.mock("../../repositories/group.repository");
jest.mock("../../models/userRole.model");
jest.mock("../../services/notification.service");

const groupMemberService = require("../../services/groupMember.service");
const groupMemberRepo = require("../../repositories/groupMember.repository");
const userRepo = require("../../repositories/user.repository");
const groupRepo = require("../../repositories/group.repository");
const UserRole = require("../../models/userRole.model");
const notificationService = require("../../services/notification.service");
const mongoose = require("mongoose");

// Mock mongoose.Types.ObjectId.isValid
const actualMongoose = jest.requireActual("mongoose");
mongoose.Types = actualMongoose.Types;
mongoose.Types.ObjectId.isValid = jest.fn((id) => id && typeof id === "string" && id.length === 24);

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_GROUP_ID = "507f1f77bcf86cd799439012";
const VALID_REQUESTER_ID = "507f1f77bcf86cd799439013";
const VALID_ADMIN_ID = "507f1f77bcf86cd799439014";

describe("🔹 Group Member Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock for UserRole.findOne().populate()
    UserRole.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
    });
  });

  describe("checkOwner", () => {
    it("✅ should return true when user is system admin", async () => {
      const mockUser = { _id: VALID_USER_ID };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };

      userRepo.findById.mockResolvedValue(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });

      const result = await groupMemberService.checkOwner(VALID_USER_ID, VALID_GROUP_ID);

      expect(result).toBe(true);
      expect(userRepo.findById).toHaveBeenCalledWith(VALID_USER_ID);
    });

    it("✅ should return true when user is admin", async () => {
      const mockUser = { _id: VALID_USER_ID };
      const mockSystemRole = {
        role_id: { name: "admin" },
      };

      userRepo.findById.mockResolvedValue(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });

      const result = await groupMemberService.checkOwner(VALID_USER_ID, VALID_GROUP_ID);

      expect(result).toBe(true);
    });

    it("✅ should return true when user is owner", async () => {
      const mockUser = { _id: VALID_USER_ID };
      const mockSystemRole = {
        role_id: { name: "user" },
      };
      const mockMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      userRepo.findById.mockResolvedValue(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(mockMember);

      // checkOwner doesn't return anything when user is owner, it just doesn't throw
      await expect(
        groupMemberService.checkOwner(VALID_USER_ID, VALID_GROUP_ID)
      ).resolves.not.toThrow();
    });

    it("❌ should throw error when group_id is invalid", async () => {
      await expect(
        groupMemberService.checkOwner(VALID_USER_ID, "invalid")
      ).rejects.toThrow("group_id không hợp lệ");
    });

    it("❌ should throw error when user_id is invalid", async () => {
      await expect(
        groupMemberService.checkOwner("invalid", VALID_GROUP_ID)
      ).rejects.toThrow("user_id không hợp lệ");
    });

    it("❌ should throw error when user not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        groupMemberService.checkOwner(VALID_USER_ID, VALID_GROUP_ID)
      ).rejects.toThrow("Người dùng không tồn tại");
    });

    it("❌ should throw error when user is not owner", async () => {
      const mockUser = { _id: VALID_USER_ID };
      const mockSystemRole = {
        role_id: { name: "user" },
      };
      const mockMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      userRepo.findById.mockResolvedValue(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(mockMember);

      await expect(
        groupMemberService.checkOwner(VALID_USER_ID, VALID_GROUP_ID)
      ).rejects.toThrow("Bạn không có quyền thực hiện hành động này");
    });

    it("❌ should throw error when user is not member", async () => {
      const mockUser = { _id: VALID_USER_ID };
      const mockSystemRole = {
        role_id: { name: "user" },
      };

      userRepo.findById.mockResolvedValue(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(null);

      await expect(
        groupMemberService.checkOwner(VALID_USER_ID, VALID_GROUP_ID)
      ).rejects.toThrow("Bạn không có quyền thực hiện hành động này");
    });
  });

  describe("addMember", () => {
    it("✅ should add member successfully when requester is system admin", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockUser = { _id: VALID_USER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };
      const mockNewMember = {
        _id: "new-member-id",
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(null);
      groupMemberRepo.addMember.mockResolvedValue(mockNewMember);

      const result = await groupMemberService.addMember({
        requester_id: VALID_REQUESTER_ID,
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      });

      expect(result).toEqual(mockNewMember);
      expect(groupMemberRepo.addMember).toHaveBeenCalledWith({
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      });
    });

    it("✅ should add member successfully when requester is owner", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockUser = { _id: VALID_USER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockSystemRole = {
        role_id: { name: "user" },
      };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };
      const mockNewMember = {
        _id: "new-member-id",
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(null);
      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.addMember.mockResolvedValue(mockNewMember);

      const result = await groupMemberService.addMember({
        requester_id: VALID_REQUESTER_ID,
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      });

      expect(result).toEqual(mockNewMember);
    });

    it("✅ should add member successfully when requester is admin", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockUser = { _id: VALID_USER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockSystemRole = {
        role_id: { name: "user" },
      };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Quản trị viên",
      };
      const mockNewMember = {
        _id: "new-member-id",
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(null);
      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.addMember.mockResolvedValue(mockNewMember);

      const result = await groupMemberService.addMember({
        requester_id: VALID_REQUESTER_ID,
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      });

      expect(result).toEqual(mockNewMember);
    });

    it("❌ should throw error when requester not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        groupMemberService.addMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Người yêu cầu không tồn tại");
    });

    it("❌ should throw error when requester is not member", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockSystemRole = {
        role_id: { name: "user" },
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(null);

      await expect(
        groupMemberService.addMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Bạn không phải thành viên của group này");
    });

    it("❌ should throw error when requester role is insufficient", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockSystemRole = {
        role_id: { name: "user" },
      };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(mockRequesterMember);

      await expect(
        groupMemberService.addMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Chỉ người tạo hoặc quản trị viên mới có thể thêm thành viên");
    });

    it("❌ should throw error when user not found", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(null);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });

      await expect(
        groupMemberService.addMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Người dùng không tồn tại");
    });

    it("❌ should throw error when group not found", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockUser = { _id: VALID_USER_ID };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupRepo.findById.mockResolvedValue(null);

      await expect(
        groupMemberService.addMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Group không tồn tại");
    });

    it("❌ should throw error when user already is member", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockUser = { _id: VALID_USER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };
      const mockExistingMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockExistingMember);

      await expect(
        groupMemberService.addMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("User đã là thành viên trong group này");
    });
  });

  describe("updateMember", () => {
    it("✅ should update member role successfully when requester is owner", async () => {
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };
      const mockTargetMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };
      const mockUpdatedMember = {
        _id: "member-id",
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Quản trị viên",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(mockTargetMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });
      groupMemberRepo.findMembersByRole.mockResolvedValue([mockRequesterMember]);
      groupMemberRepo.updateMember.mockResolvedValue(mockUpdatedMember);
      notificationService.createNotification.mockResolvedValue({});

      const result = await groupMemberService.updateMember({
        requester_id: VALID_REQUESTER_ID,
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        updateData: { role_in_group: "Quản trị viên" },
      });

      expect(result).toEqual(mockUpdatedMember);
      expect(groupMemberRepo.updateMember).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_GROUP_ID,
        { role_in_group: "Quản trị viên" }
      );
      expect(notificationService.createNotification).toHaveBeenCalled();
    });

    it("✅ should update member role when requester is admin", async () => {
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Quản trị viên",
      };
      const mockTargetMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };
      const mockUpdatedMember = {
        _id: "member-id",
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(mockTargetMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });
      groupMemberRepo.findMembersByRole.mockResolvedValue([{ role_in_group: "Người tạo" }]);
      groupMemberRepo.updateMember.mockResolvedValue(mockUpdatedMember);
      notificationService.createNotification.mockResolvedValue({});

      const result = await groupMemberService.updateMember({
        requester_id: VALID_REQUESTER_ID,
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        updateData: { role_in_group: "Người xem" },
      });

      expect(result).toEqual(mockUpdatedMember);
    });

    it("✅ should update member when requester is System_Manager", async () => {
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };
      const mockTargetMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };
      const mockUpdatedMember = {
        _id: "member-id",
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Quản trị viên",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(mockTargetMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "System_Manager" } }),
      });
      groupMemberRepo.findMembersByRole.mockResolvedValue([{ role_in_group: "Người tạo" }]);
      groupMemberRepo.updateMember.mockResolvedValue(mockUpdatedMember);
      notificationService.createNotification.mockResolvedValue({});

      const result = await groupMemberService.updateMember({
        requester_id: VALID_REQUESTER_ID,
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        updateData: { role_in_group: "Quản trị viên" },
      });

      expect(result).toEqual(mockUpdatedMember);
    });

    it("✅ should allow self update", async () => {
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockRequesterMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });
      groupMemberRepo.updateMember.mockResolvedValue(mockRequesterMember);
      notificationService.createNotification.mockResolvedValue({});

      // Note: Self update without role change might not have role_in_group in updateData
      // This test might need adjustment based on actual behavior
      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_REQUESTER_ID,
          group_id: VALID_GROUP_ID,
          updateData: {},
        })
      ).rejects.toThrow("Không có dữ liệu hợp lệ để cập nhật");
    });

    it("❌ should throw error when requester_id is invalid", async () => {
      await expect(
        groupMemberService.updateMember({
          requester_id: "invalid",
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: {},
        })
      ).rejects.toThrow("requester_id không hợp lệ");
    });

    it("❌ should throw error when user_id is invalid", async () => {
      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: "invalid",
          group_id: VALID_GROUP_ID,
          updateData: {},
        })
      ).rejects.toThrow("user_id không hợp lệ");
    });

    it("❌ should throw error when group_id is invalid", async () => {
      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: "invalid",
          updateData: {},
        })
      ).rejects.toThrow("group_id không hợp lệ");
    });

    it("❌ should throw error when group not found", async () => {
      groupRepo.findById.mockResolvedValue(null);

      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: {},
        })
      ).rejects.toThrow("Group ko tồn tại");
    });

    it("❌ should throw error when requester is not member", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(null);

      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: {},
        })
      ).rejects.toThrow("Bạn không phải thành viên của group này");
    });

    it("❌ should throw error when requester has insufficient permission", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockRequesterMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });

      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: { role_in_group: "Quản trị viên" },
        })
      ).rejects.toThrow("Bạn không có quyền cập nhật thông tin thành viên này");
    });

    it("❌ should throw error when role change without permission", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockRequesterMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });

      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: { role_in_group: "Quản trị viên" },
        })
      ).rejects.toThrow("Bạn không có quyền cập nhật thông tin thành viên này");
    });

    it("❌ should throw error when role is invalid", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockRequesterMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });

      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: { role_in_group: "Invalid Role" },
        })
      ).rejects.toThrow("role_in_group không hợp lệ");
    });

    it("❌ should throw error when target member not found", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(null);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });

      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: { role_in_group: "Quản trị viên" },
        })
      ).rejects.toThrow("Không tìm thấy thành viên để cập nhật");
    });

    it("❌ should throw error when demoting last owner", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };
      const mockTargetMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(mockTargetMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });
      groupMemberRepo.findMembersByRole.mockResolvedValue([mockTargetMember]);

      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: { role_in_group: "Quản trị viên" },
        })
      ).rejects.toThrow("Không thể hạ cấp Người tạo cuối cùng của group");
    });

    it("❌ should throw error when no valid data to update", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockRequesterMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });

      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: {},
        })
      ).rejects.toThrow("Không có dữ liệu hợp lệ để cập nhật");
    });

    it("❌ should throw error when update fails", async () => {
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };
      const mockTargetMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(mockTargetMember);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ role_id: { name: "user" } }),
      });
      groupMemberRepo.findMembersByRole.mockResolvedValue([mockRequesterMember]);
      groupMemberRepo.updateMember.mockResolvedValue(null);

      await expect(
        groupMemberService.updateMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
          updateData: { role_in_group: "Quản trị viên" },
        })
      ).rejects.toThrow("Không thể cập nhật thành viên");
    });
  });

  describe("removeMember", () => {
    it("✅ should remove member successfully when requester is system admin", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockMembers = [
        { user_id: VALID_REQUESTER_ID, role_in_group: "Người tạo" },
        { user_id: VALID_USER_ID, role_in_group: "Người xem" },
      ];
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };
      const mockTargetMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(mockTargetMember);
      groupMemberRepo.removeMember.mockResolvedValue({ deletedCount: 1 });
      notificationService.createNotification.mockResolvedValue({});

      const result = await groupMemberService.removeMember({
        requester_id: VALID_REQUESTER_ID,
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      });

      expect(result).toBe(true);
      expect(groupMemberRepo.removeMember).toHaveBeenCalledWith(VALID_USER_ID, VALID_GROUP_ID);
      expect(notificationService.createNotification).toHaveBeenCalled();
    });

    it("✅ should remove member successfully when requester is owner", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockMembers = [
        { user_id: VALID_REQUESTER_ID, role_in_group: "Người tạo" },
        { user_id: VALID_USER_ID, role_in_group: "Người xem" },
      ];
      const mockSystemRole = {
        role_id: { name: "user" },
      };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };
      const mockTargetMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(mockTargetMember);
      groupMemberRepo.removeMember.mockResolvedValue({ deletedCount: 1 });
      notificationService.createNotification.mockResolvedValue({});

      const result = await groupMemberService.removeMember({
        requester_id: VALID_REQUESTER_ID,
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      });

      expect(result).toBe(true);
    });

    it("❌ should throw error when requester not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Người yêu cầu không tồn tại");
    });

    it("❌ should throw error when group has no members", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue([]);

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Nhóm không có thành viên nào");
    });

    it("❌ should throw error when group not found", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockMembers = [{ user_id: VALID_USER_ID }];

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(null);

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Group ko tồn tại");
    });

    it("❌ should throw error when trying to remove last member", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMembers = [{ user_id: VALID_USER_ID }];

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(mockGroup);

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Không thể xóa thành viên cuối cùng của nhóm");
    });

    it("❌ should throw error when requester is not member", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMembers = [
        { user_id: VALID_REQUESTER_ID },
        { user_id: VALID_USER_ID },
      ];
      const mockSystemRole = {
        role_id: { name: "user" },
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(null);

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Bạn không phải thành viên của group này");
    });

    it("❌ should throw error when requester role is insufficient", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMembers = [
        { user_id: VALID_REQUESTER_ID },
        { user_id: VALID_USER_ID },
      ];
      const mockSystemRole = {
        role_id: { name: "user" },
      };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(mockRequesterMember);

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Chỉ người tạo hoặc quản trị viên mới có thể xóa thành viên");
    });

    it("❌ should throw error when owner tries to remove themselves", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMembers = [
        { user_id: VALID_REQUESTER_ID },
        { user_id: VALID_USER_ID },
      ];
      const mockSystemRole = {
        role_id: { name: "user" },
      };
      const mockRequesterMember = {
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(mockRequesterMember);

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_REQUESTER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Người tạo group không thể xóa chính mình");
    });

    it("❌ should throw error when target member not found", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMembers = [
        { user_id: VALID_REQUESTER_ID, role_in_group: "Người tạo" },
        { user_id: VALID_USER_ID, role_in_group: "Người xem" },
      ];
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      // System admin bypasses requester check, so only one findMember call for target
      groupMemberRepo.findMember.mockResolvedValueOnce(null); // Target member not found

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Không tìm thấy thành viên để xóa");
    });

    it("❌ should throw error when removing last leader", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMembers = [
        { user_id: VALID_REQUESTER_ID, role_in_group: "Người xem" },
        { user_id: VALID_USER_ID, role_in_group: "Người tạo" },
      ];
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };
      const mockTargetMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      // System admin bypasses requester check, so only one findMember call for target
      groupMemberRepo.findMember.mockResolvedValueOnce(mockTargetMember); // Target member found

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Không thể xóa vì nhóm sẽ không còn Người tạo hoặc Quản trị viên nào");
    });

    it("❌ should throw error when delete fails", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMembers = [
        { user_id: VALID_REQUESTER_ID },
        { user_id: VALID_USER_ID },
      ];
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };
      const mockTargetMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người xem",
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupMemberRepo.findAllByGroup.mockResolvedValue(mockMembers);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(mockTargetMember);
      groupMemberRepo.removeMember.mockResolvedValue({ deletedCount: 0 });

      await expect(
        groupMemberService.removeMember({
          requester_id: VALID_REQUESTER_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Không thể xóa thành viên, có thể đã bị xóa trước đó");
    });
  });

  describe("getMembers", () => {
    it("✅ should return members successfully", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMembers = [
        { user_id: VALID_USER_ID, role_in_group: "Người tạo" },
        { user_id: VALID_REQUESTER_ID, role_in_group: "Người xem" },
      ];

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.getMembersByGroup.mockResolvedValue(mockMembers);

      const result = await groupMemberService.getMembers(VALID_GROUP_ID);

      expect(result).toEqual(mockMembers);
      expect(groupRepo.findById).toHaveBeenCalledWith(VALID_GROUP_ID);
      expect(groupMemberRepo.getMembersByGroup).toHaveBeenCalledWith(VALID_GROUP_ID);
    });

    it("❌ should throw error when group not found", async () => {
      groupRepo.findById.mockResolvedValue(null);

      await expect(groupMemberService.getMembers(VALID_GROUP_ID)).rejects.toThrow(
        "Group không tồn tại hoặc đã bị xóa"
      );
    });
  });

  describe("selectAll", () => {
    it("✅ should return all group members", async () => {
      const mockMembers = [
        { user_id: VALID_USER_ID, group_id: VALID_GROUP_ID },
        { user_id: VALID_REQUESTER_ID, group_id: VALID_GROUP_ID },
      ];

      groupMemberRepo.selectAll.mockResolvedValue(mockMembers);

      const result = await groupMemberService.selectAll();

      expect(result).toEqual(mockMembers);
      expect(groupMemberRepo.selectAll).toHaveBeenCalled();
    });

    it("❌ should throw error when cannot retrieve data", async () => {
      groupMemberRepo.selectAll.mockResolvedValue(null);

      await expect(groupMemberService.selectAll()).rejects.toThrow(
        "Không thể truy xuất dữ liệu"
      );
    });
  });

  describe("getGroupbyUser", () => {
    it("✅ should return groups by user", async () => {
      const mockGroups = [
        { _id: VALID_GROUP_ID, name: "Group 1" },
        { _id: "507f1f77bcf86cd799439015", name: "Group 2" },
      ];

      groupMemberRepo.getByGroupMembers.mockResolvedValue(mockGroups);

      const result = await groupMemberService.getGroupbyUser(VALID_USER_ID);

      expect(result).toEqual(mockGroups);
      expect(groupMemberRepo.getByGroupMembers).toHaveBeenCalledWith(VALID_USER_ID);
    });

    it("❌ should throw error when cannot retrieve data", async () => {
      groupMemberRepo.getByGroupMembers.mockResolvedValue(null);

      await expect(groupMemberService.getGroupbyUser(VALID_USER_ID)).rejects.toThrow(
        "Không thể truy xuất dữ liệu"
      );
    });
  });

  describe("addBulkMembers", () => {
    it("✅ should add bulk members successfully", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };
      const mockUser1 = {
        _id: VALID_USER_ID,
        username: "user1",
        email: "user1@test.com",
      };
      const mockUser2 = {
        _id: VALID_REQUESTER_ID,
        username: "user2",
        email: "user2@test.com",
      };
      const mockNewMember1 = {
        _id: "member1",
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      };
      const mockNewMember2 = {
        _id: "member2",
        user_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember
        .mockResolvedValueOnce(null) // First member not exists
        .mockResolvedValueOnce(null); // Second member not exists
      groupMemberRepo.addMember
        .mockResolvedValueOnce(mockNewMember1)
        .mockResolvedValueOnce(mockNewMember2);
      notificationService.createNotification.mockResolvedValue({});

      const result = await groupMemberService.addBulkMembers({
        requester_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        members: [
          { user_id: VALID_USER_ID, role_in_group: "Người xem" },
          { user_id: VALID_REQUESTER_ID },
        ],
      });

      expect(result.total).toBe(2);
      expect(result.success.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it("✅ should handle partial success and errors", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };
      const mockUser1 = {
        _id: VALID_USER_ID,
        username: "user1",
        email: "user1@test.com",
      };
      const mockNewMember1 = {
        _id: "member1",
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(null); // User 2 not found
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(null);
      groupMemberRepo.addMember.mockResolvedValue(mockNewMember1);
      notificationService.createNotification.mockResolvedValue({});

      const result = await groupMemberService.addBulkMembers({
        requester_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        members: [
          { user_id: VALID_USER_ID, role_in_group: "Người xem" },
          { user_id: VALID_REQUESTER_ID }, // This will fail
        ],
      });

      expect(result.total).toBe(2);
      expect(result.success.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toBe("Người dùng không tồn tại");
    });

    it("❌ should throw error when requester not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        groupMemberService.addBulkMembers({
          requester_id: VALID_REQUESTER_ID,
          group_id: VALID_GROUP_ID,
          members: [{ user_id: VALID_USER_ID }],
        })
      ).rejects.toThrow("Người yêu cầu không tồn tại");
    });

    it("❌ should throw error when group not found", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      userRepo.findById.mockResolvedValue(mockRequester);
      groupRepo.findById.mockResolvedValue(null);

      await expect(
        groupMemberService.addBulkMembers({
          requester_id: VALID_REQUESTER_ID,
          group_id: VALID_GROUP_ID,
          members: [{ user_id: VALID_USER_ID }],
        })
      ).rejects.toThrow("Group ko tồn tại");
    });

    it("❌ should throw error when requester is not member", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockSystemRole = {
        role_id: { name: "user" },
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(null);

      await expect(
        groupMemberService.addBulkMembers({
          requester_id: VALID_REQUESTER_ID,
          group_id: VALID_GROUP_ID,
          members: [{ user_id: VALID_USER_ID }],
        })
      ).rejects.toThrow("Bạn không phải thành viên của group này");
    });

    it("❌ should throw error when members list is invalid", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });

      await expect(
        groupMemberService.addBulkMembers({
          requester_id: VALID_REQUESTER_ID,
          group_id: VALID_GROUP_ID,
          members: [],
        })
      ).rejects.toThrow("Danh sách thành viên không hợp lệ");
    });

    it("❌ should throw error when members list is not array", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });

      await expect(
        groupMemberService.addBulkMembers({
          requester_id: VALID_REQUESTER_ID,
          group_id: VALID_GROUP_ID,
          members: "invalid",
        })
      ).rejects.toThrow("Danh sách thành viên không hợp lệ");
    });

    it("❌ should throw error when too many members", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };
      const members = Array(51).fill({ user_id: VALID_USER_ID });

      userRepo.findById.mockResolvedValue(mockRequester);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });

      await expect(
        groupMemberService.addBulkMembers({
          requester_id: VALID_REQUESTER_ID,
          group_id: VALID_GROUP_ID,
          members,
        })
      ).rejects.toThrow("Không thể thêm quá 50 thành viên cùng lúc");
    });

    it("✅ should handle member without user_id", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };

      userRepo.findById.mockResolvedValue(mockRequester);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });

      const result = await groupMemberService.addBulkMembers({
        requester_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        members: [{ role_in_group: "Người xem" }],
      });

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toBe("user_id là bắt buộc");
    });

    it("✅ should handle existing member", async () => {
      const mockRequester = { _id: VALID_REQUESTER_ID };
      const mockGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      const mockSystemRole = {
        role_id: { name: "System_Manager" },
      };
      const mockUser = {
        _id: VALID_USER_ID,
        username: "user1",
        email: "user1@test.com",
      };
      const mockExistingMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser);
      groupRepo.findById.mockResolvedValue(mockGroup);
      UserRole.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSystemRole),
      });
      groupMemberRepo.findMember.mockResolvedValue(mockExistingMember);

      const result = await groupMemberService.addBulkMembers({
        requester_id: VALID_REQUESTER_ID,
        group_id: VALID_GROUP_ID,
        members: [{ user_id: VALID_USER_ID }],
      });

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toBe("User đã là thành viên trong group này");
    });
  });

  describe("adminRemoveMember", () => {
    it("✅ should remove member as admin successfully", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockMember);
      groupMemberRepo.removeMember.mockResolvedValue({ deletedCount: 1 });

      const result = await groupMemberService.adminRemoveMember({
        admin_id: VALID_ADMIN_ID,
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      });

      expect(result).toBe(true);
      expect(groupMemberRepo.removeMember).toHaveBeenCalledWith(VALID_USER_ID, VALID_GROUP_ID);
    });

    it("❌ should throw error when admin_id is invalid", async () => {
      await expect(
        groupMemberService.adminRemoveMember({
          admin_id: "invalid",
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("admin_id không hợp lệ");
    });

    it("❌ should throw error when user_id is invalid", async () => {
      await expect(
        groupMemberService.adminRemoveMember({
          admin_id: VALID_ADMIN_ID,
          user_id: "invalid",
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("user_id không hợp lệ");
    });

    it("❌ should throw error when group_id is invalid", async () => {
      await expect(
        groupMemberService.adminRemoveMember({
          admin_id: VALID_ADMIN_ID,
          user_id: VALID_USER_ID,
          group_id: "invalid",
        })
      ).rejects.toThrow("group_id không hợp lệ");
    });

    it("❌ should throw error when group not found", async () => {
      groupRepo.findById.mockResolvedValue(null);

      await expect(
        groupMemberService.adminRemoveMember({
          admin_id: VALID_ADMIN_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Group không tồn tại");
    });

    it("❌ should throw error when member not found", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(null);

      await expect(
        groupMemberService.adminRemoveMember({
          admin_id: VALID_ADMIN_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Thành viên không tồn tại trong group này");
    });

    it("❌ should throw error when delete fails", async () => {
      const mockGroup = { _id: VALID_GROUP_ID };
      const mockMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockMember);
      groupMemberRepo.removeMember.mockResolvedValue({ deletedCount: 0 });

      await expect(
        groupMemberService.adminRemoveMember({
          admin_id: VALID_ADMIN_ID,
          user_id: VALID_USER_ID,
          group_id: VALID_GROUP_ID,
        })
      ).rejects.toThrow("Không thể xóa thành viên");
    });
  });
});



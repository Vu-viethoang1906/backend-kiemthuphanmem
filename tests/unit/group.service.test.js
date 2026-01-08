// 📄 tests/unit/group.service.test.js - Group Service Unit Tests
jest.mock("../../repositories/group.repository");
jest.mock("../../repositories/groupMember.repository");
jest.mock("../../repositories/boardMember.repository");
jest.mock("../../repositories/board.repository");
jest.mock("../../services/user.service");
jest.mock("../../services/historyTask.service");

const groupService = require("../../services/group.service");
const groupRepo = require("../../repositories/group.repository");
const groupMemberRepo = require("../../repositories/groupMember.repository");
const boardMember = require("../../repositories/boardMember.repository");
const mongoose = require("mongoose");

// Mock mongoose.Types.ObjectId.isValid
const actualMongoose = jest.requireActual("mongoose");
mongoose.Types = actualMongoose.Types;
mongoose.Types.ObjectId.isValid = jest.fn((id) => id && typeof id === "string" && id.length === 24);

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_CENTER_ID = "507f1f77bcf86cd799439012";
const VALID_GROUP_ID = "507f1f77bcf86cd799439013";

describe("🔹 Group Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createGroup", () => {
    it("✅ should create group successfully", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        center_id: VALID_CENTER_ID,
        name: "Test Group",
        description: "Test description",
      };

      groupRepo.findOne.mockResolvedValue(null);
      groupRepo.create.mockResolvedValue(mockGroup);
      groupMemberRepo.addMember.mockResolvedValue({});

      const result = await groupService.createGroup({
        center_id: VALID_CENTER_ID,
        name: "Test Group",
        userId: VALID_USER_ID,
        description: "Test description",
      });

      expect(result).toEqual(mockGroup);
      expect(groupRepo.findOne).toHaveBeenCalledWith(expect.any(Object), "Test Group");
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          center_id: expect.any(Object),
          name: "Test Group",
          description: "Test description",
        })
      );
      expect(groupMemberRepo.addMember).toHaveBeenCalledWith({
        group_id: VALID_GROUP_ID,
        user_id: expect.any(Object),
        role_in_group: "Người tạo",
      });
    });

    it("❌ should throw error when userId is missing", async () => {
      await expect(
        groupService.createGroup({
          center_id: VALID_CENTER_ID,
          name: "Test Group",
        })
      ).rejects.toThrow("userId là bắt buộc");
    });

    it("❌ should throw error when name is missing", async () => {
      await expect(
        groupService.createGroup({
          center_id: VALID_CENTER_ID,
          userId: VALID_USER_ID,
        })
      ).rejects.toThrow("Tên group là bắt buộc và phải là chuỗi hợp lệ");
    });

    it("❌ should throw error when name is empty string", async () => {
      await expect(
        groupService.createGroup({
          center_id: VALID_CENTER_ID,
          name: "   ",
          userId: VALID_USER_ID,
        })
      ).rejects.toThrow("Tên group là bắt buộc và phải là chuỗi hợp lệ");
    });

    it("❌ should throw error when center_id is invalid", async () => {
      await expect(
        groupService.createGroup({
          center_id: "invalid",
          name: "Test Group",
          userId: VALID_USER_ID,
        })
      ).rejects.toThrow("center_id không hợp lệ");
    });

    it("❌ should throw error when userId is invalid", async () => {
      await expect(
        groupService.createGroup({
          center_id: VALID_CENTER_ID,
          name: "Test Group",
          userId: "invalid",
        })
      ).rejects.toThrow("userId không hợp lệ");
    });

    it("❌ should throw error when group name already exists", async () => {
      const existingGroup = { _id: VALID_GROUP_ID, name: "Test Group" };
      groupRepo.findOne.mockResolvedValue(existingGroup);

      await expect(
        groupService.createGroup({
          center_id: VALID_CENTER_ID,
          name: "Test Group",
          userId: VALID_USER_ID,
        })
      ).rejects.toThrow("Tên group đã tồn tại trong center này");
    });
  });

  describe("getGroupById", () => {
    it("✅ should return group by id", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
        center_id: VALID_CENTER_ID,
      };

      groupRepo.findById.mockResolvedValue(mockGroup);

      const result = await groupService.getGroupById(VALID_GROUP_ID);

      expect(result).toEqual(mockGroup);
      expect(groupRepo.findById).toHaveBeenCalledWith(VALID_GROUP_ID);
    });

    it("❌ should throw error when id is missing", async () => {
      await expect(groupService.getGroupById(null)).rejects.toThrow(
        "ID group không hợp lệ"
      );
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(groupService.getGroupById("invalid")).rejects.toThrow(
        "ID group không hợp lệ"
      );
    });

    it("❌ should throw error when group not found", async () => {
      groupRepo.findById.mockResolvedValue(null);

      await expect(groupService.getGroupById(VALID_GROUP_ID)).rejects.toThrow(
        "Group không tồn tại"
      );
    });
  });

  describe("getAllGroups", () => {
    it("✅ should return all groups", async () => {
      const mockGroups = {
        groups: [
          { _id: VALID_GROUP_ID, name: "Group 1" },
          { _id: "507f1f77bcf86cd799439014", name: "Group 2" },
        ],
        pagination: { page: 1, limit: 10, total: 2, pages: 1 },
      };

      groupRepo.findAll.mockResolvedValue(mockGroups);

      const result = await groupService.getAllGroups();

      expect(result).toEqual(mockGroups);
      expect(groupRepo.findAll).toHaveBeenCalledWith({});
    });

    it("✅ should return groups with options", async () => {
      const options = { page: 2, limit: 5 };
      const mockGroups = {
        groups: [{ _id: VALID_GROUP_ID, name: "Group 1" }],
        pagination: { page: 2, limit: 5, total: 1, pages: 1 },
      };

      groupRepo.findAll.mockResolvedValue(mockGroups);

      const result = await groupService.getAllGroups(options);

      expect(result).toEqual(mockGroups);
      expect(groupRepo.findAll).toHaveBeenCalledWith(options);
    });
  });

  describe("getUserGroups", () => {
    it("✅ should return user groups", async () => {
      const mockGroups = [
        { _id: VALID_GROUP_ID, name: "Group 1" },
        { _id: "507f1f77bcf86cd799439014", name: "Group 2" },
      ];

      groupMemberRepo.getByGroupMembers.mockResolvedValue(mockGroups);

      const result = await groupService.getUserGroups(VALID_USER_ID);

      expect(result).toEqual(mockGroups);
      expect(groupMemberRepo.getByGroupMembers).toHaveBeenCalledWith(VALID_USER_ID);
    });

    it("❌ should throw error when userId is missing", async () => {
      await expect(groupService.getUserGroups(null)).rejects.toThrow(
        "userId không hợp lệ"
      );
    });

    it("❌ should throw error when userId is invalid", async () => {
      await expect(groupService.getUserGroups("invalid")).rejects.toThrow(
        "userId không hợp lệ"
      );
    });
  });

  describe("updateGroup", () => {
    it("✅ should update group successfully", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Old Name",
        center_id: VALID_CENTER_ID,
      };
      const mockUpdatedGroup = {
        _id: VALID_GROUP_ID,
        name: "New Name",
        center_id: VALID_CENTER_ID,
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.findById.mockResolvedValue(mockGroup);
      groupRepo.findOne.mockResolvedValue(null);
      groupRepo.update.mockResolvedValue(mockUpdatedGroup);

      const result = await groupService.updateGroup(
        VALID_GROUP_ID,
        { name: "New Name" },
        VALID_USER_ID
      );

      expect(result).toEqual(mockUpdatedGroup);
      expect(groupMemberRepo.findMember).toHaveBeenCalledWith(VALID_USER_ID, VALID_GROUP_ID);
      expect(groupRepo.update).toHaveBeenCalledWith(VALID_GROUP_ID, { name: "New Name" });
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(
        groupService.updateGroup("invalid", { name: "New Name" }, VALID_USER_ID)
      ).rejects.toThrow("ID group không hợp lệ");
    });

    it("❌ should throw error when user is not creator", async () => {
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Thành viên",
      };

      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);

      await expect(
        groupService.updateGroup(VALID_GROUP_ID, { name: "New Name" }, VALID_USER_ID)
      ).rejects.toThrow("Chỉ người tạo group mới được cập nhật group");
    });

    it("❌ should throw error when user is not member", async () => {
      groupMemberRepo.findMember.mockResolvedValue(null);

      await expect(
        groupService.updateGroup(VALID_GROUP_ID, { name: "New Name" }, VALID_USER_ID)
      ).rejects.toThrow("Chỉ người tạo group mới được cập nhật group");
    });

    it("❌ should throw error when group not found", async () => {
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.findById.mockResolvedValue(null);

      await expect(
        groupService.updateGroup(VALID_GROUP_ID, { name: "New Name" }, VALID_USER_ID)
      ).rejects.toThrow("Không tìm thấy group để cập nhật");
    });

    it("❌ should throw error when name is empty", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Old Name",
        center_id: VALID_CENTER_ID,
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.findById.mockResolvedValue(mockGroup);

      await expect(
        groupService.updateGroup(VALID_GROUP_ID, { name: "   " }, VALID_USER_ID)
      ).rejects.toThrow("Tên group phải là chuỗi hợp lệ");
    });

    it("❌ should throw error when name is too long", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Old Name",
        center_id: VALID_CENTER_ID,
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.findById.mockResolvedValue(mockGroup);

      const longName = "a".repeat(201);

      await expect(
        groupService.updateGroup(VALID_GROUP_ID, { name: longName }, VALID_USER_ID)
      ).rejects.toThrow("Tên group không được dài quá 200 ký tự");
    });

    it("❌ should throw error when new name already exists", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Old Name",
        center_id: VALID_CENTER_ID,
      };
      const existingGroup = {
        _id: "507f1f77bcf86cd799439014",
        name: "New Name",
        center_id: VALID_CENTER_ID,
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.findById.mockResolvedValue(mockGroup);
      groupRepo.findOne.mockResolvedValue(existingGroup);

      await expect(
        groupService.updateGroup(VALID_GROUP_ID, { name: "New Name" }, VALID_USER_ID)
      ).rejects.toThrow("Tên group đã tồn tại trong center này");
    });

    it("❌ should throw error when description is too long", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
        center_id: VALID_CENTER_ID,
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.findById.mockResolvedValue(mockGroup);

      const longDescription = "a".repeat(301);

      await expect(
        groupService.updateGroup(VALID_GROUP_ID, { description: longDescription }, VALID_USER_ID)
      ).rejects.toThrow("Description không được dài quá 300 ký tự");
    });

    it("❌ should throw error when center_id is invalid", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
        center_id: VALID_CENTER_ID,
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.findById.mockResolvedValue(mockGroup);

      await expect(
        groupService.updateGroup(VALID_GROUP_ID, { center_id: "invalid" }, VALID_USER_ID)
      ).rejects.toThrow("center_id không hợp lệ");
    });

    it("✅ should update description only", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
        center_id: VALID_CENTER_ID,
      };
      const mockUpdatedGroup = {
        ...mockGroup,
        description: "New description",
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.findById.mockResolvedValue(mockGroup);
      groupRepo.update.mockResolvedValue(mockUpdatedGroup);

      const result = await groupService.updateGroup(
        VALID_GROUP_ID,
        { description: "New description" },
        VALID_USER_ID
      );

      expect(result).toEqual(mockUpdatedGroup);
    });
  });

  describe("deleteGroup", () => {
    it("✅ should delete group successfully", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.softDelete.mockResolvedValue(mockGroup);
      groupMemberRepo.deleteAllByGroup.mockResolvedValue({});

      const result = await groupService.deleteGroup(VALID_GROUP_ID, VALID_USER_ID);

      expect(result).toBe(true);
      expect(groupRepo.softDelete).toHaveBeenCalledWith(VALID_GROUP_ID);
      expect(groupMemberRepo.deleteAllByGroup).toHaveBeenCalledWith(VALID_GROUP_ID);
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(groupService.deleteGroup("invalid", VALID_USER_ID)).rejects.toThrow(
        "ID group không hợp lệ"
      );
    });

    it("❌ should throw error when group not found", async () => {
      groupRepo.findById.mockResolvedValue(null);

      await expect(groupService.deleteGroup(VALID_GROUP_ID, VALID_USER_ID)).rejects.toThrow(
        "Không tìm thấy group để xoá"
      );
    });

    it("❌ should throw error when user is not member", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(null);

      await expect(groupService.deleteGroup(VALID_GROUP_ID, VALID_USER_ID)).rejects.toThrow(
        "Bạn không phải thành viên của group này"
      );
    });

    it("❌ should throw error when user is not creator", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Thành viên",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);

      await expect(groupService.deleteGroup(VALID_GROUP_ID, VALID_USER_ID)).rejects.toThrow(
        "Chỉ người tạo group mới được xóa group"
      );
    });

    it("❌ should throw error when soft delete fails", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
      };
      const mockGroupMember = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
        role_in_group: "Người tạo",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupMemberRepo.findMember.mockResolvedValue(mockGroupMember);
      groupRepo.softDelete.mockResolvedValue(null);

      await expect(groupService.deleteGroup(VALID_GROUP_ID, VALID_USER_ID)).rejects.toThrow(
        "Không thể xóa group"
      );
    });
  });

  describe("adminDeleteGroup", () => {
    it("✅ should delete group as admin", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupRepo.softDelete.mockResolvedValue(mockGroup);
      groupMemberRepo.deleteAllByGroup.mockResolvedValue({});

      const result = await groupService.adminDeleteGroup(VALID_GROUP_ID, ["admin"]);

      expect(result).toBe(true);
      expect(groupRepo.softDelete).toHaveBeenCalledWith(VALID_GROUP_ID);
      expect(groupMemberRepo.deleteAllByGroup).toHaveBeenCalledWith(VALID_GROUP_ID);
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(groupService.adminDeleteGroup("invalid", ["admin"])).rejects.toThrow(
        "ID group không hợp lệ"
      );
    });

    it("❌ should throw error when user is not admin", async () => {
      await expect(
        groupService.adminDeleteGroup(VALID_GROUP_ID, ["user", "member"])
      ).rejects.toThrow("Chỉ admin hệ thống mới có quyền này");
    });

    it("❌ should throw error when roles is null", async () => {
      await expect(groupService.adminDeleteGroup(VALID_GROUP_ID, null)).rejects.toThrow(
        "Chỉ admin hệ thống mới có quyền này"
      );
    });

    it("❌ should throw error when group not found", async () => {
      groupRepo.findById.mockResolvedValue(null);

      await expect(groupService.adminDeleteGroup(VALID_GROUP_ID, ["admin"])).rejects.toThrow(
        "Group không tồn tại"
      );
    });

    it("❌ should throw error when soft delete fails", async () => {
      const mockGroup = {
        _id: VALID_GROUP_ID,
        name: "Test Group",
      };

      groupRepo.findById.mockResolvedValue(mockGroup);
      groupRepo.softDelete.mockResolvedValue(null);

      await expect(groupService.adminDeleteGroup(VALID_GROUP_ID, ["admin"])).rejects.toThrow(
        "Không thể xóa group"
      );
    });
  });

  describe("viewBoardMember", () => {
    it("✅ should return board members for user in group", async () => {
      const mockUserInGroup = {
        user_id: VALID_USER_ID,
        group_id: VALID_GROUP_ID,
      };
      const mockUserBoards = [
        { _id: "board1", title: "Board 1" },
        { _id: "board2", title: "Board 2" },
      ];

      groupMemberRepo.findMember.mockResolvedValue(mockUserInGroup);
      boardMember.getBoardsByUser.mockResolvedValue(mockUserBoards);

      const result = await groupService.viewBoardMember(VALID_USER_ID, VALID_GROUP_ID);

      expect(result).toEqual(mockUserBoards);
      expect(groupMemberRepo.findMember).toHaveBeenCalledWith(VALID_USER_ID, VALID_GROUP_ID);
      expect(boardMember.getBoardsByUser).toHaveBeenCalledWith(VALID_USER_ID);
    });

    it("❌ should throw error when user is not in group", async () => {
      groupMemberRepo.findMember.mockResolvedValue(null);

      await expect(
        groupService.viewBoardMember(VALID_USER_ID, VALID_GROUP_ID)
      ).rejects.toThrow("user này ko ở trong group");
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      groupMemberRepo.findMember.mockRejectedValue(error);

      await expect(
        groupService.viewBoardMember(VALID_USER_ID, VALID_GROUP_ID)
      ).rejects.toThrow("lỗi service viewBoardMember : Database error");
    });
  });
});


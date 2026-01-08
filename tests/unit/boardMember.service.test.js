// 📄 tests/unit/boardMember.service.test.js - Board Member Service Unit Tests
jest.mock("../../repositories/boardMember.repository");
jest.mock("../../repositories/user.repository");
jest.mock("../../repositories/board.repository");
jest.mock("../../repositories/userRole.repository");
jest.mock("../../services/notification.service");
jest.mock("../../config/socket", () => ({
  sendNotification: jest.fn(),
}));

// Mock mongoose Types.ObjectId.isValid but keep Schema working
const mongoose = require("mongoose");
const originalIsValid = mongoose.Types.ObjectId.isValid;
mongoose.Types.ObjectId.isValid = jest.fn((id) => {
  // Valid ObjectId format: 24 hex characters
  return id && typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
});

const boardMemberService = require("../../services/boardMember.service");
const boardMemberRepo = require("../../repositories/boardMember.repository");
const userRepo = require("../../repositories/user.repository");
const boardRepo = require("../../repositories/board.repository");
const UserRoleRepo = require("../../repositories/userRole.repository");
const notificationService = require("../../services/notification.service");
const { sendNotification } = require("../../config/socket");

// Valid ObjectIds for testing (24 hex characters)
const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_BOARD_ID = "507f1f77bcf86cd799439012";
const VALID_REQUester_ID = "507f1f77bcf86cd799439013";
const VALID_MEMBER_ID = "507f1f77bcf86cd799439014";

describe("🔹 Board Member Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("selectAll", () => {
    it("✅ should return all board members", async () => {
      const mockMembers = [
        { _id: "member1", user_id: "user1", board_id: "board1" },
        { _id: "member2", user_id: "user2", board_id: "board2" },
      ];

      boardMemberRepo.selectAll.mockResolvedValue(mockMembers);

      const result = await boardMemberService.selectAll();

      expect(result).toEqual(mockMembers);
      expect(boardMemberRepo.selectAll).toHaveBeenCalled();
    });
  });

  describe("notification", () => {
    it("✅ should create notification for add_member", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };
      const mockNotification = {
        _id: "notif123",
        user_id: "user123",
        title: "Bạn vừa được thêm vào bảng \"Test Board\"",
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue(mockNotification);

      const result = await boardMemberService.notification(
        "user123",
        "board123",
        "Thành viên",
        "add_member"
      );

      expect(result).toEqual(mockNotification);
      expect(notificationService.createNotification).toHaveBeenCalledWith({
        user_id: "user123",
        title: 'Bạn vừa được thêm vào bảng "Test Board"',
        body: "Bạn đã được thêm vào bảng với quyền: Thành viên",
      });
    });

    it("✅ should create notification for remove_member", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };
      const mockNotification = {
        _id: "notif123",
        user_id: "user123",
        title: 'Bạn đã bị xóa khỏi bảng "Test Board"',
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue(mockNotification);

      const result = await boardMemberService.notification(
        "user123",
        "board123",
        "",
        "remove_member"
      );

      expect(result).toEqual(mockNotification);
      expect(notificationService.createNotification).toHaveBeenCalledWith({
        user_id: "user123",
        title: 'Bạn đã bị xóa khỏi bảng "Test Board"',
        body: "Bạn không còn là thành viên trong bảng này.",
      });
    });

    it("✅ should create notification for update_role", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };
      const mockNotification = {
        _id: "notif123",
        user_id: "user123",
        title: 'Vai trò của bạn trong bảng "Test Board" đã thay đổi',
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue(mockNotification);

      const result = await boardMemberService.notification(
        "user123",
        "board123",
        "Thành viên",
        "update_role"
      );

      expect(result).toEqual(mockNotification);
      expect(notificationService.createNotification).toHaveBeenCalledWith({
        user_id: "user123",
        title: 'Vai trò của bạn trong bảng "Test Board" đã thay đổi',
        body: "Vai trò mới của bạn là: Thành viên",
      });
    });

    it("❌ should throw error when idUser is missing", async () => {
      // Service catches all errors and throws generic message
      await expect(
        boardMemberService.notification(null, VALID_BOARD_ID, "role", "add_member")
      ).rejects.toThrow("Không gửi được notification");
    });

    it("❌ should throw error when idBoard is missing", async () => {
      // Service catches all errors and throws generic message
      await expect(
        boardMemberService.notification(VALID_USER_ID, null, "role", "add_member")
      ).rejects.toThrow("Không gửi được notification");
    });

    it("❌ should throw error when board not found", async () => {
      boardRepo.findById.mockResolvedValue(null);

      // Service catches all errors and throws generic message
      await expect(
        boardMemberService.notification(
          VALID_USER_ID,
          VALID_BOARD_ID,
          "role",
          "add_member"
        )
      ).rejects.toThrow("Không gửi được notification");
    });
  });

  describe("addMember", () => {
    it("✅ should add member successfully", async () => {
      const mockRequester = { _id: VALID_REQUester_ID, username: "requester" };
      const mockBoard = { _id: VALID_BOARD_ID, title: "Test Board" };
      const mockUser = { _id: VALID_USER_ID, username: "user" };
      const mockRequesterMember = {
        _id: "reqMember123",
        role_in_board: "Người tạo",
      };
      const mockNewMember = {
        _id: VALID_MEMBER_ID,
        user_id: VALID_USER_ID,
        board_id: VALID_BOARD_ID,
        role_in_board: "Thành viên",
      };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser);
      boardRepo.getBoardById.mockResolvedValue(mockBoard);
      boardMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(null);
      boardMemberRepo.addMember.mockResolvedValue(mockNewMember);
      // Mock notification dependencies
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      const result = await boardMemberService.addMember({
        requester_id: VALID_REQUester_ID,
        user_id: VALID_USER_ID,
        board_id: VALID_BOARD_ID,
        role_in_board: "Thành viên",
      });

      expect(result).toEqual(mockNewMember);
      expect(boardMemberRepo.addMember).toHaveBeenCalledWith({
        user_id: VALID_USER_ID,
        board_id: VALID_BOARD_ID,
        role_in_board: "Thành viên",
      });
      expect(sendNotification).toHaveBeenCalled();
    });

    it("❌ should throw error when user_id is invalid", async () => {
      await expect(
        boardMemberService.addMember({
          requester_id: "requester123",
          user_id: "invalid",
          board_id: "board123",
          role_in_board: "Thành viên",
        })
      ).rejects.toThrow("user_id không hợp lệ");
    });

    it("❌ should throw error when board_id is invalid", async () => {
      await expect(
        boardMemberService.addMember({
          requester_id: VALID_REQUester_ID,
          user_id: VALID_USER_ID,
          board_id: "invalid",
          role_in_board: "Thành viên",
        })
      ).rejects.toThrow("board_id không hợp lệ");
    });

    it("❌ should throw error when role_in_board is invalid", async () => {
      await expect(
        boardMemberService.addMember({
          requester_id: VALID_REQUester_ID,
          user_id: VALID_USER_ID,
          board_id: VALID_BOARD_ID,
          role_in_board: "Invalid Role",
        })
      ).rejects.toThrow("role_in_board không hợp lệ");
    });

    it("❌ should throw error when requester not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        boardMemberService.addMember({
          requester_id: "507f1f77bcf86cd799439099",
          user_id: VALID_USER_ID,
          board_id: VALID_BOARD_ID,
          role_in_board: "Thành viên",
        })
      ).rejects.toThrow("Người thực hiện không tồn tại");
    });

    it("❌ should throw error when board not found", async () => {
      userRepo.findById.mockResolvedValue({ _id: "requester123" });
      boardRepo.getBoardById.mockResolvedValue(null);

      await expect(
        boardMemberService.addMember({
          requester_id: VALID_REQUester_ID,
          user_id: VALID_USER_ID,
          board_id: "507f1f77bcf86cd799439099",
          role_in_board: "Thành viên",
        })
      ).rejects.toThrow("Board không tồn tại");
    });

    it("❌ should throw error when requester is not board member", async () => {
      userRepo.findById.mockResolvedValue({ _id: "requester123" });
      boardRepo.getBoardById.mockResolvedValue({ _id: "board123" });
      boardMemberRepo.findMember.mockResolvedValue(null);

      await expect(
        boardMemberService.addMember({
          requester_id: VALID_REQUester_ID,
          user_id: VALID_USER_ID,
          board_id: VALID_BOARD_ID,
          role_in_board: "Thành viên",
        })
      ).rejects.toThrow("Bạn không phải thành viên của board này");
    });

    it("❌ should throw error when requester has no permission", async () => {
      userRepo.findById.mockResolvedValue({ _id: "requester123" });
      boardRepo.getBoardById.mockResolvedValue({ _id: "board123" });
      boardMemberRepo.findMember.mockResolvedValue({
        role_in_board: "Khách",
      });

      await expect(
        boardMemberService.addMember({
          requester_id: VALID_REQUester_ID,
          user_id: VALID_USER_ID,
          board_id: VALID_BOARD_ID,
          role_in_board: "Thành viên",
        })
      ).rejects.toThrow(
        "Chỉ người tạo hoặc thành viên mới có quyền thêm thành viên"
      );
    });

    it("❌ should throw error when user already is member", async () => {
      const mockRequester = { _id: "requester123" };
      const mockBoard = { _id: "board123" };
      const mockUser = { _id: "user123" };
      const mockRequesterMember = { role_in_board: "Người tạo" };
      const mockExistingMember = { _id: "existing123" };

      userRepo.findById
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockUser);
      boardRepo.getBoardById.mockResolvedValue(mockBoard);
      boardMemberRepo.findMember
        .mockResolvedValueOnce(mockRequesterMember)
        .mockResolvedValueOnce(mockExistingMember);

      await expect(
        boardMemberService.addMember({
          requester_id: VALID_REQUester_ID,
          user_id: VALID_USER_ID,
          board_id: VALID_BOARD_ID,
          role_in_board: "Thành viên",
        })
      ).rejects.toThrow("User đã là thành viên trong board này");
    });
  });

  describe("getMembers", () => {
    it("✅ should return board members", async () => {
      const mockMembers = [
        { _id: "member1", user_id: "user1", board_id: "board123" },
        { _id: "member2", user_id: "user2", board_id: "board123" },
      ];

      boardMemberRepo.getMembersByBoard.mockResolvedValue(mockMembers);

      const result = await boardMemberService.getMembers(VALID_BOARD_ID);

      expect(result).toEqual(mockMembers);
      expect(boardMemberRepo.getMembersByBoard).toHaveBeenCalledWith(VALID_BOARD_ID);
    });

    it("❌ should throw error when board_id is invalid", async () => {
      await expect(
        boardMemberService.getMembers("invalid")
      ).rejects.toThrow("board_id không hợp lệ");
    });
  });

  describe("updateRole", () => {
    it("✅ should update role successfully", async () => {
      const mockUser = { _id: "user123" };
      const mockBoard = { _id: "board123" };
      const mockTargetMember = {
        _id: "member123",
        role_in_board: "Thành viên",
      };
      const mockUpdatedMember = {
        _id: "member123",
        role_in_board: "Người Xem",
      };

      userRepo.findById.mockResolvedValue(mockUser);
      boardRepo.getBoardById.mockResolvedValue(mockBoard);
      boardRepo.isCreatorFromMember.mockResolvedValue(true);
      boardMemberRepo.findMember.mockResolvedValue(mockTargetMember);
      boardMemberRepo.countCreators.mockResolvedValue(2);
      boardMemberRepo.updateRole.mockResolvedValue(mockUpdatedMember);
      // Mock notification dependencies
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      const result = await boardMemberService.updateRole(
        VALID_REQUester_ID,
        VALID_USER_ID,
        VALID_BOARD_ID,
        "Người Xem"
      );

      expect(result).toEqual(mockUpdatedMember);
      expect(boardMemberRepo.updateRole).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_BOARD_ID,
        "Người Xem"
      );
      expect(sendNotification).toHaveBeenCalled();
    });

    it("❌ should throw error when user_id is invalid", async () => {
      await expect(
        boardMemberService.updateRole(
          VALID_REQUester_ID,
          "invalid",
          VALID_BOARD_ID,
          "Người Xem"
        )
      ).rejects.toThrow("user_id không hợp lệ");
    });

    it("❌ should throw error when role_in_board is invalid", async () => {
      await expect(
        boardMemberService.updateRole(
          VALID_REQUester_ID,
          VALID_USER_ID,
          VALID_BOARD_ID,
          "Invalid Role"
        )
      ).rejects.toThrow("role_in_board không hợp lệ");
    });

    it("❌ should throw error when requester is not creator", async () => {
      userRepo.findById.mockResolvedValue({ _id: "user123" });
      boardRepo.getBoardById.mockResolvedValue({ _id: "board123" });
      boardRepo.isCreatorFromMember.mockResolvedValue(false);

      await expect(
        boardMemberService.updateRole(
          VALID_REQUester_ID,
          VALID_USER_ID,
          VALID_BOARD_ID,
          "Người Xem"
        )
      ).rejects.toThrow(
        "Chỉ người tạo board mới được thay đổi vai trò thành viên"
      );
    });

    it("❌ should throw error when trying to demote last creator", async () => {
      const mockUser = { _id: "user123" };
      const mockBoard = { _id: "board123" };
      const mockTargetMember = {
        _id: "member123",
        role_in_board: "Người tạo",
      };

      userRepo.findById.mockResolvedValue(mockUser);
      boardRepo.getBoardById.mockResolvedValue(mockBoard);
      boardRepo.isCreatorFromMember.mockResolvedValue(true);
      boardMemberRepo.findMember.mockResolvedValue(mockTargetMember);
      boardMemberRepo.countCreators.mockResolvedValue(1);

      await expect(
        boardMemberService.updateRole(
          VALID_REQUester_ID,
          VALID_USER_ID,
          VALID_BOARD_ID,
          "Thành viên"
        )
      ).rejects.toThrow("Không thể hạ cấp người tạo cuối cùng trong bảng");
    });
  });

  describe("removeMember", () => {
    it("✅ should remove member successfully", async () => {
      const mockTargetMember = {
        _id: "member123",
        role_in_board: "Thành viên",
      };

      boardMemberRepo.countMembers.mockResolvedValue(3);
      boardMemberRepo.findMember.mockResolvedValue(mockTargetMember);
      boardMemberRepo.countCreators.mockResolvedValue(2);
      boardMemberRepo.removeMember.mockResolvedValue({ deletedCount: 1 });
      // Mock removeMember dependencies
      userRepo.findById.mockResolvedValue({ _id: VALID_REQUester_ID });
      boardRepo.isCreatorFromMember.mockResolvedValue(true);
      UserRoleRepo.findRoleByUser.mockResolvedValue([]);
      boardRepo.findById.mockResolvedValue({ _id: VALID_BOARD_ID, title: "Test Board" });
      notificationService.createNotification.mockResolvedValue({});

      const result = await boardMemberService.removeMember(
        VALID_REQUester_ID,
        VALID_USER_ID,
        VALID_BOARD_ID
      );

      expect(result).toBe(true);
      expect(boardMemberRepo.removeMember).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_BOARD_ID
      );
      expect(sendNotification).toHaveBeenCalled();
    });

    it("✅ should allow user to remove themselves", async () => {
      const mockTargetMember = {
        _id: "member123",
        role_in_board: "Thành viên",
      };

      boardMemberRepo.countMembers.mockResolvedValue(2);
      boardMemberRepo.findMember.mockResolvedValue(mockTargetMember);
      boardMemberRepo.countCreators.mockResolvedValue(1);
      boardMemberRepo.removeMember.mockResolvedValue({ deletedCount: 1 });
      // Mock notification dependencies (user removing themselves, so no need for role check)
      boardRepo.findById.mockResolvedValue({ _id: VALID_BOARD_ID, title: "Test Board" });
      notificationService.createNotification.mockResolvedValue({});

      const result = await boardMemberService.removeMember(
        VALID_USER_ID,
        VALID_USER_ID,
        VALID_BOARD_ID
      );

      expect(result).toBe(true);
    });

    it("❌ should throw error when user_id is invalid", async () => {
      await expect(
        boardMemberService.removeMember(VALID_REQUester_ID, "invalid", VALID_BOARD_ID)
      ).rejects.toThrow("user_id không hợp lệ");
    });

    it("❌ should throw error when cannot remove last member", async () => {
      boardMemberRepo.countMembers.mockResolvedValue(1);

      await expect(
        boardMemberService.removeMember(
          VALID_REQUester_ID,
          VALID_USER_ID,
          VALID_BOARD_ID
        )
      ).rejects.toThrow("Không thể xóa thành viên cuối cùng trong bảng");
    });

    it("❌ should throw error when trying to remove last creator", async () => {
      const mockTargetMember = {
        _id: "member123",
        role_in_board: "Người tạo",
      };

      boardMemberRepo.countMembers.mockResolvedValue(2);
      boardMemberRepo.findMember.mockResolvedValue(mockTargetMember);
      boardMemberRepo.countCreators.mockResolvedValue(1);
      // Mock dependencies
      userRepo.findById.mockResolvedValue({ _id: VALID_REQUester_ID });
      boardRepo.isCreatorFromMember.mockResolvedValue(true);
      UserRoleRepo.findRoleByUser.mockResolvedValue([]);

      await expect(
        boardMemberService.removeMember(
          VALID_REQUester_ID,
          VALID_USER_ID,
          VALID_BOARD_ID
        )
      ).rejects.toThrow("Không thể xóa người tạo cuối cùng của bảng");
    });
  });

  describe("getBoardsByUser", () => {
    it("✅ should return boards for user", async () => {
      const mockUser = { _id: VALID_USER_ID, username: "testuser" };
      const mockBoards = [
        {
          board_id: { _id: "board1", title: "Board 1" },
          role_in_board: "Người tạo",
          _id: "bm1",
        },
        {
          board_id: { _id: "board2", title: "Board 2" },
          role_in_board: "Thành viên",
          _id: "bm2",
        },
      ];

      userRepo.findById.mockResolvedValue(mockUser);
      boardMemberRepo.getBoardsByUser.mockResolvedValue(mockBoards);

      const result = await boardMemberService.getBoardsByUser(VALID_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("role_in_board", "Người tạo");
      expect(result[0]).toHaveProperty("idBoarMenber", "bm1");
    });

    it("❌ should throw error when user not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      userRepo.findById.mockResolvedValue(null);
      boardMemberRepo.getBoardsByUser.mockResolvedValue([]);

      await expect(
        boardMemberService.getBoardsByUser("507f1f77bcf86cd799439099")
      ).rejects.toThrow("Người dùng không tồn tại");
    });
  });
});


// 📄 tests/unit/centerMember.service.test.js - Center Member Service Unit Tests
jest.mock("../../repositories/centerMember.repo");
jest.mock("../../repositories/user.repository");
jest.mock("../../repositories/center.repository");
jest.mock("../../config/socket", () => ({
  sendNotification: jest.fn(),
}));
jest.mock("../../services/notification.service");

const centerMemberService = require("../../services/centerMember.service");
const centerMemberRepo = require("../../repositories/centerMember.repo");
const userRepo = require("../../repositories/user.repository");
const centerRepo = require("../../repositories/center.repository");
const notificationService = require("../../services/notification.service");
const { sendNotification } = require("../../config/socket");

describe("🔹 Center Member Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addMember", () => {
    it("✅ should add member successfully", async () => {
      const mockUser = {
        _id: "user123",
        username: "testuser",
      };
      const mockCenter = {
        _id: "center123",
        name: "Test Center",
      };
      const mockCenterMember = {
        _id: "cm123",
        center_id: "center123",
        user_id: "user123",
        role_in_center: "Thành viên",
      };

      userRepo.findById.mockResolvedValue(mockUser);
      centerRepo.findById.mockResolvedValue(mockCenter);
      centerMemberRepo.softDelete.mockResolvedValue(true);
      centerMemberRepo.isMember.mockResolvedValue(false);
      centerMemberRepo.create.mockResolvedValue(mockCenterMember);
      notificationService.createNotification.mockResolvedValue({});

      const result = await centerMemberService.addMember(
        "center123",
        "user123",
        "Thành viên"
      );

      expect(result).toEqual(mockCenterMember);
      expect(centerMemberRepo.create).toHaveBeenCalledWith({
        center_id: "center123",
        user_id: "user123",
        role_in_center: "Thành viên",
      });
      expect(sendNotification).toHaveBeenCalledTimes(2);
      expect(notificationService.createNotification).toHaveBeenCalled();
    });

    it("❌ should throw error when user not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        centerMemberService.addMember("center123", "nonexistent", "Thành viên")
      ).rejects.toThrow("Người dùng không tồn tại");
    });

    it("❌ should throw error when center not found", async () => {
      userRepo.findById.mockResolvedValue({ _id: "user123" });
      centerRepo.findById.mockResolvedValue(null);

      await expect(
        centerMemberService.addMember("nonexistent", "user123", "Thành viên")
      ).rejects.toThrow("Trung tâm không tồn tại");
    });

    it("❌ should throw error when member already exists", async () => {
      const mockUser = { _id: "user123" };
      const mockCenter = { _id: "center123" };

      userRepo.findById.mockResolvedValue(mockUser);
      centerRepo.findById.mockResolvedValue(mockCenter);
      centerMemberRepo.softDelete.mockResolvedValue(true);
      centerMemberRepo.isMember.mockResolvedValue(true);

      await expect(
        centerMemberService.addMember("center123", "user123", "Thành viên")
      ).rejects.toThrow("Thành viên đã tồn tại trong trung tâm");
    });
  });

  describe("getCentersByUser", () => {
    it("✅ should return centers for user", async () => {
      const mockMembers = [
        {
          _id: "cm1",
          center_id: { _id: "center1", name: "Center 1" },
          role_in_center: "Thành viên",
        },
        {
          _id: "cm2",
          center_id: { _id: "center2", name: "Center 2" },
          role_in_center: "Quản lý",
        },
      ];

      centerMemberRepo.findByUserId.mockResolvedValue(mockMembers);

      const result = await centerMemberService.getCentersByUser("user123");

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("role_in_center", "Thành viên");
      expect(result[0]).toHaveProperty("member_id", "cm1");
      expect(centerMemberRepo.findByUserId).toHaveBeenCalledWith("user123");
    });
  });

  describe("getMembersByCenter", () => {
    it("✅ should return members for center", async () => {
      const mockMembers = [
        {
          _id: "cm1",
          user_id: { _id: "user1", username: "user1" },
          role_in_center: "Thành viên",
        },
        {
          _id: "cm2",
          user_id: { _id: "user2", username: "user2" },
          role_in_center: "Quản lý",
        },
      ];

      centerMemberRepo.findByCenterId.mockResolvedValue(mockMembers);

      const result = await centerMemberService.getMembersByCenter("center123");

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("role_in_center", "Thành viên");
      expect(result[0]).toHaveProperty("member_id", "cm1");
      expect(centerMemberRepo.findByCenterId).toHaveBeenCalledWith("center123");
    });
  });

  describe("removeMember", () => {
    it("✅ should remove member successfully", async () => {
      const mockMember = {
        _id: "cm123",
        user_id: "user123",
        center_id: "center123",
      };

      centerMemberRepo.findById.mockResolvedValue(mockMember);
      centerMemberRepo.delete.mockResolvedValue(true);

      const result = await centerMemberService.removeMember("cm123");

      expect(result).toBe(true);
      expect(centerMemberRepo.delete).toHaveBeenCalledWith("cm123");
      expect(sendNotification).toHaveBeenCalled();
    });

    it("❌ should throw error when member not found", async () => {
      centerMemberRepo.findById.mockResolvedValue(null);

      await expect(
        centerMemberService.removeMember("nonexistent")
      ).rejects.toThrow("Không tìm thấy thành viên");
    });
  });

  describe("getAll", () => {
    it("✅ should return all center members", async () => {
      const mockMembers = [
        { _id: "cm1", center_id: "center1", user_id: "user1" },
        { _id: "cm2", center_id: "center2", user_id: "user2" },
      ];

      centerMemberRepo.findAll.mockResolvedValue(mockMembers);

      const result = await centerMemberService.getAll();

      expect(result).toEqual(mockMembers);
      expect(centerMemberRepo.findAll).toHaveBeenCalled();
    });
  });
});


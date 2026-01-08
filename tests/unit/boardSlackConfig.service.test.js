// 📄 tests/unit/boardSlackConfig.service.test.js - Board Slack Config Service Unit Tests
jest.mock("../../repositories/board.repository");

// Mock model first to prevent Schema.Types error
jest.mock("../../models/boardSlackConfig.model", () => {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  };
});

const boardSlackConfigService = require("../../services/boardSlackConfig.service");
const BoardSlackConfig = require("../../models/boardSlackConfig.model");
const boardRepository = require("../../repositories/board.repository");

// Mock mongoose Types.ObjectId.isValid but keep Schema working
const mongoose = require("mongoose");
const originalIsValid = mongoose.Types.ObjectId.isValid;
mongoose.Types.ObjectId.isValid = jest.fn((id) => {
  // Valid ObjectId format: 24 hex characters
  return id && typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
});

// Valid ObjectIds for testing (24 hex characters)
const VALID_BOARD_ID = "507f1f77bcf86cd799439011";
const VALID_USER_ID = "507f1f77bcf86cd799439012";

describe("🔹 Board Slack Config Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getOrCreateConfig", () => {
    it("✅ should return existing config", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        notify_task_created: true,
        is_active: false,
      };

      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.getOrCreateConfig(VALID_BOARD_ID);

      expect(result).toEqual(mockConfig);
      expect(BoardSlackConfig.findOne).toHaveBeenCalledWith({
        board_id: VALID_BOARD_ID,
      });
      expect(BoardSlackConfig.create).not.toHaveBeenCalled();
    });

    it("✅ should create new config if not exists", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        notify_task_created: true,
        notify_task_assigned: true,
        notify_task_completed: true,
        notify_comment_added: true,
        is_active: false,
      };

      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(null);
      BoardSlackConfig.create = jest.fn().mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.getOrCreateConfig(VALID_BOARD_ID);

      expect(result).toEqual(mockConfig);
      expect(BoardSlackConfig.create).toHaveBeenCalledWith({
        board_id: VALID_BOARD_ID,
        notify_task_created: true,
        notify_task_assigned: true,
        notify_task_completed: true,
        notify_comment_added: true,
        is_active: false,
      });
    });

    it("❌ should throw error when boardId is invalid", async () => {
      await expect(
        boardSlackConfigService.getOrCreateConfig("invalid")
      ).rejects.toThrow("Board ID không hợp lệ");
    });
  });

  describe("getConfig", () => {
    it("✅ should return config", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        is_active: true,
      };

      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.getConfig(VALID_BOARD_ID);

      expect(result).toEqual(mockConfig);
      expect(BoardSlackConfig.findOne).toHaveBeenCalledWith({
        board_id: VALID_BOARD_ID,
      });
    });

    it("✅ should return null when config not found", async () => {
      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(null);

      const result = await boardSlackConfigService.getConfig(VALID_BOARD_ID);

      expect(result).toBeNull();
    });

    it("❌ should throw error when boardId is invalid", async () => {
      await expect(
        boardSlackConfigService.getConfig("invalid")
      ).rejects.toThrow("Board ID không hợp lệ");
    });
  });

  describe("updateConfig", () => {
    it("✅ should update config successfully", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        notify_task_created: true,
        is_active: true,
      };
      const updateData = {
        notify_task_created: false,
        // Use a placeholder Slack webhook URL pattern for tests – do not use a real webhook
        webhook_url: "https://hooks.slack.com/services/TEST/TEST/PLACEHOLDER",
      };

      boardRepository.isRoleMember.mockResolvedValue(true);
      BoardSlackConfig.findOneAndUpdate.mockResolvedValue({
        ...mockConfig,
        ...updateData,
      });

      const result = await boardSlackConfigService.updateConfig(
        VALID_BOARD_ID,
        VALID_USER_ID,
        updateData
      );

      expect(result).toHaveProperty("notify_task_created", false);
      expect(BoardSlackConfig.findOneAndUpdate).toHaveBeenCalled();
    });

    it("❌ should throw error when boardId is invalid", async () => {
      await expect(
        boardSlackConfigService.updateConfig("invalid", "user123", {})
      ).rejects.toThrow("Board ID không hợp lệ");
    });

    it("❌ should throw error when userId is invalid", async () => {
      await expect(
        boardSlackConfigService.updateConfig(VALID_BOARD_ID, "invalid", {})
      ).rejects.toThrow("User ID không hợp lệ");
    });

    it("❌ should throw error when user has no permission", async () => {
      boardRepository.isRoleMember.mockResolvedValue(false);
      boardRepository.isCreatorFromMember.mockResolvedValue(false);

      await expect(
        boardSlackConfigService.updateConfig(VALID_BOARD_ID, VALID_USER_ID, {})
      ).rejects.toThrow(
        "Bạn không có quyền cấu hình Slack cho board này"
      );
    });

    it("❌ should throw error when webhook URL is invalid", async () => {
      boardRepository.isRoleMember.mockResolvedValue(true);

      await expect(
        boardSlackConfigService.updateConfig(VALID_BOARD_ID, VALID_USER_ID, {
          webhook_url: "invalid-url",
        })
      ).rejects.toThrow("Webhook URL không hợp lệ");
    });

    it("✅ should allow creator to update config", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
      };

      boardRepository.isRoleMember.mockResolvedValue(false);
      boardRepository.isCreatorFromMember.mockResolvedValue(true);
      BoardSlackConfig.findOneAndUpdate.mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.updateConfig(
        VALID_BOARD_ID,
        VALID_USER_ID,
        { notify_task_created: true }
      );

      expect(result).toEqual(mockConfig);
    });
  });

  describe("toggleNotifications", () => {
    it("✅ should toggle notifications on", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        is_active: true,
      };

      boardRepository.isRoleMember.mockResolvedValue(true);
      BoardSlackConfig.findOneAndUpdate.mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.toggleNotifications(
        VALID_BOARD_ID,
        VALID_USER_ID,
        true
      );

      expect(result).toEqual(mockConfig);
    });

    it("✅ should toggle notifications off", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        is_active: false,
      };

      boardRepository.isRoleMember.mockResolvedValue(true);
      BoardSlackConfig.findOneAndUpdate.mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.toggleNotifications(
        VALID_BOARD_ID,
        VALID_USER_ID,
        false
      );

      expect(result).toEqual(mockConfig);
    });
  });

  describe("deleteConfig", () => {
    it("✅ should delete config successfully", async () => {
      boardRepository.isRoleMember.mockResolvedValue(true);
      BoardSlackConfig.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const result = await boardSlackConfigService.deleteConfig(
        VALID_BOARD_ID,
        VALID_USER_ID
      );

      expect(result).toBe(true);
      expect(BoardSlackConfig.deleteOne).toHaveBeenCalledWith({
        board_id: VALID_BOARD_ID,
      });
    });

    it("❌ should throw error when boardId is invalid", async () => {
      await expect(
        boardSlackConfigService.deleteConfig("invalid", "user123")
      ).rejects.toThrow("Board ID không hợp lệ");
    });

    it("❌ should throw error when user has no permission", async () => {
      boardRepository.isRoleMember.mockResolvedValue(false);
      boardRepository.isCreatorFromMember.mockResolvedValue(false);

      await expect(
        boardSlackConfigService.deleteConfig(VALID_BOARD_ID, VALID_USER_ID)
      ).rejects.toThrow("Bạn không có quyền xóa cấu hình Slack cho board này");
    });

    it("✅ should return false when config not found", async () => {
      boardRepository.isRoleMember.mockResolvedValue(true);
      BoardSlackConfig.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });

      const result = await boardSlackConfigService.deleteConfig(
        VALID_BOARD_ID,
        VALID_USER_ID
      );

      expect(result).toBe(false);
    });
  });

  describe("shouldNotify", () => {
    it("✅ should return true when notification is enabled", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        is_active: true,
        // Placeholder Slack webhook URL
        webhook_url: "https://hooks.slack.com/services/TEST/TEST/PLACEHOLDER",
        notify_task_created: true,
      };

      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.shouldNotify(
        VALID_BOARD_ID,
        "task_created"
      );

      expect(result).toBe(true);
      expect(BoardSlackConfig.findOne).toHaveBeenCalledWith({ board_id: VALID_BOARD_ID });
    });

    it("✅ should return false when notification is disabled", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        is_active: true,
        // Placeholder Slack webhook URL
        webhook_url: "https://hooks.slack.com/services/TEST/TEST/PLACEHOLDER",
        notify_task_created: false,
      };

      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.shouldNotify(
        VALID_BOARD_ID,
        "task_created"
      );

      expect(result).toBe(false);
    });

    it("✅ should return false when config is not active", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        is_active: false,
        // Placeholder Slack webhook URL
        webhook_url: "https://hooks.slack.com/services/TEST/TEST/PLACEHOLDER",
        notify_task_created: true,
      };

      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.shouldNotify(
        VALID_BOARD_ID,
        "task_created"
      );

      expect(result).toBe(false);
    });

    it("✅ should return false when webhook URL is missing", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        is_active: true,
        notify_task_created: true,
      };

      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.shouldNotify(
        VALID_BOARD_ID,
        "task_created"
      );

      expect(result).toBe(false);
    });

    it("✅ should return false when config not found", async () => {
      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(null);

      const result = await boardSlackConfigService.shouldNotify(
        VALID_BOARD_ID,
        "task_created"
      );

      expect(result).toBe(false);
    });

    it("✅ should return false on error", async () => {
      BoardSlackConfig.findOne.mockRejectedValue(new Error("Database error"));

      const result = await boardSlackConfigService.shouldNotify(
        VALID_BOARD_ID,
        "task_created"
      );

      expect(result).toBe(false);
    });
  });

  describe("getBoardWebhookUrl", () => {
    it("✅ should return webhook URL when active", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        is_active: true,
        // Placeholder Slack webhook URL
        webhook_url: "https://hooks.slack.com/services/TEST/TEST/PLACEHOLDER",
      };

      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.getBoardWebhookUrl(VALID_BOARD_ID);

      expect(result).toBe(mockConfig.webhook_url);
      expect(BoardSlackConfig.findOne).toHaveBeenCalledWith({ board_id: VALID_BOARD_ID });
    });

    it("✅ should return null when config is not active", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: VALID_BOARD_ID,
        is_active: false,
        // Placeholder Slack webhook URL
        webhook_url: "https://hooks.slack.com/services/TEST/TEST/PLACEHOLDER",
      };

      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(mockConfig);

      const result = await boardSlackConfigService.getBoardWebhookUrl(VALID_BOARD_ID);

      expect(result).toBeNull();
    });

    it("✅ should return null when config not found", async () => {
      BoardSlackConfig.findOne = jest.fn().mockResolvedValue(null);

      const result = await boardSlackConfigService.getBoardWebhookUrl(VALID_BOARD_ID);

      expect(result).toBeNull();
    });

    it("✅ should return null on error", async () => {
      BoardSlackConfig.findOne.mockRejectedValue(new Error("Database error"));

      const result = await boardSlackConfigService.getBoardWebhookUrl(VALID_BOARD_ID);

      expect(result).toBeNull();
    });
  });
});


// 📄 tests/unit/userSlackConfig.service.test.js - User Slack Config Service Unit Tests

// Mock model first to prevent Schema.Types error
jest.mock("../../models/userSlackConfig.model", () => {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  };
});

const userSlackConfigService = require("../../services/userSlackConfig.service");
const UserSlackConfig = require("../../models/userSlackConfig.model");
const mongoose = require("mongoose");

describe("🔹 User Slack Config Service Unit Tests", () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    // Mock mongoose.Types.ObjectId.isValid
    mongoose.Types.ObjectId.isValid = jest.fn((id) => {
      // Simple validation: valid if it's a string and looks like ObjectId
      if (typeof id !== "string") return false;
      return /^[0-9a-fA-F]{24}$/.test(id);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("getOrCreateConfig(userId) - Get Or Create Config", () => {
    it("✅ should return existing config when found", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        notify_task_created: true,
        notify_task_assigned: true,
        notify_task_completed: true,
        notify_comment_added: true,
        is_active: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.getOrCreateConfig("507f1f77bcf86cd799439011");

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(UserSlackConfig.findOne).toHaveBeenCalledWith({
        user_id: "507f1f77bcf86cd799439011",
      });
      expect(UserSlackConfig.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it("✅ should create new config with defaults when not found", async () => {
      const mockNewConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        notify_task_created: true,
        notify_task_assigned: true,
        notify_task_completed: true,
        notify_comment_added: true,
        is_active: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(null);
      UserSlackConfig.create.mockResolvedValue(mockNewConfig);

      const result = await userSlackConfigService.getOrCreateConfig("507f1f77bcf86cd799439011");

      expect(UserSlackConfig.findOne).toHaveBeenCalledWith({
        user_id: "507f1f77bcf86cd799439011",
      });
      expect(UserSlackConfig.create).toHaveBeenCalledWith({
        user_id: "507f1f77bcf86cd799439011",
        notify_task_created: true,
        notify_task_assigned: true,
        notify_task_completed: true,
        notify_comment_added: true,
        is_active: true,
      });
      expect(result).toEqual(mockNewConfig);
    });

    it("❌ should throw error when userId is invalid", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await expect(userSlackConfigService.getOrCreateConfig("invalid-id")).rejects.toThrow(
        "User ID không hợp lệ"
      );

      expect(UserSlackConfig.findOne).not.toHaveBeenCalled();
    });

    it("❌ should throw error when database operation fails", async () => {
      const error = new Error("Database connection error");
      UserSlackConfig.findOne.mockRejectedValue(error);

      await expect(
        userSlackConfigService.getOrCreateConfig("507f1f77bcf86cd799439011")
      ).rejects.toThrow("Lỗi lấy config Slack: Database connection error");
    });

    it("❌ should throw error when create fails", async () => {
      const error = new Error("Validation error");
      UserSlackConfig.findOne.mockResolvedValue(null);
      UserSlackConfig.create.mockRejectedValue(error);

      await expect(
        userSlackConfigService.getOrCreateConfig("507f1f77bcf86cd799439011")
      ).rejects.toThrow("Lỗi lấy config Slack: Validation error");
    });
  });

  describe("getConfig(userId) - Get Config", () => {
    it("✅ should return config when found", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.getConfig("507f1f77bcf86cd799439011");

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(UserSlackConfig.findOne).toHaveBeenCalledWith({
        user_id: "507f1f77bcf86cd799439011",
      });
      expect(result).toEqual(mockConfig);
    });

    it("✅ should return null when config not found", async () => {
      UserSlackConfig.findOne.mockResolvedValue(null);

      const result = await userSlackConfigService.getConfig("507f1f77bcf86cd799439011");

      expect(result).toBeNull();
    });

    it("❌ should throw error when userId is invalid", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await expect(userSlackConfigService.getConfig("invalid-id")).rejects.toThrow(
        "User ID không hợp lệ"
      );

      expect(UserSlackConfig.findOne).not.toHaveBeenCalled();
    });

    it("❌ should throw error when database operation fails", async () => {
      const error = new Error("Database error");
      UserSlackConfig.findOne.mockRejectedValue(error);

      await expect(userSlackConfigService.getConfig("507f1f77bcf86cd799439011")).rejects.toThrow(
        "Lỗi lấy config Slack: Database error"
      );
    });
  });

  describe("updateConfig(userId, updateData) - Update Config", () => {
    it("✅ should update config successfully with valid webhook URL", async () => {
      const updateData = {
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        notify_task_created: false,
      };

      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        ...updateData,
        updated_at: new Date(),
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(UserSlackConfig.findOneAndUpdate).toHaveBeenCalledWith(
        { user_id: "507f1f77bcf86cd799439011" },
        expect.objectContaining({
          ...updateData,
          updated_at: expect.any(Date),
        }),
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );
      expect(result).toEqual(mockUpdatedConfig);
    });

    it("✅ should update config without webhook URL", async () => {
      const updateData = {
        notify_task_created: false,
        notify_task_assigned: true,
      };

      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        ...updateData,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(result).toEqual(mockUpdatedConfig);
    });

    it("✅ should create config if not exists (upsert)", async () => {
      const updateData = {
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
      };

      const mockNewConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        ...updateData,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockNewConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(UserSlackConfig.findOneAndUpdate).toHaveBeenCalledWith(
        { user_id: "507f1f77bcf86cd799439011" },
        expect.objectContaining(updateData),
        expect.objectContaining({ upsert: true })
      );
      expect(result).toEqual(mockNewConfig);
    });

    it("❌ should throw error when userId is invalid", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await expect(
        userSlackConfigService.updateConfig("invalid-id", { is_active: true })
      ).rejects.toThrow("User ID không hợp lệ");
    });

    it("❌ should throw error when webhook URL is invalid", async () => {
      const updateData = {
        webhook_url: "https://invalid-url.com/webhook",
      };

      await expect(
        userSlackConfigService.updateConfig("507f1f77bcf86cd799439011", updateData)
      ).rejects.toThrow(
        "Webhook URL không hợp lệ. Phải bắt đầu với https://hooks.slack.com/services/"
      );

      expect(UserSlackConfig.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("❌ should throw error when webhook URL doesn't start with correct prefix", async () => {
      const updateData = {
        webhook_url: "http://hooks.slack.com/services/ABC123", // http instead of https
      };

      await expect(
        userSlackConfigService.updateConfig("507f1f77bcf86cd799439011", updateData)
      ).rejects.toThrow(
        "Webhook URL không hợp lệ. Phải bắt đầu với https://hooks.slack.com/services/"
      );
    });

    it("❌ should throw error when database operation fails", async () => {
      const error = new Error("Database error");
      UserSlackConfig.findOneAndUpdate.mockRejectedValue(error);

      await expect(
        userSlackConfigService.updateConfig("507f1f77bcf86cd799439011", { is_active: true })
      ).rejects.toThrow("Lỗi cập nhật config Slack: Database error");
    });
  });

  describe("toggleNotifications(userId, isActive) - Toggle Notifications", () => {
    it("✅ should enable notifications", async () => {
      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        is_active: true,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.toggleNotifications(
        "507f1f77bcf86cd799439011",
        true
      );

      expect(UserSlackConfig.findOneAndUpdate).toHaveBeenCalledWith(
        { user_id: "507f1f77bcf86cd799439011" },
        expect.objectContaining({ is_active: true }),
        expect.any(Object)
      );
      expect(result).toEqual(mockUpdatedConfig);
    });

    it("✅ should disable notifications", async () => {
      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        is_active: false,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.toggleNotifications(
        "507f1f77bcf86cd799439011",
        false
      );

      expect(UserSlackConfig.findOneAndUpdate).toHaveBeenCalledWith(
        { user_id: "507f1f77bcf86cd799439011" },
        expect.objectContaining({ is_active: false }),
        expect.any(Object)
      );
      expect(result).toEqual(mockUpdatedConfig);
    });

    it("❌ should throw error when updateConfig fails", async () => {
      const error = new Error("User ID không hợp lệ");
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await expect(
        userSlackConfigService.toggleNotifications("invalid-id", true)
      ).rejects.toThrow("User ID không hợp lệ");
    });
  });

  describe("deleteConfig(userId) - Delete Config", () => {
    it("✅ should delete config successfully", async () => {
      const mockDeleteResult = {
        deletedCount: 1,
      };

      UserSlackConfig.deleteOne.mockResolvedValue(mockDeleteResult);

      const result = await userSlackConfigService.deleteConfig("507f1f77bcf86cd799439011");

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(UserSlackConfig.deleteOne).toHaveBeenCalledWith({
        user_id: "507f1f77bcf86cd799439011",
      });
      expect(result).toBe(true);
    });

    it("✅ should return false when config not found", async () => {
      const mockDeleteResult = {
        deletedCount: 0,
      };

      UserSlackConfig.deleteOne.mockResolvedValue(mockDeleteResult);

      const result = await userSlackConfigService.deleteConfig("507f1f77bcf86cd799439011");

      expect(result).toBe(false);
    });

    it("❌ should throw error when userId is invalid", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await expect(userSlackConfigService.deleteConfig("invalid-id")).rejects.toThrow(
        "User ID không hợp lệ"
      );

      expect(UserSlackConfig.deleteOne).not.toHaveBeenCalled();
    });

    it("❌ should throw error when database operation fails", async () => {
      const error = new Error("Database error");
      UserSlackConfig.deleteOne.mockRejectedValue(error);

      await expect(userSlackConfigService.deleteConfig("507f1f77bcf86cd799439011")).rejects.toThrow(
        "Lỗi xóa config Slack: Database error"
      );
    });
  });

  describe("shouldNotify(userId, notificationType) - Should Notify", () => {
    it("✅ should return true when all conditions are met", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
        notify_task_created: true,
        notify_task_assigned: true,
        notify_task_completed: true,
        notify_comment_added: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(true);
    });

    it("✅ should return false when config not found", async () => {
      UserSlackConfig.findOne.mockResolvedValue(null);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(false);
    });

    it("✅ should return false when is_active is false", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: false,
        notify_task_created: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(false);
    });

    it("✅ should return false when webhook_url is missing", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: null,
        is_active: true,
        notify_task_created: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(false);
    });

    it("✅ should return false when notification type is disabled", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
        notify_task_created: false,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(false);
    });

    it("✅ should check different notification types", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
        notify_task_created: true,
        notify_task_assigned: false,
        notify_task_completed: true,
        notify_comment_added: false,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      expect(await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created")).toBe(true);
      expect(await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_assigned")).toBe(false);
      expect(await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_completed")).toBe(true);
      expect(await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "comment_added")).toBe(false);
    });

    it("✅ should return false when error occurs", async () => {
      const error = new Error("Database error");
      UserSlackConfig.findOne.mockRejectedValue(error);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(false);
      // getConfig wraps the error, so the message will be "Lỗi lấy config Slack: Database error"
      expect(consoleSpy).toHaveBeenCalledWith(" Lỗi kiểm tra shouldNotify:", "Lỗi lấy config Slack: Database error");
    });
  });

  describe("getUserWebhookUrl(userId) - Get User Webhook URL", () => {
    it("✅ should return webhook URL when config is active", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.getUserWebhookUrl("507f1f77bcf86cd799439011");

      expect(result).toBe("https://hooks.slack.com/services/ABC123/DEF456/GHI789");
    });

    it("✅ should return null when config not found", async () => {
      UserSlackConfig.findOne.mockResolvedValue(null);

      const result = await userSlackConfigService.getUserWebhookUrl("507f1f77bcf86cd799439011");

      expect(result).toBeNull();
    });

    it("✅ should return null when is_active is false", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: false,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.getUserWebhookUrl("507f1f77bcf86cd799439011");

      expect(result).toBeNull();
    });

    it("✅ should return null when webhook_url is missing", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: null,
        is_active: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.getUserWebhookUrl("507f1f77bcf86cd799439011");

      expect(result).toBeNull();
    });

    it("✅ should return null when error occurs", async () => {
      const error = new Error("Database error");
      UserSlackConfig.findOne.mockRejectedValue(error);

      const result = await userSlackConfigService.getUserWebhookUrl("507f1f77bcf86cd799439011");

      expect(result).toBeNull();
      // getConfig wraps the error, so the message will be "Lỗi lấy config Slack: Database error"
      expect(consoleSpy).toHaveBeenCalledWith(" Lỗi lấy webhook URL:", "Lỗi lấy config Slack: Database error");
    });
  });

  describe("Edge Cases & Error Handling", () => {
    it("✅ should handle getOrCreateConfig with different ObjectId formats", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.getOrCreateConfig("507f1f77bcf86cd799439011");

      expect(result).toEqual(mockConfig);
    });

    it("✅ should handle updateConfig with empty updateData", async () => {
      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig("507f1f77bcf86cd799439011", {});

      expect(result).toEqual(mockUpdatedConfig);
    });

    it("✅ should handle updateConfig with only notification flags", async () => {
      const updateData = {
        notify_task_created: false,
        notify_task_assigned: true,
      };

      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        ...updateData,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(result).toEqual(mockUpdatedConfig);
    });

    it("✅ should handle shouldNotify with undefined notification field", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
        // notify_unknown_type is not defined
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "unknown_type");

      expect(result).toBe(false);
    });

    it("✅ should handle getUserWebhookUrl with empty string webhook_url", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "",
        is_active: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.getUserWebhookUrl("507f1f77bcf86cd799439011");

      expect(result).toBeNull();
    });

    it("✅ should handle webhook URL validation with trailing slash", async () => {
      const updateData = {
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789/",
      };

      const mockUpdatedConfig = {
        _id: "config123",
        ...updateData,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(result).toEqual(mockUpdatedConfig);
    });

    it("✅ should handle updateConfig with channel_name and notes fields", async () => {
      const updateData = {
        channel_name: "general",
        notes: "My Slack integration notes",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
      };

      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        ...updateData,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(result).toEqual(mockUpdatedConfig);
      expect(UserSlackConfig.findOneAndUpdate).toHaveBeenCalledWith(
        { user_id: "507f1f77bcf86cd799439011" },
        expect.objectContaining(updateData),
        expect.any(Object)
      );
    });

    it("✅ should handle updateConfig with all notification flags at once", async () => {
      const updateData = {
        notify_task_created: false,
        notify_task_assigned: true,
        notify_task_completed: false,
        notify_comment_added: true,
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
      };

      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        ...updateData,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(result).toEqual(mockUpdatedConfig);
    });

    it("✅ should handle shouldNotify with empty string webhook_url", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "",
        is_active: true,
        notify_task_created: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(false);
    });

    it("✅ should handle shouldNotify with undefined webhook_url", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: undefined,
        is_active: true,
        notify_task_created: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(false);
    });

    it("✅ should handle shouldNotify when notification field is undefined", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
        // notify_task_created is not defined
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(false);
    });

    it("✅ should handle shouldNotify when notification field is false explicitly", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
        notify_task_created: false,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created");

      expect(result).toBe(false);
    });

    it("✅ should handle updateConfig when webhook_url is null (removing webhook)", async () => {
      const updateData = {
        webhook_url: null,
        is_active: false,
      };

      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        ...updateData,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(result).toEqual(mockUpdatedConfig);
      // Should not throw error when webhook_url is null
      expect(UserSlackConfig.findOneAndUpdate).toHaveBeenCalled();
    });

    it("✅ should handle updateConfig when webhook_url is empty string (should not validate)", async () => {
      const updateData = {
        webhook_url: "",
        is_active: true,
      };

      // Empty string should not trigger validation (only checks if webhook_url exists)
      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        ...updateData,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(result).toEqual(mockUpdatedConfig);
      // Empty string should pass validation check (falsy check)
      expect(UserSlackConfig.findOneAndUpdate).toHaveBeenCalled();
    });

    it("✅ should handle getOrCreateConfig when findOne returns undefined", async () => {
      UserSlackConfig.findOne.mockResolvedValue(undefined);
      const mockNewConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        notify_task_created: true,
        notify_task_assigned: true,
        notify_task_completed: true,
        notify_comment_added: true,
        is_active: true,
      };

      UserSlackConfig.create.mockResolvedValue(mockNewConfig);

      const result = await userSlackConfigService.getOrCreateConfig("507f1f77bcf86cd799439011");

      expect(UserSlackConfig.create).toHaveBeenCalled();
      expect(result).toEqual(mockNewConfig);
    });

    it("✅ should handle getConfig with non-string userId that passes validation", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
      };

      // Mock isValid to return true for this case
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.getConfig("507f1f77bcf86cd799439011");

      expect(result).toEqual(mockConfig);
    });

    it("✅ should handle deleteConfig when deletedCount is 0", async () => {
      const mockDeleteResult = {
        deletedCount: 0,
      };

      UserSlackConfig.deleteOne.mockResolvedValue(mockDeleteResult);

      const result = await userSlackConfigService.deleteConfig("507f1f77bcf86cd799439011");

      expect(result).toBe(false);
    });

    it("✅ should handle toggleNotifications with false value", async () => {
      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        is_active: false,
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.toggleNotifications(
        "507f1f77bcf86cd799439011",
        false
      );

      expect(result).toEqual(mockUpdatedConfig);
      expect(UserSlackConfig.findOneAndUpdate).toHaveBeenCalledWith(
        { user_id: "507f1f77bcf86cd799439011" },
        expect.objectContaining({ is_active: false }),
        expect.any(Object)
      );
    });

    it("✅ should handle getUserWebhookUrl when webhook_url is undefined", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: undefined,
        is_active: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userSlackConfigService.getUserWebhookUrl("507f1f77bcf86cd799439011");

      expect(result).toBeNull();
    });

    it("✅ should handle updateConfig with mongoose validation error", async () => {
      const updateData = {
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
      };

      const validationError = new Error("Validation failed: user_id is required");
      UserSlackConfig.findOneAndUpdate.mockRejectedValue(validationError);

      await expect(
        userSlackConfigService.updateConfig("507f1f77bcf86cd799439011", updateData)
      ).rejects.toThrow("Lỗi cập nhật config Slack: Validation failed: user_id is required");
    });

    it("✅ should handle getOrCreateConfig when create throws validation error", async () => {
      UserSlackConfig.findOne.mockResolvedValue(null);
      const validationError = new Error("Validation failed: user_id is required");
      UserSlackConfig.create.mockRejectedValue(validationError);

      await expect(
        userSlackConfigService.getOrCreateConfig("507f1f77bcf86cd799439011")
      ).rejects.toThrow("Lỗi lấy config Slack: Validation failed: user_id is required");
    });

    it("✅ should handle shouldNotify for all notification types correctly", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
        notify_task_created: true,
        notify_task_assigned: true,
        notify_task_completed: true,
        notify_comment_added: true,
      };

      UserSlackConfig.findOne.mockResolvedValue(mockConfig);

      expect(await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_created")).toBe(true);
      expect(await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_assigned")).toBe(true);
      expect(await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "task_completed")).toBe(true);
      expect(await userSlackConfigService.shouldNotify("507f1f77bcf86cd799439011", "comment_added")).toBe(true);
    });

    it("✅ should handle updateConfig with updated_at timestamp", async () => {
      const updateData = {
        is_active: true,
      };

      const beforeUpdate = new Date();
      const mockUpdatedConfig = {
        _id: "config123",
        user_id: "507f1f77bcf86cd799439011",
        ...updateData,
        updated_at: new Date(),
      };

      UserSlackConfig.findOneAndUpdate.mockResolvedValue(mockUpdatedConfig);

      const result = await userSlackConfigService.updateConfig(
        "507f1f77bcf86cd799439011",
        updateData
      );

      expect(result).toEqual(mockUpdatedConfig);
      expect(UserSlackConfig.findOneAndUpdate).toHaveBeenCalledWith(
        { user_id: "507f1f77bcf86cd799439011" },
        expect.objectContaining({
          ...updateData,
          updated_at: expect.any(Date),
        }),
        expect.any(Object)
      );
    });
  });
});

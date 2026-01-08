// 📄 tests/unit/userSlackConfig.controller.test.js - User Slack Config Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", _id: "user123" };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock user slack config service
jest.mock("../../services/userSlackConfig.service", () => ({
  getOrCreateConfig: jest.fn(),
  updateConfig: jest.fn(),
  toggleNotifications: jest.fn(),
  deleteConfig: jest.fn(),
}));

// Mock slack service
jest.mock("../../services/slack.service", () => ({
  sendWebhookMessage: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const userSlackConfigRouter = require("../../router/userSlackConfig.routes");

const app = express();
app.use(express.json());
app.use("/api/userSlackConfig", userSlackConfigRouter);

describe("🔹 User Slack Config Controller Unit Tests", () => {
  const userSlackConfigService = require("../../services/userSlackConfig.service");
  const slackService = require("../../services/slack.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/userSlackConfig/config - Get My Config", () => {
    it("✅ should return user slack config", async () => {
      const mockConfig = {
        _id: "config123",
        user_id: "user123",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
        notify_task_created: true,
      };

      userSlackConfigService.getOrCreateConfig.mockResolvedValue(mockConfig);

      const res = await request(app).get("/api/userSlackConfig/config");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "config123");
      expect(res.body.data.webhook_url).toContain("..."); // Should be masked
      expect(userSlackConfigService.getOrCreateConfig).toHaveBeenCalledWith("user123");
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      // Test controller directly
      const userSlackConfigController = require("../../controllers/userSlackConfig.controller");
      const mockReq = {
        user: undefined,
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await userSlackConfigController.getMyConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Không có quyền truy cập",
      });
    });
  });

  describe("PUT /api/userSlackConfig/config - Update My Config", () => {
    it("✅ should update user slack config successfully", async () => {
      const mockUpdated = {
        _id: "config123",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
        notify_task_created: true,
      };

      userSlackConfigService.updateConfig.mockResolvedValue(mockUpdated);

      const updateData = {
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        notify_task_created: true,
      };

      const res = await request(app)
        .put("/api/userSlackConfig/config")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Cập nhật cấu hình Slack thành công");
      expect(res.body.data.webhook_url).toContain("..."); // Should be masked
      expect(userSlackConfigService.updateConfig).toHaveBeenCalledWith(
        "user123",
        updateData
      );
    });

    it("❌ should return 400 for invalid webhook URL", async () => {
      const res = await request(app)
        .put("/api/userSlackConfig/config")
        .send({ webhook_url: "invalid-url" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Webhook URL không hợp lệ. Phải bắt đầu với https://hooks.slack.com/services/"
      );
    });
  });

  describe("PUT /api/userSlackConfig/config/toggle - Toggle Notifications", () => {
    it("✅ should toggle notifications successfully", async () => {
      const mockConfig = {
        _id: "config123",
        is_active: true,
      };

      userSlackConfigService.toggleNotifications.mockResolvedValue(mockConfig);

      const res = await request(app)
        .put("/api/userSlackConfig/config/toggle")
        .send({ is_active: true });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Thông báo Slack đã bật");
      expect(res.body.data).toHaveProperty("is_active", true);
      expect(userSlackConfigService.toggleNotifications).toHaveBeenCalledWith(
        "user123",
        true
      );
    });

    it("❌ should return 400 when is_active is not boolean", async () => {
      const res = await request(app)
        .put("/api/userSlackConfig/config/toggle")
        .send({ is_active: "true" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "is_active phải là boolean (true/false)"
      );
    });
  });

  describe("POST /api/userSlackConfig/config/test - Test Webhook", () => {
    it("✅ should test webhook successfully", async () => {
      slackService.sendWebhookMessage.mockResolvedValue(true);

      const res = await request(app)
        .post("/api/userSlackConfig/config/test")
        .send({
          webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "Webhook URL hoạt động! Vui lòng kiểm tra Slack channel của bạn."
      );
      expect(slackService.sendWebhookMessage).toHaveBeenCalled();
    });

    it("❌ should return 400 when webhook_url is missing", async () => {
      const res = await request(app)
        .post("/api/userSlackConfig/config/test")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "webhook_url là bắt buộc");
    });

    it("❌ should return 400 for invalid webhook URL format", async () => {
      const res = await request(app)
        .post("/api/userSlackConfig/config/test")
        .send({ webhook_url: "invalid-url" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Webhook URL không hợp lệ");
    });

    it("❌ should return 400 when webhook test fails", async () => {
      slackService.sendWebhookMessage.mockResolvedValue(false);

      const res = await request(app)
        .post("/api/userSlackConfig/config/test")
        .send({
          webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Không thể gửi thông báo. Vui lòng kiểm tra lại webhook URL."
      );
    });
  });

  describe("DELETE /api/userSlackConfig/config - Delete My Config", () => {
    it("✅ should delete user slack config successfully", async () => {
      userSlackConfigService.deleteConfig.mockResolvedValue(true);

      const res = await request(app).delete("/api/userSlackConfig/config");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã xóa cấu hình Slack");
      expect(userSlackConfigService.deleteConfig).toHaveBeenCalledWith("user123");
    });

    it("❌ should return 400 for service error", async () => {
      userSlackConfigService.deleteConfig.mockRejectedValue(
        new Error("Config not found")
      );

      const res = await request(app).delete("/api/userSlackConfig/config");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });
});


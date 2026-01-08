// 📄 tests/unit/boardSlackConfig.controller.test.js - Board Slack Config Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", _id: "user123" };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock board slack config service
jest.mock("../../services/boardSlackConfig.service", () => ({
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
const boardSlackConfigRouter = require("../../router/boardSlackConfig.routes");

const app = express();
app.use(express.json());
app.use("/api/boardSlackConfig", boardSlackConfigRouter);

describe("🔹 Board Slack Config Controller Unit Tests", () => {
  const boardSlackConfigService = require("../../services/boardSlackConfig.service");
  const slackService = require("../../services/slack.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/boardSlackConfig/:board_id/config - Get Board Config", () => {
    it("✅ should return board slack config", async () => {
      const mockConfig = {
        _id: "config123",
        board_id: "board123",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
      };

      boardSlackConfigService.getOrCreateConfig.mockResolvedValue(mockConfig);

      const res = await request(app).get("/api/boardSlackConfig/board123/config");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "config123");
      expect(res.body.data.webhook_url).toContain("..."); // Should be masked
      expect(boardSlackConfigService.getOrCreateConfig).toHaveBeenCalledWith("board123");
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      // Test controller directly
      const boardSlackConfigController = require("../../controllers/boardSlackConfig.controller");
      const mockReq = {
        params: { board_id: "board123" },
        user: undefined,
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await boardSlackConfigController.getBoardConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Không có quyền truy cập",
      });
    });
  });

  describe("PUT /api/boardSlackConfig/:board_id/config - Update Board Config", () => {
    it("✅ should update board slack config successfully", async () => {
      const mockUpdated = {
        _id: "config123",
        board_id: "board123",
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        is_active: true,
      };

      boardSlackConfigService.updateConfig.mockResolvedValue(mockUpdated);

      const updateData = {
        webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        notify_task_created: true,
      };

      const res = await request(app)
        .put("/api/boardSlackConfig/board123/config")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Cập nhật cấu hình Slack cho board thành công");
      expect(res.body.data.webhook_url).toContain("..."); // Should be masked
      expect(boardSlackConfigService.updateConfig).toHaveBeenCalledWith(
        "board123",
        "user123",
        updateData
      );
    });

    it("❌ should return 400 for invalid webhook URL", async () => {
      const res = await request(app)
        .put("/api/boardSlackConfig/board123/config")
        .send({ webhook_url: "invalid-url" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Webhook URL không hợp lệ. Phải bắt đầu với https://hooks.slack.com/services/"
      );
    });
  });

  describe("PUT /api/boardSlackConfig/:board_id/config/toggle - Toggle Notifications", () => {
    it("✅ should toggle notifications successfully", async () => {
      const mockConfig = {
        _id: "config123",
        is_active: true,
      };

      boardSlackConfigService.toggleNotifications.mockResolvedValue(mockConfig);

      const res = await request(app)
        .put("/api/boardSlackConfig/board123/config/toggle")
        .send({ is_active: true });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Thông báo Slack của board đã bật");
      expect(res.body.data).toHaveProperty("is_active", true);
      expect(boardSlackConfigService.toggleNotifications).toHaveBeenCalledWith(
        "board123",
        "user123",
        true
      );
    });

    it("❌ should return 400 when is_active is not boolean", async () => {
      const res = await request(app)
        .put("/api/boardSlackConfig/board123/config/toggle")
        .send({ is_active: "true" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "is_active phải là boolean (true/false)"
      );
    });
  });

  describe("POST /api/boardSlackConfig/:board_id/config/test - Test Webhook", () => {
    it("✅ should test webhook successfully", async () => {
      slackService.sendWebhookMessage.mockResolvedValue(true);

      const res = await request(app)
        .post("/api/boardSlackConfig/board123/config/test")
        .send({
          webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "Webhook URL hoạt động! Vui lòng kiểm tra Slack channel của board."
      );
      expect(slackService.sendWebhookMessage).toHaveBeenCalled();
    });

    it("❌ should return 400 when webhook_url is missing", async () => {
      const res = await request(app)
        .post("/api/boardSlackConfig/board123/config/test")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "webhook_url là bắt buộc");
    });

    it("❌ should return 400 for invalid webhook URL format", async () => {
      const res = await request(app)
        .post("/api/boardSlackConfig/board123/config/test")
        .send({ webhook_url: "invalid-url" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Webhook URL không hợp lệ");
    });

    it("❌ should return 400 when webhook test fails", async () => {
      slackService.sendWebhookMessage.mockResolvedValue(false);

      const res = await request(app)
        .post("/api/boardSlackConfig/board123/config/test")
        .send({
          webhook_url: "https://hooks.slack.com/services/ABC123/DEF456/GHI789",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/boardSlackConfig/:board_id/config - Delete Board Config", () => {
    it("✅ should delete board slack config successfully", async () => {
      boardSlackConfigService.deleteConfig.mockResolvedValue(true);

      const res = await request(app).delete("/api/boardSlackConfig/board123/config");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã xóa cấu hình Slack của board");
      expect(boardSlackConfigService.deleteConfig).toHaveBeenCalledWith(
        "board123",
        "user123"
      );
    });
  });
});


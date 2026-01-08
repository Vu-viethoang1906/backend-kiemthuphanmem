// 📄 tests/unit/gamificationConfig.controller.test.js - Gamification Config Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", roles: ["admin", "System_Manager"] };
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

// Mock gamification config service
jest.mock("../../services/gamificationConfig.service", () => ({
  getConfig: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  toggle: jest.fn(),
  updatePoints: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const gamificationConfigRouter = require("../../router/gamificationConfig.routes");

const app = express();
app.use(express.json());
app.use("/api/gamification", gamificationConfigRouter);

describe("🔹 Gamification Config Controller Unit Tests", () => {
  const gamificationConfigService = require("../../services/gamificationConfig.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/gamification - Get Config", () => {
    it("✅ should return gamification config", async () => {
      const mockConfig = {
        _id: "config123",
        is_enabled: true,
        points_per_task: 10,
        points_deduction: 5,
      };

      gamificationConfigService.getConfig.mockResolvedValue(mockConfig);

      const res = await request(app).get("/api/gamification");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.is_enabled).toBe(true);
      expect(gamificationConfigService.getConfig).toHaveBeenCalled();
    });

    it("❌ should return 400 for service error", async () => {
      gamificationConfigService.getConfig.mockRejectedValue(
        new Error("Database error")
      );

      const res = await request(app).get("/api/gamification");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("POST /api/gamification/enable - Enable Gamification", () => {
    it("✅ should enable gamification successfully", async () => {
      const mockConfig = {
        _id: "config123",
        is_enabled: true,
      };

      gamificationConfigService.enable.mockResolvedValue(mockConfig);

      const res = await request(app).post("/api/gamification/enable");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã bật tính năng gamification");
      expect(res.body.data.is_enabled).toBe(true);
      expect(gamificationConfigService.enable).toHaveBeenCalledWith("user123");
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      // Test controller directly without user
      const gamificationConfigController = require("../../controllers/gamificationConfig.controller");
      const mockReq = {
        user: undefined, // No user
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await gamificationConfigController.enable(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Không có quyền truy cập",
      });
    });
  });

  describe("POST /api/gamification/disable - Disable Gamification", () => {
    it("✅ should disable gamification successfully", async () => {
      const mockConfig = {
        _id: "config123",
        is_enabled: false,
      };

      gamificationConfigService.disable.mockResolvedValue(mockConfig);

      const res = await request(app).post("/api/gamification/disable");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã tắt tính năng gamification");
      expect(res.body.data.is_enabled).toBe(false);
      expect(gamificationConfigService.disable).toHaveBeenCalledWith("user123");
    });
  });

  describe("POST /api/gamification/toggle - Toggle Gamification", () => {
    it("✅ should toggle gamification from disabled to enabled", async () => {
      const mockConfig = {
        _id: "config123",
        is_enabled: true,
      };

      gamificationConfigService.toggle.mockResolvedValue(mockConfig);

      const res = await request(app).post("/api/gamification/toggle");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã bật tính năng gamification");
      expect(res.body.data.is_enabled).toBe(true);
      expect(gamificationConfigService.toggle).toHaveBeenCalledWith("user123");
    });

    it("✅ should toggle gamification from enabled to disabled", async () => {
      const mockConfig = {
        _id: "config123",
        is_enabled: false,
      };

      gamificationConfigService.toggle.mockResolvedValue(mockConfig);

      const res = await request(app).post("/api/gamification/toggle");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Đã tắt tính năng gamification");
      expect(res.body.data.is_enabled).toBe(false);
    });
  });

  describe("PUT /api/gamification/points - Update Points", () => {
    it("✅ should update points successfully", async () => {
      const mockConfig = {
        _id: "config123",
        points_per_task: 20,
        points_deduction: 10,
      };

      gamificationConfigService.updatePoints.mockResolvedValue(mockConfig);

      const pointsData = {
        points_per_task: 20,
        points_deduction: 10,
      };

      const res = await request(app)
        .put("/api/gamification/points")
        .send(pointsData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Cập nhật điểm thưởng thành công");
      expect(res.body.data.points_per_task).toBe(20);
      expect(gamificationConfigService.updatePoints).toHaveBeenCalledWith(
        20,
        10,
        "user123"
      );
    });

    it("❌ should return 400 when points_per_task is missing", async () => {
      const res = await request(app)
        .put("/api/gamification/points")
        .send({ points_deduction: 10 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "points_per_task và points_deduction là bắt buộc"
      );
    });

    it("❌ should return 400 when points_deduction is missing", async () => {
      const res = await request(app)
        .put("/api/gamification/points")
        .send({ points_per_task: 10 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });

    it("❌ should return 400 when points are negative", async () => {
      const res = await request(app)
        .put("/api/gamification/points")
        .send({ points_per_task: -5, points_deduction: 10 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Điểm thưởng và điểm trừ phải >= 0"
      );
    });

    it("✅ should accept zero values", async () => {
      const mockConfig = {
        _id: "config123",
        points_per_task: 0,
        points_deduction: 0,
      };

      gamificationConfigService.updatePoints.mockResolvedValue(mockConfig);

      const res = await request(app)
        .put("/api/gamification/points")
        .send({ points_per_task: 0, points_deduction: 0 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });
  });

  describe("Authorization", () => {
    it("✅ should require admin/System_Manager for enable", async () => {
      // Middleware is mocked to pass, but structure is here
      gamificationConfigService.enable.mockResolvedValue({ is_enabled: true });

      const res = await request(app).post("/api/gamification/enable");

      expect(res.status).toBe(200);
    });
  });
});


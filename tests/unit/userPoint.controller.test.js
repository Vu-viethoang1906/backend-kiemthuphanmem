// 📄 tests/unit/userPoint.controller.test.js - User Point Controller Unit Tests
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

// Mock user point service
jest.mock("../../services/userPoint.service", () => ({
  viewAll: jest.fn(),
  getByUser: jest.fn(),
  getByUserAndCenter: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const userPointRouter = require("../../router/userPoint.router");

const app = express();
app.use(express.json());
app.use("/api/userPoints", userPointRouter);

describe("🔹 User Point Controller Unit Tests", () => {
  const userPointService = require("../../services/userPoint.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/userPoints - Get All User Points", () => {
    it("✅ should return all user points", async () => {
      const mockPoints = [
        { _id: "point1", user_id: "user1", points: 100 },
        { _id: "point2", user_id: "user2", points: 200 },
      ];

      userPointService.viewAll.mockResolvedValue(mockPoints);

      const res = await request(app).get("/api/userPoints");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("count", 2);
      expect(res.body.data).toHaveLength(2);
      expect(userPointService.viewAll).toHaveBeenCalled();
    });

    it("❌ should return 500 for service error", async () => {
      userPointService.viewAll.mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/api/userPoints");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("message", "Database error");
    });
  });

  describe("GET /api/userPoints/user/:userId - Get By User", () => {
    it("✅ should return points for a user", async () => {
      const mockPoints = [
        { _id: "point1", user_id: "user123", points: 100 },
      ];

      userPointService.getByUser.mockResolvedValue(mockPoints);

      const res = await request(app).get("/api/userPoints/user/user123");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(userPointService.getByUser).toHaveBeenCalledWith("user123");
    });
  });

  describe("GET /api/userPoints/user/:userId/center/:centerId - Get By User And Center", () => {
    it("✅ should return points for user and center", async () => {
      const mockRecord = {
        _id: "point123",
        user_id: "user123",
        center_id: "center123",
        points: 150,
      };

      userPointService.getByUserAndCenter.mockResolvedValue(mockRecord);

      const res = await request(app).get(
        "/api/userPoints/user/user123/center/center123"
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("_id", "point123");
      expect(res.body.points).toBe(150);
      expect(userPointService.getByUserAndCenter).toHaveBeenCalledWith(
        "user123",
        "center123"
      );
    });

    it("❌ should return 404 when record not found", async () => {
      userPointService.getByUserAndCenter.mockResolvedValue(null);

      const res = await request(app).get(
        "/api/userPoints/user/user123/center/center123"
      );

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Record not found");
    });
  });

  describe("POST /api/userPoints - Create User Point", () => {
    it("✅ should create user point successfully", async () => {
      const mockPoint = {
        _id: "point123",
        user_id: "user123",
        center_id: "center123",
        points: 100,
      };

      userPointService.create.mockResolvedValue(mockPoint);

      const pointData = {
        user_id: "user123",
        center_id: "center123",
        points: 100,
      };

      const res = await request(app)
        .post("/api/userPoints")
        .send(pointData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("_id", "point123");
      expect(userPointService.create).toHaveBeenCalledWith(pointData);
    });

    it("❌ should return 400 for invalid data", async () => {
      userPointService.create.mockRejectedValue(
        new Error("user_id is required")
      );

      const res = await request(app)
        .post("/api/userPoints")
        .send({ points: 100 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message", "user_id is required");
    });
  });

  describe("PUT /api/userPoints/:id - Update User Point", () => {
    it("✅ should update user point successfully", async () => {
      const mockUpdated = {
        _id: "point123",
        points: 200,
      };

      userPointService.update.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put("/api/userPoints/point123")
        .send({ points: 200 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("points", 200);
      expect(userPointService.update).toHaveBeenCalledWith(
        "point123",
        { points: 200 }
      );
    });

    it("❌ should return 404 when point not found", async () => {
      userPointService.update.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/userPoints/nonexistent")
        .send({ points: 200 });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Record not found");
    });
  });

  describe("DELETE /api/userPoints/:id - Delete User Point", () => {
    it("✅ should delete user point successfully", async () => {
      userPointService.delete.mockResolvedValue(true);

      const res = await request(app).delete("/api/userPoints/point123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Deleted successfully");
      expect(userPointService.delete).toHaveBeenCalledWith("point123");
    });

    it("❌ should return 404 when point not found", async () => {
      userPointService.delete.mockResolvedValue(null);

      const res = await request(app).delete("/api/userPoints/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Record not found");
    });
  });
});


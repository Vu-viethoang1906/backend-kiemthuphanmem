// 📄 tests/unit/activityLog.controller.test.js - Activity Log Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => next(),
  authorizeAny: (requiredRoles) => (req, res, next) => next(),
}));

// Mock service
jest.mock("../../services/activityLog.service");

const request = require("supertest");
const express = require("express");
const activityLogRouter = require("../../router/activityLog.routes");

const app = express();
app.use(express.json());
app.use("/api/activityLogs", activityLogRouter);

describe("🔹 Activity Log Controller Unit Tests", () => {
  const activityLogService = require("../../services/activityLog.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/activityLogs - Create Activity Log", () => {
    it("✅ should create activity log successfully", async () => {
      const mockActivityLog = {
        _id: "log123",
        user_id: "user123",
        action: "Create Board",
        target_type: "Board",
        target_id: "board123",
        created_at: new Date(),
      };

      activityLogService.createActivityLog.mockResolvedValue(mockActivityLog);

      const activityData = {
        user_id: "user123",
        action: "Create Board",
        target_type: "Board",
        target_id: "board123",
      };

      const res = await request(app)
        .post("/api/activityLogs")
        .send(activityData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.action).toBe("Create Board");
      expect(activityLogService.createActivityLog).toHaveBeenCalledWith(activityData);
    });

    it("❌ should return 400 for invalid data", async () => {
      activityLogService.createActivityLog.mockRejectedValue(
        new Error("user_id is required")
      );

      const res = await request(app)
        .post("/api/activityLogs")
        .send({ action: "Test" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "user_id is required");
    });
  });

  describe("GET /api/activityLogs/:id - Get Activity Log By ID", () => {
    it("✅ should return activity log by id", async () => {
      const mockActivityLog = {
        _id: "log123",
        user_id: "user123",
        action: "Create Board",
        target_type: "Board",
      };

      activityLogService.getActivityLogById.mockResolvedValue(mockActivityLog);

      const res = await request(app).get("/api/activityLogs/log123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "log123");
      expect(activityLogService.getActivityLogById).toHaveBeenCalledWith("log123");
    });

    it("❌ should return 404 for non-existent activity log", async () => {
      activityLogService.getActivityLogById.mockResolvedValue(null);

      const res = await request(app).get("/api/activityLogs/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Activity log not found");
    });

    it("❌ should return 400 for invalid id", async () => {
      activityLogService.getActivityLogById.mockRejectedValue(
        new Error("Activity log ID is required")
      );

      const res = await request(app).get("/api/activityLogs/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("GET /api/activityLogs - Get All Activity Logs", () => {
    it("✅ should return all activity logs with pagination", async () => {
      const mockResult = {
        data: [
          { _id: "log1", action: "Create Board" },
          { _id: "log2", action: "Update Task" },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      activityLogService.getAllActivityLogs.mockResolvedValue(mockResult);

      const res = await request(app)
        .get("/api/activityLogs")
        .query({ page: 1, limit: 20 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveLength(2);
      expect(activityLogService.getAllActivityLogs).toHaveBeenCalledWith({
        page: "1",
        limit: "20",
      });
    });

    it("✅ should filter by user_id", async () => {
      const mockResult = {
        data: [{ _id: "log1", user_id: "user123", action: "Create Board" }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      activityLogService.getAllActivityLogs.mockResolvedValue(mockResult);

      const res = await request(app)
        .get("/api/activityLogs")
        .query({ user_id: "user123" });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(activityLogService.getAllActivityLogs).toHaveBeenCalledWith({
        user_id: "user123",
      });
    });

    it("❌ should return 400 for invalid query params", async () => {
      activityLogService.getAllActivityLogs.mockRejectedValue(
        new Error("page must be greater than 0")
      );

      const res = await request(app)
        .get("/api/activityLogs")
        .query({ page: 0 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("GET /api/activityLogs/user/:userId - Get Activity Logs By User", () => {
    it("✅ should return activity logs for a user", async () => {
      const mockResult = {
        data: [
          { _id: "log1", user_id: "user123", action: "Create Board" },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      activityLogService.getAllActivityLogs.mockResolvedValue(mockResult);

      const res = await request(app)
        .get("/api/activityLogs/user/user123")
        .query({ page: 1, limit: 20 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(activityLogService.getAllActivityLogs).toHaveBeenCalledWith({
        user_id: "user123",
        page: "1",
        limit: "20",
      });
    });
  });

  describe("GET /api/activityLogs/date-range - Get Activity Logs By Date Range", () => {
    it("✅ should return activity logs in date range", async () => {
      const mockResult = {
        data: [{ _id: "log1", action: "Create Board" }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      activityLogService.getAllActivityLogs.mockResolvedValue(mockResult);

      const res = await request(app)
        .get("/api/activityLogs/date-range")
        .query({
          startDate: "2025-01-01",
          endDate: "2025-01-31",
          page: 1,
          limit: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(activityLogService.getAllActivityLogs).toHaveBeenCalledWith({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        page: "1",
        limit: "20",
      });
    });

    it("❌ should return 400 when startDate or endDate is missing", async () => {
      const res = await request(app)
        .get("/api/activityLogs/date-range")
        .query({ startDate: "2025-01-01" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "startDate and endDate are required");
    });
  });

  describe("PUT /api/activityLogs/:id - Update Activity Log", () => {
    it("✅ should update activity log successfully", async () => {
      const mockUpdated = {
        _id: "log123",
        action: "Updated Action",
        description: "Updated description",
      };

      activityLogService.updateActivityLog.mockResolvedValue(mockUpdated);

      const updateData = {
        action: "Updated Action",
        description: "Updated description",
      };

      const res = await request(app)
        .put("/api/activityLogs/log123")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data.action).toBe("Updated Action");
      expect(activityLogService.updateActivityLog).toHaveBeenCalledWith(
        "log123",
        updateData
      );
    });

    it("❌ should return 404 for non-existent activity log", async () => {
      activityLogService.updateActivityLog.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/activityLogs/nonexistent")
        .send({ action: "Test" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Activity log not found");
    });

    it("❌ should return 400 for invalid data", async () => {
      activityLogService.updateActivityLog.mockRejectedValue(
        new Error("Invalid update data")
      );

      const res = await request(app)
        .put("/api/activityLogs/log123")
        .send({ action: "" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/activityLogs/:id - Delete Activity Log", () => {
    it("✅ should delete activity log successfully", async () => {
      const mockDeleted = {
        _id: "log123",
        action: "Create Board",
      };

      activityLogService.deleteActivityLog.mockResolvedValue(mockDeleted);

      const res = await request(app).delete("/api/activityLogs/log123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Activity log deleted successfully");
      expect(activityLogService.deleteActivityLog).toHaveBeenCalledWith("log123");
    });

    it("❌ should return 404 for non-existent activity log", async () => {
      activityLogService.deleteActivityLog.mockResolvedValue(null);

      const res = await request(app).delete("/api/activityLogs/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Activity log not found");
    });

    it("❌ should return 400 for invalid id", async () => {
      activityLogService.deleteActivityLog.mockRejectedValue(
        new Error("Activity log ID is required")
      );

      const res = await request(app).delete("/api/activityLogs/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("Error Handling", () => {
    it("✅ should handle server errors gracefully", async () => {
      activityLogService.createActivityLog.mockRejectedValue(
        new Error("Database connection error")
      );

      const res = await request(app)
        .post("/api/activityLogs")
        .send({ user_id: "user123", action: "Test" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error");
    });
  });
});

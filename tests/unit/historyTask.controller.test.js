// 📄 tests/unit/historyTask.controller.test.js - History Task Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", roles: ["admin", "System_Manager", "VIEW_LOG_TASK"] };
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

// Mock history task service
jest.mock("../../services/historyTask.service", () => ({
  createHistoryTask: jest.fn(),
  getHistoryTaskById: jest.fn(),
  getAllHistoryTasks: jest.fn(),
  updateHistoryTask: jest.fn(),
  deleteHistoryTask: jest.fn(),
  fetchBoardTasksHistory: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const historyTaskRouter = require("../../router/historyTask.router");

const app = express();
app.use(express.json());
app.use("/api/historyTasks", historyTaskRouter);

describe("🔹 History Task Controller Unit Tests", () => {
  const historyTaskService = require("../../services/historyTask.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/historyTasks - Create History Task", () => {
    it("✅ should create history task successfully", async () => {
      const mockHistory = {
        _id: "history123",
        task_id: "task123",
        action: "Created",
        user_id: "user123",
      };

      historyTaskService.createHistoryTask.mockResolvedValue(mockHistory);

      const historyData = {
        task_id: "task123",
        action: "Created",
        user_id: "user123",
      };

      const res = await request(app)
        .post("/api/historyTasks")
        .send(historyData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("_id", "history123");
      expect(historyTaskService.createHistoryTask).toHaveBeenCalledWith(historyData);
    });

    it("❌ should return 400 for invalid data", async () => {
      historyTaskService.createHistoryTask.mockRejectedValue(
        new Error("task_id is required")
      );

      const res = await request(app)
        .post("/api/historyTasks")
        .send({ action: "Created" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "task_id is required");
    });
  });

  describe("GET /api/historyTasks/:id - Get History Task By ID", () => {
    it("✅ should return history task by id", async () => {
      const mockHistory = {
        _id: "history123",
        task_id: "task123",
        action: "Updated",
      };

      historyTaskService.getHistoryTaskById.mockResolvedValue(mockHistory);

      const res = await request(app).get("/api/historyTasks/history123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("_id", "history123");
      expect(historyTaskService.getHistoryTaskById).toHaveBeenCalledWith("history123");
    });

    it("❌ should return 404 for non-existent history", async () => {
      historyTaskService.getHistoryTaskById.mockResolvedValue(null);

      const res = await request(app).get("/api/historyTasks/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Not found");
    });
  });

  describe("GET /api/historyTasks - Get All History Tasks", () => {
    it("✅ should return all history tasks with query params", async () => {
      const mockHistories = [
        { _id: "history1", task_id: "task1" },
        { _id: "history2", task_id: "task2" },
      ];

      historyTaskService.getAllHistoryTasks.mockResolvedValue(mockHistories);

      const res = await request(app)
        .get("/api/historyTasks")
        .query({ task_id: "task123", page: 1, limit: 20 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(historyTaskService.getAllHistoryTasks).toHaveBeenCalledWith({
        task_id: "task123",
        page: "1",
        limit: "20",
      });
    });
  });

  describe("PUT /api/historyTasks/:id - Update History Task", () => {
    it("✅ should update history task successfully", async () => {
      const mockUpdated = {
        _id: "history123",
        action: "Updated Action",
      };

      historyTaskService.updateHistoryTask.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put("/api/historyTasks/history123")
        .send({ action: "Updated Action" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("_id", "history123");
      expect(historyTaskService.updateHistoryTask).toHaveBeenCalledWith(
        "history123",
        { action: "Updated Action" }
      );
    });

    it("❌ should return 404 for non-existent history", async () => {
      historyTaskService.updateHistoryTask.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/historyTasks/nonexistent")
        .send({ action: "Updated" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Not found");
    });
  });

  describe("DELETE /api/historyTasks/:id - Delete History Task", () => {
    it("✅ should delete history task successfully", async () => {
      historyTaskService.deleteHistoryTask.mockResolvedValue(true);

      const res = await request(app).delete("/api/historyTasks/history123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Deleted successfully");
      expect(historyTaskService.deleteHistoryTask).toHaveBeenCalledWith("history123");
    });

    it("❌ should return 404 for non-existent history", async () => {
      historyTaskService.deleteHistoryTask.mockResolvedValue(null);

      const res = await request(app).delete("/api/historyTasks/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Not found");
    });
  });

  describe("GET /api/historyTasks/task/:taskId/history - Get History By Task ID", () => {
    it("✅ should return history for a task", async () => {
      const mockHistories = [
        { _id: "history1", task_id: "task123", action: "Created" },
        { _id: "history2", task_id: "task123", action: "Updated" },
      ];

      historyTaskService.getAllHistoryTasks.mockResolvedValue(mockHistories);

      const res = await request(app).get("/api/historyTasks/task/task123/history");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(historyTaskService.getAllHistoryTasks).toHaveBeenCalledWith(
        { task_id: "task123" },
        { sort: { createdAt: -1 } }
      );
    });
  });

  describe("GET /api/historyTasks/board/:boardId/history - Get History By Board", () => {
    it("✅ should return board tasks history", async () => {
      const mockLogs = [
        { task_id: "task1", action: "Created" },
        { task_id: "task2", action: "Updated" },
      ];

      historyTaskService.fetchBoardTasksHistory.mockResolvedValue(mockLogs);

      const res = await request(app).get("/api/historyTasks/board/board123/history");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(historyTaskService.fetchBoardTasksHistory).toHaveBeenCalledWith("board123");
    });

    it("❌ should return 500 for service error", async () => {
      historyTaskService.fetchBoardTasksHistory.mockRejectedValue(
        new Error("Database error")
      );

      const res = await request(app).get("/api/historyTasks/board/board123/history");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("message", "Failed to fetch board tasks history");
    });
  });
});


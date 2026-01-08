// 📄 tests/unit/taskTag.controller.test.js - Task Tag Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", _id: "user123" };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock task tag service
jest.mock("../../services/taskTag.service", () => ({
  addTagToTask: jest.fn(),
  getTagsByTask: jest.fn(),
  getTasksByTag: jest.fn(),
  removeTagFromTask: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const taskTagRouter = require("../../router/taskTag.routes");

const app = express();
app.use(express.json());
app.use("/api/taskTags", taskTagRouter);

describe("🔹 Task Tag Controller Unit Tests", () => {
  const taskTagService = require("../../services/taskTag.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/taskTags - Add Tag", () => {
    it("✅ should add tag to task successfully", async () => {
      const mockResult = {
        message: "Tag đã được thêm vào task",
        data: {
          _id: "taskTag123",
          task_id: "task123",
          tag_id: "tag123",
        },
      };

      taskTagService.addTagToTask.mockResolvedValue(mockResult);

      const tagData = {
        taskId: "task123",
        tagId: "tag123",
      };

      const res = await request(app)
        .post("/api/taskTags")
        .send(tagData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Tag đã được thêm vào task");
      expect(res.body.data).toHaveProperty("_id", "taskTag123");
      expect(taskTagService.addTagToTask).toHaveBeenCalledWith(
        "task123",
        "tag123"
      );
    });

    it("❌ should return 400 for service error", async () => {
      taskTagService.addTagToTask.mockRejectedValue(
        new Error("Tag already exists on task")
      );

      const res = await request(app)
        .post("/api/taskTags")
        .send({ taskId: "task123", tagId: "tag123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Tag already exists on task");
    });
  });

  describe("GET /api/taskTags/task/:taskId - Get Tags By Task", () => {
    it("✅ should return tags for a task", async () => {
      const mockTags = [
        { _id: "tag1", name: "Urgent", color: "#ff0000" },
        { _id: "tag2", name: "Important", color: "#00ff00" },
      ];

      taskTagService.getTagsByTask.mockResolvedValue(mockTags);

      const res = await request(app).get("/api/taskTags/task/task123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty("name", "Urgent");
      expect(taskTagService.getTagsByTask).toHaveBeenCalledWith("task123");
    });

    it("❌ should return 400 for service error", async () => {
      taskTagService.getTagsByTask.mockRejectedValue(
        new Error("Task not found")
      );

      const res = await request(app).get("/api/taskTags/task/nonexistent");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Task not found");
    });
  });

  describe("GET /api/taskTags/tag/:tagId - Get Tasks By Tag", () => {
    it("✅ should return tasks for a tag", async () => {
      const mockTasks = [
        { _id: "task1", title: "Task 1", board_id: "board1" },
        { _id: "task2", title: "Task 2", board_id: "board1" },
      ];

      taskTagService.getTasksByTag.mockResolvedValue(mockTasks);

      const res = await request(app).get("/api/taskTags/tag/tag123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty("title", "Task 1");
      expect(taskTagService.getTasksByTag).toHaveBeenCalledWith("tag123");
    });

    it("❌ should return 400 for service error", async () => {
      taskTagService.getTasksByTag.mockRejectedValue(
        new Error("Tag not found")
      );

      const res = await request(app).get("/api/taskTags/tag/nonexistent");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Tag not found");
    });
  });

  describe("DELETE /api/taskTags - Remove Tag", () => {
    it("✅ should remove tag from task successfully", async () => {
      taskTagService.removeTagFromTask.mockResolvedValue(true);

      const res = await request(app)
        .delete("/api/taskTags")
        .send({ taskId: "task123", tagId: "tag123" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Xóa tag khỏi task thành công");
      expect(taskTagService.removeTagFromTask).toHaveBeenCalledWith(
        "task123",
        "tag123"
      );
    });

    it("❌ should return 400 for service error", async () => {
      taskTagService.removeTagFromTask.mockRejectedValue(
        new Error("Tag not found on task")
      );

      const res = await request(app)
        .delete("/api/taskTags")
        .send({ taskId: "task123", tagId: "tag123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Tag not found on task");
    });
  });
});


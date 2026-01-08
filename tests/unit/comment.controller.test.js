// 📄 tests/unit/comment.controller.test.js - Comment Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", _id: "user123" };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

jest.mock("../../middlewares/commentUpload", () => {
  return (req, res, next) => {
    req.file = {
      originalname: "test.jpg",
      filename: "test-123.jpg",
      path: "/uploads/test.jpg",
    };
    next();
  };
});

// Mock comment service
jest.mock("../../services/comment.service", () => ({
  createComment: jest.fn(),
  getCommentsByTask: jest.fn(),
  getCommentById: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  getCommentsByUser: jest.fn(),
  addAttachment: jest.fn(),
  getAttachments: jest.fn(),
  deleteAttachment: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const commentRouter = require("../../router/comment.routes");

const app = express();
app.use(express.json());
app.use("/api/comments", commentRouter);

describe("🔹 Comment Controller Unit Tests", () => {
  const commentService = require("../../services/comment.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/comments - Create Comment", () => {
    it("✅ should create comment successfully", async () => {
      const mockComment = {
        _id: "comment123",
        task_id: "task123",
        user_id: "user123",
        content: "Test comment",
      };

      commentService.createComment.mockResolvedValue(mockComment);

      const commentData = {
        task_id: "task123",
        content: "Test comment",
      };

      const res = await request(app)
        .post("/api/comments")
        .send(commentData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Tạo comment thành công");
      expect(res.body.data.content).toBe("Test comment");
      expect(commentService.createComment).toHaveBeenCalledWith({
        task_id: "task123",
        user_id: "user123",
        content: "Test comment",
      });
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      // Note: Authentication is tested in middleware tests
      // This test verifies controller checks req.user
      // Since middleware is mocked to always set user, we skip this test
      // or test it by directly calling controller without middleware
      const commentController = require("../../controllers/comment.controller");
      const mockReq = {
        body: { task_id: "task123", content: "Test" },
        user: undefined, // No user
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await commentController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Không có quyền truy cập",
      });
    });

    it("❌ should return 400 for invalid data", async () => {
      commentService.createComment.mockRejectedValue(
        new Error("task_id is required")
      );

      const res = await request(app)
        .post("/api/comments")
        .send({ content: "Test comment" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("GET /api/comments/task/:taskId - Get Comments By Task", () => {
    it("✅ should return comments for a task", async () => {
      const mockComments = [
        { _id: "comment1", content: "Comment 1" },
        { _id: "comment2", content: "Comment 2" },
      ];

      commentService.getCommentsByTask.mockResolvedValue(mockComments);

      const res = await request(app).get("/api/comments/task/task123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("count", 2);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(commentService.getCommentsByTask).toHaveBeenCalledWith("task123");
    });

    it("❌ should return 500 for service error", async () => {
      commentService.getCommentsByTask.mockRejectedValue(
        new Error("Database error")
      );

      const res = await request(app).get("/api/comments/task/task123");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("GET /api/comments/:id - Get Comment By ID", () => {
    it("✅ should return comment by id", async () => {
      const mockComment = {
        _id: "comment123",
        content: "Test comment",
        task_id: "task123",
      };

      commentService.getCommentById.mockResolvedValue(mockComment);

      const res = await request(app).get("/api/comments/comment123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "comment123");
      expect(commentService.getCommentById).toHaveBeenCalledWith("comment123");
    });

    it("❌ should return 404 for non-existent comment", async () => {
      commentService.getCommentById.mockResolvedValue(null);

      const res = await request(app).get("/api/comments/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Comment không tồn tại");
    });
  });

  describe("PUT /api/comments/:id - Update Comment", () => {
    it("✅ should update comment successfully", async () => {
      const mockUpdated = {
        _id: "comment123",
        content: "Updated comment",
      };

      commentService.updateComment.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put("/api/comments/comment123")
        .send({ content: "Updated comment" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Cập nhật comment thành công");
      expect(commentService.updateComment).toHaveBeenCalledWith(
        "comment123",
        { content: "Updated comment" },
        "user123"
      );
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      // Test controller directly without middleware
      const commentController = require("../../controllers/comment.controller");
      const mockReq = {
        params: { id: "comment123" },
        body: { content: "Updated" },
        user: undefined, // No user
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await commentController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Không có quyền truy cập",
      });
    });

    it("❌ should return 404 for non-existent comment", async () => {
      commentService.updateComment.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/comments/nonexistent")
        .send({ content: "Updated" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/comments/:id - Delete Comment", () => {
    it("✅ should delete comment successfully", async () => {
      commentService.deleteComment.mockResolvedValue(true);

      const res = await request(app).delete("/api/comments/comment123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Xóa comment thành công");
      expect(commentService.deleteComment).toHaveBeenCalledWith("comment123", "user123");
    });

    it("❌ should return 404 for non-existent comment", async () => {
      commentService.deleteComment.mockResolvedValue(null);

      const res = await request(app).delete("/api/comments/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("GET /api/comments/user/my - Get Comments By User", () => {
    it("✅ should return comments for current user", async () => {
      const mockComments = [
        { _id: "comment1", content: "My comment 1" },
        { _id: "comment2", content: "My comment 2" },
      ];

      commentService.getCommentsByUser.mockResolvedValue(mockComments);

      const res = await request(app).get("/api/comments/user/my");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("count", 2);
      expect(commentService.getCommentsByUser).toHaveBeenCalledWith("user123");
    });
  });

  describe("POST /api/comments/:commentId/attachment - Upload Attachment", () => {
    it("✅ should upload attachment successfully", async () => {
      const mockAttachment = {
        _id: "attachment123",
        filename: "test.jpg",
        url: "/uploads/test.jpg",
      };

      commentService.addAttachment.mockResolvedValue(mockAttachment);

      const res = await request(app)
        .post("/api/comments/comment123/attachment")
        .attach("file", Buffer.from("test"), "test.jpg");

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Tải lên file đính kèm thành công");
      expect(commentService.addAttachment).toHaveBeenCalled();
    });

    it("❌ should return 400 when no file provided", async () => {
      // Test controller directly without file
      const commentController = require("../../controllers/comment.controller");
      const mockReq = {
        params: { commentId: "comment123" },
        user: { id: "user123" },
        file: undefined, // No file provided
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await commentController.uploadAttachment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Chưa có file đính kèm",
      });
    });
  });

  describe("GET /api/comments/:commentId/attachment - Get Attachments", () => {
    it("✅ should return attachments for a comment", async () => {
      const mockAttachments = [
        { filename: "test1.jpg", url: "/uploads/test1.jpg" },
        { filename: "test2.pdf", url: "/uploads/test2.pdf" },
      ];

      commentService.getAttachments.mockResolvedValue(mockAttachments);

      const res = await request(app).get("/api/comments/comment123/attachment");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("DELETE /api/comments/:commentId/attachment - Delete Attachment", () => {
    it("✅ should delete attachment successfully", async () => {
      commentService.deleteAttachment.mockResolvedValue({
        message: "Xóa file đính kèm thành công",
      });

      const res = await request(app)
        .delete("/api/comments/comment123/attachment")
        .query({ attachmentIndex: 0 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(commentService.deleteAttachment).toHaveBeenCalledWith(
        "comment123",
        0,
        "user123"
      );
    });

    it("❌ should return 400 when attachmentIndex is missing", async () => {
      const res = await request(app)
        .delete("/api/comments/comment123/attachment")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Thiếu thông tin attachment index");
    });
  });
});


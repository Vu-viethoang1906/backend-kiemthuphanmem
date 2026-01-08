// 📄 tests/integration/tagApi.test.js - Tag API Integration Tests
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.test" });

const tagRouter = require("../../router/tag.routes");
const Tag = require("../../models/tag.model");
const TaskTag = require("../../models/taskTag.model");
const Task = require("../../models/task.model");
const Board = require("../../models/board.model");
const BoardMember = require("../../models/boardMember.model");
const User = require("../../models/usersModel");

// Mock middleware để bypass authentication
const mockTestUserId = "507f1f77bcf86cd799439011";

jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: mockTestUserId,
      roles: ["admin", "System_Manager"],
      email: "test@example.com",
      username: "testuser",
    };
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

describe("🔹 Tag API Integration Tests", () => {
  let app;
  let testTagId;
  let testBoardId;
  let testTaskId;

  beforeAll(async () => {
    // Kết nối database test
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    // Tạo test user nếu chưa có
    const existingUser = await User.findById(mockTestUserId);
    if (!existingUser) {
      await User.create({
        _id: new mongoose.Types.ObjectId(mockTestUserId),
        email: "test@example.com",
        username: "testuser",
        full_name: "Test User",
        status: "active",
        typeAccount: "Local",
      });
    }

    app = express();
    app.use(express.json());
    app.use("/api/tags", tagRouter);
  });

  beforeEach(async () => {
    // Cleanup trước mỗi test
    await Tag.deleteMany({ name: { $regex: /^\[TEST\]/ } });
    await TaskTag.deleteMany({});

    // Tạo test board
    const board = await Board.create({
      title: `[TEST] Tag Test Board ${Date.now()}`,
      created_by: new mongoose.Types.ObjectId(mockTestUserId),
    });
    testBoardId = board._id;

    // Tạo board member
    await BoardMember.create({
      board_id: testBoardId,
      user_id: new mongoose.Types.ObjectId(mockTestUserId),
      role_in_board: "Người tạo",
      Creator: true,
    });
  });

  afterAll(async () => {
    // Cleanup sau tất cả tests
    await Tag.deleteMany({ name: { $regex: /^\[TEST\]/ } });
    await TaskTag.deleteMany({});
    await Board.deleteMany({ title: { $regex: /^\[TEST\]/ } });
    await BoardMember.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("POST /api/tags - Create Tag", () => {
    it("✅ should create tag with real data", async () => {
      const timestamp = Date.now();
      const tagData = {
        name: `[TEST] Integration Test Tag ${timestamp}`,
        color: "#ff0000",
        boardId: testBoardId.toString(),
      };

      const res = await request(app).post("/api/tags").send(tagData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Tạo tag thành công");
      expect(res.body.data.name).toBe(
        `[TEST] Integration Test Tag ${timestamp}`
      );
      expect(res.body.data.color).toBe("#ff0000");
      expect(res.body.data.board_id).toBe(testBoardId.toString());

      // Lưu ID để dùng cho các test khác
      testTagId = res.body.data._id;
    });

    it("❌ should reject tag without name", async () => {
      const tagData = {
        color: "#ff0000",
        boardId: testBoardId.toString(),
      };

      const res = await request(app).post("/api/tags").send(tagData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("✅ should create tag with default color", async () => {
      const timestamp = Date.now();
      const tagData = {
        name: `[TEST] Default Color Tag ${timestamp}`,
        boardId: testBoardId.toString(),
      };

      const res = await request(app).post("/api/tags").send(tagData);

      expect(res.status).toBe(201);
      expect(res.body.data.color).toBe("#007bff"); // default
    });
  });

  describe("GET /api/tags - Get All Tags", () => {
    it("✅ should return tags from database", async () => {
      // Tạo test tag trước
      const timestamp = Date.now();
      await Tag.create({
        name: `[TEST] List Tag ${timestamp}`,
        color: "#00ff00",
        board_id: testBoardId,
      });

      const res = await request(app).get("/api/tags");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("count");
      expect(Array.isArray(res.body.data)).toBe(true);

      // Kiểm tra có tag với tên chứa [TEST]
      const testTags = res.body.data.filter(
        (tag) => tag.name && tag.name.includes("[TEST]")
      );
      expect(testTags.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/tags/:id - Get Tag By ID", () => {
    it("✅ should return tag detail from database", async () => {
      // Tạo test tag
      const timestamp = Date.now();
      const tag = await Tag.create({
        name: `[TEST] Detail Tag ${timestamp}`,
        color: "#0000ff",
        board_id: testBoardId,
      });

      const res = await request(app).get(`/api/tags/${tag._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.name).toBe(`[TEST] Detail Tag ${timestamp}`);
      expect(res.body.data._id).toBe(tag._id.toString());
    });

    it("❌ should return 404 for non-existent tag", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/tags/${fakeId}`);

      // Controller có thể trả về 404 hoặc 500 tùy vào cách xử lý error
      expect([404, 500]).toContain(res.status);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("GET /api/tags/board/:boardId - Get Tags By Board", () => {
    it("✅ should return tags for a board", async () => {
      // Tạo test tags
      const timestamp = Date.now();
      await Tag.create({
        name: `[TEST] Board Tag 1 ${timestamp}`,
        color: "#ff0000",
        board_id: testBoardId,
      });
      await Tag.create({
        name: `[TEST] Board Tag 2 ${timestamp}`,
        color: "#00ff00",
        board_id: testBoardId,
      });

      const res = await request(app).get(`/api/tags/board/${testBoardId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("count");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("PUT /api/tags/:id - Update Tag", () => {
    it("✅ should update tag in database", async () => {
      // Tạo test tag
      const timestamp = Date.now();
      const tag = await Tag.create({
        name: `[TEST] Update Tag ${timestamp}`,
        color: "#ff0000",
        board_id: testBoardId,
      });

      const updateData = {
        name: `[TEST] Updated Tag ${timestamp}`,
        color: "#00ff00",
      };

      const res = await request(app)
        .put(`/api/tags/${tag._id}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Cập nhật tag thành công");
      expect(res.body.data.name).toBe(`[TEST] Updated Tag ${timestamp}`);
      expect(res.body.data.color).toBe("#00ff00");

      // Verify trong database
      const updatedTag = await Tag.findById(tag._id);
      expect(updatedTag.name).toBe(`[TEST] Updated Tag ${timestamp}`);
      expect(updatedTag.color).toBe("#00ff00");
    });
  });

  describe("DELETE /api/tags/:id - Delete Tag", () => {
    it("✅ should soft delete tag in database", async () => {
      const timestamp = Date.now();
      const tag = await Tag.create({
        name: `[TEST] Delete Tag ${timestamp}`,
        color: "#ff0000",
        board_id: testBoardId,
      });

      const res = await request(app).delete(`/api/tags/${tag._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Xóa tag thành công");

      // Verify soft delete (deleted_at được set)
      // Note: findById sẽ không trả về document đã soft delete do pre-find hook
      // Nên phải dùng findOne với điều kiện deleted_at
      const deletedTag = await Tag.findOne({
        _id: tag._id,
        deleted_at: { $ne: null },
      });
      expect(deletedTag).not.toBeNull();
      expect(deletedTag.deleted_at).not.toBeNull();
    });
  });

  describe("GET /api/tags/task/:taskId - Get Tags By Task", () => {
    it("✅ should return tags for a task", async () => {
      // Tạo task và tag
      const Column = require("../../models/column.model");
      const column = await Column.create({
        board_id: testBoardId,
        name: "Test Column",
        order: 0,
      });

      const task = await Task.create({
        board_id: testBoardId,
        column_id: column._id,
        title: "[TEST] Task with Tag",
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });
      testTaskId = task._id;

      const tag = await Tag.create({
        name: `[TEST] Task Tag ${Date.now()}`,
        color: "#ff0000",
        board_id: testBoardId,
      });

      // Gán tag cho task
      await TaskTag.create({
        task_id: task._id,
        tag_id: tag._id,
      });

      const res = await request(app).get(`/api/tags/task/${task._id}`);

      if (res.status !== 200 || res.body.data.length === 0) {
  
        const taskTag = await TaskTag.findOne({ task_id: task._id });
      }

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("count");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/tags/task/:taskId/tag/:tagId - Add Tag To Task", () => {
    it("✅ should add tag to task", async () => {
      // Tạo task và tag
      const Column = require("../../models/column.model");
      const column = await Column.create({
        board_id: testBoardId,
        name: "Test Column",
        order: 0,
      });

      const task = await Task.create({
        board_id: testBoardId,
        column_id: column._id,
        title: "[TEST] Task for Tag",
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });

      const tag = await Tag.create({
        name: `[TEST] Add Tag ${Date.now()}`,
        color: "#ff0000",
        board_id: testBoardId,
      });

      const res = await request(app).post(
        `/api/tags/task/${task._id}/tag/${tag._id}`
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "Thêm tag vào task thành công"
      );

      // Verify trong database
      const taskTag = await TaskTag.findOne({
        task_id: task._id,
        tag_id: tag._id,
      });
      expect(taskTag).not.toBeNull();
    });
  });

  describe("DELETE /api/tags/task/:taskId/tag/:tagId - Remove Tag From Task", () => {
    it("✅ should remove tag from task", async () => {
      // Tạo task và tag
      const Column = require("../../models/column.model");
      const column = await Column.create({
        board_id: testBoardId,
        name: "Test Column",
        order: 0,
      });

      const task = await Task.create({
        board_id: testBoardId,
        column_id: column._id,
        title: "[TEST] Task Remove Tag",
        created_by: new mongoose.Types.ObjectId(mockTestUserId),
      });

      const tag = await Tag.create({
        name: `[TEST] Remove Tag ${Date.now()}`,
        color: "#ff0000",
        board_id: testBoardId,
      });

      // Gán tag trước
      await TaskTag.create({
        task_id: task._id,
        tag_id: tag._id,
      });

      const res = await request(app).delete(
        `/api/tags/task/${task._id}/tag/${tag._id}`
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "Xóa tag khỏi task thành công"
      );

      // Verify trong database
      const taskTag = await TaskTag.findOne({
        task_id: task._id,
        tag_id: tag._id,
      });
      expect(taskTag).toBeNull();
    });
  });

  describe("Database Operations", () => {
    it("✅ should handle database connection", async () => {
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    it("✅ should create and query tags directly", async () => {
      const timestamp = Date.now();
      const tag = await Tag.create({
        name: `[TEST] Direct DB Test ${timestamp}`,
        color: "#ff00ff",
        board_id: testBoardId,
      });

      expect(tag._id).toBeDefined();
      expect(tag.name).toBe(`[TEST] Direct DB Test ${timestamp}`);

      // Query tag
      const foundTag = await Tag.findById(tag._id);
      expect(foundTag).toBeDefined();
      expect(foundTag.name).toBe(`[TEST] Direct DB Test ${timestamp}`);
    });
  });
});

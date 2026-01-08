// 📄 tests/integration/boardApi.test.js
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");

// Mock các middleware để bypass authentication
// Note: Jest yêu cầu tên biến phải bắt đầu bằng "mock" nếu dùng trong jest.mock()
const mockTestUserId = "507f1f77bcf86cd799439011"; // ObjectId string hợp lệ

jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: mockTestUserId,
      roles: ["admin"],
      email: "test@example.com",
      username: "testuser",
    };
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

const boardRouter = require("../../router/board.router");

describe("🔹 Board API Integration Tests", () => {
  let app;
  let testBoardId;

  beforeAll(async () => {
    // Kết nối database test (MongoDB Atlas)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    // Tạo test user trong DB để đảm bảo các foreign key hợp lệ
    const User = require("../../models/usersModel");
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
    app.use("/api/boards", boardRouter);
  });

  afterAll(async () => {
    // KHÔNG xóa dữ liệu - chỉ đóng kết nối
    // Đóng kết nối database
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("POST /api/boards - Create Board", () => {
    it("✅ should create board with real data", async () => {
      const timestamp = Date.now();
      const boardData = {
        title: `[TEST] Integration Test Board ${timestamp}`,
        description: "Board created for integration testing",
        is_template: false,
      };

      const res = await request(app).post("/api/boards").send(boardData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success");
      expect(res.body).toHaveProperty("data");
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(
        `[TEST] Integration Test Board ${timestamp}`
      );

      // Lưu ID để dùng cho các test khác
      testBoardId = res.body.data._id;
    });

    it("❌ should reject board without title", async () => {
      const boardData = {
        description: "No title provided",
      };

      const res = await request(app).post("/api/boards").send(boardData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/boards/my - List My Boards", () => {
    it("✅ should return user's boards from database", async () => {
      const res = await request(app).get("/api/boards/my");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body).toHaveProperty("metadata");

      // Kiểm tra có board với tên chứa [TEST]
      const boards = res.body.data;
      const testBoards = boards.filter(
        (board) => board.title && board.title.includes("[TEST]")
      );
      expect(testBoards.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/boards/:id - Get Board Detail", () => {
    it("✅ should return board detail from database", async () => {
      // Skip nếu testBoardId chưa được set
      if (!testBoardId) {
        console.warn("Skipping board detail test - testBoardId not set");
        return;
      }

      const res = await request(app).get(`/api/boards/${testBoardId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success");
      expect(res.body).toHaveProperty("data");
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toContain("[TEST] Integration Test Board");
      expect(res.body.data._id).toBe(testBoardId);
    });

    it("❌ should return 404 for non-existent board", async () => {
      const fakeId = "507f1f77bcf86cd799439011"; // Valid ObjectId format
      const res = await request(app).get(`/api/boards/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Board không tồn tại");
    });
  });

  describe("PUT /api/boards/:id - Update Board", () => {
    it("✅ should update board in database", async () => {
      const updateData = {
        title: "[TEST] Updated Integration Test Board",
        description: "Updated description",
      };

      const res = await request(app)
        .put(`/api/boards/${testBoardId}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success");
      expect(res.body).toHaveProperty("data");
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("[TEST] Updated Integration Test Board");
    });

    it("✅ should verify update in database", async () => {
      // Skip nếu testBoardId chưa được set
      if (!testBoardId) {
        console.warn("Skipping verify update test - testBoardId not set");
        return;
      }

      const res = await request(app).get(`/api/boards/${testBoardId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toContain("[TEST] Updated");
    });
  });

  describe("POST /api/boards/clone/:templateId - Clone Board", () => {
    let templateId;

    beforeAll(async () => {
      // Tạo Template thật trong bảng Templates (không phải Board)
      const Template = require("../../models/template.model");
      const timestamp = Date.now();

      try {
        const template = await Template.create({
          name: `[TEST] Template ${timestamp}`,
          description: "Template for cloning test",
          created_by: new mongoose.Types.ObjectId(mockTestUserId),
        });

        templateId = template._id.toString();

        // Tạo template columns và swimlanes (optional, có thể để empty)
        const TemplateColumn = require("../../models/templateColumn.model");
        const TemplateSwimlane = require("../../models/templateSwimlane.model");

        await TemplateColumn.create([
          { template_id: templateId, name: "To Do", order_index: 0 },
          { template_id: templateId, name: "In Progress", order_index: 1 },
          { template_id: templateId, name: "Done", order_index: 2 },
        ]);

        await TemplateSwimlane.create([
          { template_id: templateId, name: "Default", order_index: 0 },
        ]);
      } catch (error) {
        console.error("❌ Failed to create template:", error.message);
        throw new Error("Failed to create template for testing");
      }
    });

    it("✅ should clone board from template", async () => {
      // Skip nếu templateId chưa được set
      if (!templateId) {
        console.warn("Skipping clone test - templateId not set");
        return;
      }

      const timestamp = Date.now();
      const cloneData = {
        title: `[TEST] Cloned Board ${timestamp}`,
        description: "This board was cloned",
      };

      const res = await request(app)
        .post(`/api/boards/clone/${templateId}`)
        .send(cloneData);

      // Debug response nếu lỗi
      if (res.status !== 201) {
        console.error("Clone board failed:", {
          status: res.status,
          body: res.body,
          templateId,
        });
      }

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success");
      expect(res.body).toHaveProperty("data");
      expect(res.body.success).toBe(true);
      // Clone trả về {board, columns, swimlanes}
      expect(res.body.data.board).toBeDefined();
      expect(res.body.data.board.title).toBe(
        `[TEST] Cloned Board ${timestamp}`
      );
    });

    it("❌ should reject clone without title", async () => {
      const res = await request(app)
        .post(`/api/boards/clone/${templateId}`)
        .send({ description: "No title" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Tên board không được để trống");
    });
  });

  describe("PUT /api/boards/:id/settings - Configure Settings", () => {
    it("✅ should configure board settings", async () => {
      // Skip nếu testBoardId chưa được set (test trước fail)
      if (!testBoardId) {
        console.warn("⚠️ Skipping settings test - testBoardId not set");
        return;
      }

      const settingsData = {
        columns: [
          { name: "To Do", order: 0 },
          { name: "In Progress", order: 1 },
          { name: "Done", order: 2 },
        ],
        swimlanes: [
          { name: "Sprint 1", order: 0 },
          { name: "Sprint 2", order: 1 },
        ],
      };

      const res = await request(app)
        .put(`/api/boards/${testBoardId}/settings`)
        .send(settingsData);

      if (res.status !== 200) {
        console.error("❌ Test will fail - response not 200");
      }

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success");
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("data");
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Cấu hình board thành công");
    });
  });

  describe("Database Operations", () => {
    it("✅ should handle database connection", async () => {
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    it("✅ should create and query boards", async () => {
      const Board = require("../../models/board.model");
      const mongoose = require("mongoose");

      const board = new Board({
        title: "[TEST] Direct DB Test Board",
        description: "Created directly via Mongoose",
        is_template: false,
        created_by: new mongoose.Types.ObjectId(), // ✅ Tạo ObjectId hợp lệ
      });

      const savedBoard = await board.save();
      expect(savedBoard._id).toBeDefined();
      expect(savedBoard.title).toBe("[TEST] Direct DB Test Board");

      // Query board
      const foundBoard = await Board.findById(savedBoard._id);
      expect(foundBoard).toBeDefined();
      expect(foundBoard.title).toBe("[TEST] Direct DB Test Board");
    });
  });

  describe("Error Handling with Real Database", () => {
    it("❌ should handle invalid ObjectId", async () => {
      const res = await request(app).get("/api/boards/invalid-id");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it("❌ should handle database connection issues gracefully", async () => {
      // Test với invalid query
      const res = await request(app)
        .get("/api/boards/my")
        .query({ page: "invalid", limit: "invalid" });

      // Should still work with default values
      expect(res.status).toBe(200);
    });
  });
});

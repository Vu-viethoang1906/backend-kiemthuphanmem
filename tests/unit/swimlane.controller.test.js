// 📄 tests/unit/swimlane.controller.test.js - Swimlane Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", _id: "user123", roles: ["admin", "System_Manager"] };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock swimlane service
jest.mock("../../services/swimlane.service", () => ({
  createSwimlane: jest.fn(),
  getSwimlane: jest.fn(),
  getSwimlanesByBoard: jest.fn(),
  updateSwimlane: jest.fn(),
  deleteSwimlane: jest.fn(),
  toggleCollapse: jest.fn(),
  reorderSwimlanes: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const swimlaneRouter = require("../../router/swimlane.routes");

const app = express();
app.use(express.json());
app.use("/api/swimlanes", swimlaneRouter);

describe("🔹 Swimlane Controller Unit Tests", () => {
  const swimlaneService = require("../../services/swimlane.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/swimlanes - Create Swimlane", () => {
    it("✅ should create swimlane successfully", async () => {
      const mockSwimlane = {
        _id: "swimlane123",
        board_id: "board123",
        name: "New Swimlane",
        order: 1,
      };

      swimlaneService.createSwimlane.mockResolvedValue(mockSwimlane);

      const swimlaneData = {
        board_id: "board123",
        name: "New Swimlane",
        order: 1,
      };

      const res = await request(app)
        .post("/api/swimlanes")
        .send(swimlaneData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "swimlane123");
      expect(swimlaneService.createSwimlane).toHaveBeenCalledWith({
        board_id: "board123",
        name: "New Swimlane",
        order: 1,
        userId: "user123",
      });
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      // Test controller directly
      const swimlaneController = require("../../controllers/swimlane.controller");
      const mockReq = {
        user: undefined,
        body: { board_id: "board123", name: "Swimlane" },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await swimlaneController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Không có quyền truy cập",
      });
    });
  });

  describe("GET /api/swimlanes/:id - Get One Swimlane", () => {
    it("✅ should return swimlane by id", async () => {
      const mockSwimlane = {
        _id: "swimlane123",
        name: "Swimlane 1",
        board_id: "board123",
      };

      swimlaneService.getSwimlane.mockResolvedValue(mockSwimlane);

      const res = await request(app).get("/api/swimlanes/swimlane123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "swimlane123");
      expect(swimlaneService.getSwimlane).toHaveBeenCalledWith(
        "swimlane123",
        "user123"
      );
    });

    it("❌ should return 404 when swimlane not found", async () => {
      swimlaneService.getSwimlane.mockResolvedValue(null);

      const res = await request(app).get("/api/swimlanes/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Swimlane không tồn tại");
    });
  });

  describe("GET /api/swimlanes/board/:boardId - Get By Board", () => {
    it("✅ should return swimlanes by board", async () => {
      const mockSwimlanes = [
        { _id: "swim1", board_id: "board123", name: "Swimlane 1" },
        { _id: "swim2", board_id: "board123", name: "Swimlane 2" },
      ];

      swimlaneService.getSwimlanesByBoard.mockResolvedValue(mockSwimlanes);

      const res = await request(app).get("/api/swimlanes/board/board123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(swimlaneService.getSwimlanesByBoard).toHaveBeenCalledWith(
        "board123",
        "user123",
        ["admin", "System_Manager"]
      );
    });
  });

  describe("PUT /api/swimlanes/:id - Update Swimlane", () => {
    it("✅ should update swimlane successfully", async () => {
      const mockUpdated = {
        _id: "swimlane123",
        name: "Updated Swimlane",
      };

      swimlaneService.updateSwimlane.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put("/api/swimlanes/swimlane123")
        .send({ name: "Updated Swimlane" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("name", "Updated Swimlane");
      expect(swimlaneService.updateSwimlane).toHaveBeenCalledWith(
        "swimlane123",
        { name: "Updated Swimlane" },
        "user123"
      );
    });

    it("❌ should return 404 when swimlane not found", async () => {
      swimlaneService.updateSwimlane.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/swimlanes/nonexistent")
        .send({ name: "Updated" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/swimlanes/:id - Delete Swimlane", () => {
    it("✅ should delete swimlane successfully", async () => {
      swimlaneService.deleteSwimlane.mockResolvedValue(true);

      const res = await request(app).delete("/api/swimlanes/swimlane123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Xóa swimlane thành công");
      expect(swimlaneService.deleteSwimlane).toHaveBeenCalledWith(
        "swimlane123",
        "user123"
      );
    });

    it("❌ should return 404 when swimlane not found", async () => {
      swimlaneService.deleteSwimlane.mockResolvedValue(null);

      const res = await request(app).delete("/api/swimlanes/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("PUT /api/swimlanes/:id/toggle-collapse - Toggle Collapse", () => {
    it("✅ should toggle collapse successfully", async () => {
      const mockSwimlane = {
        _id: "swimlane123",
        collapsed: true,
      };

      swimlaneService.toggleCollapse.mockResolvedValue(mockSwimlane);

      const res = await request(app)
        .put("/api/swimlanes/swimlane123/toggle-collapse")
        .send({ collapsed: true });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Swimlane đã được thu gọn");
      expect(res.body.data).toHaveProperty("collapsed", true);
      expect(swimlaneService.toggleCollapse).toHaveBeenCalledWith(
        "swimlane123",
        true,
        "user123"
      );
    });

    it("❌ should return 400 when collapsed is not boolean", async () => {
      const res = await request(app)
        .put("/api/swimlanes/swimlane123/toggle-collapse")
        .send({ collapsed: "true" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "collapsed phải là boolean (true/false)"
      );
    });

    it("❌ should return 404 when swimlane not found", async () => {
      swimlaneService.toggleCollapse.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/swimlanes/nonexistent/toggle-collapse")
        .send({ collapsed: true });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("PUT /api/swimlanes/board/:boardId/reorder - Reorder Swimlanes", () => {
    it("✅ should reorder swimlanes successfully", async () => {
      const mockResult = [
        { _id: "swim1", order: 0 },
        { _id: "swim2", order: 1 },
        { _id: "swim3", order: 2 },
      ];

      swimlaneService.reorderSwimlanes.mockResolvedValue(mockResult);

      const res = await request(app)
        .put("/api/swimlanes/board/board123/reorder")
        .send({ ids: ["swim1", "swim2", "swim3"] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Sắp xếp lại Swimlanes thành công");
      expect(res.body.data).toHaveLength(3);
      expect(swimlaneService.reorderSwimlanes).toHaveBeenCalledWith(
        "board123",
        ["swim1", "swim2", "swim3"],
        "user123"
      );
    });

    it("❌ should return 400 when ids is not an array", async () => {
      const res = await request(app)
        .put("/api/swimlanes/board/board123/reorder")
        .send({ ids: "not-an-array" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Dữ liệu gửi lên phải có dạng { ids: [array các swimlaneId] }"
      );
    });
  });
});


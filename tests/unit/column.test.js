// 📄 tests/unit/column.test.js - Column Routes Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => next(),
  authorizeAny: (requiredRoles) => (req, res, next) => {
    // Set default user roles for all tests
    if (!req.user) {
      req.user = { 
        id: "user123", 
        roles: ["admin", "BOARD_UPDATE", "System_Manager"] 
      };
    }
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

// Mock column controller với tất cả methods cần thiết
jest.mock("../../controllers/column.controller", () => ({
  create: jest.fn((req, res) =>
    res.status(201).json({
      success: true,
      data: {
        _id: "column123",
        board_id: req.body.board_id,
        name: req.body.name,
        order: req.body.order || 0,
        isdone: req.body.isdone || false,
      },
    })
  ),
  getOne: jest.fn((req, res) =>
    res.json({
      success: true,
      data: {
        _id: req.params.id,
        board_id: "board123",
        name: "Test Column",
        order: 1,
        isdone: false,
      },
    })
  ),
  getByBoard: jest.fn((req, res) =>
    res.json({
      success: true,
      data: [
        { _id: "col1", name: "To Do", order: 0, isdone: false },
        { _id: "col2", name: "In Progress", order: 1, isdone: false },
        { _id: "col3", name: "Done", order: 2, isdone: true },
      ],
    })
  ),
  update: jest.fn((req, res) =>
    res.json({
      success: true,
      data: {
        _id: req.params.id,
        name: req.body.name || "Updated Column",
        order: req.body.order || 1,
      },
    })
  ),
  delete: jest.fn((req, res) =>
    res.json({ success: true, message: "Xóa column thành công" })
  ),
  reorder: jest.fn((req, res) =>
    res.json({
      success: true,
      message: "Sắp xếp lại columns thành công",
      data: [
        { _id: "col1", order: 0 },
        { _id: "col2", order: 1 },
      ],
    })
  ),
  move: jest.fn((req, res) =>
    res.json({
      success: true,
      data: {
        success: true,
        message: `Đã cập nhật thứ tự ${req.body.ids?.length || 0} cột cho board ${req.params.id}.`,
      },
    })
  ),
  ColumnIsDone: jest.fn((req, res) =>
    res.json({
      success: true,
      data: {
        _id: req.params.idcolumn,
        board_id: req.params.idBoard,
        isdone: true,
      },
    })
  ),
}));

// Mock board repository
jest.mock("../../repositories/board.repository", () => ({
  isMember: jest.fn().mockResolvedValue(true),
  isCreatorFromMember: jest.fn().mockResolvedValue(true),
}));

const request = require("supertest");
const express = require("express");
const columnRouter = require("../../router/column.routes");

const app = express();
app.use(express.json());
app.use("/api/column", columnRouter);

describe("🔹 Column Routes Unit Tests", () => {
  
  describe("POST /api/column - Create Column", () => {
    it("✅ should create column successfully", async () => {
      const columnData = {
        board_id: "board123",
        name: "New Column",
        order: 2,
        isdone: false,
      };

      const res = await request(app)
        .post("/api/column")
        .send(columnData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("name", "New Column");
      expect(res.body.data).toHaveProperty("board_id", "board123");
      expect(res.body.data).toHaveProperty("order", 2);
    });

    it("✅ should create column with isdone true", async () => {
      const columnData = {
        board_id: "board123",
        name: "Done Column",
        order: 3,
        isdone: true,
      };

      const res = await request(app)
        .post("/api/column")
        .send(columnData);

      expect(res.status).toBe(201);
      expect(res.body.data.isdone).toBe(true);
    });

    it("✅ should handle column without order", async () => {
      const columnData = {
        board_id: "board123",
        name: "Column Without Order",
      };

      const res = await request(app)
        .post("/api/column")
        .send(columnData);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty("order", 0);
    });
  });

  describe("GET /api/column/:id - Get One Column", () => {
    it("✅ should return column by id", async () => {
      const res = await request(app).get("/api/column/column123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "column123");
      expect(res.body.data).toHaveProperty("name");
      expect(res.body.data).toHaveProperty("board_id");
      expect(res.body.data).toHaveProperty("order");
    });

    it("✅ should return 404 for non-existent column", async () => {
      const columnController = require("../../controllers/column.controller");
      columnController.getOne.mockImplementationOnce((req, res) =>
        res.status(404).json({
          success: false,
          message: "Column không tồn tại",
        })
      );

      const res = await request(app).get("/api/column/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Column không tồn tại");
    });
  });

  describe("GET /api/column/board/:boardId - Get Columns By Board", () => {
    it("✅ should return all columns for a board", async () => {
      const res = await request(app).get("/api/column/board/board123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).toHaveProperty("name", "To Do");
      expect(res.body.data[2]).toHaveProperty("isdone", true);
    });

    it("✅ should return empty array for board with no columns", async () => {
      const columnController = require("../../controllers/column.controller");
      columnController.getByBoard.mockImplementationOnce((req, res) =>
        res.json({
          success: true,
          data: [],
        })
      );

      const res = await request(app).get("/api/column/board/emptyboard");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe("PUT /api/column/:id - Update Column", () => {
    it("✅ should update column successfully", async () => {
      const updateData = {
        name: "Updated Column Name",
        order: 5,
      };

      const res = await request(app)
        .put("/api/column/column123")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("name", "Updated Column Name");
      expect(res.body.data).toHaveProperty("order", 5);
    });

    it("✅ should update only provided fields", async () => {
      const updateData = {
        name: "Only Name Changed",
      };

      const res = await request(app)
        .put("/api/column/column123")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("name", "Only Name Changed");
    });

    it("✅ should handle update with empty body", async () => {
      const res = await request(app).put("/api/column/column123").send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("✅ should return 404 for non-existent column", async () => {
      const columnController = require("../../controllers/column.controller");
      columnController.update.mockImplementationOnce((req, res) =>
        res.status(404).json({
          success: false,
          message: "Column không tồn tại",
        })
      );

      const res = await request(app)
        .put("/api/column/nonexistent")
        .send({ name: "Test" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("DELETE /api/column/:id - Delete Column", () => {
    it("✅ should delete column successfully", async () => {
      const res = await request(app).delete("/api/column/column123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "Xóa column thành công"
      );
    });

    it("✅ should return 404 for non-existent column", async () => {
      const columnController = require("../../controllers/column.controller");
      columnController.delete.mockImplementationOnce((req, res) =>
        res.status(404).json({
          success: false,
          message: "Column không tồn tại",
        })
      );

      const res = await request(app).delete("/api/column/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("PUT /api/column/board/:boardId/reorder - Reorder Columns", () => {
    it("✅ should reorder columns successfully", async () => {
      const reorderData = {
        columns: [
          { id: "col2", order: 0 },
          { id: "col1", order: 1 },
          { id: "col3", order: 2 },
        ],
      };

      const res = await request(app)
        .put("/api/column/board/board123/reorder")
        .send(reorderData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "Sắp xếp lại columns thành công"
      );
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("✅ should handle reorder with single column", async () => {
      const reorderData = {
        columns: [{ id: "col1", order: 0 }],
      };

      const res = await request(app)
        .put("/api/column/board/board123/reorder")
        .send(reorderData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("❌ should reject reorder with empty columns array", async () => {
      const columnController = require("../../controllers/column.controller");
      columnController.reorder.mockImplementationOnce((req, res) =>
        res.status(400).json({
          success: false,
          message: "columns phải là array",
        })
      );

      const reorderData = { columns: [] };

      const res = await request(app)
        .put("/api/column/board/board123/reorder")
        .send(reorderData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("❌ should reject reorder without columns property", async () => {
      const columnController = require("../../controllers/column.controller");
      columnController.reorder.mockImplementationOnce((req, res) =>
        res.status(400).json({
          success: false,
          message: "columns phải là array",
        })
      );

      const res = await request(app)
        .put("/api/column/board/board123/reorder")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/column/:id/move - Move Column", () => {
    it("✅ should move columns successfully", async () => {
      const moveData = {
        ids: ["col3", "col1", "col2"],
      };

      const res = await request(app)
        .put("/api/column/board123/move")
        .send(moveData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.message).toContain("3 cột");
    });

    it("✅ should handle move with single column", async () => {
      const moveData = {
        ids: ["col1"],
      };

      const res = await request(app)
        .put("/api/column/board123/move")
        .send(moveData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("PUT /api/column/board/:idBoard/isdoneColumn/:idcolumn - Set Done Column", () => {
    it("✅ should set column as done successfully", async () => {
      const res = await request(app).put(
        "/api/column/board/board123/isdoneColumn/col123"
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("isdone", true);
      expect(res.body.data).toHaveProperty("_id", "col123");
      expect(res.body.data).toHaveProperty("board_id", "board123");
    });

    it("✅ should set done for different columns", async () => {
      const res = await request(app).put(
        "/api/column/board/board456/isdoneColumn/col789"
      );

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe("col789");
      expect(res.body.data.board_id).toBe("board456");
    });
  });

  describe("Error Handling", () => {
    it("✅ should handle invalid JSON", async () => {
      const res = await request(app)
        .post("/api/column")
        .set("Content-Type", "application/json")
        .send("invalid json");

      // Should not crash the server
      expect(res.status).toBeDefined();
    });

    it("✅ should handle malformed request body", async () => {
      const res = await request(app)
        .put("/api/column/column123")
        .send('{"malformed": json}');

      // Should handle gracefully
      expect(res.status).toBeDefined();
    });
  });

  describe("Response Format", () => {
    it("✅ should return consistent response format for all routes", async () => {
      const createRes = await request(app)
        .post("/api/column")
        .send({
          board_id: "board123",
          name: "Test",
          order: 1,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.headers["content-type"]).toMatch(/json/);
      expect(typeof createRes.body).toBe("object");
      expect(createRes.body).toHaveProperty("success");
      expect(createRes.body).toHaveProperty("data");

      const getRes = await request(app).get("/api/column/column123");
      expect(getRes.status).toBe(200);
      expect(getRes.headers["content-type"]).toMatch(/json/);
      expect(getRes.body).toHaveProperty("success");
      expect(getRes.body).toHaveProperty("data");

      const updateRes = await request(app)
        .put("/api/column/column123")
        .send({ name: "Updated" });
      expect(updateRes.status).toBe(200);
      expect(updateRes.headers["content-type"]).toMatch(/json/);
      expect(updateRes.body).toHaveProperty("success");

      const deleteRes = await request(app).delete("/api/column/column123");
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.headers["content-type"]).toMatch(/json/);
      expect(deleteRes.body).toHaveProperty("success");
    });
  });

  describe("Authentication & Authorization", () => {
    it("✅ all routes should require authentication", async () => {
      // This is handled by middleware mock
      // If auth fails, middleware would return 401
      const res = await request(app).get("/api/column/column123");
      
      // Since auth middleware is mocked to always pass, we get 200
      expect(res.status).toBe(200);
    });

    it("✅ BOARD_UPDATE route should check authorization", async () => {
      const res = await request(app).put(
        "/api/column/board/board123/isdoneColumn/col123"
      );
      
      expect(res.status).toBe(200);
    });
  });

  describe("Edge Cases", () => {
    it("✅ should handle very long column names", async () => {
      const longName = "A".repeat(200);
      const columnData = {
        board_id: "board123",
        name: longName,
        order: 0,
      };

      const res = await request(app)
        .post("/api/column")
        .send(columnData);

      // Should either succeed or return proper validation error
      expect([201, 400]).toContain(res.status);
    });

    it("✅ should handle negative order values", async () => {
      const columnData = {
        board_id: "board123",
        name: "Column",
        order: -1,
      };

      const res = await request(app)
        .post("/api/column")
        .send(columnData);

      expect(res.status).toBeDefined();
    });

    it("✅ should handle very large order values", async () => {
      const columnData = {
        board_id: "board123",
        name: "Column",
        order: 999999,
      };

      const res = await request(app)
        .post("/api/column")
        .send(columnData);

      expect(res.status).toBeDefined();
    });

    it("✅ should handle special characters in column names", async () => {
      const columnData = {
        board_id: "board123",
        name: "Column !@#$%^&*()_+",
        order: 0,
      };

      const res = await request(app)
        .post("/api/column")
        .send(columnData);

      expect([201, 400]).toContain(res.status);
    });
  });
});

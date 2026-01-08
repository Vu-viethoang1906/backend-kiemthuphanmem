// 📄 tests/unit/templateColumn.controller.test.js - Template Column Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", _id: "user123" };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock template column service
jest.mock("../../services/templateColumn.service", () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByTemplate: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const templateColumnRouter = require("../../router/templateColumn.router");

const app = express();
app.use(express.json());
app.use("/api/templateColumns", templateColumnRouter);

describe("🔹 Template Column Controller Unit Tests", () => {
  const templateColumnService = require("../../services/templateColumn.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/templateColumns - Get All", () => {
    it("✅ should return all template columns", async () => {
      const mockColumns = [
        { _id: "col1", name: "Column 1", template_id: "template1" },
        { _id: "col2", name: "Column 2", template_id: "template1" },
      ];

      templateColumnService.findAll.mockResolvedValue(mockColumns);

      const res = await request(app).get("/api/templateColumns");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(templateColumnService.findAll).toHaveBeenCalled();
    });

    it("❌ should return 400 for service error", async () => {
      templateColumnService.findAll.mockRejectedValue(
        new Error("Database error")
      );

      const res = await request(app).get("/api/templateColumns");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("POST /api/templateColumns - Create", () => {
    it("✅ should create template column successfully", async () => {
      const mockColumn = {
        _id: "col123",
        name: "New Column",
        template_id: "template123",
        order: 1,
      };

      templateColumnService.create.mockResolvedValue(mockColumn);

      const columnData = {
        template_id: "template123",
        name: "New Column",
        order: 1,
      };

      const res = await request(app)
        .post("/api/templateColumns")
        .send(columnData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "col123");
      expect(templateColumnService.create).toHaveBeenCalledWith(
        "template123",
        columnData,
        { id: "user123", _id: "user123" }
      );
    });

    it("❌ should return 400 for invalid data", async () => {
      templateColumnService.create.mockRejectedValue(
        new Error("template_id is required")
      );

      const res = await request(app)
        .post("/api/templateColumns")
        .send({ name: "Column" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("GET /api/templateColumns/:id - Get By ID", () => {
    it("✅ should return template column by id", async () => {
      const mockColumn = {
        _id: "col123",
        name: "Column 1",
        template_id: "template123",
      };

      templateColumnService.findById.mockResolvedValue(mockColumn);

      const res = await request(app).get("/api/templateColumns/col123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "col123");
      expect(templateColumnService.findById).toHaveBeenCalledWith("col123");
    });

    it("❌ should return 404 for non-existent column", async () => {
      templateColumnService.findById.mockRejectedValue(
        new Error("Column not found")
      );

      const res = await request(app).get("/api/templateColumns/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("GET /api/templateColumns/template/:templateId - Get By Template", () => {
    it("✅ should return columns by template id", async () => {
      const mockColumns = [
        { _id: "col1", template_id: "template123" },
        { _id: "col2", template_id: "template123" },
      ];

      templateColumnService.findByTemplate.mockResolvedValue(mockColumns);

      const res = await request(app).get(
        "/api/templateColumns/template/template123"
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(templateColumnService.findByTemplate).toHaveBeenCalledWith(
        "template123"
      );
    });
  });

  describe("PUT /api/templateColumns/:id - Update", () => {
    it("✅ should update template column successfully", async () => {
      const mockUpdated = {
        _id: "col123",
        name: "Updated Column",
      };

      templateColumnService.update.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put("/api/templateColumns/col123")
        .send({ name: "Updated Column" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("name", "Updated Column");
      expect(templateColumnService.update).toHaveBeenCalledWith(
        "col123",
        { name: "Updated Column" },
        { id: "user123", _id: "user123" }
      );
    });
  });

  describe("DELETE /api/templateColumns/:id - Delete", () => {
    it("✅ should delete template column successfully", async () => {
      templateColumnService.remove.mockResolvedValue(true);

      const res = await request(app).delete("/api/templateColumns/col123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "Xóa TemplateColumn thành công"
      );
      expect(templateColumnService.remove).toHaveBeenCalledWith(
        "col123",
        { id: "user123", _id: "user123" }
      );
    });

    it("❌ should return 400 for service error", async () => {
      templateColumnService.remove.mockRejectedValue(
        new Error("Column not found")
      );

      const res = await request(app).delete("/api/templateColumns/nonexistent");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });
});


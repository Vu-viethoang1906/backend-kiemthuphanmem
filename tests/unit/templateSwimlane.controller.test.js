// 📄 tests/unit/templateSwimlane.controller.test.js - Template Swimlane Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", _id: "user123", roles: ["TEMPLATE_CREATE", "TEMPLATE_VIEW", "TEMPLATE_UPDATE"] };
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

// Mock template swimlane service
jest.mock("../../services/templateSwimlane.service", () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByTemplate: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const templateSwimlaneRouter = require("../../router/templateSwimlane.router");

const app = express();
app.use(express.json());
app.use("/api/templateSwimlanes", templateSwimlaneRouter);

describe("🔹 Template Swimlane Controller Unit Tests", () => {
  const templateSwimlaneService = require("../../services/templateSwimlane.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/templateSwimlanes - Get All", () => {
    it("✅ should return all template swimlanes", async () => {
      const mockSwimlanes = [
        { _id: "swim1", name: "Swimlane 1", template_id: "template1" },
        { _id: "swim2", name: "Swimlane 2", template_id: "template1" },
      ];

      templateSwimlaneService.findAll.mockResolvedValue(mockSwimlanes);

      const res = await request(app).get("/api/templateSwimlanes");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(templateSwimlaneService.findAll).toHaveBeenCalled();
    });
  });

  describe("POST /api/templateSwimlanes - Create", () => {
    it("✅ should create template swimlane successfully", async () => {
      const mockSwimlane = {
        _id: "swim123",
        name: "New Swimlane",
        template_id: "template123",
      };

      templateSwimlaneService.create.mockResolvedValue(mockSwimlane);

      const swimlaneData = {
        template_id: "template123",
        name: "New Swimlane",
      };

      const res = await request(app)
        .post("/api/templateSwimlanes")
        .send(swimlaneData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "swim123");
      expect(templateSwimlaneService.create).toHaveBeenCalledWith(
        "template123",
        swimlaneData,
        { id: "user123", _id: "user123", roles: expect.any(Array) }
      );
    });
  });

  describe("GET /api/templateSwimlanes/:id - Get By ID", () => {
    it("✅ should return template swimlane by id", async () => {
      const mockSwimlane = {
        _id: "swim123",
        name: "Swimlane 1",
        template_id: "template123",
      };

      templateSwimlaneService.findById.mockResolvedValue(mockSwimlane);

      const res = await request(app).get("/api/templateSwimlanes/swim123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "swim123");
    });
  });

  describe("GET /api/templateSwimlanes/template/:templateId - Get By Template", () => {
    it("✅ should return swimlanes by template id", async () => {
      const mockSwimlanes = [
        { _id: "swim1", template_id: "template123" },
      ];

      templateSwimlaneService.findByTemplate.mockResolvedValue(mockSwimlanes);

      const res = await request(app).get(
        "/api/templateSwimlanes/template/template123"
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("PUT /api/templateSwimlanes/:id - Update", () => {
    it("✅ should update template swimlane successfully", async () => {
      const mockUpdated = {
        _id: "swim123",
        name: "Updated Swimlane",
      };

      templateSwimlaneService.update.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put("/api/templateSwimlanes/swim123")
        .send({ name: "Updated Swimlane" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("name", "Updated Swimlane");
    });
  });

  describe("DELETE /api/templateSwimlanes/:id - Delete", () => {
    it("✅ should delete template swimlane successfully", async () => {
      templateSwimlaneService.remove.mockResolvedValue(true);

      const res = await request(app).delete("/api/templateSwimlanes/swim123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "Xóa TemplateSwimlane thành công"
      );
    });
  });
});


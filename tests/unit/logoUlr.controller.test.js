// 📄 tests/unit/logoUlr.controller.test.js - Logo URL Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", roles: ["admin", "System_Manager"] };
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

jest.mock("../../config/multer", () => ({
  uploadLogo: {
    single: jest.fn((fieldName) => (req, res, next) => {
      req.file = {
        filename: "logo-123.jpg",
        originalname: "logo.jpg",
        path: "/uploads/logos/logo-123.jpg",
      };
      next();
    }),
  },
}));

// Mock logo URL service
jest.mock("../../services/logoUlr.service", () => ({
  createLogoUlr: jest.fn(),
  getLogoUlrById: jest.fn(),
  getAllLogoUlrs: jest.fn(),
  getCurrentLogoUlr: jest.fn(),
  updateLogoUlr: jest.fn(),
  deleteLogoUlr: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const logoUlrRouter = require("../../router/logoUlr.router");

const app = express();
app.use(express.json());
app.use("/api/logoUlr", logoUlrRouter);

describe("🔹 Logo URL Controller Unit Tests", () => {
  const logoUlrService = require("../../services/logoUlr.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/logoUlr/current - Get Current Logo (Public)", () => {
    it("✅ should return current active logo", async () => {
      const mockLogo = {
        _id: "logo123",
        url: "/api/uploads/logos/logo.jpg",
        is_active: true,
      };

      logoUlrService.getCurrentLogoUlr.mockResolvedValue(mockLogo);

      const res = await request(app).get("/api/logoUlr/current");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "logo123");
      expect(res.body.data.is_active).toBe(true);
      expect(logoUlrService.getCurrentLogoUlr).toHaveBeenCalled();
    });

    it("✅ should return null when no logo exists", async () => {
      logoUlrService.getCurrentLogoUlr.mockResolvedValue(null);

      const res = await request(app).get("/api/logoUlr/current");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toBeNull();
    });
  });

  describe("POST /api/logoUlr - Create Logo", () => {
    it("✅ should create logo successfully", async () => {
      const mockLogo = {
        _id: "logo123",
        url: "https://example.com/logo.jpg",
        description: "Company Logo",
        is_active: false,
      };

      logoUlrService.createLogoUlr.mockResolvedValue(mockLogo);

      const logoData = {
        url: "https://example.com/logo.jpg",
        description: "Company Logo",
        is_active: false,
      };

      const res = await request(app)
        .post("/api/logoUlr")
        .send(logoData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("url", "https://example.com/logo.jpg");
      expect(logoUlrService.createLogoUlr).toHaveBeenCalledWith({
        url: "https://example.com/logo.jpg",
        description: "Company Logo",
        is_active: false,
      });
    });

    it("❌ should return 400 when url is missing", async () => {
      const res = await request(app)
        .post("/api/logoUlr")
        .send({ description: "Logo" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Trường 'url' là bắt buộc và phải là chuỗi"
      );
    });

    it("❌ should return 400 when url is not a string", async () => {
      const res = await request(app)
        .post("/api/logoUlr")
        .send({ url: 123 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("POST /api/logoUlr/upload - Upload And Create Logo", () => {
    it("✅ should upload and create logo successfully", async () => {
      const mockLogo = {
        _id: "logo123",
        url: "/api/uploads/logos/logo-123.jpg",
        is_active: true,
      };

      logoUlrService.createLogoUlr.mockResolvedValue(mockLogo);

      // Test controller directly
      const logoUlrController = require("../../controllers/logoUlr.controller");
      const mockReq = {
        file: {
          filename: "logo-123.jpg",
        },
        body: {
          description: "Uploaded Logo",
          is_active: "true",
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await logoUlrController.uploadAndCreate(mockReq, mockRes);

      expect(mockRes.status).not.toHaveBeenCalled(); // Success doesn't call status
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockLogo,
      });
      expect(logoUlrService.createLogoUlr).toHaveBeenCalledWith({
        url: "/api/uploads/logos/logo-123.jpg",
        description: "Uploaded Logo",
        is_active: true,
      });
    });

    it("❌ should return 400 when file is missing", async () => {
      // Test controller directly
      const logoUlrController = require("../../controllers/logoUlr.controller");
      const mockReq = {
        file: undefined,
        body: { description: "Logo" },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await logoUlrController.uploadAndCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "File logo là bắt buộc",
      });
    });
  });

  describe("GET /api/logoUlr - Get All Logos", () => {
    it("✅ should return all logos", async () => {
      const mockLogos = [
        { _id: "logo1", url: "/logo1.jpg", is_active: true },
        { _id: "logo2", url: "/logo2.jpg", is_active: false },
      ];

      logoUlrService.getAllLogoUlrs.mockResolvedValue(mockLogos);

      const res = await request(app).get("/api/logoUlr");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveLength(2);
      expect(logoUlrService.getAllLogoUlrs).toHaveBeenCalled();
    });
  });

  describe("GET /api/logoUlr/:id - Get Logo By ID", () => {
    it("✅ should return logo by id", async () => {
      const mockLogo = {
        _id: "logo123",
        url: "/api/uploads/logos/logo.jpg",
        is_active: true,
      };

      logoUlrService.getLogoUlrById.mockResolvedValue(mockLogo);

      const res = await request(app).get("/api/logoUlr/logo123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "logo123");
      expect(logoUlrService.getLogoUlrById).toHaveBeenCalledWith("logo123");
    });

    it("❌ should return 404 for non-existent logo", async () => {
      logoUlrService.getLogoUlrById.mockResolvedValue(null);

      const res = await request(app).get("/api/logoUlr/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Logo không tồn tại");
    });
  });

  describe("PUT /api/logoUlr/:id - Update Logo", () => {
    it("✅ should update logo successfully", async () => {
      const mockUpdated = {
        _id: "logo123",
        url: "https://example.com/new-logo.jpg",
        description: "Updated Logo",
        is_active: true,
      };

      logoUlrService.updateLogoUlr.mockResolvedValue(mockUpdated);

      const updateData = {
        url: "https://example.com/new-logo.jpg",
        description: "Updated Logo",
        is_active: true,
      };

      const res = await request(app)
        .put("/api/logoUlr/logo123")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data.url).toBe("https://example.com/new-logo.jpg");
      expect(logoUlrService.updateLogoUlr).toHaveBeenCalledWith("logo123", {
        url: "https://example.com/new-logo.jpg",
        description: "Updated Logo",
        is_active: true,
      });
    });

    it("✅ should update only provided fields", async () => {
      const mockUpdated = {
        _id: "logo123",
        description: "New Description",
      };

      logoUlrService.updateLogoUlr.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put("/api/logoUlr/logo123")
        .send({ description: "New Description" });

      expect(res.status).toBe(200);
      expect(logoUlrService.updateLogoUlr).toHaveBeenCalledWith("logo123", {
        description: "New Description",
      });
    });
  });

  describe("POST /api/logoUlr/:id/activate - Activate Logo", () => {
    it("✅ should activate logo successfully", async () => {
      const mockActivated = {
        _id: "logo123",
        is_active: true,
      };

      logoUlrService.updateLogoUlr.mockResolvedValue(mockActivated);

      const res = await request(app).post("/api/logoUlr/logo123/activate");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã chọn logo làm logo hiện tại");
      expect(logoUlrService.updateLogoUlr).toHaveBeenCalledWith("logo123", {
        is_active: true,
      });
    });
  });

  describe("DELETE /api/logoUlr/:id - Delete Logo", () => {
    it("✅ should delete logo successfully", async () => {
      logoUlrService.deleteLogoUlr.mockResolvedValue(true);

      const res = await request(app).delete("/api/logoUlr/logo123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Xóa logo thành công");
      expect(logoUlrService.deleteLogoUlr).toHaveBeenCalledWith("logo123");
    });

    it("❌ should return 400 for service error", async () => {
      logoUlrService.deleteLogoUlr.mockRejectedValue(
        new Error("Logo không tồn tại")
      );

      const res = await request(app).delete("/api/logoUlr/nonexistent");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });
});


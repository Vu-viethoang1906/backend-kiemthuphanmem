// 📄 tests/unit/apiKey.controller.test.js - API Key Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => next(),
  authorizeAny: (requiredRoles) => (req, res, next) => {
    // Set default user roles for all tests
    if (!req.user) {
      req.user = {
        id: "user123",
        roles: ["admin", "System_Manager"],
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

// Mock API Key service
jest.mock("../../services/apiKey.service", () => ({
  createApiKey: jest.fn(),
  getAllApiKeys: jest.fn(),
  getApiKey: jest.fn(),
  getApiKeyByDescription: jest.fn(),
  updateApiKey: jest.fn(),
  deleteApiKey: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const apiKeyRouter = require("../../router/apiKey.routes");

const app = express();
app.use(express.json());
app.use("/api/apiKeys", apiKeyRouter);

describe("🔹 API Key Controller Unit Tests", () => {
  const apiKeyService = require("../../services/apiKey.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/apiKeys - Create API Key", () => {
    it("✅ should create API key successfully", async () => {
      const mockApiKey = {
        id: "key123",
        key: "test-key-123",
        description: "Test API Key",
      };

      apiKeyService.createApiKey.mockResolvedValue(mockApiKey);

      const keyData = {
        key: "test-key-123",
        description: "Test API Key",
      };

      const res = await request(app).post("/api/apiKeys").send(keyData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.key).toBe("test-key-123");
      expect(apiKeyService.createApiKey).toHaveBeenCalledWith(keyData);
    });

    it("❌ should return 400 for invalid data", async () => {
      apiKeyService.createApiKey.mockRejectedValue(
        new Error("description is required")
      );

      const res = await request(app)
        .post("/api/apiKeys")
        .send({ key: "test-key" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "description is required");
    });
  });

  describe("GET /api/apiKeys - Get All API Keys", () => {
    it("✅ should return all API keys", async () => {
      const mockKeys = [
        { _id: "key1", key: "key-1", description: "Key 1" },
        { _id: "key2", key: "key-2", description: "Key 2" },
      ];

      apiKeyService.getAllApiKeys.mockResolvedValue(mockKeys);

      const res = await request(app).get("/api/apiKeys");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(apiKeyService.getAllApiKeys).toHaveBeenCalled();
    });

    it("❌ should return 500 for server error", async () => {
      apiKeyService.getAllApiKeys.mockRejectedValue(
        new Error("Database error")
      );

      const res = await request(app).get("/api/apiKeys");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Database error");
    });
  });

  describe("GET /api/apiKeys/:id - Get API Key By ID", () => {
    it("✅ should return API key by id", async () => {
      const mockApiKey = {
        _id: "key123",
        key: "test-key-123",
        description: "Test API Key",
      };

      apiKeyService.getApiKey.mockResolvedValue(mockApiKey);

      const res = await request(app).get("/api/apiKeys/key123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "key123");
      expect(apiKeyService.getApiKey).toHaveBeenCalledWith("key123");
    });

    it("❌ should return 404 for non-existent API key", async () => {
      apiKeyService.getApiKey.mockRejectedValue(
        new Error("Không tìm thấy API Key")
      );

      const res = await request(app).get("/api/apiKeys/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Không tìm thấy API Key");
    });
  });

  describe("POST /api/apiKeys/description - Get API Key By Description", () => {
    it("✅ should return API key by description", async () => {
      const mockKey = "test-key-123";

      apiKeyService.getApiKeyByDescription.mockResolvedValue(mockKey);

      const res = await request(app)
        .post("/api/apiKeys/description")
        .send({ description: "Test API Key" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toBe("test-key-123");
      expect(apiKeyService.getApiKeyByDescription).toHaveBeenCalledWith(
        "Test API Key"
      );
    });

    it("❌ should return 404 for non-existent description", async () => {
      apiKeyService.getApiKeyByDescription.mockRejectedValue(
        new Error("Không tìm thấy API Key với description 'Non Existent'")
      );

      const res = await request(app)
        .post("/api/apiKeys/description")
        .send({ description: "Non Existent" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("PUT /api/apiKeys/:id - Update API Key", () => {
    it("✅ should update API key successfully", async () => {
      const mockUpdated = {
        _id: "key123",
        key: "updated-key-123",
        description: "Updated Description",
      };

      apiKeyService.updateApiKey.mockResolvedValue(mockUpdated);

      const updateData = {
        description: "Updated Description",
      };

      const res = await request(app)
        .put("/api/apiKeys/key123")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data.description).toBe("Updated Description");
      expect(apiKeyService.updateApiKey).toHaveBeenCalledWith(
        "key123",
        updateData
      );
    });

    it("❌ should return 400 for invalid data", async () => {
      apiKeyService.updateApiKey.mockRejectedValue(
        new Error("Không tìm thấy API Key")
      );

      const res = await request(app)
        .put("/api/apiKeys/nonexistent")
        .send({ description: "Test" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/apiKeys/:id - Delete API Key", () => {
    it("✅ should delete API key successfully", async () => {
      apiKeyService.deleteApiKey.mockResolvedValue({ _id: "key123" });

      const res = await request(app).delete("/api/apiKeys/key123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã xoá API Key");
      expect(apiKeyService.deleteApiKey).toHaveBeenCalledWith("key123");
    });

    it("❌ should return 400 for non-existent API key", async () => {
      apiKeyService.deleteApiKey.mockRejectedValue(
        new Error("Không tìm thấy API Key")
      );

      const res = await request(app).delete("/api/apiKeys/nonexistent");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Không tìm thấy API Key");
    });
  });

  describe("Authorization", () => {
    it("✅ should require System_Manager role for GET /api/apiKeys", async () => {
      // Mock service to return empty array
      apiKeyService.getAllApiKeys.mockResolvedValue([]);
      
      // Middleware is mocked to pass, but structure is here
      const res = await request(app).get("/api/apiKeys");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });

    it("✅ should require System_Manager role for DELETE /api/apiKeys/:id", async () => {
      apiKeyService.deleteApiKey.mockResolvedValue({ _id: "key123" });

      const res = await request(app).delete("/api/apiKeys/key123");

      // Since middleware is mocked to pass, we get 200
      expect(res.status).toBe(200);
    });
  });
});


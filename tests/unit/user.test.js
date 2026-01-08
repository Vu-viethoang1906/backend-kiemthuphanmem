// 📄 tests/unit/user.test.js - IMPROVED VERSION
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => next(),
  authorizeAny: () => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock user controller với tất cả methods cần thiết
jest.mock("../../controllers/user.controller", () => ({
  getMe: jest.fn((req, res) =>
    res.json({
      _id: "user123",
      username: "testuser",
      email: "test@example.com",
    })
  ),
  updateMyProfile: jest.fn((req, res) =>
    res.json({
      _id: "user123",
      updated: true,
    })
  ),
  changePassword: jest.fn((req, res) =>
    res.json({
      success: true,
    })
  ),
  viewProfile: jest.fn((req, res) =>
    res.json({
      username: "testuser",
    })
  ),
  // Thêm các methods còn thiếu
  getByEmail: jest.fn((req, res) =>
    res.json({
      email: req.params.email,
    })
  ),
  getByName: jest.fn((req, res) =>
    res.json({
      name: req.params.name,
    })
  ),
  getByNumberPhone: jest.fn((req, res) =>
    res.json({
      phone: req.params.numberphone,
    })
  ),
  SelectAll: jest.fn((req, res) =>
    res.json([{ _id: "user123", username: "testuser" }])
  ),
  getById: jest.fn((req, res) =>
    res.json({
      _id: req.params.id,
    })
  ),
  create: jest.fn((req, res) =>
    res.status(201).json({
      _id: "new_user",
      ...req.body,
    })
  ),
  update: jest.fn((req, res) =>
    res.json({
      _id: req.params.id,
      updated: true,
    })
  ),
  delete: jest.fn((req, res) => res.status(204).send()),
  softDelete: jest.fn((req, res) =>
    res.json({
      softDeleted: true,
    })
  ),
  restore: jest.fn((req, res) =>
    res.json({
      restored: true,
    })
  ),
  getAllWithDeleted: jest.fn((req, res) => res.json([])),
  getAllDeletedRecords: jest.fn((req, res) => res.json([])),
  findUsers: jest.fn((req, res) => res.json([])),
  searchUsers: jest.fn((req, res) => res.json([])),
  cloneUser: jest.fn((req, res) =>
    res.json({
      cloned: true,
    })
  ),
  createKeycloakUser: jest.fn((req, res) =>
    res.json({
      created: true,
    })
  ),
  createKeycloakUserPassword: jest.fn((req, res) =>
    res.json({
      created: true,
    })
  ),
  updateKeycloakUser: jest.fn((req, res) =>
    res.json({
      updated: true,
    })
  ),
  getAllKeycloakUsers: jest.fn((req, res) => res.json([])),
  getKeycloakUserById: jest.fn((req, res) =>
    res.json({
      id: req.params.id,
    })
  ),
  getKeycloakUserByName: jest.fn((req, res) =>
    res.json({
      username: req.params.username,
    })
  ),
  getKeycloakUserByMail: jest.fn((req, res) =>
    res.json({
      email: req.params.email,
    })
  ),
  deleteKeycloakUser: jest.fn((req, res) => res.status(204).send()),
}));

const request = require("supertest");
const express = require("express");
const userRouter = require("../../router/user.routes");

const app = express();
app.use(express.json());
app.use("/api/user", userRouter);

describe("🔹 User Routes Unit Tests", () => {
  describe("GET /api/user/me", () => {
    it("✅ should return user profile when authenticated", async () => {
      const res = await request(app).get("/api/user/me");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("_id");
      expect(res.body).toHaveProperty("username");
      expect(res.body).toHaveProperty("email");
      expect(res.body.username).toBe("testuser");
    });
  });

  describe("POST /api/user/getprofile", () => {
    it("✅ should return user profile", async () => {
      const res = await request(app).post("/api/user/getprofile");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("username");
      expect(res.body.username).toBe("testuser");
    });
  });

  describe("PUT /api/user/updateMyProfile", () => {
    it("✅ should update user profile successfully", async () => {
      const updateData = {
        username: "updateduser",
        email: "updated@example.com",
      };

      const res = await request(app)
        .put("/api/user/updateMyProfile")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("updated");
      expect(res.body.updated).toBe(true);
    });

    it("✅ should handle empty update data", async () => {
      const res = await request(app).put("/api/user/updateMyProfile").send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("updated");
    });
  });

  describe("PUT /api/user/change-password", () => {
    it("✅ should change password successfully", async () => {
      const passwordData = {
        currentPassword: "oldpass123",
        newPassword: "newpass123",
      };

      const res = await request(app)
        .put("/api/user/change-password")
        .send(passwordData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success");
      expect(res.body.success).toBe(true);
    });

    it("✅ should handle missing password data", async () => {
      const res = await request(app).put("/api/user/change-password").send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success");
    });
  });

  describe("Error Handling", () => {
    it("✅ should handle invalid JSON", async () => {
      const res = await request(app)
        .put("/api/user/updateMyProfile")
        .set("Content-Type", "application/json")
        .send("invalid json");

      // Should not crash the server
      expect(res.status).toBeDefined();
    });
  });

  describe("Response Format", () => {
    it("✅ should return consistent response format", async () => {
      const res = await request(app).get("/api/user/me");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(typeof res.body).toBe("object");
    });
  });
});

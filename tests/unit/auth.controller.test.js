// 📄 tests/unit/auth.controller.test.js - Auth Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => next(),
}));

jest.mock("../../services/user.service", () => ({
  validateUser: jest.fn(),
  getUserById: jest.fn(),
  findById: jest.fn(), // Controller uses findById
}));
jest.mock("../../services/userRole.service");
jest.mock("../../services/role.service", () => ({
  getUserRoles: jest.fn(),
}));
jest.mock("../../middlewares/tokenBlacklist", () => ({
  has: jest.fn(),
  add: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const authRouter = require("../../router/auth.routes");

const app = express();
app.use(express.json());
app.use("/api", authRouter());

describe("🔹 Auth Controller Unit Tests", () => {
  let userService, roleService, tokenBlacklist;
  const jwt = require("jsonwebtoken");
  
  beforeEach(() => {
    userService = require("../../services/user.service");
    roleService = require("../../services/role.service");
    tokenBlacklist = require("../../middlewares/tokenBlacklist");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
    process.env.NODE_ENV = "test";
    
    // Re-require services to get fresh mocks
    userService = require("../../services/user.service");
    roleService = require("../../services/role.service");
    tokenBlacklist = require("../../middlewares/tokenBlacklist");
  });

  describe("POST /api/login - Login", () => {
    it("✅ should login successfully with valid credentials", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        username: "testuser",
        full_name: "Test User",
        avatar_url: "avatar.jpg",
        status: "active",
      };

      const mockRoles = ["user", "admin"];

      userService.validateUser.mockResolvedValue(mockUser);
      roleService.getUserRoles.mockResolvedValue(mockRoles);

      const res = await request(app)
        .post("/api/login")
        .send({
          login: "test@example.com",
          password: "password123",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data).toHaveProperty("refreshToken");
      expect(res.body.data).toHaveProperty("user");
      expect(res.body.data.user.email).toBe("test@example.com");
      expect(userService.validateUser).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    it("❌ should return 400 when login or password is missing", async () => {
      const res = await request(app)
        .post("/api/login")
        .send({ login: "test@example.com" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Login và password là bắt buộc");
    });

    it("❌ should return 401 when credentials are invalid", async () => {
      userService.validateUser.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/login")
        .send({
          login: "test@example.com",
          password: "wrongpassword",
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Tài khoản hoặc mật khẩu không đúng");
    });

    it("❌ should return 403 when account is not active", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        status: "inactive",
      };

      userService.validateUser.mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/login")
        .send({
          login: "test@example.com",
          password: "password123",
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Tài khoản bị khóa hoặc chưa kích hoạt");
    });

    it("❌ should return 500 when JWT secrets are missing", async () => {
      delete process.env.JWT_SECRET;

      const res = await request(app)
        .post("/api/login")
        .send({
          login: "test@example.com",
          password: "password123",
        });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Server misconfigured");
    });
  });

  describe("POST /api/logout - Logout", () => {
    it("✅ should logout successfully", async () => {
      tokenBlacklist.has.mockReturnValue(false);
      tokenBlacklist.add.mockImplementation(() => {});

      const res = await request(app)
        .post("/api/logout")
        .set("Authorization", "Bearer test-token")
        .send({ refreshToken: "refresh-token" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đăng xuất thành công. Token đã bị thu hồi.");
      expect(tokenBlacklist.add).toHaveBeenCalledWith("test-token");
      expect(tokenBlacklist.add).toHaveBeenCalledWith("refresh-token");
    });

    it("❌ should return 401 when token is missing", async () => {
      const res = await request(app)
        .post("/api/logout")
        .send({ refreshToken: "refresh-token" });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Token không hợp lệ hoặc không cung cấp");
    });

    it("❌ should return 401 when token is already blacklisted", async () => {
      tokenBlacklist.has.mockReturnValue(true);

      const res = await request(app)
        .post("/api/logout")
        .set("Authorization", "Bearer test-token")
        .send({ refreshToken: "refresh-token" });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Token đã bị thu hồi. Vui lòng đăng nhập lại.");
    });
  });

  describe("POST /api/refresh-token - Refresh Token", () => {
    it("✅ should refresh token successfully", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        username: "testuser",
      };

      const mockRoles = ["user"];

      tokenBlacklist.has.mockReturnValue(false);
      roleService.getUserRoles.mockResolvedValue(mockRoles);
      // Controller uses findById
      userService.findById.mockResolvedValue(mockUser);

      // Mock valid token
      const refreshToken = jwt.sign(
        { userId: "user123", email: "test@example.com" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      const res = await request(app)
        .post("/api/refresh-token")
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data).toHaveProperty("refreshToken");
      expect(res.body.data).toHaveProperty("user");
    });

    it("❌ should return 400 when refreshToken is missing", async () => {
      const res = await request(app)
        .post("/api/refresh-token")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Thiếu refreshToken");
    });

    it("❌ should return 403 when refreshToken is blacklisted", async () => {
      tokenBlacklist.has.mockReturnValue(true);

      const res = await request(app)
        .post("/api/refresh-token")
        .send({ refreshToken: "blacklisted-token" });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Refresh token đã bị thu hồi");
    });

    it("❌ should return 401 when refreshToken is expired", async () => {
      tokenBlacklist.has.mockReturnValue(false);

      // Create expired token
      const expiredToken = jwt.sign(
        { userId: "user123" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "-1h" }
      );

      const res = await request(app)
        .post("/api/refresh-token")
        .send({ refreshToken: expiredToken });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("error", "Refresh token hết hạn");
    });

    it("❌ should return 404 when user not found", async () => {
      tokenBlacklist.has.mockReturnValue(false);
      userService.findById.mockResolvedValue(null);

      const refreshToken = jwt.sign(
        { userId: "nonexistent" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      const res = await request(app)
        .post("/api/refresh-token")
        .send({ refreshToken });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Không tìm thấy người dùng");
    });
  });

  describe("POST /api/keycloak/decode - Verify Keycloak Token", () => {
    it("✅ should decode Keycloak token successfully", async () => {
      const mockToken = "keycloak-token";
      const mockDecoded = {
        payload: {
          sub: "user123",
          email: "test@example.com",
        },
      };

      jwt.decode = jest.fn().mockReturnValue(mockDecoded);

      const res = await request(app)
        .post("/api/keycloak/decode")
        .send({ token: mockToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
    });

    it("❌ should return 400 when token is missing", async () => {
      const res = await request(app)
        .post("/api/keycloak/decode")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Token không được để trống");
    });
  });
});

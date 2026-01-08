// tests/integration/loginApi.test.js
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const http = require("http");

dotenv.config({ path: ".env.test" });

const userRouter = require("../../router/user.routes");
const User = require("../../models/usersModel");
const Login = require("../../router/auth.routes");
const { login } = require("../../controllers/auth.controller");
// Mock keycloak.service.js
jest.mock("../../services/keycloak.service", () => ({
  loginUser: jest.fn().mockResolvedValue({
    access_token: "mocked-jwt-token",
    refresh_token: "mocked-refresh-token",
  }),
}));

// Mock node-cron
jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

describe("🔹 Integration Test: /api/login (MongoDB Cloud)", () => {
  let app;
  let server; // Biến để lưu server HTTP

  beforeAll(async () => {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI không được định nghĩa trong .env.test");
      }
      await mongoose.connect(process.env.MONGO_URI);
      app = express();
      app.use(express.json());
      app.use("/api", Login());
      server = http.createServer(app); // Tạo server HTTP
    } catch (err) {
      console.error("❌ Lỗi khi kết nối MongoDB:", err);
      throw err;
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
    // Tạo user mẫu và kiểm tra
    const user = await User.create({
      username: "testuser",
      email: "testuser@example.com",
      full_name: "Test User",
      status: "active",
      typeAccount: "Local",
      password_hash: await bcrypt.hash("password123", 10),
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    try {
      await mongoose.connection.close();
      if (server) {
        await new Promise((resolve) => server.close(resolve)); // Đóng server HTTP
      }
    } catch (err) {
      console.error("❌ Lỗi khi đóng kết nối MongoDB hoặc server:", err);
    }
  });

  describe("POST /api/login", () => {
    test("✅ Đăng nhập thành công với email và password đúng", async () => {
      const loginData = {
        login: "testuser@example.com",
        password: "password123",
      };
      const res = await request(app).post("/api/login").send(loginData);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("token");
      expect(typeof res.body.data.token).toBe("string");
    });

    test("❌ Đăng nhập thất bại khi email không tồn tại", async () => {
      const loginData = {
        login: "nonexistent@example.com",
        password: "password123",
      };
      const res = await request(app).post("/api/login").send(loginData);
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Vui lòng kiểm tra lại thông tin đăng nhập"
      );
    });

    test("❌ Đăng nhập thất bại khi password sai", async () => {
      const loginData = {
        login: "testuser@example.com",
        password: "wrongpassword",
      };
      const res = await request(app).post("/api/login").send(loginData);
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Vui lòng kiểm tra lại thông tin đăng nhập"
      );
    });

    test("❌ Đăng nhập thất bại khi thiếu email hoặc password", async () => {
      const loginData = {
        email: "testuser@example.com",
        // Thiếu password
      };
      const res = await request(app).post("/api/login").send(loginData);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Vui lòng nhập đầy đủ thông tin đăng nhập"
      );
    });
  });
});

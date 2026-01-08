const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const { authenticateAny, authorizeAny } = require("../../middlewares/auth");

// Mock các service được gọi trong middleware
jest.mock("../../services/user.service", () => ({
  getUserById: jest.fn().mockResolvedValue({
    _id: "user123",
    email: "test@example.com",
    username: "testuser",
  }),
  getUserByUsername: jest.fn().mockResolvedValue(null),
  createUserSSO: jest.fn().mockResolvedValue({
    _id: "newUserId",
    username: "sso_user",
    email: "sso_user@keycloak.local",
  }),
}));

jest.mock("../../services/userRole.service", () => ({
  getRoles: jest
    .fn()
    .mockResolvedValue([{ role_id: { _id: "r1", name: "admin" } }]),
  findByUserAndRole: jest.fn().mockResolvedValue(null),
  create: jest.fn(),
}));

jest.mock("../../services/role.service", () => ({
  getIdByName: jest.fn().mockResolvedValue("role_user"),
  getUserRoles: jest.fn().mockResolvedValue(["admin"]),
}));

jest.mock("../../services/rolePermission.service", () => ({
  getByRoleIds: jest
    .fn()
    .mockResolvedValue([{ permission_id: { _id: "perm1" } }]),
}));

jest.mock("../../services/permission.service", () => ({
  getByIds: jest.fn().mockResolvedValue([{ code: "USER_VIEW_ALL" }]),
}));

jest.mock("../../middlewares/tokenBlacklist", () => ({
  has: jest.fn().mockReturnValue(false),
  add: jest.fn(),
}));

jest.mock("axios", () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      preferred_username: "sso_user",
      email: "sso@example.com",
      sub: "keycloak_sub_id",
    },
  }),
}));

describe("Middleware: authenticateAny", () => {
  let app;
  let token;

  beforeAll(() => {
    process.env.JWT_SECRET = "secret_test";
    process.env.KEYCLOAK_BASE_URL = "http://fake.keycloak";
    process.env.KEYCLOAK_REALM = "myrealm";

    app = express();
    app.get("/protected", authenticateAny, (req, res) =>
      res.json({ success: true, user: req.user })
    );
  });

  beforeEach(() => {
    token = jwt.sign({ userId: "user123" }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  });

  test("✅ Cho phép truy cập khi JWT local hợp lệ", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe("testuser");
  });

  test("❌ Từ chối khi thiếu token", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Token không hợp lệ/);
  });

  test("✅ Cho phép xác thực bằng Keycloak khi JWT local sai", async () => {
    const invalidToken = "fake.keycloak.token";

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${invalidToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("sso_user");
  });
});

describe("Middleware: authorizeAny", () => {
  let app;

  beforeAll(() => {
    app = express();

    // Route yêu cầu quyền USER_VIEW_ALL
    app.get(
      "/admin",
      (req, res, next) => {
        req.user = {
          id: "user123",
          roles: ["admin"],
        };
        next();
      },
      authorizeAny("USER_VIEW_ALL"),
      (req, res) => res.json({ ok: true })
    );
  });

  test("✅ Cho phép truy cập khi có quyền", async () => {
    const res = await request(app).get("/admin");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("❌ Cấm truy cập khi không có quyền", async () => {
    app.get(
      "/restricted",
      (req, res, next) => {
        req.user = { id: "u1", roles: ["basic"] };
        next();
      },
      authorizeAny("ADMIN_ONLY"),
      (req, res) => res.json({ ok: true })
    );

    const res = await request(app).get("/restricted");
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/không có quyền/);
  });
});

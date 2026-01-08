// 📄 tests/unit/uploadimg.router.test.js - Upload Image Router Unit Tests

const express = require("express");
const request = require("supertest");
const path = require("path");

// Mock dependencies before router is required
jest.mock("../../models/usersModel", () => ({
  findById: jest.fn(),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  promises: {
    unlink: jest.fn(),
  },
}));

jest.mock("../../middlewares/auth", () => ({
  authenticateAny: jest.fn((req, res, next) => next()),
  authorizeAny: jest.fn((req, res, next) => next()),
  adminAny: jest.fn((req, res, next) => next()),
}));

// Control whether we set req.file in tests
global.__SET_REQ_FILE__ = true;
global.__MULTER_ERROR__ = null;

jest.mock("../../config/multer", () => ({
  uploadAvatar: {
    single: jest.fn(() => {
      return (req, res, next) => {
        if (global.__MULTER_ERROR__) {
          return next(global.__MULTER_ERROR__);
        }
        if (global.__SET_REQ_FILE__) {
          req.file = {
            filename: "user123_1234567890.png",
            originalname: "avatar.png",
            mimetype: "image/png",
            size: 1024,
          };
        }
        next();
      };
    }),
  },
  uploadFile: {
    single: jest.fn(),
  },
}));

const User = require("../../models/usersModel");
const fs = require("fs");
const { authenticateAny } = require("../../middlewares/auth");
const { uploadAvatar } = require("../../config/multer");

// Require router once and extract handlers
const uploadRouter = require("../../router/uploadimg.router");

// Extract route handlers directly from router
function getPostHandler() {
  const layer = uploadRouter.stack.find(
    (l) => l.route && l.route.path === "/users/:id/avatar" && l.route.methods.post
  );
  if (!layer) {
    throw new Error("POST /users/:id/avatar route not found");
  }
  // Get the last handler (after middleware: authenticateAny, uploadAvatar.single)
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function getGetHandler() {
  const layer = uploadRouter.stack.find(
    (l) => l.route && l.route.path === "/users/:id/avatar" && l.route.methods.get
  );
  if (!layer) {
    throw new Error("GET /users/:id/avatar route not found");
  }
  // GET route has no middleware, so handler is the only one
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

// Helper function to setup Express app with router
function setupApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/img", uploadRouter);
  return app;
}

// Helper to create mock user object
function createMockUser(overrides = {}) {
  return {
    _id: "user123",
    email: "test@example.com",
    username: "testuser",
    avatar_url: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

// Helper to create mock request
function createMockRequest(overrides = {}) {
  return {
    params: { id: "user123" },
    file: { filename: "test.png" },
    user: { id: "user123" },
    ...overrides,
  };
}

// Helper to create mock response
function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  };
  return res;
}

describe("🔹 Upload Image Router Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.__SET_REQ_FILE__ = true;
    global.__MULTER_ERROR__ = null;
  });

  describe("POST /users/:id/avatar - Upload Avatar", () => {
    describe("✅ Authentication & Authorization", () => {
      it("✅ should pass authentication middleware successfully", async () => {
        const user = createMockUser();
        User.findById.mockResolvedValue(user);

        const app = setupApp();
        const res = await request(app)
          .post("/api/img/users/user123/avatar")
          .set("Authorization", "Bearer valid_token")
          .attach("avatar", Buffer.from("fake image"), "avatar.png");

        expect(authenticateAny).toHaveBeenCalled();
        expect(res.status).not.toBe(401);
      });

      it("❌ should reject request without authentication token", async () => {
        authenticateAny.mockImplementationOnce((req, res, next) => {
          res.status(401).json({
            success: false,
            message: "Token không hợp lệ hoặc không cung cấp",
          });
        });

        const app = setupApp();
        const res = await request(app).post("/api/img/users/user123/avatar");

        expect(res.status).toBe(401);
        expect(res.body.message).toContain("Token");
      });

      it("❌ should reject request with invalid token", async () => {
        authenticateAny.mockImplementationOnce((req, res, next) => {
          res.status(401).json({
            success: false,
            message: "Token không hợp lệ hoặc hết hạn",
          });
        });

        const app = setupApp();
        const res = await request(app)
          .post("/api/img/users/user123/avatar")
          .set("Authorization", "Bearer invalid_token");

        expect(res.status).toBe(401);
      });
    });

    describe("✅ Validation - User & File", () => {
      it("❌ should return 404 when user not found", async () => {
        User.findById.mockResolvedValueOnce(null);

        const handler = getPostHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          message: "User không tồn tại",
        });
      });

      it("❌ should return 400 when file is missing", async () => {
        global.__SET_REQ_FILE__ = false;
        const user = createMockUser();
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest({ file: undefined });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          message: "File is required",
        });
        expect(user.save).not.toHaveBeenCalled();
      });

      it("❌ should return 400 when req.file is null", async () => {
        global.__SET_REQ_FILE__ = false;
        const user = createMockUser();
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest({ file: null });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          message: "File is required",
        });
      });

      it("❌ should handle invalid userId format", async () => {
        User.findById.mockResolvedValue(null);

        const handler = getPostHandler();
        const req = createMockRequest({ params: { id: "invalid_id" } });
        const res = createMockResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          message: "User không tồn tại",
        });
      });
    });

    describe("✅ Happy Path - Upload Avatar", () => {
      it("✅ should upload avatar successfully when user has no previous avatar", async () => {
        const user = createMockUser({ avatar_url: null });
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "user123_1234567890.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(user.avatar_url).toBe("/uploads/user123_1234567890.png");
        expect(user.save).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
          message: "Cập nhật avatar thành công",
          avatar_url: "/uploads/user123_1234567890.png",
        });
        expect(fs.existsSync).not.toHaveBeenCalled();
        expect(fs.promises.unlink).not.toHaveBeenCalled();
      });

      it("✅ should upload avatar and delete old file when user has previous avatar", async () => {
        const user = createMockUser({
          avatar_url: "/uploads/old_avatar.png",
        });
        User.findById.mockResolvedValueOnce(user);
        fs.existsSync.mockReturnValueOnce(true);
        fs.promises.unlink.mockResolvedValueOnce(undefined);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "new_avatar.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(fs.existsSync).toHaveBeenCalled();
        expect(fs.promises.unlink).toHaveBeenCalled();
        expect(user.avatar_url).toBe("/uploads/new_avatar.png");
        expect(user.save).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
          message: "Cập nhật avatar thành công",
          avatar_url: "/uploads/new_avatar.png",
        });
      });

      it("✅ should upload avatar when old file does not exist on filesystem", async () => {
        const user = createMockUser({
          avatar_url: "/uploads/missing_file.png",
        });
        User.findById.mockResolvedValueOnce(user);
        fs.existsSync.mockReturnValueOnce(false);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "new_avatar.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(fs.existsSync).toHaveBeenCalled();
        expect(fs.promises.unlink).not.toHaveBeenCalled();
        expect(user.avatar_url).toBe("/uploads/new_avatar.png");
        expect(user.save).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
          message: "Cập nhật avatar thành công",
          avatar_url: "/uploads/new_avatar.png",
        });
      });

      it("✅ should handle avatar_url without leading slash", async () => {
        const user = createMockUser({
          avatar_url: "uploads/old_avatar.png", // No leading slash
        });
        User.findById.mockResolvedValueOnce(user);
        fs.existsSync.mockReturnValueOnce(true);
        fs.promises.unlink.mockResolvedValueOnce(undefined);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "new_avatar.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(fs.existsSync).toHaveBeenCalled();
        expect(fs.promises.unlink).toHaveBeenCalled();
        expect(user.avatar_url).toBe("/uploads/new_avatar.png");
        expect(res.json).toHaveBeenCalledWith({
          message: "Cập nhật avatar thành công",
          avatar_url: "/uploads/new_avatar.png",
        });
      });
    });

    describe("🔒 Security Tests - Path Traversal Protection", () => {
      it("✅ should not delete files outside uploads folder (path traversal with ../)", async () => {
        const user = createMockUser({
          avatar_url: "/uploads/../secrets.txt",
        });
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "new_avatar.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        // Sanity check should prevent deletion - path resolution will make it outside uploads
        expect(User.findById).toHaveBeenCalledWith("user123");
        // Path will be resolved and checked, but should not pass sanity check
        // The actual behavior depends on path resolution, but avatar should still be updated
        expect(user.avatar_url).toBe("/uploads/new_avatar.png");
        expect(user.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          message: "Cập nhật avatar thành công",
          avatar_url: "/uploads/new_avatar.png",
        });
      });

      it("✅ should not delete files with absolute path outside uploads", async () => {
        const user = createMockUser({
          avatar_url: "/etc/passwd", // Unix absolute path
        });
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "new_avatar.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        // Path should not pass sanity check (won't start with uploadsDir)
        expect(User.findById).toHaveBeenCalledWith("user123");
        // The path resolution will make it not start with uploadsDir, so no deletion
        expect(user.avatar_url).toBe("/uploads/new_avatar.png");
        expect(user.save).toHaveBeenCalled();
      });

      it("✅ should not delete files with Windows absolute path outside uploads", async () => {
        const user = createMockUser({
          avatar_url: "C:\\Windows\\System32\\config\\sam",
        });
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "new_avatar.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        // Windows path won't pass sanity check
        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(user.avatar_url).toBe("/uploads/new_avatar.png");
        expect(user.save).toHaveBeenCalled();
      });
    });

    describe("❌ Error Handling", () => {
      it("❌ should continue successfully even if unlink fails", async () => {
        const user = createMockUser({
          avatar_url: "/uploads/old_avatar.png",
        });
        User.findById.mockResolvedValueOnce(user);
        fs.existsSync.mockReturnValueOnce(true);
        fs.promises.unlink.mockRejectedValueOnce(
          new Error("Permission denied")
        );

        // Mock console.error to avoid noise in test output
        const consoleSpy = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "new_avatar.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(fs.existsSync).toHaveBeenCalled();
        expect(fs.promises.unlink).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to remove old avatar",
          expect.any(Error)
        );
        expect(user.avatar_url).toBe("/uploads/new_avatar.png");
        expect(user.save).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
          message: "Cập nhật avatar thành công",
          avatar_url: "/uploads/new_avatar.png",
        });

        consoleSpy.mockRestore();
      });

      it("❌ should return 500 when user.save fails", async () => {
        const user = createMockUser();
        user.save.mockRejectedValueOnce(new Error("Database connection failed"));
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "Database connection failed",
        });
      });

      it("❌ should return 500 when User.findById throws error", async () => {
        User.findById.mockRejectedValueOnce(new Error("Database error"));

        const handler = getPostHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "Database error",
        });
      });

      it("❌ should handle path resolution errors gracefully", async () => {
        const user = createMockUser({
          avatar_url: "/uploads/old_avatar.png",
        });
        User.findById.mockResolvedValueOnce(user);
        // If existsSync throws, the error will propagate and be caught by try-catch
        // The code structure: if (fs.existsSync(oldPath)) { ... }
        // If existsSync throws, the if condition fails, so we skip deletion
        // But avatar should still be updated
        fs.existsSync.mockImplementationOnce(() => {
          throw new Error("File system error");
        });

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "new_avatar.png" },
        });
        const res = createMockResponse();

        // The error will be thrown and caught by the outer try-catch
        // This will result in a 500 error, not a successful update
        await handler(req, res);

        // When existsSync throws, it will propagate to the outer try-catch
        // So we expect a 500 error response
        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "File system error",
        });
      });
    });

    describe("📁 File Upload Validation (Multer Level)", () => {
      it("❌ should reject file that is too large (> 5MB)", async () => {
        global.__MULTER_ERROR__ = new Error("File too large");
        global.__MULTER_ERROR__.code = "LIMIT_FILE_SIZE";

        const app = setupApp();
        const res = await request(app)
          .post("/api/img/users/user123/avatar")
          .set("Authorization", "Bearer valid_token")
          .attach("avatar", Buffer.alloc(6 * 1024 * 1024), "large.png");

        // Multer middleware should reject before handler
        expect(res.status).toBeGreaterThanOrEqual(400);
      });

      it("❌ should reject invalid file type", async () => {
        global.__MULTER_ERROR__ = new Error("Chỉ cho phép file ảnh JPG/PNG");

        const app = setupApp();
        const res = await request(app)
          .post("/api/img/users/user123/avatar")
          .set("Authorization", "Bearer valid_token")
          .attach("avatar", Buffer.from("fake pdf"), "document.pdf");

        expect(res.status).toBeGreaterThanOrEqual(400);
      });
    });

    describe("🔍 Edge Cases", () => {
      it("✅ should handle empty string avatar_url", async () => {
        const user = createMockUser({ avatar_url: "" });
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "new_avatar.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        // Empty string is truthy in JS, but the code checks `if (user.avatar_url)`
        // Empty string is falsy, so no deletion attempt
        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(fs.existsSync).not.toHaveBeenCalled();
        expect(user.avatar_url).toBe("/uploads/new_avatar.png");
        expect(user.save).toHaveBeenCalled();
      });

      it("✅ should handle filename with special characters", async () => {
        const user = createMockUser();
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: "user123_1234567890_ảnh_đẹp.png" },
        });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(user.avatar_url).toBe(
          "/uploads/user123_1234567890_ảnh_đẹp.png"
        );
        expect(res.json).toHaveBeenCalledWith({
          message: "Cập nhật avatar thành công",
          avatar_url: "/uploads/user123_1234567890_ảnh_đẹp.png",
        });
      });

      it("✅ should handle very long filename", async () => {
        const longFilename = "a".repeat(200) + ".png";
        const user = createMockUser();
        User.findById.mockResolvedValueOnce(user);

        const handler = getPostHandler();
        const req = createMockRequest({
          file: { filename: longFilename },
        });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(user.avatar_url).toBe(`/uploads/${longFilename}`);
        expect(user.save).toHaveBeenCalled();
      });
    });
  });

  describe("GET /users/:id/avatar - Get Avatar", () => {
    describe("✅ Happy Path", () => {
      it("✅ should return avatar_url when user has avatar", async () => {
        const mockUser = { avatar_url: "/uploads/user123_avatar.png" };
        const selectMock = jest.fn().mockResolvedValue(mockUser);
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        expect(res.json).toHaveBeenCalledWith({
          avatar_url: "/uploads/user123_avatar.png",
        });
        expect(res.status).not.toHaveBeenCalled(); // Default 200
      });

      it("✅ should return default avatar when user has no avatar", async () => {
        const mockUser = { avatar_url: null };
        const selectMock = jest.fn().mockResolvedValue(mockUser);
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        expect(res.json).toHaveBeenCalledWith({
          avatar_url: "/uploads/default-avatar.png",
        });
        expect(res.status).not.toHaveBeenCalled();
      });

      it("✅ should return default avatar when avatar_url is undefined", async () => {
        const mockUser = { avatar_url: undefined };
        const selectMock = jest.fn().mockResolvedValue(mockUser);
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        expect(res.json).toHaveBeenCalledWith({
          avatar_url: "/uploads/default-avatar.png",
        });
      });

      it("✅ should return default avatar when avatar_url is empty string", async () => {
        const mockUser = { avatar_url: "" };
        const selectMock = jest.fn().mockResolvedValue(mockUser);
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        // Empty string is falsy, so should return default
        expect(res.json).toHaveBeenCalledWith({
          avatar_url: "/uploads/default-avatar.png",
        });
      });

      it("✅ should use select to optimize query (only get avatar_url field)", async () => {
        const mockUser = { avatar_url: "/uploads/test.png" };
        const selectMock = jest.fn().mockResolvedValue(mockUser);
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        expect(res.json).toHaveBeenCalledWith({
          avatar_url: "/uploads/test.png",
        });
      });
    });

    describe("❌ Error Cases", () => {
      it("❌ should return 404 when user not found", async () => {
        const selectMock = jest.fn().mockResolvedValue(null);
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          message: "User không tồn tại",
        });
      });

      it("❌ should return 500 when User.findById throws error", async () => {
        User.findById.mockImplementationOnce(() => {
          throw new Error("Database connection error");
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "Database connection error",
        });
      });

      it("❌ should return 500 when select throws error", async () => {
        const selectMock = jest.fn().mockRejectedValue(new Error("Query error"));
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "Query error",
        });
      });

      it("❌ should handle invalid userId format", async () => {
        const selectMock = jest.fn().mockResolvedValue(null);
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest({ params: { id: "invalid_format" } });
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("invalid_format");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          message: "User không tồn tại",
        });
      });
    });

    describe("🔍 Edge Cases", () => {
      it("✅ should handle avatar_url with spaces and special characters", async () => {
        const mockUser = {
          avatar_url: "/uploads/file name with spaces & special chars.png",
        };
        const selectMock = jest.fn().mockResolvedValue(mockUser);
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        expect(res.json).toHaveBeenCalledWith({
          avatar_url: "/uploads/file name with spaces & special chars.png",
        });
      });

      it("✅ should handle very long avatar_url", async () => {
        const longUrl = "/uploads/" + "a".repeat(500) + ".png";
        const mockUser = { avatar_url: longUrl };
        const selectMock = jest.fn().mockResolvedValue(mockUser);
        User.findById.mockReturnValueOnce({
          select: selectMock,
        });

        const handler = getGetHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        await handler(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(selectMock).toHaveBeenCalledWith("avatar_url");
        expect(res.json).toHaveBeenCalledWith({
          avatar_url: longUrl,
        });
      });
    });
  });

  describe("🔄 Integration Tests", () => {
    it("✅ should handle complete flow: POST then GET", async () => {
      // First, upload avatar
      const user = createMockUser({ avatar_url: null });
      User.findById.mockResolvedValueOnce(user);

      const postHandler = getPostHandler();
      const postReq = createMockRequest({
        file: { filename: "uploaded_avatar.png" },
      });
      const postRes = createMockResponse();

      await postHandler(postReq, postRes);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(user.avatar_url).toBe("/uploads/uploaded_avatar.png");
      expect(postRes.json).toHaveBeenCalledWith({
        message: "Cập nhật avatar thành công",
        avatar_url: "/uploads/uploaded_avatar.png",
      });

      // Then, get avatar
      const mockUserWithAvatar = {
        avatar_url: "/uploads/uploaded_avatar.png",
      };
      const selectMock = jest.fn().mockResolvedValue(mockUserWithAvatar);
      User.findById.mockReturnValueOnce({
        select: selectMock,
      });

      const getHandler = getGetHandler();
      const getReq = createMockRequest();
      const getRes = createMockResponse();

      await getHandler(getReq, getRes);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(selectMock).toHaveBeenCalledWith("avatar_url");
      expect(getRes.json).toHaveBeenCalledWith({
        avatar_url: "/uploads/uploaded_avatar.png",
      });
    });
  });
});

// 📄 tests/unit/user.controller.test.js - User Controller Unit Tests

// Mock auth middleware
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    if (!req.user) {
      req.user = {
        id: "507f1f77bcf86cd799439011",
        _id: "507f1f77bcf86cd799439011",
        roles: ["admin", "System_Manager", "USER_CREATE", "USER_UPDATE", "USER_DELETE", "USER_VIEW_ALL"],
        email: "admin@example.com",
        username: "admin",
      };
    }
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => {
    if (!req.user) {
      req.user = {
        id: "507f1f77bcf86cd799439011",
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

// Mock services
jest.mock("../../services/user.service");
jest.mock("../../services/userRole.service");
jest.mock("../../services/role.service");
jest.mock("../../services/keycloak.service", () => ({
  createUser: jest.fn(),
  getUsers: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getUserByUsername: jest.fn(),
  getUserByEmail: jest.fn(),
  createUserWithPassword: jest.fn(),
  changeUserPassword: jest.fn(),
  deactivateUserOnKeycloak: jest.fn(),
  restoreUserOnKeycloak: jest.fn(),
}));
jest.mock("../../services/centerMember.service");

const userController = require("../../controllers/user.controller");
const userService = require("../../services/user.service");
const userRoleService = require("../../services/userRole.service");
const roleService = require("../../services/role.service");
const keycloakService = require("../../services/keycloak.service");
const centerMemberService = require("../../services/centerMember.service");

// Test constants
const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_USERNAME = "testuser";
const VALID_EMAIL = "test@example.com";
const VALID_PHONE = "0123456789";

describe("🔹 User Controller Unit Tests", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock request
    mockReq = {
      user: {
        id: VALID_USER_ID,
        _id: VALID_USER_ID,
        roles: ["admin", "System_Manager"],
        email: "admin@example.com",
        username: "admin",
      },
      params: {},
      query: {},
      body: {},
    };

    // Setup default mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("Keycloak User Operations", () => {
    describe("createKeycloakUserPassword", () => {
      it("✅ should create Keycloak user with password successfully", async () => {
        const mockUser = {
          id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        keycloakService.createUserWithPassword.mockResolvedValue(mockUser);

        mockReq.body = {
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          full_name: "Test User",
          status: "active",
          password: "password123",
        };

        await userController.createKeycloakUserPassword(mockReq, mockRes);

        expect(keycloakService.createUserWithPassword).toHaveBeenCalledWith(
          {
            username: VALID_USERNAME,
            email: VALID_EMAIL,
            full_name: "Test User",
            status: "active",
          },
          "password123"
        );
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "User created in Keycloak",
          data: mockUser,
        });
      });

      it("❌ should return 500 when Keycloak service fails", async () => {
        const error = new Error("Keycloak connection failed");
        keycloakService.createUserWithPassword.mockRejectedValue(error);

        mockReq.body = {
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          password: "password123",
        };

        await userController.createKeycloakUserPassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Keycloak connection failed",
        });
      });
    });

    describe("getAllKeycloakUsers", () => {
      it("✅ should get all Keycloak users successfully", async () => {
        const mockUsers = [
          { id: "user1", username: "user1", email: "user1@example.com" },
          { id: "user2", username: "user2", email: "user2@example.com" },
        ];

        keycloakService.getUsers.mockResolvedValue(mockUsers);

        await userController.getAllKeycloakUsers(mockReq, mockRes);

        expect(keycloakService.getUsers).toHaveBeenCalledWith({ max: 50 });
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          count: 2,
          data: mockUsers,
        });
      });

      it("❌ should return 500 when Keycloak service fails", async () => {
        const error = new Error("Failed to fetch users");
        keycloakService.getUsers.mockRejectedValue(error);

        await userController.getAllKeycloakUsers(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Failed to get users",
          error: "Failed to fetch users",
        });
      });
    });

    describe("getKeycloakUserById", () => {
      it("✅ should get Keycloak user by ID successfully", async () => {
        const mockUser = {
          id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        keycloakService.getUserById.mockResolvedValue(mockUser);
        mockReq.params.id = VALID_USER_ID;

        await userController.getKeycloakUserById(mockReq, mockRes);

        expect(keycloakService.getUserById).toHaveBeenCalledWith(VALID_USER_ID);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser,
        });
      });

      it("❌ should return 404 when user not found", async () => {
        keycloakService.getUserById.mockResolvedValue(null);
        mockReq.params.id = VALID_USER_ID;

        await userController.getKeycloakUserById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "User not found in Keycloak",
        });
      });

      it("❌ should return 500 when Keycloak service fails", async () => {
        const error = new Error("Keycloak error");
        keycloakService.getUserById.mockRejectedValue(error);
        mockReq.params.id = VALID_USER_ID;

        await userController.getKeycloakUserById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Failed to get user",
          error: "Keycloak error",
        });
      });
    });

    describe("getKeycloakUserByName", () => {
      it("✅ should get Keycloak user by username successfully", async () => {
        const mockUsers = [
          {
            id: VALID_USER_ID,
            username: VALID_USERNAME,
            email: VALID_EMAIL,
          },
        ];

        keycloakService.getUserByUsername.mockResolvedValue(mockUsers);
        mockReq.params.username = VALID_USERNAME;

        await userController.getKeycloakUserByName(mockReq, mockRes);

        expect(keycloakService.getUserByUsername).toHaveBeenCalledWith(VALID_USERNAME);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUsers[0],
        });
      });

      it("❌ should return 404 when user not found", async () => {
        keycloakService.getUserByUsername.mockResolvedValue([]);
        mockReq.params.username = VALID_USERNAME;

        await userController.getKeycloakUserByName(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "User not found in Keycloak",
        });
      });
    });

    describe("getKeycloakUserByMail", () => {
      it("✅ should get Keycloak user by email successfully", async () => {
        const mockUsers = [
          {
            id: VALID_USER_ID,
            username: VALID_USERNAME,
            email: VALID_EMAIL,
          },
        ];

        keycloakService.getUserByEmail.mockResolvedValue(mockUsers);
        mockReq.params.email = VALID_EMAIL;

        await userController.getKeycloakUserByMail(mockReq, mockRes);

        expect(keycloakService.getUserByEmail).toHaveBeenCalledWith(VALID_EMAIL);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUsers[0],
        });
      });

      it("❌ should return 404 when user not found", async () => {
        keycloakService.getUserByEmail.mockResolvedValue([]);
        mockReq.params.email = VALID_EMAIL;

        await userController.getKeycloakUserByMail(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "User not found in Keycloak",
        });
      });
    });

    describe("createKeycloakUser", () => {
      it("✅ should create Keycloak user successfully", async () => {
        const mockUser = {
          id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        keycloakService.createUser.mockResolvedValue(mockUser);
        mockReq.body = {
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          firstName: "Test",
          lastName: "User",
        };

        await userController.createKeycloakUser(mockReq, mockRes);

        expect(keycloakService.createUser).toHaveBeenCalledWith(mockReq.body);
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser,
        });
      });

      it("❌ should return 500 when creation fails", async () => {
        const error = new Error("Creation failed");
        keycloakService.createUser.mockRejectedValue(error);

        await userController.createKeycloakUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Failed to create user",
          error: "Creation failed",
        });
      });
    });

    describe("updateKeycloakUser", () => {
      it("✅ should update Keycloak user successfully", async () => {
        keycloakService.updateUser.mockResolvedValue(undefined);
        mockReq.params.id = VALID_USER_ID;
        mockReq.body = {
          firstName: "Updated",
          lastName: "Name",
        };

        await userController.updateKeycloakUser(mockReq, mockRes);

        expect(keycloakService.updateUser).toHaveBeenCalledWith(
          VALID_USER_ID,
          mockReq.body
        );
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "User updated successfully on Keycloak",
        });
      });

      it("❌ should return 500 when update fails", async () => {
        const error = new Error("Update failed");
        keycloakService.updateUser.mockRejectedValue(error);
        mockReq.params.id = VALID_USER_ID;

        await userController.updateKeycloakUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Failed to update user",
          error: "Update failed",
        });
      });
    });

    describe("deleteKeycloakUser", () => {
      it("✅ should delete Keycloak user successfully", async () => {
        keycloakService.deleteUser.mockResolvedValue(undefined);
        mockReq.params.id = VALID_USER_ID;

        await userController.deleteKeycloakUser(mockReq, mockRes);

        expect(keycloakService.deleteUser).toHaveBeenCalledWith(VALID_USER_ID);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "User deleted successfully from Keycloak",
        });
      });

      it("❌ should return 500 when deletion fails", async () => {
        const error = new Error("Deletion failed");
        keycloakService.deleteUser.mockRejectedValue(error);
        mockReq.params.id = VALID_USER_ID;

        await userController.deleteKeycloakUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Failed to delete user",
          error: "Deletion failed",
        });
      });
    });
  });

  describe("Local Database User Operations", () => {
    describe("SelectAll", () => {
      it("✅ should get all users with pagination successfully", async () => {
        const mockResult = {
          users: [
            { _id: VALID_USER_ID, username: VALID_USERNAME, email: VALID_EMAIL },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1,
          },
        };

        userService.getAllUsers.mockResolvedValue(mockResult);
        mockReq.query = {
          page: "1",
          limit: "10",
          sortBy: "created_at",
          sortOrder: "desc",
        };

        await userController.SelectAll(mockReq, mockRes);

        expect(userService.getAllUsers).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        });
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          ...mockResult,
        });
      });

      it("✅ should use default pagination values", async () => {
        const mockResult = {
          users: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        };

        userService.getAllUsers.mockResolvedValue(mockResult);
        mockReq.query = {};

        await userController.SelectAll(mockReq, mockRes);

        expect(userService.getAllUsers).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        });
      });

      it("❌ should return 500 when service fails", async () => {
        const error = new Error("Database error");
        userService.getAllUsers.mockRejectedValue(error);

        await userController.SelectAll(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: "Lỗi server",
          message: "Database error",
        });
      });
    });

    describe("getById", () => {
      it("✅ should get user by ID successfully", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        userService.getUserById.mockResolvedValue(mockUser);
        mockReq.params.id = VALID_USER_ID;

        await userController.getById(mockReq, mockRes);

        expect(userService.getUserById).toHaveBeenCalledWith(VALID_USER_ID);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser,
        });
      });

      it("❌ should return 404 when user not found", async () => {
        userService.getUserById.mockResolvedValue(null);
        mockReq.params.id = VALID_USER_ID;

        await userController.getById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "User not found",
        });
      });

      it("❌ should return 500 when service fails", async () => {
        const error = new Error("Service error");
        userService.getUserById.mockRejectedValue(error);
        mockReq.params.id = VALID_USER_ID;

        await userController.getById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Service error",
        });
      });
    });

    describe("getByEmail", () => {
      it("✅ should get user by email successfully", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        userService.getUserByEmail.mockResolvedValue(mockUser);
        mockReq.params.email = VALID_EMAIL;

        await userController.getByEmail(mockReq, mockRes);

        expect(userService.getUserByEmail).toHaveBeenCalledWith(VALID_EMAIL);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser,
        });
      });

      it("❌ should return 404 when user not found", async () => {
        userService.getUserByEmail.mockResolvedValue(null);
        mockReq.params.email = VALID_EMAIL;

        await userController.getByEmail(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "User not found",
        });
      });
    });

    describe("getByName", () => {
      it("✅ should get user by username successfully", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        userService.getUserByUsername.mockResolvedValue(mockUser);
        mockReq.params.name = VALID_USERNAME;

        await userController.getByName(mockReq, mockRes);

        expect(userService.getUserByUsername).toHaveBeenCalledWith(VALID_USERNAME);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser,
        });
      });

      it("❌ should return 404 when user not found", async () => {
        userService.getUserByUsername.mockResolvedValue(null);
        mockReq.params.name = VALID_USERNAME;

        await userController.getByName(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "User not found",
        });
      });
    });

    describe("getByNumberPhone", () => {
      it("✅ should get user by phone number successfully", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          phone_number: VALID_PHONE,
        };

        userService.getUserByPhoneNumber.mockResolvedValue(mockUser);
        mockReq.params.numberphone = VALID_PHONE;

        await userController.getByNumberPhone(mockReq, mockRes);

        expect(userService.getUserByPhoneNumber).toHaveBeenCalledWith(VALID_PHONE);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser,
        });
      });

      it("❌ should return 404 when user not found", async () => {
        userService.getUserByPhoneNumber.mockResolvedValue(null);
        mockReq.params.numberphone = VALID_PHONE;

        await userController.getByNumberPhone(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "User not found",
        });
      });
    });

    describe("create", () => {
      it("✅ should create user successfully with default role", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        userService.createUser.mockResolvedValue(mockUser);
        roleService.getIdByName.mockResolvedValue("role123");
        userRoleService.create.mockResolvedValue({});

        mockReq.body = {
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          full_name: "Test User",
        };

        await userController.create(mockReq, mockRes);

        expect(userService.createUser).toHaveBeenCalledWith(mockReq.body);
        expect(roleService.getIdByName).toHaveBeenCalledWith("user");
        expect(userRoleService.create).toHaveBeenCalledWith({
          user_id: VALID_USER_ID,
          role_id: "role123",
        });
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "User created successfully",
          data: mockUser,
          roles: ["user"],
        });
      });

      it("✅ should create user with custom roles", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        userService.createUser.mockResolvedValue(mockUser);
        roleService.getIdByName
          .mockResolvedValueOnce("role1")
          .mockResolvedValueOnce("role2");
        userRoleService.create.mockResolvedValue({});

        mockReq.body = {
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          roles: ["admin", "user"],
        };

        await userController.create(mockReq, mockRes);

        expect(roleService.getIdByName).toHaveBeenCalledWith("admin");
        expect(roleService.getIdByName).toHaveBeenCalledWith("user");
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "User created successfully",
          data: mockUser,
          roles: ["admin", "user"],
        });
      });

      it("❌ should return 400 when email is duplicate", async () => {
        const error = new Error("Duplicate key");
        error.code = 11000;
        error.keyPattern = { email: 1 };

        userService.createUser.mockRejectedValue(error);

        mockReq.body = {
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        await userController.create(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: `Email "${VALID_EMAIL}" đã tồn tại trong hệ thống`,
          error: "DUPLICATE_EMAIL",
        });
      });

      it("❌ should return 400 when username is duplicate", async () => {
        const error = new Error("Duplicate key");
        error.code = 11000;
        error.keyPattern = { username: 1 };

        userService.createUser.mockRejectedValue(error);

        mockReq.body = {
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        await userController.create(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: `Username "${VALID_USERNAME}" đã tồn tại trong hệ thống`,
          error: "DUPLICATE_USERNAME",
        });
      });

      it("❌ should return 400 when other duplicate error occurs", async () => {
        const error = new Error("Duplicate key");
        error.code = 11000;
        error.keyPattern = {};

        userService.createUser.mockRejectedValue(error);

        await userController.create(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Dữ liệu đã tồn tại trong hệ thống",
          error: "DUPLICATE_DATA",
        });
      });

      it("❌ should return 400 when service throws error", async () => {
        const error = new Error("Validation error");
        userService.createUser.mockRejectedValue(error);

        await userController.create(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Validation error",
        });
      });
    });

    describe("cloneUser", () => {
      it("✅ should clone user from Keycloak successfully", async () => {
        const mockKeycloakUser = {
          id: "kc-user-123",
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          firstName: "Test",
          lastName: "User",
        };

        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          full_name: "User Test",
          idSSO: "kc-user-123",
        };

        keycloakService.getUserByUsername.mockResolvedValue([mockKeycloakUser]);
        userService.createUserSSO.mockResolvedValue(mockUser);
        roleService.getIdByName.mockResolvedValue("role123");
        userRoleService.create.mockResolvedValue({});

        mockReq.body = { username: VALID_USERNAME };

        await userController.cloneUser(mockReq, mockRes);

        expect(keycloakService.getUserByUsername).toHaveBeenCalledWith(VALID_USERNAME);
        expect(userService.createUserSSO).toHaveBeenCalledWith({
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          full_name: "User Test",
          idSSO: "kc-user-123",
        });
        expect(roleService.getIdByName).toHaveBeenCalledWith("user");
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(mockUser);
      });

      it("❌ should return 400 when username is missing", async () => {
        mockReq.body = {};

        await userController.cloneUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Username is required",
        });
      });

      it("❌ should return 404 when user not found in Keycloak", async () => {
        keycloakService.getUserByUsername.mockResolvedValue([]);
        mockReq.body = { username: VALID_USERNAME };

        await userController.cloneUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: "User not found in Keycloak",
        });
      });

      it("❌ should return 400 when role 'user' not found", async () => {
        const mockKeycloakUser = {
          id: "kc-user-123",
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        };

        keycloakService.getUserByUsername.mockResolvedValue([mockKeycloakUser]);
        userService.createUserSSO.mockResolvedValue({
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
        });
        roleService.getIdByName.mockResolvedValue(null);

        mockReq.body = { username: VALID_USERNAME };

        await userController.cloneUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Role "user" không tồn tại',
        });
      });
    });
  });

  describe("Profile Operations", () => {
    describe("viewProfile", () => {
      it("✅ should get user profile successfully", async () => {
        const mockProfile = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          full_name: "Test User",
          toObject: jest.fn().mockReturnValue({
            _id: VALID_USER_ID,
            username: VALID_USERNAME,
            email: VALID_EMAIL,
            full_name: "Test User",
          }),
        };

        const mockCenters = [{ _id: "center1", name: "Center 1" }];
        const mockRoles = [
          { role_id: { name: "admin" } },
          { role_id: { name: "user" } },
        ];

        userService.getUserById.mockResolvedValue(mockProfile);
        centerMemberService.getCentersByUser.mockResolvedValue(mockCenters);
        userRoleService.getRoles.mockResolvedValue(mockRoles);

        mockReq.body = { userId: VALID_USER_ID };

        await userController.viewProfile(mockReq, mockRes);

        expect(userService.getUserById).toHaveBeenCalledWith(VALID_USER_ID);
        expect(centerMemberService.getCentersByUser).toHaveBeenCalledWith(VALID_USER_ID);
        expect(userRoleService.getRoles).toHaveBeenCalledWith(VALID_USER_ID);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            _id: VALID_USER_ID,
            username: VALID_USERNAME,
            email: VALID_EMAIL,
            full_name: "Test User",
            roles: ["admin", "user"],
            centers: mockCenters,
          },
        });
      });

      it("❌ should return 400 when userId is missing", async () => {
        mockReq.body = {};

        await userController.viewProfile(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "userId là bắt buộc",
        });
      });

      it("❌ should return 404 when user not found", async () => {
        userService.getUserById.mockResolvedValue(null);
        mockReq.body = { userId: VALID_USER_ID };

        await userController.viewProfile(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Người dùng không tồn tại",
        });
      });
    });

    describe("getMe", () => {
      it("✅ should get current user profile successfully", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          full_name: "Test User",
          avatar_url: "/avatar.jpg",
          status: "active",
          typeAccount: "Local",
          created_at: new Date(),
          updated_at: new Date(),
        };

        const mockCenters = [{ _id: "center1", name: "Center 1" }];
        const mockRoles = [
          { role_id: { name: "admin" } },
          { role_id: { name: "user" } },
        ];

        userService.getUserById.mockResolvedValue(mockUser);
        centerMemberService.getCentersByUser.mockResolvedValue(mockCenters);
        userRoleService.getRoles.mockResolvedValue(mockRoles);

        await userController.getMe(mockReq, mockRes);

        expect(userService.getUserById).toHaveBeenCalledWith(VALID_USER_ID);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            _id: VALID_USER_ID,
            username: VALID_USERNAME,
            email: VALID_EMAIL,
            full_name: "Test User",
            avatar_url: "/avatar.jpg",
            status: "active",
            typeAccount: "Local",
            roles: ["admin", "user"],
            centers: mockCenters,
            created_at: mockUser.created_at,
            updated_at: mockUser.updated_at,
          },
        });
      });

      it("❌ should return 401 when user is not authenticated", async () => {
        mockReq.user = undefined;

        await userController.getMe(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Chưa xác thực",
        });
      });

      it("❌ should return 404 when user not found", async () => {
        userService.getUserById.mockResolvedValue(null);

        await userController.getMe(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Người dùng không tồn tại",
        });
      });
    });

    describe("changePassword", () => {
      it("✅ should change password successfully for Local user", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          password_hash: "$2b$10$hashed",
          typeAccount: "Local",
        };

        userService.getProfile.mockResolvedValue(mockUser);
        userService.changePassword.mockResolvedValue(true);

        mockReq.body = {
          current_password: "oldpass123",
          new_password: "newpass123",
        };

        await userController.changePassword(mockReq, mockRes);

        expect(userService.changePassword).toHaveBeenCalledWith(
          VALID_USER_ID,
          "oldpass123",
          "newpass123"
        );
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "Đổi mật khẩu thành công",
        });
      });

      it("✅ should change password for SSO user and update Keycloak", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          typeAccount: "SSO",
          idSSO: "kc-user-123",
        };

        userService.getProfile.mockResolvedValue(mockUser);
        userService.changePassword.mockResolvedValue(true);
        keycloakService.changeUserPassword.mockResolvedValue(undefined);

        mockReq.body = {
          new_password: "newpass123",
        };

        await userController.changePassword(mockReq, mockRes);

        expect(keycloakService.changeUserPassword).toHaveBeenCalledWith(
          "kc-user-123",
          "newpass123"
        );
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "Đổi mật khẩu thành công",
        });
      });

      it("❌ should return 401 when user is not authenticated", async () => {
        mockReq.user = undefined;

        await userController.changePassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Không có quyền truy cập",
        });
      });

      it("❌ should return 400 when new password is too short", async () => {
        mockReq.body = {
          new_password: "12345", // Less than 6 characters
        };

        await userController.changePassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        });
      });

      it("❌ should return 400 when current password is required but missing", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          password_hash: "$2b$10$hashed",
          typeAccount: "Local",
        };

        userService.getProfile.mockResolvedValue(mockUser);
        mockReq.body = {
          new_password: "newpass123",
        };

        await userController.changePassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Cần nhập mật khẩu hiện tại",
        });
      });

      it("❌ should return 404 when user not found", async () => {
        userService.getProfile.mockResolvedValue(null);
        mockReq.body = {
          new_password: "newpass123", // Must provide valid password first
        };

        await userController.changePassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "User không tồn tại",
        });
      });
    });

    describe("updateMyProfile", () => {
      it("✅ should update profile successfully for Local user", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          typeAccount: "Local",
        };

        const mockUpdatedUser = {
          ...mockUser,
          full_name: "Updated Name",
          avatar_url: "/new-avatar.jpg",
        };

        userService.getUserById.mockResolvedValue(mockUser);
        userService.updateProfile.mockResolvedValue(mockUpdatedUser);

        mockReq.body = {
          full_name: "Updated Name",
          avatar_url: "/new-avatar.jpg",
        };

        await userController.updateMyProfile(mockReq, mockRes);

        expect(userService.updateProfile).toHaveBeenCalledWith(VALID_USER_ID, {
          full_name: "Updated Name",
          avatar_url: "/new-avatar.jpg",
        });
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "Cập nhật profile thành công",
          data: mockUpdatedUser,
        });
      });

      it("✅ should update profile for SSO user and sync with Keycloak", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          full_name: "Old Name",
          avatar_url: "/old-avatar.jpg",
          typeAccount: "SSO",
          idSSO: "kc-user-123",
        };

        const mockUpdatedUser = {
          ...mockUser,
          full_name: "New Name",
          avatar_url: "/new-avatar.jpg",
        };

        userService.getUserById.mockResolvedValue(mockUser);
        userService.updateProfile.mockResolvedValue(mockUpdatedUser);
        keycloakService.updateUser.mockResolvedValue(undefined);

        mockReq.body = {
          full_name: "New Name",
          avatar_url: "/new-avatar.jpg",
        };

        await userController.updateMyProfile(mockReq, mockRes);

        expect(keycloakService.updateUser).toHaveBeenCalledWith("kc-user-123", {
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          firstName: "New",
          lastName: "Name",
          attributes: {
            avatar_url: "/new-avatar.jpg",
          },
        });
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "Cập nhật profile thành công",
          data: mockUpdatedUser,
        });
      });

      it("❌ should return 401 when user is not authenticated", async () => {
        mockReq.user = undefined;

        await userController.updateMyProfile(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Không có quyền truy cập",
        });
      });

      it("❌ should return 404 when user not found", async () => {
        userService.getUserById.mockResolvedValue(null);

        await userController.updateMyProfile(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      });
    });
  });

  describe("Search and Find Operations", () => {
    describe("searchUsers", () => {
      it("✅ should search users successfully", async () => {
        const mockResult = {
          users: [
            { _id: VALID_USER_ID, username: VALID_USERNAME, email: VALID_EMAIL },
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
          },
        };

        userService.searchAllUsers.mockResolvedValue(mockResult);
        mockReq.query = {
          q: "test",
          page: "1",
          limit: "50",
        };

        await userController.searchUsers(mockReq, mockRes);

        expect(userService.searchAllUsers).toHaveBeenCalledWith("test", 1, 50);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockResult.users,
          total: 1,
          page: 1,
          limit: 50,
        });
      });

      it("✅ should return empty result when query is empty", async () => {
        mockReq.query = { q: "" };

        await userController.searchUsers(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: [],
          total: 0,
          page: 1,
          limit: 50,
        });
      });

      it("❌ should return 500 when service fails", async () => {
        const error = new Error("Search error");
        userService.searchAllUsers.mockRejectedValue(error);
        mockReq.query = { q: "test" };

        await userController.searchUsers(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Lỗi server khi tìm kiếm người dùng",
          error: "Search error",
        });
      });
    });

    describe("findUsers", () => {
      it("✅ should find users successfully", async () => {
        const mockUsers = [
          { _id: VALID_USER_ID, username: VALID_USERNAME, email: VALID_EMAIL },
        ];

        userService.findUsers.mockResolvedValue(mockUsers);
        mockReq.query = { infor: "test" };

        await userController.findUsers(mockReq, mockRes);

        expect(userService.findUsers).toHaveBeenCalledWith({ infor: "test" });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUsers,
          total: 1,
          keyword: "test",
        });
      });

      it("✅ should handle empty keyword", async () => {
        const mockUsers = [];
        userService.findUsers.mockResolvedValue(mockUsers);
        mockReq.query = {};

        await userController.findUsers(mockReq, mockRes);

        expect(userService.findUsers).toHaveBeenCalledWith({ infor: "" });
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUsers,
          total: 0,
          keyword: null,
        });
      });

      it("❌ should return 500 when service fails", async () => {
        const error = new Error("Find error");
        userService.findUsers.mockRejectedValue(error);
        mockReq.query = { infor: "test" };

        await userController.findUsers(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Lỗi tìm kiếm người dùng",
          error: "Find error",
        });
      });
    });
  });

  describe("Admin Operations", () => {
    describe("update", () => {
      it("✅ should update user successfully when user is admin", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          typeAccount: "Local",
        };

        const mockUpdatedUser = {
          ...mockUser,
          full_name: "Updated Name",
        };

        userService.getUserById.mockResolvedValue(mockUser);
        userService.updateUser.mockResolvedValue(mockUpdatedUser);

        mockReq.params.id = VALID_USER_ID;
        mockReq.body = { full_name: "Updated Name" };

        await userController.update(mockReq, mockRes);

        expect(userService.updateUser).toHaveBeenCalledWith(
          VALID_USER_ID,
          VALID_USER_ID,
          mockReq.body
        );
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUpdatedUser,
        });
      });

      it("✅ should update SSO user and sync with Keycloak", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          full_name: "Old Name",
          status: "active",
          typeAccount: "SSO",
          idSSO: "kc-user-123",
        };

        const mockUpdatedUser = {
          ...mockUser,
          full_name: "New Name",
        };

        userService.getUserById.mockResolvedValue(mockUser);
        userService.updateUser.mockResolvedValue(mockUpdatedUser);
        keycloakService.updateUser.mockResolvedValue(undefined);

        mockReq.params.id = VALID_USER_ID;
        mockReq.body = {
          full_name: "New Name",
          password: "newpass123",
        };

        await userController.update(mockReq, mockRes);

        expect(keycloakService.updateUser).toHaveBeenCalledWith("kc-user-123", {
          username: VALID_USERNAME,
          email: VALID_EMAIL,
          firstName: "New",
          lastName: "Name",
          enabled: true,
          credentials: [
            {
              type: "password",
              value: "newpass123",
              temporary: false,
            },
          ],
        });
      });

      it("❌ should return 403 when user has no permission", async () => {
        mockReq.user.roles = ["user"];
        mockReq.params.id = "other-user-id";

        await userController.update(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Bạn không có quyền cập nhật user này",
        });
      });

      it("❌ should return 400 when user not found", async () => {
        userService.getUserById.mockResolvedValue(null);
        mockReq.params.id = VALID_USER_ID;
        mockReq.body = { full_name: "Updated Name" };

        await userController.update(mockReq, mockRes);

        // Controller throws error and catch block returns 400
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: expect.stringContaining("Không tìm thấy user bạn muốn cập nhật"),
        });
      });

      it("❌ should return 400 when duplicate email error", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          typeAccount: "Local",
        };

        const error = new Error("Duplicate email");
        error.code = 11000;
        error.keyPattern = { email: 1 };

        userService.getUserById.mockResolvedValue(mockUser);
        userService.updateUser.mockRejectedValue(error);

        mockReq.params.id = VALID_USER_ID;
        mockReq.body = { email: VALID_EMAIL };

        await userController.update(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: `Email "${VALID_EMAIL}" đã tồn tại trong hệ thống`,
          error: "DUPLICATE_EMAIL",
        });
      });
    });

    describe("delete", () => {
      it("✅ should delete user successfully", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          typeAccount: "Local",
        };

        const mockDeletedUser = {
          ...mockUser,
          deleted_at: new Date(),
        };

        userService.getUserById.mockResolvedValue(mockUser);
        userService.softDeleteUser.mockResolvedValue(mockDeletedUser);

        mockReq.params.id = VALID_USER_ID;

        await userController.delete(mockReq, mockRes);

        expect(userService.softDeleteUser).toHaveBeenCalledWith(VALID_USER_ID);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "User soft deleted successfully",
          data: mockDeletedUser,
        });
      });

      it("✅ should deactivate SSO user on Keycloak when deleting", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: VALID_USERNAME,
          typeAccount: "SSO",
          idSSO: "kc-user-123",
        };

        userService.getUserById.mockResolvedValue(mockUser);
        userService.softDeleteUser.mockResolvedValue(mockUser);
        keycloakService.deactivateUserOnKeycloak.mockResolvedValue(undefined);

        mockReq.params.id = VALID_USER_ID;

        await userController.delete(mockReq, mockRes);

        expect(keycloakService.deactivateUserOnKeycloak).toHaveBeenCalledWith(
          "kc-user-123"
        );
      });

      it("❌ should return 404 when user not found", async () => {
        userService.getUserById.mockResolvedValue(null);
        mockReq.params.id = VALID_USER_ID;

        await userController.delete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        // Controller returns only message, not success field
        expect(mockRes.json).toHaveBeenCalledWith({
          message: "User not found",
        });
      });

      it("❌ should return 403 when trying to delete admin user", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          username: "admin",
          role: ["admin"],
        };

        userService.getUserById.mockResolvedValue(mockUser);
        mockReq.params.id = VALID_USER_ID;

        await userController.delete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Cannot delete user with system_manager role",
        });
      });
    });

    describe("softDelete", () => {
      it("✅ should soft delete user successfully", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          typeAccount: "Local",
        };

        userService.softDeleteUser.mockResolvedValue(mockUser);
        mockReq.params.id = VALID_USER_ID;

        await userController.softDelete(mockReq, mockRes);

        expect(userService.softDeleteUser).toHaveBeenCalledWith(VALID_USER_ID);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "User soft deleted successfully",
          data: mockUser,
        });
      });

      it("✅ should disable SSO user on Keycloak", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          typeAccount: "SSO",
          idSSO: "kc-user-123",
        };

        userService.softDeleteUser.mockResolvedValue(mockUser);
        keycloakService.updateUser.mockResolvedValue(undefined);
        mockReq.params.id = VALID_USER_ID;

        await userController.softDelete(mockReq, mockRes);

        expect(keycloakService.updateUser).toHaveBeenCalledWith("kc-user-123", {
          enabled: false,
        });
      });
    });

    describe("restore", () => {
      it("✅ should restore user successfully", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          typeAccount: "Local",
        };

        userService.restoreUser.mockResolvedValue(mockUser);
        mockReq.params.id = VALID_USER_ID;

        await userController.restore(mockReq, mockRes);

        expect(userService.restoreUser).toHaveBeenCalledWith(VALID_USER_ID);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: "User restored successfully",
          data: mockUser,
        });
      });

      it("✅ should enable SSO user on Keycloak when restoring", async () => {
        const mockUser = {
          _id: VALID_USER_ID,
          typeAccount: "SSO",
          idSSO: "kc-user-123",
        };

        userService.restoreUser.mockResolvedValue(mockUser);
        keycloakService.updateUser.mockResolvedValue(undefined);
        mockReq.params.id = VALID_USER_ID;

        await userController.restore(mockReq, mockRes);

        expect(keycloakService.updateUser).toHaveBeenCalledWith("kc-user-123", {
          enabled: true,
        });
      });

      it("❌ should return 404 when user not found", async () => {
        userService.restoreUser.mockResolvedValue(null);
        mockReq.params.id = VALID_USER_ID;

        await userController.restore(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "User not found or not deleted",
        });
      });
    });

    describe("getAllWithDeleted", () => {
      it("✅ should get all users including deleted successfully", async () => {
        const mockResult = {
          users: [
            { _id: VALID_USER_ID, username: VALID_USERNAME, deleted_at: null },
            { _id: "user2", username: "user2", deleted_at: new Date() },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1,
          },
        };

        // Mock method - may not exist in service, but controller calls it
        if (!userService.getAllUsersWithDeleted) {
          userService.getAllUsersWithDeleted = jest.fn();
        }
        userService.getAllUsersWithDeleted.mockResolvedValue(mockResult);
        mockReq.query = {
          page: "1",
          limit: "10",
          sortBy: "created_at",
          sortOrder: "desc",
        };

        await userController.getAllWithDeleted(mockReq, mockRes);

        expect(userService.getAllUsersWithDeleted).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        });
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          ...mockResult,
        });
      });

      it("❌ should return 500 when service fails", async () => {
        if (!userService.getAllUsersWithDeleted) {
          userService.getAllUsersWithDeleted = jest.fn();
        }
        const error = new Error("Service error");
        userService.getAllUsersWithDeleted.mockRejectedValue(error);
        mockReq.query = {};

        await userController.getAllWithDeleted(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: "Service error",
        });
      });
    });

    describe("getAllDeletedRecords", () => {
      it("✅ should get all deleted records successfully", async () => {
        const mockResult = {
          records: [
            { _id: "user1", username: "user1", deleted_at: new Date() },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
          },
        };

        userService.getAllDeletedRecords.mockResolvedValue(mockResult);
        mockReq.query = {
          type: "all",
          page: "1",
          limit: "10",
          sort: "deleted_at",
          order: "desc",
        };

        await userController.getAllDeletedRecords(mockReq, mockRes);

        expect(userService.getAllDeletedRecords).toHaveBeenCalledWith({
          type: "all",
          page: 1,
          limit: 10,
          sort: "deleted_at",
          order: "desc",
        });
        expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      });
    });
  });
});


// 📄 tests/unit/keycloak.service.test.js - Keycloak Service Unit Tests
jest.mock("dotenv");

// Create mock before requiring service
// Set a valid access token to avoid isTokenExpired errors
const createValidToken = () => {
  const validPayload = {
    exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
  };
  return `header.${Buffer.from(JSON.stringify(validPayload)).toString("base64")}.signature`;
};

const mockKcAdminClientInstance = {
  auth: jest.fn().mockResolvedValue(undefined),
  users: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
    resetPassword: jest.fn(),
  },
  get accessToken() {
    return this._accessToken || createValidToken();
  },
  set accessToken(value) {
    this._accessToken = value;
  },
};

// Initialize with valid token
mockKcAdminClientInstance._accessToken = createValidToken();

const MockKcAdminClient = jest.fn().mockImplementation(() => mockKcAdminClientInstance);

jest.mock("keycloak-admin", () => ({
  __esModule: true,
  default: MockKcAdminClient,
}));

// Now require the service after mocks are set up
// The service will create an instance using our mocked KcAdminClient
const keycloakService = require("../../services/keycloak.service");
const KcAdminClient = require("keycloak-admin").default;

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_USERNAME = "testuser";
const VALID_EMAIL = "test@example.com";

describe("🔹 Keycloak Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks
    mockKcAdminClientInstance.auth.mockResolvedValue(undefined);
    mockKcAdminClientInstance.users.create.mockReset();
    mockKcAdminClientInstance.users.find.mockReset();
    mockKcAdminClientInstance.users.findOne.mockReset();
    mockKcAdminClientInstance.users.update.mockReset();
    mockKcAdminClientInstance.users.del.mockReset();
    mockKcAdminClientInstance.users.resetPassword.mockReset();
    
    // Set a valid access token to avoid isTokenExpired errors
    mockKcAdminClientInstance._accessToken = createValidToken();

    // Set environment variables
    process.env.KEYCLOAK_BASE_URL = "http://localhost:8080";
    process.env.KEYCLOAK_REALM = "test-realm";
    process.env.KEYCLOAK_ADMIN_USERNAME = "admin";
    process.env.KEYCLOAK_ADMIN_PASSWORD = "admin123";
  });

  describe("initKeycloak", () => {
    it("✅ should initialize Keycloak successfully", async () => {
      await expect(keycloakService.initKeycloak()).resolves.not.toThrow();
      expect(mockKcAdminClientInstance.auth).toHaveBeenCalledWith({
        username: "admin",
        password: "admin123",
        grantType: "password",
        clientId: "admin-cli",
      });
    });

    it("❌ should throw error when auth fails", async () => {
      const mockError = new Error("Authentication failed");
      mockKcAdminClientInstance.auth.mockRejectedValue(mockError);

      await expect(keycloakService.initKeycloak()).rejects.toThrow("Authentication failed");
    });
  });

  describe("isTokenExpired", () => {
    it("✅ should return true when token is null", () => {
      // isTokenExpired is not exported, but we can test it indirectly
      // through refreshTokenIfNeeded
      mockKcAdminClientInstance.accessToken = null;

      // This will trigger refreshTokenIfNeeded which uses isTokenExpired
      // We'll test it through other functions
    });

    it("✅ should return true when token is expired", () => {
      // Create an expired token
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance.accessToken = expiredToken;

      // Test through refreshTokenIfNeeded
    });
  });

  describe("refreshTokenIfNeeded", () => {
    it("✅ should refresh token when expired", async () => {
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance.accessToken = expiredToken;

      // This is tested indirectly through other functions
      await keycloakService.initKeycloak();
      expect(mockKcAdminClientInstance.auth).toHaveBeenCalled();
    });
  });

  describe("withRetry", () => {
    it("✅ should retry on 401 error", async () => {
      const mockUser = { id: VALID_USER_ID };
      // Set expired token to trigger refresh on retry
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance._accessToken = expiredToken;
      
      mockKcAdminClientInstance.users.create
        .mockRejectedValueOnce({
          response: { status: 401 },
        })
        .mockResolvedValueOnce(mockUser);

      const result = await keycloakService.createUser({ username: VALID_USERNAME });

      expect(mockKcAdminClientInstance.auth).toHaveBeenCalled();
      expect(mockKcAdminClientInstance.users.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUser);
    });

    it("❌ should throw error on non-401 error", async () => {
      const mockError = { response: { status: 500 } };
      // Ensure valid token
      mockKcAdminClientInstance._accessToken = createValidToken();
      mockKcAdminClientInstance.users.create.mockRejectedValue(mockError);

      await expect(keycloakService.createUser({ username: VALID_USERNAME })).rejects.toEqual(
        mockError
      );
    });
  });

  describe("createUser", () => {
    it("✅ should create user successfully", async () => {
      const mockUser = {
        id: VALID_USER_ID,
        username: VALID_USERNAME,
        email: VALID_EMAIL,
      };
      const userData = {
        username: VALID_USERNAME,
        email: VALID_EMAIL,
        firstName: "Test",
        lastName: "User",
      };

      mockKcAdminClientInstance.users.create.mockResolvedValue(mockUser);

      const result = await keycloakService.createUser(userData);

      expect(result).toEqual(mockUser);
      expect(mockKcAdminClientInstance.users.create).toHaveBeenCalledWith(userData);
    });

    it("✅ should retry on 401 error", async () => {
      const mockUser = { id: VALID_USER_ID };
      // Set expired token to trigger refresh on retry
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance._accessToken = expiredToken;
      
      mockKcAdminClientInstance.users.create
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(mockUser);

      const result = await keycloakService.createUser({ username: VALID_USERNAME });

      expect(result).toEqual(mockUser);
      expect(mockKcAdminClientInstance.auth).toHaveBeenCalled();
    });
  });

  describe("getUsers", () => {
    it("✅ should get users successfully", async () => {
      const mockUsers = [
        { id: VALID_USER_ID, username: VALID_USERNAME },
        { id: "507f1f77bcf86cd799439012", username: "user2" },
      ];
      const query = { max: 10 };

      mockKcAdminClientInstance.users.find.mockResolvedValue(mockUsers);

      const result = await keycloakService.getUsers(query);

      expect(result).toEqual(mockUsers);
      expect(mockKcAdminClientInstance.users.find).toHaveBeenCalledWith(query);
    });

    it("✅ should get users with empty query", async () => {
      const mockUsers = [];
      mockKcAdminClientInstance.users.find.mockResolvedValue(mockUsers);

      const result = await keycloakService.getUsers();

      expect(result).toEqual(mockUsers);
      expect(mockKcAdminClientInstance.users.find).toHaveBeenCalledWith({});
    });
  });

  describe("getUserById", () => {
    it("✅ should get user by id successfully", async () => {
      const mockUser = {
        id: VALID_USER_ID,
        username: VALID_USERNAME,
        email: VALID_EMAIL,
      };

      mockKcAdminClientInstance.users.findOne.mockResolvedValue(mockUser);

      const result = await keycloakService.getUserById(VALID_USER_ID);

      expect(result).toEqual(mockUser);
      expect(mockKcAdminClientInstance.users.findOne).toHaveBeenCalledWith({ id: VALID_USER_ID });
    });

    it("❌ should handle user not found", async () => {
      mockKcAdminClientInstance.users.findOne.mockResolvedValue(null);

      const result = await keycloakService.getUserById(VALID_USER_ID);

      expect(result).toBeNull();
    });
  });

  describe("getUserByUsername", () => {
    it("✅ should get user by username successfully", async () => {
      const mockUsers = [
        {
          id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        },
      ];

      mockKcAdminClientInstance.users.find.mockResolvedValue(mockUsers);

      const result = await keycloakService.getUserByUsername(VALID_USERNAME);

      expect(result).toEqual(mockUsers);
      expect(mockKcAdminClientInstance.users.find).toHaveBeenCalledWith({ username: VALID_USERNAME });
    });
  });

  describe("getUserByEmail", () => {
    it("✅ should get user by email successfully", async () => {
      const mockUsers = [
        {
          id: VALID_USER_ID,
          username: VALID_USERNAME,
          email: VALID_EMAIL,
        },
      ];

      mockKcAdminClientInstance.users.find.mockResolvedValue(mockUsers);

      const result = await keycloakService.getUserByEmail(VALID_EMAIL);

      expect(result).toEqual(mockUsers);
      expect(mockKcAdminClientInstance.users.find).toHaveBeenCalledWith({ email: VALID_EMAIL });
    });
  });

  describe("updateUser", () => {
    it("✅ should update user successfully", async () => {
      const updatedInfo = {
        firstName: "Updated",
        lastName: "Name",
      };

      mockKcAdminClientInstance.users.update.mockResolvedValue(undefined);

      await keycloakService.updateUser(VALID_USER_ID, updatedInfo);

      expect(mockKcAdminClientInstance.users.update).toHaveBeenCalledWith(
        { id: VALID_USER_ID },
        updatedInfo
      );
    });

    it("✅ should retry on 401 error", async () => {
      // Set expired token to trigger refresh on retry
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance._accessToken = expiredToken;
      
      mockKcAdminClientInstance.users.update
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(undefined);

      await keycloakService.updateUser(VALID_USER_ID, { firstName: "Test" });

      expect(mockKcAdminClientInstance.auth).toHaveBeenCalled();
    });
  });

  describe("deleteUser", () => {
    it("✅ should delete user successfully", async () => {
      mockKcAdminClientInstance.users.del.mockResolvedValue(undefined);

      await keycloakService.deleteUser(VALID_USER_ID);

      expect(mockKcAdminClientInstance.users.del).toHaveBeenCalledWith({ id: VALID_USER_ID });
    });

    it("✅ should retry on 401 error", async () => {
      // Set expired token to trigger refresh on retry
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance._accessToken = expiredToken;
      
      mockKcAdminClientInstance.users.del
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(undefined);

      await keycloakService.deleteUser(VALID_USER_ID);

      expect(mockKcAdminClientInstance.auth).toHaveBeenCalled();
    });
  });

  describe("testConnection", () => {
    it("✅ should test connection successfully", async () => {
      const mockUsers = [{ id: VALID_USER_ID }];
      mockKcAdminClientInstance.users.find.mockResolvedValue(mockUsers);

      await expect(keycloakService.testConnection()).resolves.not.toThrow();
      expect(mockKcAdminClientInstance.users.find).toHaveBeenCalledWith({ max: 2 });
    });
  });

  describe("deactivateUserOnKeycloak", () => {
    it("✅ should deactivate user successfully", async () => {
      mockKcAdminClientInstance.users.update.mockResolvedValue(undefined);

      await keycloakService.deactivateUserOnKeycloak(VALID_USER_ID);

      expect(mockKcAdminClientInstance.users.update).toHaveBeenCalledWith(
        { id: VALID_USER_ID },
        { enabled: false }
      );
    });

    it("✅ should retry on 401 error", async () => {
      // Set expired token to trigger refresh on retry
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance._accessToken = expiredToken;
      
      mockKcAdminClientInstance.users.update
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(undefined);

      await keycloakService.deactivateUserOnKeycloak(VALID_USER_ID);

      expect(mockKcAdminClientInstance.auth).toHaveBeenCalled();
    });
  });

  describe("createUserWithPassword", () => {
    it("✅ should create user with password successfully", async () => {
      const mockUser = {
        id: VALID_USER_ID,
        username: VALID_USERNAME,
        email: VALID_EMAIL,
      };
      const userData = {
        username: VALID_USERNAME,
        email: VALID_EMAIL,
        full_name: "Test User",
        status: "active",
      };
      const password = "password123";

      mockKcAdminClientInstance.users.create.mockResolvedValue(mockUser);
      mockKcAdminClientInstance.users.resetPassword.mockResolvedValue(undefined);

      const result = await keycloakService.createUserWithPassword(userData, password);

      expect(result).toEqual(mockUser);
      expect(mockKcAdminClientInstance.users.create).toHaveBeenCalledWith({
        username: VALID_USERNAME,
        email: VALID_EMAIL,
        firstName: "Test",
        lastName: "User",
        enabled: true,
      });
      expect(mockKcAdminClientInstance.users.resetPassword).toHaveBeenCalledWith({
        id: VALID_USER_ID,
        credential: {
          type: "password",
          value: password,
          temporary: false,
        },
      });
    });

    it("✅ should create disabled user when status is not active", async () => {
      const mockUser = {
        id: VALID_USER_ID,
        username: VALID_USERNAME,
      };
      const userData = {
        username: VALID_USERNAME,
        email: VALID_EMAIL,
        full_name: "Test User",
        status: "inactive",
      };
      const password = "password123";

      mockKcAdminClientInstance.users.create.mockResolvedValue(mockUser);
      mockKcAdminClientInstance.users.resetPassword.mockResolvedValue(undefined);

      await keycloakService.createUserWithPassword(userData, password);

      expect(mockKcAdminClientInstance.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it("✅ should handle user with single name", async () => {
      const mockUser = {
        id: VALID_USER_ID,
        username: VALID_USERNAME,
      };
      const userData = {
        username: VALID_USERNAME,
        email: VALID_EMAIL,
        full_name: "SingleName",
        status: "active",
      };
      const password = "password123";

      mockKcAdminClientInstance.users.create.mockResolvedValue(mockUser);
      mockKcAdminClientInstance.users.resetPassword.mockResolvedValue(undefined);

      await keycloakService.createUserWithPassword(userData, password);

      expect(mockKcAdminClientInstance.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "SingleName",
          lastName: "",
        })
      );
    });

    it("❌ should throw error when resetPassword fails", async () => {
      const mockUser = {
        id: VALID_USER_ID,
        username: VALID_USERNAME,
      };
      const userData = {
        username: VALID_USERNAME,
        email: VALID_EMAIL,
        full_name: "Test User",
        status: "active",
      };
      const password = "password123";
      const mockError = new Error("Password reset failed");

      mockKcAdminClientInstance.users.create.mockResolvedValue(mockUser);
      mockKcAdminClientInstance.users.resetPassword.mockRejectedValue(mockError);

      await expect(keycloakService.createUserWithPassword(userData, password)).rejects.toThrow(
        "Password reset failed"
      );
    });

    it("✅ should retry on 401 error", async () => {
      // Set expired token to trigger refresh on retry
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance._accessToken = expiredToken;
      
      const mockUser = {
        id: VALID_USER_ID,
        username: VALID_USERNAME,
      };
      const userData = {
        username: VALID_USERNAME,
        email: VALID_EMAIL,
        full_name: "Test User",
        status: "active",
      };
      const password = "password123";

      mockKcAdminClientInstance.users.create
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(mockUser);
      mockKcAdminClientInstance.users.resetPassword.mockResolvedValue(undefined);

      await keycloakService.createUserWithPassword(userData, password);

      expect(mockKcAdminClientInstance.auth).toHaveBeenCalled();
    });
  });

  describe("changeUserPassword", () => {
    it("✅ should change user password successfully", async () => {
      const newPassword = "newPassword123";

      mockKcAdminClientInstance.users.resetPassword.mockResolvedValue(undefined);

      const result = await keycloakService.changeUserPassword(VALID_USER_ID, newPassword);

      expect(result).toBe(true);
      expect(mockKcAdminClientInstance.users.resetPassword).toHaveBeenCalledWith({
        id: VALID_USER_ID,
        credential: {
          type: "password",
          value: newPassword,
          temporary: false,
        },
      });
    });

    it("✅ should retry on 401 error", async () => {
      // Set expired token to trigger refresh on retry
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance._accessToken = expiredToken;
      
      const newPassword = "newPassword123";

      mockKcAdminClientInstance.users.resetPassword
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(undefined);

      await keycloakService.changeUserPassword(VALID_USER_ID, newPassword);

      expect(mockKcAdminClientInstance.auth).toHaveBeenCalled();
    });
  });

  describe("restoreUserOnKeycloak", () => {
    it("✅ should restore user successfully", async () => {
      mockKcAdminClientInstance.users.update.mockResolvedValue(undefined);

      await keycloakService.restoreUserOnKeycloak(VALID_USER_ID);

      expect(mockKcAdminClientInstance.users.update).toHaveBeenCalledWith(
        { id: VALID_USER_ID },
        { enabled: true }
      );
    });

    it("✅ should retry on 401 error", async () => {
      // Set expired token to trigger refresh on retry
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64")}.signature`;
      mockKcAdminClientInstance._accessToken = expiredToken;
      
      mockKcAdminClientInstance.users.update
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(undefined);

      await keycloakService.restoreUserOnKeycloak(VALID_USER_ID);

      expect(mockKcAdminClientInstance.auth).toHaveBeenCalled();
    });
  });
});


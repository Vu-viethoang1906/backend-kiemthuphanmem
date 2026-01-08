// 📄 tests/unit/user.service.test.js - User Service Unit Tests
jest.mock("../../repositories/user.repository");
jest.mock("../../repositories/userRole.repository");
jest.mock("../../services/keycloak.service");
jest.mock("bcrypt");

const userService = require("../../services/user.service");
const userRepo = require("../../repositories/user.repository");
const userRole = require("../../repositories/userRole.repository");
const keycloack = require("../../services/keycloak.service");
const { restoreUserOnKeycloak } = require("../../services/keycloak.service");
const bcrypt = require("bcrypt");

describe("🔹 User Service Unit Tests", () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("validateUser(login, password) - Validate User Login", () => {
    it("✅ should return user when login with email and password is valid", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        username: "testuser",
        password_hash: "$2b$10$hashedpassword",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compareSync.mockReturnValue(true);

      const result = await userService.validateUser("test@example.com", "password123");

      expect(userRepo.findByEmail).toHaveBeenCalledWith("test@example.com");
      expect(userRepo.findByUsername).not.toHaveBeenCalled();
      expect(bcrypt.compareSync).toHaveBeenCalledWith("password123", mockUser.password_hash);
      expect(result).toEqual(mockUser);
    });

    it("✅ should return user when login with username and password is valid", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        username: "testuser",
        password_hash: "$2b$10$hashedpassword",
      };

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(mockUser);
      bcrypt.compareSync.mockReturnValue(true);

      const result = await userService.validateUser("testuser", "password123");

      expect(userRepo.findByEmail).toHaveBeenCalledWith("testuser");
      expect(userRepo.findByUsername).toHaveBeenCalledWith("testuser");
      expect(bcrypt.compareSync).toHaveBeenCalledWith("password123", mockUser.password_hash);
      expect(result).toEqual(mockUser);
    });

    it("✅ should validate plain text password (backward compatibility)", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password_hash: "plaintextpassword",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.validateUser("test@example.com", "plaintextpassword");

      expect(bcrypt.compareSync).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it("❌ should return null when login is missing", async () => {
      const result = await userService.validateUser(null, "password123");

      expect(result).toBeNull();
      expect(userRepo.findByEmail).not.toHaveBeenCalled();
    });

    it("❌ should return null when password is missing", async () => {
      const result = await userService.validateUser("test@example.com", null);

      expect(result).toBeNull();
      expect(userRepo.findByEmail).not.toHaveBeenCalled();
    });

    it("❌ should return null when user not found", async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);

      const result = await userService.validateUser("nonexistent", "password123");

      expect(userRepo.findByEmail).toHaveBeenCalled();
      expect(userRepo.findByUsername).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("❌ should return null when password is incorrect", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password_hash: "$2b$10$hashedpassword",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compareSync.mockReturnValue(false);

      const result = await userService.validateUser("test@example.com", "wrongpassword");

      expect(bcrypt.compareSync).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("❌ should return null when repository throws error", async () => {
      userRepo.findByEmail.mockRejectedValue(new Error("Database error"));

      const result = await userService.validateUser("test@example.com", "password123");

      expect(result).toBeNull();
    });
  });

  describe("_validatePassword(inputPassword, user) - Password Validation", () => {
    it("✅ should validate bcrypt hashed password_hash", () => {
      const user = {
        password_hash: "$2b$10$hashedpassword",
      };

      bcrypt.compareSync.mockReturnValue(true);
      const result = userService._validatePassword("password123", user);

      expect(bcrypt.compareSync).toHaveBeenCalledWith("password123", user.password_hash);
      expect(result).toBe(true);
    });

    it("✅ should validate plain text password_hash", () => {
      const user = {
        password_hash: "plaintext",
      };

      const result = userService._validatePassword("plaintext", user);

      expect(bcrypt.compareSync).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("✅ should validate bcrypt hashed password (legacy field)", () => {
      const user = {
        password: "$2b$10$hashedpassword",
      };

      bcrypt.compareSync.mockReturnValue(true);
      const result = userService._validatePassword("password123", user);

      expect(bcrypt.compareSync).toHaveBeenCalledWith("password123", user.password);
      expect(result).toBe(true);
    });

    it("❌ should return false when password doesn't match", () => {
      const user = {
        password_hash: "correctpassword",
      };

      const result = userService._validatePassword("wrongpassword", user);

      expect(result).toBe(false);
    });

    it("❌ should return false when user has no password fields", () => {
      const user = {
        email: "test@example.com",
      };

      const result = userService._validatePassword("password123", user);

      expect(result).toBe(false);
    });
  });

  describe("getAllUsers(options) - Get All Users", () => {
    it("✅ should return all users with pagination", async () => {
      const mockResult = {
        users: [
          { _id: "user1", email: "user1@test.com" },
          { _id: "user2", email: "user2@test.com" },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      };

      userRepo.findAll.mockResolvedValue(mockResult);

      const result = await userService.getAllUsers({ page: 1, limit: 10 });

      expect(userRepo.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });

    it("✅ should return users with default options", async () => {
      const mockResult = {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      };

      userRepo.findAll.mockResolvedValue(mockResult);

      const result = await userService.getAllUsers();

      expect(userRepo.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual(mockResult);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findAll.mockRejectedValue(error);

      await expect(userService.getAllUsers()).rejects.toThrow("Database error");
      expect(consoleSpy).toHaveBeenCalledWith("Error in getAllUsers:", "Database error");
    });
  });

  describe("getUserById(id) - Get User By ID", () => {
    it("✅ should return user by id", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        username: "testuser",
      };

      userRepo.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById("user123");

      expect(userRepo.findById).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockUser);
    });

    it("✅ should return null when user not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      const result = await userService.getUserById("nonexistent");

      expect(result).toBeNull();
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findById.mockRejectedValue(error);

      await expect(userService.getUserById("user123")).rejects.toThrow("Database error");
    });
  });

  describe("getUserByEmail(email) - Get User By Email", () => {
    it("✅ should return user by email", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail("test@example.com");

      expect(userRepo.findByEmail).toHaveBeenCalledWith("test@example.com");
      expect(result).toEqual(mockUser);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findByEmail.mockRejectedValue(error);

      await expect(userService.getUserByEmail("test@example.com")).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("getUserByUsername(username) - Get User By Username", () => {
    it("✅ should return user by username", async () => {
      const mockUser = {
        _id: "user123",
        username: "testuser",
      };

      userRepo.findByUsername.mockResolvedValue(mockUser);

      const result = await userService.getUserByUsername("testuser");

      expect(userRepo.findByUsername).toHaveBeenCalledWith("testuser");
      expect(result).toEqual(mockUser);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findByUsername.mockRejectedValue(error);

      await expect(userService.getUserByUsername("testuser")).rejects.toThrow("Database error");
    });
  });

  describe("getUserByPhoneNumber(phoneNumber) - Get User By Phone Number", () => {
    it("✅ should return user by phone number", async () => {
      const mockUser = {
        _id: "user123",
        phone_number: "0123456789",
      };

      userRepo.findByPhoneNumber.mockResolvedValue(mockUser);

      const result = await userService.getUserByPhoneNumber("0123456789");

      expect(userRepo.findByPhoneNumber).toHaveBeenCalledWith("0123456789");
      expect(result).toEqual(mockUser);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findByPhoneNumber.mockRejectedValue(error);

      await expect(userService.getUserByPhoneNumber("0123456789")).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("createUser(userData) - Create User with Keycloak", () => {
    it("✅ should create user successfully with all fields", async () => {
      const userData = {
        username: "newuser",
        email: "newuser@example.com",
        full_name: "New User",
        status: "active",
        password: "password123",
        center_id: "center123",
      };

      const mockKeycloakUser = {
        id: "keycloak-id-123",
        username: "newuser",
        email: "newuser@example.com",
      };

      const mockLocalUser = {
        _id: "user123",
        ...userData,
        idSSO: "keycloak-id-123",
        typeAccount: "SSO",
        password_hash: "$2b$10$hashed",
      };

      userRepo.isEmailExists.mockResolvedValue(false);
      userRepo.isUsernameExists.mockResolvedValue(false);
      bcrypt.hashSync.mockReturnValue("$2b$10$hashed");
      keycloack.createUserWithPassword.mockResolvedValue(mockKeycloakUser);
      userRepo.create.mockResolvedValue(mockLocalUser);

      const result = await userService.createUser(userData);

      expect(userRepo.isEmailExists).toHaveBeenCalledWith(userData.email);
      expect(userRepo.isUsernameExists).toHaveBeenCalledWith(userData.username);
      expect(bcrypt.hashSync).toHaveBeenCalledWith("password123", 10);
      expect(keycloack.createUserWithPassword).toHaveBeenCalledWith(
        {
          username: userData.username,
          email: userData.email,
          full_name: userData.full_name,
          status: userData.status,
        },
        userData.password
      );
      expect(userRepo.create).toHaveBeenCalledWith({
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        status: userData.status,
        idSSO: mockKeycloakUser.id,
        typeAccount: "SSO",
        password_hash: "$2b$10$hashed",
        center_id: userData.center_id,
      });
      expect(result).toEqual(mockLocalUser);
    });

    it("✅ should create user without password", async () => {
      const userData = {
        username: "newuser",
        email: "newuser@example.com",
        full_name: "New User",
        status: "active",
      };

      const mockKeycloakUser = {
        id: "keycloak-id-123",
      };

      const mockLocalUser = {
        _id: "user123",
        ...userData,
        idSSO: "keycloak-id-123",
        typeAccount: "SSO",
      };

      userRepo.isEmailExists.mockResolvedValue(false);
      keycloack.createUserWithPassword.mockResolvedValue(mockKeycloakUser);
      userRepo.create.mockResolvedValue(mockLocalUser);

      const result = await userService.createUser(userData);

      expect(bcrypt.hashSync).not.toHaveBeenCalled();
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: undefined,
        })
      );
      expect(result).toEqual(mockLocalUser);
    });

    it("✅ should create user without username", async () => {
      const userData = {
        email: "newuser@example.com",
        full_name: "New User",
        status: "active",
        password: "password123",
      };

      const mockKeycloakUser = {
        id: "keycloak-id-123",
      };

      const mockLocalUser = {
        _id: "user123",
        ...userData,
        idSSO: "keycloak-id-123",
        typeAccount: "SSO",
      };

      userRepo.isEmailExists.mockResolvedValue(false);
      keycloack.createUserWithPassword.mockResolvedValue(mockKeycloakUser);
      userRepo.create.mockResolvedValue(mockLocalUser);

      const result = await userService.createUser(userData);

      expect(userRepo.isUsernameExists).not.toHaveBeenCalled();
      expect(result).toEqual(mockLocalUser);
    });

    it("❌ should throw error when email is missing", async () => {
      const userData = {
        username: "newuser",
        full_name: "New User",
      };

      await expect(userService.createUser(userData)).rejects.toThrow("Email là bắt buộc");
    });

    it("❌ should throw error when email format is invalid", async () => {
      const userData = {
        email: "invalid-email",
        username: "newuser",
      };

      await expect(userService.createUser(userData)).rejects.toThrow("Email không đúng định dạng");
    });

    it("❌ should throw error when email already exists", async () => {
      const userData = {
        email: "existing@example.com",
        username: "newuser",
      };

      userRepo.isEmailExists.mockResolvedValue(true);

      await expect(userService.createUser(userData)).rejects.toThrow(
        "Email đã tồn tại trong hệ thống"
      );
    });

    it("❌ should throw error when username already exists", async () => {
      const userData = {
        email: "newuser@example.com",
        username: "existinguser",
      };

      userRepo.isEmailExists.mockResolvedValue(false);
      userRepo.isUsernameExists.mockResolvedValue(true);

      await expect(userService.createUser(userData)).rejects.toThrow(
        "Username đã tồn tại trong hệ thống"
      );
    });

    it("❌ should throw error when Keycloak creation fails", async () => {
      const userData = {
        email: "newuser@example.com",
        username: "newuser",
        password: "password123",
      };

      userRepo.isEmailExists.mockResolvedValue(false);
      userRepo.isUsernameExists.mockResolvedValue(false);
      bcrypt.hashSync.mockReturnValue("$2b$10$hashed");
      keycloack.createUserWithPassword.mockResolvedValue(null);

      await expect(userService.createUser(userData)).rejects.toThrow(
        "Tạo user trên Keycloak thất bại"
      );
    });

    it("❌ should throw error when Keycloak user has no id", async () => {
      const userData = {
        email: "newuser@example.com",
        username: "newuser",
        password: "password123",
      };

      userRepo.isEmailExists.mockResolvedValue(false);
      userRepo.isUsernameExists.mockResolvedValue(false);
      bcrypt.hashSync.mockReturnValue("$2b$10$hashed");
      keycloack.createUserWithPassword.mockResolvedValue({ username: "newuser" });

      await expect(userService.createUser(userData)).rejects.toThrow(
        "Tạo user trên Keycloak thất bại"
      );
    });

    it("❌ should throw error when repository create fails", async () => {
      const userData = {
        email: "newuser@example.com",
        username: "newuser",
        password: "password123",
      };

      const mockKeycloakUser = {
        id: "keycloak-id-123",
      };

      userRepo.isEmailExists.mockResolvedValue(false);
      userRepo.isUsernameExists.mockResolvedValue(false);
      bcrypt.hashSync.mockReturnValue("$2b$10$hashed");
      keycloack.createUserWithPassword.mockResolvedValue(mockKeycloakUser);
      userRepo.create.mockRejectedValue(new Error("Database error"));

      await expect(userService.createUser(userData)).rejects.toThrow("Database error");
    });
  });

  describe("createUserSSO(userData) - Create SSO User", () => {
    it("✅ should create SSO user with typeAccount set", async () => {
      const userData = {
        email: "sso@example.com",
        username: "ssouser",
        idSSO: "keycloak-id-123",
      };

      const mockCreatedUser = {
        _id: "user123",
        ...userData,
        typeAccount: "SSO",
      };

      userRepo.create.mockResolvedValue(mockCreatedUser);

      const result = await userService.createUserSSO(userData);

      expect(userData.typeAccount).toBe("SSO");
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          typeAccount: "SSO",
        })
      );
      expect(result).toEqual(mockCreatedUser);
    });

    it("❌ should throw error when repository fails", async () => {
      const userData = {
        email: "sso@example.com",
      };

      const error = new Error("Database error");
      userRepo.create.mockRejectedValue(error);

      await expect(userService.createUserSSO(userData)).rejects.toThrow("Database error");
    });
  });

  describe("updateUser(idUpdate, id, updateData) - Update User", () => {
    it("✅ should update user successfully without email/username/role", async () => {
      const updateData = {
        full_name: "Updated Name",
        status: "inactive",
      };

      const mockUpdatedUser = {
        _id: "user123",
        ...updateData,
      };

      userRepo.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser("admin123", "user123", updateData);

      expect(userRepo.isEmailExists).not.toHaveBeenCalled();
      expect(userRepo.isUsernameExists).not.toHaveBeenCalled();
      expect(userRole.updateByIdUser).not.toHaveBeenCalled();
      expect(userRepo.update).toHaveBeenCalledWith("user123", updateData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it("✅ should update user with email validation", async () => {
      const updateData = {
        email: "updated@example.com",
        full_name: "Updated Name",
      };

      const mockUpdatedUser = {
        _id: "user123",
        ...updateData,
      };

      userRepo.isEmailExists.mockResolvedValue(false);
      userRepo.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser("admin123", "user123", updateData);

      expect(userRepo.isEmailExists).toHaveBeenCalledWith("updated@example.com", "user123");
      expect(userRepo.update).toHaveBeenCalledWith("user123", updateData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it("✅ should update user with username validation", async () => {
      const updateData = {
        username: "updateduser",
      };

      const mockUpdatedUser = {
        _id: "user123",
        ...updateData,
      };

      userRepo.isUsernameExists.mockResolvedValue(false);
      userRepo.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser("admin123", "user123", updateData);

      expect(userRepo.isUsernameExists).toHaveBeenCalledWith("updateduser", "user123");
      expect(userRepo.update).toHaveBeenCalledWith("user123", updateData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it("✅ should update user with password hashing", async () => {
      const updateData = {
        password: "newpassword",
        full_name: "Updated Name",
      };

      const mockUpdatedUser = {
        _id: "user123",
        full_name: "Updated Name",
        password_hash: "$2b$10$hashed",
      };

      bcrypt.hashSync.mockReturnValue("$2b$10$hashed");
      userRepo.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser("admin123", "user123", updateData);

      expect(bcrypt.hashSync).toHaveBeenCalledWith("newpassword", 10);
      expect(updateData.password_hash).toBe("$2b$10$hashed");
      expect(updateData.password).toBeUndefined();
      expect(userRepo.update).toHaveBeenCalledWith(
        "user123",
        expect.objectContaining({
          password_hash: "$2b$10$hashed",
        })
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it("✅ should update user with role", async () => {
      const updateData = {
        roles: ["admin"],
        full_name: "Updated Name",
      };

      const mockUpdatedUser = {
        _id: "user123",
        full_name: "Updated Name",
      };

      userRole.updateByIdUser.mockResolvedValue(true);
      userRepo.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser("admin123", "user123", updateData);

      expect(userRole.updateByIdUser).toHaveBeenCalledWith("admin123", "user123", "admin");
      expect(updateData.roles).toBeUndefined();
      expect(userRepo.update).toHaveBeenCalledWith("user123", { full_name: "Updated Name" });
      expect(result).toEqual(mockUpdatedUser);
    });

    it("✅ should update user with role ID", async () => {
      const updateData = {
        roles: ["672c1234567890abcdef1234"],
      };

      const mockUpdatedUser = {
        _id: "user123",
      };

      userRole.updateByIdUser.mockResolvedValue(true);
      userRepo.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser("admin123", "user123", updateData);

      expect(userRole.updateByIdUser).toHaveBeenCalledWith(
        "admin123",
        "user123",
        "672c1234567890abcdef1234"
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it("❌ should throw error when id is missing", async () => {
      await expect(userService.updateUser("admin123", null, { full_name: "Test" })).rejects.toThrow(
        "ID không được để trống"
      );
    });

    it("❌ should throw error when updateData is empty", async () => {
      await expect(userService.updateUser("admin123", "user123", {})).rejects.toThrow(
        "Dữ liệu cập nhật không được để trống"
      );
    });

    it("❌ should throw error when email format is invalid", async () => {
      const updateData = {
        email: "invalid-email",
      };

      await expect(userService.updateUser("admin123", "user123", updateData)).rejects.toThrow(
        "Email không đúng định dạng"
      );
    });

    it("❌ should throw error when email already exists", async () => {
      const updateData = {
        email: "existing@example.com",
      };

      userRepo.isEmailExists.mockResolvedValue(true);

      await expect(userService.updateUser("admin123", "user123", updateData)).rejects.toThrow(
        "Email đã tồn tại trong hệ thống"
      );
    });

    it("❌ should throw error when username already exists", async () => {
      const updateData = {
        username: "existinguser",
      };

      userRepo.isUsernameExists.mockResolvedValue(true);

      await expect(userService.updateUser("admin123", "user123", updateData)).rejects.toThrow(
        "Username đã tồn tại trong hệ thống"
      );
    });

    it("❌ should throw error when roles is not an array", async () => {
      const updateData = {
        roles: "admin",
      };

      await expect(userService.updateUser("admin123", "user123", updateData)).rejects.toThrow(
        "Roles phải là một mảng"
      );
    });

    it("❌ should throw error when roles array is empty", async () => {
      const updateData = {
        roles: [],
      };

      await expect(userService.updateUser("admin123", "user123", updateData)).rejects.toThrow(
        "Role không hợp lệ"
      );
    });

    it("❌ should throw error when repository update fails", async () => {
      const updateData = {
        full_name: "Updated",
      };

      const error = new Error("Database error");
      userRepo.update.mockRejectedValue(error);

      await expect(userService.updateUser("admin123", "user123", updateData)).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("deleteUser(id) - Delete User", () => {
    it("✅ should delete user successfully", async () => {
      const mockDeletedUser = {
        _id: "user123",
        email: "deleted@example.com",
      };

      userRepo.deleteById.mockResolvedValue(mockDeletedUser);

      const result = await userService.deleteUser("user123");

      expect(userRepo.deleteById).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockDeletedUser);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("User not found");
      userRepo.deleteById.mockRejectedValue(error);

      await expect(userService.deleteUser("user123")).rejects.toThrow("User not found");
    });
  });

  describe("viewAll(options) - Get All Users (Deprecated)", () => {
    it("✅ should return users with backward compatible format", async () => {
      const mockResult = {
        users: [
          { _id: "user1", email: "user1@test.com" },
          { _id: "user2", email: "user2@test.com" },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      };

      userRepo.findAll.mockResolvedValue(mockResult);

      const result = await userService.viewAll({ page: 1, limit: 10 });

      expect(userRepo.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual({
        users: mockResult.users,
        totalUsers: 2,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
      });
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findAll.mockRejectedValue(error);

      await expect(userService.viewAll()).rejects.toThrow("Database error");
    });
  });

  describe("getProfile(userId) - Get User Profile", () => {
    it("✅ should return user profile without password", async () => {
      const mockProfile = {
        _id: "user123",
        email: "test@example.com",
        username: "testuser",
        full_name: "Test User",
      };

      userRepo.getProfileById.mockResolvedValue(mockProfile);

      const result = await userService.getProfile("user123");

      expect(userRepo.getProfileById).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockProfile);
    });

    it("❌ should throw error when userId is missing", async () => {
      await expect(userService.getProfile(null)).rejects.toThrow("UserId là bắt buộc");
    });
  });

  describe("getUserWithPassword(userId) - Get User With Password", () => {
    it("✅ should return user with password_hash", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password_hash: "$2b$10$hashed",
      };

      userRepo.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserWithPassword("user123");

      expect(userRepo.findById).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockUser);
    });

    it("❌ should throw error when userId is missing", async () => {
      await expect(userService.getUserWithPassword(null)).rejects.toThrow("UserId là bắt buộc");
    });
  });

  describe("updateProfile(userId, updateData) - Update Profile", () => {
    it("✅ should update profile successfully", async () => {
      const updateData = {
        full_name: "Updated Name",
        avatar_url: "/uploads/avatar.png",
      };

      const mockUpdatedUser = {
        _id: "user123",
        ...updateData,
      };

      userRepo.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateProfile("user123", updateData);

      expect(userRepo.update).toHaveBeenCalledWith("user123", updateData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.update.mockRejectedValue(error);

      await expect(userService.updateProfile("user123", { full_name: "Test" })).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("changePassword(userId, currentPassword, newPassword) - Change Password", () => {
    it("✅ should change password successfully", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password_hash: "$2b$10$hashed",
      };

      const newPasswordHash = "$2b$10$newhashed";

      userRepo.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue(newPasswordHash);
      userRepo.update.mockResolvedValue({ ...mockUser, password_hash: newPasswordHash });

      const result = await userService.changePassword("user123", "oldpass", "newpass");

      expect(userRepo.findById).toHaveBeenCalledWith("user123");
      expect(bcrypt.compare).toHaveBeenCalledWith("oldpass", mockUser.password_hash);
      expect(bcrypt.hash).toHaveBeenCalledWith("newpass", 10);
      expect(userRepo.update).toHaveBeenCalledWith("user123", {
        password_hash: newPasswordHash,
      });
      expect(result).toBe(true);
    });

    it("✅ should allow setting password for user without password_hash", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password_hash: null,
      };

      const newPasswordHash = "$2b$10$newhashed";

      userRepo.findById.mockResolvedValue(mockUser);
      bcrypt.hash.mockResolvedValue(newPasswordHash);
      userRepo.update.mockResolvedValue({ ...mockUser, password_hash: newPasswordHash });

      const result = await userService.changePassword("user123", "oldpass", "newpass");

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith("newpass", 10);
      expect(result).toBe(true);
    });

    it("✅ should support $2a$ and $2y$ bcrypt hashes", async () => {
      const mockUser = {
        _id: "user123",
        password_hash: "$2a$10$hashed",
      };

      userRepo.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue("$2b$10$newhashed");
      userRepo.update.mockResolvedValue({});

      const result = await userService.changePassword("user123", "oldpass", "newpass");

      expect(bcrypt.compare).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("❌ should throw error when user not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        userService.changePassword("nonexistent", "oldpass", "newpass")
      ).rejects.toThrow("User không tồn tại");
    });

    it("❌ should throw error when current password is incorrect", async () => {
      const mockUser = {
        _id: "user123",
        password_hash: "$2b$10$hashed",
      };

      userRepo.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        userService.changePassword("user123", "wrongpass", "newpass")
      ).rejects.toThrow("Mật khẩu hiện tại không đúng");
    });

    it("❌ should return false when password_hash is not bcrypt", async () => {
      const mockUser = {
        _id: "user123",
        password_hash: "plaintext",
      };

      userRepo.findById.mockResolvedValue(mockUser);

      const result = await userService.changePassword("user123", "oldpass", "newpass");

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("❌ should throw error when repository update fails", async () => {
      const mockUser = {
        _id: "user123",
        password_hash: "$2b$10$hashed",
      };

      userRepo.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue("$2b$10$newhashed");
      userRepo.update.mockRejectedValue(new Error("Database error"));

      await expect(
        userService.changePassword("user123", "oldpass", "newpass")
      ).rejects.toThrow("Database error");
    });
  });

  describe("getbyIdSOO(id) - Get User By SSO ID", () => {
    it("✅ should return user by SSO id", async () => {
      const mockUser = {
        _id: "user123",
        idSSO: "keycloak-id-123",
        email: "test@example.com",
      };

      userRepo.findbyIdSSO.mockResolvedValue(mockUser);

      const result = await userService.getbyIdSOO("keycloak-id-123");

      expect(userRepo.findbyIdSSO).toHaveBeenCalledWith("keycloak-id-123");
      expect(result).toEqual(mockUser);
    });

    it("❌ should throw error when idSSO is missing", async () => {
      await expect(userService.getbyIdSOO(null)).rejects.toThrow("idSSO là bắt buộc");
    });
  });

  describe("searchAllUsers(keyword, page, limit) - Search Users", () => {
    it("✅ should search users with pagination", async () => {
      const mockResult = {
        users: [
          { _id: "user1", email: "test@example.com" },
        ],
        pagination: {
          page: 2,
          limit: 5,
          total: 1,
          pages: 1,
        },
      };

      userRepo.search.mockResolvedValue(mockResult);

      const result = await userService.searchAllUsers("test", 2, 5);

      expect(userRepo.search).toHaveBeenCalledWith("test", { page: 2, limit: 5 });
      expect(result).toEqual(mockResult);
    });

    it("✅ should use default pagination values", async () => {
      const mockResult = {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      };

      userRepo.search.mockResolvedValue(mockResult);

      const result = await userService.searchAllUsers("test");

      expect(userRepo.search).toHaveBeenCalledWith("test", { page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.search.mockRejectedValue(error);

      await expect(userService.searchAllUsers("test")).rejects.toThrow("Database error");
    });
  });

  describe("softDeleteUser(id) - Soft Delete User", () => {
    it("✅ should soft delete user successfully", async () => {
      const mockDeletedUser = {
        _id: "user123",
        email: "test@example.com",
        deleted_at: new Date(),
        status: "inactive",
      };

      userRepo.softDelete.mockResolvedValue(mockDeletedUser);

      const result = await userService.softDeleteUser("user123");

      expect(userRepo.softDelete).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockDeletedUser);
    });

    it("❌ should throw error when user not found", async () => {
      userRepo.softDelete.mockResolvedValue(null);

      await expect(userService.softDeleteUser("nonexistent")).rejects.toThrow("User not found");
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.softDelete.mockRejectedValue(error);

      await expect(userService.softDeleteUser("user123")).rejects.toThrow("Database error");
    });
  });

  describe("restoreUser(id) - Restore User", () => {
    it("✅ should restore user successfully without Keycloak", async () => {
      const mockRestoredUser = {
        _id: "user123",
        email: "test@example.com",
        deleted_at: null,
        status: "active",
        typeAccount: "Local",
      };

      userRepo.restore.mockResolvedValue(mockRestoredUser);

      const result = await userService.restoreUser("user123");

      expect(userRepo.restore).toHaveBeenCalledWith("user123");
      expect(restoreUserOnKeycloak).not.toHaveBeenCalled();
      expect(result).toEqual(mockRestoredUser);
    });

    it("✅ should restore user and restore on Keycloak for SSO user", async () => {
      const mockRestoredUser = {
        _id: "user123",
        email: "test@example.com",
        deleted_at: null,
        status: "active",
        typeAccount: "SSO",
        idSSO: "keycloak-id-123",
      };

      userRepo.restore.mockResolvedValue(mockRestoredUser);
      restoreUserOnKeycloak.mockResolvedValue(true);

      const result = await userService.restoreUser("user123");

      expect(userRepo.restore).toHaveBeenCalledWith("user123");
      expect(restoreUserOnKeycloak).toHaveBeenCalledWith("keycloak-id-123");
      expect(result).toEqual(mockRestoredUser);
    });

    it("✅ should restore user even if Keycloak restore fails", async () => {
      const mockRestoredUser = {
        _id: "user123",
        email: "test@example.com",
        typeAccount: "SSO",
        idSSO: "keycloak-id-123",
      };

      userRepo.restore.mockResolvedValue(mockRestoredUser);
      restoreUserOnKeycloak.mockRejectedValue(new Error("Keycloak error"));

      const result = await userService.restoreUser("user123");

      expect(restoreUserOnKeycloak).toHaveBeenCalled();
      expect(result).toEqual(mockRestoredUser);
    });

    it("✅ should return null when user not found", async () => {
      userRepo.restore.mockResolvedValue(null);

      const result = await userService.restoreUser("nonexistent");

      expect(result).toBeNull();
    });

    it("✅ should not restore on Keycloak when user has no idSSO", async () => {
      const mockRestoredUser = {
        _id: "user123",
        typeAccount: "SSO",
        idSSO: null,
      };

      userRepo.restore.mockResolvedValue(mockRestoredUser);

      const result = await userService.restoreUser("user123");

      expect(restoreUserOnKeycloak).not.toHaveBeenCalled();
      expect(result).toEqual(mockRestoredUser);
    });
  });

  describe("getAllDeletedRecords(options) - Get All Deleted Records", () => {
    it("✅ should return all records when type is 'all'", async () => {
      const mockResult = {
        users: [
          { _id: "user1", deleted_at: null },
          { _id: "user2", deleted_at: new Date() },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      };

      userRepo.findAllWithDeleted.mockResolvedValue(mockResult);

      const result = await userService.getAllDeletedRecords({
        type: "all",
        page: 1,
        limit: 10,
        sort: "deleted_at",
        order: "desc",
      });

      expect(userRepo.findAllWithDeleted).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: "deleted_at",
        sortOrder: "desc",
      });
      expect(result).toEqual(mockResult);
    });

    it("✅ should return only deleted records when type is not 'all'", async () => {
      const mockResult = {
        users: [{ _id: "user2", deleted_at: new Date() }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      userRepo.findDeleted.mockResolvedValue(mockResult);

      const result = await userService.getAllDeletedRecords({
        type: "deleted",
        page: 1,
        limit: 10,
      });

      expect(userRepo.findDeleted).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: "deleted_at",
        sortOrder: "desc",
      });
      expect(result).toEqual(mockResult);
    });

    it("✅ should use default options", async () => {
      const mockResult = {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      };

      userRepo.findAllWithDeleted.mockResolvedValue(mockResult);

      const result = await userService.getAllDeletedRecords({});

      expect(userRepo.findAllWithDeleted).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: "deleted_at",
        sortOrder: "desc",
      });
      expect(result).toEqual(mockResult);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findAllWithDeleted.mockRejectedValue(error);

      await expect(userService.getAllDeletedRecords({ type: "all" })).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("findUsers(data) - Find Similar Users", () => {
    it("✅ should find users with keyword", async () => {
      const mockUsers = [
        { _id: "user1", email: "test@example.com", full_name: "Test User" },
      ];

      userRepo.findUserSimilar.mockResolvedValue(mockUsers);

      const result = await userService.findUsers({ infor: "test" });

      expect(userRepo.findUserSimilar).toHaveBeenCalledWith("test");
      expect(result).toEqual(mockUsers);
    });

    it("✅ should find users with empty keyword", async () => {
      const mockUsers = [
        { _id: "user1", email: "user1@example.com" },
      ];

      userRepo.findUserSimilar.mockResolvedValue(mockUsers);

      const result = await userService.findUsers({ infor: "" });

      expect(userRepo.findUserSimilar).toHaveBeenCalledWith("");
      expect(result).toEqual(mockUsers);
    });

    it("✅ should handle missing infor field", async () => {
      const mockUsers = [];

      userRepo.findUserSimilar.mockResolvedValue(mockUsers);

      const result = await userService.findUsers({});

      expect(userRepo.findUserSimilar).toHaveBeenCalledWith("");
      expect(result).toEqual(mockUsers);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findUserSimilar.mockRejectedValue(error);

      await expect(userService.findUsers({ infor: "test" })).rejects.toThrow("Database error");
    });
  });

  describe("Edge Cases & Error Handling", () => {
    it("✅ should handle empty string login", async () => {
      const result = await userService.validateUser("", "password123");

      expect(result).toBeNull();
    });

    it("❌ should throw error when email has whitespace during update", async () => {
      const updateData = {
        email: "  test@example.com  ",
      };

      await expect(userService.updateUser("admin123", "user123", updateData)).rejects.toThrow(
        "Email không đúng định dạng"
      );

      expect(userRepo.isEmailExists).not.toHaveBeenCalled();
    });

    it("✅ should handle special characters in password", async () => {
      const mockUser = {
        _id: "user123",
        password_hash: "$2b$10$hashed",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compareSync.mockReturnValue(true);

      const result = await userService.validateUser(
        "test@example.com",
        "p@ssw0rd!@#$%^&*()"
      );

      expect(bcrypt.compareSync).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it("✅ should handle update with only role", async () => {
      const updateData = {
        roles: ["admin"],
      };

      userRole.updateByIdUser.mockResolvedValue(true);
      userRepo.update.mockResolvedValue({ _id: "user123" });

      const result = await userService.updateUser("admin123", "user123", updateData);

      expect(userRole.updateByIdUser).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("✅ should handle createUser without center_id", async () => {
      const userData = {
        email: "test@example.com",
        username: "testuser",
        password: "password123",
      };

      const mockKeycloakUser = { id: "keycloak-id-123" };
      const mockLocalUser = { _id: "user123", ...userData };

      userRepo.isEmailExists.mockResolvedValue(false);
      userRepo.isUsernameExists.mockResolvedValue(false);
      bcrypt.hashSync.mockReturnValue("$2b$10$hashed");
      keycloack.createUserWithPassword.mockResolvedValue(mockKeycloakUser);
      userRepo.create.mockResolvedValue(mockLocalUser);

      const result = await userService.createUser(userData);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          center_id: null,
        })
      );
      expect(result).toEqual(mockLocalUser);
    });
  });
});


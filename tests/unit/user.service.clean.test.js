// 📄 tests/unit/user.service.clean.test.js - User Service Clean Unit Tests
jest.mock("../../repositories/user.repository");
jest.mock("bcrypt");

const userService = require("../../services/user.service.clean");
const userRepo = require("../../repositories/user.repository");
const bcrypt = require("bcrypt");

describe("🔹 User Service Clean Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it("✅ should validate password from legacy password field", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password: "$2b$10$hashedpassword",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compareSync.mockReturnValue(true);

      const result = await userService.validateUser("test@example.com", "password123");

      expect(bcrypt.compareSync).toHaveBeenCalledWith("password123", mockUser.password);
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

    it("❌ should return null when password is incorrect (bcrypt)", async () => {
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

    it("❌ should return null when password is incorrect (plain text)", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password_hash: "correctpassword",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.validateUser("test@example.com", "wrongpassword");

      expect(result).toBeNull();
    });

    it("❌ should return null when user has no password", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.validateUser("test@example.com", "password123");

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

    it("✅ should validate plain text password (legacy field)", () => {
      const user = {
        password: "plaintext",
      };

      const result = userService._validatePassword("plaintext", user);

      expect(bcrypt.compareSync).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("❌ should return false when password_hash doesn't match", () => {
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

    it("❌ should return false when bcrypt comparison fails", () => {
      const user = {
        password_hash: "$2b$10$hashedpassword",
      };

      bcrypt.compareSync.mockReturnValue(false);
      const result = userService._validatePassword("wrongpassword", user);

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

    it("✅ should return null when user not found", async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      const result = await userService.getUserByEmail("nonexistent@example.com");

      expect(result).toBeNull();
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

    it("✅ should return null when user not found", async () => {
      userRepo.findByUsername.mockResolvedValue(null);

      const result = await userService.getUserByUsername("nonexistent");

      expect(result).toBeNull();
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findByUsername.mockRejectedValue(error);

      await expect(userService.getUserByUsername("testuser")).rejects.toThrow("Database error");
    });
  });

  describe("createUser(userData) - Create User", () => {
    it("✅ should create user with password hashing", async () => {
      const userData = {
        email: "newuser@example.com",
        username: "newuser",
        password: "plainpassword",
        full_name: "New User",
      };

      const mockCreatedUser = {
        _id: "user123",
        email: userData.email,
        username: userData.username,
        password_hash: "$2b$10$hashed",
      };

      bcrypt.hashSync.mockReturnValue("$2b$10$hashed");
      userRepo.create.mockResolvedValue(mockCreatedUser);

      const result = await userService.createUser(userData);

      expect(bcrypt.hashSync).toHaveBeenCalledWith("plainpassword", 10);
      expect(userData.password_hash).toBe("$2b$10$hashed");
      expect(userData.password).toBeUndefined();
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          username: userData.username,
          password_hash: "$2b$10$hashed",
        })
      );
      expect(result).toEqual(mockCreatedUser);
    });

    it("✅ should create user without password", async () => {
      const userData = {
        email: "newuser@example.com",
        username: "newuser",
        full_name: "New User",
      };

      const mockCreatedUser = {
        _id: "user123",
        ...userData,
      };

      userRepo.create.mockResolvedValue(mockCreatedUser);

      const result = await userService.createUser(userData);

      expect(bcrypt.hashSync).not.toHaveBeenCalled();
      expect(userData.password_hash).toBeUndefined();
      expect(userRepo.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockCreatedUser);
    });

    it("❌ should throw error when repository fails", async () => {
      const userData = {
        email: "newuser@example.com",
        password: "password123",
      };

      bcrypt.hashSync.mockReturnValue("$2b$10$hashed");
      const error = new Error("Duplicate email");
      userRepo.create.mockRejectedValue(error);

      await expect(userService.createUser(userData)).rejects.toThrow("Duplicate email");
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

    it("✅ should preserve existing typeAccount if set", async () => {
      const userData = {
        email: "sso@example.com",
        typeAccount: "SSO",
      };

      userRepo.create.mockResolvedValue({ _id: "user123", ...userData });

      await userService.createUserSSO(userData);

      expect(userData.typeAccount).toBe("SSO");
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

  describe("updateUser(id, updateData) - Update User", () => {
    it("✅ should update user without password", async () => {
      const updateData = {
        full_name: "Updated Name",
        email: "updated@example.com",
      };

      const mockUpdatedUser = {
        _id: "user123",
        ...updateData,
      };

      userRepo.updateById.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser("user123", updateData);

      expect(bcrypt.hashSync).not.toHaveBeenCalled();
      expect(userRepo.updateById).toHaveBeenCalledWith("user123", updateData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it("✅ should update user with password hashing", async () => {
      const updateData = {
        full_name: "Updated Name",
        password: "newpassword",
      };

      const mockUpdatedUser = {
        _id: "user123",
        full_name: "Updated Name",
        password_hash: "$2b$10$hashed",
      };

      bcrypt.hashSync.mockReturnValue("$2b$10$hashed");
      userRepo.updateById.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser("user123", updateData);

      expect(bcrypt.hashSync).toHaveBeenCalledWith("newpassword", 10);
      expect(updateData.password_hash).toBe("$2b$10$hashed");
      expect(updateData.password).toBeUndefined();
      expect(userRepo.updateById).toHaveBeenCalledWith(
        "user123",
        expect.objectContaining({
          full_name: "Updated Name",
          password_hash: "$2b$10$hashed",
        })
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it("❌ should throw error when repository fails", async () => {
      const updateData = { full_name: "Updated" };
      const error = new Error("User not found");
      userRepo.updateById.mockRejectedValue(error);

      await expect(userService.updateUser("user123", updateData)).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("deleteUser(id) - Delete User (Hard Delete)", () => {
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
    it("✅ should restore user successfully", async () => {
      const mockRestoredUser = {
        _id: "user123",
        email: "test@example.com",
        deleted_at: null,
        status: "active",
      };

      userRepo.restore.mockResolvedValue(mockRestoredUser);

      const result = await userService.restoreUser("user123");

      expect(userRepo.restore).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockRestoredUser);
    });

    it("❌ should throw error when user not found or not deleted", async () => {
      userRepo.restore.mockResolvedValue(null);

      await expect(userService.restoreUser("nonexistent")).rejects.toThrow(
        "User not found or not deleted"
      );
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.restore.mockRejectedValue(error);

      await expect(userService.restoreUser("user123")).rejects.toThrow("Database error");
    });
  });

  describe("getAllUsersWithDeleted(options) - Get All Users Including Deleted", () => {
    it("✅ should return all users including deleted", async () => {
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

      const result = await userService.getAllUsersWithDeleted({ page: 1, limit: 10 });

      expect(userRepo.findAllWithDeleted).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });

    it("✅ should return users with default options", async () => {
      const mockResult = {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      };

      userRepo.findAllWithDeleted.mockResolvedValue(mockResult);

      const result = await userService.getAllUsersWithDeleted();

      expect(userRepo.findAllWithDeleted).toHaveBeenCalledWith({});
      expect(result).toEqual(mockResult);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.findAllWithDeleted.mockRejectedValue(error);

      await expect(userService.getAllUsersWithDeleted()).rejects.toThrow("Database error");
    });
  });

  describe("searchUsers(keyword, options) - Search Users", () => {
    it("✅ should search users with keyword", async () => {
      const mockResult = {
        users: [
          { _id: "user1", email: "test@example.com", full_name: "Test User" },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      userRepo.search.mockResolvedValue(mockResult);

      const result = await userService.searchUsers("test", { page: 1, limit: 10 });

      expect(userRepo.search).toHaveBeenCalledWith("test", { page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });

    it("✅ should search users with default options", async () => {
      const mockResult = {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      };

      userRepo.search.mockResolvedValue(mockResult);

      const result = await userService.searchUsers("test");

      expect(userRepo.search).toHaveBeenCalledWith("test", {});
      expect(result).toEqual(mockResult);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.search.mockRejectedValue(error);

      await expect(userService.searchUsers("test")).rejects.toThrow("Database error");
    });
  });

  describe("searchAllUsers(keyword, page, limit) - Search All Users", () => {
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

      userRepo.searchAll.mockResolvedValue(mockResult);

      const result = await userService.searchAllUsers("test", 2, 5);

      expect(userRepo.searchAll).toHaveBeenCalledWith("test", 2, 5);
      expect(result).toEqual(mockResult);
    });

    it("✅ should use default pagination values", async () => {
      const mockResult = {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      };

      userRepo.searchAll.mockResolvedValue(mockResult);

      const result = await userService.searchAllUsers("test");

      expect(userRepo.searchAll).toHaveBeenCalledWith("test", 1, 10);
      expect(result).toEqual(mockResult);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRepo.searchAll.mockRejectedValue(error);

      await expect(userService.searchAllUsers("test")).rejects.toThrow("Database error");
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

      await expect(
        userService.getAllDeletedRecords({ type: "all" })
      ).rejects.toThrow("Database error");
    });
  });

  describe("Edge Cases & Error Handling", () => {
    it("✅ should handle empty string login", async () => {
      const result = await userService.validateUser("", "password123");

      expect(result).toBeNull();
      expect(userRepo.findByEmail).not.toHaveBeenCalled();
    });

    it("✅ should handle empty string password", async () => {
      const result = await userService.validateUser("test@example.com", "");

      expect(result).toBeNull();
      expect(userRepo.findByEmail).not.toHaveBeenCalled();
    });

    it("✅ should handle whitespace in login", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password_hash: "$2b$10$hashed",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compareSync.mockReturnValue(true);

      const result = await userService.validateUser("  test@example.com  ", "password123");

      expect(userRepo.findByEmail).toHaveBeenCalledWith("  test@example.com  ");
      expect(result).toEqual(mockUser);
    });

    it("✅ should handle special characters in password", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password_hash: "$2b$10$hashed",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compareSync.mockReturnValue(true);

      const result = await userService.validateUser(
        "test@example.com",
        "p@ssw0rd!@#$%^&*()"
      );

      expect(bcrypt.compareSync).toHaveBeenCalledWith(
        "p@ssw0rd!@#$%^&*()",
        mockUser.password_hash
      );
      expect(result).toEqual(mockUser);
    });

    it("✅ should handle very long password", async () => {
      const longPassword = "A".repeat(200);
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password_hash: "$2b$10$hashed",
      };

      userRepo.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compareSync.mockReturnValue(true);

      const result = await userService.validateUser("test@example.com", longPassword);

      expect(bcrypt.compareSync).toHaveBeenCalledWith(longPassword, mockUser.password_hash);
      expect(result).toEqual(mockUser);
    });

    it("✅ should handle update with empty updateData", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
      };

      userRepo.updateById.mockResolvedValue(mockUser);

      const result = await userService.updateUser("user123", {});

      expect(userRepo.updateById).toHaveBeenCalledWith("user123", {});
      expect(result).toEqual(mockUser);
    });

    it("✅ should handle search with empty keyword", async () => {
      const mockResult = {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      };

      userRepo.searchAll.mockResolvedValue(mockResult);

      const result = await userService.searchAllUsers("");

      expect(userRepo.searchAll).toHaveBeenCalledWith("", 1, 10);
      expect(result).toEqual(mockResult);
    });

    it("✅ should handle getAllDeletedRecords with custom sort", async () => {
      const mockResult = {
        users: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      };

      userRepo.findAllWithDeleted.mockResolvedValue(mockResult);

      const result = await userService.getAllDeletedRecords({
        type: "all",
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "asc",
      });

      expect(userRepo.findAllWithDeleted).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sortBy: "created_at",
        sortOrder: "asc",
      });
      expect(result).toEqual(mockResult);
    });
  });
});


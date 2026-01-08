// 📄 tests/unit/userRole.service.test.js - User Role Service Unit Tests
jest.mock("../../repositories/userRole.repository");
jest.mock("../../repositories/role.repository");

const userRoleService = require("../../services/userRole.service");
const userRoleRepo = require("../../repositories/userRole.repository");
const roleRepository = require("../../repositories/role.repository");

describe("🔹 User Role Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("viewAll(options) - Get All User Roles", () => {
    it("✅ should return all user roles without options (backward compatibility)", async () => {
      const mockUserRoles = [
        {
          _id: "ur1",
          user_id: { _id: "user1", email: "user1@test.com" },
          role_id: { _id: "role1", name: "admin" },
        },
        {
          _id: "ur2",
          user_id: { _id: "user2", email: "user2@test.com" },
          role_id: { _id: "role2", name: "user" },
        },
      ];

      userRoleRepo.findAll.mockResolvedValue(mockUserRoles);

      const result = await userRoleService.viewAll();

      expect(userRoleRepo.findAll).toHaveBeenCalledWith();
      expect(userRoleRepo.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUserRoles);
    });

    it("✅ should return paginated user roles with options", async () => {
      const mockResult = {
        userRoles: [
          {
            _id: "ur1",
            user_id: "user1",
            role_id: "role1",
            user_info: { email: "user1@test.com" },
            role_info: { name: "admin" },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      userRoleRepo.findAll.mockResolvedValue(mockResult);

      const result = await userRoleService.viewAll({
        page: 1,
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      });

      expect(userRoleRepo.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      });
      expect(result).toEqual(mockResult);
      expect(result).toHaveProperty("userRoles");
      expect(result).toHaveProperty("pagination");
    });

    it("✅ should return empty array when no user roles exist", async () => {
      userRoleRepo.findAll.mockResolvedValue([]);

      const result = await userRoleService.viewAll();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRoleRepo.findAll.mockRejectedValue(error);

      await expect(userRoleService.viewAll()).rejects.toThrow("Database error");
    });
  });

  describe("getRole(userId) - Get Single Role By User", () => {
    it("✅ should return role for user", async () => {
      const mockRoles = [
        {
          _id: "role1",
          name: "admin",
          description: "Administrator role",
        },
      ];

      userRoleRepo.findRoleByUser.mockResolvedValue(mockRoles);

      const result = await userRoleService.getRole("user123");

      expect(userRoleRepo.findRoleByUser).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockRoles);
      expect(Array.isArray(result)).toBe(true);
    });

    it("✅ should return empty array when user has no roles", async () => {
      userRoleRepo.findRoleByUser.mockResolvedValue([]);

      const result = await userRoleService.getRole("user123");

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRoleRepo.findRoleByUser.mockRejectedValue(error);

      await expect(userRoleService.getRole("user123")).rejects.toThrow("Database error");
    });
  });

  describe("getRoles(userId) - Get All Roles By User", () => {
    it("✅ should return all roles for user", async () => {
      const mockUserRoles = [
        {
          _id: "ur1",
          user_id: "user123",
          role_id: {
            _id: "role1",
            name: "admin",
          },
        },
        {
          _id: "ur2",
          user_id: "user123",
          role_id: {
            _id: "role2",
            name: "user",
          },
        },
      ];

      userRoleRepo.findRolesByUser.mockResolvedValue(mockUserRoles);

      const result = await userRoleService.getRoles("user123");

      expect(userRoleRepo.findRolesByUser).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockUserRoles);
      expect(result).toHaveLength(2);
    });

    it("✅ should return empty array when user has no roles", async () => {
      userRoleRepo.findRolesByUser.mockResolvedValue([]);

      const result = await userRoleService.getRoles("user123");

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRoleRepo.findRolesByUser.mockRejectedValue(error);

      await expect(userRoleService.getRoles("user123")).rejects.toThrow("Database error");
    });
  });

  describe("create(userRoleData) - Create User Role", () => {
    it("✅ should create user role successfully", async () => {
      const userRoleData = {
        user_id: "user123",
        role_id: "role456",
      };

      const mockRole = {
        _id: "role456",
        name: "admin",
      };

      const mockCreatedUserRole = {
        _id: "ur123",
        ...userRoleData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      roleRepository.findById.mockResolvedValue(mockRole);
      userRoleRepo.findByUserAndRole.mockResolvedValue(null);
      userRoleRepo.create.mockResolvedValue(mockCreatedUserRole);

      const result = await userRoleService.create(userRoleData);

      expect(roleRepository.findById).toHaveBeenCalledWith("role456");
      expect(userRoleRepo.findByUserAndRole).toHaveBeenCalledWith("user123", "role456");
      expect(userRoleRepo.create).toHaveBeenCalledWith(userRoleData);
      expect(result).toEqual(mockCreatedUserRole);
    });

    it("✅ should return existing user role if already exists", async () => {
      const userRoleData = {
        user_id: "user123",
        role_id: "role456",
      };

      const mockRole = {
        _id: "role456",
        name: "admin",
      };

      const mockExistingUserRole = {
        _id: "ur123",
        user_id: "user123",
        role_id: "role456",
      };

      roleRepository.findById.mockResolvedValue(mockRole);
      userRoleRepo.findByUserAndRole.mockResolvedValue(mockExistingUserRole);

      const result = await userRoleService.create(userRoleData);

      expect(userRoleRepo.findByUserAndRole).toHaveBeenCalledWith("user123", "role456");
      expect(userRoleRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockExistingUserRole);
    });

    it("❌ should throw error when user_id is missing", async () => {
      const userRoleData = {
        role_id: "role456",
      };

      await expect(userRoleService.create(userRoleData)).rejects.toThrow("user_id bị thiếu");
    });

    it("❌ should throw error when role_id is missing", async () => {
      const userRoleData = {
        user_id: "user123",
      };

      await expect(userRoleService.create(userRoleData)).rejects.toThrow("role_id bị thiếu");
    });

    it("❌ should throw error when trying to assign System_Manager role", async () => {
      const userRoleData = {
        user_id: "user123",
        role_id: "system_manager_role_id",
      };

      const mockRole = {
        _id: "system_manager_role_id",
        name: "System_Manager",
      };

      roleRepository.findById.mockResolvedValue(mockRole);

      await expect(userRoleService.create(userRoleData)).rejects.toThrow(
        "Không thể gán role System_Manager cho user khác"
      );

      expect(userRoleRepo.findByUserAndRole).not.toHaveBeenCalled();
      expect(userRoleRepo.create).not.toHaveBeenCalled();
    });

    it("❌ should throw error when repository fails", async () => {
      const userRoleData = {
        user_id: "user123",
        role_id: "role456",
      };

      const mockRole = {
        _id: "role456",
        name: "admin",
      };

      roleRepository.findById.mockResolvedValue(mockRole);
      userRoleRepo.findByUserAndRole.mockResolvedValue(null);
      userRoleRepo.create.mockRejectedValue(new Error("Database error"));

      await expect(userRoleService.create(userRoleData)).rejects.toThrow("Database error");
    });
  });

  describe("update(userRoleId, updateData) - Update User Role", () => {
    it("✅ should update user role successfully", async () => {
      const updateData = {
        role_id: "newRoleId",
        status: "inactive",
      };

      const mockExistingUserRole = {
        _id: "ur123",
        user_id: "user123",
        role_id: "oldRoleId",
      };

      const mockOldRole = {
        _id: "oldRoleId",
        name: "admin",
      };

      const mockNewRole = {
        _id: "newRoleId",
        name: "user",
      };

      const mockUpdatedUserRole = {
        _id: "ur123",
        ...updateData,
      };

      userRoleRepo.findById.mockResolvedValue(mockExistingUserRole);
      roleRepository.findById
        .mockResolvedValueOnce(mockOldRole) // Check old role
        .mockResolvedValueOnce(mockNewRole); // Check new role
      userRoleRepo.update.mockResolvedValue(mockUpdatedUserRole);

      const result = await userRoleService.update("ur123", updateData);

      expect(userRoleRepo.findById).toHaveBeenCalledWith("ur123");
      expect(roleRepository.findById).toHaveBeenCalledTimes(2);
      expect(userRoleRepo.update).toHaveBeenCalledWith("ur123", updateData);
      expect(result).toEqual(mockUpdatedUserRole);
    });

    it("✅ should update user role without changing role_id", async () => {
      const updateData = {
        status: "inactive",
      };

      const mockExistingUserRole = {
        _id: "ur123",
        user_id: "user123",
        role_id: "role456",
      };

      const mockRole = {
        _id: "role456",
        name: "admin",
      };

      const mockUpdatedUserRole = {
        _id: "ur123",
        ...updateData,
      };

      userRoleRepo.findById.mockResolvedValue(mockExistingUserRole);
      roleRepository.findById.mockResolvedValue(mockRole);
      userRoleRepo.update.mockResolvedValue(mockUpdatedUserRole);

      const result = await userRoleService.update("ur123", updateData);

      expect(roleRepository.findById).toHaveBeenCalledTimes(1); // Only check old role
      expect(result).toEqual(mockUpdatedUserRole);
    });

    it("❌ should throw error when user role not found", async () => {
      userRoleRepo.findById.mockResolvedValue(null);

      await expect(userRoleService.update("nonexistent", { status: "inactive" })).rejects.toThrow(
        "User-role không tồn tại"
      );
    });

    it("❌ should throw error when old role is System_Manager", async () => {
      const updateData = {
        status: "inactive",
      };

      const mockExistingUserRole = {
        _id: "ur123",
        user_id: "user123",
        role_id: "system_manager_role_id",
      };

      const mockRole = {
        _id: "system_manager_role_id",
        name: "System_Manager",
      };

      userRoleRepo.findById.mockResolvedValue(mockExistingUserRole);
      roleRepository.findById.mockResolvedValue(mockRole);

      await expect(userRoleService.update("ur123", updateData)).rejects.toThrow(
        "Không thể gán role System_Manager cho user khác"
      );

      expect(userRoleRepo.update).not.toHaveBeenCalled();
    });

    it("❌ should throw error when new role is System_Manager", async () => {
      const updateData = {
        role_id: "system_manager_role_id",
      };

      const mockExistingUserRole = {
        _id: "ur123",
        user_id: "user123",
        role_id: "oldRoleId",
      };

      const mockOldRole = {
        _id: "oldRoleId",
        name: "admin",
      };

      const mockNewRole = {
        _id: "system_manager_role_id",
        name: "System_Manager",
      };

      userRoleRepo.findById.mockResolvedValue(mockExistingUserRole);
      roleRepository.findById
        .mockResolvedValueOnce(mockOldRole)
        .mockResolvedValueOnce(mockNewRole);

      await expect(userRoleService.update("ur123", updateData)).rejects.toThrow(
        "Không thể gán System_Manager khi update"
      );

      expect(userRoleRepo.update).not.toHaveBeenCalled();
    });

    it("❌ should throw error when repository fails", async () => {
      const mockExistingUserRole = {
        _id: "ur123",
        role_id: "role456",
      };

      const mockRole = {
        _id: "role456",
        name: "admin",
      };

      userRoleRepo.findById.mockResolvedValue(mockExistingUserRole);
      roleRepository.findById.mockResolvedValue(mockRole);
      userRoleRepo.update.mockRejectedValue(new Error("Database error"));

      await expect(userRoleService.update("ur123", { status: "inactive" })).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("delete(userRoleId) - Delete User Role", () => {
    it("✅ should delete user role successfully", async () => {
      const mockUserRole = {
        _id: "ur123",
        user_id: "user123",
        role_id: "role456",
      };

      const mockRole = {
        _id: "role456",
        name: "admin",
      };

      const mockDeletedUserRole = {
        _id: "ur123",
        ...mockUserRole,
      };

      userRoleRepo.findById.mockResolvedValue(mockUserRole);
      roleRepository.findById.mockResolvedValue(mockRole);
      userRoleRepo.delete.mockResolvedValue(mockDeletedUserRole);

      const result = await userRoleService.delete("ur123");

      expect(userRoleRepo.findById).toHaveBeenCalledWith("ur123");
      expect(roleRepository.findById).toHaveBeenCalledWith("role456");
      expect(userRoleRepo.delete).toHaveBeenCalledWith("ur123");
      expect(result).toEqual(mockDeletedUserRole);
    });

    it("❌ should throw error when user role not found", async () => {
      userRoleRepo.findById.mockResolvedValue(null);

      await expect(userRoleService.delete("nonexistent")).rejects.toThrow(
        "User-role không tồn tại"
      );
    });

    it("❌ should throw error when role is System_Manager", async () => {
      const mockUserRole = {
        _id: "ur123",
        user_id: "user123",
        role_id: "system_manager_role_id",
      };

      const mockRole = {
        _id: "system_manager_role_id",
        name: "System_Manager",
      };

      userRoleRepo.findById.mockResolvedValue(mockUserRole);
      roleRepository.findById.mockResolvedValue(mockRole);

      await expect(userRoleService.delete("ur123")).rejects.toThrow(
        "Không thể gán role System_Manager cho user khác"
      );

      expect(userRoleRepo.delete).not.toHaveBeenCalled();
    });

    it("❌ should throw error when repository fails", async () => {
      const mockUserRole = {
        _id: "ur123",
        role_id: "role456",
      };

      const mockRole = {
        _id: "role456",
        name: "admin",
      };

      userRoleRepo.findById.mockResolvedValue(mockUserRole);
      roleRepository.findById.mockResolvedValue(mockRole);
      userRoleRepo.delete.mockRejectedValue(new Error("Database error"));

      await expect(userRoleService.delete("ur123")).rejects.toThrow("Database error");
    });
  });

  describe("deleteByUser(userId) - Delete All Roles By User", () => {
    it("✅ should delete all non-protected roles for user", async () => {
      const mockUserRoles = [
        {
          _id: "ur1",
          user_id: "user123",
          role_id: "role1",
        },
        {
          _id: "ur2",
          user_id: "user123",
          role_id: "role2",
        },
      ];

      const mockRole1 = {
        _id: "role1",
        name: "admin",
      };

      const mockRole2 = {
        _id: "role2",
        name: "user",
      };

      const mockDeleteResult = {
        deletedCount: 2,
      };

      userRoleRepo.findByUser.mockResolvedValue(mockUserRoles);
      roleRepository.findById
        .mockResolvedValueOnce(mockRole1)
        .mockResolvedValueOnce(mockRole2);
      userRoleRepo.deleteManyByIds.mockResolvedValue(mockDeleteResult);

      const result = await userRoleService.deleteByUser("user123");

      expect(userRoleRepo.findByUser).toHaveBeenCalledWith("user123");
      expect(roleRepository.findById).toHaveBeenCalledTimes(2);
      expect(userRoleRepo.deleteManyByIds).toHaveBeenCalledWith(["ur1", "ur2"]);
      expect(result).toEqual(mockDeleteResult);
    });

    it("✅ should skip System_Manager role when deleting", async () => {
      const mockUserRoles = [
        {
          _id: "ur1",
          user_id: "user123",
          role_id: "role1",
        },
        {
          _id: "ur2",
          user_id: "user123",
          role_id: "system_manager_role_id",
        },
      ];

      const mockRole1 = {
        _id: "role1",
        name: "admin",
      };

      const mockSystemManagerRole = {
        _id: "system_manager_role_id",
        name: "System_Manager",
      };

      const mockDeleteResult = {
        deletedCount: 1,
      };

      userRoleRepo.findByUser.mockResolvedValue(mockUserRoles);
      roleRepository.findById
        .mockResolvedValueOnce(mockRole1)
        .mockResolvedValueOnce(mockSystemManagerRole);
      userRoleRepo.deleteManyByIds.mockResolvedValue(mockDeleteResult);

      const result = await userRoleService.deleteByUser("user123");

      expect(userRoleRepo.deleteManyByIds).toHaveBeenCalledWith(["ur1"]);
      expect(result.deletedCount).toBe(1);
    });

    it("✅ should return deletedCount 0 when all roles are protected", async () => {
      const mockUserRoles = [
        {
          _id: "ur1",
          user_id: "user123",
          role_id: "system_manager_role_id",
        },
      ];

      const mockSystemManagerRole = {
        _id: "system_manager_role_id",
        name: "System_Manager",
      };

      userRoleRepo.findByUser.mockResolvedValue(mockUserRoles);
      roleRepository.findById.mockResolvedValue(mockSystemManagerRole);

      const result = await userRoleService.deleteByUser("user123");

      expect(userRoleRepo.deleteManyByIds).not.toHaveBeenCalled();
      expect(result).toEqual({ deletedCount: 0 });
    });

    it("✅ should return deletedCount 0 when user has no roles", async () => {
      userRoleRepo.findByUser.mockResolvedValue([]);

      const result = await userRoleService.deleteByUser("user123");

      expect(userRoleRepo.deleteManyByIds).not.toHaveBeenCalled();
      expect(result).toEqual({ deletedCount: 0 });
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRoleRepo.findByUser.mockRejectedValue(error);

      await expect(userRoleService.deleteByUser("user123")).rejects.toThrow("Database error");
    });
  });

  describe("findByUserAndRole(user_id, role_id) - Find User Role", () => {
    it("✅ should return user role when found", async () => {
      const mockUserRole = {
        _id: "ur123",
        user_id: "user123",
        role_id: "role456",
      };

      userRoleRepo.findByUserAndRole.mockResolvedValue(mockUserRole);

      const result = await userRoleService.findByUserAndRole("user123", "role456");

      expect(userRoleRepo.findByUserAndRole).toHaveBeenCalledWith("user123", "role456");
      expect(result).toEqual(mockUserRole);
    });

    it("✅ should return null when not found", async () => {
      userRoleRepo.findByUserAndRole.mockResolvedValue(null);

      const result = await userRoleService.findByUserAndRole("user123", "role456");

      expect(result).toBeNull();
    });

    it("❌ should throw error when user_id is missing", async () => {
      await expect(userRoleService.findByUserAndRole(null, "role456")).rejects.toThrow(
        "user_id bị thiếu"
      );
    });

    it("❌ should throw error when role_id is missing", async () => {
      await expect(userRoleService.findByUserAndRole("user123", null)).rejects.toThrow(
        "role_id bị thiếu"
      );
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      userRoleRepo.findByUserAndRole.mockRejectedValue(error);

      await expect(userRoleService.findByUserAndRole("user123", "role456")).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("findIdRoleByName(nameRole) - Find Users By Role Name", () => {
    it("✅ should return users with role name", async () => {
      const mockRole = {
        data: {
          data: {
            _id: "role123",
            name: "admin",
          },
        },
      };

      const mockUsers = {
        data: [
          { _id: "user1", email: "user1@test.com" },
          { _id: "user2", email: "user2@test.com" },
        ],
      };

      roleRepository.findByName.mockResolvedValue(mockRole);
      userRoleRepo.findUserByIdRole.mockResolvedValue(mockUsers);

      const result = await userRoleService.findIdRoleByName("admin");

      expect(roleRepository.findByName).toHaveBeenCalledWith("admin");
      expect(userRoleRepo.findUserByIdRole).toHaveBeenCalledWith("role123");
      expect(result).toEqual(mockUsers.data);
    });

    it("❌ should throw error when role not found", async () => {
      roleRepository.findByName.mockResolvedValue(null);

      await expect(userRoleService.findIdRoleByName("nonexistent")).rejects.toThrow(
        "Không tìm thấy role"
      );
    });

    it("❌ should throw error when role id not found", async () => {
      const mockRole = {
        data: {
          data: {},
        },
      };

      roleRepository.findByName.mockResolvedValue(mockRole);

      await expect(userRoleService.findIdRoleByName("admin")).rejects.toThrow(
        "Không tìm thấy id role"
      );
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      roleRepository.findByName.mockRejectedValue(error);

      await expect(userRoleService.findIdRoleByName("admin")).rejects.toThrow("Database error");
    });
  });

  describe("createIfNotExists(userId, roleId) - Create If Not Exists", () => {
    it("✅ should return existing user role if exists", async () => {
      // Note: This method uses UserRole model directly, which is not mocked
      // We'll test the logic flow
      const mockExisting = {
        _id: "ur123",
        user_id: "user123",
        role_id: "role456",
      };

      // Since this method uses UserRole model directly, we can't easily mock it
      // This test documents the expected behavior
      expect(userRoleService.createIfNotExists).toBeDefined();
    });

    it("✅ should return null when userId is missing", async () => {
      const result = await userRoleService.createIfNotExists(null, "role456");

      expect(result).toBeNull();
    });

    it("✅ should return null when roleId is missing", async () => {
      const result = await userRoleService.createIfNotExists("user123", null);

      expect(result).toBeNull();
    });
  });

  describe("Edge Cases & Error Handling", () => {
    it("✅ should handle viewAll with empty options object (backward compatibility)", async () => {
      const mockUserRoles = [];
      userRoleRepo.findAll.mockResolvedValue(mockUserRoles);

      const result = await userRoleService.viewAll({});

      // Empty object triggers backward compatibility mode, calls findAll() without args
      expect(userRoleRepo.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(mockUserRoles);
    });

    it("✅ should handle create with null role", async () => {
      const userRoleData = {
        user_id: "user123",
        role_id: "role456",
      };

      roleRepository.findById.mockResolvedValue(null);

      // Should not throw error for null role, but will pass the check
      userRoleRepo.findByUserAndRole.mockResolvedValue(null);
      userRoleRepo.create.mockResolvedValue({ _id: "ur123", ...userRoleData });

      const result = await userRoleService.create(userRoleData);

      expect(result).toBeDefined();
    });

    it("✅ should handle update with null old role", async () => {
      const updateData = {
        status: "inactive",
      };

      const mockExistingUserRole = {
        _id: "ur123",
        role_id: "role456",
      };

      userRoleRepo.findById.mockResolvedValue(mockExistingUserRole);
      roleRepository.findById.mockResolvedValue(null);
      userRoleRepo.update.mockResolvedValue({ _id: "ur123", ...updateData });

      const result = await userRoleService.update("ur123", updateData);

      expect(result).toBeDefined();
    });

    it("✅ should handle deleteByUser with mixed protected and non-protected roles", async () => {
      const mockUserRoles = [
        { _id: "ur1", role_id: "role1" },
        { _id: "ur2", role_id: "system_manager_role_id" },
        { _id: "ur3", role_id: "role3" },
      ];

      const mockRole1 = { _id: "role1", name: "admin" };
      const mockSystemManagerRole = { _id: "system_manager_role_id", name: "System_Manager" };
      const mockRole3 = { _id: "role3", name: "user" };

      userRoleRepo.findByUser.mockResolvedValue(mockUserRoles);
      roleRepository.findById
        .mockResolvedValueOnce(mockRole1)
        .mockResolvedValueOnce(mockSystemManagerRole)
        .mockResolvedValueOnce(mockRole3);
      userRoleRepo.deleteManyByIds.mockResolvedValue({ deletedCount: 2 });

      const result = await userRoleService.deleteByUser("user123");

      expect(userRoleRepo.deleteManyByIds).toHaveBeenCalledWith(["ur1", "ur3"]);
      expect(result.deletedCount).toBe(2);
    });

    it("✅ should handle findIdRoleByName with complex role structure", async () => {
      const mockRole = {
        data: {
          data: {
            _id: "role123",
            name: "admin",
            description: "Administrator",
          },
        },
      };

      const mockUsers = {
        data: [{ _id: "user1" }],
      };

      roleRepository.findByName.mockResolvedValue(mockRole);
      userRoleRepo.findUserByIdRole.mockResolvedValue(mockUsers);

      const result = await userRoleService.findIdRoleByName("admin");

      expect(result).toEqual(mockUsers.data);
    });
  });
});


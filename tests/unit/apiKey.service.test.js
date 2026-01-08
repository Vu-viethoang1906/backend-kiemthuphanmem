// 📄 tests/unit/apiKey.service.test.js - API Key Service Unit Tests
const ApiKeyService = require("../../services/apiKey.service");
const apiKeyRepo = require("../../repositories/apiKey.repository");

// Mock repository
jest.mock("../../repositories/apiKey.repository");

describe("🔹 API Key Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createApiKey", () => {
    it("✅ should create API key successfully", async () => {
      const mockData = {
        key: "test-api-key-123",
        description: "Test API Key",
      };

      const mockSaved = {
        _id: "key123",
        key: mockData.key,
        description: mockData.description,
        toObject: jest.fn().mockReturnValue({
          _id: "key123",
          key: mockData.key,
          description: mockData.description,
        }),
      };

      apiKeyRepo.create.mockResolvedValue(mockSaved);

      const result = await ApiKeyService.createApiKey(mockData);

      expect(apiKeyRepo.create).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({
        id: "key123",
        key: mockData.key,
        description: mockData.description,
      });
    });

    it("✅ should create API key without description", async () => {
      const mockData = {
        key: "test-api-key-456",
      };

      const mockSaved = {
        _id: "key456",
        key: mockData.key,
        description: undefined,
        toObject: jest.fn().mockReturnValue({
          _id: "key456",
          key: mockData.key,
        }),
      };

      apiKeyRepo.create.mockResolvedValue(mockSaved);

      const result = await ApiKeyService.createApiKey(mockData);

      expect(result).toEqual({
        id: "key456",
        key: mockData.key,
        description: undefined,
      });
    });
  });

  describe("getAllApiKeys", () => {
    it("✅ should get all API keys successfully", async () => {
      const mockKeys = [
        {
          _id: "key1",
          key: "api-key-1",
          description: "Key 1",
          toObject: jest.fn().mockReturnValue({
            _id: "key1",
            key: "api-key-1",
            description: "Key 1",
          }),
        },
        {
          _id: "key2",
          key: "api-key-2",
          description: "Key 2",
          toObject: jest.fn().mockReturnValue({
            _id: "key2",
            key: "api-key-2",
            description: "Key 2",
          }),
        },
      ];

      apiKeyRepo.findAll.mockResolvedValue(mockKeys);

      const result = await ApiKeyService.getAllApiKeys();

      expect(apiKeyRepo.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        _id: "key1",
        key: "api-key-1",
        description: "Key 1",
      });
      expect(result[1]).toEqual({
        _id: "key2",
        key: "api-key-2",
        description: "Key 2",
      });
    });

    it("✅ should return empty array when no API keys exist", async () => {
      apiKeyRepo.findAll.mockResolvedValue([]);

      const result = await ApiKeyService.getAllApiKeys();

      expect(result).toEqual([]);
    });
  });

  describe("getApiKey", () => {
    it("✅ should get API key by id successfully", async () => {
      const id = "key123";
      const mockKey = {
        _id: id,
        key: "api-key-123",
        description: "Test Key",
        toObject: jest.fn().mockReturnValue({
          _id: id,
          key: "api-key-123",
          description: "Test Key",
        }),
      };

      apiKeyRepo.findById.mockResolvedValue(mockKey);

      const result = await ApiKeyService.getApiKey(id);

      expect(apiKeyRepo.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual({
        _id: id,
        key: "api-key-123",
        description: "Test Key",
      });
    });

    it("❌ should throw error when API key not found", async () => {
      apiKeyRepo.findById.mockResolvedValue(null);

      await expect(ApiKeyService.getApiKey("key123")).rejects.toThrow(
        "Không tìm thấy API Key"
      );
    });
  });

  describe("getApiKeyByDescription", () => {
    it("✅ should get API key by description successfully", async () => {
      const description = "Production Key";
      const mockKey = {
        _id: "key123",
        key: "prod-api-key",
        description: description,
      };

      apiKeyRepo.findByDescription.mockResolvedValue(mockKey);

      const result = await ApiKeyService.getApiKeyByDescription(description);

      expect(apiKeyRepo.findByDescription).toHaveBeenCalledWith(description);
      expect(result).toBe("prod-api-key");
    });

    it("❌ should throw error when API key not found by description", async () => {
      apiKeyRepo.findByDescription.mockResolvedValue(null);

      await expect(
        ApiKeyService.getApiKeyByDescription("Non-existent Key")
      ).rejects.toThrow(
        "Không tìm thấy API Key với description 'Non-existent Key'"
      );
    });
  });

  describe("updateApiKey", () => {
    it("✅ should update API key successfully", async () => {
      const id = "key123";
      const updateData = {
        description: "Updated Description",
      };

      const mockUpdated = {
        _id: id,
        key: "api-key-123",
        description: "Updated Description",
        toObject: jest.fn().mockReturnValue({
          _id: id,
          key: "api-key-123",
          description: "Updated Description",
        }),
      };

      apiKeyRepo.update.mockResolvedValue(mockUpdated);

      const result = await ApiKeyService.updateApiKey(id, updateData);

      expect(apiKeyRepo.update).toHaveBeenCalledWith(id, updateData);
      expect(result).toEqual({
        _id: id,
        key: "api-key-123",
        description: "Updated Description",
      });
    });

    it("✅ should update API key with new key value", async () => {
      const id = "key123";
      const updateData = {
        key: "new-api-key",
      };

      const mockUpdated = {
        _id: id,
        key: "new-api-key",
        description: "Test Key",
        toObject: jest.fn().mockReturnValue({
          _id: id,
          key: "new-api-key",
          description: "Test Key",
        }),
      };

      apiKeyRepo.update.mockResolvedValue(mockUpdated);

      const result = await ApiKeyService.updateApiKey(id, updateData);

      expect(result.key).toBe("new-api-key");
    });

    it("❌ should throw error when API key not found", async () => {
      apiKeyRepo.update.mockResolvedValue(null);

      await expect(
        ApiKeyService.updateApiKey("key123", { description: "Updated" })
      ).rejects.toThrow("Không tìm thấy API Key");
    });
  });

  describe("deleteApiKey", () => {
    it("✅ should delete API key successfully", async () => {
      const id = "key123";
      const mockDeleted = {
        _id: id,
        key: "api-key-123",
        description: "Test Key",
      };

      apiKeyRepo.delete.mockResolvedValue(mockDeleted);

      const result = await ApiKeyService.deleteApiKey(id);

      expect(apiKeyRepo.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockDeleted);
    });

    it("❌ should throw error when API key not found", async () => {
      apiKeyRepo.delete.mockResolvedValue(null);

      await expect(ApiKeyService.deleteApiKey("key123")).rejects.toThrow(
        "Không tìm thấy API Key"
      );
    });
  });
});

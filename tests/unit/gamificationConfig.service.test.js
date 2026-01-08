// 📄 tests/unit/gamificationConfig.service.test.js - Gamification Config Service Unit Tests
jest.mock("../../repositories/gamificationConfig.repository");

const gamificationConfigService = require("../../services/gamificationConfig.service");
const gamificationConfigRepo = require("../../repositories/gamificationConfig.repository");

describe("🔹 Gamification Config Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getConfig", () => {
    it("✅ should return config successfully", async () => {
      const mockConfig = {
        is_enabled: true,
        points_per_task: 10,
        points_deduction: 5,
        description: "Test config",
        updated_by: "user123",
        updated_at: new Date(),
      };

      gamificationConfigRepo.getConfig.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.getConfig();

      expect(result).toEqual({
        is_enabled: true,
        points_per_task: 10,
        points_deduction: 5,
        description: "Test config",
        updated_by: "user123",
        updated_at: mockConfig.updated_at,
      });
      expect(gamificationConfigRepo.getConfig).toHaveBeenCalled();
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      gamificationConfigRepo.getConfig.mockRejectedValue(error);

      await expect(gamificationConfigService.getConfig()).rejects.toThrow(
        "Lỗi lấy cấu hình gamification: Database error"
      );
    });
  });

  describe("isEnabled", () => {
    it("✅ should return true when enabled", async () => {
      const mockConfig = { is_enabled: true };
      gamificationConfigRepo.getConfig.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.isEnabled();

      expect(result).toBe(true);
      expect(gamificationConfigRepo.getConfig).toHaveBeenCalled();
    });

    it("✅ should return false when disabled", async () => {
      const mockConfig = { is_enabled: false };
      gamificationConfigRepo.getConfig.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.isEnabled();

      expect(result).toBe(false);
    });

    it("✅ should return false on error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      gamificationConfigRepo.getConfig.mockRejectedValue(new Error("Error"));

      const result = await gamificationConfigService.isEnabled();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("enable", () => {
    it("✅ should enable gamification successfully", async () => {
      const mockConfig = {
        is_enabled: true,
        points_per_task: 10,
        points_deduction: 5,
        updated_by: "user123",
        updated_at: new Date(),
      };

      gamificationConfigRepo.toggle.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.enable("user123");

      expect(result).toEqual({
        is_enabled: true,
        points_per_task: 10,
        points_deduction: 5,
        updated_by: "user123",
        updated_at: mockConfig.updated_at,
      });
      expect(gamificationConfigRepo.toggle).toHaveBeenCalledWith(true, "user123");
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      gamificationConfigRepo.toggle.mockRejectedValue(error);

      await expect(gamificationConfigService.enable("user123")).rejects.toThrow(
        "Lỗi bật gamification: Database error"
      );
    });
  });

  describe("disable", () => {
    it("✅ should disable gamification successfully", async () => {
      const mockConfig = {
        is_enabled: false,
        points_per_task: 10,
        points_deduction: 5,
        updated_by: "user123",
        updated_at: new Date(),
      };

      gamificationConfigRepo.toggle.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.disable("user123");

      expect(result).toEqual({
        is_enabled: false,
        points_per_task: 10,
        points_deduction: 5,
        updated_by: "user123",
        updated_at: mockConfig.updated_at,
      });
      expect(gamificationConfigRepo.toggle).toHaveBeenCalledWith(false, "user123");
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      gamificationConfigRepo.toggle.mockRejectedValue(error);

      await expect(gamificationConfigService.disable("user123")).rejects.toThrow(
        "Lỗi tắt gamification: Database error"
      );
    });
  });

  describe("toggle", () => {
    it("✅ should toggle from false to true", async () => {
      const mockConfigBefore = { is_enabled: false };
      const mockConfigAfter = {
        is_enabled: true,
        points_per_task: 10,
        points_deduction: 5,
        updated_by: "user123",
        updated_at: new Date(),
      };

      gamificationConfigRepo.getConfig.mockResolvedValue(mockConfigBefore);
      gamificationConfigRepo.toggle.mockResolvedValue(mockConfigAfter);

      const result = await gamificationConfigService.toggle("user123");

      expect(result).toEqual({
        is_enabled: true,
        points_per_task: 10,
        points_deduction: 5,
        updated_by: "user123",
        updated_at: mockConfigAfter.updated_at,
      });
      expect(gamificationConfigRepo.getConfig).toHaveBeenCalled();
      expect(gamificationConfigRepo.toggle).toHaveBeenCalledWith(true, "user123");
    });

    it("✅ should toggle from true to false", async () => {
      const mockConfigBefore = { is_enabled: true };
      const mockConfigAfter = {
        is_enabled: false,
        points_per_task: 10,
        points_deduction: 5,
        updated_by: "user123",
        updated_at: new Date(),
      };

      gamificationConfigRepo.getConfig.mockResolvedValue(mockConfigBefore);
      gamificationConfigRepo.toggle.mockResolvedValue(mockConfigAfter);

      const result = await gamificationConfigService.toggle("user123");

      expect(result).toEqual({
        is_enabled: false,
        points_per_task: 10,
        points_deduction: 5,
        updated_by: "user123",
        updated_at: mockConfigAfter.updated_at,
      });
      expect(gamificationConfigRepo.toggle).toHaveBeenCalledWith(false, "user123");
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      gamificationConfigRepo.getConfig.mockRejectedValue(error);

      await expect(gamificationConfigService.toggle("user123")).rejects.toThrow(
        "Lỗi toggle gamification: Database error"
      );
    });
  });

  describe("updatePoints", () => {
    it("✅ should update points successfully", async () => {
      const mockConfig = {
        is_enabled: true,
        points_per_task: 20,
        points_deduction: 10,
        updated_by: "user123",
        updated_at: new Date(),
      };

      gamificationConfigRepo.updatePoints.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.updatePoints(20, 10, "user123");

      expect(result).toEqual({
        is_enabled: true,
        points_per_task: 20,
        points_deduction: 10,
        updated_by: "user123",
        updated_at: mockConfig.updated_at,
      });
      expect(gamificationConfigRepo.updatePoints).toHaveBeenCalledWith(20, 10, "user123");
    });

    it("❌ should throw error when pointsPerTask is negative", async () => {
      await expect(
        gamificationConfigService.updatePoints(-1, 10, "user123")
      ).rejects.toThrow("Điểm thưởng và điểm trừ phải >= 0");
    });

    it("❌ should throw error when pointsDeduction is negative", async () => {
      await expect(
        gamificationConfigService.updatePoints(10, -1, "user123")
      ).rejects.toThrow("Điểm thưởng và điểm trừ phải >= 0");
    });

    it("✅ should allow zero points", async () => {
      const mockConfig = {
        is_enabled: true,
        points_per_task: 0,
        points_deduction: 0,
        updated_by: "user123",
        updated_at: new Date(),
      };

      gamificationConfigRepo.updatePoints.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.updatePoints(0, 0, "user123");

      expect(result.points_per_task).toBe(0);
      expect(result.points_deduction).toBe(0);
    });

    it("❌ should throw error when repository fails", async () => {
      const error = new Error("Database error");
      gamificationConfigRepo.updatePoints.mockRejectedValue(error);

      await expect(
        gamificationConfigService.updatePoints(10, 5, "user123")
      ).rejects.toThrow("Lỗi cập nhật điểm: Database error");
    });
  });

  describe("getPointsPerTask", () => {
    it("✅ should return points per task", async () => {
      const mockConfig = { points_per_task: 15 };
      gamificationConfigRepo.getConfig.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.getPointsPerTask();

      expect(result).toBe(15);
      expect(gamificationConfigRepo.getConfig).toHaveBeenCalled();
    });

    it("✅ should return default 10 when points_per_task is null", async () => {
      const mockConfig = { points_per_task: null };
      gamificationConfigRepo.getConfig.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.getPointsPerTask();

      expect(result).toBe(10);
    });

    it("✅ should return default 10 on error", async () => {
      gamificationConfigRepo.getConfig.mockRejectedValue(new Error("Error"));

      const result = await gamificationConfigService.getPointsPerTask();

      expect(result).toBe(10);
    });
  });

  describe("getPointsDeduction", () => {
    it("✅ should return points deduction", async () => {
      const mockConfig = { points_deduction: 8 };
      gamificationConfigRepo.getConfig.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.getPointsDeduction();

      expect(result).toBe(8);
      expect(gamificationConfigRepo.getConfig).toHaveBeenCalled();
    });

    it("✅ should return default 10 when points_deduction is null", async () => {
      const mockConfig = { points_deduction: null };
      gamificationConfigRepo.getConfig.mockResolvedValue(mockConfig);

      const result = await gamificationConfigService.getPointsDeduction();

      expect(result).toBe(10);
    });

    it("✅ should return default 10 on error", async () => {
      gamificationConfigRepo.getConfig.mockRejectedValue(new Error("Error"));

      const result = await gamificationConfigService.getPointsDeduction();

      expect(result).toBe(10);
    });
  });
});


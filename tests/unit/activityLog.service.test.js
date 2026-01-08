// 📄 tests/unit/activityLog.service.test.js - Activity Log Service Unit Tests
const ActivityLogService = require("../../services/activityLog.service");
const activityLogRepo = require("../../repositories/activityLog.repository");

// Mock repository
jest.mock("../../repositories/activityLog.repository");

describe("🔹 Activity Log Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createActivityLog", () => {
    it("✅ should create activity log successfully", async () => {
      const mockData = {
        user_id: "user123",
        action: "task_created",
        target_type: "task",
        target_id: "task123",
      };

      const mockResult = {
        _id: "log123",
        ...mockData,
        created_at: new Date(),
      };

      activityLogRepo.create.mockResolvedValue(mockResult);

      const result = await ActivityLogService.createActivityLog(mockData);

      expect(activityLogRepo.create).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockResult);
    });

    it("❌ should throw error when user_id is missing", async () => {
      const mockData = {
        action: "task_created",
        target_type: "task",
      };

      await expect(
        ActivityLogService.createActivityLog(mockData)
      ).rejects.toThrow("user_id is required");
    });

    it("❌ should throw error when action is missing", async () => {
      const mockData = {
        user_id: "user123",
        target_type: "task",
      };

      await expect(
        ActivityLogService.createActivityLog(mockData)
      ).rejects.toThrow("action is required and must be a string");
    });

    it("❌ should throw error when action is not a string", async () => {
      const mockData = {
        user_id: "user123",
        action: 123,
      };

      await expect(
        ActivityLogService.createActivityLog(mockData)
      ).rejects.toThrow("action is required and must be a string");
    });

    it("❌ should throw error when action exceeds 100 characters", async () => {
      const mockData = {
        user_id: "user123",
        action: "a".repeat(101),
      };

      await expect(
        ActivityLogService.createActivityLog(mockData)
      ).rejects.toThrow("action must not exceed 100 characters");
    });

    it("❌ should throw error when target_type exceeds 50 characters", async () => {
      const mockData = {
        user_id: "user123",
        action: "task_created",
        target_type: "a".repeat(51),
      };

      await expect(
        ActivityLogService.createActivityLog(mockData)
      ).rejects.toThrow("target_type must not exceed 50 characters");
    });
  });

  describe("getActivityLogById", () => {
    it("✅ should get activity log by id successfully", async () => {
      const mockLog = {
        _id: "log123",
        user_id: "user123",
        action: "task_created",
      };

      activityLogRepo.findById.mockResolvedValue(mockLog);

      const result = await ActivityLogService.getActivityLogById("log123");

      expect(activityLogRepo.findById).toHaveBeenCalledWith("log123");
      expect(result).toEqual(mockLog);
    });

    it("❌ should throw error when id is missing", async () => {
      await expect(
        ActivityLogService.getActivityLogById(null)
      ).rejects.toThrow("Activity log ID is required");
    });

    it("❌ should throw error when activity log not found", async () => {
      activityLogRepo.findById.mockResolvedValue(null);

      await expect(
        ActivityLogService.getActivityLogById("log123")
      ).rejects.toThrow("Activity log not found");
    });
  });

  describe("getAllActivityLogs", () => {
    it("✅ should get all activity logs with default pagination", async () => {
      const mockResult = {
        data: [
          { _id: "log1", action: "task_created" },
          { _id: "log2", action: "task_updated" },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      activityLogRepo.findWithFilters.mockResolvedValue(mockResult);

      const result = await ActivityLogService.getAllActivityLogs({});

      expect(activityLogRepo.findWithFilters).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("✅ should get activity logs with filters", async () => {
      const queryParams = {
        user_id: "user123",
        action: "task_created",
        page: 1,
        limit: 10,
      };

      const mockResult = {
        data: [{ _id: "log1", action: "task_created" }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      activityLogRepo.findWithFilters.mockResolvedValue(mockResult);

      const result = await ActivityLogService.getAllActivityLogs(queryParams);

      expect(activityLogRepo.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user123",
          action: "task_created",
          page: 1,
          limit: 10,
        })
      );
      expect(result).toEqual(mockResult);
    });

    it("✅ should get activity logs with date range", async () => {
      const queryParams = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        page: 1,
        limit: 20,
      };

      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      activityLogRepo.findWithFilters.mockResolvedValue(mockResult);

      const result = await ActivityLogService.getAllActivityLogs(queryParams);

      expect(activityLogRepo.findWithFilters).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("❌ should throw error when page is less than 1", async () => {
      await expect(
        ActivityLogService.getAllActivityLogs({ page: 0 })
      ).rejects.toThrow("page must be greater than 0");
    });

    it("❌ should throw error when limit is less than 1", async () => {
      await expect(
        ActivityLogService.getAllActivityLogs({ limit: 0 })
      ).rejects.toThrow("limit must be between 1 and 100");
    });

    it("❌ should throw error when limit exceeds 100", async () => {
      await expect(
        ActivityLogService.getAllActivityLogs({ limit: 101 })
      ).rejects.toThrow("limit must be between 1 and 100");
    });

    it("❌ should throw error when startDate is invalid", async () => {
      await expect(
        ActivityLogService.getAllActivityLogs({ startDate: "invalid-date" })
      ).rejects.toThrow("startDate must be a valid date");
    });

    it("❌ should throw error when endDate is invalid", async () => {
      await expect(
        ActivityLogService.getAllActivityLogs({ endDate: "invalid-date" })
      ).rejects.toThrow("endDate must be a valid date");
    });

    it("❌ should throw error when startDate is after endDate", async () => {
      await expect(
        ActivityLogService.getAllActivityLogs({
          startDate: "2024-01-31",
          endDate: "2024-01-01",
        })
      ).rejects.toThrow("startDate must be before or equal to endDate");
    });
  });

  describe("findActivityLogs", () => {
    it("✅ should find activity logs with filter and options", async () => {
      const filter = { user_id: "user123" };
      const options = { sort: { created_at: -1 }, limit: 10 };

      const mockLogs = [
        { _id: "log1", action: "task_created" },
        { _id: "log2", action: "task_updated" },
      ];

      activityLogRepo.find.mockResolvedValue(mockLogs);

      const result = await ActivityLogService.findActivityLogs(filter, options);

      expect(activityLogRepo.find).toHaveBeenCalledWith(filter, options);
      expect(result).toEqual(mockLogs);
    });

    it("✅ should find activity logs with default empty filter and options", async () => {
      const mockLogs = [{ _id: "log1", action: "task_created" }];

      activityLogRepo.find.mockResolvedValue(mockLogs);

      const result = await ActivityLogService.findActivityLogs();

      expect(activityLogRepo.find).toHaveBeenCalledWith({}, {});
      expect(result).toEqual(mockLogs);
    });
  });

  describe("countActivityLogs", () => {
    it("✅ should count activity logs with filter", async () => {
      const filter = { user_id: "user123" };

      activityLogRepo.count.mockResolvedValue(5);

      const result = await ActivityLogService.countActivityLogs(filter);

      expect(activityLogRepo.count).toHaveBeenCalledWith(filter);
      expect(result).toBe(5);
    });

    it("✅ should count all activity logs with empty filter", async () => {
      activityLogRepo.count.mockResolvedValue(10);

      const result = await ActivityLogService.countActivityLogs();

      expect(activityLogRepo.count).toHaveBeenCalledWith({});
      expect(result).toBe(10);
    });
  });

  describe("updateActivityLog", () => {
    it("✅ should update activity log successfully", async () => {
      const id = "log123";
      const updateData = {
        action: "task_updated",
        target_type: "task",
      };

      const mockUpdated = {
        _id: id,
        ...updateData,
        updated_at: new Date(),
      };

      activityLogRepo.update.mockResolvedValue(mockUpdated);

      const result = await ActivityLogService.updateActivityLog(id, updateData);

      expect(activityLogRepo.update).toHaveBeenCalledWith(id, updateData);
      expect(result).toEqual(mockUpdated);
    });

    it("❌ should throw error when id is missing", async () => {
      await expect(
        ActivityLogService.updateActivityLog(null, { action: "updated" })
      ).rejects.toThrow("Activity log ID is required");
    });

    it("❌ should throw error when action is not a string", async () => {
      await expect(
        ActivityLogService.updateActivityLog("log123", { action: 123 })
      ).rejects.toThrow("action must be a string");
    });

    it("❌ should throw error when action exceeds 100 characters", async () => {
      await expect(
        ActivityLogService.updateActivityLog("log123", {
          action: "a".repeat(101),
        })
      ).rejects.toThrow("action must not exceed 100 characters");
    });

    it("❌ should throw error when target_type exceeds 50 characters", async () => {
      await expect(
        ActivityLogService.updateActivityLog("log123", {
          target_type: "a".repeat(51),
        })
      ).rejects.toThrow("target_type must not exceed 50 characters");
    });

    it("❌ should throw error when activity log not found", async () => {
      activityLogRepo.update.mockResolvedValue(null);

      await expect(
        ActivityLogService.updateActivityLog("log123", { action: "updated" })
      ).rejects.toThrow("Activity log not found");
    });
  });

  describe("deleteActivityLog", () => {
    it("✅ should delete activity log successfully", async () => {
      const id = "log123";
      const mockDeleted = { _id: id, action: "task_created" };

      activityLogRepo.delete.mockResolvedValue(mockDeleted);

      const result = await ActivityLogService.deleteActivityLog(id);

      expect(activityLogRepo.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockDeleted);
    });

    it("❌ should throw error when id is missing", async () => {
      await expect(
        ActivityLogService.deleteActivityLog(null)
      ).rejects.toThrow("Activity log ID is required");
    });

    it("❌ should throw error when activity log not found", async () => {
      activityLogRepo.delete.mockResolvedValue(null);

      await expect(
        ActivityLogService.deleteActivityLog("log123")
      ).rejects.toThrow("Activity log not found");
    });
  });
});

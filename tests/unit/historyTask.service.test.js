// 📄 tests/unit/historyTask.service.test.js - History Task Service Unit Tests
jest.mock("../../repositories/historyTask.repository");

const historyTaskService = require("../../services/historyTask.service");
const historyTaskRepo = require("../../repositories/historyTask.repository");
const mongoose = require("mongoose");

// Mock mongoose.Types.ObjectId.isValid
const actualMongoose = jest.requireActual("mongoose");
mongoose.Types = actualMongoose.Types;
mongoose.Types.ObjectId.isValid = jest.fn((id) => id && typeof id === "string" && id.length === 24);

const VALID_HISTORY_TASK_ID = "507f1f77bcf86cd799439011";
const VALID_TASK_ID = "507f1f77bcf86cd799439012";
const VALID_USER_ID = "507f1f77bcf86cd799439013";
const VALID_BOARD_ID = "507f1f77bcf86cd799439014";

describe("🔹 History Task Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createHistoryTask", () => {
    it("✅ should create history task successfully", async () => {
      const mockHistoryTask = {
        _id: VALID_HISTORY_TASK_ID,
        task_id: VALID_TASK_ID,
        changed_by: VALID_USER_ID,
        change_type: "created",
        old_value: null,
        new_value: { title: "New Task" },
      };

      historyTaskRepo.create.mockResolvedValue(mockHistoryTask);

      const result = await historyTaskService.createHistoryTask({
        task_id: VALID_TASK_ID,
        changed_by: VALID_USER_ID,
        change_type: "created",
        old_value: null,
        new_value: { title: "New Task" },
      });

      expect(result).toEqual(mockHistoryTask);
      expect(historyTaskRepo.create).toHaveBeenCalledWith({
        task_id: VALID_TASK_ID,
        changed_by: VALID_USER_ID,
        change_type: "created",
        old_value: null,
        new_value: { title: "New Task" },
      });
    });

    it("❌ should throw error when task_id is missing", async () => {
      await expect(
        historyTaskService.createHistoryTask({
          changed_by: VALID_USER_ID,
          change_type: "created",
        })
      ).rejects.toThrow("task_id is required and must be a valid ObjectId");
    });

    it("❌ should throw error when task_id is invalid", async () => {
      await expect(
        historyTaskService.createHistoryTask({
          task_id: "invalid",
          changed_by: VALID_USER_ID,
          change_type: "created",
        })
      ).rejects.toThrow("task_id is required and must be a valid ObjectId");
    });

    it("❌ should throw error when changed_by is missing", async () => {
      await expect(
        historyTaskService.createHistoryTask({
          task_id: VALID_TASK_ID,
          change_type: "created",
        })
      ).rejects.toThrow("changed_by is required and must be a valid ObjectId");
    });

    it("❌ should throw error when changed_by is invalid", async () => {
      await expect(
        historyTaskService.createHistoryTask({
          task_id: VALID_TASK_ID,
          changed_by: "invalid",
          change_type: "created",
        })
      ).rejects.toThrow("changed_by is required and must be a valid ObjectId");
    });

    it("❌ should throw error when change_type is missing", async () => {
      await expect(
        historyTaskService.createHistoryTask({
          task_id: VALID_TASK_ID,
          changed_by: VALID_USER_ID,
        })
      ).rejects.toThrow("change_type is required, must be a string");
    });

    it("❌ should throw error when change_type is not a string", async () => {
      await expect(
        historyTaskService.createHistoryTask({
          task_id: VALID_TASK_ID,
          changed_by: VALID_USER_ID,
          change_type: 123,
        })
      ).rejects.toThrow("change_type is required, must be a string");
    });
  });

  describe("getHistoryTaskById", () => {
    it("✅ should return history task by id", async () => {
      const mockHistoryTask = {
        _id: VALID_HISTORY_TASK_ID,
        task_id: VALID_TASK_ID,
        changed_by: VALID_USER_ID,
        change_type: "updated",
      };

      historyTaskRepo.findById.mockResolvedValue(mockHistoryTask);

      const result = await historyTaskService.getHistoryTaskById(VALID_HISTORY_TASK_ID);

      expect(result).toEqual(mockHistoryTask);
      expect(historyTaskRepo.findById).toHaveBeenCalledWith(VALID_HISTORY_TASK_ID);
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(
        historyTaskService.getHistoryTaskById("invalid")
      ).rejects.toThrow("Invalid history task ID");
    });

    it("❌ should throw error when history task not found", async () => {
      historyTaskRepo.findById.mockResolvedValue(null);

      await expect(
        historyTaskService.getHistoryTaskById(VALID_HISTORY_TASK_ID)
      ).rejects.toThrow("HistoryTask not found");
    });
  });

  describe("getAllHistoryTasks", () => {
    it("✅ should return all history tasks with default sort", async () => {
      const mockHistoryTasks = [
        {
          _id: VALID_HISTORY_TASK_ID,
          task_id: VALID_TASK_ID,
          change_type: "updated",
        },
        {
          _id: "507f1f77bcf86cd799439015",
          task_id: VALID_TASK_ID,
          change_type: "created",
        },
      ];

      historyTaskRepo.find.mockResolvedValue(mockHistoryTasks);

      const result = await historyTaskService.getAllHistoryTasks();

      expect(result).toEqual(mockHistoryTasks);
      expect(historyTaskRepo.find).toHaveBeenCalledWith({}, { sort: { createdAt: -1 } });
    });

    it("✅ should return history tasks with custom filter", async () => {
      const mockHistoryTasks = [
        {
          _id: VALID_HISTORY_TASK_ID,
          task_id: VALID_TASK_ID,
          change_type: "updated",
        },
      ];
      const filter = { task_id: VALID_TASK_ID };

      historyTaskRepo.find.mockResolvedValue(mockHistoryTasks);

      const result = await historyTaskService.getAllHistoryTasks(filter);

      expect(result).toEqual(mockHistoryTasks);
      expect(historyTaskRepo.find).toHaveBeenCalledWith(filter, { sort: { createdAt: -1 } });
    });

    it("✅ should return history tasks with custom options", async () => {
      const mockHistoryTasks = [
        {
          _id: VALID_HISTORY_TASK_ID,
          task_id: VALID_TASK_ID,
          change_type: "updated",
        },
      ];
      const filter = { task_id: VALID_TASK_ID };
      const options = { page: 1, limit: 10, sort: { createdAt: 1 } };

      historyTaskRepo.find.mockResolvedValue(mockHistoryTasks);

      const result = await historyTaskService.getAllHistoryTasks(filter, options);

      expect(result).toEqual(mockHistoryTasks);
      expect(historyTaskRepo.find).toHaveBeenCalledWith(filter, options);
    });

    it("✅ should use default sort when options.sort is not provided", async () => {
      const mockHistoryTasks = [];
      const filter = {};
      const options = { page: 1, limit: 10 };

      historyTaskRepo.find.mockResolvedValue(mockHistoryTasks);

      await historyTaskService.getAllHistoryTasks(filter, options);

      expect(historyTaskRepo.find).toHaveBeenCalledWith(filter, {
        page: 1,
        limit: 10,
        sort: { createdAt: -1 },
      });
    });
  });

  describe("updateHistoryTask", () => {
    it("✅ should update history task successfully", async () => {
      const mockUpdatedHistoryTask = {
        _id: VALID_HISTORY_TASK_ID,
        task_id: VALID_TASK_ID,
        changed_by: VALID_USER_ID,
        change_type: "updated",
        old_value: { title: "Old Title" },
        new_value: { title: "New Title" },
      };

      historyTaskRepo.update.mockResolvedValue(mockUpdatedHistoryTask);

      const result = await historyTaskService.updateHistoryTask(VALID_HISTORY_TASK_ID, {
        change_type: "updated",
        old_value: { title: "Old Title" },
        new_value: { title: "New Title" },
      });

      expect(result).toEqual(mockUpdatedHistoryTask);
      expect(historyTaskRepo.update).toHaveBeenCalledWith(VALID_HISTORY_TASK_ID, {
        change_type: "updated",
        old_value: { title: "Old Title" },
        new_value: { title: "New Title" },
      });
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(
        historyTaskService.updateHistoryTask("invalid", { change_type: "updated" })
      ).rejects.toThrow("Invalid history task ID");
    });

    it("❌ should throw error when task_id is invalid", async () => {
      await expect(
        historyTaskService.updateHistoryTask(VALID_HISTORY_TASK_ID, {
          task_id: "invalid",
        })
      ).rejects.toThrow("task_id must be a valid ObjectId");
    });

    it("❌ should throw error when changed_by is invalid", async () => {
      await expect(
        historyTaskService.updateHistoryTask(VALID_HISTORY_TASK_ID, {
          changed_by: "invalid",
        })
      ).rejects.toThrow("changed_by must be a valid ObjectId");
    });

    it("❌ should throw error when change_type is not a string", async () => {
      await expect(
        historyTaskService.updateHistoryTask(VALID_HISTORY_TASK_ID, {
          change_type: 123,
        })
      ).rejects.toThrow("change_type must be a string with max length 100");
    });

    it("❌ should throw error when change_type is too long", async () => {
      const longString = "a".repeat(101);
      await expect(
        historyTaskService.updateHistoryTask(VALID_HISTORY_TASK_ID, {
          change_type: longString,
        })
      ).rejects.toThrow("change_type must be a string with max length 100");
    });

    it("❌ should throw error when history task not found", async () => {
      historyTaskRepo.update.mockResolvedValue(null);

      await expect(
        historyTaskService.updateHistoryTask(VALID_HISTORY_TASK_ID, {
          change_type: "updated",
        })
      ).rejects.toThrow("HistoryTask not found");
    });
  });

  describe("deleteHistoryTask", () => {
    it("✅ should delete history task successfully", async () => {
      const mockDeletedHistoryTask = {
        _id: VALID_HISTORY_TASK_ID,
        task_id: VALID_TASK_ID,
      };

      historyTaskRepo.delete.mockResolvedValue(mockDeletedHistoryTask);

      const result = await historyTaskService.deleteHistoryTask(VALID_HISTORY_TASK_ID);

      expect(result).toEqual(mockDeletedHistoryTask);
      expect(historyTaskRepo.delete).toHaveBeenCalledWith(VALID_HISTORY_TASK_ID);
    });

    it("❌ should throw error when id is invalid", async () => {
      await expect(
        historyTaskService.deleteHistoryTask("invalid")
      ).rejects.toThrow("Invalid history task ID");
    });

    it("❌ should throw error when history task not found", async () => {
      historyTaskRepo.delete.mockResolvedValue(null);

      await expect(
        historyTaskService.deleteHistoryTask(VALID_HISTORY_TASK_ID)
      ).rejects.toThrow("HistoryTask not found");
    });
  });

  describe("fetchBoardTasksHistory", () => {
    it("✅ should fetch board tasks history successfully", async () => {
      const mockHistoryTasks = [
        {
          _id: VALID_HISTORY_TASK_ID,
          task_id: VALID_TASK_ID,
          change_type: "created",
        },
        {
          _id: "507f1f77bcf86cd799439015",
          task_id: "507f1f77bcf86cd799439016",
          change_type: "updated",
        },
      ];

      historyTaskRepo.findByBoardId.mockResolvedValue(mockHistoryTasks);

      const result = await historyTaskService.fetchBoardTasksHistory(VALID_BOARD_ID);

      expect(result).toEqual(mockHistoryTasks);
      expect(historyTaskRepo.findByBoardId).toHaveBeenCalledWith(VALID_BOARD_ID);
    });

    it("❌ should throw error when board_id is invalid", async () => {
      await expect(
        historyTaskService.fetchBoardTasksHistory("invalid")
      ).rejects.toThrow("Invalid board ID");
    });

    it("✅ should return empty array when no history found", async () => {
      historyTaskRepo.findByBoardId.mockResolvedValue([]);

      const result = await historyTaskService.fetchBoardTasksHistory(VALID_BOARD_ID);

      expect(result).toEqual([]);
    });
  });
});



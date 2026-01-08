const mongoose = require("mongoose");
const historyTaskRepo = require("../repositories/historyTask.repository");

class HistoryTaskService {
  async createHistoryTask(data) {
    // Validate required fields
    const { task_id, changed_by, change_type } = data;
    if (!task_id || !mongoose.Types.ObjectId.isValid(task_id)) {
      throw new Error("task_id is required and must be a valid ObjectId");
    }
    if (!changed_by || !mongoose.Types.ObjectId.isValid(changed_by)) {
      throw new Error("changed_by is required and must be a valid ObjectId");
    }
    if (!change_type || typeof change_type !== "string") {
      throw new Error("change_type is required, must be a string");
    }

    return historyTaskRepo.create(data);
  }

  async getHistoryTaskById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid history task ID");
    }

    const result = await historyTaskRepo.findById(id);
    if (!result) throw new Error("HistoryTask not found");
    return result;
  }

  async getAllHistoryTasks(filter = {}, options = {}) {
    // Optional: validate filter fields if needed
    return historyTaskRepo.find(filter, options);
  }

  async updateHistoryTask(id, data) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid history task ID");
    }

    if (data.task_id && !mongoose.Types.ObjectId.isValid(data.task_id)) {
      throw new Error("task_id must be a valid ObjectId");
    }
    if (data.changed_by && !mongoose.Types.ObjectId.isValid(data.changed_by)) {
      throw new Error("changed_by must be a valid ObjectId");
    }
    if (
      data.change_type &&
      (typeof data.change_type !== "string" || data.change_type.length > 100)
    ) {
      throw new Error("change_type must be a string with max length 100");
    }

    const updated = await historyTaskRepo.update(id, data);
    if (!updated) throw new Error("HistoryTask not found");
    return updated;
  }

  async deleteHistoryTask(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid history task ID");
    }

    const deleted = await historyTaskRepo.delete(id);
    if (!deleted) throw new Error("HistoryTask not found");
    return deleted;
  }

  async getAllHistoryTasks(filter = {}, options = {}) {
    // Mặc định sort theo newest first
    if (!options.sort) options.sort = { createdAt: -1 };
    return historyTaskRepo.find(filter, options);
  }

  async fetchBoardTasksHistory(boardId) {
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      throw new Error("Invalid board ID");
    }

    const logs = await historyTaskRepo.findByBoardId(boardId);
    return logs;
  }
}
module.exports = new HistoryTaskService();

const HistoryTask = require("../models/historyTask.model");
const Task = require("../models/task.model");
class HistoryTaskRepo {
  async create(data) {
    const historyTask = new HistoryTask(data);
    return historyTask.save();
  }

  async findById(id) {
    return HistoryTask.findById(id)
      .populate("task_id")
      .populate("changed_by")
      .exec();
  }

  async find(filter = {}, options = {}) {
    return HistoryTask.find(filter, null, options)
      .populate("task_id", "title")
      .populate("changed_by", "username email")
      .exec();
  }

  async update(id, data) {
    return HistoryTask.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id) {
    return HistoryTask.findByIdAndDelete(id).exec();
  }

  async findByBoardId(boardId) {
    // Lấy tất cả task trong board
    const tasks = await Task.find({ board_id: boardId }).select("_id title");

    const taskIds = tasks.map((t) => t._id);

    // Lấy tất cả history của các task này
    const histories = await HistoryTask.find({ task_id: { $in: taskIds } })
      .populate("changed_by", "full_name email username") // optional: populate user
      .populate("task_id", "title") // optional: populate task info
      .sort({ createdAt: -1 });

    return histories;
  }
}

module.exports = new HistoryTaskRepo();

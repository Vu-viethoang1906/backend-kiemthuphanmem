const historyTaskService = require("../services/historyTask.service");

class HistoryTaskController {
  async create(req, res) {
    try {
      const result = await historyTaskService.createHistoryTask(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getById(req, res) {
    try {
      const result = await historyTaskService.getHistoryTaskById(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const result = await historyTaskService.getAllHistoryTasks(req.query);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const result = await historyTaskService.updateHistoryTask(
        req.params.id,
        req.body
      );
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await historyTaskService.deleteHistoryTask(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getHistoryByTaskId(req, res) {
    try {
      const { taskId } = req.params;

      const history = await historyTaskService.getAllHistoryTasks(
        { task_id : taskId },
        { sort: { createdAt: -1 } }
      );
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getHistoryByBoardTasks(req, res) {
    try {
      const { boardId } = req.params;
      const history = await historyTaskService.fetchBoardTasksHistory(boardId);
      res.json({ success: true, data: history });
    } catch (error) {
      // For board-level errors, return 500 to indicate server-side failure or DB error
      res.status(500).json({ success: false, message: "Failed to fetch board tasks history" });
    }
  }
}

module.exports = new HistoryTaskController();


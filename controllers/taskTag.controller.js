const taskTagService = require('../services/taskTag.service');

class TaskTagController {
 async addTag(req, res) {
    try {
      const { taskId, tagId } = req.body;
      const result = await taskTagService.addTagToTask(taskId, tagId);

      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getTagsByTask(req, res) {
    try {
      const { taskId } = req.params;
      const data = await taskTagService.getTagsByTask(taskId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getTasksByTag(req, res) {
    try {
      const { tagId } = req.params;
      const data = await taskTagService.getTasksByTag(tagId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async removeTag(req, res) {
    try {
      const { taskId, tagId } = req.body;
      await taskTagService.removeTagFromTask(taskId, tagId);
      res.json({ success: true, message: 'Xóa tag khỏi task thành công' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new TaskTagController();

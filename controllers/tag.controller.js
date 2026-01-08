const tagService = require("../services/tag.service");

class TagController {
  // Tạo tag mới
  async create(req, res) {
    try {
      const { name, color, boardId } = req.body;
      const tag = await tagService.createTag({ name, color, boardId });

      res.status(201).json({
        success: true,
        message: "Tạo tag thành công",
        data: tag,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tất cả tags
  async getAll(req, res) {
    try {
      const tags = await tagService.getAllTags();

      res.json({
        success: true,
        count: tags.length,
        data: tags,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tag theo ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const tag = await tagService.getTagById(id);

      if (!tag) {
        return res.status(404).json({
          success: false,
          message: "Tag không tồn tại",
        });
      }

      res.json({
        success: true,
        data: tag,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Cập nhật tag
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedTag = await tagService.updateTag(id, updateData);

      if (!updatedTag) {
        return res.status(404).json({
          success: false,
          message: "Tag không tồn tại",
        });
      }

      res.json({
        success: true,
        message: "Cập nhật tag thành công",
        data: updatedTag,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Xóa tag
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await tagService.deleteTag(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Tag không tồn tại",
        });
      }

      res.json({
        success: true,
        message: "Xóa tag thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tags của task
  async getByTask(req, res) {
    try {
      const { taskId } = req.params;
      const tags = await tagService.getTagsByTask(taskId);

      res.json({
        success: true,
        count: tags.length,
        data: tags,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Thêm tag vào task
  async addTagToTask(req, res) {
    try {
      const { taskId, tagId } = req.params;
      const userId = req.user.id;
      const result = await tagService.addTagToTask(taskId, tagId, userId);

      res.json({
        success: true,
        message: "Thêm tag vào task thành công",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Xóa tag khỏi task
  async removeTagFromTask(req, res) {
    try {
      const { taskId, tagId } = req.params;
      const result = await tagService.removeTagFromTask(taskId, tagId);

      res.json({
        success: true,
        message: "Xóa tag khỏi task thành công",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tất cả tags của board
  async getTagsByBoard(req, res) {
    try {
      const { boardId } = req.params;
      const tags = await tagService.getTagsByBoard(boardId);

      res.json({
        success: true,
        count: tags.length,
        data: tags,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new TagController();

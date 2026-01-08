const tagRepo = require("../repositories/tag.repository");
const taskTagRepo = require("../repositories/taskTag.repository");
const taskRepo = require("../repositories/task.repository");
const mongoose = require("mongoose");
const TaskModel = require("../models/task.model");
const TaskTag = require("../models/taskTag.model");
const TagModel = require("../models/tag.model");
const historyService = require("../services/historyTask.service");
class TagService {
  // Tạo tag mới
  async createTag({ name, color, boardId }) {
    try {
      // Validate input
      if (!name || name.trim() === "") {
        throw new Error("Tên tag là bắt buộc");
      }
      if (!boardId) {
        throw new Error("id board tag là bắt buộc");
      }
      const boardObjectId = new mongoose.Types.ObjectId(boardId);
      const existingTag = await tagRepo.findByNameAndIdBoard(name, boardId);
      if (existingTag) {
        throw new Error("Tag của board đã có với tên này rồi");
      }

      const tagData = {
        name: name.trim(),
        color: color || "#007bff",
        board_id: boardObjectId, // Màu mặc định
      };

      const tag = await tagRepo.create(tagData);
      return tag;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả tags
  async getAllTags() {
    try {
      const tags = await tagRepo.findAll();
      return tags;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tag theo ID
  async getTagById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("ID tag không hợp lệ");
      }

      const tag = await tagRepo.findById(id);
      if (!tag) {
        throw new Error("Tag không tồn tại");
      }

      return tag;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật tag
  async updateTag(id, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("ID tag không hợp lệ");
      }

      // Validate input
      if (updateData.name && updateData.name.trim() === "") {
        throw new Error("Tên tag không được để trống");
      }

      // Kiểm tra tag tồn tại
      const existingTag = await tagRepo.findById(id);
      if (!existingTag) {
        throw new Error("Tag không tồn tại");
      }

      // Kiểm tra tên trùng nếu có thay đổi tên
      if (updateData.name && updateData.name !== existingTag.name) {
        const duplicateTag = await tagRepo.findByName(updateData.name);
        if (duplicateTag) {
          throw new Error("Tag với tên này đã tồn tại");
        }
      }

      const updatedTag = await tagRepo.update(id, updateData);
      return updatedTag;
    } catch (error) {
      throw error;
    }
  }

  // Xóa tag
  async deleteTag(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("ID tag không hợp lệ");
      }

      // Kiểm tra tag tồn tại
      const existingTag = await tagRepo.findById(id);
      if (!existingTag) {
        throw new Error("Tag không tồn tại");
      }

      // Xóa tất cả TaskTag liên quan
      await taskTagRepo.deleteByTagId(id);

      // Soft delete tag
      const deleted = await tagRepo.softDelete(id);
      return deleted;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tags của task
  async getTagsByTask(taskId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new Error("ID task không hợp lệ");
      }

      // Kiểm tra task tồn tại
      const task = await taskRepo.findById(taskId);
      if (!task) {
        throw new Error("Task không tồn tại");
      }

      const tags = await tagRepo.findByTaskId(taskId);
      return tags;
    } catch (error) {
      throw error;
    }
  }

  // Thêm tag vào task
  async addTagToTask(taskId, tagId, userId) {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(taskId) ||
        !mongoose.Types.ObjectId.isValid(tagId)
      ) {
        throw new Error("ID task hoặc tag không hợp lệ");
      }

      // Kiểm tra task tồn tại
      const task = await taskRepo.findById(taskId);
      if (!task) throw new Error("Task không tồn tại");

      // Kiểm tra tag tồn tại
      const tag = await tagRepo.findById(tagId);
      if (!tag) throw new Error("Tag không tồn tại");
      // lấy tag hiện tại của task
      const existingTags = await taskTagRepo.findByTaskId(taskId);
      const nameNewTag = await tagRepo.findById(tagId);
      const oldTagName =
        existingTags.length > 0 && existingTags[0].tag_id
          ? existingTags[0].tag_id.name
          : "không có";

      historyService.createHistoryTask({
        task_id: taskId,
        changed_by: userId,
        change_type: `Thay đổi tag từ [${oldTagName}] thành [${nameNewTag.name}]`,
      });
      // Xóa tất cả tag hiện tại của task
      await taskTagRepo.deleteByTaskId(taskId);

      // Gán tag mới cho task
      const taskTag = await taskTagRepo.create({
        task_id: taskId,
        tag_id: tagId,
      });

      return taskTag;
    } catch (error) {
      throw error;
    }
  }

  // Xóa tag khỏi task
  async removeTagFromTask(taskId, tagId) {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(taskId) ||
        !mongoose.Types.ObjectId.isValid(tagId)
      ) {
        throw new Error("ID task hoặc tag không hợp lệ");
      }

      // Kiểm tra TaskTag tồn tại
      const taskTag = await taskTagRepo.findByTaskAndTag(taskId, tagId);
      if (!taskTag) {
        throw new Error("Tag chưa được gán cho task này");
      }

      const deleted = await taskTagRepo.deleteByTaskAndTag(taskId, tagId);
      return deleted;
    } catch (error) {
      throw error;
    }
  }

  async getTagsByBoard(boardId) {
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      throw new Error("Board ID không hợp lệ");
    }
    try {
      const tags = await TagModel.find({ board_id: boardId });
      return tags;
    } catch (error) {
      throw error;
    }
  }

  async findByBoardId(boardId) {
    return await TagModel.find({ board_id: boardId }).lean();
  }
}

module.exports = new TagService();

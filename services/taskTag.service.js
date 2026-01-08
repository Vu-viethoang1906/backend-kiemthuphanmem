const taskTagRepo = require('../repositories/taskTag.repository');

class TaskTagService {
  async addTagToTask(taskId, tagId) {
    if (!taskId || !tagId) throw new Error('Thiếu taskId hoặc tagId');

    // 1️⃣ Kiểm tra xem task đã có tag nào chưa
    const existing = await taskTagRepo.findOne({ task_id: taskId });

    if (existing) {
      // 2️⃣ Nếu đã có → cập nhật tag_id
      existing.tag_id = tagId;
      await existing.save();
      return { message: 'Đã cập nhật tag cho task', data: existing };
    }

    // 3️⃣ Nếu chưa có → tạo mới
    const newTaskTag = await taskTagRepo.create({
      task_id: taskId,
      tag_id: tagId
    });

    return { message: 'Đã thêm tag mới cho task', data: newTaskTag };
  }

  async getTagsByTask(taskId) {
    return await taskTagRepo.findByTaskId(taskId);
  }

  async getTasksByTag(tagId) {
    return await taskTagRepo.findByTagId(tagId);
  }

  async removeTagFromTask(taskId, tagId) {
    return await taskTagRepo.deleteByTaskAndTag(taskId, tagId);
  }

  async removeAllTagsOfTask(taskId) {
    return await taskTagRepo.deleteByTaskId(taskId);
  }

  async removeAllTasksOfTag(tagId) {
    return await taskTagRepo.deleteByTagId(tagId);
  }
}

module.exports = new TaskTagService();

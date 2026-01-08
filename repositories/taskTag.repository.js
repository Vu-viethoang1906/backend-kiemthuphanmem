const TaskTag = require('../models/taskTag.model');
const TaskModel = require('../models/task.model');
const TagModel = require('../models/tag.model');

class TaskTagRepository {
  // 🟢 Tạo TaskTag mới
  async create(data) {
    return await TaskTag.create(data);
  }

  // 🟢 Lấy tất cả TaskTags
  async findAll() {
    return await TaskTag.find().populate('task_id').populate('tag_id');
  }

  // 🟢 Lấy TaskTag theo task và tag
  async findByTaskAndTag(taskId, tagId) {
    return await TaskTag.findOne({ task_id: taskId, tag_id: tagId });
  }

  // 🟢 Lấy TaskTag theo task_id
  async findByTaskId(taskId) {
    return await TaskTag.find({ task_id: taskId }).populate('tag_id');
  }

  // 🟢 Lấy TaskTag theo tag_id
  async findByTagId(tagId) {
    return await TaskTag.find({ tag_id: tagId }).populate('task_id');
  }

  // 🟢 Tìm 1 TaskTag theo điều kiện bất kỳ (dùng cho service)
  async findOne(filter) {
    return await TaskTag.findOne(filter);
  }

  // 🟢 Xóa TaskTag theo task và tag
  async deleteByTaskAndTag(taskId, tagId) {
    return await TaskTag.findOneAndDelete({ task_id: taskId, tag_id: tagId });
  }

  // 🟢 Xóa tất cả TaskTags theo tag
  async deleteByTagId(tagId) {
    return await TaskTag.deleteMany({ tag_id: tagId });
  }

  // 🟢 Xóa tất cả TaskTags theo task
  async deleteByTaskId(taskId) {
    return await TaskTag.deleteMany({ task_id: taskId });
  }

  /**
   * 🟢 Thêm hoặc tái sử dụng tag cho 1 task
   * Nếu tag đã tồn tại trong board → dùng lại
   * Nếu chưa có → tạo mới
   * Sau đó gắn tag này cho task (chỉ 1 tag/task)
   */
  async addTag(nameTag, idTask) {
    // 1️⃣ Kiểm tra task có tồn tại không
    const task = await TaskModel.findById(idTask);
    if (!task) throw new Error('Không tìm thấy task');

    const boardId = task.board_id;

    // 2️⃣ Tìm tag trong board trước (không chỉ trong task tags)
    // Kiểm tra xem có tag nào cùng tên trong board chưa
    const existingTag = await TagModel.findOne({
      board_id: boardId,
      name: nameTag,
      deleted_at: null // Chỉ lấy tag chưa bị xóa
    });

    let tagDoc;
    if (existingTag) {
      tagDoc = existingTag; // 3️⃣ Dùng lại tag cũ
    } else {
      // 4️⃣ Tạo tag mới
      tagDoc = await TagModel.create({
        name: nameTag,
        board_id: boardId,
        created_by: task.created_by
      });
    }

    // 🔒 Đảm bảo mỗi task chỉ có 1 tag
    await TaskTag.deleteMany({ task_id: idTask });

    // 5️⃣ Gắn tag mới vào task
    const newTaskTag = await TaskTag.create({
      task_id: idTask,
      tag_id: tagDoc._id
    });

    return newTaskTag;
  }
}

module.exports = new TaskTagRepository();

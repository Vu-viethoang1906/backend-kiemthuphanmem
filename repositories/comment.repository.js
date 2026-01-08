const Comment = require('../models/comment.model');

class CommentRepository {
  // Tạo comment mới
  async create(data) {
    return await Comment.create(data);
  }

  // Lấy tất cả comments
  async findAll() {
    return await Comment.find()
      .populate('task_id', 'title')
      .populate('user_id', 'username email full_name')
      .sort({ created_at: -1 });
  }

  // Lấy comment theo ID
  async findById(id) {
    return await Comment.findById(id)
      .populate('task_id', 'title')
      .populate('user_id', 'username email full_name');
  }

  // Lấy comments theo task
  async findByTaskId(taskId) {
    return await Comment.find({ task_id: taskId })
      .populate('user_id', 'username email full_name avatar_url')
      // Không populate Collaboration vì chỉ cần ID để group comments, không cần thông tin đầy đủ
      .sort({ created_at: -1 });
  }

  // Lấy comments theo user
  async findByUserId(userId) {
    return await Comment.find({ user_id: userId })
      .populate('task_id', 'title board_id')
      .sort({ created_at: -1 });
  }

  // Cập nhật comment
  async update(id, data) {
    return await Comment.findByIdAndUpdate(id, data, { new: true })
      .populate('task_id', 'title')
      .populate('user_id', 'username email full_name');
  }

  // Xóa comment
  async delete(id) {
    return await Comment.findByIdAndDelete(id);
  }

  // Xóa comments theo task
  async deleteByTaskId(taskId) {
    return await Comment.deleteMany({ task_id: taskId });
  }

  // Xóa comments theo user
  async deleteByUserId(userId) {
    return await Comment.deleteMany({ user_id: userId });
  }

  // ==================== SOFT DELETE METHODS ====================

  async softDelete(id) {
    try {
      return await Comment.findByIdAndUpdate(
        id,
        { deleted_at: new Date() },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async findAllWithDeleted(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const query = {
        $or: [
          { deleted_at: null },
          { deleted_at: { $ne: null } }
        ]
      };

      const [comments, total] = await Promise.all([
        Comment.find(query)
          .populate('task_id', 'title')
          .populate('user_id', 'username email full_name')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Comment.countDocuments(query)
      ]);

      return {
        comments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CommentRepository();

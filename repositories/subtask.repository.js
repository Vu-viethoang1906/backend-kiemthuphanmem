const Subtask = require('../models/subtask.model');

class SubtaskRepository {
    // Lấy tất cả subtask của một task
    async findByTaskId(taskId) {
        return await Subtask.find({ task_id: taskId })
            .sort({ position: 1 })
            .populate('created_by', 'username full_name avatar_url')
            .populate('assigned_to', 'username full_name avatar_url');
    }

    // Lấy một subtask theo ID
    async findById(subtaskId) {
        return await Subtask.findById(subtaskId)
            .populate('created_by', 'username full_name avatar_url')
            .populate('assigned_to', 'username full_name avatar_url');
    }

    // Tạo subtask mới
    async create(data) {
        const subtask = new Subtask(data);
        await subtask.save();
        return await this.findById(subtask._id);
    }

    // Cập nhật subtask
    async update(subtaskId, data) {
        await Subtask.findByIdAndUpdate(subtaskId, data, { new: true });
        return await this.findById(subtaskId);
    }

    // Soft delete subtask
    async delete(subtaskId) {
        return await Subtask.findByIdAndUpdate(
            subtaskId,
            { deleted_at: new Date() },
            { new: true }
        );
    }

    // Lấy position cao nhất của task
    async getMaxPosition(taskId) {
        const result = await Subtask.findOne({ task_id: taskId })
            .sort({ position: -1 })
            .select('position');
        return result?.position || 0;
    }

    // Cập nhật position hàng loạt
    async updatePositions(items) {
        const updatePromises = items.map(item =>
            Subtask.findByIdAndUpdate(item.id, { position: item.position })
        );
        return await Promise.all(updatePromises);
    }

    // Đếm số lượng subtask của task
    async countByTaskId(taskId) {
        return await Subtask.countDocuments({ task_id: taskId });
    }

    // Đếm số lượng subtask đã hoàn thành
    async countCompletedByTaskId(taskId) {
        return await Subtask.countDocuments({ task_id: taskId, is_completed: true });
    }

    // Xóa tất cả subtask của một task (khi xóa task cha)
    async deleteByTaskId(taskId) {
        return await Subtask.updateMany(
            { task_id: taskId },
            { deleted_at: new Date() }
        );
    }
}

module.exports = new SubtaskRepository();

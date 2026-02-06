const subtaskRepository = require('../repositories/subtask.repository');
const Task = require('../models/task.model');
const activityLogService = require('./activityLog.service');

class SubtaskService {
    // Lấy danh sách subtask của task với progress
    async getByTaskId(taskId, userId) {
        // Validate task exists
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task không tồn tại');
        }

        const subtasks = await subtaskRepository.findByTaskId(taskId);
        const totalItems = subtasks.length;
        const completedItems = subtasks.filter(s => s.is_completed).length;

        return {
            items: subtasks,
            progress: {
                completed: completedItems,
                total: totalItems,
                percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
            },
        };
    }

    // Tạo subtask mới
    async create(taskId, data, userId) {
        // Validate task exists
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task không tồn tại');
        }

        if (!data.title || data.title.trim() === '') {
            throw new Error('Title là bắt buộc');
        }

        // Get max position
        const maxPosition = await subtaskRepository.getMaxPosition(taskId);

        const subtaskData = {
            task_id: taskId,
            title: data.title.trim(),
            description: data.description,
            assigned_to: data.assigned_to,
            priority: data.priority,
            due_date: data.due_date,
            created_by: userId,
            position: maxPosition + 1,
        };

        const subtask = await subtaskRepository.create(subtaskData);

        // Log activity
        await activityLogService.createActivityLog({
            user_id: userId,
            action: `đã thêm subtask: "${subtask.title}"`,
            target_type: 'Task',
            target_id: taskId,
        });

        return subtask;
    }

    // Cập nhật subtask
    async update(subtaskId, data, userId) {
        const subtask = await subtaskRepository.findById(subtaskId);
        if (!subtask) {
            throw new Error('Subtask không tồn tại');
        }

        const updateData = {};

        if (data.title !== undefined && data.title.trim() !== '') {
            updateData.title = data.title.trim();
        }

        if (data.description !== undefined) {
            updateData.description = data.description;
        }

        if (data.assigned_to !== undefined) {
            updateData.assigned_to = data.assigned_to;
        }

        if (data.priority !== undefined) {
            updateData.priority = data.priority;
        }

        if (data.due_date !== undefined) {
            updateData.due_date = data.due_date;
        }

        if (data.is_completed !== undefined) {
            updateData.is_completed = Boolean(data.is_completed);
            updateData.completed_at = updateData.is_completed ? new Date() : null;
        }

        const updatedSubtask = await subtaskRepository.update(subtaskId, updateData);

        // Log activity
        let action = `đã cập nhật subtask: "${updatedSubtask.title}"`;
        if (data.is_completed !== undefined) {
            action += ` - ${data.is_completed ? 'hoàn thành' : 'chưa hoàn thành'}`;
        }

        await activityLogService.createActivityLog({
            user_id: userId,
            action,
            target_type: 'Task',
            target_id: subtask.task_id,
        });

        return updatedSubtask;
    }

    // Toggle completion status
    async toggle(subtaskId, userId) {
        const subtask = await subtaskRepository.findById(subtaskId);
        if (!subtask) {
            throw new Error('Subtask không tồn tại');
        }

        const isCompleted = !subtask.is_completed;
        const updateData = {
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date() : null,
        };

        const updatedSubtask = await subtaskRepository.update(subtaskId, updateData);

        // Log activity
        await activityLogService.createActivityLog({
            user_id: userId,
            action: `đã đánh dấu subtask "${updatedSubtask.title}" ${isCompleted ? 'hoàn thành' : 'chưa hoàn thành'}`,
            target_type: 'Task',
            target_id: subtask.task_id,
        });

        return updatedSubtask;
    }

    // Xóa subtask
    async delete(subtaskId, userId) {
        const subtask = await subtaskRepository.findById(subtaskId);
        if (!subtask) {
            throw new Error('Subtask không tồn tại');
        }

        const taskId = subtask.task_id;
        const title = subtask.title;

        await subtaskRepository.delete(subtaskId);

        // Log activity
        await activityLogService.createActivityLog({
            user_id: userId,
            action: `đã xóa subtask: "${title}"`,
            target_type: 'Task',
            target_id: taskId,
        });

        return { success: true };
    }

    // Reorder subtasks
    async reorder(taskId, items, userId) {
        // Validate task exists
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task không tồn tại');
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('Items là bắt buộc');
        }

        await subtaskRepository.updatePositions(items);

        // Log activity
        await activityLogService.createActivityLog({
            user_id: userId,
            action: 'đã thay đổi thứ tự subtask',
            target_type: 'Task',
            target_id: taskId,
        });

        return { success: true };
    }
}

module.exports = new SubtaskService();

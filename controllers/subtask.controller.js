const subtaskService = require('../services/subtask.service');

class SubtaskController {
    // Lấy danh sách subtask của task
    async getByTask(req, res) {
        try {
            const { taskId } = req.params;
            const userId = req.user?.id;

            const result = await subtaskService.getByTaskId(taskId, userId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Tạo subtask mới
    async create(req, res) {
        try {
            const userId = req.user?.id;
            const { taskId } = req.params;
            const data = req.body;

            const subtask = await subtaskService.create(taskId, data, userId);

            res.status(201).json({
                success: true,
                message: 'Tạo subtask thành công',
                data: subtask,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Cập nhật subtask
    async update(req, res) {
        try {
            const userId = req.user?.id;
            const { subtaskId } = req.params;
            const data = req.body;

            const subtask = await subtaskService.update(subtaskId, data, userId);

            res.json({
                success: true,
                message: 'Cập nhật subtask thành công',
                data: subtask,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Toggle completion status
    async toggle(req, res) {
        try {
            const userId = req.user?.id;
            const { subtaskId } = req.params;

            const subtask = await subtaskService.toggle(subtaskId, userId);

            res.json({
                success: true,
                message: 'Cập nhật trạng thái thành công',
                data: subtask,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Xóa subtask
    async delete(req, res) {
        try {
            const userId = req.user?.id;
            const { subtaskId } = req.params;

            await subtaskService.delete(subtaskId, userId);

            res.json({
                success: true,
                message: 'Xóa subtask thành công',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Cập nhật thứ tự subtasks
    async reorder(req, res) {
        try {
            const userId = req.user?.id;
            const { taskId } = req.params;
            const { items } = req.body; // Array of { id, position }

            await subtaskService.reorder(taskId, items, userId);

            res.json({
                success: true,
                message: 'Cập nhật thứ tự subtask thành công',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
}

module.exports = new SubtaskController();

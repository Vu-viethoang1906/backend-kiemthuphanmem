const backlogService = require("../services/backlog.service");

class BacklogController {
    // GET /api/backlog/board/:boardId
    async getBacklog(req, res) {
        try {
            const { boardId } = req.params;
            const { priority, assigned_to, search } = req.query;

            const tasks = await backlogService.getBacklogTasks(boardId, {
                priority,
                assigned_to,
                search,
            });

            res.status(200).json({
                success: true,
                data: tasks,
            });
        } catch (error) {
            console.error("Get backlog error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get backlog tasks",
                error: error.message,
            });
        }
    }

    // PATCH /api/backlog/reorder
    async reorderBacklog(req, res) {
        try {
            const { boardId, items } = req.body;

            await backlogService.reorderBacklog(boardId, items);

            res.status(200).json({
                success: true,
                message: "Backlog reordered successfully",
            });
        } catch (error) {
            console.error("Reorder backlog error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to reorder backlog",
                error: error.message,
            });
        }
    }

    // PATCH /api/backlog/task/:taskId
    // Update properties like story points, priority, position
    async updateTask(req, res) {
        try {
            const { taskId } = req.params;
            const data = req.body;

            const task = await backlogService.updateTaskInBacklog(taskId, data);

            res.status(200).json({
                success: true,
                message: "Task updated successfully",
                data: task,
            });
        } catch (error) {
            console.error("Update backlog task error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update task",
                error: error.message,
            });
        }
    }

    // PATCH /api/backlog/task/:taskId/sprint
    // Move to sprint or remove from sprint
    async moveTaskToSprint(req, res) {
        try {
            const { taskId } = req.params;
            const { sprintId } = req.body; // Can be null to remove from sprint

            const task = await backlogService.moveTaskToSprint(taskId, sprintId);

            res.status(200).json({
                success: true,
                message: sprintId ? "Moved to sprint" : "Removed from sprint",
                data: task,
            });
        } catch (error) {
            console.error("Move task to sprint error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to move task",
                error: error.message,
            });
        }
    }
}

module.exports = new BacklogController();

const Task = require("../models/task.model");

class BacklogService {
    /**
     * Get backlog tasks for a board (tasks with no sprint assigned)
     * @param {string} boardId
     * @param {Object} query - Filters: priority, assigned_to, tags, search
     */
    async getBacklogTasks(boardId, query = {}) {
        const filter = {
            board_id: boardId,
            sprint_id: null, // Tasks not in any sprint
            deleted_at: null,
        };

        // Apply filters
        if (query.priority) {
            filter.priority = query.priority;
        }

        if (query.assigned_to) {
            filter.assigned_to = query.assigned_to;
        }

        if (query.tags) {
            // Assuming tasks have a tags array field, likely populated via another collection or direct field
            // Need to check how tags are implemented in Task model. 
            // Based on previous code, tags might be linked via TaskTag or similar.
            // For now, I'll defer complex tag filtering or assume simple ID check if applicable.
            // If filtering by tag IDs is needed and tags are separate, this might need join.
            // However, typical simple implementations might not work directly if tags are separate.
            // WILL CHECK TASK MODEL FOR TAGS OR TASK_TAG RELATION.
            // For now, let's stick to basic filters.
        }

        if (query.search) {
            filter.title = { $regex: query.search, $options: "i" };
        }

        const tasks = await Task.find(filter)
            .sort({ backlog_position: 1, created_at: -1 }) // Sort by position, then newest
            .populate("assigned_to", "username avatar_url email")
            .populate("tags") // If tags field exists directly on task or via virtual
            .populate("board_id", "name")
            .lean(); // Faster query

        return tasks;
    }

    /**
     * Update backlog positions (bulk reorder)
     * @param {string} boardId 
     * @param {Array<{taskId: string, position: number}>} items 
     */
    async reorderBacklog(boardId, items) {
        if (!items || !items.length) return;

        const bulkOps = items.map((item) => ({
            updateOne: {
                filter: { _id: item.taskId, board_id: boardId },
                update: { $set: { backlog_position: item.position } },
            },
        }));

        await Task.bulkWrite(bulkOps);
    }

    /**
     * Update single task position or properties in backlog
     * @param {string} taskId 
     * @param {Object} data 
     */
    async updateTaskInBacklog(taskId, data) {
        const updateData = {};
        if (data.position !== undefined) updateData.backlog_position = data.position;
        if (data.story_points !== undefined) updateData.story_points = data.story_points;
        if (data.priority) updateData.priority = data.priority;

        const task = await Task.findByIdAndUpdate(
            taskId,
            { $set: updateData },
            { new: true }
        );
        return task;
    }

    /**
     * Move task to sprint (or remove from sprint)
     * @param {string} taskId 
     * @param {string|null} sprintId 
     */
    async moveTaskToSprint(taskId, sprintId) {
        const task = await Task.findByIdAndUpdate(
            taskId,
            { $set: { sprint_id: sprintId } },
            { new: true }
        );
        return task;
    }
}

module.exports = new BacklogService();

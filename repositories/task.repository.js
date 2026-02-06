const Task = require('../models/task.model');
const TaskTag = require('../models/taskTag.model');
class TaskRepository {
  // Tạo task mới
  async create(taskData) {
    const task = new Task(taskData);
    return await task.save();
  }

  // Lấy task theo ID
  async findById(id) {
    const task = await Task.findById(id)
      .populate('column_id', 'name order')
      .populate('swimlane_id', 'name order')
      .populate('created_by', 'username full_name')
      .populate('assigned_to', 'username full_name')
      .lean();

    if (!task) return null;

    // ✅ Lấy luôn tag gắn với task này
    const taskTag = await TaskTag.findOne({ task_id: id })
      .populate('tag_id', 'name color') // chỉ lấy name & color của tag
      .lean();

    if (taskTag && taskTag.tag_id) {
      task.tag = {
        _id: taskTag.tag_id._id,
        name: taskTag.tag_id.name,
        color: taskTag.tag_id.color,
      };
    } else {
      task.tag = null;
    }

    return task;
  }

  // Lấy tất cả tasks của board
  async findByBoard(board_id, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'position',
        sortOrder = 'asc',
        filter = {},
        search = null,
        dateRange = {},
      } = options;

      const skip = (page - 1) * limit;

      // Build query with filters
      const query = { board_id, deleted_at: null };

      // Apply filters
      if (filter.column_id) query.column_id = filter.column_id;
      if (filter.swimlane_id) query.swimlane_id = filter.swimlane_id;
      if (filter.assigned_to) query.assigned_to = filter.assigned_to;
      if (filter.created_by) query.created_by = filter.created_by;
      if (filter.priority) query.priority = filter.priority;

      // Apply date range filters
      if (dateRange.from || dateRange.to) {
        if (dateRange.from) {
          query.due_date = query.due_date || {};
          query.due_date.$gte = new Date(dateRange.from);
        }
        if (dateRange.to) {
          query.due_date = query.due_date || {};
          query.due_date.$lte = new Date(dateRange.to);
        }
      }

      // Apply search
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      // Count total matching tasks
      const total = await Task.countDocuments(query);

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get tasks with pagination
      const tasks = await Task.find(query)
        .populate('column_id', 'name order')
        .populate('swimlane_id', 'name order')
        .populate('created_by', 'username full_name')
        .populate('assigned_to', 'username full_name avatar_url')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      // Lấy task IDs
      const taskIds = tasks.map(t => t._id);

      if (taskIds.length > 0) {
        // Lấy TaskTags
        const taskTags = await TaskTag.find({ task_id: { $in: taskIds } })
          .populate('tag_id', 'name color')
          .lean();

        // Map tags to tasks
        const taskTagMap = {};
        taskTags.forEach(tt => {
          taskTagMap[tt.task_id.toString()] = tt.tag_id
            ? {
                _id: tt.tag_id._id,
                name: tt.tag_id.name,
                color: tt.tag_id.color,
              }
            : null;
        });

        tasks.forEach(task => {
          task.tag = taskTagMap[task._id.toString()] || null;
        });
      }

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy tasks theo column
  async findByColumn(column_id) {
    const tasks = await Task.find({ column_id, deleted_at: null })
      .populate('swimlane_id', 'name')
      .populate('created_by', 'username full_name')
      .populate('assigned_to', 'username full_name')
      .lean();

    tasks.sort((a, b) => a.position - b.position); // sắp xếp theo position tăng dần
    return tasks;
  }

  // Lấy tasks theo swimlane
  async findBySwimlane(swimlane_id) {
    const tasks = await Task.find({ swimlane_id, deleted_at: null })
      .populate('column_id', 'name')
      .populate('created_by', 'username full_name')
      .populate('assigned_to', 'username full_name')
      .lean();

    tasks.sort((a, b) => a.position - b.position); // sắp xếp theo position
    return tasks;
  }
  // Lấy tasks được assign cho user

  // Lấy tasks được tạo bởi user
  async findByCreator(user_id) {
    const tasks = await Task.find({ created_by: user_id, deleted_at: null })
      .populate('board_id', 'title')
      .populate('column_id', 'name')
      .populate('assigned_to', 'username full_name')
      .lean();

    tasks.sort((a, b) => a.position - b.position); // sort position
    return tasks;
  }

  // Lấy tasks được tạo bởi user
  async findByCreator(user_id) {
    return await Task.find({ created_by: user_id })
      .populate('board_id', 'title')
      .populate('column_id', 'name')
      .populate('assigned_to', 'username full_name')
      .sort({ created_at: -1 })
      .lean();
  }

  // Cập nhật task
  async update(id, updateData) {
    const updated = await Task.findByIdAndUpdate(
      id,
      { ...updateData, updated_at: Date.now() },
      { new: true }
    )
      .populate('column_id', 'name order isDone')
      .populate('board_id', 'title')
      .populate('swimlane_id', 'name order')
      .populate('created_by', 'username full_name')
      .populate('assigned_to', 'username full_name avatar_url')
      .lean();

    return updated;
  }

  // Xóa task
  async delete(id) {
    return await Task.findByIdAndDelete(id).lean();
  }

  // Chuyển task sang column khác (drag & drop)
  async moveToColumn(task_id, new_column_id, new_swimlane_id = null) {
    const updateData = {
      column_id: new_column_id,
      updated_at: Date.now(),
    };

    if (new_swimlane_id) {
      updateData.swimlane_id = new_swimlane_id;
    }

    return await Task.findByIdAndUpdate(task_id, updateData, {
      new: true,
    }).lean();
  }

  // Đếm tasks theo trạng thái
  async countByBoard(board_id) {
    return await Task.aggregate([
      { $match: { board_id: board_id } },
      {
        $group: {
          _id: '$column_id',
          count: { $sum: 1 },
        },
      },
    ]);
  }

  // Tìm kiếm tasks
  // Tìm kiếm tasks
  async search(board_id, searchQuery) {
    const tasks = await Task.find({
      board_id,
      deleted_at: null,
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
      ],
    })
      .populate('column_id', 'name')
      .populate('assigned_to', 'username full_name')
      .lean();

    tasks.sort((a, b) => a.position - b.position); // sort position
    return tasks;
  }

  async deleteManyByBoard(board_id, session = null) {
    const query = Task.deleteMany({ board_id });
    return session ? query.session(session) : query;
  }

  // ==================== SOFT DELETE METHODS ====================

  async softDelete(id) {
    try {
      return await Task.findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true });
    } catch (error) {
      throw error;
    }
  }

  async findAllWithDeleted(options = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const query = {
        $or: [{ deleted_at: null }, { deleted_at: { $ne: null } }],
      };

      const [tasks, total] = await Promise.all([
        Task.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Task.countDocuments(query),
      ]);

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }
  // Reorder tất cả task trong column (hoặc swimlane nếu có)
  async reorderColumnTasks(column_id, swimlane_id = null) {
    const query = { column_id };
    if (swimlane_id) query.swimlane_id = swimlane_id;

    const tasks = await Task.find(query)
      .sort({ position: 1 }) // sắp xếp theo position hiện tại
      .lean();

    let position = 10;
    const increment = 10;

    for (const task of tasks) {
      await Task.findByIdAndUpdate(task._id, { position });
      position += increment;
    }

    return true;
  }
  /**
   * Lấy danh sách task theo column và swimlane (nếu có)
   * @param {ObjectId} column_id
   * @param {ObjectId | null} swimlane_id
   * @returns {Promise<Array>}
   */
  async findByColumnAndSwimlane(column_id, swimlane_id = null) {
    const filter = { column_id };

    if (swimlane_id) {
      filter.swimlane_id = swimlane_id;
    } else {
      // Nếu swimlane không có, lọc các task không có swimlane
      filter.$or = [{ swimlane_id: { $exists: false } }, { swimlane_id: null }];
    }

    // Sắp xếp theo position tăng dần
    return await Task.find(filter).sort({ position: 1 }).lean();
  }

  async countTask(columnId, boardId) {
    try {
      const quality = await Task.countDocuments({
        column_id: columnId,
        board_id: boardId,
      });

      return quality;
    } catch (error) {}
  }

  // Lấy tất cả tasks được assign cho user
  async findByAssignedUser(user_id) {
    try {
      const tasks = await Task.find({
        assigned_to: user_id,
        deleted_at: null,
      })
        .populate('board_id', 'title')
        .populate('column_id', 'name order isDone')
        .populate('swimlane_id', 'name order')
        .populate('created_by', 'username full_name')
        .populate('assigned_to', 'username full_name avatar_url')
        .sort({ created_at: -1 })
        .lean();

      return tasks;
    } catch (error) {
      throw error;
    }
  }

  // ⭐ Lấy tất cả tasks đã được star bởi user
  async findStarredByUser(userId) {
    return await Task.find({
      starred_by: userId,
      deleted_at: null,
    })
      .populate('column_id', 'name order isDone isDoneColumn')
      .populate('swimlane_id', 'name order')
      .populate('board_id', 'title')
      .populate('created_by', 'username full_name')
      .populate('assigned_to', 'username full_name avatar_url')
      .sort({ updated_at: -1 })
      .lean();
  }
}

module.exports = new TaskRepository();

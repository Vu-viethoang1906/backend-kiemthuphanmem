const AtRiskTask = require('../models/atRiskTask.model');

class AtRiskTaskRepository {
  async upsert(task_id, data) {
    return await AtRiskTask.findOneAndUpdate(
      { task_id, is_resolved: false },
      {
        $set: {
          ...data,
          detected_at: new Date(),
          updated_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  }

  async findByTaskId(task_id) {
    return await AtRiskTask.findOne({ task_id, is_resolved: false }).lean();
  }

  async findByBoardId(board_id, options = {}) {
    const { is_resolved = false, sortBy = 'risk_score', sortOrder = 'desc' } = options;

    const query = { board_id, is_resolved };
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const results = await AtRiskTask.find(query)
      .populate({
        path: 'task_id',
        select: 'title due_date assigned_to column_id estimate_hours',
        populate: [
          {
            path: 'assigned_to',
            select: 'full_name username email',
          },
          {
            path: 'column_id',
            select: 'name order isDone',
          },
        ],
      })
      .populate('board_id', 'title')
      .sort(sort)
      .lean();

    return results.map(item => {
      if (item.risk_reasons && Array.isArray(item.risk_reasons) && item.risk_reasons.length > 0) {
        const calculatedScore = item.risk_reasons.reduce((sum, reason) => {
          const score =
            typeof reason.score === 'number' ? reason.score : parseFloat(reason.score) || 0;
          return sum + score;
        }, 0);

        if (Math.abs(item.risk_score - calculatedScore) > 0.01) {
          item.risk_score = calculatedScore;
        }
      }
      return item;
    });
  }

  async findByUserId(user_id, options = {}) {
    const { is_resolved = false } = options;

    const Task = require('../models/task.model');

    const tasks = await Task.find({ assigned_to: user_id, deleted_at: null }).select('_id').lean();

    const taskIds = tasks.map(t => t._id);

    if (taskIds.length === 0) return [];

    const results = await AtRiskTask.find({
      task_id: { $in: taskIds },
      is_resolved,
    })
      .populate({
        path: 'task_id',
        select: 'title due_date assigned_to column_id estimate_hours',
        populate: [
          {
            path: 'assigned_to',
            select: 'full_name username email',
          },
          {
            path: 'column_id',
            select: 'name order isDone',
          },
        ],
      })
      .populate('board_id', 'title')
      .sort({ risk_score: -1 })
      .lean();

    return results.map(item => {
      if (item.risk_reasons && Array.isArray(item.risk_reasons) && item.risk_reasons.length > 0) {
        const calculatedScore = item.risk_reasons.reduce((sum, reason) => {
          const score =
            typeof reason.score === 'number' ? reason.score : parseFloat(reason.score) || 0;
          return sum + score;
        }, 0);

        if (Math.abs(item.risk_score - calculatedScore) > 0.01) {
          item.risk_score = calculatedScore;
        }
      }
      return item;
    });
  }

  async markAsResolved(task_id) {
    return await AtRiskTask.findOneAndUpdate(
      { task_id, is_resolved: false },
      {
        $set: {
          is_resolved: true,
          resolved_at: new Date(),
          updated_at: new Date(),
        },
      },
      { new: true }
    );
  }

  async deleteByTaskId(task_id) {
    return await AtRiskTask.deleteMany({ task_id });
  }

  async findAllActive(options = {}) {
    const { limit = 100, sortBy = 'risk_score', sortOrder = 'desc' } = options;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const results = await AtRiskTask.find({ is_resolved: false })
      .populate({
        path: 'task_id',
        select: 'title due_date assigned_to column_id estimate_hours board_id',
        populate: [
          {
            path: 'assigned_to',
            select: 'full_name username email',
          },
          {
            path: 'column_id',
            select: 'name order isDone',
          },
        ],
      })
      .populate('board_id', 'title')
      .sort(sort)
      .limit(limit)
      .lean();

    return results.map(item => {
      if (item.risk_reasons && Array.isArray(item.risk_reasons) && item.risk_reasons.length > 0) {
        const calculatedScore = item.risk_reasons.reduce((sum, reason) => {
          const score =
            typeof reason.score === 'number' ? reason.score : parseFloat(reason.score) || 0;
          return sum + score;
        }, 0);

        if (Math.abs(item.risk_score - calculatedScore) > 0.01) {
          item.risk_score = calculatedScore;
        }
      }
      return item;
    });
  }

  async countByBoard(board_id, is_resolved = false) {
    return await AtRiskTask.countDocuments({ board_id, is_resolved });
  }
}

module.exports = new AtRiskTaskRepository();

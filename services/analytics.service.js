const Task = require('../models/task.model');
const Board = require('../models/board.model');
const Column = require('../models/column.model');
const UserPoint = require('../models/userPoint.model');
const mongoose = require('mongoose');
const taskService = require('../services/task.service');
const boardMemberService = require('../services/boardMember.service');
const HistoryTask = require('../models/historyTask.model');
class AnalyticsService {
  /**
   * Story 49: Line Chart - Thống kê tiến độ theo thời gian
   * @param {Object} params - { board_id, start_date, end_date, granularity }
   * @returns {Object}
   */
  async getLineChartData(params) {
    const { board_id, start_date, end_date, granularity = 'day' } = params;

    if (!board_id || !mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('Board ID không hợp lệ');
    }

    if (!start_date || !end_date) {
      throw new Error('start_date và end_date là bắt buộc');
    }

    const validGranularities = ['day', 'week', 'month'];
    if (!validGranularities.includes(granularity)) {
      throw new Error('granularity phải là day, week hoặc month');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date)) {
      throw new Error('start_date phải có format YYYY-MM-DD');
    }
    if (!dateRegex.test(end_date)) {
      throw new Error('end_date phải có format YYYY-MM-DD');
    }

    const [startYear, startMonth, startDay] = start_date.split('-').map(Number);
    const [endYear, endMonth, endDay] = end_date.split('-').map(Number);

    if (startMonth < 1 || startMonth > 12) {
      throw new Error('start_date không hợp lệ (tháng không tồn tại)');
    }
    if (endMonth < 1 || endMonth > 12) {
      throw new Error('end_date không hợp lệ (tháng không tồn tại)');
    }

    const daysInStartMonth = new Date(startYear, startMonth, 0).getDate();
    const daysInEndMonth = new Date(endYear, endMonth, 0).getDate();

    if (startDay < 1 || startDay > daysInStartMonth) {
      throw new Error('start_date không hợp lệ (ngày không tồn tại)');
    }
    if (endDay < 1 || endDay > daysInEndMonth) {
      throw new Error('end_date không hợp lệ (ngày không tồn tại)');
    }

    const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Ngày không hợp lệ');
    }

    if (startDate >= endDate) {
      throw new Error('start_date phải nhỏ hơn end_date');
    }

    // Kiểm tra board tồn tại
    const board = await Board.findById(board_id);
    if (!board) {
      throw new Error('Board không tồn tại');
    }

    // Lấy Done column của board
    const doneColumn = await Column.findOne({
      board_id,
      isDone: true,
    });

    // Tạo date range theo granularity
    const dateRanges = this._generateDateRanges(startDate, endDate, granularity);

    // Lấy tasks của board
    const tasks = await Task.find({
      board_id,
      deleted_at: null,
    })
      .populate('column_id')
      .lean();
    const chartData = dateRanges.map(range => {
      const tasksAtPoint = tasks.filter(task => {
        const taskCreatedAt = new Date(task.created_at);
        return taskCreatedAt <= range.end;
      });
      const completedTasks = tasksAtPoint.filter(task => {
        if (!doneColumn || !task.column_id) return false;

        const columnId = task.column_id._id || task.column_id;
        const isDone = columnId.toString() === doneColumn._id.toString();
        if (!isDone) return false;
        const updatedAt = new Date(task.updated_at);
        return updatedAt <= range.end;
      });
      const overdueTasks = tasksAtPoint.filter(task => {
        if (!task.due_date || !task.column_id) return false;

        const dueDate = new Date(task.due_date);
        const columnId = task.column_id._id || task.column_id;
        const isDone = doneColumn && columnId.toString() === doneColumn._id.toString();
        return dueDate < range.end && !isDone;
      });

      const inProgressTasks = tasksAtPoint.length - completedTasks.length;

      return {
        date: range.label,
        total: tasksAtPoint.length || 0,
        completed: completedTasks.length || 0,
        overdue: overdueTasks.length || 0,
        inProgress: inProgressTasks >= 0 ? inProgressTasks : 0,
      };
    });

    return {
      board: {
        id: board._id,
        title: board.title,
      },
      dateRange: {
        start: start_date,
        end: end_date,
        granularity,
      },
      data: chartData,
    };
  }

  /**
   * Story 47: Dashboard tổng quan
   * @param {String} board_id
   * @returns {Object} Dashboard statistics
   */
  async getDashboardStats(board_id) {
    if (!board_id || !mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('Board ID không hợp lệ');
    }

    const board = await Board.findById(board_id);
    if (!board) {
      throw new Error('Board không tồn tại');
    }
    const doneColumn = await Column.findOne({
      board_id,
      isDone: true,
    });
    const tasks = await Task.find({
      board_id,
      deleted_at: null,
    })
      .populate('column_id')
      .lean();

    const now = new Date();

    // Tính toán statistics
    const totalTasks = tasks.length;
    const completedTasks = doneColumn
      ? tasks.filter(t => {
          if (!t.column_id) return false;
          const columnId = t.column_id._id || t.column_id;
          return columnId.toString() === doneColumn._id.toString();
        }).length
      : 0;

    const overdueTasks = tasks.filter(task => {
      if (!task.due_date || !task.column_id) return false;
      const dueDate = new Date(task.due_date);
      const columnId = task.column_id._id || task.column_id;
      const isDone = doneColumn && columnId.toString() === doneColumn._id.toString();
      return dueDate < now && !isDone;
    }).length;

    const completionRate =
      totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(2)) : 0;

    return {
      board: {
        id: board._id,
        title: board.title,
      },
      stats: {
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        inProgressTasks: totalTasks - completedTasks || 0,
        overdueTasks: overdueTasks || 0,
        completionRate: completionRate || 0,
      },
    };
  }

  /**
   * Story 48: Tỷ lệ hoàn thành theo Board/User/Center/Group
   */
  async getCompletionRate(params) {
    const { board_id, user_id, center_id, group_id } = params;

    let query = { deleted_at: null };

    if (board_id) {
      if (!mongoose.Types.ObjectId.isValid(board_id)) {
        throw new Error('Board ID không hợp lệ');
      }
      query.board_id = board_id;
    }

    if (user_id) {
      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new Error('User ID không hợp lệ');
      }
      query.assigned_to = user_id;
    }

    if (center_id) {
      if (!mongoose.Types.ObjectId.isValid(center_id)) {
        throw new Error('Center ID không hợp lệ');
      }
    }

    if (group_id) {
      if (!mongoose.Types.ObjectId.isValid(group_id)) {
        throw new Error('Group ID không hợp lệ');
      }
    }

    // Lấy tasks
    const tasks = await Task.find(query).populate('column_id').lean();

    // Lấy Done column
    let doneColumn = null;
    if (board_id) {
      doneColumn = await Column.findOne({
        board_id,
        isDoneColumn: true,
      });
    }

    const totalTasks = tasks.length;
    const completedTasks = doneColumn
      ? tasks.filter(t => {
          if (!t.column_id) return false;
          const columnId = t.column_id._id || t.column_id;
          return columnId.toString() === doneColumn._id.toString();
        }).length
      : tasks.filter(
          t => t.column_id && t.column_id.name && t.column_id.name.toLowerCase().includes('done')
        ).length;

    const completionRate =
      totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(2)) : 0;

    return {
      totalTasks: totalTasks || 0,
      completedTasks: completedTasks || 0,
      inProgressTasks: totalTasks - completedTasks || 0,
      completionRate: completionRate || 0,
    };
  }

  // analyticsService.js
  /**
   * Parse change_type strings into { from, to }.
   * Handles variants like:
   *  - "Di chuyển từ cột 'Done' sang cột 'In Progress'"
   *  - "Di chuyển từ cột \"Backlog\" sang cột \"Doing\""
   *  - "Todo -> In Progress"
   *  - "Backlog → Doing"
   *  - "MOVE: Backlog → Doing"
   *
   * Returns null if it can't parse.
   */
  parseColumns(changeType) {
    if (!changeType || typeof changeType !== 'string') return null;

    const s = changeType.trim();

    // Nếu không chứa từ khóa liên quan tới CỘT thì bỏ
    if (!s.includes('cột') && !s.includes('column') && !/→|->/.test(s)) {
      return null;
    }

    // Pattern tiếng Việt chuẩn
    let m = s.match(/từ cột ['"]([^'"]+)['"] sang cột ['"]([^'"]+)['"]/i);
    if (m) return { from: m[1].trim(), to: m[2].trim() };

    // Pattern không dấu nháy
    m = s.match(/từ cột (.+?) sang cột (.+)/i);
    if (m) return { from: m[1].trim(), to: m[2].trim() };

    return null;
  }

  /**
   * Tính Cycle Time cho một task hoặc nhiều task
    - id task hoặc array id task
   * @returns {Array} kết quả tính toán
   */
  async getCycleTimeTask(idBoard) {
    try {
      if (!mongoose.Types.ObjectId.isValid(idBoard)) {
        throw new Error('Board ID không hợp lệ');
      }

      const board = await Board.findById(idBoard);
      if (!board) throw new Error('Không tìm thấy bảng');

      const tasks = await Task.find({ board_id: idBoard, deleted_at: null })
        .populate('assigned_to', 'full_name username email')
        .populate('swimlane_id', 'name')
        .lean();

      let taskResults = [];
      const cycleTimes = []; // Để tính average, median, P90

      // Lấy danh sách các cột Done
      const doneColumns = await Column.find({ board_id: idBoard, isDone: true }).select('name');
      const doneColumnNames = doneColumns.map(c => c.name);

      const columnStats = {}; // để tính median từng cột

      // Breakdown data
      const breakdownByPriority = { High: [], Medium: [], Low: [], None: [] };
      const breakdownBySwimlane = {};

      for (const task of tasks) {
        const histories = await HistoryTask.find({ task_id: task._id }).sort({ createdAt: 1 });

        // Tính cycle time = done_at - created_at (tính bằng giờ)
        let cycleTimeHours = 0;
        if (task.done_at && task.created_at) {
          const doneAt = new Date(task.done_at);
          const createdAt = new Date(task.created_at);
          cycleTimeHours = (doneAt - createdAt) / (1000 * 60 * 60);
          if (cycleTimeHours < 0) cycleTimeHours = 0;

          // Chỉ thêm vào cycleTimes nếu task đã done
          cycleTimes.push(cycleTimeHours);
        }

        // Tính tổng thời gian ở từng cột (bỏ các cột Done)
        const columnTimes = {};
        if (histories.length >= 2) {
          for (let i = 0; i < histories.length; i++) {
            const current = histories[i];
            const next = histories[i + 1];

            const parse = this.parseColumns(current.change_type);
            if (!parse || doneColumnNames.includes(parse.from)) continue;

            // Nếu có next => tính thời gian giữa current và next
            let hours = 0;
            if (next) {
              hours = (new Date(next.createdAt) - new Date(current.createdAt)) / (1000 * 60 * 60);
            } else {
              // Nếu đây là history cuối cùng => tính thời gian từ lúc này đến hiện tại
              hours = (new Date() - new Date(current.createdAt)) / (1000 * 60 * 60);
            }

            if (!columnTimes[parse.from]) columnTimes[parse.from] = 0;
            columnTimes[parse.from] += hours;

            if (!columnStats[parse.from]) columnStats[parse.from] = [];
            columnStats[parse.from].push(hours);
          }
        }

        const columnDurations = Object.keys(columnTimes).map(col => ({
          column: col,
          hours: parseFloat(columnTimes[col].toFixed(2)),
        }));

        const priority = task.priority || 'None';
        const swimlaneName = task.swimlane_id?.name || 'None';
        const assignedTo = task.assigned_to
          ? {
              id: task.assigned_to._id || task.assigned_to.id,
              name: task.assigned_to.full_name || task.assigned_to.username || 'Unknown',
              email: task.assigned_to.email || '',
            }
          : null;

        // Thêm vào breakdown
        if (task.done_at && task.created_at) {
          if (!breakdownByPriority[priority]) breakdownByPriority[priority] = [];
          breakdownByPriority[priority].push(cycleTimeHours);

          if (!breakdownBySwimlane[swimlaneName]) breakdownBySwimlane[swimlaneName] = [];
          breakdownBySwimlane[swimlaneName].push(cycleTimeHours);
        }

        taskResults.push({
          task_id: task._id,
          title: task.title,
          assigned_to: assignedTo,
          priority: priority,
          swimlane: swimlaneName,
          cycleTimeHours: parseFloat(cycleTimeHours.toFixed(2)),
          cycleTimeDays: parseFloat((cycleTimeHours / 24).toFixed(2)),
          columnDurations,
          histories, // lưu tạm để xác định cột hiện tại
        });
      }

      // Tính average, median, P90 cho cycle time tổng thể
      let averageCycleTime = 0;
      let medianCycleTime = 0;
      let p90CycleTime = 0;

      if (cycleTimes.length > 0) {
        const sorted = [...cycleTimes].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        averageCycleTime = parseFloat((sum / sorted.length).toFixed(2));

        const mid = Math.floor(sorted.length / 2);
        medianCycleTime =
          sorted.length % 2 !== 0
            ? parseFloat(sorted[mid].toFixed(2))
            : parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));

        // P90 (90th percentile)
        const p90Index = Math.ceil(sorted.length * 0.9) - 1;
        p90CycleTime = parseFloat(sorted[p90Index].toFixed(2));
      }

      // Tính median từng cột
      const columnMedians = {};
      for (const col in columnStats) {
        const sorted = [...columnStats[col]].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        columnMedians[col] =
          sorted.length % 2 !== 0
            ? parseFloat(sorted[mid].toFixed(2))
            : parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
      }

      // Xác định outliers: cycle time > 2x median cycle time
      const outliers = [];
      for (const task of taskResults) {
        if (task.cycleTimeHours > 0 && medianCycleTime > 0) {
          const ratio = task.cycleTimeHours / medianCycleTime;
          if (ratio > 2) {
            task.isOutlier = true;
            task.outlierRatio = parseFloat(ratio.toFixed(2));
            outliers.push({
              task_id: task.task_id,
              title: task.title,
              assigned_to: task.assigned_to,
              cycleTimeHours: task.cycleTimeHours,
              cycleTimeDays: task.cycleTimeDays,
              medianCycleTime: medianCycleTime,
              ratio: task.outlierRatio,
            });
          } else {
            task.isOutlier = false;
          }
        } else {
          task.isOutlier = false;
        }
      }

      // Tính breakdown theo priority
      const breakdownByPriorityResult = {};
      for (const priority in breakdownByPriority) {
        const times = breakdownByPriority[priority];
        if (times.length > 0) {
          const sorted = [...times].sort((a, b) => a - b);
          const sum = times.reduce((a, b) => a + b, 0);
          const avg = sum / times.length;
          const mid = Math.floor(sorted.length / 2);
          const median =
            sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          const p90Index = Math.ceil(sorted.length * 0.9) - 1;
          const p90 = sorted[p90Index];

          breakdownByPriorityResult[priority] = {
            count: times.length,
            average: parseFloat(avg.toFixed(2)),
            median: parseFloat(median.toFixed(2)),
            p90: parseFloat(p90.toFixed(2)),
          };
        } else {
          breakdownByPriorityResult[priority] = {
            count: 0,
            average: 0,
            median: 0,
            p90: 0,
          };
        }
      }

      // Tính breakdown theo swimlane
      const breakdownBySwimlaneResult = {};
      for (const swimlane in breakdownBySwimlane) {
        const times = breakdownBySwimlane[swimlane];
        if (times.length > 0) {
          const sorted = [...times].sort((a, b) => a - b);
          const sum = times.reduce((a, b) => a + b, 0);
          const avg = sum / times.length;
          const mid = Math.floor(sorted.length / 2);
          const median =
            sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          const p90Index = Math.ceil(sorted.length * 0.9) - 1;
          const p90 = sorted[p90Index];

          breakdownBySwimlaneResult[swimlane] = {
            count: times.length,
            average: parseFloat(avg.toFixed(2)),
            median: parseFloat(median.toFixed(2)),
            p90: parseFloat(p90.toFixed(2)),
          };
        } else {
          breakdownBySwimlaneResult[swimlane] = {
            count: 0,
            average: 0,
            median: 0,
            p90: 0,
          };
        }
      }

      // Xoá histories trước khi trả về
      const tasksData = taskResults.map(t => {
        const { histories, ...rest } = t;
        return rest;
      });

      return {
        board: {
          id: board._id,
          title: board.title,
        },
        summary: {
          totalTasks: tasks.length,
          completedTasks: cycleTimes.length,
          averageCycleTime: averageCycleTime,
          medianCycleTime: medianCycleTime,
          p90CycleTime: p90CycleTime,
          averageCycleTimeDays: parseFloat((averageCycleTime / 24).toFixed(2)),
          medianCycleTimeDays: parseFloat((medianCycleTime / 24).toFixed(2)),
          p90CycleTimeDays: parseFloat((p90CycleTime / 24).toFixed(2)),
        },
        breakdown: {
          byPriority: breakdownByPriorityResult,
          bySwimlane: breakdownBySwimlaneResult,
        },
        outliers: outliers,
        columnMedians: columnMedians,
        tasks: tasksData,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async isDone(nameColumn) {
    const column = await Column.findOne({ name: nameColumn });

    if (column.isDone) return true;
    return false;
  }

  async getThroughputAndCFD(idBoard, wipLimit = 5, startDate = null, endDate = null) {
    try {
      if (!mongoose.Types.ObjectId.isValid(idBoard)) {
        throw new Error('Board ID không hợp lệ');
      }

      const board = await Board.findById(idBoard);
      if (!board) throw new Error('Không tìm thấy bảng');

      const tasks = await Task.find({ board_id: idBoard });
      const taskIds = tasks.map(t => t._id);

      // Build query with optional date filter
      const historyQuery = { task_id: { $in: taskIds } };
      if (startDate || endDate) {
        historyQuery.createdAt = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          historyQuery.createdAt.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          historyQuery.createdAt.$lte = end;
        }
      }

      const histories = await HistoryTask.find(historyQuery).sort({
        createdAt: 1,
      });
      const columns = await Column.find({ board_id: idBoard });
      const columnNames = columns.map(c => c.name);

      // Throughput
      const columnFlow = {};
      for (const col of columnNames) columnFlow[col] = { entered: 0, exited: 0 };
      for (const h of histories) {
        const parse = this.parseColumns(h.change_type);
        if (!parse) continue;
        if (parse.to && columnFlow[parse.to]) columnFlow[parse.to].entered += 1;
        if (parse.from && columnFlow[parse.from]) columnFlow[parse.from].exited += 1;
      }

      // Average time in column
      const columnTimes = {};
      for (const col of columnNames) columnTimes[col] = [];
      for (const task of tasks) {
        const taskHistories = histories
          .filter(h => h.task_id.equals(task._id))
          .sort((a, b) => a.createdAt - b.createdAt);
        for (let i = 0; i < taskHistories.length; i++) {
          const current = taskHistories[i];
          const next = taskHistories[i + 1];
          const parse = this.parseColumns(current.change_type);
          if (!parse) continue;

          let hours = 0;
          if (next) {
            hours = (new Date(next.createdAt) - new Date(current.createdAt)) / (1000 * 60 * 60);
          } else {
            hours = (new Date() - new Date(current.createdAt)) / (1000 * 60 * 60);
          }

          if (parse.from && columnTimes[parse.from]) columnTimes[parse.from].push(hours);
        }
      }

      const columnAvgTimes = {};
      for (const col of columnNames) {
        const arr = columnTimes[col];
        columnAvgTimes[col] = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      }

      // CFD
      const cfd = [];
      const firstHistoryDate = histories.length
        ? histories[0].createdAt
        : startDate
          ? new Date(startDate)
          : new Date();
      const lastDate = endDate ? new Date(endDate) : new Date();
      // Ensure we start from the beginning of the first day
      const start = new Date(firstHistoryDate);
      start.setHours(0, 0, 0, 0);
      // Ensure we end at the end of the last day
      const end = new Date(lastDate);
      end.setHours(23, 59, 59, 999);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const snapshot = { date: new Date(d) };
        for (const col of columnNames) snapshot[col] = 0;

        for (const task of tasks) {
          const taskHistories = histories
            .filter(h => h.task_id.equals(task._id))
            .sort((a, b) => a.createdAt - b.createdAt);
          if (!taskHistories.length) continue;

          let currentCol = this.parseColumns(taskHistories[0].change_type)?.to || null;
          for (let i = 1; i < taskHistories.length; i++) {
            const h = taskHistories[i];
            if (h.createdAt <= d) {
              currentCol = this.parseColumns(h.change_type)?.to || currentCol;
            } else {
              break;
            }
          }

          if (currentCol) snapshot[currentCol] += 1;
        }

        cfd.push(snapshot);
      }

      // WIP violations
      const wipViolations = {};
      for (const snap of cfd) {
        for (const col of columnNames) {
          if (snap[col] > wipLimit) {
            if (!wipViolations[col]) wipViolations[col] = [];
            wipViolations[col].push({ date: snap.date, count: snap[col] });
          }
        }
      }

      return {
        columnFlow,
        columnAvgTimes,
        cfd,
        wipViolations,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  /**
   * Helper: Generate date ranges based on granularity
   */
  _generateDateRanges(startDate, endDate, granularity) {
    const ranges = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      let next = new Date(current);
      let label = '';

      switch (granularity) {
        case 'day':
          next.setDate(next.getDate() + 1);
          label = current.toISOString().split('T')[0];
          break;
        case 'week':
          next.setDate(next.getDate() + 7);
          label = `Week ${this._getWeekNumber(current)}`;
          break;
        case 'month':
          next.setMonth(next.getMonth() + 1);
          label = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          next.setDate(next.getDate() + 1);
          label = current.toISOString().split('T')[0];
      }

      ranges.push({
        start: new Date(current),
        end: next > endDate ? new Date(endDate) : new Date(next),
        label,
      });

      current = next;
    }

    return ranges;
  }

  /**
   * Helper: Get week number of the year
   */
  _getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  async getCompletionSpeed(params) {
    const { board_id, start_date, end_date } = params;

    if (!board_id || !mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('Board ID không hợp lệ');
    }

    if (!start_date || !end_date) {
      throw new Error('start_date và end_date là bắt buộc');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date)) {
      throw new Error('start_date phải có format YYYY-MM-DD');
    }
    if (!dateRegex.test(end_date)) {
      throw new Error('end_date phải có format YYYY-MM-DD');
    }

    const [startYear, startMonth, startDay] = start_date.split('-').map(Number);
    const [endYear, endMonth, endDay] = end_date.split('-').map(Number);

    if (startMonth < 1 || startMonth > 12) {
      throw new Error('start_date không hợp lệ (tháng không tồn tại)');
    }
    if (endMonth < 1 || endMonth > 12) {
      throw new Error('end_date không hợp lệ (tháng không tồn tại)');
    }

    const daysInStartMonth = new Date(startYear, startMonth, 0).getDate();
    const daysInEndMonth = new Date(endYear, endMonth, 0).getDate();

    if (startDay < 1 || startDay > daysInStartMonth) {
      throw new Error('start_date không hợp lệ (ngày không tồn tại)');
    }
    if (endDay < 1 || endDay > daysInEndMonth) {
      throw new Error('end_date không hợp lệ (ngày không tồn tại)');
    }

    const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Ngày không hợp lệ');
    }

    if (startDate >= endDate) {
      throw new Error('start_date phải nhỏ hơn end_date');
    }

    const board = await Board.findById(board_id);
    if (!board) {
      throw new Error('Board không tồn tại');
    }

    const doneColumn = await Column.findOne({
      board_id,
      isDone: true,
    });

    if (!doneColumn) {
      return {
        board: {
          id: board._id,
          title: board.title,
        },
        dateRange: {
          start: start_date,
          end: end_date,
        },
        weeklyData: [],
        averageVelocity: 0,
        trend: null,
        previousPeriodComparison: null,
        priorityBreakdown: null,
        forecast: null,
      };
    }

    const endDateInclusive = new Date(endDate);
    endDateInclusive.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      board_id,
      deleted_at: null,
      done_at: { $ne: null, $gte: startDate, $lte: endDateInclusive },
    }).lean();

    const weekRanges = this._generateDateRanges(startDate, endDateInclusive, 'week');

    const weeklyData = weekRanges.map((range, index) => {
      const rangeEnd = new Date(range.end);
      rangeEnd.setHours(23, 59, 59, 999);

      const completedInWeek = tasks.filter(task => {
        const doneAt = new Date(task.done_at);
        return doneAt >= range.start && doneAt <= rangeEnd;
      });

      const priorityBreakdown = {
        High: completedInWeek.filter(t => t.priority === 'High').length,
        Medium: completedInWeek.filter(t => t.priority === 'Medium').length,
        Low: completedInWeek.filter(t => t.priority === 'Low').length,
        None: completedInWeek.filter(t => !t.priority).length,
      };

      const weekNumber = this._getWeekNumber(range.start);

      return {
        weekNumber,
        week: `Week ${weekNumber}`,
        start: range.start.toISOString().split('T')[0],
        end: range.end.toISOString().split('T')[0],
        completedTasks: completedInWeek.length,
        priorityBreakdown,
      };
    });

    const totalCompleted = weeklyData.reduce((sum, week) => sum + week.completedTasks, 0);
    const totalWeeks = weekRanges.length;
    const averageVelocity =
      totalWeeks > 0 ? parseFloat((totalCompleted / totalWeeks).toFixed(2)) : 0;

    let trend = null;
    let previousPeriodComparison = null;
    let priorityBreakdown = null;
    let forecast = null;

    if (weeklyData.length >= 2) {
      const speeds = weeklyData.map(w => w.completedTasks);
      trend = this._calculateTrend(speeds);
      previousPeriodComparison = this._compareWithPreviousPeriod(weeklyData, totalWeeks);
      priorityBreakdown = this._calculatePriorityBreakdown(weeklyData);

      if (trend) {
        const lastWeekSpeed = speeds[speeds.length - 1];
        forecast = this._forecastNextWeeks(lastWeekSpeed, trend.slope, averageVelocity);
      }
    }

    return {
      board: {
        id: board._id,
        title: board.title,
      },
      dateRange: {
        start: start_date,
        end: end_date,
      },
      weeklyData,
      averageVelocity,
      trend,
      previousPeriodComparison,
      priorityBreakdown,
      forecast,
    };
  }

  _calculateTrend(values) {
    if (values.length < 2) return null;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      slope: parseFloat(slope.toFixed(2)),
      intercept: parseFloat(intercept.toFixed(2)),
      direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
    };
  }

  _forecastNextWeeks(currentSpeed, trendSlope, averageVelocity) {
    const baseSpeed = currentSpeed > 0 ? currentSpeed : averageVelocity;
    const adjustedSlope = Math.abs(trendSlope) > 5 ? (trendSlope > 0 ? 5 : -5) : trendSlope;

    const nextWeek = Math.max(0, Math.round(baseSpeed + adjustedSlope));
    const next2Weeks = Math.max(0, Math.round(baseSpeed + adjustedSlope * 2));
    const next4Weeks = Math.max(0, Math.round(baseSpeed + adjustedSlope * 4));

    const confidence =
      Math.abs(trendSlope) < 1 ? 'low' : Math.abs(trendSlope) > 3 ? 'high' : 'medium';

    return {
      nextWeek,
      next2Weeks,
      next4Weeks,
      confidence,
    };
  }

  _compareWithPreviousPeriod(weeklyData, totalWeeks) {
    if (weeklyData.length < 4) return null;

    const midPoint = Math.floor(weeklyData.length / 2);
    const firstHalf = weeklyData.slice(0, midPoint);
    const secondHalf = weeklyData.slice(midPoint);

    const firstHalfTotal = firstHalf.reduce((sum, week) => sum + week.completedTasks, 0);
    const secondHalfTotal = secondHalf.reduce((sum, week) => sum + week.completedTasks, 0);

    const firstHalfAvg = firstHalf.length > 0 ? firstHalfTotal / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalfTotal / secondHalf.length : 0;

    const difference = secondHalfAvg - firstHalfAvg;
    const percentageChange =
      firstHalfAvg > 0
        ? parseFloat(((difference / firstHalfAvg) * 100).toFixed(2))
        : secondHalfAvg > 0
          ? 100
          : 0;

    return {
      previousPeriod: {
        average: parseFloat(firstHalfAvg.toFixed(2)),
        total: firstHalfTotal,
        weeks: firstHalf.length,
      },
      currentPeriod: {
        average: parseFloat(secondHalfAvg.toFixed(2)),
        total: secondHalfTotal,
        weeks: secondHalf.length,
      },
      difference: parseFloat(difference.toFixed(2)),
      percentageChange,
      direction: difference > 0 ? 'increasing' : difference < 0 ? 'decreasing' : 'stable',
    };
  }

  _calculatePriorityBreakdown(weeklyData) {
    const total = {
      High: 0,
      Medium: 0,
      Low: 0,
      None: 0,
    };

    weeklyData.forEach(week => {
      total.High += week.priorityBreakdown.High || 0;
      total.Medium += week.priorityBreakdown.Medium || 0;
      total.Low += week.priorityBreakdown.Low || 0;
      total.None += week.priorityBreakdown.None || 0;
    });

    const totalTasks = total.High + total.Medium + total.Low + total.None;

    return {
      total,
      percentages: {
        High: totalTasks > 0 ? parseFloat(((total.High / totalTasks) * 100).toFixed(2)) : 0,
        Medium: totalTasks > 0 ? parseFloat(((total.Medium / totalTasks) * 100).toFixed(2)) : 0,
        Low: totalTasks > 0 ? parseFloat(((total.Low / totalTasks) * 100).toFixed(2)) : 0,
        None: totalTasks > 0 ? parseFloat(((total.None / totalTasks) * 100).toFixed(2)) : 0,
      },
    };
  }

  async getEstimationAccuracy(params) {
    const { board_id, start_date, end_date, user_id, priority } = params;

    if (!board_id || !mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('Board ID không hợp lệ');
    }

    const board = await Board.findById(board_id);
    if (!board) {
      throw new Error('Board không tồn tại');
    }

    let query = {
      board_id,
      deleted_at: null,
      estimate_hours: { $ne: null, $gt: 0 },
    };

    if (start_date || end_date) {
      if (!start_date || !end_date) {
        throw new Error('Cần cung cấp cả start_date và end_date');
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(start_date)) {
        throw new Error('start_date phải có format YYYY-MM-DD');
      }
      if (!dateRegex.test(end_date)) {
        throw new Error('end_date phải có format YYYY-MM-DD');
      }

      const [startYear, startMonth, startDay] = start_date.split('-').map(Number);
      const [endYear, endMonth, endDay] = end_date.split('-').map(Number);

      if (startMonth < 1 || startMonth > 12) {
        throw new Error('start_date không hợp lệ (tháng không tồn tại)');
      }
      if (endMonth < 1 || endMonth > 12) {
        throw new Error('end_date không hợp lệ (tháng không tồn tại)');
      }

      const daysInStartMonth = new Date(startYear, startMonth, 0).getDate();
      const daysInEndMonth = new Date(endYear, endMonth, 0).getDate();

      if (startDay < 1 || startDay > daysInStartMonth) {
        throw new Error('start_date không hợp lệ (ngày không tồn tại)');
      }
      if (endDay < 1 || endDay > daysInEndMonth) {
        throw new Error('end_date không hợp lệ (ngày không tồn tại)');
      }

      const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Ngày không hợp lệ');
      }

      if (startDate >= endDate) {
        throw new Error('start_date phải nhỏ hơn end_date');
      }

      query.done_at = {
        $ne: null,
        $gte: startDate,
        $lte: endDate,
      };
    } else {
      query.done_at = { $ne: null };
    }

    if (user_id) {
      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new Error('User ID không hợp lệ');
      }
      query.assigned_to = user_id;
    }

    if (priority) {
      if (typeof priority !== 'string' || priority.trim() === '') {
        throw new Error('Priority không được để trống');
      }
      if (!['High', 'Medium', 'Low'].includes(priority)) {
        throw new Error('Priority phải là High, Medium hoặc Low');
      }
      query.priority = priority;
    }

    const tasks = await Task.find(query).populate('assigned_to', 'username full_name').lean();

    const validTasks = tasks.filter(task => {
      if (!task.done_at || !task.created_at) return false;
      const doneAt = new Date(task.done_at);
      const createdAt = new Date(task.created_at);

      if (doneAt < createdAt) return false;

      const actualHours = (doneAt - createdAt) / (1000 * 60 * 60);

      if (actualHours <= 0) return false;

      if (actualHours > 1000) return false;

      if (task.estimate_hours <= 0 || !task.estimate_hours) return false;

      return true;
    });

    if (validTasks.length === 0) {
      return {
        board: {
          id: board._id,
          title: board.title,
        },
        dateRange: start_date && end_date ? { start: start_date, end: end_date } : null,
        overview: {
          totalTasks: 0,
          tasksWithEstimate: 0,
          averageEstimate: 0,
          averageActual: 0,
          averageError: 0,
          overEstimatedCount: 0,
          underEstimatedCount: 0,
          accurateCount: 0,
          overUnderRatio: 0,
          outliersCount: 0,
        },
        byUser: [],
        byPriority: {
          High: { totalTasks: 0, averageError: 0 },
          Medium: { totalTasks: 0, averageError: 0 },
          Low: { totalTasks: 0, averageError: 0 },
          None: { totalTasks: 0, averageError: 0 },
        },
        distribution: {
          severeOver: 0,
          moderateOver: 0,
          accurate: 0,
          moderateUnder: 0,
          severeUnder: 0,
        },
      };
    }

    const tasksWithMetrics = validTasks.map(task => {
      const createdAt = new Date(task.created_at);
      const doneAt = new Date(task.done_at);
      const actualHours = (doneAt - createdAt) / (1000 * 60 * 60);
      const estimateHours = task.estimate_hours;
      let errorPercent = ((actualHours - estimateHours) / estimateHours) * 100;

      const maxError = 500;
      const minError = -500;
      const isOutlier = errorPercent > maxError || errorPercent < minError;

      if (errorPercent > maxError) errorPercent = maxError;
      if (errorPercent < minError) errorPercent = minError;

      let category = 'accurate';
      if (errorPercent > 50) category = 'severeOver';
      else if (errorPercent > 10) category = 'moderateOver';
      else if (errorPercent >= -10 && errorPercent <= 10) category = 'accurate';
      else if (errorPercent >= -50) category = 'moderateUnder';
      else category = 'severeUnder';

      return {
        ...task,
        actualHours: parseFloat(actualHours.toFixed(2)),
        estimateHours,
        errorPercent: parseFloat(errorPercent.toFixed(2)),
        category,
        isOutlier,
      };
    });

    const userGroups = {};
    tasksWithMetrics.forEach(task => {
      const userId =
        task.assigned_to?._id?.toString() || task.assigned_to?.toString() || 'unassigned';
      if (!userGroups[userId]) {
        userGroups[userId] = {
          userId,
          userInfo: task.assigned_to || null,
          tasks: [],
        };
      }
      userGroups[userId].tasks.push(task);
    });

    const byUser = Object.values(userGroups).map(group => {
      const tasks = group.tasks;
      const totalTasks = tasks.length;
      const avgEstimate = tasks.reduce((sum, t) => sum + t.estimateHours, 0) / totalTasks;
      const avgActual = tasks.reduce((sum, t) => sum + t.actualHours, 0) / totalTasks;
      const avgError = tasks.reduce((sum, t) => sum + t.errorPercent, 0) / totalTasks;

      const overCount = tasks.filter(t => t.errorPercent > 0).length;
      const underCount = tasks.filter(t => t.errorPercent < 0).length;
      const accurateCount = tasks.filter(t => t.errorPercent >= -10 && t.errorPercent <= 10).length;

      const categoryBreakdown = {
        severeOver: tasks.filter(t => t.category === 'severeOver').length,
        moderateOver: tasks.filter(t => t.category === 'moderateOver').length,
        accurate: tasks.filter(t => t.category === 'accurate').length,
        moderateUnder: tasks.filter(t => t.category === 'moderateUnder').length,
        severeUnder: tasks.filter(t => t.category === 'severeUnder').length,
      };

      return {
        userId: group.userId,
        username: group.userInfo?.username || null,
        fullName: group.userInfo?.full_name || null,
        statistics: {
          totalTasks,
          averageEstimate: parseFloat(avgEstimate.toFixed(2)),
          averageActual: parseFloat(avgActual.toFixed(2)),
          averageError: parseFloat(avgError.toFixed(2)),
          overEstimatedCount: overCount,
          underEstimatedCount: underCount,
          accurateCount,
          categoryBreakdown,
        },
      };
    });

    const totalTasks = tasksWithMetrics.length;
    const outliersCount = tasksWithMetrics.filter(t => t.isOutlier).length;
    const avgEstimate = tasksWithMetrics.reduce((sum, t) => sum + t.estimateHours, 0) / totalTasks;
    const avgActual = tasksWithMetrics.reduce((sum, t) => sum + t.actualHours, 0) / totalTasks;
    const avgError = tasksWithMetrics.reduce((sum, t) => sum + t.errorPercent, 0) / totalTasks;

    const overCount = tasksWithMetrics.filter(t => t.errorPercent > 0).length;
    const underCount = tasksWithMetrics.filter(t => t.errorPercent < 0).length;
    const accurateCount = tasksWithMetrics.filter(
      t => t.errorPercent >= -10 && t.errorPercent <= 10
    ).length;
    const overUnderRatio =
      underCount > 0 ? parseFloat((overCount / underCount).toFixed(2)) : overCount;

    const priorityGroups = {
      High: [],
      Medium: [],
      Low: [],
      None: [],
    };

    tasksWithMetrics.forEach(task => {
      const taskPriority = task.priority || 'None';
      if (priorityGroups[taskPriority]) {
        priorityGroups[taskPriority].push(task);
      }
    });

    const byPriority = {};
    Object.keys(priorityGroups).forEach(prio => {
      const tasks = priorityGroups[prio];
      const total = tasks.length;
      const avgErr = total > 0 ? tasks.reduce((sum, t) => sum + t.errorPercent, 0) / total : 0;
      byPriority[prio] = {
        totalTasks: total,
        averageError: parseFloat(avgErr.toFixed(2)),
      };
    });

    const distribution = {
      severeOver: tasksWithMetrics.filter(t => t.category === 'severeOver').length,
      moderateOver: tasksWithMetrics.filter(t => t.category === 'moderateOver').length,
      accurate: tasksWithMetrics.filter(t => t.category === 'accurate').length,
      moderateUnder: tasksWithMetrics.filter(t => t.category === 'moderateUnder').length,
      severeUnder: tasksWithMetrics.filter(t => t.category === 'severeUnder').length,
    };

    return {
      board: {
        id: board._id,
        title: board.title,
      },
      dateRange: start_date && end_date ? { start: start_date, end: end_date } : null,
      overview: {
        totalTasks,
        tasksWithEstimate: totalTasks,
        averageEstimate: parseFloat(avgEstimate.toFixed(2)),
        averageActual: parseFloat(avgActual.toFixed(2)),
        averageError: parseFloat(avgError.toFixed(2)),
        overEstimatedCount: overCount,
        underEstimatedCount: underCount,
        accurateCount,
        overUnderRatio,
        outliersCount,
      },
      byUser,
      byPriority,
      distribution,
    };
  }

  /**
   * Phân tích mối tương quan giữa điểm thưởng gamification và tỷ lệ hoàn thành bài tập
   * @param {Object} params - { center_id (optional), board_id (optional) }
   * @returns {Object} Correlation analysis data
   */
  async getGamificationCorrelation(params = {}) {
    const { center_id, board_id } = params;
    const UserPoint = require('../models/userPoint.model');
    const User = require('../models/usersModel');
    const Column = require('../models/column.model');

    try {
      // 1. Lấy tất cả users có điểm (UserPoint) hoặc không có điểm
      let userPointsQuery = {};
      if (center_id) {
        if (!mongoose.Types.ObjectId.isValid(center_id)) {
          throw new Error('Center ID không hợp lệ');
        }
        userPointsQuery.center_id = center_id;
      }

      // Lấy tất cả UserPoint records
      const userPoints = await UserPoint.find(userPointsQuery)
        .populate('user_id', 'email full_name username')
        .lean();

      // Lấy danh sách user IDs đã có điểm
      const usersWithPointsIds = userPoints
        .map(up => up.user_id?._id || up.user_id)
        .filter(Boolean);

      // Lấy tất cả users không có điểm (nếu có center_id filter)
      let usersWithoutPoints = [];
      if (center_id) {
        usersWithoutPoints = await User.find({
          deleted_at: null,
          center_id: center_id,
          _id: { $nin: usersWithPointsIds },
        }).lean();
      } else {
        // Nếu không filter theo center, lấy tất cả users không có điểm
        const allUsers = await User.find({ deleted_at: null }).lean();
        usersWithoutPoints = allUsers.filter(
          u => !usersWithPointsIds.some(id => id.toString() === u._id.toString())
        );
      }

      // 2. Lấy tasks cho tất cả users
      let taskQuery = { deleted_at: null };
      if (board_id) {
        if (!mongoose.Types.ObjectId.isValid(board_id)) {
          throw new Error('Board ID không hợp lệ');
        }
        taskQuery.board_id = board_id;
      }

      // Lấy Done columns để xác định task completed
      let doneColumns = [];
      if (board_id) {
        doneColumns = await Column.find({ board_id, isDone: true }).lean();
      } else {
        // Nếu không có board_id, lấy tất cả done columns
        doneColumns = await Column.find({ isDone: true }).lean();
      }
      const doneColumnIds = doneColumns.map(c => c._id.toString());

      // Lấy tất cả tasks
      const allTasks = await Task.find(taskQuery).populate('column_id', 'isDone').lean();

      // 3. Tính toán metrics cho từng user
      const userMetrics = [];

      // Xử lý users có điểm
      for (const userPoint of userPoints) {
        const userId = userPoint.user_id?._id || userPoint.user_id;
        if (!userId) continue;

        const userTasks = allTasks.filter(t => {
          const assignedTo = t.assigned_to?._id || t.assigned_to;
          const createdBy = t.created_by?._id || t.created_by;
          return (
            assignedTo?.toString() === userId.toString() ||
            createdBy?.toString() === userId.toString()
          );
        });

        const totalTasks = userTasks.length;
        const completedTasks = userTasks.filter(t => {
          // Task completed nếu: done_at không null HOẶC column isDone = true
          if (t.done_at) return true;
          // Kiểm tra nếu column được populate và có isDone property
          if (t.column_id?.isDone === true) return true;
          // Kiểm tra nếu column_id nằm trong danh sách done columns
          const columnId = t.column_id?._id || t.column_id;
          return columnId && doneColumnIds.includes(columnId.toString());
        }).length;

        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Tính active days (số ngày có hoạt động task)
        const taskDates = new Set();
        userTasks.forEach(t => {
          if (t.created_at) taskDates.add(new Date(t.created_at).toISOString().split('T')[0]);
          if (t.updated_at) taskDates.add(new Date(t.updated_at).toISOString().split('T')[0]);
        });
        const activeDays = taskDates.size;

        userMetrics.push({
          user_id: userId.toString(),
          user_info: userPoint.user_id,
          points: userPoint.points || 0,
          total_points: userPoint.total_points || 0,
          level: userPoint.level || 1,
          totalTasks,
          completedTasks,
          completionRate: parseFloat(completionRate.toFixed(2)),
          activeDays,
          tasksCreated: userTasks.filter(t => {
            const createdBy = t.created_by?._id || t.created_by;
            return createdBy?.toString() === userId.toString();
          }).length,
          tasksCompleted: completedTasks,
          hasPoints: true,
        });
      }

      // Xử lý users không có điểm
      for (const user of usersWithoutPoints) {
        const userId = user._id.toString();
        const userTasks = allTasks.filter(t => {
          const assignedTo = t.assigned_to?._id || t.assigned_to;
          const createdBy = t.created_by?._id || t.created_by;
          return assignedTo?.toString() === userId || createdBy?.toString() === userId;
        });

        const totalTasks = userTasks.length;
        const completedTasks = userTasks.filter(t => {
          // Task completed nếu: done_at không null HOẶC column isDone = true
          if (t.done_at) return true;
          // Kiểm tra nếu column được populate và có isDone property
          if (t.column_id?.isDone === true) return true;
          // Kiểm tra nếu column_id nằm trong danh sách done columns
          const columnId = t.column_id?._id || t.column_id;
          return columnId && doneColumnIds.includes(columnId.toString());
        }).length;

        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const taskDates = new Set();
        userTasks.forEach(t => {
          if (t.created_at) taskDates.add(new Date(t.created_at).toISOString().split('T')[0]);
          if (t.updated_at) taskDates.add(new Date(t.updated_at).toISOString().split('T')[0]);
        });
        const activeDays = taskDates.size;

        userMetrics.push({
          user_id: userId,
          user_info: {
            email: user.email,
            full_name: user.full_name,
            username: user.username,
          },
          points: 0,
          total_points: 0,
          level: 1,
          totalTasks,
          completedTasks,
          completionRate: parseFloat(completionRate.toFixed(2)),
          activeDays,
          tasksCreated: userTasks.filter(t => {
            const createdBy = t.created_by?._id || t.created_by;
            return createdBy?.toString() === userId;
          }).length,
          tasksCompleted: completedTasks,
          hasPoints: false,
        });
      }

      // 4. So sánh completion rate: users có points > 0 vs points = 0
      const usersWithPoints = userMetrics.filter(u => u.hasPoints && u.points > 0);
      const usersWithoutPointsData = userMetrics.filter(u => !u.hasPoints || u.points === 0);

      const avgCompletionRateWithPoints =
        usersWithPoints.length > 0
          ? usersWithPoints.reduce((sum, u) => sum + u.completionRate, 0) / usersWithPoints.length
          : 0;

      const avgCompletionRateWithoutPoints =
        usersWithoutPointsData.length > 0
          ? usersWithoutPointsData.reduce((sum, u) => sum + u.completionRate, 0) /
            usersWithoutPointsData.length
          : 0;

      // 5. Tính Pearson correlation coefficient giữa points và completion rate
      const correlationData = userMetrics.filter(u => u.totalTasks > 0); // Chỉ tính cho users có tasks
      let pearsonCorrelation = null;
      let correlationStrength = null;

      if (correlationData.length >= 2) {
        const points = correlationData.map(u => u.points);
        const completionRates = correlationData.map(u => u.completionRate);

        const n = points.length;
        const sumX = points.reduce((a, b) => a + b, 0);
        const sumY = completionRates.reduce((a, b) => a + b, 0);
        const sumXY = points.reduce((sum, x, i) => sum + x * completionRates[i], 0);
        const sumXX = points.reduce((sum, x) => sum + x * x, 0);
        const sumYY = completionRates.reduce((sum, y) => sum + y * y, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominatorX = Math.sqrt(n * sumXX - sumX * sumX);
        const denominatorY = Math.sqrt(n * sumYY - sumY * sumY);

        if (denominatorX !== 0 && denominatorY !== 0) {
          pearsonCorrelation = numerator / (denominatorX * denominatorY);
          pearsonCorrelation = parseFloat(pearsonCorrelation.toFixed(4));

          // Xác định độ mạnh của correlation
          const absCorr = Math.abs(pearsonCorrelation);
          if (absCorr >= 0.7) correlationStrength = 'strong';
          else if (absCorr >= 0.4) correlationStrength = 'moderate';
          else if (absCorr >= 0.2) correlationStrength = 'weak';
          else correlationStrength = 'very weak';
        }
      }

      // 6. Phân tích engagement metrics
      const avgActiveDaysWithPoints =
        usersWithPoints.length > 0
          ? usersWithPoints.reduce((sum, u) => sum + u.activeDays, 0) / usersWithPoints.length
          : 0;

      const avgActiveDaysWithoutPoints =
        usersWithoutPointsData.length > 0
          ? usersWithoutPointsData.reduce((sum, u) => sum + u.activeDays, 0) /
            usersWithoutPointsData.length
          : 0;

      const totalTasksCreatedWithPoints = usersWithPoints.reduce(
        (sum, u) => sum + u.tasksCreated,
        0
      );
      const totalTasksCreatedWithoutPoints = usersWithoutPointsData.reduce(
        (sum, u) => sum + u.tasksCreated,
        0
      );

      const totalTasksCompletedWithPoints = usersWithPoints.reduce(
        (sum, u) => sum + u.tasksCompleted,
        0
      );
      const totalTasksCompletedWithoutPoints = usersWithoutPointsData.reduce(
        (sum, u) => sum + u.tasksCompleted,
        0
      );

      const avgTasksCreatedWithPoints =
        usersWithPoints.length > 0 ? totalTasksCreatedWithPoints / usersWithPoints.length : 0;

      const avgTasksCreatedWithoutPoints =
        usersWithoutPointsData.length > 0
          ? totalTasksCreatedWithoutPoints / usersWithoutPointsData.length
          : 0;

      const avgTasksCompletedWithPoints =
        usersWithPoints.length > 0 ? totalTasksCompletedWithPoints / usersWithPoints.length : 0;

      const avgTasksCompletedWithoutPoints =
        usersWithoutPointsData.length > 0
          ? totalTasksCompletedWithoutPoints / usersWithoutPointsData.length
          : 0;

      return {
        summary: {
          totalUsers: userMetrics.length,
          usersWithPoints: usersWithPoints.length,
          usersWithoutPoints: usersWithoutPointsData.length,
          usersWithTasks: correlationData.length,
        },
        completionRateComparison: {
          withPoints: {
            count: usersWithPoints.length,
            averageCompletionRate: parseFloat(avgCompletionRateWithPoints.toFixed(2)),
            medianCompletionRate: this._calculateMedian(usersWithPoints.map(u => u.completionRate)),
          },
          withoutPoints: {
            count: usersWithoutPointsData.length,
            averageCompletionRate: parseFloat(avgCompletionRateWithoutPoints.toFixed(2)),
            medianCompletionRate: this._calculateMedian(
              usersWithoutPointsData.map(u => u.completionRate)
            ),
          },
          difference: parseFloat(
            (avgCompletionRateWithPoints - avgCompletionRateWithoutPoints).toFixed(2)
          ),
          percentageDifference:
            avgCompletionRateWithoutPoints > 0
              ? parseFloat(
                  (
                    ((avgCompletionRateWithPoints - avgCompletionRateWithoutPoints) /
                      avgCompletionRateWithoutPoints) *
                    100
                  ).toFixed(2)
                )
              : avgCompletionRateWithPoints > 0
                ? 100
                : 0,
        },
        correlation: {
          pearsonCoefficient: pearsonCorrelation,
          strength: correlationStrength,
          interpretation: this._interpretCorrelation(pearsonCorrelation),
        },
        engagementMetrics: {
          activeDays: {
            withPoints: {
              average: parseFloat(avgActiveDaysWithPoints.toFixed(2)),
              median: this._calculateMedian(usersWithPoints.map(u => u.activeDays)),
            },
            withoutPoints: {
              average: parseFloat(avgActiveDaysWithoutPoints.toFixed(2)),
              median: this._calculateMedian(usersWithoutPointsData.map(u => u.activeDays)),
            },
          },
          tasksCreated: {
            withPoints: {
              total: totalTasksCreatedWithPoints,
              average: parseFloat(avgTasksCreatedWithPoints.toFixed(2)),
              median: this._calculateMedian(usersWithPoints.map(u => u.tasksCreated)),
            },
            withoutPoints: {
              total: totalTasksCreatedWithoutPoints,
              average: parseFloat(avgTasksCreatedWithoutPoints.toFixed(2)),
              median: this._calculateMedian(usersWithoutPointsData.map(u => u.tasksCreated)),
            },
          },
          tasksCompleted: {
            withPoints: {
              total: totalTasksCompletedWithPoints,
              average: parseFloat(avgTasksCompletedWithPoints.toFixed(2)),
              median: this._calculateMedian(usersWithPoints.map(u => u.tasksCompleted)),
            },
            withoutPoints: {
              total: totalTasksCompletedWithoutPoints,
              average: parseFloat(avgTasksCompletedWithoutPoints.toFixed(2)),
              median: this._calculateMedian(usersWithoutPointsData.map(u => u.tasksCompleted)),
            },
          },
        },
        userDetails: userMetrics.slice(0, 100), // Limit to first 100 users for response size
      };
    } catch (error) {
      console.error('❌ Gamification Correlation Error:', error);
      throw error;
    }
  }

  /**
   * Helper: Calculate median
   */
  _calculateMedian(values) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Helper: Interpret correlation coefficient
   */
  _interpretCorrelation(correlation) {
    if (correlation === null) return 'Không đủ dữ liệu để tính toán';
    const absCorr = Math.abs(correlation);
    const direction = correlation > 0 ? 'dương' : 'âm';

    if (absCorr >= 0.7) {
      return `Tương quan ${direction} mạnh (${correlation > 0 ? 'điểm cao' : 'điểm thấp'} có liên quan đến tỷ lệ hoàn thành ${correlation > 0 ? 'cao' : 'thấp'})`;
    } else if (absCorr >= 0.4) {
      return `Tương quan ${direction} trung bình`;
    } else if (absCorr >= 0.2) {
      return `Tương quan ${direction} yếu`;
    } else {
      return 'Không có tương quan đáng kể';
    }
  }

  /**
   * So sánh hiệu suất của các trung tâm
   * @param {Object} params - { board_id (optional) }
   * @returns {Object} Centers performance comparison data
   */
  async compareCentersPerformance(params = {}) {
    const { board_id } = params;
    const Center = require('../models/center.model');
    const CenterMember = require('../models/centerMember.model');
    const UserPoint = require('../models/userPoint.model');
    const User = require('../models/usersModel');

    try {
      // 1. Lấy tất cả centers (active)
      const centers = await Center.find({
        deleted_at: null,
        status: 'active',
      }).lean();

      if (centers.length === 0) {
        return {
          summary: {
            totalCenters: 0,
          },
          centers: [],
          rankings: {},
        };
      }

      // 2. Lấy Done columns để xác định task completed
      let doneColumns = [];
      if (board_id) {
        if (!mongoose.Types.ObjectId.isValid(board_id)) {
          throw new Error('Board ID không hợp lệ');
        }
        doneColumns = await Column.find({ board_id, isDone: true }).lean();
      } else {
        doneColumns = await Column.find({ isDone: true }).lean();
      }
      const doneColumnIds = doneColumns.map(c => c._id.toString());

      // 3. Lấy tasks (filter theo board_id nếu có)
      let taskQuery = { deleted_at: null };
      if (board_id) {
        taskQuery.board_id = board_id;
      }
      const allTasks = await Task.find(taskQuery).populate('column_id', 'isDone').lean();

      // 4. Lấy tất cả center members
      const allCenterMembers = await CenterMember.find({ deleted: false }).lean();

      // 5. Tính toán metrics cho từng center
      const centerMetrics = [];

      for (const center of centers) {
        const centerId = center._id.toString();

        // Lấy users của center (từ center_id trong User hoặc từ CenterMember)
        const centerMemberUserIds = allCenterMembers
          .filter(cm => cm.center_id.toString() === centerId)
          .map(cm => cm.user_id.toString());

        const usersWithCenterId = await User.find({
          deleted_at: null,
          center_id: centerId,
        })
          .select('_id')
          .lean();
        const userIdsFromCenterId = usersWithCenterId.map(u => u._id.toString());

        // Kết hợp tất cả user IDs của center
        const allCenterUserIds = [...new Set([...centerMemberUserIds, ...userIdsFromCenterId])];

        if (allCenterUserIds.length === 0) {
          // Center không có users
          centerMetrics.push({
            center_id: centerId,
            center_name: center.name,
            center_status: center.status,
            totalUsers: 0,
            activeUsers: 0,
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            completionRate: 0,
            averageCompletionRatePerUser: 0,
            totalPoints: 0,
            averagePointsPerUser: 0,
            activeDays: 0,
            averageActiveDaysPerUser: 0,
            tasksCreated: 0,
            tasksCompleted: 0,
            averageTasksCreatedPerUser: 0,
            averageTasksCompletedPerUser: 0,
          });
          continue;
        }

        // Lấy tasks của users trong center
        const centerTasks = allTasks.filter(t => {
          const assignedTo = t.assigned_to?._id || t.assigned_to;
          const createdBy = t.created_by?._id || t.created_by;
          const assignedToStr = assignedTo?.toString();
          const createdByStr = createdBy?.toString();
          return (
            allCenterUserIds.includes(assignedToStr) || allCenterUserIds.includes(createdByStr)
          );
        });

        const totalTasks = centerTasks.length;
        const completedTasks = centerTasks.filter(t => {
          if (t.done_at) return true;
          if (t.column_id?.isDone === true) return true;
          const columnId = t.column_id?._id || t.column_id;
          return columnId && doneColumnIds.includes(columnId.toString());
        }).length;

        const inProgressTasks = totalTasks - completedTasks;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Tính metrics cho từng user trong center
        const userMetrics = [];
        for (const userId of allCenterUserIds) {
          const userTasks = centerTasks.filter(t => {
            const assignedTo = t.assigned_to?._id || t.assigned_to;
            const createdBy = t.created_by?._id || t.created_by;
            return assignedTo?.toString() === userId || createdBy?.toString() === userId;
          });

          if (userTasks.length === 0) continue;

          const userCompletedTasks = userTasks.filter(t => {
            if (t.done_at) return true;
            if (t.column_id?.isDone === true) return true;
            const columnId = t.column_id?._id || t.column_id;
            return columnId && doneColumnIds.includes(columnId.toString());
          }).length;

          const userCompletionRate =
            userTasks.length > 0 ? (userCompletedTasks / userTasks.length) * 100 : 0;

          // Tính active days
          const taskDates = new Set();
          userTasks.forEach(t => {
            if (t.created_at) taskDates.add(new Date(t.created_at).toISOString().split('T')[0]);
            if (t.updated_at) taskDates.add(new Date(t.updated_at).toISOString().split('T')[0]);
          });

          userMetrics.push({
            userId,
            totalTasks: userTasks.length,
            completedTasks: userCompletedTasks,
            completionRate: userCompletionRate,
            activeDays: taskDates.size,
            tasksCreated: userTasks.filter(t => {
              const createdBy = t.created_by?._id || t.created_by;
              return createdBy?.toString() === userId;
            }).length,
            tasksCompleted: userCompletedTasks,
          });
        }

        // Lấy points của users trong center
        const centerUserPoints = await UserPoint.find({
          center_id: centerId,
        }).lean();

        const totalPoints = centerUserPoints.reduce((sum, up) => sum + (up.points || 0), 0);
        const averagePointsPerUser =
          allCenterUserIds.length > 0 ? totalPoints / allCenterUserIds.length : 0;

        // Tính average metrics
        const activeUsers = userMetrics.length;
        const averageCompletionRatePerUser =
          activeUsers > 0
            ? userMetrics.reduce((sum, u) => sum + u.completionRate, 0) / activeUsers
            : 0;

        const totalActiveDays = userMetrics.reduce((sum, u) => sum + u.activeDays, 0);
        const averageActiveDaysPerUser = activeUsers > 0 ? totalActiveDays / activeUsers : 0;

        const totalTasksCreated = userMetrics.reduce((sum, u) => sum + u.tasksCreated, 0);
        const averageTasksCreatedPerUser = activeUsers > 0 ? totalTasksCreated / activeUsers : 0;

        const totalTasksCompleted = userMetrics.reduce((sum, u) => sum + u.tasksCompleted, 0);
        const averageTasksCompletedPerUser =
          activeUsers > 0 ? totalTasksCompleted / activeUsers : 0;

        centerMetrics.push({
          center_id: centerId,
          center_name: center.name,
          center_status: center.status,
          center_address: center.address,
          totalUsers: allCenterUserIds.length,
          activeUsers: activeUsers,
          totalTasks: totalTasks,
          completedTasks: completedTasks,
          inProgressTasks: inProgressTasks,
          completionRate: parseFloat(completionRate.toFixed(2)),
          averageCompletionRatePerUser: parseFloat(averageCompletionRatePerUser.toFixed(2)),
          totalPoints: totalPoints,
          averagePointsPerUser: parseFloat(averagePointsPerUser.toFixed(2)),
          activeDays: totalActiveDays,
          averageActiveDaysPerUser: parseFloat(averageActiveDaysPerUser.toFixed(2)),
          tasksCreated: totalTasksCreated,
          tasksCompleted: totalTasksCompleted,
          averageTasksCreatedPerUser: parseFloat(averageTasksCreatedPerUser.toFixed(2)),
          averageTasksCompletedPerUser: parseFloat(averageTasksCompletedPerUser.toFixed(2)),
        });
      }

      // 6. Tính rankings cho các metrics
      const rankings = {
        byCompletionRate: [...centerMetrics]
          .sort((a, b) => b.completionRate - a.completionRate)
          .map((c, index) => ({
            rank: index + 1,
            center_id: c.center_id,
            center_name: c.center_name,
            value: c.completionRate,
          })),
        byTotalTasks: [...centerMetrics]
          .sort((a, b) => b.totalTasks - a.totalTasks)
          .map((c, index) => ({
            rank: index + 1,
            center_id: c.center_id,
            center_name: c.center_name,
            value: c.totalTasks,
          })),
        byActiveUsers: [...centerMetrics]
          .sort((a, b) => b.activeUsers - a.activeUsers)
          .map((c, index) => ({
            rank: index + 1,
            center_id: c.center_id,
            center_name: c.center_name,
            value: c.activeUsers,
          })),
        byAveragePoints: [...centerMetrics]
          .filter(c => c.averagePointsPerUser > 0)
          .sort((a, b) => b.averagePointsPerUser - a.averagePointsPerUser)
          .map((c, index) => ({
            rank: index + 1,
            center_id: c.center_id,
            center_name: c.center_name,
            value: c.averagePointsPerUser,
          })),
        byEngagement: [...centerMetrics]
          .sort((a, b) => b.averageActiveDaysPerUser - a.averageActiveDaysPerUser)
          .map((c, index) => ({
            rank: index + 1,
            center_id: c.center_id,
            center_name: c.center_name,
            value: c.averageActiveDaysPerUser,
          })),
      };

      // 7. Tính tổng quan
      const totalUsers = centerMetrics.reduce((sum, c) => sum + c.totalUsers, 0);
      const totalActiveUsers = centerMetrics.reduce((sum, c) => sum + c.activeUsers, 0);
      const totalTasksAll = centerMetrics.reduce((sum, c) => sum + c.totalTasks, 0);
      const totalCompletedTasksAll = centerMetrics.reduce((sum, c) => sum + c.completedTasks, 0);
      const overallCompletionRate =
        totalTasksAll > 0 ? (totalCompletedTasksAll / totalTasksAll) * 100 : 0;

      return {
        summary: {
          totalCenters: centers.length,
          totalUsers: totalUsers,
          totalActiveUsers: totalActiveUsers,
          totalTasks: totalTasksAll,
          totalCompletedTasks: totalCompletedTasksAll,
          overallCompletionRate: parseFloat(overallCompletionRate.toFixed(2)),
        },
        centers: centerMetrics.sort((a, b) => b.completionRate - a.completionRate), // Sort by completion rate by default
        rankings: rankings,
        insights: {
          topPerformer: rankings.byCompletionRate[0] || null,
          mostActive: rankings.byActiveUsers[0] || null,
          mostEngaged: rankings.byEngagement[0] || null,
          needsSupport:
            rankings.byCompletionRate.length > 0
              ? rankings.byCompletionRate[rankings.byCompletionRate.length - 1]
              : null,
        },
      };
    } catch (error) {
      console.error('❌ Compare Centers Performance Error:', error);
      throw error;
    }
  }

  async getWorkload(board_id) {
    try {
      const cleanBoardId = board_id.board_id;

      // 1. Lấy thành viên
      const boardMember = await boardMemberService.getMembers(cleanBoardId);
      if (!boardMember?.length) return [];

      const idMembers = boardMember.map(m => m.user_id);

      // 2. Lấy cột Done
      const doneColumn = await Column.findOne({
        board_id: cleanBoardId,
        isDone: true,
      });
      if (!doneColumn) throw new Error('Không tìm thấy cột Done');

      const doneId = doneColumn._id.toString();

      // 3. Query tất cả task 1 lần
      const tasks = await Task.find({
        board_id: cleanBoardId,
        assigned_to: { $in: idMembers },
        deleted_at: null,
      });

      const now = new Date();

      // 4. Gom nhóm theo user
      const workload = idMembers.map(memberId => {
        const memberIdStr = memberId ? memberId?._id.toString() : null;

        if (!memberIdStr) {
          return {
            user_id: 'Unknown',
            totalTask: 0,
            inProgress: 0,
            completed: 0,
            overdue: 0,
          };
        }

        const userTasks = tasks.filter(
          t => t.assigned_to && t.assigned_to.toString() === memberIdStr
        );

        const totalTask = userTasks.length;
        const completed = userTasks.filter(
          t => t.column_id && t.column_id.toString() === doneId
        ).length;
        const inProgress = userTasks.filter(
          t => !t.column_id || t.column_id.toString() !== doneId
        ).length;
        const overdue = userTasks.filter(
          t =>
            (!t.column_id || t.column_id.toString() !== doneId) &&
            t.due_date &&
            new Date(t.due_date) < now
        ).length;

        // Tìm username, kiểm tra null an toàn
        const userMember = boardMember.find(
          m => m.user_id && (m.user_id._id || m.user_id).toString() === memberIdStr
        );
        const username = userMember?.user_id?.username || memberIdStr;

        return {
          user_id: username,
          totalTask,
          inProgress,
          completed,
          overdue,
        };
      });

      // 5. Tính average tasks per user
      const totalUsers = workload.length;
      const totalTasksAll = workload.reduce((sum, u) => sum + u.totalTask, 0);
      const averageTasks = totalTasksAll / totalUsers;

      // 6. Tính workload variance
      const variance =
        workload.reduce((sum, u) => {
          return sum + Math.pow(u.totalTask - averageTasks, 2);
        }, 0) / totalUsers;

      // 7. Trả về kết quả
      return {
        success: true,
        data: workload,
        averageTasks,
        variance,
      };
    } catch (error) {
      console.error('Lỗi lấy workload:', error);
      throw new Error('Không thể lấy workload');
    }
  }

  async getHealthScore(board_id) {
    try {
      // 1️⃣ Lấy tất cả task và cột Done
      const tasks = await Task.find({
        board_id: board_id.board_id,
        deleted_at: null,
      });

      const doneColumn = await Column.findOne({
        board_id: board_id.board_id,
        isDone: true,
      });

      const totalTasks = tasks.length;

      // 2️⃣ Completion rate (30%)
      const completedTasks = tasks.filter(
        t => t.column_id?.toString() === doneColumn?._id.toString()
      ).length;
      const completionRate = totalTasks ? (completedTasks / totalTasks) * 100 : 0;

      // 3️⃣ On-time rate (30%)
      const onTimeTasks = tasks.filter(
        t =>
          t.column_id?.toString() === doneColumn?._id.toString() &&
          t.due_date &&
          new Date(t.updated_at) <= new Date(t.due_date)
      ).length;
      const onTimeRate = completedTasks ? (onTimeTasks / completedTasks) * 100 : 0;

      // 4️⃣ Cycle time (20%)
      const cycleTimes = tasks
        .filter(t => t.column_id?.toString() === doneColumn?._id.toString() && t.done_at)
        .map(t => (new Date(t.done_at) - new Date(t.created_at)) / (1000 * 60 * 60 * 24)); // ngày
      const avgCycleTime = cycleTimes.length
        ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
        : 0;

      const benchmark = 7; // chuẩn 7 ngày
      const cycleTimeScore =
        avgCycleTime <= benchmark
          ? 100
          : Math.max(0, 100 - ((avgCycleTime - benchmark) / benchmark) * 100);

      // 5️⃣ Due date coverage (10%)
      const dueDateCount = tasks.filter(t => t.due_date).length;
      const dueDateCoverage = totalTasks ? (dueDateCount / totalTasks) * 100 : 0;

      // 6️⃣ Assignment coverage (10%)
      const assignedCount = tasks.filter(t => t.assigned_to).length;
      const assignmentCoverage = totalTasks ? (assignedCount / totalTasks) * 100 : 0;

      // 7️⃣ Board Health Score
      const healthScore =
        completionRate * 0.3 +
        onTimeRate * 0.3 +
        cycleTimeScore * 0.2 +
        dueDateCoverage * 0.1 +
        assignmentCoverage * 0.1;

      // 8️⃣ Phân loại status
      let status = '';
      let recommendations = [];

      if (healthScore >= 80) {
        status = 'Green';
        recommendations.push('Board is healthy. Continue current workflow.');
      } else if (healthScore >= 50) {
        status = 'Yellow';
        if (completionRate < 80) recommendations.push('Increase task completion rate.');
        if (onTimeRate < 80) recommendations.push('Focus on completing tasks on time.');
        if (cycleTimeScore < 80) recommendations.push('Reduce average cycle time.');
        if (dueDateCoverage < 80) recommendations.push('Add due dates for tasks.');
        if (assignmentCoverage < 80) recommendations.push('Assign all tasks to users.');
      } else {
        status = 'Red';
        recommendations.push('Board is at risk. Immediate action required.');
      }

      // 9️⃣ Trả về kết quả đầy đủ
      return {
        success: true,
        healthScore: Math.round(healthScore),
        status,
        recommendations,
        metrics: {
          completionRate: Math.round(completionRate),
          onTimeRate: Math.round(onTimeRate),
          avgCycleTime: Math.round(avgCycleTime),
          dueDateCoverage: Math.round(dueDateCoverage),
          assignmentCoverage: Math.round(assignmentCoverage),
        },
      };
    } catch (error) {
      console.error('Lỗi tính điểm sức khỏe:', error);
      throw new Error('Không thể tính điểm sức khỏe');
    }
  }
  async getLeaderboard(params) {
    const { center_id, limit = 100, start_date, end_date } = params;

    let query = {
      status: 'active',
    };

    if (center_id) {
      if (!mongoose.Types.ObjectId.isValid(center_id)) {
        throw new Error('Center ID không hợp lệ');
      }
      query.center_id = center_id;
    }

    const userPoints = await UserPoint.find(query)
      .populate('user_id', 'username full_name email avatar_url')
      .populate('center_id', 'name')
      .sort({ points: -1 })
      .limit(parseInt(limit))
      .lean();

    if (userPoints.length === 0) {
      return {
        leaderboard: [],
        cheatDetection: {
          medianRatio: 0,
          thresholdRatio: 0,
          flaggedUsers: [],
          flaggedCount: 0,
        },
        summary: {
          totalUsers: 0,
          averagePoints: 0,
          averageTasksCompleted: 0,
        },
        dateRange: start_date && end_date ? { start: start_date, end: end_date } : null,
      };
    }

    const userIds = userPoints.map(up => up.user_id?._id || up.user_id).filter(Boolean);

    let taskQuery = {
      assigned_to: { $in: userIds },
      deleted_at: null,
      done_at: { $ne: null },
    };

    if (start_date && end_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
        throw new Error('Date phải có format YYYY-MM-DD');
      }

      const [startYear, startMonth, startDay] = start_date.split('-').map(Number);
      const [endYear, endMonth, endDay] = end_date.split('-').map(Number);

      if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
        throw new Error('Tháng không hợp lệ');
      }

      const daysInStartMonth = new Date(startYear, startMonth, 0).getDate();
      const daysInEndMonth = new Date(endYear, endMonth, 0).getDate();

      if (startDay < 1 || startDay > daysInStartMonth) {
        throw new Error('start_date không hợp lệ (ngày không tồn tại)');
      }
      if (endDay < 1 || endDay > daysInEndMonth) {
        throw new Error('end_date không hợp lệ (ngày không tồn tại)');
      }

      const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

      if (startDate >= endDate) {
        throw new Error('start_date phải nhỏ hơn end_date');
      }

      taskQuery.done_at = {
        $ne: null,
        $gte: startDate,
        $lte: endDate,
      };
    }

    const tasks = await Task.find(taskQuery).populate('assigned_to', 'username').lean();

    const userStatsMap = {};

    userIds.forEach(userId => {
      userStatsMap[userId.toString()] = {
        tasksCompleted: 0,
        onTimeCompleted: 0,
        overdueCompleted: 0,
      };
    });

    const now = new Date();
    tasks.forEach(task => {
      const userId = task.assigned_to?._id?.toString() || task.assigned_to?.toString();
      if (!userId || !userStatsMap[userId]) return;

      userStatsMap[userId].tasksCompleted++;

      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const doneAt = new Date(task.done_at);
        if (doneAt <= dueDate) {
          userStatsMap[userId].onTimeCompleted++;
        } else {
          userStatsMap[userId].overdueCompleted++;
        }
      }
    });

    const leaderboardData = userPoints.map((userPoint, index) => {
      const userId = userPoint.user_id?._id?.toString() || userPoint.user_id?.toString();
      const stats = userStatsMap[userId] || {
        tasksCompleted: 0,
        onTimeCompleted: 0,
        overdueCompleted: 0,
      };

      const onTimeRate =
        stats.tasksCompleted > 0
          ? parseFloat(((stats.onTimeCompleted / stats.tasksCompleted) * 100).toFixed(2))
          : 0;

      const pointsPerTask =
        stats.tasksCompleted > 0
          ? parseFloat((userPoint.points / stats.tasksCompleted).toFixed(2))
          : userPoint.points > 0
            ? 999999
            : 0;

      return {
        rank: index + 1,
        userId: userId,
        username: userPoint.user_id?.username || null,
        fullName: userPoint.user_id?.full_name || null,
        avatarUrl: userPoint.user_id?.avatar_url || null,
        centerId: userPoint.center_id?._id?.toString() || null,
        centerName: userPoint.center_id?.name || null,
        points: userPoint.points || 0,
        totalPoints: userPoint.total_points || 0,
        level: userPoint.level || 1,
        statistics: {
          tasksCompleted: stats.tasksCompleted,
          onTimeCompleted: stats.onTimeCompleted,
          overdueCompleted: stats.overdueCompleted,
          onTimeRate: onTimeRate,
        },
        pointsPerTaskRatio: pointsPerTask,
      };
    });

    const ratios = leaderboardData
      .filter(u => u.statistics.tasksCompleted > 0)
      .map(u => u.pointsPerTaskRatio)
      .sort((a, b) => a - b);

    const medianRatio =
      ratios.length > 0
        ? ratios.length % 2 === 0
          ? (ratios[Math.floor(ratios.length / 2) - 1] + ratios[Math.floor(ratios.length / 2)]) / 2
          : ratios[Math.floor(ratios.length / 2)]
        : 0;

    const thresholdRatio = medianRatio * 2;

    const flaggedUsers = leaderboardData
      .filter(user => {
        if (user.statistics.tasksCompleted === 0) return false;
        return user.pointsPerTaskRatio > thresholdRatio;
      })
      .map(user => ({
        userId: user.userId,
        username: user.username,
        fullName: user.fullName,
        points: user.points,
        tasksCompleted: user.statistics.tasksCompleted,
        pointsPerTaskRatio: user.pointsPerTaskRatio,
        thresholdRatio: parseFloat(thresholdRatio.toFixed(2)),
        deviation: parseFloat(((user.pointsPerTaskRatio / thresholdRatio) * 100).toFixed(2)),
      }));

    const totalUsers = leaderboardData.length;
    const averagePoints =
      totalUsers > 0
        ? parseFloat(
            (leaderboardData.reduce((sum, u) => sum + u.points, 0) / totalUsers).toFixed(2)
          )
        : 0;
    const averageTasksCompleted =
      totalUsers > 0
        ? parseFloat(
            (
              leaderboardData.reduce((sum, u) => sum + u.statistics.tasksCompleted, 0) / totalUsers
            ).toFixed(2)
          )
        : 0;

    return {
      leaderboard: leaderboardData,
      cheatDetection: {
        medianRatio: parseFloat(medianRatio.toFixed(2)),
        thresholdRatio: parseFloat(thresholdRatio.toFixed(2)),
        flaggedUsers: flaggedUsers,
        flaggedCount: flaggedUsers.length,
      },
      summary: {
        totalUsers: totalUsers,
        averagePoints: averagePoints,
        averageTasksCompleted: averageTasksCompleted,
      },
      dateRange: start_date && end_date ? { start: start_date, end: end_date } : null,
    };
  }

  /**
   * Task Quality Metrics - Đo lường mức độ tương tác và collaboration của học viên
   * @param {Object} params - { board_id }
   * @returns {Object} Task quality metrics data
   */
  async getTaskQualityMetrics(params) {
    const { board_id } = params;
    const Comment = require('../models/comment.model');

    if (!board_id || !mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('Board ID không hợp lệ');
    }

    const board = await Board.findById(board_id);
    if (!board) {
      throw new Error('Board không tồn tại');
    }

    // 1. Lấy tất cả tasks của board
    const tasks = await Task.find({
      board_id,
      deleted_at: null,
    })
      .populate('column_id', 'name')
      .populate('assigned_to', 'username full_name')
      .lean();

    if (tasks.length === 0) {
      return {
        board: {
          id: board._id,
          title: board.title,
        },
        summary: {
          totalTasks: 0,
          averageCommentsPerTask: 0,
          averageAttachmentsPerTask: 0,
          averageChurnCount: 0,
          averageCollaborationScore: 0,
        },
        lowQualityTasks: [],
        highChurnTasks: [],
        tasks: [],
      };
    }

    const taskIds = tasks.map(t => t._id);

    // 2. Lấy tất cả comments của các tasks
    const comments = await Comment.find({
      task_id: { $in: taskIds },
      deleted_at: null,
    }).lean();

    // 3. Lấy tất cả history changes của các tasks
    const histories = await HistoryTask.find({
      task_id: { $in: taskIds },
    }).lean();

    // 4. Tính toán metrics cho từng task
    const taskMetrics = tasks.map(task => {
      const taskId = task._id.toString();

      // Đếm comments
      const commentCount = comments.filter(c => c.task_id?.toString() === taskId).length;

      // Đếm attachments từ task và comments
      const taskAttachments = (task.attachments || []).length;
      const commentAttachments = comments
        .filter(c => c.task_id?.toString() === taskId)
        .reduce((sum, c) => sum + (c.attachments?.length || 0), 0);
      const totalAttachments = taskAttachments + commentAttachments;

      // Đếm số lần di chuyển cột (churn)
      const taskHistories = histories.filter(h => h.task_id?.toString() === taskId);
      const columnMoves = taskHistories.filter(h => {
        const parsed = this.parseColumns(h.change_type);
        return parsed !== null; // Chỉ đếm các thay đổi liên quan đến cột
      }).length;

      // Tính collaboration score (0-100)
      // Score = (comments * 30 + attachments * 20 + interaction_bonus * 50)
      // interaction_bonus: có comment hoặc attachment = 1, không có = 0
      const hasInteraction = commentCount > 0 || totalAttachments > 0;
      const interactionBonus = hasInteraction ? 1 : 0;

      // Normalize: comments (max 10 = 30 points), attachments (max 5 = 20 points)
      const commentScore = Math.min((commentCount / 10) * 30, 30);
      const attachmentScore = Math.min((totalAttachments / 5) * 20, 20);
      const collaborationScore = Math.round(commentScore + attachmentScore + interactionBonus * 50);

      return {
        task_id: task._id,
        title: task.title,
        column_id: task.column_id?._id || task.column_id,
        column_name: task.column_id?.name || 'Unknown',
        assigned_to: task.assigned_to
          ? {
              id: task.assigned_to._id || task.assigned_to,
              username: task.assigned_to.username,
              full_name: task.assigned_to.full_name,
            }
          : null,
        commentCount,
        attachmentCount: totalAttachments,
        churnCount: columnMoves,
        collaborationScore,
        isLowQuality: commentCount === 0,
        isHighChurn: columnMoves >= 5, // >= 5 lần di chuyển được coi là high churn
      };
    });

    // 5. Tính toán tổng quan
    const totalTasks = taskMetrics.length;
    const averageCommentsPerTask =
      totalTasks > 0
        ? parseFloat(
            (taskMetrics.reduce((sum, t) => sum + t.commentCount, 0) / totalTasks).toFixed(2)
          )
        : 0;
    const averageAttachmentsPerTask =
      totalTasks > 0
        ? parseFloat(
            (taskMetrics.reduce((sum, t) => sum + t.attachmentCount, 0) / totalTasks).toFixed(2)
          )
        : 0;
    const averageChurnCount =
      totalTasks > 0
        ? parseFloat(
            (taskMetrics.reduce((sum, t) => sum + t.churnCount, 0) / totalTasks).toFixed(2)
          )
        : 0;
    const averageCollaborationScore =
      totalTasks > 0
        ? parseFloat(
            (taskMetrics.reduce((sum, t) => sum + t.collaborationScore, 0) / totalTasks).toFixed(2)
          )
        : 0;

    // 6. Xác định low quality tasks (0 comments)
    const lowQualityTasks = taskMetrics
      .filter(t => t.isLowQuality)
      .map(t => ({
        task_id: t.task_id,
        title: t.title,
        column_name: t.column_name,
        assigned_to: t.assigned_to,
        commentCount: t.commentCount,
        attachmentCount: t.attachmentCount,
        collaborationScore: t.collaborationScore,
        warning: 'Task không có bình luận nào - cần thảo luận thêm',
      }))
      .sort((a, b) => b.collaborationScore - a.collaborationScore);

    // 7. Xác định high churn tasks (bị di chuyển nhiều lần)
    const highChurnTasks = taskMetrics
      .filter(t => t.isHighChurn)
      .map(t => ({
        task_id: t.task_id,
        title: t.title,
        column_name: t.column_name,
        assigned_to: t.assigned_to,
        churnCount: t.churnCount,
        commentCount: t.commentCount,
        collaborationScore: t.collaborationScore,
        warning: `Task bị di chuyển ${t.churnCount} lần giữa các cột - có thể cần xem xét lại`,
      }))
      .sort((a, b) => b.churnCount - a.churnCount);

    // 8. Sắp xếp tasks theo collaboration score
    const sortedTasks = [...taskMetrics].sort(
      (a, b) => b.collaborationScore - a.collaborationScore
    );

    return {
      board: {
        id: board._id,
        title: board.title,
      },
      summary: {
        totalTasks,
        averageCommentsPerTask,
        averageAttachmentsPerTask,
        averageChurnCount,
        averageCollaborationScore,
        lowQualityTasksCount: lowQualityTasks.length,
        highChurnTasksCount: highChurnTasks.length,
      },
      lowQualityTasks,
      highChurnTasks,
      tasks: sortedTasks.map(t => ({
        task_id: t.task_id,
        title: t.title,
        column_name: t.column_name,
        assigned_to: t.assigned_to,
        commentCount: t.commentCount,
        attachmentCount: t.attachmentCount,
        churnCount: t.churnCount,
        collaborationScore: t.collaborationScore,
      })),
    };
  }

  async getOverdueAnalysis(boardId) {
    const board_id = boardId;

    try {
      // 1. Lấy cột Done
      const doneColumn = await Column.findOne({
        board_id: board_id,
        isDone: true,
      });
      if (!doneColumn) throw new Error('Không tìm thấy cột Done');

      const doneId = doneColumn._id.toString();

      // 2. Lấy tất cả task chưa hoàn thành và quá hạn
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const overdueTasks = await Task.find({
        board_id: board_id,
        deleted_at: null,
        $or: [{ column_id: { $ne: doneId } }, { column_id: { $exists: false } }],
        due_date: { $lt: now },
      })
        .populate('assigned_to', 'username full_name email')
        .populate('column_id', 'name')
        .lean();

      // 3. Map dữ liệu + tính daysOverdue
      const results = overdueTasks.map(task => {
        const assignedUser = task.assigned_to;
        const column = task.column_id;

        return {
          taskId: task._id,
          title: task.title,
          dueDate: task.due_date,
          priority: task.priority || 'none',
          columnId: column?._id?.toString() || null,
          columnName: column?.name || 'Unknown',
          assignedTo: assignedUser
            ? {
                userId: assignedUser._id,
                username: assignedUser.username,
                fullName: assignedUser.full_name,
                email: assignedUser.email,
              }
            : null,
          daysOverdue: Math.ceil((now - new Date(task.due_date)) / (1000 * 60 * 60 * 24)),
        };
      });

      // 4. Breakdown by User
      const userViolationCount = {};
      const userViolationCountThisMonth = {}; // For repeat offenders
      const overdueDaysList = [];

      for (const task of results) {
        overdueDaysList.push(task.daysOverdue);

        if (task.assignedTo?.userId) {
          const uid = task.assignedTo.userId.toString();
          
          // Total violations
          if (!userViolationCount[uid]) {
            userViolationCount[uid] = {
              userId: uid,
              username: task.assignedTo.username,
              fullName: task.assignedTo.fullName,
              email: task.assignedTo.email,
              violationCount: 0,
              totalDaysOverdue: 0,
            };
          }
          userViolationCount[uid].violationCount += 1;
          userViolationCount[uid].totalDaysOverdue += task.daysOverdue;

          // This month violations (for repeat offenders)
          const taskDueDate = new Date(task.dueDate);
          if (taskDueDate >= startOfMonth) {
            if (!userViolationCountThisMonth[uid]) {
              userViolationCountThisMonth[uid] = {
                userId: uid,
                username: task.assignedTo.username,
                fullName: task.assignedTo.fullName,
                email: task.assignedTo.email,
                violationCount: 0,
              };
            }
            userViolationCountThisMonth[uid].violationCount += 1;
          }
        }
      }

      // Calculate average days overdue per user
      const violationByUser = Object.values(userViolationCount).map(user => ({
        ...user,
        avgDaysOverdue: user.violationCount > 0 
          ? Math.round((user.totalDaysOverdue / user.violationCount) * 10) / 10 
          : 0,
      })).sort((a, b) => b.violationCount - a.violationCount);

      // 5. Breakdown by Priority
      const breakdownByPriority = {
        high: { total: 0, avgDaysOverdue: 0, tasks: [] },
        medium: { total: 0, avgDaysOverdue: 0, tasks: [] },
        low: { total: 0, avgDaysOverdue: 0, tasks: [] },
        none: { total: 0, avgDaysOverdue: 0, tasks: [] },
      };

      for (const task of results) {
        const priority = (task.priority || 'none').toLowerCase();
        const targetPriority = ['high', 'medium', 'low'].includes(priority) ? priority : 'none';
        
        breakdownByPriority[targetPriority].total += 1;
        breakdownByPriority[targetPriority].tasks.push(task);
      }

      // Calculate average days overdue per priority
      for (const priority in breakdownByPriority) {
        const tasks = breakdownByPriority[priority].tasks;
        if (tasks.length > 0) {
          const totalDays = tasks.reduce((sum, t) => sum + t.daysOverdue, 0);
          breakdownByPriority[priority].avgDaysOverdue = Math.round((totalDays / tasks.length) * 10) / 10;
        }
        // Remove tasks array from response (keep only stats)
        delete breakdownByPriority[priority].tasks;
      }

      // 6. Breakdown by Column
      const breakdownByColumn = {};
      
      for (const task of results) {
        const columnId = task.columnId || 'unassigned';
        const columnName = task.columnName || 'Unassigned';
        
        if (!breakdownByColumn[columnId]) {
          breakdownByColumn[columnId] = {
            columnId,
            columnName,
            total: 0,
            avgDaysOverdue: 0,
            totalDaysOverdue: 0,
          };
        }
        
        breakdownByColumn[columnId].total += 1;
        breakdownByColumn[columnId].totalDaysOverdue += task.daysOverdue;
      }

      // Calculate average days overdue per column
      const breakdownByColumnArray = Object.values(breakdownByColumn).map(col => ({
        ...col,
        avgDaysOverdue: col.total > 0 
          ? Math.round((col.totalDaysOverdue / col.total) * 10) / 10 
          : 0,
      })).sort((a, b) => b.total - a.total);

      // 7. Repeat Offenders (users with >3 overdue tasks this month)
      const repeatOffenders = Object.values(userViolationCountThisMonth)
        .filter(user => user.violationCount > 3)
        .sort((a, b) => b.violationCount - a.violationCount);

      // 8. Tính trung bình số ngày trễ hạn tổng thể
      const averageOverdueDays =
        overdueDaysList.length > 0
          ? Math.round((overdueDaysList.reduce((a, b) => a + b, 0) / overdueDaysList.length) * 10) / 10
          : 0;

      // 9. Trả về dữ liệu
      return {
        totalOverdueTasks: results.length,
        overdueTasks: results,
        breakdownByUser: violationByUser,
        breakdownByPriority,
        breakdownByColumn: breakdownByColumnArray,
        repeatOffenders,
        averageOverdueDays,
      };
    } catch (error) {
      throw new Error(`Error in getOverdueAnalysis: ${error.message}`);
    }
  }
}

module.exports = new AnalyticsService();

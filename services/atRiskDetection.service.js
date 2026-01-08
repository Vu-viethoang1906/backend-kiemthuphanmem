const taskRepo = require('../repositories/task.repository');
const atRiskTaskRepo = require('../repositories/atRiskTask.repository');
const columnRepo = require('../repositories/column.repository');
const historyTaskService = require('../services/historyTask.service');
const Task = require('../models/task.model');
const Column = require('../models/column.model');
const mongoose = require('mongoose');

class AtRiskDetectionService {
  async detectAtRiskTasks(board_id = null) {
    try {
      const query = { deleted_at: null };
      if (board_id) {
        query.board_id = mongoose.Types.ObjectId.isValid(board_id)
          ? new mongoose.Types.ObjectId(board_id)
          : board_id;
      }

      const tasks = await Task.find(query).populate('column_id', 'name isDone').lean();

      const atRiskTasks = [];
      let checkedCount = 0;
      let skippedNoDueDate = 0;
      let skippedDone = 0;

      for (const task of tasks) {
        if (!task.due_date) {
          skippedNoDueDate++;
          continue;
        }
        if (task.column_id?.isDone) {
          skippedDone++;
          continue;
        }

        checkedCount++;
        const riskAnalysis = await this.analyzeTaskRisk(task);

        if (riskAnalysis.risk_score > 0) {
          const recommendations = this.generateRecommendations(riskAnalysis, task);

          const atRiskData = {
            task_id: task._id,
            board_id: task.board_id,
            risk_score: riskAnalysis.risk_score,
            risk_reasons: riskAnalysis.reasons,
            recommendations: recommendations,
            is_resolved: false,
          };

          await atRiskTaskRepo.upsert(task._id, atRiskData);
          atRiskTasks.push({
            ...atRiskData,
            task: task,
          });
        } else {
          await atRiskTaskRepo.markAsResolved(task._id);
        }
      }

      return atRiskTasks;
    } catch (error) {
      console.error('❌ Lỗi detect at-risk tasks:', error);
      throw new Error(`Lỗi phát hiện at-risk tasks: ${error.message}`);
    }
  }

  async analyzeTaskRisk(task) {
    const reasons = [];
    const triggeredScores = [];

    const rule1 = await this.checkUnassignedNearDeadline(task);
    if (rule1.triggered) {
      reasons.push(rule1);
      triggeredScores.push(rule1.score);
    }

    const rule2 = await this.checkStuckInColumn(task);
    if (rule2.triggered) {
      reasons.push(rule2);
      triggeredScores.push(rule2.score);
    }

    const rule3 = await this.checkUserHasManyOverdue(task);
    if (rule3.triggered) {
      reasons.push(rule3);
      triggeredScores.push(rule3.score);
    }

    const rule4 = await this.checkHighEstimateLowTime(task);
    if (rule4.triggered) {
      reasons.push(rule4);
      triggeredScores.push(rule4.score);
    }

    let totalScore = 0;
    if (triggeredScores.length > 0) {
      totalScore = triggeredScores.reduce((sum, score) => {
        const numScore = typeof score === 'number' ? score : parseFloat(score) || 0;
        return sum + numScore;
      }, 0);
    }

    if (triggeredScores.length > 1) {
      const expectedSum = triggeredScores.reduce((a, b) => a + b, 0);
      if (Math.abs(totalScore - expectedSum) > 0.0001) {
        console.error(
          `⚠️ WARNING: Score calculation mismatch! Expected: ${expectedSum}, Got: ${totalScore}`
        );
        totalScore = expectedSum;
      }
    }

    return {
      risk_score: totalScore,
      reasons: reasons,
    };
  }

  async checkUnassignedNearDeadline(task) {
    const result = {
      rule_name: 'unassigned_near_deadline',
      score: 0.8,
      triggered: false,
      details: {},
    };

    if (!task.assigned_to && task.due_date) {
      const now = new Date();
      const dueDate = new Date(task.due_date);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 3 && daysUntilDue >= 0) {
        result.triggered = true;
        result.details = {
          days_until_due: daysUntilDue,
          due_date: task.due_date,
        };
      }
    }

    return result;
  }

  async checkStuckInColumn(task) {
    const result = {
      rule_name: 'stuck_in_column',
      score: 0.7,
      triggered: false,
      details: {},
    };

    if (!task.column_id) return result;

    const historyLogs = await historyTaskService.getAllHistoryTasks({
      task_id: task._id,
      change_type: { $regex: /Di chuyển.*cột/i },
    });

    if (historyLogs.length === 0) {
      const now = new Date();
      const createdDate = new Date(task.created_at || task.updated_at || now);
      const daysInColumn = Math.ceil((now - createdDate) / (1000 * 60 * 60 * 24));

      if (daysInColumn > 5) {
        result.triggered = true;
        result.details = {
          days_in_column: daysInColumn,
          column_id: task.column_id._id || task.column_id,
          column_name: task.column_id?.name || 'Unknown',
        };
      }
    } else {
      const sortedLogs = [...historyLogs].sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateB - dateA;
      });
      const lastMove = sortedLogs[0];
      const now = new Date();
      const lastMoveDate = new Date(lastMove.created_at || lastMove.createdAt || now);
      const daysInColumn = Math.ceil((now - lastMoveDate) / (1000 * 60 * 60 * 24));

      if (daysInColumn > 5) {
        result.triggered = true;
        result.details = {
          days_in_column: daysInColumn,
          column_id: task.column_id._id || task.column_id,
          column_name: task.column_id?.name || 'Unknown',
          last_moved_at: lastMoveDate,
        };
      }
    }

    return result;
  }

  async checkUserHasManyOverdue(task) {
    const result = {
      rule_name: 'user_has_many_overdue',
      score: 0.6,
      triggered: false,
      details: {},
    };

    if (!task.assigned_to) return result;

    const now = new Date();
    const overdueTasks = await Task.find({
      assigned_to: task.assigned_to,
      due_date: { $lt: now },
      deleted_at: null,
      _id: { $ne: task._id },
    })
      .populate('column_id', 'isDone')
      .lean();

    const activeOverdueTasks = overdueTasks.filter(t => !t.column_id || !t.column_id.isDone);

    if (activeOverdueTasks.length > 3) {
      result.triggered = true;
      result.details = {
        overdue_count: activeOverdueTasks.length,
        assigned_to: task.assigned_to,
      };
    }

    return result;
  }

  async checkHighEstimateLowTime(task) {
    const result = {
      rule_name: 'high_estimate_low_time',
      score: 0.9,
      triggered: false,
      details: {},
    };

    if (!task.estimate_hours || !task.due_date) return result;

    if (task.estimate_hours > 16) {
      const now = new Date();
      const dueDate = new Date(task.due_date);
      const hoursRemaining = (dueDate - now) / (1000 * 60 * 60);

      if (hoursRemaining > 0 && hoursRemaining < task.estimate_hours) {
        result.triggered = true;
        result.details = {
          estimate_hours: task.estimate_hours,
          hours_remaining: Math.round(hoursRemaining * 100) / 100,
          due_date: task.due_date,
        };
      }
    }

    return result;
  }

  generateRecommendations(riskAnalysis, task = null) {
    const recommendations = [];

    riskAnalysis.reasons.forEach(reason => {
      switch (reason.rule_name) {
        case 'unassigned_near_deadline': {
          const days = reason.details.days_until_due || 0;
          recommendations.push(
            `Gán người thực hiện ngay lập tức cho task này (còn ${days} ngày đến hạn)`
          );
          recommendations.push('Xem xét gia hạn deadline nếu cần thiết');
          break;
        }

        case 'stuck_in_column': {
          const days = reason.details.days_in_column || 0;
          const columnName = reason.details.column_name || 'cột này';
          recommendations.push(
            `Liên hệ học viên để tìm hiểu về vướng mắc (blocker) do đã bị stuck ${days} ngày ở cột "${columnName}"`
          );
          if (columnName === 'To do' || columnName.toLowerCase().includes('to do')) {
            recommendations.push(
              'Task chưa được bắt đầu - cần kiểm tra xem học viên có quên hoặc trì hoãn không'
            );
          }
          break;
        }

        case 'user_has_many_overdue': {
          const overdueCount = reason.details.overdue_count || 0;
          recommendations.push(
            `Xem xét phân bổ lại/giảm workload cho học viên (đang có ${overdueCount} task quá hạn)`
          );
          recommendations.push('Ưu tiên các task quan trọng và deadline gần nhất');
          break;
        }

        case 'high_estimate_low_time': {
          const estimateHours = reason.details.estimate_hours || 0;
          const hoursRemaining = reason.details.hours_remaining || 0;
          recommendations.push(
            `Xem xét gia hạn deadline hoặc giảm scope (ước tính ${estimateHours}h nhưng còn ${hoursRemaining.toFixed(1)}h)`
          );
          recommendations.push('Thêm người hỗ trợ để hoàn thành đúng hạn');
          break;
        }
      }
    });

    return [...new Set(recommendations)];
  }

  async getAtRiskTasksByBoard(board_id) {
    const validBoardId = mongoose.Types.ObjectId.isValid(board_id)
      ? new mongoose.Types.ObjectId(board_id)
      : board_id;

    const tasks = await atRiskTaskRepo.findByBoardId(validBoardId, { is_resolved: false });
    if (tasks.length === 0) {
      await this.detectAtRiskTasks(validBoardId);
      return await atRiskTaskRepo.findByBoardId(validBoardId, { is_resolved: false });
    }
    return tasks;
  }

  async getAtRiskTasksByUser(user_id) {
    const tasks = await atRiskTaskRepo.findByUserId(user_id, { is_resolved: false });
    if (tasks.length === 0) {
      await this.detectAtRiskTasks();
      return await atRiskTaskRepo.findByUserId(user_id, { is_resolved: false });
    }
    return tasks;
  }

  async markTaskAsResolved(task_id) {
    return await atRiskTaskRepo.markAsResolved(task_id);
  }
}

module.exports = new AtRiskDetectionService();

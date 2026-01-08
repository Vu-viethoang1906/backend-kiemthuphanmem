const Task = require('../models/task.model');
const Column = require('../models/column.model');
const BoardMember = require('../models/boardMember.model');
const UserLeave = require('../models/userLeave.model');
const mongoose = require('mongoose');
const moment = require('moment-timezone');

class SprintForecastService {
  async getSprintForecast(
    board_id,
    nextSprintStartDate,
    nextSprintEndDate,
    sprintDurationDays = 14
  ) {
    if (!mongoose.Types.ObjectId.isValid(board_id)) {
      throw new Error('Board ID không hợp lệ');
    }

    const doneColumn = await Column.findOne({ board_id, isDone: true });
    if (!doneColumn) {
      throw new Error('Board không có cột Done');
    }

    const boardMembers = await BoardMember.find({ board_id });
    const memberIds = boardMembers.map(m => m.user_id);

    const now = new Date();
    const fourSprintsAgo = new Date(now.getTime() - sprintDurationDays * 4 * 24 * 60 * 60 * 1000);

    const completedTasks = await Task.find({
      board_id,
      deleted_at: null,
      done_at: { $ne: null, $gte: fourSprintsAgo },
      column_id: doneColumn._id,
    }).lean();

    const velocity = this._calculateVelocity(
      completedTasks,
      fourSprintsAgo,
      now,
      sprintDurationDays
    );

    const confidenceInterval = {
      min: Math.round(velocity * 0.8),
      max: Math.round(velocity * 1.2),
    };

    const currentWIP = await Task.countDocuments({
      board_id,
      deleted_at: null,
      column_id: { $ne: doneColumn._id },
    });

    const riskFactors = await this._calculateRiskFactors(
      board_id,
      memberIds,
      nextSprintStartDate,
      nextSprintEndDate,
      currentWIP,
      velocity
    );

    const recommendedTaskCount = this._calculateRecommendedTaskCount(
      velocity,
      confidenceInterval,
      riskFactors,
      currentWIP
    );

    return {
      board_id,
      next_sprint: {
        start_date: nextSprintStartDate,
        end_date: nextSprintEndDate,
        duration_days: sprintDurationDays,
      },
      historical_velocity: {
        average: Math.round(velocity),
        from_sprints: 4,
        period: {
          start: fourSprintsAgo,
          end: now,
        },
      },
      confidence_interval: {
        min: confidenceInterval.min,
        max: confidenceInterval.max,
        percentage: '80-120%',
      },
      risk_factors: {
        users_on_leave: riskFactors.onLeaveCount,
        on_leave_percentage: riskFactors.onLeavePercentage,
        on_leave_risk_factor: riskFactors.onLeaveRiskFactor,
        holidays_count: riskFactors.holidaysCount,
        holidays_percentage: riskFactors.holidaysPercentage,
        holidays_risk_factor: riskFactors.holidaysRiskFactor,
        current_wip: currentWIP,
        wip_risk_factor: riskFactors.wipRiskFactor,
        total_risk_adjustment: riskFactors.totalRiskAdjustment,
      },
      recommendation: {
        recommended_task_count: recommendedTaskCount,
        confidence_level: this._getConfidenceLevel(riskFactors.totalRiskAdjustment),
        notes: this._generateRecommendationNotes(velocity, riskFactors, currentWIP),
      },
    };
  }

  _calculateVelocity(completedTasks, startDate, endDate, sprintDurationDays) {
    if (completedTasks.length === 0) return 0;

    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const numberOfSprints = Math.floor(totalDays / sprintDurationDays) || 1;

    const tasksPerSprint = completedTasks.length / numberOfSprints;
    return Math.round(tasksPerSprint * 10) / 10;
  }

  async _calculateRiskFactors(board_id, memberIds, sprintStart, sprintEnd, currentWIP, velocity) {
    const onLeaveUsers = await UserLeave.find({
      $or: [{ board_id }, { board_id: null }],
      user_id: { $in: memberIds },
      leave_start: { $lte: sprintEnd },
      leave_end: { $gte: sprintStart },
    }).lean();

    const uniqueOnLeaveUserIds = [...new Set(onLeaveUsers.map(l => l.user_id.toString()))];
    const onLeaveCount = uniqueOnLeaveUserIds.length;
    const totalMembers = memberIds.length;
    const onLeavePercentage = totalMembers > 0 ? (onLeaveCount / totalMembers) * 100 : 0;

    const holidays = this._getHolidaysInRange(sprintStart, sprintEnd);
    const holidaysCount = holidays.length;
    const workingDays = this._getWorkingDays(sprintStart, sprintEnd, holidays);
    const totalDays = (sprintEnd - sprintStart) / (1000 * 60 * 60 * 24) + 1;
    const holidaysPercentage = totalDays > 0 ? (holidaysCount / totalDays) * 100 : 0;

    const onLeaveRiskFactor = Math.min(onLeavePercentage / 100, 0.3);
    const holidaysRiskFactor = Math.min(holidaysPercentage / 100, 0.2);

    const wipRiskFactor =
      velocity > 0 ? Math.min(currentWIP / (velocity * 2), 0.5) : currentWIP > 0 ? 0.5 : 0;

    const totalRiskAdjustment = -(onLeaveRiskFactor + holidaysRiskFactor + wipRiskFactor);

    return {
      onLeaveCount,
      onLeavePercentage: Math.round(onLeavePercentage * 10) / 10,
      holidaysCount,
      holidaysPercentage: Math.round(holidaysPercentage * 10) / 10,
      workingDays,
      totalDays: Math.round(totalDays),
      totalRiskAdjustment: Math.round(totalRiskAdjustment * 1000) / 1000,
      onLeaveRiskFactor: Math.round(onLeaveRiskFactor * 1000) / 1000,
      holidaysRiskFactor: Math.round(holidaysRiskFactor * 1000) / 1000,
      wipRiskFactor: Math.round(wipRiskFactor * 1000) / 1000,
    };
  }

  _getHolidaysInRange(startDate, endDate) {
    const holidays = [];
    const start = moment(startDate).tz('Asia/Ho_Chi_Minh');
    const end = moment(endDate).tz('Asia/Ho_Chi_Minh');

    const current = start.clone();
    while (current.isSameOrBefore(end)) {
      const dayOfWeek = current.day();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        holidays.push(current.format('YYYY-MM-DD'));
      }
      current.add(1, 'day');
    }

    const vietnamHolidays = [
      '2024-01-01',
      '2024-02-10',
      '2024-02-11',
      '2024-02-12',
      '2024-02-13',
      '2024-02-14',
      '2024-04-18',
      '2024-04-30',
      '2024-05-01',
      '2024-09-02',
      '2025-01-01',
      '2025-01-29',
      '2025-01-30',
      '2025-01-31',
      '2025-02-01',
      '2025-02-02',
      '2025-04-18',
      '2025-04-30',
      '2025-05-01',
      '2025-09-02',
    ];

    vietnamHolidays.forEach(holiday => {
      const holidayDate = moment(holiday).tz('Asia/Ho_Chi_Minh');
      if (holidayDate.isSameOrAfter(start) && holidayDate.isSameOrBefore(end)) {
        holidays.push(holiday);
      }
    });

    return [...new Set(holidays)];
  }

  _getWorkingDays(startDate, endDate, holidays) {
    const start = moment(startDate).tz('Asia/Ho_Chi_Minh');
    const end = moment(endDate).tz('Asia/Ho_Chi_Minh');
    const holidaySet = new Set(holidays);

    let workingDays = 0;
    const current = start.clone();

    while (current.isSameOrBefore(end)) {
      const dayOfWeek = current.day();
      const dateStr = current.format('YYYY-MM-DD');
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        workingDays++;
      }
      current.add(1, 'day');
    }

    return workingDays;
  }

  _calculateRecommendedTaskCount(velocity, confidenceInterval, riskFactors, currentWIP) {
    if (velocity === 0) {
      return 0;
    }

    const riskAdjustment = riskFactors.totalRiskAdjustment;
    const recommended = velocity + velocity * riskAdjustment;

    const finalRecommended = Math.max(0, Math.round(recommended));

    if (currentWIP > velocity * 2) {
      return 0;
    }

    return Math.max(0, Math.min(finalRecommended, confidenceInterval.max));
  }

  _getConfidenceLevel(riskAdjustment) {
    const absRisk = Math.abs(riskAdjustment);
    if (absRisk < 0.1) return 'high';
    if (absRisk < 0.3) return 'medium';
    return 'low';
  }

  _generateRecommendationNotes(velocity, riskFactors, currentWIP) {
    const notes = [];

    if (velocity === 0) {
      notes.push(
        'Không có dữ liệu lịch sử, đề xuất bắt đầu với số lượng task nhỏ để đo lường velocity'
      );
    }

    if (riskFactors.onLeavePercentage > 20) {
      notes.push(
        `Có ${riskFactors.onLeaveCount} thành viên nghỉ phép (${riskFactors.onLeavePercentage}%), nên giảm số lượng task`
      );
    }

    if (riskFactors.holidaysPercentage > 15) {
      notes.push(
        `Có ${riskFactors.holidaysCount} ngày nghỉ lễ trong sprint, cần điều chỉnh kỳ vọng`
      );
    }

    if (currentWIP > velocity * 2) {
      notes.push(
        `WIP hiện tại (${currentWIP}) cao hơn velocity, nên hoàn thành task hiện có trước khi nhận thêm`
      );
    }

    if (notes.length === 0) {
      notes.push('Điều kiện thuận lợi, có thể gán task theo velocity trung bình');
    }

    return notes;
  }
}

module.exports = new SprintForecastService();

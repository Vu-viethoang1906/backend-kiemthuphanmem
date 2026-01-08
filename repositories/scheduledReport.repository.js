const ScheduledReport = require('../models/scheduledReport.model');

class ScheduledReportRepository {
  async create(data) {
    return await ScheduledReport.create(data);
  }

  async findById(id) {
    return await ScheduledReport.findById(id)
      .populate('user_id', 'email full_name')
      .populate('board_id', 'title');
  }

  async findByUserId(userId) {
    return await ScheduledReport.find({ user_id: userId, is_active: true })
      .populate('board_id', 'title')
      .sort({
        created_at: -1,
      });
  }

  async findByBoardId(boardId) {
    return await ScheduledReport.find({ board_id: boardId, is_active: true });
  }

  async findDueReports(now) {
    return await ScheduledReport.find({
      is_active: true,
      next_send_at: { $lte: now },
    })
      .populate('user_id', 'email full_name')
      .populate('board_id', 'title');
  }

  async update(id, data) {
    return await ScheduledReport.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await ScheduledReport.findByIdAndDelete(id);
  }

  async deactivate(id) {
    return await ScheduledReport.findByIdAndUpdate(id, { is_active: false }, { new: true });
  }

  async incrementRetryCount(id) {
    const report = await ScheduledReport.findById(id);
    if (report) {
      report.retry_count = (report.retry_count || 0) + 1;
      await report.save();
      return report;
    }
    return null;
  }

  async updateLastError(id, error) {
    return await ScheduledReport.findByIdAndUpdate(id, { last_error: error }, { new: true });
  }
}

module.exports = new ScheduledReportRepository();

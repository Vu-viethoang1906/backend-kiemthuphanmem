const sprintForecastService = require('../services/sprintForecast.service');
const boardRepo = require('../repositories/board.repository');

class SprintForecastController {
  async getForecast(req, res) {
    try {
      const { board_id } = req.params;
      const { next_sprint_start, next_sprint_end, sprint_duration_days = 14 } = req.query;

      if (!board_id) {
        return res.status(400).json({
          success: false,
          message: 'board_id là bắt buộc',
        });
      }

      const board = await boardRepo.findById(board_id);
      if (!board) {
        return res.status(404).json({
          success: false,
          message: 'Board không tồn tại',
        });
      }

      let nextSprintStartDate;
      let nextSprintEndDate;

      if (next_sprint_start && next_sprint_end) {
        nextSprintStartDate = new Date(next_sprint_start);
        nextSprintEndDate = new Date(next_sprint_end);
      } else {
        const now = new Date();
        const durationDays = parseInt(sprint_duration_days) || 14;
        nextSprintStartDate = new Date(now);
        nextSprintEndDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      }

      if (isNaN(nextSprintStartDate.getTime()) || isNaN(nextSprintEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Ngày không hợp lệ',
        });
      }

      if (nextSprintStartDate >= nextSprintEndDate) {
        return res.status(400).json({
          success: false,
          message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
        });
      }

      const forecast = await sprintForecastService.getSprintForecast(
        board_id,
        nextSprintStartDate,
        nextSprintEndDate,
        parseInt(sprint_duration_days) || 14
      );

      res.json({
        success: true,
        data: forecast,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new SprintForecastController();

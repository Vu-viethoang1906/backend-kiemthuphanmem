const analyticsService = require('../services/analytics.service');

class AnalyticsController {
  async getLineChart(req, res) {
    try {
      const { board_id, start_date, end_date, granularity = 'day' } = req.query;
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'start_date và end_date là bắt buộc',
        });
      }

      const data = await analyticsService.getLineChartData({
        board_id,
        start_date,
        end_date,
        granularity,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Analytics Line Chart Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  async getDashboard(req, res) {
    try {
      const { board_id } = req.params;

      const stats = await analyticsService.getDashboardStats(board_id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('❌ Analytics Dashboard Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
        data: {
          board: { id: null, title: null },
          stats: {
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            overdueTasks: 0,
            completionRate: 0,
          },
        },
      });
    }
  }
  async getCompletionRate(req, res) {
    try {
      const { board_id, user_id, center_id, group_id } = req.query;

      const data = await analyticsService.getCompletionRate({
        board_id,
        user_id,
        center_id,
        group_id,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Analytics Completion Rate Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
        data: {
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          completionRate: 0,
        },
      });
    }
  }

  async getCycleTime(req, res) {
    try {
      const { board_id } = req.query;

      if (!board_id) {
        return res.status(400).json({
          success: false,
          message: 'board_id is required',
        });
      }

      const result = await analyticsService.getCycleTimeTask(board_id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('❌ Cycle Time Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  async getThroughputAndCFD(req, res) {
    try {
      const { idBoard, start_date, end_date, wipLimit } = req.body;

      if (!idBoard) {
        return res.status(400).json({
          success: false,
          message: 'idBoard is required',
        });
      }

      const result = await analyticsService.getThroughputAndCFD(
        idBoard,
        wipLimit || 5,
        start_date || null,
        end_date || null
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('❌ Throughput and CFD Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getCompletionSpeed(req, res) {
    try {
      const { board_id, start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'start_date và end_date là bắt buộc',
        });
      }

      const data = await analyticsService.getCompletionSpeed({
        board_id,
        start_date,
        end_date,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getEstimationAccuracy(req, res) {
    try {
      const { board_id, start_date, end_date, user_id, priority } = req.query;

      const data = await analyticsService.getEstimationAccuracy({
        board_id,
        start_date,
        end_date,
        user_id,
        priority,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getLeaderboard(req, res) {
    try {
      const { center_id, limit, start_date, end_date } = req.query;

      const data = await analyticsService.getLeaderboard({
        center_id,
        limit,
        start_date,
        end_date,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getGamificationCorrelation(req, res) {
    try {
      const { center_id, board_id } = req.query;

      const data = await analyticsService.getGamificationCorrelation({
        center_id,
        board_id,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Gamification Correlation Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async compareCentersPerformance(req, res) {
    try {
      const { board_id } = req.query;

      const data = await analyticsService.compareCentersPerformance({
        board_id,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Compare Centers Performance Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async workloadMangement(req, res) {
    try {
      const { board_id } = req.params;

      const data = await analyticsService.getWorkload({
        board_id,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getHealthScore(req, res) {
    try {
      const { board_id } = req.params;

      const data = await analyticsService.getHealthScore({
        board_id: board_id,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getTaskQualityMetrics(req, res) {
    try {
      const { board_id } = req.query;

      if (!board_id) {
        return res.status(400).json({
          success: false,
          message: 'board_id là bắt buộc',
        });
      }

      const data = await analyticsService.getTaskQualityMetrics({
        board_id,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Task Quality Metrics Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  async getOverdueAnalysis(req, res) {
    const { board_id } = req.body;
    try {
      if (!board_id) {
        return res.status(400).json({
          success: false,
          message: 'board_id is required',
        });
      }

      const result = await analyticsService.getOverdueAnalysis(board_id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('❌ Overdue Analysis Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new AnalyticsController();

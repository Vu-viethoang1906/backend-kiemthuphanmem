// 📄 tests/unit/analytics.controller.test.js - Analytics Controller Unit Tests
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => next(),
  authorizeAny: requiredRoles => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

jest.mock('../../middlewares/boardAccess', () => ({
  checkBoardAccess: (req, res, next) => next(),
}));

// Mock analytics service
jest.mock('../../services/analytics.service', () => ({
  getLineChartData: jest.fn(),
  getDashboardStats: jest.fn(),
  getCompletionRate: jest.fn(),
  getCycleTimeTask: jest.fn(),
  getThroughputAndCFD: jest.fn(),
  getCompletionSpeed: jest.fn(),
  getEstimationAccuracy: jest.fn(),
  getLeaderboard: jest.fn(),
  getGamificationCorrelation: jest.fn(),
  compareCentersPerformance: jest.fn(),
  getWorkload: jest.fn(),
  getHealthScore: jest.fn(),
  getTaskQualityMetrics: jest.fn(),
  getOverdueAnalysis: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const analyticsRouter = require('../../router/analytics.routes');

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRouter);

describe('🔹 Analytics Controller Unit Tests', () => {
  const analyticsService = require('../../services/analytics.service');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/line-chart - Get Line Chart Data', () => {
    it('✅ should return line chart data successfully', async () => {
      const mockData = {
        board: { id: 'board123', title: 'Test Board' },
        dateRange: {
          start: '2025-01-01',
          end: '2025-01-31',
          granularity: 'day',
        },
        data: [{ date: '2025-01-01', total: 5, completed: 2, overdue: 1, inProgress: 2 }],
      };

      analyticsService.getLineChartData.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/line-chart').query({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        granularity: 'day',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('board');
      expect(res.body.data).toHaveProperty('data');
      expect(analyticsService.getLineChartData).toHaveBeenCalledWith({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        granularity: 'day',
      });
    });

    it('❌ should return 400 when start_date is missing', async () => {
      const res = await request(app).get('/api/analytics/line-chart').query({
        board_id: 'board123',
        end_date: '2025-01-31',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'start_date và end_date là bắt buộc');
    });

    it('❌ should return 400 when end_date is missing', async () => {
      const res = await request(app).get('/api/analytics/line-chart').query({
        board_id: 'board123',
        start_date: '2025-01-01',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'start_date và end_date là bắt buộc');
    });

    it('❌ should return 400 for invalid board_id', async () => {
      analyticsService.getLineChartData.mockRejectedValue(new Error('Board ID không hợp lệ'));

      const res = await request(app).get('/api/analytics/line-chart').query({
        board_id: 'invalid',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('✅ should use default granularity when not provided', async () => {
      const mockData = {
        board: { id: 'board123', title: 'Test Board' },
        data: [],
      };

      analyticsService.getLineChartData.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/line-chart').query({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });

      expect(res.status).toBe(200);
      expect(analyticsService.getLineChartData).toHaveBeenCalledWith({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        granularity: 'day',
      });
    });
  });

  describe('GET /api/analytics/dashboard/:board_id - Get Dashboard Stats', () => {
    it('✅ should return dashboard stats successfully', async () => {
      const mockStats = {
        board: { id: 'board123', title: 'Test Board' },
        stats: {
          totalTasks: 10,
          completedTasks: 5,
          inProgressTasks: 3,
          overdueTasks: 2,
          completionRate: 50,
        },
      };

      analyticsService.getDashboardStats.mockResolvedValue(mockStats);

      const res = await request(app).get('/api/analytics/dashboard/board123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('stats');
      expect(res.body.data.stats.totalTasks).toBe(10);
      expect(analyticsService.getDashboardStats).toHaveBeenCalledWith('board123');
    });

    it('❌ should return 400 for invalid board_id', async () => {
      analyticsService.getDashboardStats.mockRejectedValue(new Error('Board không tồn tại'));

      const res = await request(app).get('/api/analytics/dashboard/invalid');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.stats.totalTasks).toBe(0);
    });
  });

  describe('GET /api/analytics/board-performance/:board_id - Get Board Performance (Alias)', () => {
    it('✅ should return dashboard stats via alias route', async () => {
      const mockStats = {
        board: { id: 'board123', title: 'Test Board' },
        stats: {
          totalTasks: 10,
          completedTasks: 5,
        },
      };

      analyticsService.getDashboardStats.mockResolvedValue(mockStats);

      const res = await request(app).get('/api/analytics/board-performance/board123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(analyticsService.getDashboardStats).toHaveBeenCalledWith('board123');
    });
  });

  describe('GET /api/analytics/completion-rate - Get Completion Rate', () => {
    it('✅ should return completion rate successfully', async () => {
      const mockData = {
        totalTasks: 10,
        completedTasks: 5,
        inProgressTasks: 3,
        completionRate: 50,
      };

      analyticsService.getCompletionRate.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/completion-rate').query({
        board_id: 'board123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.completionRate).toBe(50);
      expect(analyticsService.getCompletionRate).toHaveBeenCalledWith({
        board_id: 'board123',
        user_id: undefined,
        center_id: undefined,
        group_id: undefined,
      });
    });

    it('✅ should filter by user_id', async () => {
      const mockData = {
        totalTasks: 5,
        completedTasks: 3,
        completionRate: 60,
      };

      analyticsService.getCompletionRate.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/completion-rate').query({
        board_id: 'board123',
        user_id: 'user123',
      });

      expect(res.status).toBe(200);
      expect(analyticsService.getCompletionRate).toHaveBeenCalledWith({
        board_id: 'board123',
        user_id: 'user123',
        center_id: undefined,
        group_id: undefined,
      });
    });

    it('✅ should filter by center_id and group_id', async () => {
      const mockData = {
        totalTasks: 8,
        completedTasks: 4,
        completionRate: 50,
      };

      analyticsService.getCompletionRate.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/completion-rate').query({
        board_id: 'board123',
        center_id: 'center123',
        group_id: 'group123',
      });

      expect(res.status).toBe(200);
      expect(analyticsService.getCompletionRate).toHaveBeenCalledWith({
        board_id: 'board123',
        user_id: undefined,
        center_id: 'center123',
        group_id: 'group123',
      });
    });

    it('❌ should return 400 for invalid board_id', async () => {
      analyticsService.getCompletionRate.mockRejectedValue(new Error('Board ID không hợp lệ'));

      const res = await request(app).get('/api/analytics/completion-rate').query({
        board_id: 'invalid',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.completionRate).toBe(0);
    });
  });

  describe('GET /api/analytics/cycle-time - Get Cycle Time', () => {
    it('✅ should return cycle time data successfully', async () => {
      const mockData = {
        averageCycleTime: 5.5,
        tasks: [
          { task_id: 'task1', cycleTime: 5 },
          { task_id: 'task2', cycleTime: 6 },
        ],
      };

      analyticsService.getCycleTimeTask.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/cycle-time').query({
        board_id: 'board123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getCycleTimeTask).toHaveBeenCalledWith('board123');
    });

    it('❌ should return 400 when board_id is missing', async () => {
      const res = await request(app).get('/api/analytics/cycle-time');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'board_id is required');
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getCycleTimeTask.mockRejectedValue(new Error('Board không tồn tại'));

      const res = await request(app).get('/api/analytics/cycle-time').query({
        board_id: 'invalid',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/analytics/ThroughputAndCFD - Get Throughput and CFD', () => {
    it('✅ should return throughput and CFD data successfully', async () => {
      const mockData = {
        throughput: [5, 6, 7],
        cfd: [{ date: '2025-01-01', wip: 10, completed: 5 }],
      };

      analyticsService.getThroughputAndCFD.mockResolvedValue(mockData);

      const res = await request(app).post('/api/analytics/ThroughputAndCFD').send({
        idBoard: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        wipLimit: 5,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getThroughputAndCFD).toHaveBeenCalledWith(
        'board123',
        5,
        '2025-01-01',
        '2025-01-31'
      );
    });

    it('✅ should use default wipLimit when not provided', async () => {
      const mockData = { throughput: [], cfd: [] };
      analyticsService.getThroughputAndCFD.mockResolvedValue(mockData);

      const res = await request(app).post('/api/analytics/ThroughputAndCFD').send({
        idBoard: 'board123',
      });

      expect(res.status).toBe(200);
      expect(analyticsService.getThroughputAndCFD).toHaveBeenCalledWith('board123', 5, null, null);
    });

    it('❌ should return 400 when idBoard is missing', async () => {
      const res = await request(app).post('/api/analytics/ThroughputAndCFD').send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'idBoard is required');
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getThroughputAndCFD.mockRejectedValue(new Error('Service error'));

      const res = await request(app).post('/api/analytics/ThroughputAndCFD').send({
        idBoard: 'board123',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/completion-speed - Get Completion Speed', () => {
    it('✅ should return completion speed data successfully', async () => {
      const mockData = {
        averageSpeed: 2.5,
        tasks: [
          { task_id: 'task1', speed: 2 },
          { task_id: 'task2', speed: 3 },
        ],
      };

      analyticsService.getCompletionSpeed.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/completion-speed').query({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getCompletionSpeed).toHaveBeenCalledWith({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });
    });

    it('❌ should return 400 when start_date is missing', async () => {
      const res = await request(app).get('/api/analytics/completion-speed').query({
        board_id: 'board123',
        end_date: '2025-01-31',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'start_date và end_date là bắt buộc');
    });

    it('❌ should return 400 when end_date is missing', async () => {
      const res = await request(app).get('/api/analytics/completion-speed').query({
        board_id: 'board123',
        start_date: '2025-01-01',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'start_date và end_date là bắt buộc');
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getCompletionSpeed.mockRejectedValue(new Error('Service error'));

      const res = await request(app).get('/api/analytics/completion-speed').query({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/estimation-accuracy - Get Estimation Accuracy', () => {
    it('✅ should return estimation accuracy data successfully', async () => {
      const mockData = {
        averageAccuracy: 85.5,
        tasks: [{ task_id: 'task1', estimated: 8, actual: 7, accuracy: 87.5 }],
      };

      analyticsService.getEstimationAccuracy.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/estimation-accuracy').query({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        user_id: 'user123',
        priority: 'high',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getEstimationAccuracy).toHaveBeenCalledWith({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        user_id: 'user123',
        priority: 'high',
      });
    });

    it('✅ should work without optional filters', async () => {
      const mockData = { averageAccuracy: 80 };
      analyticsService.getEstimationAccuracy.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/estimation-accuracy').query({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });

      expect(res.status).toBe(200);
      expect(analyticsService.getEstimationAccuracy).toHaveBeenCalledWith({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        user_id: undefined,
        priority: undefined,
      });
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getEstimationAccuracy.mockRejectedValue(new Error('Service error'));

      const res = await request(app).get('/api/analytics/estimation-accuracy').query({
        board_id: 'board123',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/leaderboard - Get Leaderboard', () => {
    it('✅ should return leaderboard data successfully', async () => {
      const mockData = {
        users: [
          { user_id: 'user1', points: 100, rank: 1 },
          { user_id: 'user2', points: 90, rank: 2 },
        ],
      };

      analyticsService.getLeaderboard.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/leaderboard').query({
        center_id: 'center123',
        limit: '10',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getLeaderboard).toHaveBeenCalledWith({
        center_id: 'center123',
        limit: '10',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });
    });

    it('✅ should work without optional filters', async () => {
      const mockData = { users: [] };
      analyticsService.getLeaderboard.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/leaderboard');

      expect(res.status).toBe(200);
      expect(analyticsService.getLeaderboard).toHaveBeenCalledWith({
        center_id: undefined,
        limit: undefined,
        start_date: undefined,
        end_date: undefined,
      });
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getLeaderboard.mockRejectedValue(new Error('Service error'));

      const res = await request(app).get('/api/analytics/leaderboard');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/gamification-correlation - Get Gamification Correlation', () => {
    it('✅ should return gamification correlation data successfully', async () => {
      const mockData = {
        correlation: 0.75,
        pointsVsCompletion: [{ points: 100, completionRate: 80 }],
      };

      analyticsService.getGamificationCorrelation.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/gamification-correlation').query({
        center_id: 'center123',
        board_id: 'board123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getGamificationCorrelation).toHaveBeenCalledWith({
        center_id: 'center123',
        board_id: 'board123',
      });
    });

    it('✅ should work without optional filters', async () => {
      const mockData = { correlation: 0.5 };
      analyticsService.getGamificationCorrelation.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/gamification-correlation');

      expect(res.status).toBe(200);
      expect(analyticsService.getGamificationCorrelation).toHaveBeenCalledWith({
        center_id: undefined,
        board_id: undefined,
      });
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getGamificationCorrelation.mockRejectedValue(new Error('Service error'));

      const res = await request(app).get('/api/analytics/gamification-correlation');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/centers-performance - Compare Centers Performance', () => {
    it('✅ should return centers performance comparison successfully', async () => {
      const mockData = {
        centers: [
          { center_id: 'center1', completionRate: 80, averagePoints: 100 },
          { center_id: 'center2', completionRate: 75, averagePoints: 90 },
        ],
      };

      analyticsService.compareCentersPerformance.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/centers-performance').query({
        board_id: 'board123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.compareCentersPerformance).toHaveBeenCalledWith({
        board_id: 'board123',
      });
    });

    it('✅ should work without board_id filter', async () => {
      const mockData = { centers: [] };
      analyticsService.compareCentersPerformance.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/centers-performance');

      expect(res.status).toBe(200);
      expect(analyticsService.compareCentersPerformance).toHaveBeenCalledWith({
        board_id: undefined,
      });
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.compareCentersPerformance.mockRejectedValue(new Error('Service error'));

      const res = await request(app).get('/api/analytics/centers-performance');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/lead-time/board/:board_id - Workload Management', () => {
    it('✅ should return workload data successfully', async () => {
      const mockData = {
        users: [{ user_id: 'user1', workload: 80, tasks: 10 }],
      };

      analyticsService.getWorkload.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/lead-time/board/board123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getWorkload).toHaveBeenCalledWith({
        board_id: 'board123',
      });
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getWorkload.mockRejectedValue(new Error('Service error'));

      const res = await request(app).get('/api/analytics/lead-time/board/board123');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/HealthScore/board/:board_id - Get Health Score', () => {
    it('✅ should return health score data successfully', async () => {
      const mockData = {
        healthScore: 85,
        factors: {
          completionRate: 80,
          cycleTime: 5,
          overdueRate: 10,
        },
      };

      analyticsService.getHealthScore.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/HealthScore/board/board123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getHealthScore).toHaveBeenCalledWith({
        board_id: 'board123',
      });
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getHealthScore.mockRejectedValue(new Error('Service error'));

      const res = await request(app).get('/api/analytics/HealthScore/board/board123');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/task-quality-metrics - Get Task Quality Metrics', () => {
    it('✅ should return task quality metrics successfully', async () => {
      const mockData = {
        averageQuality: 85,
        tasks: [{ task_id: 'task1', quality: 90 }],
      };

      analyticsService.getTaskQualityMetrics.mockResolvedValue(mockData);

      const res = await request(app).get('/api/analytics/task-quality-metrics').query({
        board_id: 'board123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getTaskQualityMetrics).toHaveBeenCalledWith({
        board_id: 'board123',
      });
    });

    it('❌ should return 400 when board_id is missing', async () => {
      const res = await request(app).get('/api/analytics/task-quality-metrics');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'board_id là bắt buộc');
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getTaskQualityMetrics.mockRejectedValue(new Error('Service error'));

      const res = await request(app).get('/api/analytics/task-quality-metrics').query({
        board_id: 'board123',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/analytics/Overdue_Analysis - Get Overdue Analysis', () => {
    it('✅ should return overdue analysis data successfully', async () => {
      const mockData = {
        totalOverdue: 10,
        overdueByPriority: {
          high: 5,
          medium: 3,
          low: 2,
        },
        overdueTasks: [{ task_id: 'task1', daysOverdue: 5 }],
      };

      analyticsService.getOverdueAnalysis.mockResolvedValue(mockData);

      const res = await request(app).post('/api/analytics/Overdue_Analysis').send({
        board_id: 'board123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(analyticsService.getOverdueAnalysis).toHaveBeenCalledWith('board123');
    });

    it('❌ should return 400 when board_id is missing', async () => {
      const res = await request(app).post('/api/analytics/Overdue_Analysis').send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'board_id is required');
    });

    it('❌ should return 400 when service throws error', async () => {
      analyticsService.getOverdueAnalysis.mockRejectedValue(new Error('Service error'));

      const res = await request(app).post('/api/analytics/Overdue_Analysis').send({
        board_id: 'board123',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Error Handling', () => {
    it('✅ should handle service errors gracefully', async () => {
      analyticsService.getLineChartData.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/analytics/line-chart').query({
        board_id: 'board123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });
});

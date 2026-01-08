const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');
const { checkBoardAccess } = require('../middlewares/boardAccess');

const router = express.Router();

/**
 * Analytics Routes - Báo cáo & Thống kê (Stories 47-50)
 *
 * ✅ Security: Tất cả routes đều cần:
 * 1. Authentication (đã đăng nhập)
 * 2. Board Access (là member của board hoặc admin/System_Manager)
 */

// Story 49: Line Chart - Biểu đồ thống kê tiến độ theo thời gian
// Query params: board_id, start_date, end_date, granularity
router.get(
  '/line-chart',
  authenticateAny, // ✅ Check đã login
  checkBoardAccess, // ✅ Check có quyền truy cập board (từ query.board_id)
  analyticsController.getLineChart
);

// Story 47: Dashboard tổng quan
// Params: board_id
router.get(
  '/dashboard/:board_id',
  authenticateAny, // ✅ Check đã login
  checkBoardAccess, // ✅ Check có quyền truy cập board
  analyticsController.getDashboard
);

// Alias cho FE compatibility
router.get(
  '/board-performance/:board_id',
  authenticateAny,
  checkBoardAccess,
  analyticsController.getDashboard
);

// Story 48: Tỷ lệ hoàn thành
// Query params: board_id (required), user_id, center_id, group_id
router.get(
  '/completion-rate',
  authenticateAny, // ✅ Check đã login
  checkBoardAccess, // ✅ Check có quyền truy cập board (từ query.board_id)
  analyticsController.getCompletionRate
);

router.get(
  '/cycle-time',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  checkBoardAccess,
  analyticsController.getCycleTime
);

router.post(
  '/ThroughputAndCFD',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  analyticsController.getThroughputAndCFD
);

router.get(
  '/completion-speed',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  checkBoardAccess,
  analyticsController.getCompletionSpeed
);

router.get(
  '/estimation-accuracy',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  checkBoardAccess,
  analyticsController.getEstimationAccuracy
);

router.get(
  '/lead-time/board/:board_id',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  analyticsController.workloadMangement
);
router.get(
  '/HealthScore/board/:board_id',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  analyticsController.getHealthScore
);
// Phân tích mối tương quan giữa điểm thưởng gamification và tỷ lệ hoàn thành
// Query params: center_id (optional), board_id (optional)
// Chỉ Admin mới có quyền truy cập

router.get(
  '/gamification-correlation',
  authenticateAny, // ✅ Check đã login
  authorizeAny('admin System_Manager'), // ✅ Chỉ Admin/System_Manager
  analyticsController.getGamificationCorrelation
);

// So sánh hiệu suất của các trung tâm
// Query params: board_id (optional) - filter theo board cụ thể
// Chỉ Admin mới có quyền truy cập
router.get(
  '/centers-performance',
  authenticateAny, // ✅ Check đã login
  authorizeAny('admin System_Manager'), // ✅ Chỉ Admin/System_Manager
  analyticsController.compareCentersPerformance
);
router.get(
  '/leaderboard',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  analyticsController.getLeaderboard
);

router.post(
  '/Overdue_Analysis',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  analyticsController.getOverdueAnalysis
);
// Task Quality Metrics - Chỉ số chất lượng công việc
// Query params: board_id (required)
router.get(
  '/task-quality-metrics',
  authenticateAny, // ✅ Check đã login
  checkBoardAccess, // ✅ Check có quyền truy cập board (từ query.board_id)
  analyticsController.getTaskQualityMetrics
);

module.exports = router;

// 📄 tests/unit/sprintForecast.controller.test.js - Sprint Forecast Controller Unit Tests

// Mock auth middleware
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    if (!req.user) {
      req.user = {
        id: '507f1f77bcf86cd799439011',
        roles: ['admin', 'System_Manager'],
        email: 'test@example.com',
        username: 'testuser',
      };
    }
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
}));

// Mock services
jest.mock('../../services/sprintForecast.service', () => ({
  getSprintForecast: jest.fn(),
}));

// Mock repositories
jest.mock('../../repositories/board.repository', () => ({
  findById: jest.fn(),
}));

const sprintForecastController = require('../../controllers/sprintForecast.controller');
const sprintForecastService = require('../../services/sprintForecast.service');
const boardRepo = require('../../repositories/board.repository');

describe('🔹 Sprint Forecast Controller Unit Tests', () => {
  const VALID_BOARD_ID = '507f1f77bcf86cd799439012';
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock request
    mockReq = {
      user: {
        id: '507f1f77bcf86cd799439011',
        roles: ['admin'],
        email: 'test@example.com',
        username: 'testuser',
      },
      query: {},
      params: {},
      body: {},
    };

    // Setup default mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('getForecast', () => {
    const mockBoard = {
      _id: VALID_BOARD_ID,
      title: 'Test Board',
      description: 'Test Description',
    };

    const mockForecast = {
      board_id: VALID_BOARD_ID,
      next_sprint: {
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-15'),
        duration_days: 14,
      },
      historical_velocity: {
        average: 10,
        from_sprints: 4,
        period: {
          start: new Date('2024-12-01'),
          end: new Date('2025-01-01'),
        },
      },
      confidence_interval: {
        min: 8,
        max: 12,
        percentage: '80-120%',
      },
      risk_factors: {
        users_on_leave: 1,
        on_leave_percentage: 10,
        holidays_count: 2,
        holidays_percentage: 14.3,
        current_wip: 5,
        total_risk_adjustment: -0.15,
      },
      recommendation: {
        recommended_task_count: 8,
        confidence_level: 'medium',
        notes: ['Điều kiện thuận lợi, có thể gán task theo velocity trung bình'],
      },
    };

    it('✅ should return forecast successfully with custom dates', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);
      sprintForecastService.getSprintForecast.mockResolvedValue(mockForecast);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = {
        next_sprint_start: '2025-01-01',
        next_sprint_end: '2025-01-15',
        sprint_duration_days: '14',
      };

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(boardRepo.findById).toHaveBeenCalledWith(VALID_BOARD_ID);
      expect(sprintForecastService.getSprintForecast).toHaveBeenCalledWith(
        VALID_BOARD_ID,
        expect.any(Date),
        expect.any(Date),
        14
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockForecast,
      });
    });

    it('✅ should calculate dates from sprint_duration_days when dates not provided', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);
      sprintForecastService.getSprintForecast.mockResolvedValue(mockForecast);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = { sprint_duration_days: '21' };

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(sprintForecastService.getSprintForecast).toHaveBeenCalledWith(
        VALID_BOARD_ID,
        expect.any(Date),
        expect.any(Date),
        21
      );
    });

    it('✅ should use default sprint_duration_days (14) when not provided', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);
      sprintForecastService.getSprintForecast.mockResolvedValue(mockForecast);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = {};

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(sprintForecastService.getSprintForecast).toHaveBeenCalledWith(
        VALID_BOARD_ID,
        expect.any(Date),
        expect.any(Date),
        14
      );
    });

    it('✅ should handle invalid sprint_duration_days gracefully', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);
      sprintForecastService.getSprintForecast.mockResolvedValue(mockForecast);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = { sprint_duration_days: 'invalid' };

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(sprintForecastService.getSprintForecast).toHaveBeenCalledWith(
        VALID_BOARD_ID,
        expect.any(Date),
        expect.any(Date),
        14
      );
    });

    it('❌ should return 400 when board_id is missing', async () => {
      mockReq.params = {};
      mockReq.query = {};

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'board_id là bắt buộc',
      });
      expect(boardRepo.findById).not.toHaveBeenCalled();
    });

    it('❌ should return 404 when board not found', async () => {
      boardRepo.findById.mockResolvedValue(null);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = {};

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Board không tồn tại',
      });
      expect(sprintForecastService.getSprintForecast).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when next_sprint_start is invalid date', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = {
        next_sprint_start: 'invalid-date',
        next_sprint_end: '2025-01-15',
      };

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Ngày không hợp lệ',
      });
      expect(sprintForecastService.getSprintForecast).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when next_sprint_end is invalid date', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = {
        next_sprint_start: '2025-01-01',
        next_sprint_end: 'invalid-date',
      };

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Ngày không hợp lệ',
      });
    });

    it('❌ should return 400 when start_date >= end_date', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = {
        next_sprint_start: '2025-01-15',
        next_sprint_end: '2025-01-01',
      };

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
      });
      expect(sprintForecastService.getSprintForecast).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when start_date equals end_date', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = {
        next_sprint_start: '2025-01-01',
        next_sprint_end: '2025-01-01',
      };

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
      });
    });

    it('❌ should return 400 when service throws error', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);
      const error = new Error('Board không có cột Done');
      sprintForecastService.getSprintForecast.mockRejectedValue(error);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = {};

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Board không có cột Done',
      });
    });

    it('✅ should handle dates with time component', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);
      sprintForecastService.getSprintForecast.mockResolvedValue(mockForecast);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = {
        next_sprint_start: '2025-01-01T00:00:00Z',
        next_sprint_end: '2025-01-15T23:59:59Z',
      };

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(sprintForecastService.getSprintForecast).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockForecast,
      });
    });

    it('✅ should handle zero sprint_duration_days', async () => {
      boardRepo.findById.mockResolvedValue(mockBoard);
      sprintForecastService.getSprintForecast.mockResolvedValue(mockForecast);

      mockReq.params = { board_id: VALID_BOARD_ID };
      mockReq.query = { sprint_duration_days: '0' };

      await sprintForecastController.getForecast(mockReq, mockRes);

      expect(sprintForecastService.getSprintForecast).toHaveBeenCalledWith(
        VALID_BOARD_ID,
        expect.any(Date),
        expect.any(Date),
        14
      );
    });
  });
});

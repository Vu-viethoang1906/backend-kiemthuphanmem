// 📄 tests/unit/deployment.controller.test.js - Deployment Controller Unit Tests

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
jest.mock('../../services/deployment.service');

const deploymentController = require('../../controllers/deployment.controller');
const deploymentService = require('../../services/deployment.service');

describe('🔹 Deployment Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const VALID_DEPLOYMENT_ID = '507f1f77bcf86cd799439012';
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock request
    mockReq = {
      user: {
        id: VALID_USER_ID,
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

  describe('getCurrentVersion', () => {
    const mockCurrentVersion = {
      version: '1.0.0',
      source: 'environment',
    };

    const mockBuildInfo = {
      node_version: 'v18.0.0',
      npm_version: '9.0.0',
      build_time: new Date(),
      environment: 'production',
    };

    const mockCurrentDeployment = {
      _id: VALID_DEPLOYMENT_ID,
      version: '1.0.0',
      environment: 'production',
      status: 'success',
      deployed_at: new Date(),
    };

    it('✅ should return current version with all info successfully', async () => {
      deploymentService.getCurrentVersion.mockResolvedValue(mockCurrentVersion);
      deploymentService.getBuildInfo.mockResolvedValue(mockBuildInfo);
      deploymentService.getCurrentProductionDeployment.mockResolvedValue(mockCurrentDeployment);

      await deploymentController.getCurrentVersion(mockReq, mockRes);

      expect(deploymentService.getCurrentVersion).toHaveBeenCalled();
      expect(deploymentService.getBuildInfo).toHaveBeenCalled();
      expect(deploymentService.getCurrentProductionDeployment).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          version: mockCurrentVersion.version,
          source: mockCurrentVersion.source,
          build_info: mockBuildInfo,
          deployment: mockCurrentDeployment,
        },
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Service error');
      deploymentService.getCurrentVersion.mockRejectedValue(error);

      await deploymentController.getCurrentVersion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy version hiện tại',
        error: 'Service error',
      });
    });

    it('❌ should handle error without message', async () => {
      const error = new Error();
      error.message = '';
      deploymentService.getCurrentVersion.mockRejectedValue(error);

      await deploymentController.getCurrentVersion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy version hiện tại',
        error: '',
      });
    });
  });

  describe('getDeploymentHistory', () => {
    const mockDeployments = [
      {
        _id: VALID_DEPLOYMENT_ID,
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        deployed_at: new Date(),
      },
      {
        _id: '507f1f77bcf86cd799439013',
        version: '0.9.0',
        environment: 'production',
        status: 'success',
        deployed_at: new Date(),
      },
    ];

    const mockResult = {
      deployments: mockDeployments,
      total: 2,
      limit: 50,
      skip: 0,
    };

    it('✅ should return deployment history successfully with default params', async () => {
      deploymentService.getDeploymentHistory.mockResolvedValue(mockResult);

      mockReq.query = {};

      await deploymentController.getDeploymentHistory(mockReq, mockRes);

      expect(deploymentService.getDeploymentHistory).toHaveBeenCalledWith({
        environment: undefined,
        status: undefined,
        limit: 50,
        skip: 0,
        sortBy: 'deployed_at',
        sortOrder: 'desc',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeployments,
        pagination: {
          total: 2,
          limit: 50,
          skip: 0,
          hasMore: false,
        },
      });
    });

    it('✅ should return deployment history with filters', async () => {
      deploymentService.getDeploymentHistory.mockResolvedValue(mockResult);

      mockReq.query = {
        environment: 'production',
        status: 'success',
        limit: '20',
        skip: '10',
        sortBy: 'version',
        sortOrder: 'asc',
      };

      await deploymentController.getDeploymentHistory(mockReq, mockRes);

      expect(deploymentService.getDeploymentHistory).toHaveBeenCalledWith({
        environment: 'production',
        status: 'success',
        limit: 20,
        skip: 10,
        sortBy: 'version',
        sortOrder: 'asc',
      });
    });

    it('✅ should calculate hasMore correctly', async () => {
      const resultWithMore = {
        deployments: mockDeployments,
        total: 100,
        limit: 50,
        skip: 0,
      };
      deploymentService.getDeploymentHistory.mockResolvedValue(resultWithMore);

      mockReq.query = {};

      await deploymentController.getDeploymentHistory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeployments,
        pagination: {
          total: 100,
          limit: 50,
          skip: 0,
          hasMore: true,
        },
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      deploymentService.getDeploymentHistory.mockRejectedValue(error);

      mockReq.query = {};

      await deploymentController.getDeploymentHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy lịch sử deployment',
        error: 'Database error',
      });
    });
  });

  describe('getDeploymentById', () => {
    const mockDeployment = {
      _id: VALID_DEPLOYMENT_ID,
      version: '1.0.0',
      environment: 'production',
      status: 'success',
      deployed_at: new Date(),
      deployed_by: {
        _id: VALID_USER_ID,
        username: 'testuser',
        email: 'test@example.com',
      },
    };

    it('✅ should return deployment by id successfully', async () => {
      deploymentService.getDeploymentById.mockResolvedValue(mockDeployment);

      mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };

      await deploymentController.getDeploymentById(mockReq, mockRes);

      expect(deploymentService.getDeploymentById).toHaveBeenCalledWith(VALID_DEPLOYMENT_ID);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeployment,
      });
    });

    it('❌ should return 404 when deployment does not exist', async () => {
      const error = new Error('Deployment không tồn tại');
      deploymentService.getDeploymentById.mockRejectedValue(error);

      mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };

      await deploymentController.getDeploymentById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Deployment không tồn tại',
      });
    });

    it('❌ should return 404 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      deploymentService.getDeploymentById.mockRejectedValue(error);

      mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };

      await deploymentController.getDeploymentById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Deployment không tồn tại',
      });
    });
  });

  describe('createDeployment', () => {
    const mockDeploymentData = {
      version: '1.0.0',
      environment: 'production',
      branch: 'main',
      commit_hash: 'abc123',
      commit_message: 'Initial deployment',
      status: 'success',
      notes: 'Deployment notes',
    };

    const mockCreatedDeployment = {
      _id: VALID_DEPLOYMENT_ID,
      ...mockDeploymentData,
      deployed_by: VALID_USER_ID,
      deployed_by_username: 'testuser',
      deployed_at: new Date(),
    };

    it('✅ should create deployment successfully with user info', async () => {
      deploymentService.createDeployment.mockResolvedValue(mockCreatedDeployment);

      mockReq.body = mockDeploymentData;

      await deploymentController.createDeployment(mockReq, mockRes);

      expect(deploymentService.createDeployment).toHaveBeenCalledWith({
        ...mockDeploymentData,
        deployed_by: VALID_USER_ID,
        deployed_by_username: 'testuser',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Deployment record đã được tạo',
        data: mockCreatedDeployment,
      });
    });

    it('✅ should create deployment when user is not provided', async () => {
      deploymentService.createDeployment.mockResolvedValue(mockCreatedDeployment);

      mockReq.user = null;
      mockReq.body = mockDeploymentData;

      await deploymentController.createDeployment(mockReq, mockRes);

      expect(deploymentService.createDeployment).toHaveBeenCalledWith({
        ...mockDeploymentData,
        deployed_by: undefined,
        deployed_by_username: undefined,
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Validation error');
      deploymentService.createDeployment.mockRejectedValue(error);

      mockReq.body = mockDeploymentData;

      await deploymentController.createDeployment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi tạo deployment record',
        error: 'Validation error',
      });
    });
  });

  describe('updateDeploymentStatus', () => {
    const mockUpdatedDeployment = {
      _id: VALID_DEPLOYMENT_ID,
      version: '1.0.0',
      status: 'success',
      notes: 'Updated notes',
    };

    it('✅ should update deployment status successfully', async () => {
      deploymentService.updateDeploymentStatus.mockResolvedValue(mockUpdatedDeployment);

      mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };
      mockReq.body = {
        status: 'success',
        notes: 'Updated notes',
      };

      await deploymentController.updateDeploymentStatus(mockReq, mockRes);

      expect(deploymentService.updateDeploymentStatus).toHaveBeenCalledWith(
        VALID_DEPLOYMENT_ID,
        'success',
        'Updated notes'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Deployment status đã được cập nhật',
        data: mockUpdatedDeployment,
      });
    });

    it('✅ should update status without notes', async () => {
      deploymentService.updateDeploymentStatus.mockResolvedValue(mockUpdatedDeployment);

      mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };
      mockReq.body = {
        status: 'failed',
      };

      await deploymentController.updateDeploymentStatus(mockReq, mockRes);

      expect(deploymentService.updateDeploymentStatus).toHaveBeenCalledWith(
        VALID_DEPLOYMENT_ID,
        'failed',
        undefined
      );
    });

    it('❌ should return 400 when status is missing', async () => {
      mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };
      mockReq.body = {};

      await deploymentController.updateDeploymentStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status không hợp lệ',
      });
      expect(deploymentService.updateDeploymentStatus).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when status is invalid', async () => {
      mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };
      mockReq.body = {
        status: 'invalid_status',
      };

      await deploymentController.updateDeploymentStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status không hợp lệ',
      });
    });

    it('✅ should accept valid status values', async () => {
      const validStatuses = ['success', 'failed', 'in_progress', 'rolled_back'];
      deploymentService.updateDeploymentStatus.mockResolvedValue(mockUpdatedDeployment);

      for (const status of validStatuses) {
        jest.clearAllMocks();
        mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };
        mockReq.body = { status };

        await deploymentController.updateDeploymentStatus(mockReq, mockRes);

        expect(deploymentService.updateDeploymentStatus).toHaveBeenCalledWith(
          VALID_DEPLOYMENT_ID,
          status,
          undefined
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      }
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Deployment không tồn tại');
      deploymentService.updateDeploymentStatus.mockRejectedValue(error);

      mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };
      mockReq.body = {
        status: 'success',
      };

      await deploymentController.updateDeploymentStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Deployment không tồn tại',
        error: 'Deployment không tồn tại',
      });
    });

    it('❌ should return 500 with default message when error has no message', async () => {
      const error = new Error();
      error.message = '';
      deploymentService.updateDeploymentStatus.mockRejectedValue(error);

      mockReq.params = { deploymentId: VALID_DEPLOYMENT_ID };
      mockReq.body = {
        status: 'success',
      };

      await deploymentController.updateDeploymentStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi cập nhật deployment status',
        error: '',
      });
    });
  });

  describe('getDeploymentStats', () => {
    const mockStats = {
      total: 100,
      success: 80,
      failed: 10,
      in_progress: 5,
      rolled_back: 5,
      last_deployment: {
        version: '1.0.0',
        deployed_at: new Date(),
        status: 'success',
        deployed_by: 'testuser',
      },
    };

    it('✅ should return deployment stats with default environment', async () => {
      deploymentService.getDeploymentStats.mockResolvedValue(mockStats);

      mockReq.query = {};

      await deploymentController.getDeploymentStats(mockReq, mockRes);

      expect(deploymentService.getDeploymentStats).toHaveBeenCalledWith('production');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('✅ should return deployment stats with custom environment', async () => {
      deploymentService.getDeploymentStats.mockResolvedValue(mockStats);

      mockReq.query = {
        environment: 'staging',
      };

      await deploymentController.getDeploymentStats(mockReq, mockRes);

      expect(deploymentService.getDeploymentStats).toHaveBeenCalledWith('staging');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      deploymentService.getDeploymentStats.mockRejectedValue(error);

      mockReq.query = {};

      await deploymentController.getDeploymentStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy thống kê deployment',
        error: 'Database error',
      });
    });
  });

  describe('getCurrentProductionDeployment', () => {
    const mockDeployment = {
      _id: VALID_DEPLOYMENT_ID,
      version: '1.0.0',
      environment: 'production',
      status: 'success',
      deployed_at: new Date(),
      deployed_by: {
        _id: VALID_USER_ID,
        username: 'testuser',
      },
    };

    it('✅ should return current production deployment successfully', async () => {
      deploymentService.getCurrentProductionDeployment.mockResolvedValue(mockDeployment);

      await deploymentController.getCurrentProductionDeployment(mockReq, mockRes);

      expect(deploymentService.getCurrentProductionDeployment).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeployment,
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      deploymentService.getCurrentProductionDeployment.mockRejectedValue(error);

      await deploymentController.getCurrentProductionDeployment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy deployment hiện tại',
        error: 'Database error',
      });
    });
  });
});

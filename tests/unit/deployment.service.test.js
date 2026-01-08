// 📄 tests/unit/deployment.service.test.js - Deployment Service Unit Tests
const mongoose = require('mongoose');

// Create mockExecAsync before any mocks
const mockExecAsync = jest.fn();

// Mock dependencies BEFORE requiring the service
jest.mock('../../models/deployment.model');
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('path');

// Mock util module
const mockExecAsyncStore = { mock: mockExecAsync };

jest.mock('util', () => {
  const actualUtil = jest.requireActual('util');

  return {
    ...actualUtil,
    promisify: jest.fn(fn => {
      const childProcess = require('child_process');
      if (fn === childProcess.exec) {
        return mockExecAsyncStore.mock;
      }
      return actualUtil.promisify(fn);
    }),
  };
});

// Store original env and process
const originalEnv = process.env;
const originalProcessVersion = process.version;

// Now require the service after all mocks are set up
const DeploymentService = require('../../services/deployment.service');
const Deployment = require('../../models/deployment.model');
const fs = require('fs');
const path = require('path');

describe('🔹 Deployment Service Unit Tests', () => {
  let mockDeploymentInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Reset process.env
    process.env = { ...originalEnv };
    delete process.env.APP_VERSION;
    delete process.env.BUILD_TIME;
    delete process.env.NODE_ENV;

    // Reset mockExecAsync
    mockExecAsync.mockClear();
    mockExecAsync.mockReset();

    // Mock path.join
    path.join.mockImplementation((...args) => args.join('/'));

    // Mock Deployment instance
    mockDeploymentInstance = {
      save: jest.fn().mockResolvedValue({}),
      _id: new mongoose.Types.ObjectId(),
      version: '1.0.0',
      environment: 'production',
      status: 'success',
    };
    Deployment.mockImplementation(() => mockDeploymentInstance);
  });

  afterEach(() => {
    process.env = originalEnv;
    process.version = originalProcessVersion;
  });

  describe('getCurrentVersion', () => {
    it('✅ should return version from environment variable', async () => {
      process.env.APP_VERSION = '1.2.3';

      const result = await DeploymentService.getCurrentVersion();

      expect(result).toEqual({
        version: '1.2.3',
        source: 'environment',
      });
      expect(mockExecAsync).not.toHaveBeenCalled();
    });

    it('✅ should return version from git when env variable not set', async () => {
      delete process.env.APP_VERSION;
      mockExecAsync.mockResolvedValue({ stdout: 'abc1234\n' });

      const result = await DeploymentService.getCurrentVersion();

      expect(result).toEqual({
        version: 'abc1234',
        source: 'git',
      });
      expect(mockExecAsync).toHaveBeenCalledWith('git rev-parse --short HEAD', {
        cwd: expect.stringContaining('/..'),
      });
    });

    it('✅ should return version from package.json when git fails', async () => {
      delete process.env.APP_VERSION;
      mockExecAsync.mockRejectedValue(new Error('Git not found'));
      fs.promises.readFile.mockResolvedValue(JSON.stringify({ version: '2.0.0' }));

      const result = await DeploymentService.getCurrentVersion();

      expect(result).toEqual({
        version: '2.0.0',
        source: 'package.json',
      });
      expect(fs.promises.readFile).toHaveBeenCalled();
    });

    it('✅ should return "unknown" when all sources fail', async () => {
      delete process.env.APP_VERSION;
      mockExecAsync.mockRejectedValue(new Error('Git not found'));
      fs.promises.readFile.mockRejectedValue(new Error('File not found'));

      const result = await DeploymentService.getCurrentVersion();

      expect(result).toEqual({
        version: 'unknown',
        source: 'unknown',
      });
    });

    it('✅ should return "unknown" when package.json has no version', async () => {
      delete process.env.APP_VERSION;
      mockExecAsync.mockRejectedValue(new Error('Git not found'));
      fs.promises.readFile.mockResolvedValue(JSON.stringify({}));

      const result = await DeploymentService.getCurrentVersion();

      expect(result).toEqual({
        version: 'unknown',
        source: 'package.json',
      });
    });
  });

  describe('getBuildInfo', () => {
    it('✅ should return build info with npm version', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '9.0.0\n' });
      process.env.NODE_ENV = 'production';
      process.env.BUILD_TIME = '2024-01-01T00:00:00Z';

      const result = await DeploymentService.getBuildInfo();

      expect(result).toEqual({
        node_version: process.version,
        npm_version: '9.0.0',
        build_time: new Date('2024-01-01T00:00:00Z'),
        environment: 'production',
      });
      expect(mockExecAsync).toHaveBeenCalledWith('npm --version');
    });

    it('✅ should return build info with unknown npm version when npm command fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('npm not found'));
      process.env.NODE_ENV = 'staging';

      const result = await DeploymentService.getBuildInfo();

      expect(result).toEqual({
        node_version: process.version,
        npm_version: 'unknown',
        build_time: expect.any(Date),
        environment: 'staging',
      });
    });

    it('✅ should use current date when BUILD_TIME not set', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '9.0.0\n' });
      delete process.env.BUILD_TIME;

      const result = await DeploymentService.getBuildInfo();

      expect(result.build_time).toBeInstanceOf(Date);
      expect(result.environment).toBe('production');
    });

    it('✅ should handle errors gracefully', async () => {
      mockExecAsync.mockRejectedValue(new Error('Unexpected error'));

      const result = await DeploymentService.getBuildInfo();

      expect(result).toEqual({
        node_version: process.version,
        npm_version: 'unknown',
        build_time: expect.any(Date),
        environment: 'production',
      });
    });
  });

  describe('createDeployment', () => {
    const mockBuildInfo = {
      node_version: 'v18.0.0',
      npm_version: '9.0.0',
      build_time: new Date(),
      environment: 'production',
    };

    const mockCurrentVersion = {
      version: '1.0.0',
      source: 'git',
    };

    beforeEach(() => {
      jest.spyOn(DeploymentService, 'getBuildInfo').mockResolvedValue(mockBuildInfo);
      jest.spyOn(DeploymentService, 'getCurrentVersion').mockResolvedValue(mockCurrentVersion);
    });

    it('✅ should create deployment with provided data', async () => {
      const deploymentData = {
        version: '2.0.0',
        environment: 'staging',
        branch: 'main',
        commit_hash: 'abc123',
        commit_message: 'Test commit',
        deployed_by: new mongoose.Types.ObjectId(),
        deployed_by_username: 'testuser',
        status: 'success',
        notes: 'Test deployment',
      };

      mockDeploymentInstance.save.mockResolvedValue({
        ...mockDeploymentInstance,
        ...deploymentData,
        build_info: mockBuildInfo,
      });

      const result = await DeploymentService.createDeployment(deploymentData);

      expect(Deployment).toHaveBeenCalledWith({
        version: '2.0.0',
        environment: 'staging',
        branch: 'main',
        commit_hash: 'abc123',
        commit_message: 'Test commit',
        deployed_by: deploymentData.deployed_by,
        deployed_by_username: 'testuser',
        status: 'success',
        notes: 'Test deployment',
        build_info: mockBuildInfo,
        rollback_to: undefined,
      });
      expect(mockDeploymentInstance.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('✅ should use default values when data not provided', async () => {
      const deploymentData = {
        branch: 'main',
        deployed_by: new mongoose.Types.ObjectId(),
      };

      mockDeploymentInstance.save.mockResolvedValue(mockDeploymentInstance);

      await DeploymentService.createDeployment(deploymentData);

      expect(Deployment).toHaveBeenCalledWith({
        version: '1.0.0',
        environment: 'production',
        branch: 'main',
        commit_hash: '1.0.0',
        commit_message: undefined,
        deployed_by: deploymentData.deployed_by,
        deployed_by_username: undefined,
        status: 'success',
        notes: undefined,
        build_info: mockBuildInfo,
        rollback_to: undefined,
      });
    });

    it('✅ should merge build_info from deploymentData', async () => {
      const deploymentData = {
        build_info: {
          custom_field: 'custom_value',
        },
        deployed_by: new mongoose.Types.ObjectId(),
      };

      await DeploymentService.createDeployment(deploymentData);

      expect(Deployment).toHaveBeenCalledWith(
        expect.objectContaining({
          build_info: expect.objectContaining({
            ...mockBuildInfo,
            custom_field: 'custom_value',
          }),
        })
      );
    });

    it('✅ should throw error when save fails', async () => {
      const deploymentData = {
        deployed_by: new mongoose.Types.ObjectId(),
      };

      mockDeploymentInstance.save.mockRejectedValue(new Error('Database error'));

      await expect(DeploymentService.createDeployment(deploymentData)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getDeploymentHistory', () => {
    const mockDeployments = [
      {
        _id: new mongoose.Types.ObjectId(),
        version: '1.0.0',
        environment: 'production',
        status: 'success',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        version: '2.0.0',
        environment: 'production',
        status: 'failed',
      },
    ];

    let mockQuery;

    beforeEach(() => {
      mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockDeployments),
      };
      Deployment.find.mockReturnValue(mockQuery);
      Deployment.countDocuments.mockResolvedValue(2);
    });

    it('✅ should return deployment history with default filters', async () => {
      const result = await DeploymentService.getDeploymentHistory();

      expect(Deployment.find).toHaveBeenCalledWith({});
      expect(Deployment.countDocuments).toHaveBeenCalledWith({});
      expect(result).toEqual({
        deployments: mockDeployments,
        total: 2,
        limit: 50,
        skip: 0,
      });
    });

    it('✅ should filter by environment', async () => {
      const filters = { environment: 'staging' };

      await DeploymentService.getDeploymentHistory(filters);

      expect(Deployment.find).toHaveBeenCalledWith({ environment: 'staging' });
      expect(Deployment.countDocuments).toHaveBeenCalledWith({ environment: 'staging' });
    });

    it('✅ should filter by status', async () => {
      const filters = { status: 'success' };

      await DeploymentService.getDeploymentHistory(filters);

      expect(Deployment.find).toHaveBeenCalledWith({ status: 'success' });
      expect(Deployment.countDocuments).toHaveBeenCalledWith({ status: 'success' });
    });

    it('✅ should filter by both environment and status', async () => {
      const filters = { environment: 'production', status: 'success' };

      await DeploymentService.getDeploymentHistory(filters);

      expect(Deployment.find).toHaveBeenCalledWith({
        environment: 'production',
        status: 'success',
      });
    });

    it('✅ should apply limit and skip', async () => {
      const filters = { limit: 10, skip: 5 };

      await DeploymentService.getDeploymentHistory(filters);

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.skip).toHaveBeenCalledWith(5);
    });

    it('✅ should apply sort order', async () => {
      const filters = { sortBy: 'version', sortOrder: 'asc' };

      await DeploymentService.getDeploymentHistory(filters);

      expect(mockQuery.sort).toHaveBeenCalledWith({ version: 1 });
    });

    it('✅ should populate deployed_by and rollback_to', async () => {
      await DeploymentService.getDeploymentHistory();

      expect(mockQuery.populate).toHaveBeenCalledWith('deployed_by', 'username email full_name');
      expect(mockQuery.populate).toHaveBeenCalledWith('rollback_to', 'version deployed_at');
    });

    it('✅ should throw error when query fails', async () => {
      Deployment.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(DeploymentService.getDeploymentHistory()).rejects.toThrow('Database error');
    });
  });

  describe('getCurrentProductionDeployment', () => {
    it('✅ should return deployment from database when exists', async () => {
      const mockDeployment = {
        _id: new mongoose.Types.ObjectId(),
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        deployed_at: new Date(),
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockDeployment),
      };
      Deployment.findOne.mockReturnValue(mockQuery);

      const result = await DeploymentService.getCurrentProductionDeployment();

      expect(Deployment.findOne).toHaveBeenCalledWith({
        environment: 'production',
        status: 'success',
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('deployed_by', 'username email full_name');
      expect(mockQuery.sort).toHaveBeenCalledWith({ deployed_at: -1 });
      expect(result).toEqual(mockDeployment);
    });

    it('✅ should return system info when no deployment in database', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(null),
      };
      Deployment.findOne.mockReturnValue(mockQuery);

      jest.spyOn(DeploymentService, 'getCurrentVersion').mockResolvedValue({
        version: '1.0.0',
        source: 'git',
      });
      jest.spyOn(DeploymentService, 'getBuildInfo').mockResolvedValue({
        node_version: 'v18.0.0',
        npm_version: '9.0.0',
        build_time: new Date('2024-01-01'),
        environment: 'production',
      });

      const result = await DeploymentService.getCurrentProductionDeployment();

      expect(result).toEqual({
        version: '1.0.0',
        source: 'git',
        environment: 'production',
        build_info: {
          node_version: 'v18.0.0',
          npm_version: '9.0.0',
          build_time: new Date('2024-01-01'),
          environment: 'production',
        },
        deployed_at: new Date('2024-01-01'),
        status: 'success',
        isFromSystem: true,
      });
    });

    it('✅ should throw error when query fails', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      Deployment.findOne.mockReturnValue(mockQuery);

      await expect(DeploymentService.getCurrentProductionDeployment()).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getDeploymentById', () => {
    it('✅ should return deployment when found', async () => {
      const deploymentId = new mongoose.Types.ObjectId();
      const mockDeployment = {
        _id: deploymentId,
        version: '1.0.0',
        environment: 'production',
        status: 'success',
      };

      const secondPopulate = jest.fn().mockResolvedValue(mockDeployment);
      const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
      const mockQuery = {
        populate: firstPopulate,
      };
      Deployment.findById.mockReturnValue(mockQuery);

      const result = await DeploymentService.getDeploymentById(deploymentId.toString());

      expect(Deployment.findById).toHaveBeenCalledWith(deploymentId.toString());
      expect(firstPopulate).toHaveBeenCalledWith('deployed_by', 'username email full_name');
      expect(secondPopulate).toHaveBeenCalledWith('rollback_to', 'version deployed_at status');
      expect(result).toEqual(mockDeployment);
    });

    it('✅ should throw error when deployment not found', async () => {
      const deploymentId = new mongoose.Types.ObjectId();

      const secondPopulate = jest.fn().mockResolvedValue(null);
      const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
      const mockQuery = {
        populate: firstPopulate,
      };
      Deployment.findById.mockReturnValue(mockQuery);

      await expect(DeploymentService.getDeploymentById(deploymentId.toString())).rejects.toThrow(
        'Deployment không tồn tại'
      );
    });

    it('✅ should throw error when query fails', async () => {
      const deploymentId = new mongoose.Types.ObjectId();

      const secondPopulate = jest.fn().mockRejectedValue(new Error('Database error'));
      const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
      const mockQuery = {
        populate: firstPopulate,
      };
      Deployment.findById.mockReturnValue(mockQuery);

      await expect(DeploymentService.getDeploymentById(deploymentId.toString())).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateDeploymentStatus', () => {
    it('✅ should update deployment status successfully', async () => {
      const deploymentId = new mongoose.Types.ObjectId();
      const mockUpdatedDeployment = {
        _id: deploymentId,
        version: '1.0.0',
        status: 'failed',
        notes: 'Deployment failed',
      };

      const secondPopulate = jest.fn().mockResolvedValue(mockUpdatedDeployment);
      const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
      const mockQuery = {
        populate: firstPopulate,
      };
      Deployment.findByIdAndUpdate.mockReturnValue(mockQuery);

      const result = await DeploymentService.updateDeploymentStatus(
        deploymentId.toString(),
        'failed',
        'Deployment failed'
      );

      expect(Deployment.findByIdAndUpdate).toHaveBeenCalledWith(
        deploymentId.toString(),
        {
          status: 'failed',
          notes: 'Deployment failed',
        },
        { new: true }
      );
      expect(firstPopulate).toHaveBeenCalledWith('deployed_by', 'username email full_name');
      expect(secondPopulate).toHaveBeenCalledWith('rollback_to', 'version deployed_at status');
      expect(result).toEqual(mockUpdatedDeployment);
    });

    it('✅ should update status without notes when notes not provided', async () => {
      const deploymentId = new mongoose.Types.ObjectId();
      const mockUpdatedDeployment = {
        _id: deploymentId,
        status: 'success',
      };

      const secondPopulate = jest.fn().mockResolvedValue(mockUpdatedDeployment);
      const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
      const mockQuery = {
        populate: firstPopulate,
      };
      Deployment.findByIdAndUpdate.mockReturnValue(mockQuery);

      await DeploymentService.updateDeploymentStatus(deploymentId.toString(), 'success');

      expect(Deployment.findByIdAndUpdate).toHaveBeenCalledWith(
        deploymentId.toString(),
        {
          status: 'success',
        },
        { new: true }
      );
    });

    it('✅ should throw error when deployment not found', async () => {
      const deploymentId = new mongoose.Types.ObjectId();

      const secondPopulate = jest.fn().mockResolvedValue(null);
      const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
      const mockQuery = {
        populate: firstPopulate,
      };
      Deployment.findByIdAndUpdate.mockReturnValue(mockQuery);

      await expect(
        DeploymentService.updateDeploymentStatus(deploymentId.toString(), 'success')
      ).rejects.toThrow('Deployment không tồn tại');
    });

    it('✅ should throw error when update fails', async () => {
      const deploymentId = new mongoose.Types.ObjectId();

      const secondPopulate = jest.fn().mockRejectedValue(new Error('Database error'));
      const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
      const mockQuery = {
        populate: firstPopulate,
      };
      Deployment.findByIdAndUpdate.mockReturnValue(mockQuery);

      await expect(
        DeploymentService.updateDeploymentStatus(deploymentId.toString(), 'success')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getDeploymentStats', () => {
    it('✅ should return deployment stats for production', async () => {
      const mockLastDeployment = {
        version: '1.0.0',
        deployed_at: new Date(),
        status: 'success',
        deployed_by_username: 'testuser',
      };

      Deployment.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // success
        .mockResolvedValueOnce(1) // failed
        .mockResolvedValueOnce(1) // in_progress
        .mockResolvedValueOnce(0); // rolled_back

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockLastDeployment),
      };
      Deployment.findOne.mockReturnValue(mockQuery);

      const result = await DeploymentService.getDeploymentStats('production');

      expect(Deployment.countDocuments).toHaveBeenCalledWith({ environment: 'production' });
      expect(Deployment.countDocuments).toHaveBeenCalledWith({
        environment: 'production',
        status: 'success',
      });
      expect(Deployment.countDocuments).toHaveBeenCalledWith({
        environment: 'production',
        status: 'failed',
      });
      expect(Deployment.countDocuments).toHaveBeenCalledWith({
        environment: 'production',
        status: 'in_progress',
      });
      expect(Deployment.countDocuments).toHaveBeenCalledWith({
        environment: 'production',
        status: 'rolled_back',
      });
      expect(result).toEqual({
        total: 10,
        success: 8,
        failed: 1,
        in_progress: 1,
        rolled_back: 0,
        last_deployment: {
          version: '1.0.0',
          deployed_at: mockLastDeployment.deployed_at,
          status: 'success',
          deployed_by: 'testuser',
        },
      });
    });

    it('✅ should return stats for staging environment', async () => {
      Deployment.countDocuments
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(null),
      };
      Deployment.findOne.mockReturnValue(mockQuery);

      const result = await DeploymentService.getDeploymentStats('staging');

      expect(result).toEqual({
        total: 5,
        success: 4,
        failed: 0,
        in_progress: 1,
        rolled_back: 0,
        last_deployment: null,
      });
    });

    it('✅ should throw error when query fails', async () => {
      Deployment.countDocuments.mockRejectedValue(new Error('Database error'));

      await expect(DeploymentService.getDeploymentStats()).rejects.toThrow('Database error');
    });
  });
});

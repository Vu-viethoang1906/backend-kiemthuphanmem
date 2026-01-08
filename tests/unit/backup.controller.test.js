// 📄 tests/unit/backup.controller.test.js - Backup Controller Unit Tests

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
jest.mock('../../services/backup.service');

const backupController = require('../../controllers/backup.controller');
const backupService = require('../../services/backup.service');

describe('🔹 Backup Controller Unit Tests', () => {
  const VALID_BACKUP_NAME = 'backup-2025-01-01T00-00-00-000Z';
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock request
    mockReq = {
      user: {
        id: '507f1f77bcf86cd799439011',
        roles: ['admin'],
        email: 'test@example.com',
      },
      params: {},
      body: {},
    };

    // Setup default mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('createBackup', () => {
    const mockBackup = {
      name: VALID_BACKUP_NAME,
      path: '/backups/backup-2025-01-01T00-00-00-000Z',
      createdAt: new Date(),
      size: 1024000,
    };

    it('✅ should create backup successfully', async () => {
      backupService.createBackup.mockResolvedValue(mockBackup);

      await backupController.createBackup(mockReq, mockRes);

      expect(backupService.createBackup).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Backup được tạo thành công',
        data: mockBackup,
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('MONGO_URI chưa được định nghĩa');
      backupService.createBackup.mockRejectedValue(error);

      await backupController.createBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi tạo backup',
        error: 'MONGO_URI chưa được định nghĩa',
      });
    });

    it('❌ should handle error without message', async () => {
      const error = new Error();
      error.message = '';
      backupService.createBackup.mockRejectedValue(error);

      await backupController.createBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi tạo backup',
        error: '',
      });
    });
  });

  describe('listBackups', () => {
    const mockBackups = [
      {
        name: 'backup-2025-01-02T00-00-00-000Z',
        path: '/backups/backup-2025-01-02T00-00-00-000Z',
        createdAt: new Date('2025-01-02'),
        size: 2048000,
      },
      {
        name: 'backup-2025-01-01T00-00-00-000Z',
        path: '/backups/backup-2025-01-01T00-00-00-000Z',
        createdAt: new Date('2025-01-01'),
        size: 1024000,
      },
    ];

    it('✅ should return list of backups successfully', async () => {
      backupService.listBackups.mockResolvedValue(mockBackups);

      await backupController.listBackups(mockReq, mockRes);

      expect(backupService.listBackups).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockBackups,
        total: mockBackups.length,
      });
    });

    it('✅ should return empty array when no backups exist', async () => {
      backupService.listBackups.mockResolvedValue([]);

      await backupController.listBackups(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        total: 0,
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Lỗi đọc thư mục backup');
      backupService.listBackups.mockRejectedValue(error);

      await backupController.listBackups(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy danh sách backup',
        error: 'Lỗi đọc thư mục backup',
      });
    });

    it('❌ should handle error without message', async () => {
      const error = new Error();
      error.message = '';
      backupService.listBackups.mockRejectedValue(error);

      await backupController.listBackups(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy danh sách backup',
        error: '',
      });
    });
  });

  describe('deleteBackup', () => {
    const mockResult = {
      message: `Đã xóa backup ${VALID_BACKUP_NAME} thành công`,
    };

    it('✅ should delete backup successfully', async () => {
      backupService.deleteBackup.mockResolvedValue(mockResult);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.deleteBackup(mockReq, mockRes);

      expect(backupService.deleteBackup).toHaveBeenCalledWith(VALID_BACKUP_NAME);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
      });
    });

    it('❌ should return 500 when backup does not exist', async () => {
      const error = new Error(`Backup ${VALID_BACKUP_NAME} không tồn tại`);
      backupService.deleteBackup.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.deleteBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi xóa backup',
        error: `Backup ${VALID_BACKUP_NAME} không tồn tại`,
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Permission denied');
      backupService.deleteBackup.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.deleteBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi xóa backup',
        error: 'Permission denied',
      });
    });

    it('❌ should handle error without message', async () => {
      const error = new Error();
      error.message = '';
      backupService.deleteBackup.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.deleteBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi xóa backup',
        error: '',
      });
    });
  });

  describe('restoreBackup', () => {
    const mockResult = {
      message: `Restore backup ${VALID_BACKUP_NAME} thành công`,
    };

    it('✅ should restore backup successfully', async () => {
      backupService.restoreBackup.mockResolvedValue(mockResult);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.restoreBackup(mockReq, mockRes);

      expect(backupService.restoreBackup).toHaveBeenCalledWith(VALID_BACKUP_NAME);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
      });
    });

    it('❌ should return 500 when backup does not exist', async () => {
      const error = new Error(`Backup ${VALID_BACKUP_NAME} không tồn tại`);
      backupService.restoreBackup.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.restoreBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi restore backup',
        error: `Backup ${VALID_BACKUP_NAME} không tồn tại`,
      });
    });

    it('❌ should return 500 when MONGO_URI is not defined', async () => {
      const error = new Error('MONGO_URI is not defined in environment variables');
      backupService.restoreBackup.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.restoreBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi restore backup',
        error: 'MONGO_URI is not defined in environment variables',
      });
    });

    it('❌ should return 500 when database folder not found in backup', async () => {
      const error = new Error('Không tìm thấy dữ liệu database trong backup');
      backupService.restoreBackup.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.restoreBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi restore backup',
        error: 'Không tìm thấy dữ liệu database trong backup',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('MongoDB connection failed');
      backupService.restoreBackup.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.restoreBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi restore backup',
        error: 'MongoDB connection failed',
      });
    });

    it('❌ should handle error without message', async () => {
      const error = new Error();
      error.message = '';
      backupService.restoreBackup.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.restoreBackup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi restore backup',
        error: '',
      });
    });
  });

  describe('getBackupInfo', () => {
    const mockBackups = [
      {
        name: 'backup-2025-01-02T00-00-00-000Z',
        path: '/backups/backup-2025-01-02T00-00-00-000Z',
        createdAt: new Date('2025-01-02'),
        size: 2048000,
      },
      {
        name: VALID_BACKUP_NAME,
        path: '/backups/backup-2025-01-01T00-00-00-000Z',
        createdAt: new Date('2025-01-01'),
        size: 1024000,
      },
    ];

    it('✅ should return backup info successfully', async () => {
      backupService.listBackups.mockResolvedValue(mockBackups);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.getBackupInfo(mockReq, mockRes);

      expect(backupService.listBackups).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockBackups[1],
      });
    });

    it('❌ should return 404 when backup does not exist', async () => {
      backupService.listBackups.mockResolvedValue(mockBackups);

      mockReq.params = { backupName: 'non-existent-backup' };

      await backupController.getBackupInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Backup không tồn tại',
      });
    });

    it('❌ should return 404 when backup list is empty', async () => {
      backupService.listBackups.mockResolvedValue([]);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.getBackupInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Backup không tồn tại',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Lỗi đọc thư mục backup');
      backupService.listBackups.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.getBackupInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy thông tin backup',
        error: 'Lỗi đọc thư mục backup',
      });
    });

    it('❌ should handle error without message', async () => {
      const error = new Error();
      error.message = '';
      backupService.listBackups.mockRejectedValue(error);

      mockReq.params = { backupName: VALID_BACKUP_NAME };

      await backupController.getBackupInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lỗi khi lấy thông tin backup',
        error: '',
      });
    });

    it('✅ should find backup by exact name match', async () => {
      const backups = [
        {
          name: 'backup-2025-01-01T00-00-00-000Z',
          path: '/backups/backup-2025-01-01T00-00-00-000Z',
          createdAt: new Date('2025-01-01'),
          size: 1024000,
        },
        {
          name: 'backup-2025-01-01T00-00-00-001Z',
          path: '/backups/backup-2025-01-01T00-00-00-001Z',
          createdAt: new Date('2025-01-01'),
          size: 1024001,
        },
      ];
      backupService.listBackups.mockResolvedValue(backups);

      mockReq.params = { backupName: 'backup-2025-01-01T00-00-00-000Z' };

      await backupController.getBackupInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: backups[0],
      });
    });
  });
});

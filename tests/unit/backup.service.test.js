// 📄 tests/unit/backup.service.test.js - Backup Service Unit Tests
const path = require('path');

// Create mockExecAsync before any mocks
const mockExecAsync = jest.fn();

// Mock dependencies
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    rm: jest.fn(),
    readFile: jest.fn(),
  },
}));

jest.mock('../../config/slackNotify', () => ({
  sendSlackMessage: jest.fn(),
}));

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

const BackupService = require('../../services/backup.service');
const { sendSlackMessage } = require('../../config/slackNotify');
const fs = require('fs').promises;

describe('🔹 Backup Service Unit Tests', () => {
  const originalEnv = process.env;
  const mockBackupDir = path.join(__dirname, '..', '..', 'backups');

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecAsync.mockClear();
    mockExecAsync.mockReset();
    process.env = { ...originalEnv };
    process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';
    process.env.MAX_BACKUPS = '30';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('ensureBackupDir', () => {
    it('✅ should create backup directory if it does not exist', async () => {
      fs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      fs.mkdir.mockResolvedValueOnce();

      await BackupService.ensureBackupDir();

      expect(fs.access).toHaveBeenCalledWith(mockBackupDir);
      expect(fs.mkdir).toHaveBeenCalledWith(mockBackupDir, { recursive: true });
    });

    it('✅ should not create directory if it already exists', async () => {
      fs.access.mockResolvedValueOnce();

      await BackupService.ensureBackupDir();

      expect(fs.access).toHaveBeenCalledWith(mockBackupDir);
      expect(fs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('parseMongoURI', () => {
    it('✅ should parse mongodb+srv:// URI correctly', () => {
      const uri = 'mongodb+srv://user:pass@cluster.mongodb.net/mydb';
      const result = BackupService.parseMongoURI(uri);

      expect(result).toEqual({
        uri: uri,
        database: 'mydb',
        isSrv: true,
      });
    });

    it('✅ should parse mongodb+srv:// URI with default database', () => {
      const uri = 'mongodb+srv://user:pass@cluster.mongodb.net/';
      const result = BackupService.parseMongoURI(uri);

      expect(result.database).toBe('test');
      expect(result.isSrv).toBe(true);
    });

    it('✅ should parse mongodb:// URI correctly', () => {
      const uri = 'mongodb://localhost:27017/mydb';
      const result = BackupService.parseMongoURI(uri);

      expect(result).toEqual({
        host: 'localhost',
        port: '27017',
        database: 'mydb',
        username: null,
        password: null,
        authSource: 'admin',
        replicaSet: null,
        isSrv: false,
      });
    });

    it('✅ should parse mongodb:// URI with default port', () => {
      const uri = 'mongodb://localhost/mydb';
      const result = BackupService.parseMongoURI(uri);

      expect(result.port).toBe(27017);
    });

    it('✅ should parse mongodb:// URI with authentication', () => {
      const uri = 'mongodb://user:pass@localhost:27017/mydb';
      const result = BackupService.parseMongoURI(uri);

      expect(result.username).toBe('user');
      expect(result.password).toBe('pass');
    });

    it('✅ should parse mongodb:// URI with authSource and replicaSet', () => {
      const uri = 'mongodb://user:pass@localhost:27017/mydb?authSource=admin&replicaSet=rs0';
      const result = BackupService.parseMongoURI(uri);

      expect(result.authSource).toBe('admin');
      expect(result.replicaSet).toBe('rs0');
    });

    it('✅ should throw error for invalid URI', () => {
      const uri = 'invalid-uri';

      expect(() => {
        BackupService.parseMongoURI(uri);
      }).toThrow('Invalid MongoDB URI');
    });
  });

  describe('createBackup', () => {
    const mockTimestamp = '2024-01-01T00-00-00-000Z';
    const mockBackupName = `backup-${mockTimestamp}`;
    const mockBackupPath = path.join(mockBackupDir, mockBackupName);

    beforeEach(() => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');
      fs.access.mockResolvedValue();
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });

    afterEach(() => {
      Date.prototype.toISOString.mockRestore();
    });

    it('✅ should create backup successfully with mongodb:// URI', async () => {
      process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'writing' });

      // Mock readdir calls
      fs.readdir
        .mockResolvedValueOnce(['testdb']) // Line 110: Read backupPath
        .mockResolvedValueOnce(['collection.bson']) // Line 113: Read dbFolder
        .mockResolvedValueOnce(['file.bson']); // For getAllFiles in getBackupSize

      // Mock stat for getBackupSize
      fs.stat.mockResolvedValue({ size: 1024 });

      const result = await BackupService.createBackup();

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('size');
      expect(result.name).toBe(mockBackupName);
      expect(fs.mkdir).toHaveBeenCalledWith(mockBackupPath, { recursive: true });
      expect(mockExecAsync).toHaveBeenCalled();
      expect(sendSlackMessage).toHaveBeenCalledWith(expect.stringContaining('thành công'));
    });

    it('✅ should create backup successfully with mongodb+srv:// URI', async () => {
      process.env.MONGO_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/testdb';

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'writing' });

      fs.readdir
        .mockResolvedValueOnce(['testdb'])
        .mockResolvedValueOnce(['collection.bson'])
        .mockResolvedValueOnce(['file.bson']);

      fs.stat.mockResolvedValue({ size: 1024 });

      const result = await BackupService.createBackup();

      expect(result).toHaveProperty('name');
      expect(mockExecAsync).toHaveBeenCalled();
      const execCall = mockExecAsync.mock.calls[0][0];
      expect(execCall).toContain('--uri=');
    });

    it('✅ should throw error when MONGO_URI is not defined', async () => {
      delete process.env.MONGO_URI;

      await expect(BackupService.createBackup()).rejects.toThrow('MONGO_URI chưa được định nghĩa');
    });

    it('✅ should send Slack notification when backup is empty', async () => {
      process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'writing' });

      // Mock readdir calls in CORRECT order:
      // 1. Line 103: getBackupSize calls getAllFiles(backupPath) -> fs.readdir(backupPath)
      // 2. Line 110: fs.readdir(backupPath) - finds 'testdb' folder
      // 3. Line 113: fs.readdir(path.join(backupPath, 'testdb')) - NO .bson files
      // 4. Line 132: cleanOldBackups calls listBackups -> fs.readdir(backupDir)
      fs.readdir
        .mockResolvedValueOnce(['metadata.json']) // getAllFiles in getBackupSize: Read backupPath
        .mockResolvedValueOnce(['testdb']) // Line 110: Read backupPath - finds dbFolder
        .mockResolvedValueOnce(['metadata.json', 'some-other-file.txt']) // Line 113: Read testdb folder - NO .bson
        .mockResolvedValueOnce([]); // cleanOldBackups -> listBackups: Read backupDir (no backups)

      // Mock stat for getBackupSize
      fs.stat.mockResolvedValue({ size: 100, isDirectory: () => false });

      await BackupService.createBackup();

      expect(sendSlackMessage).toHaveBeenCalledWith(
        expect.stringContaining('đã tạo nhưng không có dữ liệu')
      );
    });

    it('✅ should send Slack notification on backup failure', async () => {
      process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';

      mockExecAsync.mockRejectedValueOnce(new Error('mongodump failed'));

      await expect(BackupService.createBackup()).rejects.toThrow('mongodump failed');

      expect(sendSlackMessage).toHaveBeenCalledWith(expect.stringContaining('Backup thất bại'));
    });

    it('✅ should handle stderr warnings correctly', async () => {
      process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'some warning message' });

      fs.readdir
        .mockResolvedValueOnce(['testdb'])
        .mockResolvedValueOnce(['collection.bson'])
        .mockResolvedValueOnce(['file.bson']);

      fs.stat.mockResolvedValue({ size: 1024 });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await BackupService.createBackup();

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Backup warning:', 'some warning message');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('listBackups', () => {
    beforeEach(() => {
      fs.access.mockResolvedValue();
    });

    it('✅ should return list of backups with metadata sorted by newest first', async () => {
      // Mock Dirent objects (fs.readdir with withFileTypes: true)
      const mockDirents = [
        {
          isDirectory: () => true,
          name: 'backup-2024-01-01T00-00-00-000Z',
        },
        {
          isDirectory: () => true,
          name: 'backup-2024-01-02T00-00-00-000Z',
        },
        {
          isDirectory: () => false,
          name: 'other-file',
        },
      ];

      fs.readdir.mockResolvedValueOnce(mockDirents);

      const mockMetadata1 = {
        name: 'backup-2024-01-01T00-00-00-000Z',
        path: path.join(mockBackupDir, 'backup-2024-01-01T00-00-00-000Z'),
        createdAt: '2024-01-01T00:00:00.000Z',
        size: 1024,
      };

      const mockMetadata2 = {
        name: 'backup-2024-01-02T00-00-00-000Z',
        path: path.join(mockBackupDir, 'backup-2024-01-02T00-00-00-000Z'),
        createdAt: '2024-01-02T00:00:00.000Z',
        size: 2048,
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockMetadata1))
        .mockResolvedValueOnce(JSON.stringify(mockMetadata2));

      // Mock readdir and stat for getBackupSize
      fs.readdir.mockResolvedValueOnce(['file1.bson']).mockResolvedValueOnce(['file2.bson']);

      fs.stat
        .mockResolvedValueOnce({ size: 1024, isDirectory: () => false })
        .mockResolvedValueOnce({ size: 2048, isDirectory: () => false });

      const result = await BackupService.listBackups();

      expect(result).toHaveLength(2);
      // Sorted by newest first
      expect(result[0].name).toBe('backup-2024-01-02T00-00-00-000Z');
      expect(result[1].name).toBe('backup-2024-01-01T00-00-00-000Z');
    });

    it('✅ should return backups without metadata using directory stats', async () => {
      const mockDirents = [
        {
          isDirectory: () => true,
          name: 'backup-2024-01-01T00-00-00-000Z',
        },
      ];

      fs.readdir.mockResolvedValueOnce(mockDirents);
      fs.readFile.mockRejectedValueOnce(new Error('No metadata file'));

      const mockBirthtime = new Date('2024-01-01T00:00:00.000Z');
      fs.stat
        .mockResolvedValueOnce({ birthtime: mockBirthtime })
        .mockResolvedValueOnce({ size: 1024, isDirectory: () => false });

      fs.readdir.mockResolvedValueOnce(['file1.bson']);

      const result = await BackupService.listBackups();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('backup-2024-01-01T00-00-00-000Z');
      expect(result[0].createdAt).toEqual(mockBirthtime);
    });

    it('✅ should filter out non-backup directories', async () => {
      const mockDirents = [
        {
          isDirectory: () => true,
          name: 'backup-2024-01-01T00-00-00-000Z',
        },
        {
          isDirectory: () => true,
          name: 'other-folder',
        },
        {
          isDirectory: () => false,
          name: 'file.txt',
        },
      ];

      fs.readdir.mockResolvedValueOnce(mockDirents);
      fs.readFile.mockResolvedValueOnce(
        JSON.stringify({
          name: 'backup-2024-01-01T00-00-00-000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
        })
      );

      fs.readdir.mockResolvedValueOnce(['file1.bson']);
      fs.stat.mockResolvedValue({ size: 1024, isDirectory: () => false });

      const result = await BackupService.listBackups();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('backup-2024-01-01T00-00-00-000Z');
    });

    it('✅ should throw error when listing backups fails', async () => {
      fs.readdir.mockRejectedValueOnce(new Error('Access denied'));

      await expect(BackupService.listBackups()).rejects.toThrow('Access denied');
    });
  });

  describe('deleteBackup', () => {
    it('✅ should delete backup successfully', async () => {
      const backupName = 'backup-2024-01-01T00-00-00-000Z';
      const backupPath = path.join(mockBackupDir, backupName);

      fs.access.mockResolvedValue();
      fs.rm.mockResolvedValue();

      const result = await BackupService.deleteBackup(backupName);

      expect(fs.access).toHaveBeenCalledWith(backupPath);
      expect(fs.rm).toHaveBeenCalledWith(backupPath, { recursive: true, force: true });
      expect(result.message).toContain('Đã xóa backup');
      expect(result.message).toContain(backupName);
    });

    it('✅ should throw error when backup does not exist', async () => {
      const backupName = 'backup-nonexistent';

      fs.access.mockRejectedValue(new Error('File not found'));

      await expect(BackupService.deleteBackup(backupName)).rejects.toThrow(
        'Backup backup-nonexistent không tồn tại'
      );
    });
  });

  describe('restoreBackup', () => {
    beforeEach(() => {
      process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';
    });

    it('✅ should restore backup successfully with mongodb:// URI', async () => {
      const backupName = 'backup-2024-01-01T00-00-00-000Z';
      const backupPath = path.join(mockBackupDir, backupName);
      const dbBackupPath = path.join(backupPath, 'testdb');

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'restoring' });

      fs.access.mockResolvedValueOnce().mockResolvedValueOnce();

      const result = await BackupService.restoreBackup(backupName);

      expect(fs.access).toHaveBeenCalledWith(backupPath);
      expect(fs.access).toHaveBeenCalledWith(dbBackupPath);
      expect(mockExecAsync).toHaveBeenCalled();
      expect(result.message).toContain('Restore backup');
      expect(result.message).toContain(backupName);
    });

    it('✅ should restore backup successfully with mongodb+srv:// URI', async () => {
      process.env.MONGO_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/testdb';
      const backupName = 'backup-2024-01-01T00-00-00-000Z';

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'restoring' });

      fs.access.mockResolvedValueOnce().mockResolvedValueOnce();

      const result = await BackupService.restoreBackup(backupName);

      expect(mockExecAsync).toHaveBeenCalled();
      const execCall = mockExecAsync.mock.calls[0][0];
      expect(execCall).toContain('--uri=');
      expect(result.message).toContain('Restore backup');
    });

    it('✅ should throw error when backup does not exist', async () => {
      const backupName = 'backup-nonexistent';

      fs.access.mockRejectedValueOnce(new Error('File not found'));

      await expect(BackupService.restoreBackup(backupName)).rejects.toThrow(
        'Backup backup-nonexistent không tồn tại'
      );
    });

    it('✅ should throw error when MONGO_URI is not defined', async () => {
      delete process.env.MONGO_URI;
      const backupName = 'backup-2024-01-01T00-00-00-000Z';

      fs.access.mockResolvedValueOnce();

      await expect(BackupService.restoreBackup(backupName)).rejects.toThrow(
        'MONGO_URI is not defined'
      );
    });

    it('✅ should throw error when database folder does not exist in backup', async () => {
      const backupName = 'backup-2024-01-01T00-00-00-000Z';

      fs.access
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Database folder not found'));

      await expect(BackupService.restoreBackup(backupName)).rejects.toThrow(
        'Không tìm thấy dữ liệu database trong backup'
      );
    });

    it('✅ should handle stderr warnings correctly', async () => {
      const backupName = 'backup-2024-01-01T00-00-00-000Z';

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'some warning' });

      fs.access.mockResolvedValueOnce().mockResolvedValueOnce();

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await BackupService.restoreBackup(backupName);

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Restore warning:', 'some warning');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getBackupSize', () => {
    it('✅ should calculate backup size correctly', async () => {
      const backupPath = path.join(mockBackupDir, 'backup-test');

      // getAllFiles recursively calls:
      // 1. readdir(backupPath) -> ['file1.bson', 'file2.bson']
      // 2. stat(file1.bson) -> not directory, add to files
      // 3. stat(file2.bson) -> not directory, add to files
      // Then getBackupSize calls:
      // 4. stat(file1.bson) again to get size -> 1024
      // 5. stat(file2.bson) again to get size -> 2048
      fs.readdir.mockResolvedValueOnce(['file1.bson', 'file2.bson']);
      fs.stat
        .mockResolvedValueOnce({ size: 1024, isDirectory: () => false }) // Check if file1 is directory
        .mockResolvedValueOnce({ size: 2048, isDirectory: () => false }) // Check if file2 is directory
        .mockResolvedValueOnce({ size: 1024, isDirectory: () => false }) // Get size of file1
        .mockResolvedValueOnce({ size: 2048, isDirectory: () => false }); // Get size of file2

      const size = await BackupService.getBackupSize(backupPath);

      expect(size).toBe(3072);
    });

    it('✅ should return 0 on error', async () => {
      const backupPath = path.join(mockBackupDir, 'backup-test');

      fs.readdir.mockRejectedValueOnce(new Error('Error'));

      const size = await BackupService.getBackupSize(backupPath);

      expect(size).toBe(0);
    });

    it('✅ should return 0 when directory is empty', async () => {
      const backupPath = path.join(mockBackupDir, 'backup-test');

      fs.readdir.mockResolvedValueOnce([]);

      const size = await BackupService.getBackupSize(backupPath);

      expect(size).toBe(0);
    });
  });

  describe('getAllFiles', () => {
    it('✅ should get all files recursively', async () => {
      const dirPath = path.join(mockBackupDir, 'backup-test');
      const subDirPath = path.join(dirPath, 'subdir');
      const file1 = path.join(dirPath, 'file1.bson');
      const file2 = path.join(subDirPath, 'file2.bson');

      fs.readdir
        .mockResolvedValueOnce(['file1.bson', 'subdir'])
        .mockResolvedValueOnce(['file2.bson']);

      fs.stat
        .mockResolvedValueOnce({ isDirectory: () => false })
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => false });

      const files = await BackupService.getAllFiles(dirPath);

      expect(files).toContain(file1);
      expect(files).toContain(file2);
      expect(files.length).toBe(2);
    });

    it('✅ should handle empty directory', async () => {
      const dirPath = path.join(mockBackupDir, 'backup-empty');

      fs.readdir.mockResolvedValueOnce([]);

      const files = await BackupService.getAllFiles(dirPath);

      expect(files).toEqual([]);
      expect(fs.readdir).toHaveBeenCalledWith(dirPath);
    });

    it('✅ should handle nested directories', async () => {
      const dirPath = path.join(mockBackupDir, 'backup-test');
      const subDir1 = path.join(dirPath, 'subdir1');
      const subDir2 = path.join(subDir1, 'subdir2');
      const file1 = path.join(dirPath, 'file1.bson');
      const file2 = path.join(subDir1, 'file2.bson');
      const file3 = path.join(subDir2, 'file3.bson');

      fs.readdir
        .mockResolvedValueOnce(['file1.bson', 'subdir1'])
        .mockResolvedValueOnce(['file2.bson', 'subdir2'])
        .mockResolvedValueOnce(['file3.bson']);

      fs.stat
        .mockResolvedValueOnce({ isDirectory: () => false })
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => false })
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => false });

      const files = await BackupService.getAllFiles(dirPath);

      expect(files).toContain(file1);
      expect(files).toContain(file2);
      expect(files).toContain(file3);
      expect(files.length).toBe(3);
    });
  });

  describe('formatBytes', () => {
    it('✅ should format 0 bytes correctly', () => {
      expect(BackupService.formatBytes(0)).toBe('0 Bytes');
    });

    it('✅ should format bytes correctly', () => {
      expect(BackupService.formatBytes(512)).toBe('512 Bytes');
    });

    it('✅ should format KB correctly', () => {
      expect(BackupService.formatBytes(1024)).toBe('1 KB');
      expect(BackupService.formatBytes(1536)).toBe('1.5 KB');
      expect(BackupService.formatBytes(2048)).toBe('2 KB');
    });

    it('✅ should format MB correctly', () => {
      expect(BackupService.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(BackupService.formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    it('✅ should format GB correctly', () => {
      expect(BackupService.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(BackupService.formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });

    it('✅ should round correctly', () => {
      expect(BackupService.formatBytes(1024 + 512)).toBe('1.5 KB');
    });
  });

  describe('cleanOldBackups', () => {
    it('✅ should delete old backups when exceeding maxBackups', async () => {
      const originalMaxBackups = BackupService.maxBackups;
      BackupService.maxBackups = 2;

      const mockDirents = [
        { isDirectory: () => true, name: 'backup-1' },
        { isDirectory: () => true, name: 'backup-2' },
        { isDirectory: () => true, name: 'backup-3' },
        { isDirectory: () => true, name: 'backup-4' },
      ];

      const mockBackups = [
        { name: 'backup-1', createdAt: new Date('2024-01-04') },
        { name: 'backup-2', createdAt: new Date('2024-01-03') },
        { name: 'backup-3', createdAt: new Date('2024-01-02') },
        { name: 'backup-4', createdAt: new Date('2024-01-01') },
      ];

      // Mock for listBackups
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValueOnce(mockDirents); // Read backup directory

      // Mock for each backup's metadata and size
      for (let i = 0; i < 4; i++) {
        fs.readFile.mockResolvedValueOnce(JSON.stringify(mockBackups[i]));
        // Mock for getBackupSize of each backup
        fs.readdir.mockResolvedValueOnce(['file.bson']); // getAllFiles
        fs.stat
          .mockResolvedValueOnce({ size: 1024, isDirectory: () => false }) // Check isDirectory
          .mockResolvedValueOnce({ size: 1024, isDirectory: () => false }); // Get size
      }

      // Mock deleteBackup calls for backup-3 and backup-4
      // Each deleteBackup calls: fs.access (check exists), fs.rm (delete)
      fs.access
        .mockResolvedValueOnce() // backup-3 exists
        .mockResolvedValueOnce(); // backup-4 exists

      fs.rm
        .mockResolvedValueOnce() // delete backup-3
        .mockResolvedValueOnce(); // delete backup-4

      await BackupService.cleanOldBackups();

      expect(fs.rm).toHaveBeenCalledTimes(2);

      BackupService.maxBackups = originalMaxBackups;
    });

    it('✅ should not delete backups when within limit', async () => {
      const originalMaxBackups = BackupService.maxBackups;
      BackupService.maxBackups = 5;

      const mockDirents = [
        { isDirectory: () => true, name: 'backup-1' },
        { isDirectory: () => true, name: 'backup-2' },
      ];

      const mockBackups = [
        { name: 'backup-1', createdAt: new Date('2024-01-02') },
        { name: 'backup-2', createdAt: new Date('2024-01-01') },
      ];

      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValueOnce(mockDirents);

      for (let i = 0; i < 2; i++) {
        fs.readFile.mockResolvedValueOnce(JSON.stringify(mockBackups[i]));
        fs.readdir.mockResolvedValueOnce(['file.bson']);
        fs.stat.mockResolvedValueOnce({ size: 1024, isDirectory: () => false });
      }

      await BackupService.cleanOldBackups();

      expect(fs.rm).not.toHaveBeenCalled();

      BackupService.maxBackups = originalMaxBackups;
    });

    it('✅ should handle errors silently', async () => {
      fs.access.mockResolvedValue();
      fs.readdir.mockRejectedValueOnce(new Error('Error'));

      await expect(BackupService.cleanOldBackups()).resolves.not.toThrow();
    });

    it('✅ should not delete when backups count equals maxBackups', async () => {
      const originalMaxBackups = BackupService.maxBackups;
      BackupService.maxBackups = 2;

      const mockDirents = [
        { isDirectory: () => true, name: 'backup-1' },
        { isDirectory: () => true, name: 'backup-2' },
      ];

      const mockBackups = [
        { name: 'backup-1', createdAt: new Date('2024-01-02') },
        { name: 'backup-2', createdAt: new Date('2024-01-01') },
      ];

      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValueOnce(mockDirents);

      for (let i = 0; i < 2; i++) {
        fs.readFile.mockResolvedValueOnce(JSON.stringify(mockBackups[i]));
        fs.readdir.mockResolvedValueOnce(['file.bson']);
        fs.stat.mockResolvedValueOnce({ size: 1024, isDirectory: () => false });
      }

      await BackupService.cleanOldBackups();

      expect(fs.rm).not.toHaveBeenCalled();

      BackupService.maxBackups = originalMaxBackups;
    });
  });
});

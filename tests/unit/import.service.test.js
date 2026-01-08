// 📄 tests/unit/import.service.test.js - Import Service Unit Tests
jest.mock('../../repositories/task.repository');
jest.mock('../../repositories/board.repository');
jest.mock('../../repositories/column.repository');
jest.mock('fs');
jest.mock('csv-parser');
jest.mock('xlsx');

const importService = require('../../services/import.service');
const taskRepo = require('../../repositories/task.repository');
const boardRepo = require('../../repositories/board.repository');
const columnRepo = require('../../repositories/column.repository');
const fs = require('fs');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

// Mock mongoose.Types.ObjectId.isValid
const actualMongoose = jest.requireActual('mongoose');
mongoose.Types = actualMongoose.Types;
mongoose.Types.ObjectId.isValid = jest.fn(id => id && typeof id === 'string' && id.length === 24);

const VALID_BOARD_ID = '507f1f77bcf86cd799439011';
const VALID_COLUMN_ID = '507f1f77bcf86cd799439012';
const VALID_USER_ID = '507f1f77bcf86cd799439013';

describe('🔹 Import Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importTasksFromFile', () => {
    it('✅ should import tasks from CSV file successfully', async () => {
      const mockBoard = { _id: VALID_BOARD_ID };
      const mockColumn = {
        _id: VALID_COLUMN_ID,
        board_id: VALID_BOARD_ID,
      };
      const mockTask = {
        _id: 'task-id',
        title: 'Test Task',
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
      };
      const filePath = '/tmp/test.csv';
      const mockTasksData = [
        {
          title: 'Test Task',
          description: 'Test description',
          priority: 'high',
        },
      ];

      boardRepo.findById.mockResolvedValue(mockBoard);
      columnRepo.findById.mockResolvedValue(mockColumn);
      fs.existsSync.mockReturnValue(true);
      taskRepo.create.mockResolvedValue(mockTask);
      fs.unlinkSync.mockImplementation(() => {});

      // Mock CSV parser
      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            mockTasksData.forEach(data => callback(data));
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      };
      fs.createReadStream.mockReturnValue(mockStream);

      const result = await importService.importTasksFromFile(filePath, {
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
        user_id: VALID_USER_ID,
      });

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.tasks.length).toBe(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(filePath);
    });

    it('✅ should import tasks from Excel file successfully', async () => {
      const mockBoard = { _id: VALID_BOARD_ID };
      const mockColumn = {
        _id: VALID_COLUMN_ID,
        board_id: VALID_BOARD_ID,
      };
      const mockTask = {
        _id: 'task-id',
        title: 'Test Task',
      };
      const filePath = '/tmp/test.xlsx';
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };
      const mockTasksData = [
        {
          title: 'Test Task',
          description: 'Test description',
        },
      ];

      boardRepo.findById.mockResolvedValue(mockBoard);
      columnRepo.findById.mockResolvedValue(mockColumn);
      xlsx.readFile.mockReturnValue(mockWorkbook);
      xlsx.utils.sheet_to_json.mockReturnValue(mockTasksData);
      taskRepo.create.mockResolvedValue(mockTask);
      fs.unlinkSync.mockImplementation(() => {});

      const result = await importService.importTasksFromFile(filePath, {
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
        user_id: VALID_USER_ID,
      });

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(fs.unlinkSync).toHaveBeenCalledWith(filePath);
    });

    it('❌ should throw error when board_id is invalid', async () => {
      await expect(
        importService.importTasksFromFile('/tmp/test.csv', {
          board_id: 'invalid',
          column_id: VALID_COLUMN_ID,
          user_id: VALID_USER_ID,
        })
      ).rejects.toThrow('board_id không hợp lệ');
    });

    it('❌ should throw error when column_id is invalid', async () => {
      await expect(
        importService.importTasksFromFile('/tmp/test.csv', {
          board_id: VALID_BOARD_ID,
          column_id: 'invalid',
          user_id: VALID_USER_ID,
        })
      ).rejects.toThrow('column_id không hợp lệ');
    });

    it('❌ should throw error when board not found', async () => {
      boardRepo.findById.mockResolvedValue(null);

      await expect(
        importService.importTasksFromFile('/tmp/test.csv', {
          board_id: VALID_BOARD_ID,
          column_id: VALID_COLUMN_ID,
          user_id: VALID_USER_ID,
        })
      ).rejects.toThrow('Board không tồn tại');
    });

    it('❌ should throw error when column not found', async () => {
      const mockBoard = { _id: VALID_BOARD_ID };
      boardRepo.findById.mockResolvedValue(mockBoard);
      columnRepo.findById.mockResolvedValue(null);

      await expect(
        importService.importTasksFromFile('/tmp/test.csv', {
          board_id: VALID_BOARD_ID,
          column_id: VALID_COLUMN_ID,
          user_id: VALID_USER_ID,
        })
      ).rejects.toThrow('Column không tồn tại');
    });

    it('❌ should throw error when column belongs to different board', async () => {
      const mockBoard = { _id: VALID_BOARD_ID };
      const mockColumn = {
        _id: VALID_COLUMN_ID,
        board_id: 'different-board-id',
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      columnRepo.findById.mockResolvedValue(mockColumn);

      await expect(
        importService.importTasksFromFile('/tmp/test.csv', {
          board_id: VALID_BOARD_ID,
          column_id: VALID_COLUMN_ID,
          user_id: VALID_USER_ID,
        })
      ).rejects.toThrow('Column không tồn tại hoặc không thuộc board này');
    });

    it('❌ should throw error when file format is not supported', async () => {
      const mockBoard = { _id: VALID_BOARD_ID };
      const mockColumn = {
        _id: VALID_COLUMN_ID,
        board_id: VALID_BOARD_ID,
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      columnRepo.findById.mockResolvedValue(mockColumn);

      await expect(
        importService.importTasksFromFile('/tmp/test.txt', {
          board_id: VALID_BOARD_ID,
          column_id: VALID_COLUMN_ID,
          user_id: VALID_USER_ID,
        })
      ).rejects.toThrow('Định dạng file không được hỗ trợ');
    });
  });

  describe('parseCSVFile', () => {
    it('✅ should parse CSV file successfully', async () => {
      const filePath = '/tmp/test.csv';
      const mockData = [
        { title: 'Task 1', description: 'Desc 1' },
        { title: 'Task 2', description: 'Desc 2' },
      ];

      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            mockData.forEach(data => callback(data));
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      };
      fs.createReadStream.mockReturnValue(mockStream);

      const result = await importService.parseCSVFile(filePath);

      expect(result).toEqual(mockData);
      expect(fs.createReadStream).toHaveBeenCalledWith(filePath);
    });

    it('❌ should throw error when file is too large', async () => {
      const filePath = '/tmp/test.csv';
      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate more than 10000 rows
            for (let i = 0; i < 10001; i++) {
              callback({ title: `Task ${i}` });
            }
          }
          return mockStream;
        }),
      };
      fs.createReadStream.mockReturnValue(mockStream);

      await expect(importService.parseCSVFile(filePath)).rejects.toThrow(
        'File quá lớn. Tối đa 10000 dòng.'
      );
    });

    it('❌ should handle parse errors', async () => {
      const filePath = '/tmp/test.csv';
      const mockError = new Error('Parse error');
      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(mockError);
          }
          return mockStream;
        }),
      };
      fs.createReadStream.mockReturnValue(mockStream);

      await expect(importService.parseCSVFile(filePath)).rejects.toThrow('Parse error');
    });
  });

  describe('parseExcelFile', () => {
    it('✅ should parse Excel file successfully', async () => {
      const filePath = '/tmp/test.xlsx';
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };
      const mockData = [
        { title: 'Task 1', description: 'Desc 1' },
        { title: 'Task 2', description: 'Desc 2' },
      ];

      xlsx.readFile.mockReturnValue(mockWorkbook);
      xlsx.utils.sheet_to_json.mockReturnValue(mockData);

      const result = await importService.parseExcelFile(filePath);

      expect(result).toEqual(mockData);
      expect(xlsx.readFile).toHaveBeenCalledWith(filePath);
    });

    it('❌ should throw error when file is too large', async () => {
      const filePath = '/tmp/test.xlsx';
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };
      const mockData = Array(10001).fill({ title: 'Task' });

      xlsx.readFile.mockReturnValue(mockWorkbook);
      xlsx.utils.sheet_to_json.mockReturnValue(mockData);

      await expect(importService.parseExcelFile(filePath)).rejects.toThrow(
        'File quá lớn. Tối đa 10000 dòng.'
      );
    });

    it('❌ should handle read errors', async () => {
      const filePath = '/tmp/test.xlsx';
      const mockError = new Error('Read error');

      xlsx.readFile.mockImplementation(() => {
        throw mockError;
      });

      await expect(importService.parseExcelFile(filePath)).rejects.toThrow(
        'Không thể đọc file Excel: Read error'
      );
    });
  });

  describe('createTasksFromData', () => {
    it('✅ should create tasks successfully', async () => {
      const mockTask1 = {
        _id: 'task1',
        title: 'Task 1',
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
      };
      const mockTask2 = {
        _id: 'task2',
        title: 'Task 2',
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
      };
      const tasksData = [
        { title: 'Task 1', description: 'Desc 1' },
        { title: 'Task 2', description: 'Desc 2' },
      ];

      taskRepo.create.mockResolvedValueOnce(mockTask1).mockResolvedValueOnce(mockTask2);

      const result = await importService.createTasksFromData(tasksData, {
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
        user_id: VALID_USER_ID,
      });

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.tasks.length).toBe(2);
    });

    it('✅ should resolve board_name/column_name for rows and avoid duplicate board creation', async () => {
      const rows = [
        { title: 'Task A', board_name: 'Same Board', column_name: 'To Do' },
        { title: 'Task B', board_name: 'Same Board', column_name: 'In Progress' },
      ];

      // Ensure findByTitleAndUser returns null so create is used; caching should prevent duplicate creates
      boardRepo.findByTitleAndUser.mockResolvedValue(null);
      const NEW_BOARD_ID = '507f1f77bcf86cd799439099';
      boardRepo.create.mockImplementation(async data => ({ _id: NEW_BOARD_ID, ...data }));

      columnRepo.create.mockImplementation(async data => ({ _id: `col-${data.name}`, ...data }));

      // Prevent mongoose from trying to hit real DB during findOne
      const ColumnModel = require('../../models/column.model');
      ColumnModel.findOne = jest.fn().mockResolvedValue(null);

      // Run resolver
      await importService._resolveBoardsAndColumnsForRows(rows, {
        board_id: null,
        column_id: null,
        user_id: VALID_USER_ID,
      });

      // Should create a single board and two columns
      expect(boardRepo.create).toHaveBeenCalledTimes(1);
      expect(columnRepo.create).toHaveBeenCalledTimes(2);

      // Both rows should point to same board id
      expect(rows[0]._board_id).toBe(rows[1]._board_id);
      expect(rows[0]._board_id).toBe(NEW_BOARD_ID);

      // Now test with subtle differences (NBSP / zero-width) — should still map to same board
      const rows2 = [
        { title: 'Task 1', BoardName: 'Cai nghiện 8', ColumnName: 'backlog' },
        { title: 'Task 2', BoardName: 'Cai nghiện 8\u00A0', ColumnName: 'to do' }, // NBSP at end
        { title: 'Task 3', BoardName: 'Cai nghiện\u200B 8', ColumnName: 'done' }, // zero-width inside
      ];

      boardRepo.findByTitleAndUser.mockResolvedValue(null);
      boardRepo.create.mockImplementation(async data => ({ _id: 'board-cai', ...data }));
      ColumnModel.findOne.mockResolvedValue(null);
      columnRepo.create.mockImplementation(async data => ({ _id: `col-${data.name}`, ...data }));

      await importService._resolveBoardsAndColumnsForRows(rows2, {
        board_id: null,
        column_id: null,
        user_id: VALID_USER_ID,
      });

      expect(rows2[0]._board_id).toBe(rows2[1]._board_id);
      expect(rows2[0]._board_id).toBe(rows2[2]._board_id);
      expect(rows2[0]._board_id).toBe('board-cai');
    });

    it('✅ should restore a soft-deleted board and column when importing same name', async () => {
      const rows = [{ title: 'Task X', board_name: 'Soft Board', column_name: 'Backlog' }];

      const SOFT_BOARD = {
        _id: '507f1f77bcf86cd7994390ff',
        title: 'Soft Board',
        deleted_at: new Date(),
      };
      boardRepo.findByTitleAndUser.mockResolvedValue(SOFT_BOARD);
      boardRepo.updateById = jest
        .fn()
        .mockImplementation(async (id, data) => ({ ...SOFT_BOARD, deleted_at: null }));

      // ColumnModel.findOne should return a soft-deleted column
      const ColumnModel = require('../../models/column.model');
      ColumnModel.findOne = jest.fn().mockResolvedValue({
        _id: 'col-soft',
        name: 'Backlog',
        board_id: SOFT_BOARD._id,
        deleted_at: new Date(),
      });
      columnRepo.update = jest.fn().mockResolvedValue({
        _id: 'col-soft',
        name: 'Backlog',
        board_id: SOFT_BOARD._id,
        deleted_at: null,
      });

      await importService._resolveBoardsAndColumnsForRows(rows, {
        board_id: null,
        column_id: null,
        user_id: VALID_USER_ID,
      });

      // Should restore board and column (update called)
      expect(boardRepo.updateById).toHaveBeenCalledWith(SOFT_BOARD._id, { deleted_at: null });
      expect(columnRepo.update).toHaveBeenCalledWith('col-soft', { deleted_at: null });

      // Row should reference restored ids
      expect(rows[0]._board_id).toBe(SOFT_BOARD._id);
      expect(rows[0]._column_id).toBe('col-soft');
    });

    it('✅ should attach importing user as member when board exists but user not a member', async () => {
      const rows = [{ title: 'Task Y', board_name: 'Existing Board', column_name: 'Backlog' }];

      // No membership-aware hit
      boardRepo.findByTitleAndUser.mockResolvedValue(null);

      // But a board exists with this title
      const EXISTING = {
        _id: '507f1f77bcf86cd7994390ee',
        title: 'Existing Board',
        deleted_at: null,
      };
      boardRepo.findOne = jest.fn().mockResolvedValue(EXISTING);

      // Ensure member is missing
      const boardMemberRepo = require('../../repositories/boardMember.repository');
      boardMemberRepo.findMember = jest.fn().mockResolvedValue(null);
      boardMemberRepo.addMember = jest
        .fn()
        .mockResolvedValue({ user_id: VALID_USER_ID, board_id: EXISTING._id });

      // Column handling
      const ColumnModel = require('../../models/column.model');
      ColumnModel.findOne = jest.fn().mockResolvedValue(null);
      columnRepo.create = jest
        .fn()
        .mockResolvedValue({ _id: 'col-new', name: 'Backlog', board_id: EXISTING._id });

      await importService._resolveBoardsAndColumnsForRows(rows, {
        board_id: null,
        column_id: null,
        user_id: VALID_USER_ID,
      });

      expect(boardRepo.findOne).toHaveBeenCalled();
      const findOneArg = boardRepo.findOne.mock.calls[0][0];
      expect(findOneArg.title).toBeInstanceOf(RegExp);
      expect(findOneArg.title.test('Existing Board')).toBe(true);

      expect(boardMemberRepo.findMember).toHaveBeenCalledWith(VALID_USER_ID, EXISTING._id);
      expect(boardMemberRepo.addMember).toHaveBeenCalledWith({
        user_id: VALID_USER_ID,
        board_id: EXISTING._id,
        role_in_board: 'Thành viên',
        Creator: false,
      });

      expect(rows[0]._board_id).toBe(EXISTING._id);
      expect(rows[0]._column_id).toBe('col-new');
    });

    it('✅ should handle errors for invalid rows', async () => {
      const mockTask = {
        _id: 'task1',
        title: 'Task 1',
      };
      const tasksData = [
        { title: 'Task 1', description: 'Desc 1' },
        { description: 'Task 2 without title' }, // Missing title
      ];

      taskRepo.create.mockResolvedValueOnce(mockTask);

      const result = await importService.createTasksFromData(tasksData, {
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
        user_id: VALID_USER_ID,
      });

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toContain('title');
    });
  });

  describe('validateAndMapTaskData', () => {
    it('✅ should validate and map task data successfully', () => {
      const row = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'high',
        start_date: '2024-01-01',
        due_date: '2024-01-15',
        estimate_hours: '8',
        assigned_to: 'user@example.com',
      };

      const result = importService.validateAndMapTaskData(row, {
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
        user_id: VALID_USER_ID,
      });

      expect(result.title).toBe('Test Task');
      expect(result.description).toBe('Test description');
      expect(result.priority).toBe('high');
      expect(result.board_id).toBe(VALID_BOARD_ID);
      expect(result.column_id).toBe(VALID_COLUMN_ID);
      expect(result.created_by).toBe(VALID_USER_ID);
      expect(result.start_date).toBeInstanceOf(Date);
      expect(result.due_date).toBeInstanceOf(Date);
      expect(result.estimate_hours).toBe(8);
    });

    it('✅ should use default values when fields are missing', () => {
      const row = {
        title: 'Test Task',
      };

      const result = importService.validateAndMapTaskData(row, {
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
        user_id: VALID_USER_ID,
      });

      expect(result.title).toBe('Test Task');
      expect(result.description).toBe('');
      expect(result.priority).toBe('medium');
      expect(result.assigned_to).toBeNull();
    });

    it('❌ should throw error when title is missing', () => {
      const row = {
        description: 'Test description',
      };

      expect(() => {
        importService.validateAndMapTaskData(row, {
          board_id: VALID_BOARD_ID,
          column_id: VALID_COLUMN_ID,
          user_id: VALID_USER_ID,
        });
      }).toThrow('Trường title là bắt buộc');
    });

    it('❌ should throw error when title is empty', () => {
      const row = {
        title: '   ',
      };

      expect(() => {
        importService.validateAndMapTaskData(row, {
          board_id: VALID_BOARD_ID,
          column_id: VALID_COLUMN_ID,
          user_id: VALID_USER_ID,
        });
      }).toThrow('Trường title là bắt buộc');
    });

    it('✅ should handle invalid dates gracefully', () => {
      const row = {
        title: 'Test Task',
        start_date: 'invalid-date',
        due_date: 'invalid-date',
      };

      const result = importService.validateAndMapTaskData(row, {
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
        user_id: VALID_USER_ID,
      });

      expect(result.title).toBe('Test Task');
      expect(result.start_date).toBeUndefined();
      expect(result.due_date).toBeUndefined();
    });

    it('✅ should handle invalid estimate_hours gracefully', () => {
      const row = {
        title: 'Test Task',
        estimate_hours: 'invalid',
      };

      const result = importService.validateAndMapTaskData(row, {
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
        user_id: VALID_USER_ID,
      });

      expect(result.title).toBe('Test Task');
      expect(result.estimate_hours).toBeUndefined();
    });

    it('✅ should reject negative estimate_hours', () => {
      const row = {
        title: 'Test Task',
        estimate_hours: '-5',
      };

      const result = importService.validateAndMapTaskData(row, {
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
        user_id: VALID_USER_ID,
      });

      expect(result.estimate_hours).toBeUndefined();
    });
  });

  describe('generateTemplateFile', () => {
    it('✅ should generate template file successfully', async () => {
      const templatePath = '/path/to/template.csv';
      const mockCsvContent = 'title,description,priority\nTask 1,Desc 1,high';

      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});

      // Mock convertToCSV
      jest.spyOn(importService, 'convertToCSV').mockReturnValue(mockCsvContent);

      const result = await importService.generateTemplateFile();

      expect(result).toContain('template.csv');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("✅ should create directory if it doesn't exist", async () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});

      jest.spyOn(importService, 'convertToCSV').mockReturnValue('csv content');

      await importService.generateTemplateFile();

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  describe('convertToCSV', () => {
    beforeEach(() => {
      // Restore original implementation
      jest.restoreAllMocks();
    });

    it('✅ should convert data to CSV successfully', () => {
      const data = [
        { title: 'Task 1', description: 'Desc 1', priority: 'high' },
        { title: 'Task 2', description: 'Desc 2', priority: 'medium' },
      ];

      const result = importService.convertToCSV(data);

      expect(result).toContain('title,description,priority');
      expect(result).toContain('Task 1');
      expect(result).toContain('Task 2');
    });

    it('✅ should return empty string for empty data', () => {
      const result = importService.convertToCSV([]);
      expect(result).toBe('');
    });

    it('✅ should handle special characters in CSV', () => {
      const data = [{ title: 'Task with "quotes"', description: 'Desc, with comma' }];

      const result = importService.convertToCSV(data);

      expect(result).toContain('"Task with ""quotes"""');
      expect(result).toContain('"Desc, with comma"');
    });
  });

  describe('getImportHistory', () => {
    it('✅ should get import history successfully', async () => {
      const mockTasks = [
        {
          _id: 'task1',
          created_at: new Date('2024-01-01'),
          title: 'Task 1',
        },
        {
          _id: 'task2',
          created_at: new Date('2024-01-01'),
          title: 'Task 2',
        },
        {
          _id: 'task3',
          created_at: new Date('2024-01-02'),
          title: 'Task 3',
        },
      ];

      // Mock method if it doesn't exist
      if (!taskRepo.findByUserAndDateRange) {
        taskRepo.findByUserAndDateRange = jest.fn();
      }
      taskRepo.findByUserAndDateRange.mockResolvedValue(mockTasks);

      const result = await importService.getImportHistory(VALID_USER_ID);

      expect(result).toHaveProperty('2024-01-01');
      expect(result).toHaveProperty('2024-01-02');
      expect(result['2024-01-01'].length).toBe(2);
      expect(result['2024-01-02'].length).toBe(1);
      expect(taskRepo.findByUserAndDateRange).toHaveBeenCalled();
    });

    it('✅ should return empty object when no tasks found', async () => {
      if (!taskRepo.findByUserAndDateRange) {
        taskRepo.findByUserAndDateRange = jest.fn();
      }
      taskRepo.findByUserAndDateRange.mockResolvedValue([]);

      const result = await importService.getImportHistory(VALID_USER_ID);

      expect(result).toEqual({});
    });

    it('❌ should handle errors', async () => {
      const mockError = new Error('Database error');
      if (!taskRepo.findByUserAndDateRange) {
        taskRepo.findByUserAndDateRange = jest.fn();
      }
      taskRepo.findByUserAndDateRange.mockRejectedValue(mockError);

      await expect(importService.getImportHistory(VALID_USER_ID)).rejects.toThrow('Database error');
    });
  });
});

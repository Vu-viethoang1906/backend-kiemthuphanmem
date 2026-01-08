// 📄 tests/unit/taskQueryBuilder.service.test.js - Task Query Builder Service Unit Tests
const mongoose = require('mongoose');

// Mock models
jest.mock('../../models/tag.model');
jest.mock('../../models/sprint.model');

// Now require the service after mocks are set up
const buildTaskQuery = require('../../services/taskQueryBuilder.service');
const Tag = require('../../models/tag.model');
const Sprint = require('../../models/sprint.model');

describe('🔹 Task Query Builder Service Unit Tests', () => {
  let mockModels;
  let mockUserId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();

    // Mock models object
    mockModels = {
      Board: {
        findOne: jest.fn(),
      },
      Column: {
        findOne: jest.fn(),
      },
      Swimlane: {
        findOne: jest.fn(),
      },
      User: {
        findOne: jest.fn(),
      },
    };
  });

  describe('buildTaskQuery', () => {
    it('✅ should return base query with deleted_at null', async () => {
      const result = await buildTaskQuery({}, mockModels);

      expect(result).toHaveProperty('deleted_at', null);
    });

    it('✅ should add keyword filter to query', async () => {
      const filters = { keyword: 'test' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('$or');
      expect(result.$or).toHaveLength(2);
      expect(result.$or[0]).toHaveProperty('title');
      expect(result.$or[1]).toHaveProperty('description');
    });

    it('✅ should add status Done filter', async () => {
      const filters = { status: 'Done' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('done_at');
      expect(result.done_at).toEqual({ $ne: null });
    });

    it('✅ should handle assignee "me" with valid userId', async () => {
      const filters = { assignee: 'me' };
      const result = await buildTaskQuery(filters, mockModels, mockUserId.toString());

      expect(result).toHaveProperty('assigned_to');
      expect(result.assigned_to).toBeInstanceOf(mongoose.Types.ObjectId);
    });

    it('✅ should handle assignee "me" with invalid userId', async () => {
      const filters = { assignee: 'me' };
      const result = await buildTaskQuery(filters, mockModels, 'invalid-id');

      expect(result).toHaveProperty('assigned_to');
      expect(result.assigned_to).toBe('invalid-id');
    });

    it('✅ should find user by username for assignee', async () => {
      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        username: 'testuser',
      };
      mockModels.User.findOne.mockResolvedValue(mockUser);

      const filters = { assignee: 'testuser' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(mockModels.User.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('assigned_to', mockUser._id);
    });

    it('✅ should set assigned_to to null when user not found', async () => {
      mockModels.User.findOne.mockResolvedValue(null);

      const filters = { assignee: 'nonexistent' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('assigned_to', null);
    });

    it('✅ should add overdue filter', async () => {
      const filters = { overdue: true };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('done_at', null);
      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$lte');
    });

    it('✅ should add overdue filter with overdue_days', async () => {
      const filters = { overdue: true, overdue_days: 5 };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('done_at', null);
      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$lte');
    });

    it('✅ should handle board_id with valid ObjectId', async () => {
      const boardId = new mongoose.Types.ObjectId();
      const filters = { board_id: boardId.toString() };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('board_id');
      expect(result.board_id).toBeInstanceOf(mongoose.Types.ObjectId);
    });

    it('✅ should handle board_id with invalid ObjectId', async () => {
      const filters = { board_id: 'invalid-id' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('board_id', 'invalid-id');
    });

    it('✅ should find board by name', async () => {
      const mockBoard = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test Board',
      };
      mockModels.Board.findOne.mockResolvedValue(mockBoard);

      const filters = { board: 'Test Board' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(mockModels.Board.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('board_id', mockBoard._id);
    });

    it('✅ should set board_id to null when board not found', async () => {
      mockModels.Board.findOne.mockResolvedValue(null);

      const filters = { board: 'Nonexistent Board' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('board_id', null);
    });

    it('✅ should skip board filter when board is "tất cả"', async () => {
      const filters = { board: 'tất cả' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).not.toHaveProperty('board_id');
      expect(mockModels.Board.findOne).not.toHaveBeenCalled();
    });

    it('✅ should find column by name', async () => {
      const mockColumn = {
        _id: new mongoose.Types.ObjectId(),
        name: 'In Progress',
      };
      mockModels.Column.findOne.mockResolvedValue(mockColumn);

      const filters = { column: 'In Progress' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(mockModels.Column.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('column_id', mockColumn._id);
    });

    it('✅ should set column_id to null when column not found', async () => {
      mockModels.Column.findOne.mockResolvedValue(null);

      const filters = { column: 'Nonexistent Column' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('column_id', null);
    });

    it('✅ should find swimlane by name', async () => {
      const mockSwimlane = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Backend',
      };
      mockModels.Swimlane.findOne.mockResolvedValue(mockSwimlane);

      const filters = { swimlane: 'Backend' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(mockModels.Swimlane.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('swimlane_id', mockSwimlane._id);
    });

    it('✅ should set swimlane_id to null when swimlane not found', async () => {
      mockModels.Swimlane.findOne.mockResolvedValue(null);

      const filters = { swimlane: 'Nonexistent Swimlane' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('swimlane_id', null);
    });

    it('✅ should add due_in_days filter', async () => {
      const filters = { due_in_days: 7 };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$gte');
      expect(result.due_date).toHaveProperty('$lte');
      expect(result).toHaveProperty('done_at', null);
    });

    it('✅ should add deadline filter with $lte', async () => {
      const deadline = new Date('2024-12-31');
      const filters = { deadline: { $lte: deadline } };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$lte');
    });

    it('✅ should add deadline filter with $gte', async () => {
      const deadline = new Date('2024-01-01');
      const filters = { deadline: { $gte: deadline } };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$gte');
    });

    it('✅ should add deadline filter with both $lte and $gte', async () => {
      const filters = {
        deadline: {
          $gte: new Date('2024-01-01'),
          $lte: new Date('2024-12-31'),
        },
      };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$gte');
      expect(result.due_date).toHaveProperty('$lte');
    });

    it('✅ should handle invalid deadline date', async () => {
      const filters = { deadline: { $lte: 'invalid-date' } };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).not.toHaveProperty('due_date');
    });

    it('✅ should add date_range filter', async () => {
      const filters = {
        date_range: {
          from: new Date('2024-01-01'),
          to: new Date('2024-12-31'),
        },
      };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$gte');
      expect(result.due_date).toHaveProperty('$lte');
    });

    it('✅ should handle date_range with only from', async () => {
      const filters = {
        date_range: {
          from: new Date('2024-01-01'),
        },
      };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$gte');
    });

    it('✅ should handle date_range with only to', async () => {
      const filters = {
        date_range: {
          to: new Date('2024-12-31'),
        },
      };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$lte');
    });

    it('✅ should handle invalid date_range', async () => {
      const filters = {
        date_range: {
          from: 'invalid-date',
        },
      };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).not.toHaveProperty('due_date');
    });

    it('✅ should add priority filter', async () => {
      const filters = { priority: 'High' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('priority', 'High');
    });

    it('✅ should find tag by name', async () => {
      const mockTag = {
        _id: new mongoose.Types.ObjectId(),
        name: 'bug',
      };
      Tag.findOne.mockResolvedValue(mockTag);

      const filters = { tag: 'bug' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(Tag.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('tags');
      expect(result.tags).toEqual({ $in: [mockTag._id] });
    });

    it('✅ should set tags to empty array when tag not found', async () => {
      Tag.findOne.mockResolvedValue(null);

      const filters = { tag: 'nonexistent' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('tags');
      expect(result.tags).toEqual({ $in: [] });
    });

    it('✅ should find sprint by name', async () => {
      const mockSprint = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Sprint 1',
      };
      Sprint.findOne.mockResolvedValue(mockSprint);

      const filters = { sprint: 'Sprint 1' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(Sprint.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('sprint_id', mockSprint._id);
    });

    it('✅ should set sprint_id to null when sprint not found', async () => {
      Sprint.findOne.mockResolvedValue(null);

      const filters = { sprint: 'Nonexistent Sprint' };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('sprint_id', null);
    });

    it('✅ should combine multiple filters', async () => {
      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        username: 'testuser',
      };
      const mockBoard = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test Board',
      };
      mockModels.User.findOne.mockResolvedValue(mockUser);
      mockModels.Board.findOne.mockResolvedValue(mockBoard);

      const filters = {
        keyword: 'test',
        assignee: 'testuser',
        board: 'Test Board',
        priority: 'High',
      };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('$or');
      expect(result).toHaveProperty('assigned_to', mockUser._id);
      expect(result).toHaveProperty('board_id', mockBoard._id);
      expect(result).toHaveProperty('priority', 'High');
    });

    it('✅ should prioritize board_id over board name', async () => {
      const boardId = new mongoose.Types.ObjectId();
      const filters = {
        board_id: boardId.toString(),
        board: 'Test Board',
      };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('board_id');
      expect(mockModels.Board.findOne).not.toHaveBeenCalled();
    });

    it('✅ should prioritize due_in_days over deadline', async () => {
      const filters = {
        due_in_days: 7,
        deadline: { $lte: new Date('2024-12-31') },
      };
      const result = await buildTaskQuery(filters, mockModels);

      expect(result).toHaveProperty('due_date');
      expect(result.due_date).toHaveProperty('$gte');
      expect(result.due_date).toHaveProperty('$lte');
      expect(result).toHaveProperty('done_at', null);
    });
  });
});

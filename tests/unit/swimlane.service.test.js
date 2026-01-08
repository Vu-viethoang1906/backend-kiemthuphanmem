// tests/unit/swimlane.service.test.js

jest.mock('../../repositories/swimlane.repository');
jest.mock('../../repositories/board.repository');
jest.mock('mongoose');

const swimlaneRepo = require('../../repositories/swimlane.repository');
const boardRepo = require('../../repositories/board.repository');
const mongoose = require('mongoose');
const swimlaneService = require('../../services/swimlane.service');

describe('🧭 Swimlane Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSwimlane', () => {
    it('❌ should throw if userId missing (not authenticated)', async () => {
      const payload = { board_id: 'b1', name: 'S1', order: 0 };
      await expect(swimlaneService.createSwimlane(payload)).rejects.toThrow('Không xác thực');
    });

    it('❌ should throw if user is not a board member', async () => {
      boardRepo.isMember.mockResolvedValue(false);
      const payload = { board_id: 'b1', name: 'S1', order: 0, userId: 'u1' };
      await expect(swimlaneService.createSwimlane(payload)).rejects.toThrow('Bạn không có quyền thao tác trên board này');
      expect(boardRepo.isMember).toHaveBeenCalledWith('u1', 'b1');
    });

    it('✅ should create swimlane when user is member', async () => {
      boardRepo.isMember.mockResolvedValue(true);
      const created = { id: 's1', board_id: 'b1', name: 'S1', order: 1 };
      swimlaneRepo.create.mockResolvedValue(created);

      const input = { board_id: 'b1', name: 'S1', order: 1, userId: 'u1' };
      const res = await swimlaneService.createSwimlane(input);
      expect(res).toBe(created);
      expect(swimlaneRepo.create).toHaveBeenCalledWith({ board_id: 'b1', name: 'S1', order: 1 });
    });
  });

  describe('getSwimlane', () => {
    it('❌ returns null when swimlane not found', async () => {
      swimlaneRepo.findById.mockResolvedValue(null);
      const res = await swimlaneService.getSwimlane('s1', 'u1');
      expect(res).toBeNull();
      expect(swimlaneRepo.findById).toHaveBeenCalledWith('s1');
    });

    it('❌ throws if user not a member of board', async () => {
      const sl = { id: 's1', board_id: 'b1' };
      swimlaneRepo.findById.mockResolvedValue(sl);
      boardRepo.isMember.mockResolvedValue(false);

      await expect(swimlaneService.getSwimlane('s1', 'u1')).rejects.toThrow('Bạn không có quyền xem swimlane này');
      expect(boardRepo.isMember).toHaveBeenCalledWith('u1', 'b1');
    });

    it('✅ returns swimlane when found and user is member', async () => {
      const sl = { id: 's1', board_id: 'b1' };
      swimlaneRepo.findById.mockResolvedValue(sl);
      boardRepo.isMember.mockResolvedValue(true);
      const res = await swimlaneService.getSwimlane('s1', 'u1');
      expect(res).toBe(sl);
    });
  });

  describe('getSwimlanesByBoard', () => {
    it('✅ returns all swimlanes when user is admin role (without read permission)', async () => {
      boardRepo.isMember.mockResolvedValue(false); // even if not member
      const swimlanes = [{ id: 's1' }];
      swimlaneRepo.findAllByBoard.mockResolvedValue(swimlanes);

      const res = await swimlaneService.getSwimlanesByBoard('b1', 'u1', ['admin']);
      expect(res).toBe(swimlanes);
      expect(swimlaneRepo.findAllByBoard).toHaveBeenCalledWith('b1');
    });

    it('❌ throws when not member and not admin/system manager', async () => {
      boardRepo.isMember.mockResolvedValue(false);
      await expect(swimlaneService.getSwimlanesByBoard('b1', 'u1', [])).rejects.toThrow('Bạn không có quyền xem board này');
    });

    it('✅ returns swimlanes when user is member', async () => {
      boardRepo.isMember.mockResolvedValue(true);
      const swimlanes = [{ id: 's1' }, { id: 's2' }];
      swimlaneRepo.findAllByBoard.mockResolvedValue(swimlanes);
      const res = await swimlaneService.getSwimlanesByBoard('b1', 'u1', []);
      expect(res).toBe(swimlanes);
      expect(swimlaneRepo.findAllByBoard).toHaveBeenCalledWith('b1');
    });
  });

  describe('updateSwimlane', () => {
    it('❌ returns null when swimlane not found', async () => {
      swimlaneRepo.findById.mockResolvedValue(null);
      const res = await swimlaneService.updateSwimlane('s1', { name: 'X' }, 'u1');
      expect(res).toBeNull();
    });

    it('❌ throws when user not member', async () => {
      swimlaneRepo.findById.mockResolvedValue({ id: 's1', board_id: 'b1' });
      boardRepo.isMember.mockResolvedValue(false);
      await expect(swimlaneService.updateSwimlane('s1', { name: 'X' }, 'u1')).rejects.toThrow('Bạn không có quyền thao tác trên board này');
      expect(boardRepo.isMember).toHaveBeenCalledWith('u1', 'b1');
    });

    it('✅ updates swimlane when allowed', async () => {
      swimlaneRepo.findById.mockResolvedValue({ id: 's1', board_id: 'b1' });
      boardRepo.isMember.mockResolvedValue(true);
      swimlaneRepo.update.mockResolvedValue({ id: 's1', name: 'X' });

      const res = await swimlaneService.updateSwimlane('s1', { name: 'X' }, 'u1');
      expect(res).toEqual({ id: 's1', name: 'X' });
      expect(swimlaneRepo.update).toHaveBeenCalledWith('s1', { name: 'X' });
    });
  });

  describe('deleteSwimlane', () => {
    it('❌ returns null when swimlane not found', async () => {
      swimlaneRepo.findById.mockResolvedValue(null);
      const res = await swimlaneService.deleteSwimlane('s1', 'u1');
      expect(res).toBeNull();
    });

    it('❌ throws when user not member', async () => {
      swimlaneRepo.findById.mockResolvedValue({ id: 's1', board_id: 'b1' });
      boardRepo.isMember.mockResolvedValue(false);
      await expect(swimlaneService.deleteSwimlane('s1', 'u1')).rejects.toThrow('Bạn không có quyền thao tác trên board này');
    });

    it('✅ soft deletes swimlane when allowed', async () => {
      swimlaneRepo.findById.mockResolvedValue({ id: 's1', board_id: 'b1' });
      boardRepo.isMember.mockResolvedValue(true);
      swimlaneRepo.softDelete.mockResolvedValue(true);
      const res = await swimlaneService.deleteSwimlane('s1', 'u1');
      expect(res).toBe(true);
      expect(swimlaneRepo.softDelete).toHaveBeenCalledWith('s1');
    });
  });

  describe('toggleCollapse', () => {
    it('❌ returns null when swimlane not found', async () => {
      swimlaneRepo.findById.mockResolvedValue(null);
      const res = await swimlaneService.toggleCollapse('s1', true, 'u1');
      expect(res).toBeNull();
    });

    it('❌ throws when user not member', async () => {
      swimlaneRepo.findById.mockResolvedValue({ id: 's1', board_id: 'b1' });
      boardRepo.isMember.mockResolvedValue(false);
      await expect(swimlaneService.toggleCollapse('s1', true, 'u1')).rejects.toThrow('Bạn không có quyền thao tác trên board này');
    });

    it('✅ toggles collapsed value when allowed', async () => {
      swimlaneRepo.findById.mockResolvedValue({ id: 's1', board_id: 'b1' });
      boardRepo.isMember.mockResolvedValue(true);
      swimlaneRepo.update.mockResolvedValue({ id: 's1', collapsed: true });
      const res = await swimlaneService.toggleCollapse('s1', true, 'u1');
      expect(res).toEqual({ id: 's1', collapsed: true });
      expect(swimlaneRepo.update).toHaveBeenCalledWith('s1', { collapsed: true });
    });
  });

  describe('reorderSwimlanes', () => {
    let sessionMock;

    beforeEach(() => {
      sessionMock = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };
      mongoose.startSession.mockReturnValue(sessionMock);
    });

    it('❌ throws when user is not a member', async () => {
      boardRepo.isMember.mockResolvedValue(false);
      await expect(swimlaneService.reorderSwimlanes('b1', ['s1', 's2'], 'u1')).rejects.toThrow('Bạn không có quyền thao tác trên board này');
    });

    it('✅ updates orders successfully and commits transaction', async () => {
      boardRepo.isMember.mockResolvedValue(true);
      swimlaneRepo.update.mockImplementation((id, data, session) => Promise.resolve({ id, ...data, sessionId: session }));

      const res = await swimlaneService.reorderSwimlanes('b1', ['s1', 's2'], 'u1');
      expect(res).toHaveLength(2);
      expect(swimlaneRepo.update).toHaveBeenNthCalledWith(1, 's1', { order: 0 }, sessionMock);
      expect(swimlaneRepo.update).toHaveBeenNthCalledWith(2, 's2', { order: 1 }, sessionMock);
      expect(sessionMock.commitTransaction).toHaveBeenCalled();
      expect(sessionMock.endSession).toHaveBeenCalled();
    });

    it('❌ aborts transaction and throws when update fails', async () => {
      boardRepo.isMember.mockResolvedValue(true);
      swimlaneRepo.update.mockImplementation((id) => {
        if (id === 's2') throw new Error('DB failed');
        return Promise.resolve({ id, order: 0 });
      });

      await expect(swimlaneService.reorderSwimlanes('b1', ['s1', 's2'], 'u1')).rejects.toThrow('DB failed');
      expect(sessionMock.abortTransaction).toHaveBeenCalled();
      expect(sessionMock.endSession).toHaveBeenCalled();
    });
  });
});

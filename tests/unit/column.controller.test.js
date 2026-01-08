// tests/unit/column.controller.test.js

jest.mock('../../services/column.service');

const columnService = require('../../services/column.service');
const columnController = require('../../controllers/column.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('🔹 Column Controller Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

  });

  describe('create', () => {
    it('❌ returns 401 when no user', async () => {
      const req = { user: undefined, body: {} };
      const res = buildRes();

      await columnController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Không có quyền truy cập' });
      expect(columnService.createColumn).not.toHaveBeenCalled();
    });

    it('✅ returns 201 and created column when valid', async () => {
      const req = { user: { id: 'u1' }, body: { board_id: 'b1', name: 'My Column', order: 1, isdone: false } };
      const res = buildRes();
      const created = { id: 'c1', board_id: 'b1', name: 'My Column' };
      columnService.createColumn.mockResolvedValue(created);

      await columnController.create(req, res);

      expect(columnService.createColumn).toHaveBeenCalledWith({ board_id: 'b1', name: 'My Column', order: 1, userId: 'u1', isdone: false });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: created });
    });

    it('❌ returns 400 when service throws', async () => {
      const req = { user: { id: 'u1' }, body: { board_id: 'b1' } };
      const res = buildRes();
      columnService.createColumn.mockRejectedValue(new Error('create fail'));

      await columnController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'create fail' });
    });
  });

  describe('getOne', () => {
    it('❌ returns 401 when no user', async () => {
      const req = { user: undefined, params: { id: 'c1' } };
      const res = buildRes();

      await columnController.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(columnService.getColumn).not.toHaveBeenCalled();
    });

    it('❌ returns 404 when column not found', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'c1' } };
      const res = buildRes();
      columnService.getColumn.mockResolvedValue(null);

      await columnController.getOne(req, res);

      expect(columnService.getColumn).toHaveBeenCalledWith('c1', 'u1');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Column không tồn tại' });
    });

    it('✅ returns column when found', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'c1' } };
      const res = buildRes();
      const col = { id: 'c1' };
      columnService.getColumn.mockResolvedValue(col);

      await columnController.getOne(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: col });
    });

    it('❌ returns 400 when service throws', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'c1' } };
      const res = buildRes();
      columnService.getColumn.mockRejectedValue(new Error('db fail'));

      await columnController.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'db fail' });
    });
  });

  describe('getByBoard', () => {
    it('❌ returns 401 when no user', async () => {
      const req = { user: undefined, params: { boardId: 'b1' } };
      const res = buildRes();
      await columnController.getByBoard(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('✅ returns columns for member', async () => {
      const req = { user: { id: 'u1', roles: [] }, params: { boardId: 'b1' } };
      const res = buildRes();
      const cols = [{ id: 'c1' }, { id: 'c2' }];
      columnService.getColumnsByBoard.mockResolvedValue(cols);

      await columnController.getByBoard(req, res);

      expect(columnService.getColumnsByBoard).toHaveBeenCalledWith('b1', 'u1', []);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: cols });
    });

    it('✅ forwards roles for admin', async () => {
      const req = { user: { id: 'u1', roles: ['admin'] }, params: { boardId: 'b1' } };
      const res = buildRes();
      columnService.getColumnsByBoard.mockResolvedValue([]);

      await columnController.getByBoard(req, res);

      expect(columnService.getColumnsByBoard).toHaveBeenCalledWith('b1', 'u1', ['admin']);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('❌ returns 400 when service throws', async () => {
      const req = { user: { id: 'u1', roles: [] }, params: { boardId: 'b1' } };
      const res = buildRes();
      columnService.getColumnsByBoard.mockRejectedValue(new Error('fail'));

      await columnController.getByBoard(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'fail' });
    });
  });

  describe('update', () => {
    it('❌ returns 401 when unauthenticated', async () => {
      const req = { user: undefined, params: { id: 'c1' }, body: {} };
      const res = buildRes();
      await columnController.update(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('❌ returns 404 when column not found', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'c1' }, body: {} };
      const res = buildRes();
      columnService.updateColumn.mockResolvedValue(null);

      await columnController.update(req, res);

      expect(columnService.updateColumn).toHaveBeenCalledWith('c1', {}, 'u1');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Column không tồn tại' });
    });

    it('✅ returns updated column', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'c1' }, body: { name: 'X' } };
      const res = buildRes();
      const updated = { id: 'c1', name: 'X' };
      columnService.updateColumn.mockResolvedValue(updated);

      await columnController.update(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });

    it('❌ returns 400 when service throws', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'c1' }, body: {} };
      const res = buildRes();
      columnService.updateColumn.mockRejectedValue(new Error('update fail'));

      await columnController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'update fail' });
    });
  });

  describe('delete', () => {
    it('❌ returns 401 if unauthenticated', async () => {
      const req = { user: undefined, params: { id: 'c1' } }; const res = buildRes();
      await columnController.delete(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('❌ returns 404 when column not found', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'c1' } };
      const res = buildRes(); columnService.deleteColumn.mockResolvedValue(null);

      await columnController.delete(req, res);

      expect(columnService.deleteColumn).toHaveBeenCalledWith('c1', 'u1');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Column không tồn tại' });
    });

    it('✅ returns 200 when delete success', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'c1' } };
      const res = buildRes(); columnService.deleteColumn.mockResolvedValue(true);

      await columnController.delete(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Xóa column thành công' });
    });

    it('❌ returns 400 when service throws', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'c1' } };
      const res = buildRes(); columnService.deleteColumn.mockRejectedValue(new Error('del fail'));

      await columnController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'del fail' });
    });
  });

  describe('reorder', () => {
    it('❌ returns 401 when unauthenticated', async () => {
      const req = { user: undefined, params: { boardId: 'b1' }, body: {} };
      const res = buildRes();
      await columnController.reorder(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('❌ returns 400 when columns not array', async () => {
      const req = { user: { id: 'u1' }, params: { boardId: 'b1' }, body: { columns: 'string' } };
      const res = buildRes();
      await columnController.reorder(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'columns phải là array' });
    });

    it('✅ returns 200 and data when reorder success', async () => {
      const req = { user: { id: 'u1' }, params: { boardId: 'b1' }, body: { columns: [{ id: 'c1', order: 0 }] } };
      const res = buildRes(); const ret = [{ id: 'c1', order: 0 }]; columnService.reorderColumns.mockResolvedValue(ret);

      await columnController.reorder(req, res);

      expect(columnService.reorderColumns).toHaveBeenCalledWith('b1', [{ id: 'c1', order: 0 }], 'u1');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Sắp xếp lại columns thành công', data: ret });
    });

    it('❌ returns 400 when service throws', async () => {
      const req = { user: { id: 'u1' }, params: { boardId: 'b1' }, body: { columns: [{ id: 'c1' }] } };
      const res = buildRes(); columnService.reorderColumns.mockRejectedValue(new Error('reorder fail'));

      await columnController.reorder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'reorder fail' });
    });
  });

  describe('move', () => {
    it('✅ returns 200 when move success', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'b1' }, body: { key: 'value' } };
      const res = buildRes(); const ret = { success: true }; columnService.moveService.mockResolvedValue(ret);

      await columnController.move(req, res);

      expect(columnService.moveService).toHaveBeenCalledWith('u1', 'b1', { key: 'value' });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: ret });
    });

    it('❌ throws and returns 400 when req.user is undefined (current behavior)', async () => {
      const req = { user: undefined, params: { id: 'b1' }, body: {} };
      const res = buildRes();

      await columnController.move(req, res);

      // Current code will throw when reading req.user.id, which is caught and returns 400
      expect(columnService.moveService).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('❌ returns 400 when service throws', async () => {
      const req = { user: { id: 'u1' }, params: { id: 'b1' }, body: {} };
      const res = buildRes(); columnService.moveService.mockRejectedValue(new Error('move fail'));

      await columnController.move(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'move fail' });
    });
  });

  describe('ColumnIsDone', () => {
    it('✅ returns 200 and invokes updateIsDone (synchronous return mocked)', async () => {
      const req = { user: { id: 'u1' }, params: { idcolumn: 'c1', idBoard: 'b1' } };
      const res = buildRes(); const ret = { id: 'c1', done: true };
      // Mock returning a non-promise value; the controller doesn't await
      columnService.updateIsDone.mockReturnValue(ret);

      await columnController.ColumnIsDone(req, res);

      expect(columnService.updateIsDone).toHaveBeenCalledWith('c1', 'b1', 'u1');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: ret });
    });

    it('🔸 demonstrates current missing await behavior (promise returned and not awaited)', async () => {
      const req = { user: { id: 'u1' }, params: { idcolumn: 'c1', idBoard: 'b1' } };
      const res = buildRes(); const promise = Promise.resolve({ id: 'c1', done: true });
      columnService.updateIsDone.mockReturnValue(promise);

      await columnController.ColumnIsDone(req, res);

      expect(columnService.updateIsDone).toHaveBeenCalledWith('c1', 'b1', 'u1');
      // Controller will send the Promise object in data because it does not await
      expect(res.json).toHaveBeenCalledWith({ success: true, data: promise });
    });

    it('❌ returns 400 when service throws synchronously (rare)', async () => {
      const req = { user: { id: 'u1' }, params: { idcolumn: 'c1', idBoard: 'b1' } };
      const res = buildRes(); columnService.updateIsDone.mockImplementation(() => { throw new Error('sync fail'); });

      await columnController.ColumnIsDone(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'sync fail' });
    });
  });
});

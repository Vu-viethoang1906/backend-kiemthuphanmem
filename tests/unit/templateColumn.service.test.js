// tests/unit/templateColumn.service.test.js

jest.mock('mongoose', () => ({ Types: { ObjectId: { isValid: jest.fn() } } }));
jest.mock('../../models/templateColumn.model', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../models/template.model', () => ({
  findById: jest.fn(),
}));
jest.mock('../../repositories/templateColumn.repository', () => ({ softDelete: jest.fn() }));

const mongoose = require('mongoose');
const TemplateColumn = require('../../models/templateColumn.model');
const Template = require('../../models/template.model');
const templateColumnRepo = require('../../repositories/templateColumn.repository');
const templateColumnService = require('../../services/templateColumn.service');

// Helper factories to return chainable query objects
const makeLeanResult = (value) => ({ lean: jest.fn().mockResolvedValue(value) });
const makeFindSortLeanResult = (value) => ({ sort: jest.fn().mockReturnValue(makeLeanResult(value)) });

function buildUser(id = 'user1', roles = []) {
  return { id, roles };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Ensure model methods exist as jest.fn to avoid undefined errors when mocking
  TemplateColumn.find = TemplateColumn.find || jest.fn();
  TemplateColumn.findById = TemplateColumn.findById || jest.fn();
  TemplateColumn.findByIdAndUpdate = TemplateColumn.findByIdAndUpdate || jest.fn();
  TemplateColumn.create = TemplateColumn.create || jest.fn();
  Template.findById = Template.findById || jest.fn();
  templateColumnRepo.softDelete = templateColumnRepo.softDelete || jest.fn();
});

describe('🔹 TemplateColumn Service Unit Tests', () => {
  describe('list(template_id)', () => {
    it('❌ throws when invalid template_id', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      await expect(templateColumnService.list('bad-id')).rejects.toThrow('template_id không hợp lệ');
    });

    it('✅ returns columns sorted by order_index', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      const data = [{ name: 'A', order_index: 1 }, { name: 'B', order_index: 2 }];
      TemplateColumn.find.mockReturnValue(makeFindSortLeanResult(data));

      const res = await templateColumnService.list('validId');
      expect(TemplateColumn.find).toHaveBeenCalledWith({ template_id: 'validId' });
      expect(res).toBe(data);
    });

    it('❌ propagates error from model', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.find.mockImplementation(() => { throw new Error('db fail'); });
      await expect(templateColumnService.list('validId')).rejects.toThrow('db fail');
    });
  });

  describe('checkPermission(template, user)', () => {
    it('✅ allows when user is creator', () => {
      const template = { created_by: { toString: () => 'u1' } };
      const user = buildUser('u1');
      expect(() => templateColumnService.checkPermission(template, user)).not.toThrow();
    });

    it('✅ allows when user has admin role', () => {
      const template = { created_by: { toString: () => 'x' } };
      const user = buildUser('u2', ['admin']);
      expect(() => templateColumnService.checkPermission(template, user)).not.toThrow();
    });

    it('✅ allows when user has System_Manager role', () => {
      const template = { created_by: { toString: () => 'x' } };
      const user = buildUser('u2', ['System_Manager']);
      expect(() => templateColumnService.checkPermission(template, user)).not.toThrow();
    });

    it('❌ throws when user not creator and not admin', () => {
      const template = { created_by: { toString: () => 'x' } };
      const user = buildUser('u2', ['member']);
      expect(() => templateColumnService.checkPermission(template, user)).toThrow('Không có quyền thực hiện thao tác này');
    });

    it('❌ throws TypeError when roles missing (guard suggestion)', () => {
      const template = { created_by: { toString: () => 'x' } };
      const badUser = { id: 'u1' }; // no roles property
      expect(() => templateColumnService.checkPermission(template, badUser)).toThrow();
    });
  });

  describe('create(template_id, { name, order_index }, user)', () => {
    it('❌ throws when invalid template id', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      await expect(templateColumnService.create('bad', { name: 'X' }, buildUser())).rejects.toThrow('template_id không hợp lệ');
    });

    it('❌ throws when name missing or blank', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      await expect(templateColumnService.create('id', { name: '   ' }, buildUser())).rejects.toThrow('name là bắt buộc');
    });

    it('❌ throws when Template not found', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      Template.findById.mockReturnValue(makeLeanResult(null));
      await expect(templateColumnService.create('id', { name: 'Name' }, buildUser())).rejects.toThrow('Template không tồn tại');
    });

    it('❌ throws when permission denied', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'x' } }));
      const spy = jest.spyOn(templateColumnService, 'checkPermission').mockImplementation(() => { throw new Error('Không có quyền thực hiện thao tác này'); });
      await expect(templateColumnService.create('id', { name: 'Name' }, buildUser('u1'))).rejects.toThrow('Không có quyền thực hiện thao tác này');
      spy.mockRestore();
    });

    it('✅ creates a doc with trimmed name and numeric order', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'u1' } }));
      TemplateColumn.create.mockResolvedValue({ id: 'c1', name: 'Trim' });

      const res = await templateColumnService.create('validId', { name: '  Trim  ', order_index: '2' }, buildUser('u1'));
      expect(TemplateColumn.create).toHaveBeenCalledWith({ template_id: 'validId', name: 'Trim', order_index: 2 });
      expect(res).toEqual({ id: 'c1', name: 'Trim' });
    });

    it('✅ order_index fallback to 0 when invalid', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'u1' } }));
      TemplateColumn.create.mockResolvedValue({ id: 'c2', name: 'A', order_index: 0 });

      const res = await templateColumnService.create('validId', { name: '  A  ', order_index: 'abc' }, buildUser('u1'));
      expect(TemplateColumn.create).toHaveBeenCalledWith({ template_id: 'validId', name: 'A', order_index: 0 });
    });

    it('❌ propagates create error', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'u1' } }));
      TemplateColumn.create.mockRejectedValue(new Error('create fail'));

      await expect(templateColumnService.create('id', { name: 'X' }, buildUser('u1'))).rejects.toThrow('create fail');
    });
  });

  describe('update(id, data, user)', () => {
    it('❌ throws when invalid id', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      await expect(templateColumnService.update('badId', {}, buildUser())).rejects.toThrow('id không hợp lệ');
    });

    it('❌ throws when column not found', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult(null));
      await expect(templateColumnService.update('id', {}, buildUser())).rejects.toThrow('Không tìm thấy TemplateColumn');
    });

    it('❌ throws when template not found', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult({ template_id: 't1' }));
      Template.findById.mockReturnValue(makeLeanResult(null));
      await expect(templateColumnService.update('id', { name: 'X' }, buildUser())).rejects.toThrow('Template không tồn tại');
    });

    it('❌ throws when permission denied', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult({ template_id: 't1' }));
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'x' } }));
      const spy = jest.spyOn(templateColumnService, 'checkPermission').mockImplementation(() => { throw new Error('Không có quyền thực hiện thao tác này'); });
      await expect(templateColumnService.update('id', { name: 'X' }, buildUser('u1'))).rejects.toThrow('Không có quyền thực hiện thao tác này');
      spy.mockRestore();
    });

    it('✅ updates name and order_index correctly and returns doc', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult({ template_id: 't1' }));
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'u1' } }));
      TemplateColumn.findByIdAndUpdate.mockReturnValue(makeLeanResult({ id: 'c1', name: 'New', order_index: 3 }));

      const res = await templateColumnService.update('id', { name: '  New  ', order_index: '3' }, buildUser('u1'));
      expect(TemplateColumn.findByIdAndUpdate).toHaveBeenCalledWith('id', { name: 'New', order_index: 3 }, { new: true });
      expect(res).toEqual({ id: 'c1', name: 'New', order_index: 3 });
    });

    it('❌ throws when findByIdAndUpdate returns null', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult({ template_id: 't1' }));
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'u1' } }));
      TemplateColumn.findByIdAndUpdate.mockReturnValue(makeLeanResult(null));
      await expect(templateColumnService.update('id', { name: 'X' }, buildUser('u1'))).rejects.toThrow('Cập nhật thất bại');
    });
  });

  describe('remove(id, user)', () => {
    it('❌ throws when invalid id', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      await expect(templateColumnService.remove('bad', buildUser())).rejects.toThrow('id không hợp lệ');
    });

    it('❌ throws when column not found', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult(null));
      await expect(templateColumnService.remove('id', buildUser())).rejects.toThrow('Không tìm thấy TemplateColumn');
    });

    it('❌ throws when template not found', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult({ template_id: 't1' }));
      Template.findById.mockReturnValue(makeLeanResult(null));
      await expect(templateColumnService.remove('id', buildUser())).rejects.toThrow('Template không tồn tại');
    });

    it('❌ throws when permission denied', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult({ template_id: 't1' }));
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'x' } }));
      const spy = jest.spyOn(templateColumnService, 'checkPermission').mockImplementation(() => { throw new Error('Không có quyền thực hiện thao tác này'); });
      await expect(templateColumnService.remove('id', buildUser('u1'))).rejects.toThrow('Không có quyền thực hiện thao tác này');
      spy.mockRestore();
    });

    it('✅ returns true when softDelete successful', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult({ template_id: 't1' }));
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'u1' } }));
      templateColumnRepo.softDelete.mockResolvedValue(true);

      const res = await templateColumnService.remove('id', buildUser('u1'));
      expect(templateColumnRepo.softDelete).toHaveBeenCalledWith('id');
      expect(res).toBe(true);
    });

    it('❌ throws when softDelete returns falsy', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult({ template_id: 't1' }));
      Template.findById.mockReturnValue(makeLeanResult({ created_by: { toString: () => 'u1' } }));
      templateColumnRepo.softDelete.mockResolvedValue(false);

      await expect(templateColumnService.remove('id', buildUser('u1'))).rejects.toThrow('Xóa thất bại');
    });
  });

  describe('findAll', () => {
    it('✅ returns all columns sorted', async () => {
      const data = [{ id: 'c1' }];
      TemplateColumn.find.mockReturnValue(makeFindSortLeanResult(data));
      const res = await templateColumnService.findAll();
      expect(TemplateColumn.find).toHaveBeenCalledWith();
      expect(res).toBe(data);
    });
  });

  describe('findById', () => {
    it('❌ throws when invalid id', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      await expect(templateColumnService.findById('bad')).rejects.toThrow('id không hợp lệ');
    });

    it('❌ throws when not found', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      TemplateColumn.findById.mockReturnValue(makeLeanResult(null));
      await expect(templateColumnService.findById('id')).rejects.toThrow('Không tìm thấy TemplateColumn');
    });

    it('✅ returns doc when found', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      const doc = { id: 'c1', name: 'n' };
      TemplateColumn.findById.mockReturnValue(makeLeanResult(doc));
      const res = await templateColumnService.findById('id');
      expect(TemplateColumn.findById).toHaveBeenCalledWith('id');
      expect(res).toEqual(doc);
    });
  });

  describe('findByTemplate(templateId)', () => {
    it('❌ throws when invalid templateId', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      await expect(templateColumnService.findByTemplate('bad')).rejects.toThrow('templateId không hợp lệ');
    });

    it('✅ returns columns for template', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      const data = [{ id: 'c1' }];
      TemplateColumn.find.mockReturnValue(makeFindSortLeanResult(data));
      const res = await templateColumnService.findByTemplate('templateId');
      expect(TemplateColumn.find).toHaveBeenCalledWith({ template_id: 'templateId' });
      expect(res).toBe(data);
    });
  });
});

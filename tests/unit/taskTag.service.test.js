// tests/unit/taskTag.service.test.js

jest.mock('../../repositories/taskTag.repository');

const taskTagRepo = require('../../repositories/taskTag.repository');
const taskTagService = require('../../services/taskTag.service');

describe('🔹 TaskTag Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTagToTask', () => {
    it('❌ throws if taskId missing', async () => {
      await expect(taskTagService.addTagToTask(null, 't1')).rejects.toThrow('Thiếu taskId hoặc tagId');
      await expect(taskTagService.addTagToTask('task1', null)).rejects.toThrow('Thiếu taskId hoặc tagId');
    });

    it('✅ updates existing tag when found', async () => {
      const existing = { task_id: 'task1', tag_id: 'old', save: jest.fn().mockResolvedValue(true) };
      taskTagRepo.findOne.mockResolvedValue(existing);

      const res = await taskTagService.addTagToTask('task1', 'tag2');

      expect(taskTagRepo.findOne).toHaveBeenCalledWith({ task_id: 'task1' });
      expect(existing.save).toHaveBeenCalled();
      expect(existing.tag_id).toBe('tag2');
      expect(res).toEqual({ message: 'Đã cập nhật tag cho task', data: existing });
    });

    it('❌ propagates error when save fails', async () => {
      const existing = { task_id: 'task1', tag_id: 'old', save: jest.fn().mockRejectedValue(new Error('save fail')) };
      taskTagRepo.findOne.mockResolvedValue(existing);

      await expect(taskTagService.addTagToTask('task1', 'tag2')).rejects.toThrow('save fail');
      expect(taskTagRepo.create).not.toHaveBeenCalled();
    });

    it('✅ creates new taskTag when not exists', async () => {
      taskTagRepo.findOne.mockResolvedValue(null);
      const created = { id: 'tt1', task_id: 'task1', tag_id: 'tag1' };
      taskTagRepo.create.mockResolvedValue(created);

      const res = await taskTagService.addTagToTask('task1', 'tag1');

      expect(taskTagRepo.findOne).toHaveBeenCalledWith({ task_id: 'task1' });
      expect(taskTagRepo.create).toHaveBeenCalledWith({ task_id: 'task1', tag_id: 'tag1' });
      expect(res).toEqual({ message: 'Đã thêm tag mới cho task', data: created });
    });

    it('❌ propagates error when create fails', async () => {
      taskTagRepo.findOne.mockResolvedValue(null);
      taskTagRepo.create.mockRejectedValue(new Error('create fail'));

      await expect(taskTagService.addTagToTask('task1', 'tag1')).rejects.toThrow('create fail');
    });

    it('❌ throws when existing object missing save method (defensive)', async () => {
      // If repo returns plain object without save, code will throw when calling save
      const existing = { task_id: 'task1', tag_id: 'old' };
      taskTagRepo.findOne.mockResolvedValue(existing);

      await expect(taskTagService.addTagToTask('task1', 'tag2')).rejects.toThrow();
    });
  });

  describe('getTagsByTask', () => {
    it('✅ returns tags array', async () => {
      const tags = [{ id: 't1', tag_id: 'tag1' }];
      taskTagRepo.findByTaskId.mockResolvedValue(tags);

      const res = await taskTagService.getTagsByTask('task1');
      expect(taskTagRepo.findByTaskId).toHaveBeenCalledWith('task1');
      expect(res).toBe(tags);
    });

    it('❌ propagates repository error', async () => {
      taskTagRepo.findByTaskId.mockRejectedValue(new Error('repo fail'));
      await expect(taskTagService.getTagsByTask('task1')).rejects.toThrow('repo fail');
    });
  });

  describe('getTasksByTag', () => {
    it('✅ returns tasks array', async () => {
      const tasks = [{ id: 'tt1', task_id: 'task1' }];
      taskTagRepo.findByTagId.mockResolvedValue(tasks);

      const res = await taskTagService.getTasksByTag('tag1');
      expect(taskTagRepo.findByTagId).toHaveBeenCalledWith('tag1');
      expect(res).toBe(tasks);
    });

    it('❌ propagates repo error', async () => {
      taskTagRepo.findByTagId.mockRejectedValue(new Error('repo fail'));
      await expect(taskTagService.getTasksByTag('tag1')).rejects.toThrow('repo fail');
    });
  });

  describe('removeTagFromTask', () => {
    it('✅ calls deleteByTaskAndTag and returns result', async () => {
      taskTagRepo.deleteByTaskAndTag.mockResolvedValue({ deletedCount: 1 });

      const res = await taskTagService.removeTagFromTask('task1', 'tag1');
      expect(taskTagRepo.deleteByTaskAndTag).toHaveBeenCalledWith('task1', 'tag1');
      expect(res).toEqual({ deletedCount: 1 });
    });

    it('❌ propagates repo error', async () => {
      taskTagRepo.deleteByTaskAndTag.mockRejectedValue(new Error('del fail'));
      await expect(taskTagService.removeTagFromTask('task1', 'tag1')).rejects.toThrow('del fail');
    });
  });

  describe('removeAllTagsOfTask', () => {
    it('✅ calls deleteByTaskId and returns result', async () => {
      taskTagRepo.deleteByTaskId.mockResolvedValue({ deletedCount: 2 });

      const res = await taskTagService.removeAllTagsOfTask('task1');
      expect(taskTagRepo.deleteByTaskId).toHaveBeenCalledWith('task1');
      expect(res).toEqual({ deletedCount: 2 });
    });

    it('❌ propagates repo error', async () => {
      taskTagRepo.deleteByTaskId.mockRejectedValue(new Error('del fail'));
      await expect(taskTagService.removeAllTagsOfTask('task1')).rejects.toThrow('del fail');
    });
  });

  describe('removeAllTasksOfTag', () => {
    it('✅ calls deleteByTagId and returns result', async () => {
      taskTagRepo.deleteByTagId.mockResolvedValue({ deletedCount: 3 });

      const res = await taskTagService.removeAllTasksOfTag('tag1');
      expect(taskTagRepo.deleteByTagId).toHaveBeenCalledWith('tag1');
      expect(res).toEqual({ deletedCount: 3 });
    });

    it('❌ propagates repo error', async () => {
      taskTagRepo.deleteByTagId.mockRejectedValue(new Error('del fail'));
      await expect(taskTagService.removeAllTasksOfTag('tag1')).rejects.toThrow('del fail');
    });
  });
});

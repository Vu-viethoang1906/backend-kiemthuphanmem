// 📄 tests/unit/comment.service.test.js - Comment Service Unit Tests
const mongoose = require('mongoose');

// Mock dependencies BEFORE requiring the service
// Order matters: mock TaskService first to prevent require chain issues with bcrypt
jest.mock('../../services/task.service', () => ({
  getTasksByBoard: jest.fn(),
}));

jest.mock('../../repositories/comment.repository');
jest.mock('../../repositories/task.repository');
jest.mock('../../repositories/user.repository');
jest.mock('../../repositories/board.repository');
jest.mock('../../services/notification.service');
jest.mock('../../config/sendNotify', () => ({
  sendMailToUser: jest.fn(),
}));
jest.mock('../../config/socket', () => ({
  sendNotification: jest.fn(),
}));
jest.mock('../../models/comment.model', () => ({
  find: jest.fn(),
}));
jest.mock('../../models/usersModel', () => ({
  find: jest.fn(),
}));
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Now require the service after all mocks are set up
const CommentService = require('../../services/comment.service');
const commentRepo = require('../../repositories/comment.repository');
const taskRepo = require('../../repositories/task.repository');
const userRepo = require('../../repositories/user.repository');
const boardRepo = require('../../repositories/board.repository');
const notificationService = require('../../services/notification.service');
const TaskService = require('../../services/task.service');
const { sendMailToUser } = require('../../config/sendNotify');
const { sendNotification } = require('../../config/socket');
const Comment = require('../../models/comment.model');
const User = require('../../models/usersModel');

describe('🔹 Comment Service Unit Tests', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockTaskId = new mongoose.Types.ObjectId();
  const mockCommentId = new mongoose.Types.ObjectId();
  const mockBoardId = new mongoose.Types.ObjectId();
  const mockAssignedUserId = new mongoose.Types.ObjectId();
  const mockUserTagId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    const mockTask = {
      _id: mockTaskId,
      title: 'Test Task',
      board_id: mockBoardId,
      assigned_to: { _id: mockAssignedUserId },
    };

    const mockUser = {
      _id: mockUserId,
      full_name: 'Test User',
    };

    const mockBoard = {
      _id: mockBoardId,
      title: 'Test Board',
    };

    const mockComment = {
      _id: mockCommentId,
      task_id: mockTaskId,
      user_id: mockUserId,
      content: 'Test comment',
    };

    it('✅ should create comment successfully', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      userRepo.findById.mockResolvedValue(mockUser);
      commentRepo.create.mockResolvedValue(mockComment);
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      const result = await CommentService.createComment({
        task_id: mockTaskId.toString(),
        user_id: mockUserId.toString(),
        content: 'Test comment',
      });

      expect(taskRepo.findById).toHaveBeenCalledWith(mockTaskId.toString());
      expect(commentRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockComment);
    });

    it('✅ should throw error when task_id is missing', async () => {
      await expect(
        CommentService.createComment({
          user_id: mockUserId.toString(),
          content: 'Test comment',
        })
      ).rejects.toThrow('task_id, user_id và content là bắt buộc');
    });

    it('✅ should throw error when user_id is missing', async () => {
      await expect(
        CommentService.createComment({
          task_id: mockTaskId.toString(),
          content: 'Test comment',
        })
      ).rejects.toThrow('task_id, user_id và content là bắt buộc');
    });

    it('✅ should throw error when content is missing', async () => {
      await expect(
        CommentService.createComment({
          task_id: mockTaskId.toString(),
          user_id: mockUserId.toString(),
        })
      ).rejects.toThrow('task_id, user_id và content là bắt buộc');
    });

    it('✅ should throw error when task_id is invalid', async () => {
      await expect(
        CommentService.createComment({
          task_id: 'invalid-id',
          user_id: mockUserId.toString(),
          content: 'Test comment',
        })
      ).rejects.toThrow('task_id không hợp lệ');
    });

    it('✅ should throw error when user_id is invalid', async () => {
      await expect(
        CommentService.createComment({
          task_id: mockTaskId.toString(),
          user_id: 'invalid-id',
          content: 'Test comment',
        })
      ).rejects.toThrow('user_id không hợp lệ');
    });

    it('✅ should throw error when content is empty', async () => {
      await expect(
        CommentService.createComment({
          task_id: mockTaskId.toString(),
          user_id: mockUserId.toString(),
          content: '   ',
        })
      ).rejects.toThrow('Nội dung comment không được để trống');
    });

    it('✅ should throw error when task does not exist', async () => {
      taskRepo.findById.mockResolvedValue(null);

      await expect(
        CommentService.createComment({
          task_id: mockTaskId.toString(),
          user_id: mockUserId.toString(),
          content: 'Test comment',
        })
      ).rejects.toThrow('Task không tồn tại');
    });

    it('✅ should validate user_tag_id when provided', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      userRepo.findById
        .mockResolvedValueOnce(mockUser) // For user_tag_id
        .mockResolvedValueOnce(mockUser); // For user_id
      commentRepo.create.mockResolvedValue(mockComment);
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      await CommentService.createComment({
        task_id: mockTaskId.toString(),
        user_id: mockUserId.toString(),
        content: 'Test comment',
        user_tag_id: mockUserTagId.toString(),
      });

      expect(userRepo.findById).toHaveBeenCalledWith(mockUserTagId.toString());
    });

    it('✅ should throw error when user_tag_id is invalid', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);

      await expect(
        CommentService.createComment({
          task_id: mockTaskId.toString(),
          user_id: mockUserId.toString(),
          content: 'Test comment',
          user_tag_id: 'invalid-id',
        })
      ).rejects.toThrow('user_tag_id không hợp lệ');
    });

    it('✅ should throw error when tagged user does not exist', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      userRepo.findById.mockResolvedValue(null);

      await expect(
        CommentService.createComment({
          task_id: mockTaskId.toString(),
          user_id: mockUserId.toString(),
          content: 'Test comment',
          user_tag_id: mockUserTagId.toString(),
        })
      ).rejects.toThrow('Người dùng được tag không tồn tại');
    });

    it('✅ should send email and notification to assigned user', async () => {
      taskRepo.findById
        .mockResolvedValueOnce(mockTask) // First call in validation
        .mockResolvedValueOnce(mockTask); // Second call for notification
      userRepo.findById.mockResolvedValue(mockUser);
      commentRepo.create.mockResolvedValue(mockComment);
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});
      sendMailToUser.mockResolvedValue();

      await CommentService.createComment({
        task_id: mockTaskId.toString(),
        user_id: mockUserId.toString(),
        content: 'Test comment',
      });

      expect(sendMailToUser).toHaveBeenCalledWith(
        mockAssignedUserId,
        expect.stringContaining('bình luận'),
        expect.any(String)
      );
      expect(notificationService.createNotification).toHaveBeenCalled();
      expect(sendNotification).toHaveBeenCalled();
    });

    it('✅ should not send notification when commenter is assigned user', async () => {
      const taskWithSameUser = {
        ...mockTask,
        assigned_to: { _id: mockUserId },
      };

      taskRepo.findById
        .mockResolvedValueOnce(taskWithSameUser)
        .mockResolvedValueOnce(taskWithSameUser);
      userRepo.findById.mockResolvedValue(mockUser);
      commentRepo.create.mockResolvedValue(mockComment);

      await CommentService.createComment({
        task_id: mockTaskId.toString(),
        user_id: mockUserId.toString(),
        content: 'Test comment',
      });

      expect(sendMailToUser).not.toHaveBeenCalled();
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('✅ should trim content', async () => {
      taskRepo.findById.mockResolvedValue(mockTask);
      userRepo.findById.mockResolvedValue(mockUser);
      commentRepo.create.mockResolvedValue(mockComment);
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      await CommentService.createComment({
        task_id: mockTaskId.toString(),
        user_id: mockUserId.toString(),
        content: '  Test comment  ',
      });

      expect(commentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Test comment',
        })
      );
    });
  });

  describe('getCommentsByTask', () => {
    it('✅ should return comments for task', async () => {
      const mockComments = [
        { _id: mockCommentId, content: 'Comment 1' },
        { _id: new mongoose.Types.ObjectId(), content: 'Comment 2' },
      ];

      taskRepo.findById.mockResolvedValue({ _id: mockTaskId });
      commentRepo.findByTaskId.mockResolvedValue(mockComments);

      const result = await CommentService.getCommentsByTask(mockTaskId.toString());

      expect(taskRepo.findById).toHaveBeenCalledWith(mockTaskId.toString());
      expect(commentRepo.findByTaskId).toHaveBeenCalledWith(mockTaskId.toString());
      expect(result).toEqual(mockComments);
    });

    it('✅ should throw error when taskId is invalid', async () => {
      await expect(CommentService.getCommentsByTask('invalid-id')).rejects.toThrow(
        'ID task không hợp lệ'
      );
    });

    it('✅ should throw error when task does not exist', async () => {
      taskRepo.findById.mockResolvedValue(null);

      await expect(CommentService.getCommentsByTask(mockTaskId.toString())).rejects.toThrow(
        'Task không tồn tại'
      );
    });
  });

  describe('getCommentById', () => {
    it('✅ should return comment by id', async () => {
      const mockComment = {
        _id: mockCommentId,
        content: 'Test comment',
      };

      commentRepo.findById.mockResolvedValue(mockComment);

      const result = await CommentService.getCommentById(mockCommentId.toString());

      expect(commentRepo.findById).toHaveBeenCalledWith(mockCommentId.toString());
      expect(result).toEqual(mockComment);
    });

    it('✅ should throw error when id is invalid', async () => {
      await expect(CommentService.getCommentById('invalid-id')).rejects.toThrow(
        'ID comment không hợp lệ'
      );
    });
  });

  describe('updateComment', () => {
    const mockExistingComment = {
      _id: mockCommentId,
      user_id: mockUserId,
      task_id: mockTaskId,
      content: 'Original comment',
    };

    const mockTask = {
      _id: mockTaskId,
      title: 'Test Task',
      board_id: mockBoardId,
      assigned_to: { _id: mockAssignedUserId },
    };

    const mockUser = {
      _id: mockUserId,
      full_name: 'Test User',
    };

    const mockBoard = {
      _id: mockBoardId,
      title: 'Test Board',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('✅ should update comment successfully', async () => {
      const updateData = { content: 'Updated comment' };
      const mockUpdatedComment = {
        ...mockExistingComment,
        ...updateData,
      };

      commentRepo.findById
        .mockResolvedValueOnce(mockExistingComment) // Check comment exists
        .mockResolvedValueOnce(mockExistingComment); // For notification
      commentRepo.update.mockResolvedValue(mockUpdatedComment);
      taskRepo.findById.mockResolvedValue(mockTask);
      userRepo.findById.mockResolvedValue(mockUser);
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      const result = await CommentService.updateComment(
        mockCommentId.toString(),
        updateData,
        mockUserId.toString()
      );

      expect(commentRepo.update).toHaveBeenCalledWith(mockCommentId.toString(), updateData);
      expect(result).toEqual(mockUpdatedComment);
    });

    it('✅ should throw error when id is invalid', async () => {
      await expect(
        CommentService.updateComment('invalid-id', {}, mockUserId.toString())
      ).rejects.toThrow('ID comment không hợp lệ');
    });

    it('✅ should throw error when userId is invalid', async () => {
      await expect(
        CommentService.updateComment(mockCommentId.toString(), {}, 'invalid-id')
      ).rejects.toThrow('user_id không hợp lệ');
    });

    it('✅ should throw error when content is empty', async () => {
      await expect(
        CommentService.updateComment(
          mockCommentId.toString(),
          { content: '   ' },
          mockUserId.toString()
        )
      ).rejects.toThrow('Nội dung comment không được để trống');
    });

    it('✅ should throw error when comment does not exist', async () => {
      commentRepo.findById.mockReset();
      commentRepo.findById.mockResolvedValue(null);

      await expect(
        CommentService.updateComment(
          mockCommentId.toString(),
          { content: 'Updated' },
          mockUserId.toString()
        )
      ).rejects.toThrow('Comment không tồn tại');

      expect(commentRepo.findById).toHaveBeenCalledWith(mockCommentId.toString());
      expect(commentRepo.update).not.toHaveBeenCalled();
    });

    it('✅ should throw error when user does not have permission', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      commentRepo.findById.mockReset();
      commentRepo.findById.mockResolvedValue(mockExistingComment);

      await expect(
        CommentService.updateComment(
          mockCommentId.toString(),
          { content: 'Updated' },
          otherUserId.toString()
        )
      ).rejects.toThrow('Bạn không có quyền chỉnh sửa comment này');

      expect(commentRepo.findById).toHaveBeenCalledWith(mockCommentId.toString());
      expect(commentRepo.update).not.toHaveBeenCalled();
    });

    it('✅ should handle user_id as object', async () => {
      const commentWithObjectUserId = {
        ...mockExistingComment,
        user_id: { _id: mockUserId },
      };
      const updateData = { content: 'Updated comment' };
      const mockUpdatedComment = { ...commentWithObjectUserId, ...updateData };

      commentRepo.findById
        .mockResolvedValueOnce(commentWithObjectUserId)
        .mockResolvedValueOnce(commentWithObjectUserId);
      commentRepo.update.mockResolvedValue(mockUpdatedComment);
      taskRepo.findById.mockResolvedValue(mockTask);
      userRepo.findById.mockResolvedValue(mockUser);
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      const result = await CommentService.updateComment(
        mockCommentId.toString(),
        updateData,
        mockUserId.toString()
      );

      expect(result).toEqual(mockUpdatedComment);
    });

    it('✅ should send notification when updating comment', async () => {
      commentRepo.findById
        .mockResolvedValueOnce(mockExistingComment)
        .mockResolvedValueOnce(mockExistingComment);
      commentRepo.update.mockResolvedValue(mockExistingComment);
      taskRepo.findById.mockResolvedValue(mockTask);
      userRepo.findById.mockResolvedValue(mockUser);
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      await CommentService.updateComment(
        mockCommentId.toString(),
        { content: 'Updated' },
        mockUserId.toString()
      );

      expect(notificationService.createNotification).toHaveBeenCalled();
      expect(sendNotification).toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    const mockExistingComment = {
      _id: mockCommentId,
      user_id: mockUserId,
      task_id: mockTaskId,
      content: 'Comment to delete',
    };

    const mockTask = {
      _id: mockTaskId,
      title: 'Test Task',
      board_id: mockBoardId,
      assigned_to: { _id: mockAssignedUserId },
    };

    const mockUser = {
      _id: mockUserId,
      full_name: 'Test User',
    };

    const mockBoard = {
      _id: mockBoardId,
      title: 'Test Board',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('✅ should delete comment successfully', async () => {
      const mockDeletedComment = {
        ...mockExistingComment,
        deleted_at: new Date(),
      };

      commentRepo.findById.mockResolvedValue(mockExistingComment);
      commentRepo.softDelete.mockResolvedValue(mockDeletedComment);
      taskRepo.findById.mockResolvedValue(mockTask);
      userRepo.findById.mockResolvedValue(mockUser);
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      const result = await CommentService.deleteComment(
        mockCommentId.toString(),
        mockUserId.toString()
      );

      expect(commentRepo.softDelete).toHaveBeenCalledWith(mockCommentId.toString());
      expect(result).toEqual(mockDeletedComment);
    });

    it('✅ should throw error when id is invalid', async () => {
      await expect(
        CommentService.deleteComment('invalid-id', mockUserId.toString())
      ).rejects.toThrow('ID comment không hợp lệ');
    });

    it('✅ should throw error when userId is invalid', async () => {
      await expect(
        CommentService.deleteComment(mockCommentId.toString(), 'invalid-id')
      ).rejects.toThrow('user_id không hợp lệ');
    });

    it('✅ should throw error when comment does not exist', async () => {
      commentRepo.findById.mockReset();
      commentRepo.findById.mockResolvedValue(null);

      await expect(
        CommentService.deleteComment(mockCommentId.toString(), mockUserId.toString())
      ).rejects.toThrow('Comment không tồn tại');

      expect(commentRepo.findById).toHaveBeenCalledWith(mockCommentId.toString());
      expect(commentRepo.softDelete).not.toHaveBeenCalled();
    });

    it('✅ should throw error when user does not have permission', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      commentRepo.findById.mockReset();
      commentRepo.findById.mockResolvedValue(mockExistingComment);

      await expect(
        CommentService.deleteComment(mockCommentId.toString(), otherUserId.toString())
      ).rejects.toThrow('Bạn không có quyền chỉnh sửa comment này');

      expect(commentRepo.findById).toHaveBeenCalledWith(mockCommentId.toString());
      expect(commentRepo.softDelete).not.toHaveBeenCalled();
    });

    it('✅ should send notification when deleting comment', async () => {
      commentRepo.findById.mockResolvedValue(mockExistingComment);
      commentRepo.softDelete.mockResolvedValue(mockExistingComment);
      taskRepo.findById.mockResolvedValue(mockTask);
      userRepo.findById.mockResolvedValue(mockUser);
      boardRepo.findById.mockResolvedValue(mockBoard);
      notificationService.createNotification.mockResolvedValue({});

      await CommentService.deleteComment(mockCommentId.toString(), mockUserId.toString());

      expect(notificationService.createNotification).toHaveBeenCalled();
      expect(sendNotification).toHaveBeenCalled();
    });
  });

  describe('getCommentsByUser', () => {
    it('✅ should return comments by user', async () => {
      const mockComments = [{ _id: mockCommentId, user_id: mockUserId, content: 'Comment 1' }];

      commentRepo.findByUserId.mockResolvedValue(mockComments);

      const result = await CommentService.getCommentsByUser(mockUserId.toString());

      expect(commentRepo.findByUserId).toHaveBeenCalledWith(mockUserId.toString());
      expect(result).toEqual(mockComments);
    });

    it('✅ should throw error when userId is invalid', async () => {
      await expect(CommentService.getCommentsByUser('invalid-id')).rejects.toThrow(
        'user_id không hợp lệ'
      );
    });
  });

  describe('addAttachment', () => {
    const mockComment = {
      _id: mockCommentId,
      attachments: [],
    };

    const mockFile = {
      originalname: 'test.pdf',
      filename: 'test-123.pdf',
      size: 1024,
      mimetype: 'application/pdf',
    };

    it('✅ should add attachment to comment', async () => {
      commentRepo.findById.mockResolvedValue(mockComment);
      commentRepo.update.mockResolvedValue({
        ...mockComment,
        attachments: [
          {
            original_name: mockFile.originalname,
            stored_name: mockFile.filename,
            size: mockFile.size,
            mime_type: mockFile.mimetype,
            uploaded_by: mockUserId,
            uploaded_at: expect.any(Date),
            url: expect.stringContaining('uploads'),
          },
        ],
      });

      const result = await CommentService.addAttachment(
        mockCommentId.toString(),
        mockFile,
        mockUserId.toString()
      );

      expect(commentRepo.findById).toHaveBeenCalledWith(mockCommentId.toString());
      expect(commentRepo.update).toHaveBeenCalled();
      expect(result).toHaveProperty('original_name', mockFile.originalname);
      expect(result).toHaveProperty('stored_name', mockFile.filename);
    });

    it('✅ should throw error when commentId is invalid', async () => {
      await expect(
        CommentService.addAttachment('invalid-id', mockFile, mockUserId.toString())
      ).rejects.toThrow('Comment ID không hợp lệ');
    });

    it('✅ should throw error when comment does not exist', async () => {
      commentRepo.findById.mockResolvedValue(null);

      await expect(
        CommentService.addAttachment(mockCommentId.toString(), mockFile, mockUserId.toString())
      ).rejects.toThrow('Comment không tồn tại');
    });
  });

  describe('getAttachments', () => {
    it('✅ should return attachments for comment', async () => {
      const mockAttachments = [
        {
          original_name: 'test.pdf',
          stored_name: 'test-123.pdf',
          size: 1024,
        },
      ];

      const mockComment = {
        _id: mockCommentId,
        attachments: mockAttachments,
      };

      commentRepo.findById.mockResolvedValue(mockComment);

      const result = await CommentService.getAttachments(mockCommentId.toString());

      expect(commentRepo.findById).toHaveBeenCalledWith(mockCommentId.toString());
      expect(result).toEqual(mockAttachments);
    });

    it('✅ should return empty array when comment has no attachments', async () => {
      const mockComment = {
        _id: mockCommentId,
        attachments: [],
      };

      commentRepo.findById.mockResolvedValue(mockComment);

      const result = await CommentService.getAttachments(mockCommentId.toString());

      expect(result).toEqual([]);
    });

    it('✅ should return empty array when attachments is undefined', async () => {
      const mockComment = {
        _id: mockCommentId,
      };

      commentRepo.findById.mockResolvedValue(mockComment);

      const result = await CommentService.getAttachments(mockCommentId.toString());

      expect(result).toEqual([]);
    });

    it('✅ should throw error when comment does not exist', async () => {
      commentRepo.findById.mockResolvedValue(null);

      await expect(CommentService.getAttachments(mockCommentId.toString())).rejects.toThrow(
        'Comment không tồn tại'
      );
    });
  });

  describe('deleteAttachment', () => {
    const mockComment = {
      _id: mockCommentId,
      attachments: [
        {
          original_name: 'test.pdf',
          stored_name: 'test-123.pdf',
          uploaded_by: mockUserId,
        },
      ],
    };

    // Get mocked fs
    const mockedFs = require('fs');

    it('✅ should delete attachment successfully', async () => {
      commentRepo.findById.mockResolvedValue(mockComment);
      mockedFs.existsSync.mockReturnValue(true);
      commentRepo.update.mockResolvedValue({
        ...mockComment,
        attachments: [],
      });

      const result = await CommentService.deleteAttachment(
        mockCommentId.toString(),
        0,
        mockUserId.toString()
      );

      expect(commentRepo.findById).toHaveBeenCalledWith(mockCommentId.toString());
      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(commentRepo.update).toHaveBeenCalledWith(mockCommentId.toString(), {
        attachments: [],
      });
      expect(result).toEqual({ success: true, message: 'Xóa file đính kèm thành công' });
    });

    it('✅ should throw error when commentId is invalid', async () => {
      await expect(
        CommentService.deleteAttachment('invalid-id', 0, mockUserId.toString())
      ).rejects.toThrow('Comment ID không hợp lệ');
    });

    it('✅ should throw error when comment does not exist', async () => {
      commentRepo.findById.mockResolvedValue(null);

      await expect(
        CommentService.deleteAttachment(mockCommentId.toString(), 0, mockUserId.toString())
      ).rejects.toThrow('Comment không tồn tại');
    });

    it('✅ should throw error when attachment index is invalid', async () => {
      commentRepo.findById.mockResolvedValue(mockComment);

      await expect(
        CommentService.deleteAttachment(mockCommentId.toString(), 10, mockUserId.toString())
      ).rejects.toThrow('Attachment không tồn tại');
    });

    it('✅ should handle file not existing', async () => {
      const commentWithAttachment = {
        ...mockComment,
        attachments: [
          {
            original_name: 'test.pdf',
            stored_name: 'test-123.pdf',
            uploaded_by: mockUserId,
          },
        ],
      };

      commentRepo.findById.mockReset();
      commentRepo.findById.mockResolvedValue(commentWithAttachment);
      mockedFs.existsSync.mockReturnValue(false);
      commentRepo.update.mockResolvedValue({
        ...commentWithAttachment,
        attachments: [],
      });

      const result = await CommentService.deleteAttachment(
        mockCommentId.toString(),
        0,
        mockUserId.toString()
      );

      expect(commentRepo.findById).toHaveBeenCalledWith(mockCommentId.toString());
      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
      expect(commentRepo.update).toHaveBeenCalledWith(mockCommentId.toString(), {
        attachments: [],
      });
      expect(result).toEqual({ success: true, message: 'Xóa file đính kèm thành công' });
    });
  });

  describe('getCollaborationByBoard', () => {
    const mockTasks = [
      {
        _id: mockTaskId,
        assigned_to: { _id: mockUserId },
      },
    ];

    const mockComments = [
      {
        _id: mockCommentId,
        task_id: mockTaskId,
        user_id: { _id: mockUserId },
        created_at: new Date(),
      },
    ];

    beforeEach(() => {
      TaskService.getTasksByBoard = jest.fn().mockResolvedValue({
        tasks: mockTasks,
      });
      Comment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockComments),
            }),
          }),
        }),
      });
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: mockUserId,
              username: 'testuser',
              full_name: 'Test User',
              email: 'test@example.com',
            },
          ]),
        }),
      });
    });

    it('✅ should return collaboration data for board', async () => {
      const result = await CommentService.getCollaborationByBoard(mockBoardId.toString());

      expect(TaskService.getTasksByBoard).toHaveBeenCalledWith(mockBoardId.toString(), {
        limit: 99999,
      });
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('graph');
      expect(result).toHaveProperty('collaborationMetrics');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('groupAnalysis');
    });

    it('✅ should calculate collaboration metrics correctly', async () => {
      const result = await CommentService.getCollaborationByBoard(mockBoardId.toString());

      expect(result.collaborationMetrics).toBeInstanceOf(Array);
      expect(result.summary).toHaveProperty('totalUsers');
      expect(result.summary).toHaveProperty('totalComments');
    });

    it('✅ should handle empty tasks and comments', async () => {
      TaskService.getTasksByBoard.mockResolvedValue({ tasks: [] });
      Comment.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await CommentService.getCollaborationByBoard(mockBoardId.toString());

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.collaborationMetrics).toEqual([]);
    });
  });
});

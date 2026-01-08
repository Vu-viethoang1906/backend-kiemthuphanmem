const commentRepo = require('../repositories/comment.repository');
const taskRepo = require('../repositories/task.repository');
const mongoose = require('mongoose');
const userRepo = require('../repositories/user.repository');
const { sendMailToUser } = require('../config/sendNotify');
const boardRepo = require('../repositories/board.repository');
const notificationService = require('../services/notification.service');
const { sendNotification } = require('../config/socket');
const TaskService = require('./task.service');
const Comment = require('../models/comment.model');
class CommentService {
  // Tạo comment mới
  async createComment({ task_id, user_id, content, user_tag_id, collaborations }) {
    try {
      // Validate input
      if (!task_id || !user_id || !content) {
        throw new Error('task_id, user_id và content là bắt buộc');
      }

      if (!mongoose.Types.ObjectId.isValid(task_id)) {
        throw new Error('task_id không hợp lệ');
      }

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new Error('user_id không hợp lệ');
      }

      if (content.trim() === '') {
        throw new Error('Nội dung comment không được để trống');
      }

      // Kiểm tra task tồn tại
      const task = await taskRepo.findById(task_id);
      if (!task) {
        throw new Error('Task không tồn tại');
      }

      if (user_tag_id) {
        if (!mongoose.Types.ObjectId.isValid(user_tag_id)) {
          throw new Error('user_tag_id không hợp lệ');
        }
        const userTag = await userRepo.findById(user_tag_id);
        if (!userTag) {
          throw new Error('Người dùng được tag không tồn tại');
        }
      }
      if (collaborations) {
        if (!mongoose.Types.ObjectId.isValid(collaborations)) {
          throw new Error('collaborations không hợp lệ');
        }
        const Collaboration = await commentRepo.findById(collaborations);
        if (!Collaboration) {
          throw new Error('Collaboration không tồn tại');
        }
      }

      // Tạo comment

      const commentData = {
        task_id,
        user_id,
        content: content.trim(),
        user_tag_id: user_tag_id || null,
        Collaboration: collaborations || null, // Sử dụng Collaboration (chữ hoa) để match với model
      };
      const comment = await commentRepo.create(commentData);
      const UserComment = await userRepo.findById(user_id);
      const full_name = UserComment.full_name;

      // tìm người được giao để gửi mail và notification
      const taskComment = await taskRepo.findById(task_id);

      if (taskComment) {
        const idBoard = taskComment.board_id.toString();
        const board = await boardRepo.findById(idBoard);
        const idUser = taskComment.assigned_to?._id;

        if (idUser) {
          const idString = idUser.toString() || '';
          const asignTo = await userRepo.findById(idUser);

          // Chỉ gửi nếu người comment không phải là người được assign
          if (asignTo && idString !== user_id.toString()) {
            // 1️⃣ Gửi email
            const subject = 'Bạn vừa được bình luận';
            const html = `
                          <h3>Xin chào!</h3>
                          <p> <b>${full_name} đã bình luận trong task bạn được giao</b>.</p>
                          <p><b>${full_name} đã bình luận</b> trong task :<b>${
                            taskComment.title
                          }</b> của bảng <b>${board.title}</b>
                          <p><b>${content.trim()} </b></b>
                          <p>Cảm ơn bạn đã đọc.</p>
                          <p>— CodeGym Team</p>
                        `;
            await sendMailToUser(idUser, subject, html);

            // 2️⃣ Tạo notification trong database
            const notificationMessage = `${full_name} đã bình luận trong task "${taskComment.title}"`;
            const a = await notificationService.createNotification({
              user_id: idString,
              title: 'Bình luận mới',
              body: notificationMessage,
              type: 'comment_created',
              board_id: idBoard,
              task_id: task_id,
            });

            // 3️⃣ Gửi real-time qua Socket
            sendNotification(
              'comment_created',
              {
                message: notificationMessage,
                comment_id: comment._id,
                task_id: task_id,
                task_title: taskComment.title,
                board_id: idBoard,
                board_name: board.title,
                commented_by: full_name,
                commented_by_id: user_id.toString(),
                content: content.trim(),
                timestamp: new Date().toISOString(),
              },
              idString
            );
          }
        }
      }

      return comment;
    } catch (error) {
      throw error;
    }
  }

  // Lấy comments của task
  async getCommentsByTask(taskId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new Error('ID task không hợp lệ');
      }

      // Kiểm tra task tồn tại
      const task = await taskRepo.findById(taskId);
      if (!task) {
        throw new Error('Task không tồn tại');
      }

      const comments = await commentRepo.findByTaskId(taskId);
      return comments;
    } catch (error) {
      throw error;
    }
  }

  // Lấy comment theo ID
  async getCommentById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID comment không hợp lệ');
      }

      const comment = await commentRepo.findById(id);
      return comment;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật comment
  async updateComment(id, updateData, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID comment không hợp lệ');
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('user_id không hợp lệ');
      }

      // Validate input
      if (updateData.content && updateData.content.trim() === '') {
        throw new Error('Nội dung comment không được để trống');
      }

      // Kiểm tra comment tồn tại và user có quyền chỉnh sửa
      const existingComment = await commentRepo.findById(id);

      if (!existingComment) {
        throw new Error('Comment không tồn tại');
      }

      const commentUserId =
        typeof existingComment.user_id === 'object'
          ? existingComment.user_id._id
          : existingComment.user_id;

      if (commentUserId.toString() !== userId.toString()) {
        throw new Error('Bạn không có quyền chỉnh sửa comment này');
      }

      const updatedComment = await commentRepo.update(id, updateData);

      // Gửi notification cho người được assign task
      try {
        const task = await taskRepo.findById(existingComment.task_id);
        if (task && task.assigned_to?._id) {
          const assignedUserId = task.assigned_to._id.toString();

          // Chỉ gửi nếu người update không phải là người được assign
          if (assignedUserId !== userId.toString()) {
            const user = await userRepo.findById(userId);
            const board = await boardRepo.findById(task.board_id.toString());
            const notificationMessage = `${user.full_name} đã cập nhật bình luận trong task "${task.title}"`;

            // Tạo notification trong database
            await notificationService.createNotification({
              user_id: assignedUserId,
              title: 'Bình luận được cập nhật',
              body: notificationMessage,
              type: 'comment_updated',
              board_id: task.board_id.toString(),
              task_id: task._id.toString(),
            });

            // Gửi real-time qua Socket
            sendNotification(
              'comment_updated',
              {
                message: notificationMessage,
                comment_id: id,
                task_id: task._id.toString(),
                task_title: task.title,
                board_id: task.board_id.toString(),
                board_name: board.title,
                updated_by: user.full_name,
                updated_by_id: userId.toString(),
                timestamp: new Date().toISOString(),
              },
              assignedUserId
            );
          }
        }
      } catch (notifError) {
        console.error('❌ Lỗi khi gửi notification:', notifError);
      }

      return updatedComment;
    } catch (error) {
      throw error;
    }
  }

  // Xóa comment
  async deleteComment(id, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID comment không hợp lệ');
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('user_id không hợp lệ');
      }

      // Kiểm tra comment tồn tại và user có quyền xóa
      const existingComment = await commentRepo.findById(id);
      if (!existingComment) {
        throw new Error('Comment không tồn tại');
      }

      const commentUserId =
        typeof existingComment.user_id === 'object'
          ? existingComment.user_id._id
          : existingComment.user_id;

      if (commentUserId.toString() !== userId.toString()) {
        throw new Error('Bạn không có quyền chỉnh sửa comment này');
      }

      // Gửi notification trước khi xóa
      try {
        const task = await taskRepo.findById(existingComment.task_id);
        if (task && task.assigned_to?._id) {
          const assignedUserId = task.assigned_to._id.toString();

          // Chỉ gửi nếu người xóa không phải là người được assign
          if (assignedUserId !== userId.toString()) {
            const user = await userRepo.findById(userId);
            const board = await boardRepo.findById(task.board_id.toString());
            const notificationMessage = `${user.full_name} đã xóa bình luận trong task "${task.title}"`;

            // Tạo notification trong database
            await notificationService.createNotification({
              user_id: assignedUserId,
              title: 'Bình luận đã bị xóa',
              body: notificationMessage,
              type: 'comment_deleted',
              board_id: task.board_id.toString(),
              task_id: task._id.toString(),
            });

            // Gửi real-time qua Socket
            sendNotification(
              'comment_deleted',
              {
                message: notificationMessage,
                comment_id: id,
                task_id: task._id.toString(),
                task_title: task.title,
                board_id: task.board_id.toString(),
                board_name: board.title,
                deleted_by: user.full_name,
                deleted_by_id: userId.toString(),
                timestamp: new Date().toISOString(),
              },
              assignedUserId
            );
          }
        }
      } catch (notifError) {
        console.error('❌ Lỗi khi gửi notification:', notifError);
      }

      // Soft delete comment
      const deleted = await commentRepo.softDelete(id);
      return deleted;
    } catch (error) {
      throw error;
    }
  }

  // Lấy comments của user
  async getCommentsByUser(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('user_id không hợp lệ');
      }

      const comments = await commentRepo.findByUserId(userId);
      return comments;
    } catch (error) {
      throw error;
    }
  }

  async addAttachment(commentId, file, userId) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new Error('Comment ID không hợp lệ');
    }

    const comment = await commentRepo.findById(commentId);
    if (!comment) throw new Error('Comment không tồn tại');

    const attachment = {
      original_name: file.originalname,
      stored_name: file.filename,
      size: file.size,
      mime_type: file.mimetype,
      uploaded_by: userId,
      uploaded_at: new Date(),
      url: `/uploads/comments/${commentId}/${userId}/${file.filename}`,
    };

    comment.attachments = comment.attachments || [];
    comment.attachments.push(attachment);

    await commentRepo.update(commentId, { attachments: comment.attachments });

    return attachment;
  }

  async getAttachments(commentId) {
    const comment = await commentRepo.findById(commentId);
    if (!comment) throw new Error('Comment không tồn tại');
    return comment.attachments || [];
  }

  async deleteAttachment(commentId, attachmentIndex, userId) {
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new Error('Comment ID không hợp lệ');
    }

    const comment = await commentRepo.findById(commentId);
    if (!comment) throw new Error('Comment không tồn tại');

    const attachments = comment.attachments || [];

    if (attachmentIndex < 0 || attachmentIndex >= attachments.length) {
      throw new Error('Attachment không tồn tại');
    }

    const attachment = attachments[attachmentIndex];

    const fs = require('fs');
    const path = require('path');

    if (attachment.stored_name) {
      const filePath = path.join(
        __dirname,
        '../uploads/attachments/comments',
        commentId.toString(),
        attachment.uploaded_by.toString(),
        attachment.stored_name
      );

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Lỗi khi xóa file:', err);
        }
      }
    }

    // Xóa attachment khỏi array
    attachments.splice(attachmentIndex, 1);

    // Cập nhật comment
    await commentRepo.update(commentId, { attachments });

    return { success: true, message: 'Xóa file đính kèm thành công' };
  }

  async getCollaborationByBoard(boardId) {
    // 1. Lấy toàn bộ task của board
    const { tasks } = await TaskService.getTasksByBoard(boardId, { limit: 99999 });
    const taskIds = tasks.map(t => t._id.toString());

    // 2. Lấy toàn bộ comments
    const comments = await Comment.find({
      task_id: { $in: taskIds },
      deleted_at: null,
    })
      .populate('user_id', 'username full_name')
      .populate('user_tag_id', 'username full_name')
      .sort({ created_at: 1 })
      .lean();

    // 3. Graph = adjacency map
    const graph = {}; // graph[A][B] = score

    function addInteraction(a, b, points) {
      if (a === b) return;
      if (!graph[a]) graph[a] = {};
      if (!graph[b]) graph[b] = {};

      graph[a][b] = (graph[a][b] || 0) + points;
      graph[b][a] = (graph[b][a] || 0) + points; // undirected
    }

    // 4. Multi-collaborator tasks
    for (const task of tasks) {
      // Ép assigned_to thành array
      const assignees = Array.isArray(task.assigned_to)
        ? task.assigned_to
        : task.assigned_to
          ? [task.assigned_to]
          : [];

      const users = assignees.map(u => u._id.toString());

      // Nếu có nhiều hơn 1 người → tính collaboration điểm "multi-collaborator"
      if (users.length > 1) {
        for (let i = 0; i < users.length; i++) {
          for (let j = i + 1; j < users.length; j++) {
            addInteraction(users[i], users[j], 2); // mỗi cặp +2
          }
        }
      }
    }

    // 5. Comment-based interactions
    const commentsByTask = {};
    for (const c of comments) {
      const tid = c.task_id.toString();
      if (!commentsByTask[tid]) commentsByTask[tid] = [];
      commentsByTask[tid].push(c);
    }

    for (const taskId of taskIds) {
      const list = commentsByTask[taskId] || [];
      let previousComment = null;

      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const userA = c.user_id?._id?.toString();

        // (1) Basic comment → +1 với tất cả user đã comment trước trong task
        const previousUsers = new Set(list.slice(0, i).map(x => x.user_id._id.toString()));
        previousUsers.forEach(userB => addInteraction(userA, userB, 1));

        // (2) Reply time bonus
        if (previousComment) {
          const userB = previousComment.user_id._id.toString();
          const diff = (c.created_at - previousComment.created_at) / 1000 / 60;

          if (diff < 5) addInteraction(userA, userB, 5);
          else if (diff < 10) addInteraction(userA, userB, 3);
          else if (diff < 15) addInteraction(userA, userB, 2);
          else addInteraction(userA, userB, 1);
        }

        previousComment = c;

        // (3) Tag @mentions → +3
        if (c.user_tag_id) {
          const taggedUser = c.user_tag_id._id.toString();
          addInteraction(userA, taggedUser, 3);
        }
      }
    }

    // 6. Calculate per-user collaboration metrics
    const userMetrics = {};
    const userIds = new Set();
    
    // Collect all user IDs
    comments.forEach(c => {
      if (c.user_id?._id) userIds.add(c.user_id._id.toString());
      if (c.user_tag_id?._id) userIds.add(c.user_tag_id._id.toString());
    });
    tasks.forEach(t => {
      const assignees = Array.isArray(t.assigned_to) ? t.assigned_to : t.assigned_to ? [t.assigned_to] : [];
      assignees.forEach(a => {
        if (a?._id) userIds.add(a._id.toString());
      });
    });

    // Initialize user metrics
    userIds.forEach(uid => {
      userMetrics[uid] = {
        userId: uid,
        commentCount: 0,
        mentionsGiven: 0, // @mentions user gave
        mentionsReceived: 0, // @mentions user received
        multiCollaboratorTasks: 0,
        totalResponseTime: 0, // in minutes
        responseCount: 0,
        collaborationScore: 0,
      };
    });

    // Count comments per user
    comments.forEach(c => {
      const userId = c.user_id?._id?.toString();
      if (userId && userMetrics[userId]) {
        userMetrics[userId].commentCount++;
        
        // Count mentions given
        if (c.user_tag_id) {
          userMetrics[userId].mentionsGiven++;
          const taggedUserId = c.user_tag_id._id?.toString();
          if (taggedUserId && userMetrics[taggedUserId]) {
            userMetrics[taggedUserId].mentionsReceived++;
          }
        }
      }
    });

    // Count multi-collaborator tasks per user
    tasks.forEach(task => {
      const assignees = Array.isArray(task.assigned_to) 
        ? task.assigned_to 
        : task.assigned_to 
          ? [task.assigned_to] 
          : [];
      
      if (assignees.length > 1) {
        assignees.forEach(a => {
          const userId = a?._id?.toString();
          if (userId && userMetrics[userId]) {
            userMetrics[userId].multiCollaboratorTasks++;
          }
        });
      }
    });

    // Calculate average response time per user
    for (const taskId of taskIds) {
      const list = commentsByTask[taskId] || [];
      for (let i = 1; i < list.length; i++) {
        const currentComment = list[i];
        const previousComment = list[i - 1];
        
        const currentUserId = currentComment.user_id?._id?.toString();
        const previousUserId = previousComment.user_id?._id?.toString();
        
        if (currentUserId && previousUserId && currentUserId !== previousUserId) {
          const diffMinutes = (new Date(currentComment.created_at) - new Date(previousComment.created_at)) / 1000 / 60;
          
          if (userMetrics[currentUserId]) {
            userMetrics[currentUserId].totalResponseTime += diffMinutes;
            userMetrics[currentUserId].responseCount++;
          }
        }
      }
    }

    // Calculate collaboration score and avg response time
    const collaborationMetrics = Object.values(userMetrics).map(metrics => {
      const avgResponseTime = metrics.responseCount > 0 
        ? Math.round((metrics.totalResponseTime / metrics.responseCount) * 10) / 10 
        : 0;
      
      // Collaboration score = weighted sum of metrics
      // Comment count: 30%, Mentions: 25%, Multi-collaborator: 25%, Response time: 20%
      const commentScore = Math.min(metrics.commentCount / 10, 1) * 30;
      const mentionScore = Math.min((metrics.mentionsGiven + metrics.mentionsReceived) / 5, 1) * 25;
      const multiCollabScore = Math.min(metrics.multiCollaboratorTasks / 5, 1) * 25;
      const responseScore = avgResponseTime > 0 && avgResponseTime < 60 ? (60 - avgResponseTime) / 60 * 20 : 0;
      
      const collaborationScore = Math.round(commentScore + mentionScore + multiCollabScore + responseScore);
      
      return {
        ...metrics,
        avgResponseTimeMinutes: avgResponseTime,
        collaborationScore: Math.min(collaborationScore, 100),
      };
    }).sort((a, b) => b.collaborationScore - a.collaborationScore);

    // 7. Convert graph to edges list for frontend
    const edges = [];
    for (const a in graph) {
      for (const b in graph[a]) {
        if (a < b) {
          edges.push({
            from: a,
            to: b,
            weight: graph[a][b],
          });
        }
      }
    }

    // 8. Get user info for nodes
    const User = require('../models/usersModel');
    const nodeUsers = await User.find({
      _id: { $in: Array.from(userIds).map(id => new mongoose.Types.ObjectId(id)) }
    }).select('username full_name email').lean();

    const nodeMap = {};
    nodeUsers.forEach(u => {
      nodeMap[u._id.toString()] = {
        userId: u._id.toString(),
        username: u.username,
        fullName: u.full_name,
        email: u.email,
      };
    });

    // 9. Prepare nodes with user info and collaboration score
    const nodes = Array.from(userIds).map(uid => {
      const metrics = userMetrics[uid] || {};
      const userInfo = nodeMap[uid] || {};
      
      return {
        id: uid,
        ...userInfo,
        collaborationScore: metrics.collaborationScore || 0,
        commentCount: metrics.commentCount || 0,
      };
    });

    // 10. Group analysis (identify groups with good/poor collaboration)
    const avgCollaborationScore = collaborationMetrics.length > 0
      ? collaborationMetrics.reduce((sum, m) => sum + m.collaborationScore, 0) / collaborationMetrics.length
      : 0;

    const goodCollaborators = collaborationMetrics.filter(m => m.collaborationScore >= avgCollaborationScore);
    const poorCollaborators = collaborationMetrics.filter(m => m.collaborationScore < avgCollaborationScore * 0.5);

    return {
      // Network graph data
      nodes,
      edges,
      graph,
      
      // Per-user collaboration metrics
      collaborationMetrics,
      
      // Summary statistics
      summary: {
        totalUsers: collaborationMetrics.length,
        totalComments: comments.length,
        totalMentions: comments.filter(c => c.user_tag_id).length,
        totalMultiCollaboratorTasks: tasks.filter(t => {
          const assignees = Array.isArray(t.assigned_to) ? t.assigned_to : t.assigned_to ? [t.assigned_to] : [];
          return assignees.length > 1;
        }).length,
        averageCollaborationScore: Math.round(avgCollaborationScore * 10) / 10,
        averageResponseTimeMinutes: collaborationMetrics.length > 0
          ? Math.round((collaborationMetrics.reduce((sum, m) => sum + m.avgResponseTimeMinutes, 0) / collaborationMetrics.length) * 10) / 10
          : 0,
      },
      
      // Group analysis
      groupAnalysis: {
        goodCollaborators: {
          count: goodCollaborators.length,
          users: goodCollaborators.slice(0, 10).map(m => ({
            userId: m.userId,
            collaborationScore: m.collaborationScore,
            commentCount: m.commentCount,
            mentionsGiven: m.mentionsGiven,
            mentionsReceived: m.mentionsReceived,
          })),
        },
        poorCollaborators: {
          count: poorCollaborators.length,
          users: poorCollaborators.slice(0, 10).map(m => ({
            userId: m.userId,
            collaborationScore: m.collaborationScore,
            commentCount: m.commentCount,
            mentionsGiven: m.mentionsGiven,
            mentionsReceived: m.mentionsReceived,
          })),
        },
      },
    };
  }
}

module.exports = new CommentService();

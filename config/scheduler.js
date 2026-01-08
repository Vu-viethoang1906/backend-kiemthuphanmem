const { sendNotificationToAll } = require('../config/sendNotify');
const cron = require('node-cron');
const Tasks = require('../models/task.model');
const moment = require('moment-timezone');
const startOfDay = moment().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
const endOfDay = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();
const { sendMailToUser } = require('../config/sendNotify');
const boardService = require('../services/board.service');
const backupService = require('../services/backup.service');
const { sendSlackMessage } = require('../config/slackNotify');
const atRiskDetectionService = require('../services/atRiskDetection.service');
const { emitToUser, emitToUsers } = require('../config/socket');
const boardMemberRepo = require('../repositories/boardMember.repository');
const notificationService = require('../services/notification.service');
// Cron job gửi email nhắc nhở task sắp hết hạn - chạy lúc 7h sáng hàng ngày
cron.schedule('0 7 * * *', async () => {
  // gửi lúc 7h sáng
  try {
    const tasks = await Tasks.find({
      due_date: { $gte: startOfDay, $lte: endOfDay },
      deleted_at: null,
    });

    if (tasks.length === 0) {
      return;
    }

    tasks.forEach(async t => {
      const subject = 'Bạn có task sắp hết hạn';
      const IdBoard = t.board_id;

      if (!IdBoard) return;
      const nameBoard = await boardService.getBoardById(IdBoard);
      if (!nameBoard) return;

      const html = `
          <h3>Xin chào!</h3>
          <p>Task <b>${t.title}</b> trong bảng <b>${nameBoard.title}  
          </b> sắp hết hạn
          <p>hãy hoàn thành trước: ${t.due_date.toLocaleString()}</p>
          <p>— CodeGym Team</p>
        `;

      await sendMailToUser(t.assigned_to, subject, html);
    });
  } catch (error) {}
});

// Cron job backup tự động - chạy lúc 2h sáng hàng ngày
cron.schedule('08 14 * * *', async () => {
  try {
    await backupService.createBackup();
    await sendSlackMessage('🎉 Backup tự động lúc 11:06 đã hoàn thành thành công!');
  } catch (error) {
    await sendSlackMessage('🎉 Backup tự động lúc đã thất bại 11:06');
  }
});

cron.schedule('0 */2 * * *', async () => {
  try {
    const atRiskTasks = await atRiskDetectionService.detectAtRiskTasks();

    for (const atRiskTask of atRiskTasks) {
      const task = atRiskTask.task;
      if (!task) continue;

      const boardMembers = await boardMemberRepo.findByBoardId(task.board_id);
      const memberIds = boardMembers.map(m => m.user_id?.toString()).filter(Boolean);

      const alertData = {
        task_id: task._id.toString(),
        task_title: task.title,
        board_id: task.board_id.toString(),
        risk_score: atRiskTask.risk_score,
        risk_reasons: atRiskTask.risk_reasons,
        recommendations: atRiskTask.recommendations,
        timestamp: new Date().toISOString(),
      };

      for (const memberId of memberIds) {
        try {
          await notificationService.createNotification({
            user_id: memberId,
            title: `⚠️ Task có nguy cơ trễ hạn: ${task.title}`,
            body: `Task "${task.title}" có nguy cơ trễ hạn với điểm số ${atRiskTask.risk_score.toFixed(2)}`,
            type: 'at_risk_task',
            board_id: task.board_id.toString(),
            task_id: task._id.toString(),
          });

          emitToUser('at_risk_task_detected', alertData, memberId);
        } catch (err) {}
      }

      if (task.assigned_to) {
        const assignedUserId = task.assigned_to.toString();
        if (!memberIds.includes(assignedUserId)) {
          try {
            await notificationService.createNotification({
              user_id: assignedUserId,
              title: `⚠️ Task của bạn có nguy cơ trễ hạn: ${task.title}`,
              body: `Task "${task.title}" có nguy cơ trễ hạn với điểm số ${atRiskTask.risk_score.toFixed(2)}`,
              type: 'at_risk_task',
              board_id: task.board_id.toString(),
              task_id: task._id.toString(),
            });

            emitToUser('at_risk_task_detected', alertData, assignedUserId);
          } catch (err) {}
        }
      }
    }
  } catch (error) {}
});

const exportService = require('../services/export.service');
cron.schedule('0 */6 * * *', async () => {
  try {
    const deletedCount = await exportService.cleanupOldFiles();
    if (deletedCount > 0) {
    }
  } catch (error) {}
});

// Cron job xử lý scheduled reports - chạy mỗi giờ
const scheduledReportService = require('../services/scheduledReport.service');
cron.schedule('0 * * * *', async () => {
  try {
    const result = await scheduledReportService.processScheduledReports();
    if (result.processed > 0) {
    }
  } catch (error) {}
});

// Cron job xử lý scheduled notifications - chạy mỗi 5 phút
const smartNotificationService = require('../services/smartNotification.service');
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await smartNotificationService.processScheduledNotifications();
    if (result.processed > 0) {
    }
  } catch (error) {}
});

// Cron job phân tích activity patterns - chạy mỗi ngày lúc 2h sáng
const userActivityPatternService = require('../services/userActivityPattern.service');
cron.schedule('21 8 * * *', async () => {
  try {
    // Get all users with activity patterns
    const UserActivityPattern = require('../models/userActivityPattern.model');
    const patterns = await UserActivityPattern.find({}).select('user_id').lean();

    for (const pattern of patterns) {
      try {
        await userActivityPatternService.analyzeUserActivity(pattern.user_id.toString(), 30);
      } catch (error) {
        // Continue with next user if one fails
      }
    }
  } catch (error) {}
});

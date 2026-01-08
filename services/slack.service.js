const axios = require("axios");
const boardSlackConfigService = require("./boardSlackConfig.service");
require("dotenv").config();

class SlackService {
  async sendFormattedMessage(options, webhookUrl = null) {
    try {
      const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;

      if (!url) {
        return false;
      }

      const { title, message, color = "good", fields = [] } = options;

      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: title || "Thông báo từ KEN",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message,
          },
        },
      ];

      if (fields.length > 0) {
        blocks.push({
          type: "section",
          fields: fields.map((field) => ({
            type: "mrkdwn",
            text: `*${field.title}:*\n${field.value}`,
          })),
        });
      }

      blocks.push({
        type: "divider",
      });

      const payload = {
        blocks,
        attachments: [
          {
            color: color,
          },
        ],
      };

      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000,
      });

      if (response.status === 200) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async sendTaskCreatedNotification(taskData, userData, boardData, boardId = null) {
    try {
      const message = `*Task mới được tạo*\n\n` +
        `*Tiêu đề:* ${taskData.title}\n` +
        `*Người tạo:* ${userData.full_name || userData.username}\n` +
        `*Board:* ${boardData.title}\n` +
        (taskData.description ? `*Mô tả:* ${taskData.description.substring(0, 100)}${taskData.description.length > 100 ? '...' : ''}\n` : '') +
        (taskData.assigned_to ? `*Được giao cho:* ${taskData.assigned_to_name || 'N/A'}\n` : '') +
        (taskData.due_date ? `*Deadline:* ${new Date(taskData.due_date).toLocaleDateString('vi-VN')}\n` : '');

      const messageOptions = {
        title: "Task Mới",
        message: message,
        color: "good",
      };

      if (boardId) {
        const boardShouldNotify = await boardSlackConfigService.shouldNotify(boardId, 'task_created');
        if (boardShouldNotify) {
          const boardWebhook = await boardSlackConfigService.getBoardWebhookUrl(boardId);
          if (boardWebhook) {
            return await this.sendFormattedMessage(messageOptions, boardWebhook);
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async sendTaskAssignedNotification(taskData, assignedUserData, boardData, assignerData, boardId = null) {
    try {
      const assignerName = assignerData?.full_name || assignerData?.username || 'Người dùng';
      const assignedUserName = assignedUserData?.full_name || assignedUserData?.username || 'Người dùng';
      
      const message = `*${assignerName}* đã giao task cho *${assignedUserName}*\n\n` +
        `*Task:* ${taskData.title}\n` +
        `*Board:* ${boardData.title}\n` +
        (taskData.description ? `*Mô tả:* ${taskData.description.substring(0, 100)}${taskData.description.length > 100 ? '...' : ''}\n` : '') +
        (taskData.due_date ? `*Deadline:* ${new Date(taskData.due_date).toLocaleDateString('vi-VN')}\n` : '');

      const messageOptions = {
        title: "Task Được Giao",
        message: message,
        color: "warning",
      };

      if (boardId) {
        const boardShouldNotify = await boardSlackConfigService.shouldNotify(boardId, 'task_assigned');
        if (boardShouldNotify) {
          const boardWebhook = await boardSlackConfigService.getBoardWebhookUrl(boardId);
          if (boardWebhook) {
            return await this.sendFormattedMessage(messageOptions, boardWebhook);
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async sendTaskCompletedNotification(taskData, userData, boardData, boardId = null) {
    try {
      const message = `*Task đã hoàn thành*\n\n` +
        `*Task:* ${taskData.title}\n` +
        `*Board:* ${boardData.title}\n` +
        `*Người hoàn thành:* ${userData.full_name || userData.username}\n`;

      const messageOptions = {
        title: "Task Hoàn Thành",
        message: message,
        color: "good",
      };

      if (boardId) {
        const boardShouldNotify = await boardSlackConfigService.shouldNotify(boardId, 'task_completed');
        if (boardShouldNotify) {
          const boardWebhook = await boardSlackConfigService.getBoardWebhookUrl(boardId);
          if (boardWebhook) {
            return await this.sendFormattedMessage(messageOptions, boardWebhook);
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async sendTaskMovedNotification(taskData, userData, boardData, oldColumnName, newColumnName, boardId = null) {
    try {
      const moverName = userData?.full_name || userData?.username || 'Người dùng';
      const assignedUserName = taskData.assigned_to_name || null;
      
      const message = `*${moverName}* đã di chuyển task từ *${oldColumnName}* sang *${newColumnName}*\n\n` +
        `*Task:* ${taskData.title}\n` +
        `*Board:* ${boardData.title}\n` +
        (assignedUserName ? `*Người được giao:* ${assignedUserName}\n` : '');

      const messageOptions = {
        title: "Task Được Di Chuyển",
        message: message,
        color: "warning",
      };

      if (boardId) {
        const boardWebhook = await boardSlackConfigService.getBoardWebhookUrl(boardId);
        if (boardWebhook) {
          return await this.sendFormattedMessage(messageOptions, boardWebhook);
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gửi message đơn giản đến webhook URL (dùng cho test)
   * @param {string} message - Nội dung message
   * @param {string} webhookUrl - Webhook URL
   * @returns {Promise<boolean>}
   */
  async sendWebhookMessage(message, webhookUrl) {
    try {
      if (!webhookUrl) {
        return false;
      }

      if (!webhookUrl.startsWith('https://hooks.slack.com/services/')) {
        return false;
      }

      const payload = {
        text: message
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.status === 200) {
        return true;
      }

      throw new Error(`Slack trả về status code không mong đợi: ${response.status}`);
    } catch (error) {
      if (error.response) {
        if (error.response.data && typeof error.response.data === 'string') {
          throw new Error(`Slack API Error: ${error.response.data}`);
        } else if (error.response.data && error.response.data.error) {
          throw new Error(`Slack API Error: ${error.response.data.error}`);
        } else {
          throw new Error(`Slack API trả về lỗi ${error.response.status}: ${error.response.statusText || 'Unknown error'}`);
        }
      } else if (error.request) {
        throw new Error('Không nhận được phản hồi từ Slack. Vui lòng kiểm tra kết nối mạng.');
      } else {
        throw new Error(`Lỗi khi gửi request: ${error.message}`);
      }
    }
  }
}

module.exports = new SlackService();

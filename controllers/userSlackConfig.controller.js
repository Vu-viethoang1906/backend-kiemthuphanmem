const userSlackConfigService = require('../services/userSlackConfig.service');

class UserSlackConfigController {
  async getMyConfig(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }

      const config = await userSlackConfigService.getOrCreateConfig(userId);
      
      // Ẩn webhook URL đầy đủ để bảo mật (chỉ hiển thị một phần)
      const safeConfig = {
        ...config.toObject ? config.toObject() : config,
        webhook_url: config.webhook_url 
          ? `${config.webhook_url.substring(0, 30)}...` 
          : null,
        webhook_url_full: config.webhook_url, // Giữ nguyên để dùng trong service
      };

      res.json({
        success: true,
        data: safeConfig
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  async updateMyConfig(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }

      const {
        webhook_url,
        notify_task_created,
        notify_task_assigned,
        notify_task_completed,
        notify_comment_added,
        is_active,
        channel_name,
        notes
      } = req.body;

      // Validate webhook URL nếu có
      if (webhook_url && !webhook_url.startsWith('https://hooks.slack.com/services/')) {
        return res.status(400).json({
          success: false,
          message: 'Webhook URL không hợp lệ. Phải bắt đầu với https://hooks.slack.com/services/'
        });
      }

      const updateData = {};
      if (webhook_url !== undefined) updateData.webhook_url = webhook_url;
      if (notify_task_created !== undefined) updateData.notify_task_created = notify_task_created;
      if (notify_task_assigned !== undefined) updateData.notify_task_assigned = notify_task_assigned;
      if (notify_task_completed !== undefined) updateData.notify_task_completed = notify_task_completed;
      if (notify_comment_added !== undefined) updateData.notify_comment_added = notify_comment_added;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (channel_name !== undefined) updateData.channel_name = channel_name;
      if (notes !== undefined) updateData.notes = notes;

      const updatedConfig = await userSlackConfigService.updateConfig(userId, updateData);

      // Ẩn webhook URL đầy đủ
      const safeConfig = {
        ...updatedConfig.toObject ? updatedConfig.toObject() : updatedConfig,
        webhook_url: updatedConfig.webhook_url 
          ? `${updatedConfig.webhook_url.substring(0, 30)}...` 
          : null,
      };

      res.json({
        success: true,
        message: 'Cập nhật cấu hình Slack thành công',
        data: safeConfig
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  async toggleNotifications(req, res) {
    try {
      const userId = req.user?.id;
      const { is_active } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'is_active phải là boolean (true/false)'
        });
      }

      const config = await userSlackConfigService.toggleNotifications(userId, is_active);

      res.json({
        success: true,
        message: `Thông báo Slack đã ${is_active ? 'bật' : 'tắt'}`,
        data: {
          is_active: config.is_active
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async testWebhook(req, res) {
    try {
      const userId = req.user?.id;
      const { webhook_url } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }

      if (!webhook_url) {
        return res.status(400).json({
          success: false,
          message: 'webhook_url là bắt buộc'
        });
      }

      // Validate format
      if (!webhook_url.startsWith('https://hooks.slack.com/services/')) {
        return res.status(400).json({
          success: false,
          message: 'Webhook URL không hợp lệ'
        });
      }

      // Test gửi thông báo
      const slackService = require('../services/slack.service');
      const testResult = await slackService.sendWebhookMessage(
        '🧪 *Test thông báo từ KEN*\n\nNếu bạn thấy tin nhắn này, webhook URL của bạn đã hoạt động!',
        webhook_url
      );

      if (testResult) {
        res.json({
          success: true,
          message: 'Webhook URL hoạt động! Vui lòng kiểm tra Slack channel của bạn.'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Không thể gửi thông báo. Vui lòng kiểm tra lại webhook URL.'
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  async deleteMyConfig(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }

      await userSlackConfigService.deleteConfig(userId);

      res.json({
        success: true,
        message: 'Đã xóa cấu hình Slack'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new UserSlackConfigController();


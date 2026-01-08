const UserSlackConfig = require('../models/userSlackConfig.model');
const mongoose = require('mongoose');

class UserSlackConfigService {
  async getOrCreateConfig(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('User ID không hợp lệ');
      }

      let config = await UserSlackConfig.findOne({ user_id: userId });
      if (!config) {
        config = await UserSlackConfig.create({
          user_id: userId,
          notify_task_created: true,
          notify_task_assigned: true,
          notify_task_completed: true,
          notify_comment_added: true,
          is_active:true,
        });
      }
      return config;
    } catch (error) {
      throw new Error(`Lỗi lấy config Slack: ${error.message}`);
    }
  }
  async getConfig(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('User ID không hợp lệ');
      }

      return await UserSlackConfig.findOne({ user_id: userId });
    } catch (error) {
      throw new Error(`Lỗi lấy config Slack: ${error.message}`);
    }
  }
  async updateConfig(userId, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('User ID không hợp lệ');
      }
      if (updateData.webhook_url) {
        if (!updateData.webhook_url.startsWith('https://hooks.slack.com/services/')) {
          throw new Error('Webhook URL không hợp lệ. Phải bắt đầu với https://hooks.slack.com/services/');
        }
      }
      const config = await UserSlackConfig.findOneAndUpdate(
        { user_id: userId },
        {
          ...updateData,
          updated_at: new Date(),
        },
        {
          new: true,
          upsert: true, 
          runValidators: true,
        }
      );

      return config;
    } catch (error) {
      throw new Error(`Lỗi cập nhật config Slack: ${error.message}`);
    }
  }

  async toggleNotifications(userId, isActive) {
    try {
      return await this.updateConfig(userId, { is_active: isActive });
    } catch (error) {
      throw error;
    }
  }
  async deleteConfig(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('User ID không hợp lệ');
      }

      const result = await UserSlackConfig.deleteOne({ user_id: userId });
      return result.deletedCount > 0;
    } catch (error) {
      throw new Error(`Lỗi xóa config Slack: ${error.message}`);
    }
  }
  async shouldNotify(userId, notificationType) {
    try {
      const config = await this.getConfig(userId);
      
      if (!config || !config.is_active || !config.webhook_url) {
        return false;
      }

      const notificationField = `notify_${notificationType}`;
      return config[notificationField] === true;
    } catch (error) {
      console.error(' Lỗi kiểm tra shouldNotify:', error.message);
      return false;
    }
  }
  async getUserWebhookUrl(userId) {
    try {
      const config = await this.getConfig(userId);
      
      if (!config || !config.is_active) {
        return null;
      }

      return config.webhook_url || null;
    } catch (error) {
      console.error(' Lỗi lấy webhook URL:', error.message);
      return null;
    }
  }
}

module.exports = new UserSlackConfigService();


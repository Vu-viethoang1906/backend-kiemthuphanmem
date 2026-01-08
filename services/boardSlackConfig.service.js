const BoardSlackConfig = require('../models/boardSlackConfig.model');
const mongoose = require('mongoose');
const boardRepository = require('../repositories/board.repository');

class BoardSlackConfigService {
  /**
   * Lấy hoặc tạo config cho board
   * @param {string} boardId - Board ID
   * @returns {Promise<Object>}
   */
  async getOrCreateConfig(boardId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(boardId)) {
        throw new Error('Board ID không hợp lệ');
      }

      let config = await BoardSlackConfig.findOne({ board_id: boardId });

      if (!config) {
        // Tạo config mặc định
        config = await BoardSlackConfig.create({
          board_id: boardId,
          notify_task_created: true,
          notify_task_assigned: true,
          notify_task_completed: true,
          notify_comment_added: true,
          is_active: false, // Mặc định tắt
        });
      }

      return config;
    } catch (error) {
      throw new Error(`Lỗi lấy config Slack board: ${error.message}`);
    }
  }

  /**
   * Lấy config của board
   * @param {string} boardId - Board ID
   * @returns {Promise<Object|null>}
   */
  async getConfig(boardId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(boardId)) {
        throw new Error('Board ID không hợp lệ');
      }

      return await BoardSlackConfig.findOne({ board_id: boardId });
    } catch (error) {
      throw new Error(`Lỗi lấy config Slack board: ${error.message}`);
    }
  }

  /**
   * Cập nhật config của board (chỉ admin/owner/creator)
   * @param {string} boardId - Board ID
   * @param {string} userId - User ID (để check quyền)
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Promise<Object>}
   */
  async updateConfig(boardId, userId, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(boardId)) {
        throw new Error('Board ID không hợp lệ');
      }
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('User ID không hợp lệ');
      }

      // Kiểm tra quyền: user phải là admin, owner hoặc creator của board
      const isAdmin = await boardRepository.isRoleMember(userId, boardId);
      const isCreator = await boardRepository.isCreatorFromMember(userId, boardId);
      
      if (!isAdmin && !isCreator) {
        throw new Error('Bạn không có quyền cấu hình Slack cho board này. Chỉ admin/owner/creator mới có quyền.');
      }

      // Validate webhook URL nếu có
      if (updateData.webhook_url) {
        if (!updateData.webhook_url.startsWith('https://hooks.slack.com/services/')) {
          throw new Error('Webhook URL không hợp lệ. Phải bắt đầu với https://hooks.slack.com/services/');
        }
      }

      const config = await BoardSlackConfig.findOneAndUpdate(
        { board_id: boardId },
        {
          ...updateData,
          configured_by: userId,
          updated_at: new Date(),
},
        {
          new: true,
          upsert: true, // Tạo mới nếu chưa có
          runValidators: true,
        }
      );

      return config;
    } catch (error) {
      throw new Error(`Lỗi cập nhật config Slack board: ${error.message}`);
    }
  }

  /**
   * Bật/tắt thông báo cho board
   * @param {string} boardId - Board ID
   * @param {string} userId - User ID (để check quyền)
   * @param {boolean} isActive - Bật hay tắt
   * @returns {Promise<Object>}
   */
  async toggleNotifications(boardId, userId, isActive) {
    try {
      return await this.updateConfig(boardId, userId, { is_active: isActive });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Xóa config của board
   * @param {string} boardId - Board ID
   * @param {string} userId - User ID (để check quyền)
   * @returns {Promise<boolean>}
   */
  async deleteConfig(boardId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(boardId)) {
        throw new Error('Board ID không hợp lệ');
      }
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('User ID không hợp lệ');
      }

      // Kiểm tra quyền
      const isAdmin = await boardRepository.isRoleMember(userId, boardId);
      const isCreator = await boardRepository.isCreatorFromMember(userId, boardId);
      
      if (!isAdmin && !isCreator) {
        throw new Error('Bạn không có quyền xóa cấu hình Slack cho board này');
      }

      const result = await BoardSlackConfig.deleteOne({ board_id: boardId });
      return result.deletedCount > 0;
    } catch (error) {
      throw new Error(`Lỗi xóa config Slack board: ${error.message}`);
    }
  }

  /**
   * Kiểm tra board có bật thông báo loại nào không
   * @param {string} boardId - Board ID
   * @param {string} notificationType - Loại thông báo (task_created, task_assigned, task_completed, comment_added)
   * @returns {Promise<boolean>}
   */
  async shouldNotify(boardId, notificationType) {
    try {
      const config = await this.getConfig(boardId);
      
      if (!config || !config.is_active || !config.webhook_url) {
        return false;
      }

      const notificationField = `notify_${notificationType}`;
      return config[notificationField] === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Lấy webhook URL của board nếu đã config
   * @param {string} boardId - Board ID
   * @returns {Promise<string|null>}
   */
  async getBoardWebhookUrl(boardId) {
    try {
      const config = await this.getConfig(boardId);
      
      if (!config || !config.is_active) {
        return null;
      }

      return config.webhook_url || null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new BoardSlackConfigService();
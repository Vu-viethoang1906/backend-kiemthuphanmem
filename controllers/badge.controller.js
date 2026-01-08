const badgeService = require('../services/badge.service');
const adaptiveGamificationService = require('../services/adaptiveGamification.service');

class BadgeController {
  async getAllBadges(req, res) {
    try {
      const badges = await badgeService.getAllBadges();
      res.json({ success: true, data: badges });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getUserBadges(req, res) {
    try {
      const userId = req.user.id;
      const { center_id } = req.query;

      if (!center_id) {
        const centerId = await adaptiveGamificationService.getUserCenterId(userId);
        if (!centerId) {
          return res.status(400).json({
            success: false,
            message: 'Không tìm thấy center của user',
          });
        }

        const badges = await badgeService.getUserBadges(userId, centerId);
        return res.json({
          success: true,
          data: badges,
          total: badges.length,
          message: badges.length === 0 ? 'User chưa đạt badge nào' : null,
        });
      }

      const badges = await badgeService.getUserBadges(userId, center_id);
      res.json({
        success: true,
        data: badges,
        total: badges.length,
        message: badges.length === 0 ? 'User chưa đạt badge nào' : null,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getRecentBadges(req, res) {
    try {
      const { center_id, limit = 10 } = req.query;

      if (!center_id) {
        return res.status(400).json({
          success: false,
          message: 'center_id là bắt buộc',
        });
      }

      const badges = await badgeService.getRecentBadges(center_id, parseInt(limit));
      res.json({
        success: true,
        data: badges,
        total: badges.length,
        center_id,
        limit: parseInt(limit),
        message: badges.length === 0 ? 'Chưa có badge nào được trao trong center này' : null,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBadgeById(req, res) {
    try {
      const { id } = req.params;
      const badge = await badgeService.getBadgeById(id);
      
      if (!badge) {
        return res.status(404).json({
          success: false,
          message: 'Badge không tồn tại',
        });
      }

      res.json({ success: true, data: badge });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async createBadge(req, res) {
    try {
      const { name, description, icon_url, category, criteria, points_reward } = req.body;

      if (!name || !description || !category || !criteria) {
        return res.status(400).json({
          success: false,
          message: 'name, description, category, criteria là bắt buộc',
        });
      }

      const badge = await badgeService.createBadge({
        name,
        description,
        icon_url,
        category,
        criteria,
        points_reward: points_reward || 0,
      });

      res.json({ success: true, data: badge });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateBadge(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const badge = await badgeService.updateBadge(id, updateData);
      
      if (!badge) {
        return res.status(404).json({
          success: false,
          message: 'Badge không tồn tại',
        });
      }

      res.json({ success: true, data: badge });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteBadge(req, res) {
    try {
      const { id } = req.params;
      await badgeService.deleteBadge(id);
      res.json({ success: true, message: 'Đã xóa badge' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new BadgeController();



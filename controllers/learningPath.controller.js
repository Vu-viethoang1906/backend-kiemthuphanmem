const learningPathService = require('../services/learningPath.service');
const skillRecommendationRepo = require('../repositories/skillRecommendation.repository');
const userSkillRepo = require('../repositories/userSkill.repository');

class LearningPathController {
  async getLearningPath(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const centerId = req.query.center_id || req.body.center_id;

      if (!userId || !centerId) {
        return res.status(400).json({
          success: false,
          message: 'user_id và center_id là bắt buộc',
        });
      }

      const path = await learningPathService.getLearningPath(userId, centerId);

      res.json({
        success: true,
        data: path,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async generateLearningPath(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const centerId = req.body.center_id || req.query.center_id;

      if (!userId || !centerId) {
        return res.status(400).json({
          success: false,
          message: 'user_id và center_id là bắt buộc',
        });
      }

      const path = await learningPathService.generateLearningPath(userId, centerId);

      res.json({
        success: true,
        data: path,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getSkills(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const centerId = req.query.center_id || req.body.center_id;

      if (!userId || !centerId) {
        return res.status(400).json({
          success: false,
          message: 'user_id và center_id là bắt buộc',
        });
      }

      const skills = await userSkillRepo.findByUserAndCenter(userId, centerId);

      res.json({
        success: true,
        data: {
          total: skills.length,
          skills,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getRecommendations(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const centerId = req.query.center_id || req.body.center_id;
      const limit = parseInt(req.query.limit) || 10;

      if (!userId || !centerId) {
        return res.status(400).json({
          success: false,
          message: 'user_id và center_id là bắt buộc',
        });
      }

      const recommendations = await learningPathService.getRecommendations(
        userId,
        centerId,
        limit
      );

      res.json({
        success: true,
        data: {
          total: recommendations.length,
          recommendations,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async acceptRecommendation(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const recommendationId = req.params.id;

      if (!recommendationId) {
        return res.status(400).json({
          success: false,
          message: 'recommendation_id là bắt buộc',
        });
      }

      const recommendation = await skillRecommendationRepo.findById(recommendationId);
      if (!recommendation || recommendation.user_id.toString() !== userId.toString()) {
        return res.status(404).json({
          success: false,
          message: 'Recommendation không tồn tại',
        });
      }

      await skillRecommendationRepo.markAsAccepted(recommendationId);

      res.json({
        success: true,
        message: 'Đã chấp nhận recommendation',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getProgress(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const centerId = req.query.center_id || req.body.center_id;

      if (!userId || !centerId) {
        return res.status(400).json({
          success: false,
          message: 'user_id và center_id là bắt buộc',
        });
      }

      const path = await learningPathService.getLearningPath(userId, centerId);
      const progress = await learningPathService.updateProgress(userId, centerId);

      res.json({
        success: true,
        data: {
          progress_percentage: path?.progress_percentage || 0,
          current_stage: path?.current_stage || 1,
          total_stages: path?.stages?.length || 0,
          completed_stages: path?.stages?.filter((s) => s.is_completed).length || 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async completeStage(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const centerId = req.body.center_id || req.query.center_id;
      const stageNumber = parseInt(req.params.stageNumber);

      if (!userId || !centerId || !stageNumber) {
        return res.status(400).json({
          success: false,
          message: 'user_id, center_id và stage_number là bắt buộc',
        });
      }

      const path = await learningPathService.completeStage(userId, centerId, stageNumber);

      res.json({
        success: true,
        data: path,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new LearningPathController();


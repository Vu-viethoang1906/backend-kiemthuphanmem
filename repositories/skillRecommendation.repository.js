const SkillRecommendation = require('../models/skillRecommendation.model');

class SkillRecommendationRepository {
  async create(data) {
    const recommendation = new SkillRecommendation(data);
    return await recommendation.save();
  }

  async findByUserAndCenter(userId, centerId, filters = {}) {
    return await SkillRecommendation.find({
      user_id: userId,
      center_id: centerId,
      ...filters,
    })
      .populate('recommended_skill_id')
      .populate('suggested_tasks')
      .sort({ priority: -1, confidence_score: -1 })
      .lean();
  }

  async findById(id) {
    return await SkillRecommendation.findById(id)
      .populate('recommended_skill_id')
      .populate('suggested_tasks')
      .lean();
  }

  async update(id, data) {
    return await SkillRecommendation.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async markAsViewed(id) {
    return await SkillRecommendation.findByIdAndUpdate(
      id,
      { viewed_at: new Date() },
      { new: true }
    ).lean();
  }

  async markAsAccepted(id) {
    return await SkillRecommendation.findByIdAndUpdate(
      id,
      { accepted: true },
      { new: true }
    ).lean();
  }

  async deleteOldRecommendations(userId, centerId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await SkillRecommendation.updateMany(
      {
        user_id: userId,
        center_id: centerId,
        accepted: false,
        created_at: { $lt: cutoffDate },
      },
      { deleted_at: new Date() }
    );
  }
}

module.exports = new SkillRecommendationRepository();


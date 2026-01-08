const LearningPath = require('../models/learningPath.model');

class LearningPathRepository {
  async create(data) {
    const path = new LearningPath(data);
    return await path.save();
  }

  async findByUserAndCenter(userId, centerId) {
    return await LearningPath.findOne({
      user_id: userId,
      center_id: centerId,
      status: 'active',
    })
      .populate('stages.skills')
      .populate('stages.suggested_tasks')
      .lean();
  }

  async findById(id) {
    return await LearningPath.findById(id)
      .populate('stages.skills')
      .populate('stages.suggested_tasks')
      .lean();
  }

  async update(id, data) {
    return await LearningPath.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async updateStage(pathId, stageNumber, data) {
    const path = await LearningPath.findById(pathId);
    if (!path) return null;

    const stage = path.stages.find((s) => s.stage_number === stageNumber);
    if (stage) {
      Object.assign(stage, data);
      await path.save();
    }

    return path;
  }

  async calculateProgress(pathId) {
    const path = await LearningPath.findById(pathId);
    if (!path || !path.stages.length) return 0;

    const completedStages = path.stages.filter((s) => s.is_completed).length;
    return Math.round((completedStages / path.stages.length) * 100);
  }
}

module.exports = new LearningPathRepository();


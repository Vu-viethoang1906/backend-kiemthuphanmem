const Task = require('../models/task.model');
const TaskTag = require('../models/taskTag.model');
const Tag = require('../models/tag.model');
const Skill = require('../models/skill.model');
const userSkillRepo = require('../repositories/userSkill.repository');
const learningPathRepo = require('../repositories/learningPath.repository');
const skillRecommendationRepo = require('../repositories/skillRecommendation.repository');
const skillExtractionService = require('./skillExtraction.service');
const learningPathAI = require('./learningPathAI.service');

class LearningPathService {
  async generateLearningPath(userId, centerId, options = {}) {
    await skillExtractionService.extractSkillsFromCompletedTasks(userId, centerId);

    const userSkills = await userSkillRepo.findByUserAndCenter(userId, centerId);
    const allSkills = await Skill.find({ is_active: true }).lean();

    const skillGaps = await learningPathAI.analyzeSkillGaps(userSkills, allSkills);

    const aiPath = await learningPathAI.generateLearningPath(userSkills, skillGaps);

    const stages = await Promise.all(
      (aiPath.stages || []).map(async (stage) => {
        const skillIds = await Promise.all(
          (stage.skills || []).map(async (skillName) => {
            const skill = await Skill.findOne({ name: skillName, is_active: true }).lean();
            return skill?._id;
          })
        );

        return {
          stage_number: stage.stage_number,
          title: stage.title,
          description: stage.description,
          skills: skillIds.filter(Boolean),
          suggested_tasks: [],
          difficulty_level: stage.difficulty_level || 1,
          estimated_duration_days: stage.estimated_duration_days || 0,
          is_completed: false,
        };
      })
    );

    const existingPath = await learningPathRepo.findByUserAndCenter(userId, centerId);
    if (existingPath) {
      return await learningPathRepo.update(existingPath._id, {
        path_name: aiPath.path_name,
        stages,
        current_stage: 1,
        status: 'active',
      });
    }

    return await learningPathRepo.create({
      user_id: userId,
      center_id: centerId,
      path_name: aiPath.path_name,
      stages,
      current_stage: 1,
      status: 'active',
    });
  }

  async getLearningPath(userId, centerId) {
    let path = await learningPathRepo.findByUserAndCenter(userId, centerId);

    if (!path) {
      path = await this.generateLearningPath(userId, centerId);
    }

    if (path) {
      path.progress_percentage = await learningPathRepo.calculateProgress(path._id);
      await learningPathRepo.update(path._id, { progress_percentage: path.progress_percentage });
    }

    return path;
  }

  async getRecommendations(userId, centerId, limit = 10) {
    // Lấy recommendations đã tồn tại trước
    const existingRecommendations = await skillRecommendationRepo.findByUserAndCenter(
      userId,
      centerId,
      { accepted: false }
    );

    // Nếu đã có đủ recommendations, trả về luôn
    if (existingRecommendations.length >= limit) {
      return existingRecommendations.slice(0, limit);
    }

    // Nếu chưa đủ, tạo thêm recommendations mới
    const userSkills = await userSkillRepo.findByUserAndCenter(userId, centerId);
    const completedTasks = await Task.find({
      assigned_to: userId,
      done_at: { $ne: null },
    }).countDocuments();

    // Lấy tất cả skills trong DB để AI có thể đề xuất
    const allSkills = await Skill.find({ is_active: true })
      .select('name category difficulty_level tags')
      .lean();

    // Nếu user chưa có skills, vẫn có thể đề xuất skills cơ bản
    const aiRecommendations = await learningPathAI.recommendNextSkills(
      userSkills,
      completedTasks,
      limit,
      allSkills
    );

    const newRecommendations = [];
    const existingSkillIds = existingRecommendations.map(
      (r) => r.recommended_skill_id?._id?.toString() || r.recommended_skill_id?.toString()
    );

    for (const rec of aiRecommendations.recommendations || []) {
      // Tìm skill theo tên (case-insensitive)
      let skill = allSkills.find(
        (s) => s.name.toLowerCase() === rec.skill_name?.toLowerCase()
      );

      if (!skill) {
        // Nếu không tìm thấy exact match, thử tìm partial match
        const partialMatch = allSkills.find((s) =>
          s.name.toLowerCase().includes(rec.skill_name?.toLowerCase() || '')
        );
        if (!partialMatch) continue;
        skill = partialMatch;
      }

      // Bỏ qua nếu đã có recommendation cho skill này
      if (existingSkillIds.includes(skill._id.toString())) continue;

      // Tìm tasks liên quan đến skill này
      const suggestedTasks = await this._findSuggestedTasks(skill, centerId, 5);

      // Tạo recommendation mới
      const recommendation = await skillRecommendationRepo.create({
        user_id: userId,
        center_id: centerId,
        recommended_skill_id: skill._id,
        recommendation_type: rec.recommendation_type || 'next_skill',
        priority: rec.priority || 5,
        reason: rec.reason || '',
        confidence_score: rec.confidence_score || 0,
        prerequisites_met: rec.prerequisites_met || false,
        estimated_difficulty: rec.estimated_difficulty || skill.difficulty_level || 1,
        suggested_tasks: suggestedTasks.map((t) => t._id),
      });

      // Populate recommendation để trả về đầy đủ thông tin
      const populatedRecommendation = await skillRecommendationRepo.findById(
        recommendation._id.toString()
      );
      if (populatedRecommendation) {
        newRecommendations.push(populatedRecommendation);
      }
    }

    // Kết hợp recommendations cũ và mới, sắp xếp theo priority
    const allRecommendations = [...existingRecommendations, ...newRecommendations].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    return allRecommendations.slice(0, limit);
  }

  async completeStage(userId, centerId, stageNumber) {
    const path = await learningPathRepo.findByUserAndCenter(userId, centerId);
    if (!path) throw new Error('Learning path not found');

    await learningPathRepo.updateStage(path._id, stageNumber, {
      is_completed: true,
      completed_at: new Date(),
    });

    const nextStage = path.stages.find((s) => s.stage_number === stageNumber + 1);
    if (nextStage) {
      await learningPathRepo.update(path._id, { current_stage: stageNumber + 1 });
    } else {
      await learningPathRepo.update(path._id, {
        status: 'completed',
        progress_percentage: 100,
      });
    }

    return await learningPathRepo.findById(path._id);
  }

  async updateProgress(userId, centerId) {
    const path = await learningPathRepo.findByUserAndCenter(userId, centerId);
    if (!path) return null;

    const progress = await learningPathRepo.calculateProgress(path._id);
    return await learningPathRepo.update(path._id, { progress_percentage: progress });
  }

  async _findSuggestedTasks(skill, centerId, limit = 5) {
    const suggestedTasks = [];

    // Lấy đầy đủ thông tin skill (bao gồm tags)
    const fullSkill = await Skill.findById(skill._id || skill).lean();
    if (!fullSkill) return [];

    // Tìm tasks theo tags của skill
    if (fullSkill.tags && fullSkill.tags.length > 0) {
      const tags = await Tag.find({
        name: { $in: fullSkill.tags },
        deleted_at: null,
      }).select('_id').lean();

      if (tags.length > 0) {
        const tagIds = tags.map((t) => t._id);
        const taskTags = await TaskTag.find({
          tag_id: { $in: tagIds },
        }).select('task_id').lean();

        const taskIds = taskTags.map((tt) => tt.task_id);

        if (taskIds.length > 0) {
          const tasks = await Task.find({
            _id: { $in: taskIds },
            done_at: null,
            deleted_at: null,
          })
            .select('_id title description priority due_date')
            .sort({ priority: -1, due_date: 1 })
            .limit(limit)
            .lean();

          suggestedTasks.push(...tasks);
        }
      }
    }

    // Nếu chưa đủ, tìm tasks theo skill name hoặc category trong title/description
    if (suggestedTasks.length < limit) {
      const searchTerms = [fullSkill.name];
      if (fullSkill.category) searchTerms.push(fullSkill.category);

      const tasks = await Task.find({
        $or: [
          { title: { $regex: searchTerms.join('|'), $options: 'i' } },
          { description: { $regex: searchTerms.join('|'), $options: 'i' } },
        ],
        done_at: null,
        deleted_at: null,
        _id: { $nin: suggestedTasks.map((t) => t._id) },
      })
        .select('_id title description priority due_date')
        .sort({ priority: -1, due_date: 1 })
        .limit(limit - suggestedTasks.length)
        .lean();

      suggestedTasks.push(...tasks);
    }

    return suggestedTasks.slice(0, limit);
  }
}

module.exports = new LearningPathService();


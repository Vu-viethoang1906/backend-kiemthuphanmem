const Task = require('../models/task.model');
const TaskTag = require('../models/taskTag.model');
const Tag = require('../models/tag.model');
const Skill = require('../models/skill.model');
const userSkillRepo = require('../repositories/userSkill.repository');
const skillRepo = require('../repositories/skill.repository');
const learningPathAI = require('./learningPathAI.service');

class SkillExtractionService {
  async extractSkillsFromCompletedTasks(userId, centerId) {
    const completedTasks = await Task.find({
      assigned_to: userId,
      done_at: { $ne: null },
    })
      .select('title description done_at')
      .lean();

    if (completedTasks.length === 0) {
      return { extracted: 0, skills: [] };
    }

    const tasksWithTags = await Promise.all(
      completedTasks.map(async (task) => {
        const taskTag = await TaskTag.findOne({ task_id: task._id }).lean();
        let tag = null;
        if (taskTag) {
          tag = await Tag.findById(taskTag.tag_id).lean();
        }
        return {
          ...task,
          tags: tag ? [tag.name] : [],
        };
      })
    );

    const aiResult = await learningPathAI.extractSkillsFromTasks(tasksWithTags);

    const extractedSkills = [];

    for (const skillData of aiResult.skills || []) {
      // Tìm các tasks liên quan đến skill này
      const relatedTasks = tasksWithTags.filter((t) =>
        skillData.evidence?.some((e) => t.title.includes(e))
      );

      // Thu thập tất cả tags từ các tasks liên quan
      const allTags = relatedTasks
        .flatMap((t) => t.tags || [])
        .filter(Boolean);

      // Lấy tag phổ biến nhất hoặc tag đầu tiên làm category
      const tagCounts = {};
      allTags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      const mostCommonTag =
        Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])[0] ||
        allTags[0] ||
        null;

      // Tạo unique tags list (không trùng lặp)
      const uniqueTags = [...new Set(allTags)];

      // Tìm skill theo name (không cần category nữa vì category lấy từ tags)
      let skill = await skillRepo.findByName(skillData.name);

      if (!skill) {
        skill = await skillRepo.create({
          name: skillData.name,
          category: mostCommonTag || skillData.category || null, // Category sẽ tự động lấy từ tags[0] nếu null
          description: `Extracted from user tasks`,
          difficulty_level: this._estimateDifficulty(skillData.proficiency_level),
          estimated_hours: 0,
          tags: uniqueTags.length > 0 ? uniqueTags : (skillData.evidence || []),
        });
      } else if (uniqueTags.length > 0) {
        // Cập nhật tags nếu có tags mới
        const existingTags = skill.tags || [];
        const mergedTags = [...new Set([...existingTags, ...uniqueTags])];
        await skillRepo.update(skill._id, { tags: mergedTags });
        skill = await skillRepo.findById(skill._id);
      }

      const evidenceTasks = relatedTasks.map((t) => t._id);

      await userSkillRepo.updateProficiency(
        userId,
        centerId,
        skill._id,
        skillData.proficiency_level || 0,
        skillData.confidence || 0
      );

      if (evidenceTasks.length > 0) {
        for (const taskId of evidenceTasks) {
          await userSkillRepo.addEvidenceTask(userId, centerId, skill._id, taskId);
        }
      }

      extractedSkills.push({
        skill_id: skill._id,
        proficiency: skillData.proficiency_level || 0,
      });
    }

    return {
      extracted: extractedSkills.length,
      skills: extractedSkills,
      confidence: aiResult.overall_confidence || 0,
    };
  }

  _estimateDifficulty(proficiency) {
    if (proficiency >= 80) return 5;
    if (proficiency >= 60) return 4;
    if (proficiency >= 40) return 3;
    if (proficiency >= 20) return 2;
    return 1;
  }
}

module.exports = new SkillExtractionService();


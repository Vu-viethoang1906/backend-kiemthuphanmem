const UserSkill = require('../models/userSkill.model');

class UserSkillRepository {
  async create(data) {
    const userSkill = new UserSkill(data);
    return await userSkill.save();
  }

  async findByUserAndCenter(userId, centerId) {
    return await UserSkill.find({ user_id: userId, center_id: centerId })
      .populate('skill_id')
      .sort({ proficiency_level: -1 })
      .lean();
  }

  async findByUserSkill(userId, centerId, skillId) {
    return await UserSkill.findOne({
      user_id: userId,
      center_id: centerId,
      skill_id: skillId,
    })
      .populate('skill_id')
      .lean();
  }

  async update(userId, centerId, skillId, data) {
    return await UserSkill.findOneAndUpdate(
      { user_id: userId, center_id: centerId, skill_id: skillId },
      data,
      { new: true, upsert: true }
    ).lean();
  }

  async addEvidenceTask(userId, centerId, skillId, taskId) {
    const userSkill = await UserSkill.findOne({
      user_id: userId,
      center_id: centerId,
      skill_id: skillId,
    });

    if (!userSkill) return null;

    if (!userSkill.evidence_tasks.includes(taskId)) {
      userSkill.evidence_tasks.push(taskId);
      userSkill.last_practiced_at = new Date();
      if (!userSkill.learned_at) {
        userSkill.learned_at = new Date();
      }
      await userSkill.save();
    }

    return userSkill;
  }

  async updateProficiency(userId, centerId, skillId, proficiency, confidence) {
    let userSkill = await UserSkill.findOne({
      user_id: userId,
      center_id: centerId,
      skill_id: skillId,
    });

    const updateData = {
      proficiency_level: proficiency,
      confidence_score: confidence,
      last_practiced_at: new Date(),
    };

    if (proficiency >= 80 && !userSkill?.mastery_date) {
      updateData.mastery_date = new Date();
    }

    if (!userSkill) {
      updateData.user_id = userId;
      updateData.center_id = centerId;
      updateData.skill_id = skillId;
      updateData.learned_at = new Date();
      return await this.create(updateData);
    }

    return await this.update(userId, centerId, skillId, updateData);
  }
}

module.exports = new UserSkillRepository();


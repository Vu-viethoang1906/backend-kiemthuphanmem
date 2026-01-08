const Skill = require('../models/skill.model');

class SkillRepository {
  async create(data) {
    const skill = new Skill(data);
    return await skill.save();
  }

  async findById(id) {
    return await Skill.findById(id).lean();
  }

  async findByName(name, category = null) {
    const query = { name };
    if (category) query.category = category;
    return await Skill.findOne(query).lean();
  }

  async findAll(filters = {}) {
    return await Skill.find(filters).sort({ difficulty_level: 1, name: 1 }).lean();
  }

  async findByCategory(category) {
    return await Skill.find({ category, is_active: true }).sort({ difficulty_level: 1 }).lean();
  }

  async update(id, data) {
    return await Skill.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return await Skill.findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true });
  }
}

module.exports = new SkillRepository();


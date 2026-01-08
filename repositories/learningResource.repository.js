const LearningResource = require('../models/learningResource.model');
const mongoose = require('mongoose');

class LearningResourceRepository {
  async create(data) {
    const resource = new LearningResource(data);
    return await resource.save();
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return await LearningResource.findById(id)
      .populate('skills', 'name category')
      .populate('created_by', 'username full_name')
      .lean();
  }

  async find(filter = {}, options = {}) {
    const { sort = { created_at: -1 }, limit, skip } = options;
    let query = LearningResource.find(filter).sort(sort);

    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return await query
      .populate('skills', 'name category')
      .populate('created_by', 'username full_name')
      .lean();
  }

  async update(id, data) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid LearningResource ID');
    }
    return await LearningResource.findByIdAndUpdate(id, data, { new: true })
      .populate('skills', 'name category')
      .populate('created_by', 'username full_name')
      .lean();
  }

  async delete(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid LearningResource ID');
    }
    return await LearningResource.findByIdAndUpdate(
      id,
      { deleted_at: new Date() },
      { new: true }
    );
  }

  async searchByKeywords(keywords, limit = 10) {
    const searchTerms = Array.isArray(keywords) ? keywords : [keywords];
    const searchRegex = searchTerms.map(term => new RegExp(term, 'i'));

    return await LearningResource.find({
      $or: [
        { title: { $in: searchRegex } },
        { description: { $in: searchRegex } },
        { tags: { $in: searchRegex } },
      ],
      deleted_at: null,
      is_active: true,
    })
      .sort({ is_featured: -1, view_count: -1, created_at: -1 })
      .limit(limit)
      .populate('skills', 'name category')
      .lean();
  }

  async findBySkills(skillIds, limit = 10) {
    return await LearningResource.find({
      skills: { $in: skillIds },
      deleted_at: null,
      is_active: true,
    })
      .sort({ is_featured: -1, view_count: -1, created_at: -1 })
      .limit(limit)
      .populate('skills', 'name category')
      .lean();
  }

  async findByResourceType(resourceType, limit = 10) {
    return await LearningResource.find({
      resource_type: resourceType,
      deleted_at: null,
      is_active: true,
    })
      .sort({ is_featured: -1, view_count: -1, created_at: -1 })
      .limit(limit)
      .populate('skills', 'name category')
      .lean();
  }

  async incrementViewCount(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return await LearningResource.findByIdAndUpdate(
      id,
      { $inc: { view_count: 1 } },
      { new: true }
    );
  }
}

module.exports = new LearningResourceRepository();


const TemplateSwimlane = require('../models/templateSwimlane.model');

class TemplateSwimlaneRepository {
  async create(data) {
    return await TemplateSwimlane.create(data);
  }

  async findAll() {
    return await TemplateSwimlane.find().lean();
  }

  async findById(id) {
    return await TemplateSwimlane.findById(id).lean();
  }

  async findByTemplate(templateId) {
    return await TemplateSwimlane.find({ template_id: templateId }).lean();
  }

  async findByName(templateId, name) {
    return await TemplateSwimlane.findOne({ template_id: templateId, name }).lean();
  }

  async update(id, data) {
    return await TemplateSwimlane.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return await TemplateSwimlane.findByIdAndDelete(id).lean();
  }

    async findByTemplateId(templateId) {
      return await TemplateSwimlane.find({ template_id: templateId }).lean();
    }

  // ==================== SOFT DELETE METHODS ====================

  async softDelete(id) {
    try {
      return await TemplateSwimlane.findByIdAndUpdate(
        id,
        { deleted_at: new Date() },
        { new: true }
      ).lean();
    } catch (error) {
      throw error;
    }
  }

  async findAllWithDeleted(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const query = {
        $or: [
          { deleted_at: null },
          { deleted_at: { $ne: null } }
        ]
      };

      const [templateSwimlanes, total] = await Promise.all([
        TemplateSwimlane.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        TemplateSwimlane.countDocuments(query)
      ]);

      return {
        templateSwimlanes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TemplateSwimlaneRepository();

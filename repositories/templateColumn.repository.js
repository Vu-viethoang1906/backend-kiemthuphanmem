const TemplateColumn = require('../models/templateColumn.model');

class TemplateColumnRepository {
  async create(data) {
    return await TemplateColumn.create(data);
  }

  async findAll() {
    return await TemplateColumn.find().lean();
  }

  async findById(id) {
    return await TemplateColumn.findById(id).lean();
  }

  async findByTemplate(templateId) {
    return await TemplateColumn.find({ template_id: templateId }).lean();
  }

  async findByName(templateId, name) {
    return await TemplateColumn.findOne({ template_id: templateId, name }).lean();
  }

  async update(id, data) {
    return await TemplateColumn.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return await TemplateColumn.findByIdAndDelete(id).lean();
  }

  async findByTemplateId(templateId) {
    return await TemplateColumn.find({ template_id: templateId }).lean();
  }

  // ==================== SOFT DELETE METHODS ====================

  async softDelete(id) {
    try {
      return await TemplateColumn.findByIdAndUpdate(
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

      const [templateColumns, total] = await Promise.all([
        TemplateColumn.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        TemplateColumn.countDocuments(query)
      ]);

      return {
        templateColumns,
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

module.exports = new TemplateColumnRepository();

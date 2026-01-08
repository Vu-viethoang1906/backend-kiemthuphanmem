const Template = require('../models/template.model');

class TemplateRepository {
  async create(data) {
    return await Template.create(data);
  }

  async findAll() {
    return await Template.find().populate('created_by', 'username email full_name');
  }

  async findById(id) {
    return await Template.findById(id).populate('created_by', 'username email');
  }

  async update(id, data) {
    return await Template.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await Template.findByIdAndDelete(id);
  }
  
  async findByName(name , created_by){
   return await Template.findOne({
    name: name ,
    created_by: created_by
  });
  }

  async selectAll(){
    return await Template.find();
  }

// ==================== SOFT DELETE METHODS ====================

async softDelete(id) {
  try {
    return await Template.findByIdAndUpdate(
      id,
      { deleted_at: new Date() },
      { new: true }
    );
  } catch (error) {
    throw error;
  }

}

  async findAllWithDeleted(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const templates = await Template.find({
        $or: [
          { deleted_at: null },
          { deleted_at: { $ne: null } }
        ]
      })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Template.countDocuments({
        $or: [
          { deleted_at: null },
          { deleted_at: { $ne: null } }
        ]
      });

      return {
        templates,
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




module.exports = new TemplateRepository();

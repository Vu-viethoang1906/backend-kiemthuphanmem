const Group = require('../models/group.model');

class GroupRepository {
  async create(data) {
    return await Group.create(data);
  }

  async findById(id) {
    return await Group.findById(id).lean();
  }

  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        filter = {},
        search = null
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build query with filters
      const query = { deleted_at: null };
      if (filter.center_id) query.center_id = filter.center_id;

      // Apply search
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const [groups, total] = await Promise.all([
        Group.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Group.countDocuments(query)
      ]);

      return {
        groups,
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

  async update(id, data) {
    return await Group.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return await Group.findByIdAndDelete(id);
  }

  async findbyName(name){
    return await Group.findOne({name});
  }
  
 async findOne(center_id, name) {
  return await Group.findOne({
    center_id: center_id, // ObjectId
    name: name
  }).lean();
}

// ==================== SOFT DELETE METHODS ====================

async softDelete(id) {
  try {
    return await Group.findByIdAndUpdate(
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

    const [groups, total] = await Promise.all([
      Group.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Group.countDocuments(query)
    ]);

    return {
      groups,
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

module.exports = new GroupRepository();

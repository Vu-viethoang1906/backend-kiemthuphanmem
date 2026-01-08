const Center = require('../models/center.model');

class CenterRepository {
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

      const query = { deleted_at: null };
      if (filter.status) query.status = filter.status;

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const [centers, total] = await Promise.all([
        Center.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Center.countDocuments(query)
      ]);

      return {
        centers,
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

  async findById(id) {
    return Center.findById(id).lean();
  }

  async create(centerData) {
    return Center.create(centerData);
  }

  async update(id, updateData) {
    return Center.findByIdAndUpdate(id, updateData, { new: true }).lean();
  }

  async delete(id) {
    return Center.findByIdAndDelete(id).lean();
  }

  // Kiểm tra user có thuộc center không
  async findMember(user_id, center_id) {
    const CenterMember = require('../models/centerMember.model');
    return CenterMember.findOne({ 
      user_id: user_id, 
      center_id: center_id 
    }).lean();
  }

  // ==================== SOFT DELETE METHODS ====================

  async softDelete(id) {
    try {
      return await Center.findByIdAndUpdate(
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

      const [centers, total] = await Promise.all([
        Center.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Center.countDocuments(query)
      ]);

      return {
        centers,
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

module.exports = new CenterRepository();

const Swimlane = require('../models/swimlane.model');

class SwimlaneRepository {
  async create(data) {
    return await Swimlane.create(data);
  }

  async findById(id) {
    return await Swimlane.findById(id);
  }

  async findAllByBoard(boardId) {
    return await Swimlane.find({ board_id: boardId }).sort({ order: 1 });
  }

  async update(id, data, session = null) {
    const options = { new: true };
    if (session) options.session = session;
    return await Swimlane.findByIdAndUpdate(id, data, options);
  }

  async delete(id) {
    return await Swimlane.findByIdAndDelete(id);
  }

 async insertMany(dataArray, session = null) {
    if (session) {
      return await Swimlane.insertMany(dataArray, { session });
    }
    return await Swimlane.insertMany(dataArray);
  }

  async deleteManyByBoard(boardId, session = null) {
    const query = Swimlane.deleteMany({ board_id: boardId });
    return session ? query.session(session) : query;
  }

  async softDeleteManyByBoard(boardId, session = null) {
    const query = Swimlane.updateMany(
      { board_id: boardId },
      { deleted_at: new Date() }
    );
    return session ? query.session(session) : query;
  }
  // ==================== SOFT DELETE METHODS ====================

  async softDelete(id) {
    try {
      return await Swimlane.findByIdAndUpdate(
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

      const [swimlanes, total] = await Promise.all([
        Swimlane.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Swimlane.countDocuments(query)
      ]);

      return {
        swimlanes,
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

module.exports = new SwimlaneRepository();

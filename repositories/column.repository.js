const Column = require('../models/column.model');

class ColumnRepository {
  async create(data) {
    return await Column.create(data);
  }

  async findById(id) {
    return await Column.findById(id);
  }

  async findAllByBoard(boardId) {
    return await Column.find({ board_id: boardId }).sort({ order: 1 });
  }

  async update(id, data, session = null) {
    const options = { new: true };
    if (session) options.session = session;
    return await Column.findByIdAndUpdate(id, data, options);
  }

  async delete(id) {
    return await Column.findByIdAndDelete(id);
  }
  
  async insertMany(dataArray, session = null) {
    if (session) {
      return await Column.insertMany(dataArray, { session });
    }
    return await Column.insertMany(dataArray);
  }

  async deleteManyByBoard(boardId, session = null) {
    const query = Column.deleteMany({ board_id: boardId });
    return session ? query.session(session) : query;
  }

  // ==================== SOFT DELETE METHODS ====================

  async softDelete(id) {
    try {
      return await Column.findByIdAndUpdate(
        id,
        { deleted_at: new Date() },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async softDeleteManyByBoard(boardId, session = null) {
    try {
      const options = {};
      if (session) options.session = session;
      
      return await Column.updateMany(
        { board_id: boardId, deleted_at: null },
        { deleted_at: new Date() },
        options
      );
    } catch (error) {
      throw error;
    }
  }

  // Set Done Column
  async setDoneColumn(columnId, boardId) {
    try {
      // Start transaction to ensure atomicity
      const session = await require('mongoose').startSession();
      session.startTransaction();

      try {
        // Unset all isDoneColumn in this board
        await Column.updateMany(
          { board_id: boardId, deleted_at: null },
          { isDoneColumn: false },
          { session }
        );

        // Set the target column as Done
        const updatedColumn = await Column.findByIdAndUpdate(
          columnId,
          { isDoneColumn: true },
          { new: true, session }
        );

        await session.commitTransaction();
        session.endSession();

        return updatedColumn;
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Check if column is Done Column
  async isDoneColumn(columnId) {
    try {
      const column = await Column.findById(columnId).select('isDoneColumn').lean();
      return column?.isDoneColumn === true;
    } catch (error) {
      throw error;
    }
  }

  // Get Done Column by board
  async getDoneColumnByBoard(boardId) {
    try {
      return await Column.findOne({ 
        board_id: boardId, 
        isDoneColumn: true,
        deleted_at: null 
      }).lean();
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

      const [columns, total] = await Promise.all([
        Column.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Column.countDocuments(query)
      ]);

      return {
        columns,
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
  async updateMany(filter, data) {
    return await Column.updateMany(filter, { $set: data });
  }
  async findBoardColumn(idBoard){
   try {
    return await Column.find({
      board_id : idBoard
    })
   } catch (error) {
       throw error;
   }

  }

}

module.exports = new ColumnRepository();

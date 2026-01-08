const User = require('../models/usersModel');

class UserRepository {
  async findById(id) {
    try {
      return await User.findById(id).lean();
    } catch (error) {
      throw error;
    }
  }

  async getProfileById(id) {
    try {
      const user = await User.findById(id).lean();
      if (!user) return null;
      const { password, password_hash, ...profile } = user;
      return profile;
    } catch (error) {
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      return await User.findOne({ email: email.toLowerCase().trim() }).exec();
    } catch (error) {
      throw error;
    }
  }

  async findByUsername(username) {
    try {
      return await User.findOne({ username: username.trim() }).lean();
    } catch (error) {
      throw error;
    }
  }

  async findByPhoneNumber(phoneNumber) {
    try {
      return await User.findOne({ phone_number: phoneNumber }).lean();
    } catch (error) {
      throw error;
    }
  }

  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [users, total] = await Promise.all([
        User.find().sort(sort).skip(skip).limit(limit).lean(),
        User.countDocuments()
      ]);

      return {
        users,
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

  async create(userData) {
    try {
      return await User.create(userData);
    } catch (error) {
      throw error;
    }
  }

  async updateById(id, updateData) {
    try {
      updateData.updated_at = new Date();
      return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
    } catch (error) {
      throw error;
    }
  }

  async deleteById(id) {
    try {
      return await User.findByIdAndDelete(id).lean();
    } catch (error) {
      throw error;
    }
  }

  async search(keyword, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const searchQuery = {
        $or: [
          { email: { $regex: keyword, $options: 'i' } },
          { username: { $regex: keyword, $options: 'i' } },
          { full_name: { $regex: keyword, $options: 'i' } }
        ]
      };

      const [users, total] = await Promise.all([
        User.find(searchQuery).sort(sort).skip(skip).limit(limit).lean(),
        User.countDocuments(searchQuery)
      ]);

      return {
        users,
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

  async searchAll(keyword, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const searchQuery = {
        $or: [
          { email: { $regex: keyword, $options: 'i' } },
          { username: { $regex: keyword, $options: 'i' } },
          { full_name: { $regex: keyword, $options: 'i' } }
        ]
      };

      const users = await User.find(searchQuery)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await User.countDocuments(searchQuery);

      return {
        users,
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

  async softDelete(id) {
    try {
      return await User.findByIdAndUpdate(
        id,
        {
          deleted_at: new Date(),
          status: 'inactive'
        },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async restore(id) {
    try {
      return await User.findOneAndUpdate(
        { _id: id, deleted_at: { $ne: null } },
        {
          deleted_at: null,
          status: 'active'
        },
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

      const query = {
        $or: [
          { deleted_at: null },
          { deleted_at: { $ne: null } }
        ]
      };

      const [users, total] = await Promise.all([
        User.find(query).sort(sort).skip(skip).limit(limit).lean(),
        User.countDocuments(query)
      ]);

      return {
        users,
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

  async findDeleted(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'deleted_at',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const query = { deleted_at: { $ne: null } };

      const [users, total] = await Promise.all([
        User.find(query).sort(sort).skip(skip).limit(limit).lean(),
        User.countDocuments(query)
      ]);

      return {
        users,
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

module.exports = new UserRepository();

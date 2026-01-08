const userRepo = require('../repositories/user.repository');
const bcrypt = require('bcrypt');
const keycloak = require('../services/keycloak.service');

class UserService {
  async validateUser(login, password) {
    try {
      if (!login || !password) {
        return null;
      }

      let user = await userRepo.findByEmail(login);
      if (!user) {
        user = await userRepo.findByUsername(login);
      }

      if (!user) {
        return null;
      }

      const isPasswordValid = this._validatePassword(password, user);
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  _validatePassword(inputPassword, user) {
    if (user.password_hash) {
      if (user.password_hash.startsWith('$2b$')) {
        return bcrypt.compareSync(inputPassword, user.password_hash);
      }
      return user.password_hash === inputPassword;
    }

    if (user.password) {
      if (user.password.startsWith('$2b$')) {
        return bcrypt.compareSync(inputPassword, user.password);
      }
      return user.password === inputPassword;
    }

    return false;
  }

  async getAllUsers(options = {}) {
    try {
      return await userRepo.findAll(options);
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id) {
    try {
      return await userRepo.findById(id);
    } catch (error) {
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      return await userRepo.findByEmail(email);
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      return await userRepo.findByUsername(username);
    } catch (error) {
      throw error;
    }
  }

  async createUser(userData) {
    try {
      if (userData.password) {
        userData.password_hash = bcrypt.hashSync(userData.password, 10);
        delete userData.password;
      }
      return await userRepo.create(userData);
    } catch (error) {
      throw error;
    }
  }

  async createUserSSO(userData) {
    try {
      userData.typeAccount = 'SSO';
      return await userRepo.create(userData);
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id, updateData) {
    try {
      if (updateData.password) {
        updateData.password_hash = bcrypt.hashSync(updateData.password, 10);
        delete updateData.password;
      }
      return await userRepo.updateById(id, updateData);
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      return await userRepo.deleteById(id);
    } catch (error) {
      throw error;
    }
  }

  async softDeleteUser(id) {
    try {
      const user = await userRepo.softDelete(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async restoreUser(id) {
    try {
      const user = await userRepo.restore(id);
      if (!user) {
        throw new Error('User not found or not deleted');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getAllUsersWithDeleted(options = {}) {
    try {
      return await userRepo.findAllWithDeleted(options);
    } catch (error) {
      throw error;
    }
  }

  async searchUsers(keyword, options = {}) {
    try {
      return await userRepo.search(keyword, options);
    } catch (error) {
      throw error;
    }
  }

  async searchAllUsers(keyword, page = 1, limit = 10) {
    try {
      return await userRepo.searchAll(keyword, page, limit);
    } catch (error) {
      throw error;
    }
  }

  async getAllDeletedRecords({ type = 'all', page = 1, limit = 10, sort = 'deleted_at', order = 'desc' }) {
    try {
      const options = { page, limit, sortBy: sort, sortOrder: order };
      
      if (type === 'all') {
        return await userRepo.findAllWithDeleted(options);
      }
      
      return await userRepo.findDeleted(options);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();

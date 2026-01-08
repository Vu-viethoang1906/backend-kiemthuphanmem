const SidebarItem = require('../models/SidebarItem.model');

class SidebarItemRepository {
  async findAll() {
    return SidebarItem.find().sort({ menuType: 1, order: 1 });
  }

  async findByMenuType(menuType) {
    return SidebarItem.find({ menuType, isActive: true })
      .sort({ order: 1 })
      .populate('requiredPermissions', 'name description');
  }

  async findById(id) {
    return SidebarItem.findById(id);
  }

  async findByPath(path) {
    return SidebarItem.findOne({ path });
  }

  async findByPaths(paths = []) {
    if (!Array.isArray(paths) || paths.length === 0) {
      return [];
    }
    return SidebarItem.find({ path: { $in: paths } });
  }

  async create(itemData) {
    const item = new SidebarItem(itemData);
    return item.save();
  }

  async update(id, updateData) {
    return SidebarItem.findByIdAndUpdate(id, updateData, { new: true });
  }

  async updateByPath(path, updateData) {
    return SidebarItem.findOneAndUpdate({ path }, updateData, { new: true });
  }

  async delete(id) {
    return SidebarItem.findByIdAndDelete(id);
  }

  async updateOrder(menuType, newOrder) {
    const session = await SidebarItem.startSession();
    session.startTransaction();

    try {
      const bulkOps = newOrder.map((itemId, index) => ({
        updateOne: {
          filter: { _id: itemId, menuType },
          update: { $set: { order: index } },
        },
      }));

      await SidebarItem.bulkWrite(bulkOps, { session });
      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new SidebarItemRepository();

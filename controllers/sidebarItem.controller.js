const sidebarItemService = require('../services/sidebarItem.service');
const { validationResult } = require('express-validator');

class SidebarItemController {
  // Get all sidebar items (admin only)
  async getAllItems(req, res, next) {
    try {
      const items = await sidebarItemService.getAllItems();
      return res.json({ success: true, data: items });
    } catch (error) {
      console.error('Error getting sidebar items:', error);
      return next(error);
    }
  }

  // Get menu items for a specific menu type
  async getMenuItems(req, res, next) {
    try {
      const { menuType } = req.params;
      const userPermissions = req.user?.permissions || [];

      const items = await sidebarItemService.getMenuItems(menuType, userPermissions);
      return res.json({ success: true, data: items });
    } catch (error) {
      console.error('Error getting menu items:', error);
      return next(error);
    }
  }

  // Create a new sidebar item (admin only)
  async createItem(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const item = await sidebarItemService.createItem(req.body);
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      console.error('Error creating sidebar item:', error);
      return next(error);
    }
  }

  // Update a sidebar item (admin only)
  async updateItem(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const updatedItem = await sidebarItemService.updateItem(id, req.body);

      if (!updatedItem) {
        return res.status(404).json({ success: false, message: 'Sidebar item not found' });
      }

      return res.json({ success: true, data: updatedItem });
    } catch (error) {
      console.error('Error updating sidebar item:', error);
      return next(error);
    }
  }

  // Delete a sidebar item (admin only)
  async deleteItem(req, res, next) {
    try {
      const { id } = req.params;
      const result = await sidebarItemService.deleteItem(id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Sidebar item not found' });
      }

      return res.json({ success: true, message: 'Sidebar item deleted successfully' });
    } catch (error) {
      console.error('Error deleting sidebar item:', error);
      return next(error);
    }
  }

  // Update menu item order (admin only)
  async updateMenuOrder(req, res, next) {
    try {
      const { menuType } = req.params;
      const { order } = req.body;

      if (!Array.isArray(order)) {
        return res.status(400).json({
          success: false,
          message: 'Order must be an array of item IDs',
        });
      }

      await sidebarItemService.updateMenuOrder(menuType, order);
      return res.json({ success: true, message: 'Menu order updated successfully' });
    } catch (error) {
      console.error('Error updating menu order:', error);
      return next(error);
    }
  }

  // Simplified config for basic sidebar items
  async getBasicConfig(req, res, next) {
    try {
      const configs = await sidebarItemService.getBasicSidebarConfig();
      return res.json({ success: true, data: configs });
    } catch (error) {
      console.error('Error getting basic sidebar config:', error);
      return next(error);
    }
  }

  async getSidebarConfig(req, res, next) {
    try {
      const configs = await sidebarItemService.getSidebarConfig();
      return res.json({ success: true, data: configs });
    } catch (error) {
      console.error('Error getting sidebar config:', error);
      return next(error);
    }
  }
  async updateBasicItem(req, res, next) {
    try {
      const { key } = req.params;
      const { name, icon } = req.body;

      if (!name && !icon) {
        return res.status(400).json({
          success: false,
          message: 'Name or icon is required',
        });
      }

      const result = await sidebarItemService.updateBasicSidebarItem(key, {
        name,
        icon,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error updating basic sidebar item:', error);
      return next(error);
    }
  }

  async uploadBasicIcon(req, res, next) {
    try {
      const { key } = req.params;
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Icon file is required',
        });
      }

      const result = await sidebarItemService.updateBasicSidebarIcon(key, req.file);

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error uploading sidebar icon:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}

module.exports = new SidebarItemController();

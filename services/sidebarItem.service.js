const sidebarItemRepository = require('../repositories/sidebarItem.repository');
const path = require('node:path');
const fs = require('node:fs');

const BASIC_SIDEBAR_ITEMS = {
  // Main menu
  introduction: {
    label: 'Introduction',
    path: '/admin/introduction',
    defaultIcon: 'introduction',
    menuType: 'main',
  },
  dashboard: {
    label: 'Dashboard',
    path: '/admin',
    defaultIcon: 'dashboard',
    menuType: 'main',
  },
  projects: {
    label: 'Projects',
    path: '/admin/projects',
    defaultIcon: 'projects',
    menuType: 'main',
  },
  reports: {
    label: 'Reports',
    path: '/admin/reports',
    defaultIcon: 'reports',
    menuType: 'main',
  },
  groups: {
    label: 'Groups',
    path: '/admin/groups',
    defaultIcon: 'groups',
    menuType: 'main',
  },
  // Personal menu
  profile: {
    label: 'Profile',
    path: '/admin/profile',
    defaultIcon: 'Profile',
    menuType: 'personal',
  },
  settings: {
    label: 'Settings',
    path: '/admin/settings',
    defaultIcon: 'Settings',
    menuType: 'personal',
  },
  // Admin menu
  usermanagement: {
    label: 'UserManagement',
    path: '/admin/usermanagement',
    defaultIcon: 'UserManagement',
    menuType: 'admin',
  },
  roleandpermission: {
    label: 'RoleAndPermission',
    path: '/admin/roleandpermission',
    defaultIcon: 'RoleAndPermission',
    menuType: 'admin',
  },
  permissionmanagement: {
    label: 'PermissionManagement',
    path: '/admin/permissionmanagement',
    defaultIcon: 'RoleAndPermission',
    menuType: 'admin',
  },
  templates: {
    label: 'Templates',
    path: '/admin/templates',
    defaultIcon: 'templates',
    menuType: 'admin',
  },
  centers: {
    label: 'Centers',
    path: '/admin/centers',
    defaultIcon: 'center',
    menuType: 'admin',
  },
  userpoints: {
    label: 'UserPoints',
    path: '/admin/userpoints',
    defaultIcon: 'point',
    menuType: 'admin',
  },
};

class SidebarItemService {
  async getAllItems() {
    return sidebarItemRepository.findAll();
  }

  async getMenuItems(menuType, userPermissions = []) {
    const items = await sidebarItemRepository.findByMenuType(menuType);

    // Filter items based on user permissions
    return items.filter(item => {
      // If no permissions required, show the item
      if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
        return true;
      }

      // Check if user has all required permissions
      const requiredPermissionIds = item.requiredPermissions.map(p => p._id.toString());
      return requiredPermissionIds.every(permId => userPermissions.includes(permId));
    });
  }

  async getItemById(id) {
    return sidebarItemRepository.findById(id);
  }

  async createItem(itemData) {
    return await sidebarItemRepository.create(itemData);
  }

  async updateItem(id, updateData) {
    return sidebarItemRepository.update(id, updateData);
  }

  async deleteItem(id) {
    return sidebarItemRepository.delete(id);
  }

  async updateMenuOrder(menuType, newOrder) {
    return sidebarItemRepository.updateOrder(menuType, newOrder);
  }

  async getBasicSidebarConfig() {
    const targetPaths = Object.values(BASIC_SIDEBAR_ITEMS).map(item => item.path);
    const items = await sidebarItemRepository.findByPaths(targetPaths);
    const itemMap = new Map(items.map(item => [item.path, item]));

    return Object.entries(BASIC_SIDEBAR_ITEMS).map(([key, config]) => {
      const dbItem = itemMap.get(config.path);
      return {
        key,
        path: config.path,
        label: config.label,
        defaultIcon: config.defaultIcon,
        menuType: config.menuType,
        itemId: dbItem?._id || null,
        name: dbItem?.name || config.label,
        icon: dbItem?.icon || config.defaultIcon,
        iconUrl: dbItem?.iconUrl || null,
        updatedAt: dbItem?.updatedAt || null,
      };
    });
  }

  async updateBasicSidebarItem(key, payload = {}) {
    const config = BASIC_SIDEBAR_ITEMS[key];
    if (!config) {
      const error = new Error('Invalid sidebar key');
      error.statusCode = 400;
      throw error;
    }

    const updateData = {};
    if (payload.name) updateData.name = payload.name;
    if (payload.icon) updateData.icon = payload.icon;

    if (Object.keys(updateData).length === 0) {
      const error = new Error('Name or icon is required');
      error.statusCode = 400;
      throw error;
    }

    const updated = await sidebarItemRepository.updateByPath(config.path, updateData);

    if (!updated) {
      const error = new Error('Sidebar item not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      key,
      path: config.path,
      label: config.label,
      itemId: updated._id,
      name: updated.name,
      icon: updated.icon,
      iconUrl: updated.iconUrl || null,
      updatedAt: updated.updatedAt,
    };
  }

  async updateBasicSidebarIcon(key, file) {
    const config = BASIC_SIDEBAR_ITEMS[key];
    if (!config) {
      const error = new Error('Invalid sidebar key');
      error.statusCode = 400;
      throw error;
    }

    if (!file) {
      const error = new Error('Icon file is required');
      error.statusCode = 400;
      throw error;
    }

    const newIconUrl = `/api/uploads/icons/${file.filename}`;
    let existing = await sidebarItemRepository.findByPath(config.path);

    // Create item if it doesn't exist
    if (!existing) {
      try {
        existing = await sidebarItemRepository.create({
          menuType: config.menuType || 'main',
          name: config.label,
          icon: config.defaultIcon,
          path: config.path,
          order: 0,
          isActive: true,
          requiredPermissions: [],
        });
      } catch (createError) {
        console.error('Error creating sidebar item:', createError);
        const error = new Error('Failed to create sidebar item');
        error.statusCode = 500;
        throw error;
      }
    }

    const oldIconUrl = existing.iconUrl;

    const updated = await sidebarItemRepository.updateByPath(config.path, {
      iconUrl: newIconUrl,
    });

    if (!updated) {
      const error = new Error('Failed to update sidebar icon');
      error.statusCode = 500;
      throw error;
    }

    // Delete old icon file if it exists and is different
    if (oldIconUrl && oldIconUrl !== newIconUrl && !oldIconUrl.includes('http')) {
      try {
        this.deleteIconFile(oldIconUrl);
      } catch (deleteError) {
        console.warn('Failed to delete old icon file:', deleteError.message);
        // Don't throw, just log the warning
      }
    }

    return {
      key,
      path: config.path,
      label: config.label,
      itemId: updated._id,
      name: updated.name,
      icon: updated.icon,
      iconUrl: updated.iconUrl || newIconUrl,
      updatedAt: updated.updatedAt,
    };
  }

  deleteIconFile(iconUrl) {
    try {
      const relativePath = iconUrl.startsWith('/') ? iconUrl.replace(/^\//, '') : iconUrl;
      const absolutePath = path.resolve(__dirname, '..', relativePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (error) {
      console.warn('Failed to remove old sidebar icon:', error.message);
    }
  }

  async getAllSidebarConfig() {
    // Lấy tất cả item active từ DB
    const items = await sidebarItemRepository.findAll();

    // Chuyển đổi dữ liệu nếu cần (ví dụ rename key, thêm iconUrl mặc định)
    return items.map(item => ({
      itemId: item._id,
      key: item.key || item.path, // nếu bạn muốn có key
      path: item.path,
      name: item.name,
      label: item.label || item.name,
      icon: item.icon,
      iconUrl: item.iconUrl || null,
      menuType: item.menuType,
      updatedAt: item.updatedAt || null,
    }));
  }

  // sidebarItemService.js
  async getSidebarConfig() {
    const items = await sidebarItemRepository.findAll();

    return items.map(item => ({
      key: item.key, // nếu DB chưa có key thì fallback bằng path
      path: item.path,
      label: item.label || item.name,
      defaultIcon: item.defaultIcon || item.icon || item.key,
      menuType: item.menuType,
      itemId: item._id,
      name: item.name,
      icon: item.icon || item.defaultIcon || item.key,
      iconUrl: item.iconUrl || null,
      updatedAt: item.updatedAt || null,
    }));
  }
}

module.exports = new SidebarItemService();
module.exports.BASIC_SIDEBAR_ITEMS = BASIC_SIDEBAR_ITEMS;

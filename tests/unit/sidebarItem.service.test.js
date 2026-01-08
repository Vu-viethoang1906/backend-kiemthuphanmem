// 📄 tests/unit/sidebarItem.service.test.js - Sidebar Item Service Unit Tests
// ============================================================================
// Comprehensive test suite for all business logic in sidebarItem service
// Test coverage includes: CRUD operations, permissions filtering, icon management,
// menu ordering, basic sidebar config, and integration scenarios
// ============================================================================

const mongoose = require('mongoose');

// Mock repository before importing service
jest.mock('../../repositories/sidebarItem.repository', () => ({
  findAll: jest.fn(),
  findByMenuType: jest.fn(),
  findById: jest.fn(),
  findByPath: jest.fn(),
  findByPaths: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateByPath: jest.fn(),
  delete: jest.fn(),
  updateOrder: jest.fn(),
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(() => true),
  unlinkSync: jest.fn(),
}));

jest.mock('node:path', () => ({
  resolve: jest.fn((dir, ...parts) => `/fake/path/${parts.join('/')}`),
}));

const sidebarItemService = require('../../services/sidebarItem.service');
const sidebarItemRepository = require('../../repositories/sidebarItem.repository');
const fs = require('node:fs');

describe('🔹 Sidebar Item Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== GROUP 1: Get All Items ==========
  describe('✅ getAllItems - Lấy tất cả sidebar items', () => {
    it('should return all sidebar items from database', async () => {
      const mockItems = [
        { _id: '1', name: 'Dashboard', path: '/admin', menuType: 'main' },
        { _id: '2', name: 'Settings', path: '/admin/settings', menuType: 'personal' },
      ];

      sidebarItemRepository.findAll.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getAllItems();

      expect(result).toEqual(mockItems);
      expect(sidebarItemRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no items exist', async () => {
      sidebarItemRepository.findAll.mockResolvedValue([]);

      const result = await sidebarItemService.getAllItems();

      expect(result).toEqual([]);
      expect(sidebarItemRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      sidebarItemRepository.findAll.mockRejectedValue(dbError);

      await expect(sidebarItemService.getAllItems()).rejects.toThrow('Database connection failed');
    });
  });

  // ========== GROUP 2: Get Menu Items By Type ==========
  describe('✅ getMenuItems - Lấy items theo loại menu', () => {
    it('should return items for specific menu type without permission filtering', async () => {
      const mockItems = [
        { _id: '1', name: 'Dashboard', path: '/admin', menuType: 'main', requiredPermissions: [] },
        {
          _id: '2',
          name: 'Projects',
          path: '/admin/projects',
          menuType: 'main',
          requiredPermissions: [],
        },
      ];

      sidebarItemRepository.findByMenuType.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getMenuItems('main', []);

      expect(result).toEqual(mockItems);
      expect(sidebarItemRepository.findByMenuType).toHaveBeenCalledWith('main');
    });

    it('should filter items based on user permissions - allow items with matching permissions', async () => {
      const permId = new mongoose.Types.ObjectId();
      const mockItems = [
        {
          _id: '1',
          name: 'Dashboard',
          path: '/admin',
          menuType: 'admin',
          requiredPermissions: [{ _id: permId }],
        },
        {
          _id: '2',
          name: 'No Permission Item',
          path: '/admin/settings',
          menuType: 'admin',
          requiredPermissions: [{ _id: new mongoose.Types.ObjectId() }],
        },
      ];

      sidebarItemRepository.findByMenuType.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getMenuItems('admin', [permId.toString()]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Dashboard');
    });

    it('should show items with no required permissions for all users', async () => {
      const mockItems = [
        {
          _id: '1',
          name: 'Public Item',
          path: '/admin/public',
          menuType: 'main',
          requiredPermissions: [],
        },
        {
          _id: '2',
          name: 'Another Public',
          path: '/admin/other',
          menuType: 'main',
          requiredPermissions: null,
        },
      ];

      sidebarItemRepository.findByMenuType.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getMenuItems('main', []);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no permissions for any items', async () => {
      const mockItems = [
        {
          _id: '1',
          name: 'Admin Only',
          path: '/admin',
          menuType: 'admin',
          requiredPermissions: [{ _id: new mongoose.Types.ObjectId() }],
        },
      ];

      sidebarItemRepository.findByMenuType.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getMenuItems('admin', []);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple permission checks correctly', async () => {
      const perm1 = new mongoose.Types.ObjectId();
      const perm2 = new mongoose.Types.ObjectId();
      const perm3 = new mongoose.Types.ObjectId();

      const mockItems = [
        {
          _id: '1',
          name: 'Multi Perm Item',
          requiredPermissions: [{ _id: perm1 }, { _id: perm2 }],
        },
        {
          _id: '2',
          name: 'Single Perm Item',
          requiredPermissions: [{ _id: perm1 }],
        },
      ];

      sidebarItemRepository.findByMenuType.mockResolvedValue(mockItems);

      // User has all permissions
      const result = await sidebarItemService.getMenuItems('admin', [
        perm1.toString(),
        perm2.toString(),
        perm3.toString(),
      ]);

      expect(result).toHaveLength(2);
    });
  });

  // ========== GROUP 3: Get Item By ID ==========
  describe('✅ getItemById - Lấy item theo ID', () => {
    it('should return item when found', async () => {
      const itemId = new mongoose.Types.ObjectId();
      const mockItem = {
        _id: itemId,
        name: 'Dashboard',
        path: '/admin',
        menuType: 'main',
      };

      sidebarItemRepository.findById.mockResolvedValue(mockItem);

      const result = await sidebarItemService.getItemById(itemId);

      expect(result).toEqual(mockItem);
      expect(sidebarItemRepository.findById).toHaveBeenCalledWith(itemId);
    });

    it('should return null when item not found', async () => {
      const itemId = new mongoose.Types.ObjectId();
      sidebarItemRepository.findById.mockResolvedValue(null);

      const result = await sidebarItemService.getItemById(itemId);

      expect(result).toBeNull();
    });
  });

  // ========== GROUP 4: Create Item ==========
  describe('✅ createItem - Tạo item mới', () => {
    it('should create item with valid data', async () => {
      const itemData = {
        name: 'New Menu',
        path: '/admin/new',
        menuType: 'main',
        icon: 'newicon',
      };

      const createdItem = { _id: '1', ...itemData };
      sidebarItemRepository.create.mockResolvedValue(createdItem);

      const result = await sidebarItemService.createItem(itemData);

      expect(result).toEqual(createdItem);
      expect(sidebarItemRepository.create).toHaveBeenCalledWith(itemData);
    });

    it('should handle creation errors', async () => {
      const itemData = {
        name: 'Invalid Item',
        path: '/invalid',
        menuType: 'invalid_type',
      };

      const error = new Error('Invalid menu type');
      sidebarItemRepository.create.mockRejectedValue(error);

      await expect(sidebarItemService.createItem(itemData)).rejects.toThrow('Invalid menu type');
    });
  });

  // ========== GROUP 5: Update Item ==========
  describe('✅ updateItem - Cập nhật item', () => {
    it('should update item with provided data', async () => {
      const itemId = '1';
      const updateData = { name: 'Updated Name', icon: 'newiconname' };
      const updatedItem = { _id: itemId, ...updateData };

      sidebarItemRepository.update.mockResolvedValue(updatedItem);

      const result = await sidebarItemService.updateItem(itemId, updateData);

      expect(result).toEqual(updatedItem);
      expect(sidebarItemRepository.update).toHaveBeenCalledWith(itemId, updateData);
    });

    it('should return null when item not found during update', async () => {
      const itemId = '1';
      const updateData = { name: 'Updated' };

      sidebarItemRepository.update.mockResolvedValue(null);

      const result = await sidebarItemService.updateItem(itemId, updateData);

      expect(result).toBeNull();
    });
  });

  // ========== GROUP 6: Delete Item ==========
  describe('✅ deleteItem - Xóa item', () => {
    it('should delete item successfully', async () => {
      const itemId = '1';
      const deletedItem = { _id: itemId, name: 'Deleted Item' };

      sidebarItemRepository.delete.mockResolvedValue(deletedItem);

      const result = await sidebarItemService.deleteItem(itemId);

      expect(result).toEqual(deletedItem);
      expect(sidebarItemRepository.delete).toHaveBeenCalledWith(itemId);
    });

    it('should return null when item not found during delete', async () => {
      const itemId = 'nonexistent';

      sidebarItemRepository.delete.mockResolvedValue(null);

      const result = await sidebarItemService.deleteItem(itemId);

      expect(result).toBeNull();
    });
  });

  // ========== GROUP 7: Update Menu Order ==========
  describe('✅ updateMenuOrder - Cập nhật thứ tự menu', () => {
    it('should update order for all items in menu type', async () => {
      const menuType = 'main';
      const newOrder = ['id1', 'id2', 'id3'];

      sidebarItemRepository.updateOrder.mockResolvedValue(true);

      const result = await sidebarItemService.updateMenuOrder(menuType, newOrder);

      expect(result).toBe(true);
      expect(sidebarItemRepository.updateOrder).toHaveBeenCalledWith(menuType, newOrder);
    });

    it('should handle transaction errors during order update', async () => {
      const menuType = 'main';
      const newOrder = ['id1', 'id2'];
      const error = new Error('Transaction failed');

      sidebarItemRepository.updateOrder.mockRejectedValue(error);

      await expect(sidebarItemService.updateMenuOrder(menuType, newOrder)).rejects.toThrow(
        'Transaction failed'
      );
    });
  });

  // ========== GROUP 8: Get Basic Sidebar Config ==========
  describe('✅ getBasicSidebarConfig - Lấy cấu hình sidebar cơ bản', () => {
    it('should return basic sidebar configuration with all predefined items', async () => {
      const mockDbItems = [
        {
          _id: '1',
          path: '/admin/introduction',
          name: 'Introduction',
          icon: 'introduction',
          updatedAt: new Date(),
        },
        {
          _id: '2',
          path: '/admin',
          name: 'Dashboard',
          icon: 'dashboard',
          updatedAt: new Date(),
        },
      ];

      sidebarItemRepository.findByPaths.mockResolvedValue(mockDbItems);

      const result = await sidebarItemService.getBasicSidebarConfig();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('key');
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('label');
      expect(result[0]).toHaveProperty('defaultIcon');
      expect(result[0]).toHaveProperty('menuType');
      expect(result[0]).toHaveProperty('itemId');
    });

    it('should merge DB data with default config values', async () => {
      const mockDbItems = [
        {
          _id: '1',
          path: '/admin',
          name: 'Custom Dashboard',
          icon: 'custom-icon',
          iconUrl: '/uploads/custom.svg',
          updatedAt: new Date(),
        },
      ];

      sidebarItemRepository.findByPaths.mockResolvedValue(mockDbItems);

      const result = await sidebarItemService.getBasicSidebarConfig();

      const dashboardConfig = result.find(item => item.path === '/admin');
      expect(dashboardConfig.name).toBe('Custom Dashboard');
      expect(dashboardConfig.icon).toBe('custom-icon');
      expect(dashboardConfig.iconUrl).toBe('/uploads/custom.svg');
    });

    it('should use default values when DB item does not exist', async () => {
      sidebarItemRepository.findByPaths.mockResolvedValue([]);

      const result = await sidebarItemService.getBasicSidebarConfig();

      const dashboardConfig = result.find(item => item.key === 'dashboard');
      expect(dashboardConfig).toBeDefined();
      expect(dashboardConfig.itemId).toBeNull();
      expect(dashboardConfig.label).toBe('Dashboard');
      expect(dashboardConfig.defaultIcon).toBe('dashboard');
    });
  });

  // ========== GROUP 9: Update Basic Sidebar Item ==========
  describe('✅ updateBasicSidebarItem - Cập nhật item sidebar cơ bản', () => {
    it('should update name for valid sidebar key', async () => {
      const updatedItem = {
        _id: '1',
        path: '/admin',
        name: 'New Dashboard Name',
        icon: 'dashboard',
        updatedAt: new Date(),
      };

      sidebarItemRepository.updateByPath.mockResolvedValue(updatedItem);

      const result = await sidebarItemService.updateBasicSidebarItem('dashboard', {
        name: 'New Dashboard Name',
      });

      expect(result).toHaveProperty('key', 'dashboard');
      expect(result).toHaveProperty('name', 'New Dashboard Name');
      expect(sidebarItemRepository.updateByPath).toHaveBeenCalledWith(
        '/admin',
        expect.objectContaining({ name: 'New Dashboard Name' })
      );
    });

    it('should update icon for valid sidebar key', async () => {
      const updatedItem = {
        _id: '1',
        path: '/admin',
        name: 'Dashboard',
        icon: 'new-dashboard-icon',
        updatedAt: new Date(),
      };

      sidebarItemRepository.updateByPath.mockResolvedValue(updatedItem);

      const result = await sidebarItemService.updateBasicSidebarItem('dashboard', {
        icon: 'new-dashboard-icon',
      });

      expect(result).toHaveProperty('icon', 'new-dashboard-icon');
    });

    it('should update both name and icon simultaneously', async () => {
      const updatedItem = {
        _id: '1',
        path: '/admin',
        name: 'My Dashboard',
        icon: 'custom-icon',
        updatedAt: new Date(),
      };

      sidebarItemRepository.updateByPath.mockResolvedValue(updatedItem);

      const result = await sidebarItemService.updateBasicSidebarItem('dashboard', {
        name: 'My Dashboard',
        icon: 'custom-icon',
      });

      expect(result.name).toBe('My Dashboard');
      expect(result.icon).toBe('custom-icon');
    });

    it('should throw error for invalid sidebar key', async () => {
      try {
        await sidebarItemService.updateBasicSidebarItem('invalid_key', { name: 'Test' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Invalid sidebar key');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should throw error when neither name nor icon is provided', async () => {
      try {
        await sidebarItemService.updateBasicSidebarItem('dashboard', {});
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Name or icon is required');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should throw error when sidebar item not found in database', async () => {
      sidebarItemRepository.updateByPath.mockResolvedValue(null);

      try {
        await sidebarItemService.updateBasicSidebarItem('dashboard', { name: 'Updated' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Sidebar item not found');
        expect(error.statusCode).toBe(404);
      }
    });
  });

  // ========== GROUP 10: Update Basic Sidebar Icon ==========
  describe('✅ updateBasicSidebarIcon - Cập nhật icon sidebar cơ bản', () => {
    it('should upload icon and update sidebar item', async () => {
      const mockFile = { filename: 'icon-dashboard-new.svg' };
      const existingItem = {
        _id: '1',
        path: '/admin',
        name: 'Dashboard',
        icon: 'dashboard',
        iconUrl: null,
      };

      const updatedItem = {
        ...existingItem,
        iconUrl: '/api/uploads/icons/icon-dashboard-new.svg',
        updatedAt: new Date(),
      };

      sidebarItemRepository.findByPath.mockResolvedValue(existingItem);
      sidebarItemRepository.updateByPath.mockResolvedValue(updatedItem);

      const result = await sidebarItemService.updateBasicSidebarIcon('dashboard', mockFile);

      expect(result).toHaveProperty('key', 'dashboard');
      expect(result).toHaveProperty('iconUrl', '/api/uploads/icons/icon-dashboard-new.svg');
      expect(sidebarItemRepository.updateByPath).toHaveBeenCalled();
    });

    it('should create sidebar item if it does not exist', async () => {
      const mockFile = { filename: 'new-icon.svg' };

      sidebarItemRepository.findByPath.mockResolvedValue(null);

      const createdItem = {
        _id: '2',
        path: '/admin/projects',
        name: 'Projects',
        icon: 'projects',
        menuType: 'main',
        order: 0,
        isActive: true,
        requiredPermissions: [],
      };

      const updatedItem = {
        ...createdItem,
        iconUrl: '/api/uploads/icons/new-icon.svg',
        updatedAt: new Date(),
      };

      sidebarItemRepository.create.mockResolvedValue(createdItem);
      sidebarItemRepository.updateByPath.mockResolvedValue(updatedItem);

      const result = await sidebarItemService.updateBasicSidebarIcon('projects', mockFile);

      expect(sidebarItemRepository.create).toHaveBeenCalled();
      expect(result).toHaveProperty('iconUrl', '/api/uploads/icons/new-icon.svg');
    });

    it('should throw error for invalid sidebar key', async () => {
      const mockFile = { filename: 'icon.svg' };

      try {
        await sidebarItemService.updateBasicSidebarIcon('invalid_key', mockFile);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Invalid sidebar key');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should throw error when file is not provided', async () => {
      try {
        await sidebarItemService.updateBasicSidebarIcon('dashboard', null);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Icon file is required');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should delete old icon file when updating with new icon', async () => {
      const mockFile = { filename: 'icon-new.svg' };
      const existingItem = {
        _id: '1',
        path: '/admin',
        name: 'Dashboard',
        icon: 'dashboard',
        iconUrl: '/api/uploads/icons/icon-old.svg',
      };

      const updatedItem = {
        ...existingItem,
        iconUrl: '/api/uploads/icons/icon-new.svg',
        updatedAt: new Date(),
      };

      sidebarItemRepository.findByPath.mockResolvedValue(existingItem);
      sidebarItemRepository.updateByPath.mockResolvedValue(updatedItem);

      const result = await sidebarItemService.updateBasicSidebarIcon('dashboard', mockFile);

      expect(result.iconUrl).toBe('/api/uploads/icons/icon-new.svg');
      // The old icon deletion logic is called
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should not delete external URL icons', async () => {
      const mockFile = { filename: 'icon-new.svg' };
      const existingItem = {
        _id: '1',
        path: '/admin',
        name: 'Dashboard',
        icon: 'dashboard',
        iconUrl: 'https://cdn.example.com/icon-external.svg',
      };

      const updatedItem = {
        ...existingItem,
        iconUrl: '/api/uploads/icons/icon-new.svg',
        updatedAt: new Date(),
      };

      sidebarItemRepository.findByPath.mockResolvedValue(existingItem);
      sidebarItemRepository.updateByPath.mockResolvedValue(updatedItem);

      const result = await sidebarItemService.updateBasicSidebarIcon('dashboard', mockFile);

      expect(result.iconUrl).toBe('/api/uploads/icons/icon-new.svg');
      // Should not try to delete external URLs
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle file deletion errors gracefully', async () => {
      const mockFile = { filename: 'icon-new.svg' };
      const existingItem = {
        _id: '1',
        path: '/admin',
        name: 'Dashboard',
        icon: 'dashboard',
        iconUrl: '/api/uploads/icons/icon-old.svg',
      };

      const updatedItem = {
        ...existingItem,
        iconUrl: '/api/uploads/icons/icon-new.svg',
        updatedAt: new Date(),
      };

      sidebarItemRepository.findByPath.mockResolvedValue(existingItem);
      sidebarItemRepository.updateByPath.mockResolvedValue(updatedItem);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw error, just log warning
      const result = await sidebarItemService.updateBasicSidebarIcon('dashboard', mockFile);

      expect(result.iconUrl).toBe('/api/uploads/icons/icon-new.svg');
    });
  });

  // ========== GROUP 11: Get All Sidebar Config ==========
  describe('✅ getAllSidebarConfig - Lấy tất cả cấu hình sidebar', () => {
    it('should return all sidebar items with proper format', async () => {
      const mockItems = [
        {
          _id: '1',
          path: '/admin',
          name: 'Dashboard',
          label: 'Dashboard Label',
          icon: 'dashboard',
          iconUrl: null,
          menuType: 'main',
          updatedAt: new Date(),
        },
        {
          _id: '2',
          path: '/admin/settings',
          name: 'Settings',
          label: null,
          icon: 'settings',
          iconUrl: '/uploads/settings.svg',
          menuType: 'personal',
          updatedAt: new Date(),
        },
      ];

      sidebarItemRepository.findAll.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getAllSidebarConfig();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('itemId', '1');
      expect(result[0]).toHaveProperty('path', '/admin');
      expect(result[1]).toHaveProperty('iconUrl', '/uploads/settings.svg');
    });

    it('should handle items without optional fields', async () => {
      const mockItems = [
        {
          _id: '1',
          path: '/admin',
          name: 'Dashboard',
          icon: 'dashboard',
          menuType: 'main',
          // No updatedAt, iconUrl, label
        },
      ];

      sidebarItemRepository.findAll.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getAllSidebarConfig();

      expect(result[0]).toHaveProperty('iconUrl', null);
      expect(result[0]).toHaveProperty('updatedAt', null);
    });
  });

  // ========== GROUP 12: Get Sidebar Config ==========
  describe('✅ getSidebarConfig - Lấy cấu hình sidebar', () => {
    it('should return formatted sidebar configuration', async () => {
      const mockItems = [
        {
          _id: '1',
          key: 'dashboard',
          path: '/admin',
          label: 'Dashboard',
          defaultIcon: 'dashboard',
          name: 'Dashboard',
          icon: 'dashboard',
          iconUrl: null,
          menuType: 'main',
          updatedAt: new Date(),
        },
      ];

      sidebarItemRepository.findAll.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getSidebarConfig();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('key', 'dashboard');
      expect(result[0]).toHaveProperty('path', '/admin');
      expect(result[0]).toHaveProperty('label', 'Dashboard');
    });

    it('should use path as fallback for missing key', async () => {
      const mockItems = [
        {
          _id: '1',
          path: '/admin',
          label: 'Dashboard',
          name: 'Dashboard',
          icon: 'dashboard',
          menuType: 'main',
        },
      ];

      sidebarItemRepository.findAll.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getSidebarConfig();

      expect(result[0]).toHaveProperty('key');
      expect(result[0]).toHaveProperty('path', '/admin');
    });

    it('should use name as fallback for missing label', async () => {
      const mockItems = [
        {
          _id: '1',
          key: 'dashboard',
          path: '/admin',
          name: 'Dashboard Name',
          icon: 'dashboard',
          menuType: 'main',
        },
      ];

      sidebarItemRepository.findAll.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getSidebarConfig();

      expect(result[0]).toHaveProperty('label', 'Dashboard Name');
    });

    it('should use icon as fallback for missing defaultIcon', async () => {
      const mockItems = [
        {
          _id: '1',
          key: 'dashboard',
          path: '/admin',
          icon: 'dashboard-icon',
          menuType: 'main',
        },
      ];

      sidebarItemRepository.findAll.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getSidebarConfig();

      expect(result[0]).toHaveProperty('defaultIcon', 'dashboard-icon');
    });

    it('should use key as ultimate fallback for icon', async () => {
      const mockItems = [
        {
          _id: '1',
          key: 'dashboard',
          path: '/admin',
          name: 'Dashboard',
          menuType: 'main',
        },
      ];

      sidebarItemRepository.findAll.mockResolvedValue(mockItems);

      const result = await sidebarItemService.getSidebarConfig();

      expect(result[0]).toHaveProperty('icon', 'dashboard');
    });
  });

  // ========== GROUP 13: Delete Icon File ==========
  describe('✅ deleteIconFile - Xóa file icon', () => {
    it('should delete file when it exists locally', () => {
      const iconUrl = '/api/uploads/icons/test.svg';

      const result = sidebarItemService.deleteIconFile(iconUrl);

      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should not throw error when file does not exist', () => {
      const iconUrl = '/api/uploads/icons/nonexistent.svg';
      fs.existsSync.mockReturnValue(false);

      expect(() => sidebarItemService.deleteIconFile(iconUrl)).not.toThrow();
    });

    it('should handle unlink errors gracefully', () => {
      const iconUrl = '/api/uploads/icons/protected.svg';
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => sidebarItemService.deleteIconFile(iconUrl)).not.toThrow();
    });
  });

  // ========== GROUP 14: Edge Cases & Integration Tests ==========
  describe('🔄 Edge Cases & Integration Scenarios', () => {
    it('should handle multiple permission checks in getMenuItems', async () => {
      const perm1 = new mongoose.Types.ObjectId();
      const perm2 = new mongoose.Types.ObjectId();
      const perm3 = new mongoose.Types.ObjectId();

      const mockItems = [
        {
          _id: '1',
          name: 'Admin Panel',
          requiredPermissions: [{ _id: perm1 }, { _id: perm2 }],
        },
        {
          _id: '2',
          name: 'Super Admin Only',
          requiredPermissions: [{ _id: perm1 }, { _id: perm2 }, { _id: perm3 }],
        },
        {
          _id: '3',
          name: 'Editor Panel',
          requiredPermissions: [{ _id: perm1 }],
        },
      ];

      sidebarItemRepository.findByMenuType.mockResolvedValue(mockItems);

      // User has perm1 and perm2
      const result = await sidebarItemService.getMenuItems('admin', [
        perm1.toString(),
        perm2.toString(),
      ]);

      expect(result).toHaveLength(2);
      expect(result.map(i => i.name)).toEqual(['Admin Panel', 'Editor Panel']);
    });

    it('should correctly export BASIC_SIDEBAR_ITEMS constants', () => {
      const basicItems = sidebarItemService.BASIC_SIDEBAR_ITEMS;

      expect(basicItems).toBeDefined();
      expect(basicItems.dashboard).toBeDefined();
      expect(basicItems.dashboard.path).toBe('/admin');
      expect(basicItems.dashboard.menuType).toBe('main');
      expect(basicItems.projects).toBeDefined();
      expect(basicItems.settings).toBeDefined();
    });

    it('should handle null or undefined user permissions gracefully', async () => {
      const mockItems = [{ _id: '1', name: 'Item', requiredPermissions: [] }];

      sidebarItemRepository.findByMenuType.mockResolvedValue(mockItems);

      const result1 = await sidebarItemService.getMenuItems('main', undefined);
      const result2 = await sidebarItemService.getMenuItems('main', null);

      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
    });
  });
});

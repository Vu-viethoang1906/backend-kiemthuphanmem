// 📄 tests/unit/sidebarItem.controller.test.js - Sidebar Item Controller Unit Tests
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: 'user123',
      roles: ['System_Manager'],
      permissions: ['VIEW_TASK', 'CREATE_TASK'],
    };
    next();
  },
  authorizeAny: requiredRoles => (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasPermission = requiredRoles.split(' ').some(role => userRoles.includes(role));
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền: ${requiredRoles}`,
      });
    }
    next();
  },
  adminAny: (req, res, next) => next(),
}));

jest.mock('../../config/multer', () => ({
  uploadSidebarIcon: {
    single: jest.fn(fieldName => (req, res, next) => {
      req.file = {
        filename: 'icon-123.png',
        originalname: 'icon.png',
        path: '/uploads/icons/icon-123.png',
      };
      next();
    }),
  },
}));

jest.mock('../../validations/sidebarItem.validation', () => ({
  validateSidebarItem: (req, res, next) => next(),
  validateSidebarItemUpdate: (req, res, next) => next(),
  validateBasicSidebarUpdate: (req, res, next) => next(),
}));

jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({
    isEmpty: jest.fn(() => true),
    array: jest.fn(() => []),
  })),
}));

// Mock sidebar item service
jest.mock('../../services/sidebarItem.service', () => ({
  getAllItems: jest.fn(),
  getMenuItems: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  updateMenuOrder: jest.fn(),
  getBasicSidebarConfig: jest.fn(),
  getSidebarConfig: jest.fn(),
  updateBasicSidebarItem: jest.fn(),
  updateBasicSidebarIcon: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const sidebarItemRouter = require('../../router/sidebarItem.router');

const app = express();
app.use(express.json());
app.use('/api/sidebarItems', sidebarItemRouter);

describe('🔹 Sidebar Item Controller Unit Tests', () => {
  const sidebarItemService = require('../../services/sidebarItem.service');
  const { validationResult } = require('express-validator');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/sidebarItems - Get All Items', () => {
    it('✅ should return all sidebar items', async () => {
      const mockItems = [
        { _id: 'item1', name: 'Dashboard', menuType: 'main' },
        { _id: 'item2', name: 'Tasks', menuType: 'main' },
      ];

      sidebarItemService.getAllItems.mockResolvedValue(mockItems);

      const res = await request(app).get('/api/sidebarItems');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveLength(2);
      expect(sidebarItemService.getAllItems).toHaveBeenCalled();
    });
  });

  describe('GET /api/sidebarItems/menu/:menuType - Get Menu Items', () => {
    it('✅ should return menu items for a menu type', async () => {
      const mockItems = [{ _id: 'item1', name: 'Dashboard', menuType: 'main' }];

      sidebarItemService.getMenuItems.mockResolvedValue(mockItems);

      const res = await request(app).get('/api/sidebarItems/menu/main');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveLength(1);
      // Route doesn't require auth, so user might be undefined
      expect(sidebarItemService.getMenuItems).toHaveBeenCalledWith('main', expect.any(Array));
    });
  });

  describe('POST /api/sidebarItems - Create Item', () => {
    it('✅ should create sidebar item successfully', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'New Item',
        menuType: 'main',
        order: 1,
      };

      sidebarItemService.createItem.mockResolvedValue(mockItem);

      const itemData = {
        name: 'New Item',
        menuType: 'main',
        order: 1,
      };

      // Test controller directly since route has complex middleware
      const sidebarItemController = require('../../controllers/sidebarItem.controller');
      const mockReq = {
        body: itemData,
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockNext = jest.fn();
      await sidebarItemController.createItem(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockItem,
      });
      expect(sidebarItemService.createItem).toHaveBeenCalledWith(itemData);
    });

    it('❌ should return 400 for validation errors', async () => {
      // Test controller directly with validation errors
      const sidebarItemController = require('../../controllers/sidebarItem.controller');
      const mockReq = {
        body: { menuType: 'main' },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock validationResult to return errors
      validationResult.mockReturnValue({
        isEmpty: jest.fn(() => false),
        array: jest.fn(() => [{ msg: 'Name is required' }]),
      });

      await sidebarItemController.createItem(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        errors: [{ msg: 'Name is required' }],
      });
    });
  });

  describe('PUT /api/sidebarItems/:id - Update Item', () => {
    it('✅ should update sidebar item successfully', async () => {
      const mockUpdated = {
        _id: 'item123',
        name: 'Updated Item',
      };

      sidebarItemService.updateItem.mockResolvedValue(mockUpdated);

      // Ensure validation passes
      validationResult.mockReturnValue({
        isEmpty: jest.fn(() => true),
        array: jest.fn(() => []),
      });

      // Route uses validateSidebarItemUpdate which might fail, test controller directly
      const sidebarItemController = require('../../controllers/sidebarItem.controller');
      const mockReq = {
        params: { id: 'item123' },
        body: { name: 'Updated Item' },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      await sidebarItemController.updateItem(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdated,
      });
      expect(sidebarItemService.updateItem).toHaveBeenCalledWith('item123', {
        name: 'Updated Item',
      });
    });

    it('❌ should return 404 when item not found', async () => {
      sidebarItemService.updateItem.mockResolvedValue(null);

      // Ensure validation passes
      validationResult.mockReturnValue({
        isEmpty: jest.fn(() => true),
        array: jest.fn(() => []),
      });

      // Test controller directly
      const sidebarItemController = require('../../controllers/sidebarItem.controller');
      const mockReq = {
        params: { id: 'nonexistent' },
        body: { name: 'Updated' },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      await sidebarItemController.updateItem(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Sidebar item not found',
      });
    });
  });

  describe('DELETE /api/sidebarItems/:id - Delete Item', () => {
    it('✅ should delete sidebar item successfully', async () => {
      sidebarItemService.deleteItem.mockResolvedValue(true);

      const res = await request(app).delete('/api/sidebarItems/item123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Sidebar item deleted successfully');
      expect(sidebarItemService.deleteItem).toHaveBeenCalledWith('item123');
    });

    it('❌ should return 404 when item not found', async () => {
      sidebarItemService.deleteItem.mockResolvedValue(null);

      const res = await request(app).delete('/api/sidebarItems/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/sidebarItems/:menuType/order - Update Menu Order', () => {
    it('✅ should update menu order successfully', async () => {
      sidebarItemService.updateMenuOrder.mockResolvedValue(true);

      const res = await request(app)
        .put('/api/sidebarItems/main/order')
        .send({ order: ['item1', 'item2', 'item3'] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Menu order updated successfully');
      expect(sidebarItemService.updateMenuOrder).toHaveBeenCalledWith('main', [
        'item1',
        'item2',
        'item3',
      ]);
    });

    it('❌ should return 400 when order is not an array', async () => {
      const res = await request(app)
        .put('/api/sidebarItems/main/order')
        .send({ order: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Order must be an array of item IDs');
    });
  });

  describe('GET /api/sidebarItems/basic - Get Basic Config', () => {
    it('✅ should return basic sidebar config', async () => {
      const mockConfigs = [
        {
          key: 'dashboard',
          name: 'Dashboard',
          icon: 'dashboard-icon',
          path: '/admin',
          menuType: 'main',
          itemId: 'item123',
        },
      ];

      sidebarItemService.getSidebarConfig.mockResolvedValue(mockConfigs);

      const res = await request(app).get('/api/sidebarItems/basic');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveLength(1);
      expect(sidebarItemService.getSidebarConfig).toHaveBeenCalled();
    });
  });

  describe('PUT /api/sidebarItems/basic/:key - Update Basic Item', () => {
    it('✅ should update basic sidebar item successfully', async () => {
      const mockUpdated = {
        key: 'dashboard',
        name: 'Updated Dashboard',
        icon: 'new-icon',
      };

      sidebarItemService.updateBasicSidebarItem.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put('/api/sidebarItems/basic/dashboard')
        .send({ name: 'Updated Dashboard', icon: 'new-icon' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('name', 'Updated Dashboard');
      expect(sidebarItemService.updateBasicSidebarItem).toHaveBeenCalledWith('dashboard', {
        name: 'Updated Dashboard',
        icon: 'new-icon',
      });
    });

    it('❌ should return 400 when name and icon are both missing', async () => {
      const res = await request(app).put('/api/sidebarItems/basic/dashboard').send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Name or icon is required');
    });
  });

  describe('POST /api/sidebarItems/basic/:key/icon - Upload Basic Icon', () => {
    it('✅ should upload basic icon successfully', async () => {
      const mockResult = {
        key: 'dashboard',
        icon: '/uploads/icons/icon-123.png',
      };

      sidebarItemService.updateBasicSidebarIcon.mockResolvedValue(mockResult);

      // Test controller directly since route requires adminAny
      const sidebarItemController = require('../../controllers/sidebarItem.controller');
      const mockReq = {
        params: { key: 'dashboard' },
        file: {
          filename: 'icon-123.png',
          originalname: 'icon.png',
          path: '/uploads/icons/icon-123.png',
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      await sidebarItemController.uploadBasicIcon(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
      expect(sidebarItemService.updateBasicSidebarIcon).toHaveBeenCalledWith(
        'dashboard',
        expect.objectContaining({ filename: 'icon-123.png' })
      );
    });

    it('❌ should return 400 when file is missing', async () => {
      // Test controller directly
      const sidebarItemController = require('../../controllers/sidebarItem.controller');
      const mockReq = {
        params: { key: 'dashboard' },
        file: undefined,
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await sidebarItemController.uploadBasicIcon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Icon file is required',
      });
    });
  });
});

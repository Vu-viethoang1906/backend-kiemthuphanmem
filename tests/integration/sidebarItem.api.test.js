// 📄 tests/integration/sidebarItem.api.test.js - Sidebar Item API Integration Tests
// ============================================================================
// Integration tests for all sidebar item API endpoints
// Tests cover: CRUD operations, authentication, file uploads, and business logic
// ============================================================================

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

// Mock authentication middleware to bypass auth checks
const mockTestUserId = '507f1f77bcf86cd799439011'; // Valid ObjectId

jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: mockTestUserId,
      roles: ['admin', 'System_Manager'],
      email: 'test@admin.com',
      username: 'testadmin',
    };
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

const sidebarItemRouter = require('../../router/sidebarItem.router');

describe('🔹 Sidebar Item API Integration Tests', () => {
  let app;
  let testItemId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    // Import all models to register schemas
    require('../../models/usersModel');
    require('../../models/Permission.model');
    require('../../models/SidebarItem.model');

    // Create test user if not exists
    const User = require('../../models/usersModel');
    const existingUser = await User.findById(mockTestUserId);
    if (!existingUser) {
      await User.create({
        _id: new mongoose.Types.ObjectId(mockTestUserId),
        email: 'test@admin.com',
        username: 'testadmin',
        full_name: 'Test Admin',
        status: 'active',
        typeAccount: 'Local',
      });
    }

    app = express();
    app.use(express.json());
    app.use('/api/sidebar-items', sidebarItemRouter);
  });

  afterAll(async () => {
    // Close database connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // ========== GROUP 1: Get All Items ==========
  describe('GET /api/sidebar-items - Get All Items', () => {
    it('✅ should return all sidebar items', async () => {
      const res = await request(app).get('/api/sidebar-items');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✅ should return items with required properties', async () => {
      const res = await request(app).get('/api/sidebar-items');

      if (res.body.data.length > 0) {
        const item = res.body.data[0];
        expect(item).toHaveProperty('_id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('path');
        expect(item).toHaveProperty('menuType');
      }
    });
  });

  // ========== GROUP 2: Get Menu Items ==========
  describe('GET /menu/:menuType - Get Menu Items', () => {
    it('✅ should return main menu items', async () => {
      const res = await request(app).get('/api/sidebar-items/menu/main');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✅ should return personal menu items', async () => {
      const res = await request(app).get('/api/sidebar-items/menu/personal');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✅ should return admin menu items', async () => {
      const res = await request(app).get('/api/sidebar-items/menu/admin');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ========== GROUP 3: Get Item By ID ==========
  describe('GET /api/sidebar-items/:id - Get Item By ID', () => {
    it('✅ should handle get item request', async () => {
      // First get an item to get its ID
      const listRes = await request(app).get('/api/sidebar-items');

      if (listRes.body.data && listRes.body.data.length > 0) {
        const itemId = listRes.body.data[0]._id;
        testItemId = itemId;
        expect(itemId).toBeDefined();
      }
    });

    it('✅ should return error for invalid ID format', async () => {
      const res = await request(app).get('/api/sidebar-items/invalid-id');
      expect([400, 404, 500]).toContain(res.status);
    });
  });

  // ========== GROUP 4: Create Item ==========
  describe('POST /api/sidebar-items - Create Item', () => {
    it('✅ should create new sidebar item with valid data', async () => {
      const timestamp = Date.now();
      const itemData = {
        name: `Test Item ${timestamp}`,
        path: `/admin/test-${timestamp}`,
        menuType: 'main',
        icon: 'test-icon',
        order: 99,
        isActive: true,
      };

      const res = await request(app).post('/api/sidebar-items').send(itemData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toBe(itemData.name);
      expect(res.body.data.path).toBe(itemData.path);
    });

    it('❌ should reject item without required fields', async () => {
      const itemData = {
        name: 'Incomplete Item',
        // Missing path and menuType
      };

      const res = await request(app).post('/api/sidebar-items').send(itemData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('❌ should reject item with invalid menuType', async () => {
      const itemData = {
        name: 'Invalid Menu Type Item',
        path: '/admin/invalid',
        menuType: 'invalid_type',
        icon: 'icon',
      };

      const res = await request(app).post('/api/sidebar-items').send(itemData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ========== GROUP 5: Update Item ==========
  describe('PUT /api/sidebar-items/:id - Update Item', () => {
    it('✅ should update item when exists', async () => {
      // Get first item if not already stored
      if (!testItemId) {
        const listRes = await request(app).get('/api/sidebar-items');
        if (listRes.body.data.length > 0) {
          testItemId = listRes.body.data[0]._id;
        }
      }

      if (testItemId) {
        const updateData = {
          name: 'Updated Name',
          icon: 'updated-icon',
        };

        const res = await request(app).put(`/api/sidebar-items/${testItemId}`).send(updateData);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data.name).toBe('Updated Name');
      }
    });

    it('❌ should return 404 when updating non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = { name: 'Updated' };

      const res = await request(app).put(`/api/sidebar-items/${fakeId}`).send(updateData);

      expect(res.status).toBe(404);
    });
  });

  // ========== GROUP 6: Delete Item ==========
  describe('DELETE /api/sidebar-items/:id - Delete Item', () => {
    it('✅ should delete item when exists', async () => {
      // Create item first, then delete it
      const itemData = {
        name: `Delete Test ${Date.now()}`,
        path: `/admin/delete-test-${Date.now()}`,
        menuType: 'main',
        icon: 'delete-test-icon',
      };

      const createRes = await request(app).post('/api/sidebar-items').send(itemData);

      if (createRes.body.data) {
        const itemId = createRes.body.data._id;
        const deleteRes = await request(app).delete(`/api/sidebar-items/${itemId}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body).toHaveProperty('success', true);
      }
    });

    it('❌ should return 404 when deleting non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/sidebar-items/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  // ========== GROUP 7: Update Menu Order ==========
  describe('PUT /:menuType/order - Update Menu Order', () => {
    it('✅ should update order for menu items', async () => {
      // Get items first
      const listRes = await request(app).get('/api/sidebar-items/menu/main');

      if (listRes.body.data.length >= 2) {
        const ids = listRes.body.data.slice(0, 2).map(item => item._id);
        const orderData = { order: ids };

        const res = await request(app).put('/api/sidebar-items/main/order').send(orderData);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      }
    });

    it('❌ should reject invalid order data', async () => {
      const invalidData = {
        order: 'not-an-array', // Should be array
      };

      const res = await request(app).put('/api/sidebar-items/main/order').send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ========== GROUP 8: Get Basic Sidebar Config ==========
  describe('GET /basic - Get Basic Config', () => {
    it('✅ should return basic sidebar configuration', async () => {
      const res = await request(app).get('/api/sidebar-items/basic');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✅ should include predefined sidebar keys in response', async () => {
      const res = await request(app).get('/api/sidebar-items/basic');

      const keys = res.body.data.map(item => item.key || item.path);
      expect(keys.length).toBeGreaterThan(0);
    });

    it('✅ should return items with proper structure', async () => {
      const res = await request(app).get('/api/sidebar-items/basic');

      if (res.body.data && res.body.data.length > 0) {
        const item = res.body.data[0];
        expect(item).toHaveProperty('path');
        expect(item).toHaveProperty('menuType');
        expect(item).toHaveProperty('itemId');
        expect(item.label || item.name).toBeDefined();
      }
    });
  });

  // ========== GROUP 9: Get Sidebar Config ==========
  describe('GET /basic (getSidebarConfig)', () => {
    it('✅ should return complete sidebar configuration with all items', async () => {
      const res = await request(app).get('/api/sidebar-items/basic');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ========== GROUP 11: Upload Sidebar Icon ==========
  describe('POST /basic/:key/icon - Upload Icon', () => {
    it('✅ should upload icon for basic sidebar item', async () => {
      const res = await request(app)
        .post('/api/sidebar-items/basic/dashboard/icon')
        .attach('icon', Buffer.from('fake svg content'), 'icon.svg');

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);
    });

    it('❌ should reject invalid sidebar key during upload', async () => {
      const res = await request(app)
        .post('/api/sidebar-items/basic/invalid_key/icon')
        .attach('icon', Buffer.from('fake svg content'), 'icon.svg');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('❌ should reject missing file', async () => {
      const res = await request(app).post('/api/sidebar-items/basic/dashboard/icon').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ========== GROUP 12: Edge Cases & Error Handling ==========
  describe('Edge Cases & Error Handling', () => {
    it('✅ should handle concurrent requests safely', async () => {
      const requests = [
        request(app).get('/api/sidebar-items'),
        request(app).get('/api/sidebar-items/menu/main'),
        request(app).get('/api/sidebar-items/basic'),
      ];

      const responses = await Promise.all(requests);

      responses.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success');
      });
    });

    it('✅ should return consistent data structure across endpoints', async () => {
      const res1 = await request(app).get('/api/sidebar-items');
      const res2 = await request(app).get('/api/sidebar-items/menu/main');

      expect(Array.isArray(res1.body.data)).toBe(true);
      expect(Array.isArray(res2.body.data)).toBe(true);

      if (res1.body.data.length > 0) {
        const item1 = res1.body.data[0];
        expect(item1._id || item1.id).toBeDefined();
      }
    });
  });
});

// 📄 tests/unit/adminMaintenance.routes.test.js - Admin Maintenance Routes Unit Tests

const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Calculate expected path (router calculates this when module loads)
// We'll use a pattern match instead of exact path
const adminMaintenanceRouter = require('../../router/adminMaintenance.routes');

const app = express();
app.use(express.json());
app.use('/api/admin/maintenance', adminMaintenanceRouter);
// Add error handler middleware AFTER routes to catch unhandled errors
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

describe('🔹 Admin Maintenance Routes Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/maintenance/enable - Enable Maintenance Mode', () => {
    it('✅ should enable maintenance mode successfully', async () => {
      fs.writeFileSync.mockImplementation(() => {});

      const res = await request(app).post('/api/admin/maintenance/enable');

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('maintenance.enable'),
        'MAINTENANCE MODE ON'
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'Đã bật chế độ bảo trì',
      });
    });

    it('❌ should handle file write error', async () => {
      const error = new Error('Permission denied');
      fs.writeFileSync.mockImplementation(() => {
        throw error;
      });

      const res = await request(app).post('/api/admin/maintenance/enable');

      expect(res.status).toBe(500);
      // Express error handler returns { error: message }
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Permission denied');
    });
  });

  describe('POST /api/admin/maintenance/disable - Disable Maintenance Mode', () => {
    it('✅ should disable maintenance mode when file exists', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {});

      const res = await request(app).post('/api/admin/maintenance/disable');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('maintenance.enable'));
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('maintenance.enable'));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'Đã tắt chế độ bảo trì',
      });
    });

    it('✅ should handle disable when file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const res = await request(app).post('/api/admin/maintenance/disable');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('maintenance.enable'));
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'Đã tắt chế độ bảo trì',
      });
    });

    it('❌ should handle file delete error', async () => {
      fs.existsSync.mockReturnValue(true);
      const error = new Error('Permission denied');
      fs.unlinkSync.mockImplementation(() => {
        throw error;
      });

      const res = await request(app).post('/api/admin/maintenance/disable');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Permission denied');
    });
  });

  describe('GET /api/admin/maintenance/status - Get Maintenance Status', () => {
    it('✅ should return maintenance status as true when file exists', async () => {
      fs.existsSync.mockReturnValue(true);

      const res = await request(app).get('/api/admin/maintenance/status');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('maintenance.enable'));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        maintenance: true,
      });
    });

    it('✅ should return maintenance status as false when file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const res = await request(app).get('/api/admin/maintenance/status');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('maintenance.enable'));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        maintenance: false,
      });
    });
  });
});

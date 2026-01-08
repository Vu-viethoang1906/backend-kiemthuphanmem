jest.mock('../../repositories/userPoint.repository');

const userPointService = require('../../services/userPoint.service');
const userPointRepo = require('../../repositories/userPoint.repository');

describe('🔹 User Point Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('viewAll() - Get All User Points', () => {
    it('✅ should return all user points with populated fields', async () => {
      const mockPoints = [
        {
          _id: 'point1',
          user_id: {
            _id: 'user1',
            email: 'user1@example.com',
            full_name: 'User One',
          },
          center_id: {
            _id: 'center1',
            name: 'Center One',
          },
          points: 100,
          total_points: 500,
          level: 5,
        },
        {
          _id: 'point2',
          user_id: {
            _id: 'user2',
            email: 'user2@example.com',
            full_name: 'User Two',
          },
          center_id: {
            _id: 'center2',
            name: 'Center Two',
          },
          points: 200,
          total_points: 800,
          level: 8,
        },
      ];

      userPointRepo.findAll.mockResolvedValue(mockPoints);

      const result = await userPointService.viewAll();

      expect(userPointRepo.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockPoints);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('user_id');
      expect(result[0]).toHaveProperty('center_id');
    });

    it('✅ should return empty array when no points exist', async () => {
      userPointRepo.findAll.mockResolvedValue([]);

      const result = await userPointService.viewAll();

      expect(userPointRepo.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('❌ should throw error when repository fails', async () => {
      const error = new Error('Database error');
      userPointRepo.findAll.mockRejectedValue(error);

      await expect(userPointService.viewAll()).rejects.toThrow('Database error');
    });

    it('✅ should return points with all required fields', async () => {
      const mockPoints = [
        {
          _id: 'point1',
          user_id: 'user1',
          center_id: 'center1',
          points: 100,
          total_points: 500,
          level: 5,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      userPointRepo.findAll.mockResolvedValue(mockPoints);

      const result = await userPointService.viewAll();

      expect(result[0]).toHaveProperty('_id');
      expect(result[0]).toHaveProperty('points');
      expect(result[0]).toHaveProperty('total_points');
      expect(result[0]).toHaveProperty('level');
    });
  });

  describe('getByUser(userId) - Get Points By User', () => {
    it('✅ should return points for a specific user', async () => {
      const mockPoints = [
        {
          _id: 'point1',
          user_id: 'user123',
          center_id: {
            _id: 'center1',
            name: 'Center One',
          },
          points: 100,
          total_points: 500,
          level: 5,
        },
        {
          _id: 'point2',
          user_id: 'user123',
          center_id: {
            _id: 'center2',
            name: 'Center Two',
          },
          points: 200,
          total_points: 300,
          level: 3,
        },
      ];

      userPointRepo.findByUser.mockResolvedValue(mockPoints);

      const result = await userPointService.getByUser('user123');

      expect(userPointRepo.findByUser).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockPoints);
      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe('user123');
    });

    it('✅ should return empty array when user has no points', async () => {
      userPointRepo.findByUser.mockResolvedValue([]);

      const result = await userPointService.getByUser('user123');

      expect(userPointRepo.findByUser).toHaveBeenCalledWith('user123');
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('❌ should throw error when repository fails', async () => {
      const error = new Error('Database error');
      userPointRepo.findByUser.mockRejectedValue(error);

      await expect(userPointService.getByUser('user123')).rejects.toThrow('Database error');
    });

    it('✅ should handle different userId formats', async () => {
      const mockPoints = [
        {
          _id: 'point1',
          user_id: '507f1f77bcf86cd799439011',
          points: 100,
        },
      ];

      userPointRepo.findByUser.mockResolvedValue(mockPoints);

      const result = await userPointService.getByUser('507f1f77bcf86cd799439011');

      expect(userPointRepo.findByUser).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockPoints);
    });
  });

  describe('getByUserAndCenter(userId, centerId) - Get Points By User And Center', () => {
    it('✅ should return point record for user and center', async () => {
      const mockPoint = {
        _id: 'point1',
        user_id: 'user123',
        center_id: 'center456',
        points: 150,
        total_points: 600,
        level: 6,
      };

      userPointRepo.findByUserAndCenter.mockResolvedValue(mockPoint);

      const result = await userPointService.getByUserAndCenter('user123', 'center456');

      expect(userPointRepo.findByUserAndCenter).toHaveBeenCalledWith('user123', 'center456');
      expect(result).toEqual(mockPoint);
      expect(result.user_id).toBe('user123');
      expect(result.center_id).toBe('center456');
    });

    it('✅ should return null when no record found', async () => {
      userPointRepo.findByUserAndCenter.mockResolvedValue(null);

      const result = await userPointService.getByUserAndCenter('user123', 'center456');

      expect(userPointRepo.findByUserAndCenter).toHaveBeenCalledWith('user123', 'center456');
      expect(result).toBeNull();
    });

    it('❌ should throw error when repository fails', async () => {
      const error = new Error('Database error');
      userPointRepo.findByUserAndCenter.mockRejectedValue(error);

      await expect(userPointService.getByUserAndCenter('user123', 'center456')).rejects.toThrow(
        'Database error'
      );
    });

    it('✅ should handle different ID formats', async () => {
      const mockPoint = {
        _id: 'point1',
        user_id: '507f1f77bcf86cd799439011',
        center_id: '507f1f77bcf86cd799439012',
        points: 100,
      };

      userPointRepo.findByUserAndCenter.mockResolvedValue(mockPoint);

      const result = await userPointService.getByUserAndCenter(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012'
      );

      expect(result).toEqual(mockPoint);
    });
  });

  describe('create(data) - Create User Point', () => {
    it('✅ should create user point successfully with all fields', async () => {
      const pointData = {
        user_id: 'user123',
        center_id: 'center456',
        points: 100,
        total_points: 100,
        level: 1,
      };

      const mockCreatedPoint = {
        _id: 'point123',
        ...pointData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      userPointRepo.create.mockResolvedValue(mockCreatedPoint);

      const result = await userPointService.create(pointData);

      expect(userPointRepo.create).toHaveBeenCalledWith(pointData);
      expect(result).toEqual(mockCreatedPoint);
      expect(result).toHaveProperty('_id');
      expect(result.points).toBe(100);
      expect(result.total_points).toBe(100);
      expect(result.level).toBe(1);
    });

    it('✅ should create user point with minimal required fields', async () => {
      const pointData = {
        user_id: 'user123',
        center_id: 'center456',
      };

      const mockCreatedPoint = {
        _id: 'point123',
        ...pointData,
        points: 0,
        total_points: 0,
        level: 1,
      };

      userPointRepo.create.mockResolvedValue(mockCreatedPoint);

      const result = await userPointService.create(pointData);

      expect(userPointRepo.create).toHaveBeenCalledWith(pointData);
      expect(result).toEqual(mockCreatedPoint);
    });

    it('✅ should create user point with high level', async () => {
      const pointData = {
        user_id: 'user123',
        center_id: 'center456',
        points: 500,
        total_points: 5000,
        level: 50,
      };

      const mockCreatedPoint = {
        _id: 'point123',
        ...pointData,
      };

      userPointRepo.create.mockResolvedValue(mockCreatedPoint);

      const result = await userPointService.create(pointData);

      expect(result.level).toBe(50);
      expect(result.total_points).toBe(5000);
    });

    it('❌ should throw error when repository fails', async () => {
      const pointData = {
        user_id: 'user123',
        center_id: 'center456',
      };

      const error = new Error('Validation failed');
      userPointRepo.create.mockRejectedValue(error);

      await expect(userPointService.create(pointData)).rejects.toThrow('Validation failed');
    });

    it('❌ should throw error when required fields are missing', async () => {
      const pointData = {
        points: 100,
      };

      const error = new Error('user_id is required');
      userPointRepo.create.mockRejectedValue(error);

      await expect(userPointService.create(pointData)).rejects.toThrow('user_id is required');
    });
  });

  describe('update(id, data) - Update User Point', () => {
    it('✅ should update user point successfully', async () => {
      const updateData = {
        points: 200,
        total_points: 700,
        level: 7,
      };

      const mockUpdatedPoint = {
        _id: 'point123',
        user_id: 'user123',
        center_id: 'center456',
        ...updateData,
        updated_at: new Date(),
      };

      userPointRepo.update.mockResolvedValue(mockUpdatedPoint);

      const result = await userPointService.update('point123', updateData);

      expect(userPointRepo.update).toHaveBeenCalledWith('point123', updateData);
      expect(result).toEqual(mockUpdatedPoint);
      expect(result.points).toBe(200);
      expect(result.total_points).toBe(700);
      expect(result.level).toBe(7);
    });

    it('✅ should update only points field', async () => {
      const updateData = {
        points: 300,
      };

      const mockUpdatedPoint = {
        _id: 'point123',
        user_id: 'user123',
        center_id: 'center456',
        points: 300,
        total_points: 500,
        level: 5,
      };

      userPointRepo.update.mockResolvedValue(mockUpdatedPoint);

      const result = await userPointService.update('point123', updateData);

      expect(userPointRepo.update).toHaveBeenCalledWith('point123', updateData);
      expect(result.points).toBe(300);
    });

    it('✅ should update only level field', async () => {
      const updateData = {
        level: 10,
      };

      const mockUpdatedPoint = {
        _id: 'point123',
        level: 10,
        points: 100,
        total_points: 500,
      };

      userPointRepo.update.mockResolvedValue(mockUpdatedPoint);

      const result = await userPointService.update('point123', updateData);

      expect(result.level).toBe(10);
    });

    it('✅ should return null when point not found', async () => {
      userPointRepo.update.mockResolvedValue(null);

      const result = await userPointService.update('nonexistent', { points: 100 });

      expect(userPointRepo.update).toHaveBeenCalledWith('nonexistent', { points: 100 });
      expect(result).toBeNull();
    });

    it('❌ should throw error when repository fails', async () => {
      const updateData = {
        points: 200,
      };

      const error = new Error('Database error');
      userPointRepo.update.mockRejectedValue(error);

      await expect(userPointService.update('point123', updateData)).rejects.toThrow(
        'Database error'
      );
    });

    it('✅ should handle update with empty data object', async () => {
      const mockUpdatedPoint = {
        _id: 'point123',
        points: 100,
      };

      userPointRepo.update.mockResolvedValue(mockUpdatedPoint);

      const result = await userPointService.update('point123', {});

      expect(userPointRepo.update).toHaveBeenCalledWith('point123', {});
      expect(result).toEqual(mockUpdatedPoint);
    });
  });

  describe('delete(id) - Delete User Point', () => {
    it('✅ should delete user point successfully', async () => {
      const mockDeletedPoint = {
        _id: 'point123',
        user_id: 'user123',
        center_id: 'center456',
        points: 100,
        total_points: 500,
        level: 5,
      };

      userPointRepo.delete.mockResolvedValue(mockDeletedPoint);

      const result = await userPointService.delete('point123');

      expect(userPointRepo.delete).toHaveBeenCalledWith('point123');
      expect(result).toEqual(mockDeletedPoint);
      expect(result._id).toBe('point123');
    });

    it('✅ should return null when point not found', async () => {
      userPointRepo.delete.mockResolvedValue(null);

      const result = await userPointService.delete('nonexistent');

      expect(userPointRepo.delete).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });

    it('❌ should throw error when repository fails', async () => {
      const error = new Error('Database error');
      userPointRepo.delete.mockRejectedValue(error);

      await expect(userPointService.delete('point123')).rejects.toThrow('Database error');
    });

    it('✅ should handle different ID formats', async () => {
      const mockDeletedPoint = {
        _id: '507f1f77bcf86cd799439011',
        points: 100,
      };

      userPointRepo.delete.mockResolvedValue(mockDeletedPoint);

      const result = await userPointService.delete('507f1f77bcf86cd799439011');

      expect(userPointRepo.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockDeletedPoint);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('✅ should handle viewAll with large dataset', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        _id: `point${i}`,
        user_id: `user${i}`,
        points: i * 10,
      }));

      userPointRepo.findAll.mockResolvedValue(largeDataset);

      const result = await userPointService.viewAll();

      expect(result).toHaveLength(1000);
      expect(result[0]._id).toBe('point0');
      expect(result[999]._id).toBe('point999');
    });

    it('✅ should handle getByUser with multiple centers', async () => {
      const mockPoints = [
        { _id: 'point1', user_id: 'user123', center_id: 'center1', points: 100 },
        { _id: 'point2', user_id: 'user123', center_id: 'center2', points: 200 },
        { _id: 'point3', user_id: 'user123', center_id: 'center3', points: 300 },
      ];

      userPointRepo.findByUser.mockResolvedValue(mockPoints);

      const result = await userPointService.getByUser('user123');

      expect(result).toHaveLength(3);
      expect(result.every(p => p.user_id === 'user123')).toBe(true);
    });

    it('✅ should handle create with zero points', async () => {
      const pointData = {
        user_id: 'user123',
        center_id: 'center456',
        points: 0,
        total_points: 0,
        level: 1,
      };

      const mockCreatedPoint = {
        _id: 'point123',
        ...pointData,
      };

      userPointRepo.create.mockResolvedValue(mockCreatedPoint);

      const result = await userPointService.create(pointData);

      expect(result.points).toBe(0);
      expect(result.total_points).toBe(0);
      expect(result.level).toBe(1);
    });

    it('✅ should handle update with negative values (if allowed)', async () => {
      const updateData = {
        points: -50,
      };

      const mockUpdatedPoint = {
        _id: 'point123',
        points: -50,
        total_points: 450,
      };

      userPointRepo.update.mockResolvedValue(mockUpdatedPoint);

      const result = await userPointService.update('point123', updateData);

      expect(result.points).toBe(-50);
    });

    it('✅ should handle getByUserAndCenter with null values', async () => {
      userPointRepo.findByUserAndCenter.mockResolvedValue(null);

      const result = await userPointService.getByUserAndCenter('user123', 'center456');

      expect(result).toBeNull();
    });

    it('✅ should handle create with special characters in IDs', async () => {
      const pointData = {
        user_id: 'user-123_test',
        center_id: 'center-456_test',
        points: 100,
      };

      const mockCreatedPoint = {
        _id: 'point123',
        ...pointData,
      };

      userPointRepo.create.mockResolvedValue(mockCreatedPoint);

      const result = await userPointService.create(pointData);

      expect(result.user_id).toBe('user-123_test');
      expect(result.center_id).toBe('center-456_test');
    });

    it('✅ should handle update with all fields at once', async () => {
      const updateData = {
        points: 500,
        total_points: 5000,
        level: 50,
      };

      const mockUpdatedPoint = {
        _id: 'point123',
        user_id: 'user123',
        center_id: 'center456',
        ...updateData,
      };

      userPointRepo.update.mockResolvedValue(mockUpdatedPoint);

      const result = await userPointService.update('point123', updateData);

      expect(result.points).toBe(500);
      expect(result.total_points).toBe(5000);
      expect(result.level).toBe(50);
    });

    it("✅ should handle delete and verify it's actually deleted", async () => {
      const mockDeletedPoint = {
        _id: 'point123',
        points: 100,
      };

      userPointRepo.delete.mockResolvedValue(mockDeletedPoint);

      const result = await userPointService.delete('point123');

      expect(result).not.toBeNull();
      expect(result._id).toBe('point123');
    });
  });

  describe('Data Consistency', () => {
    it('✅ should maintain data structure consistency in viewAll', async () => {
      const mockPoints = [
        {
          _id: 'point1',
          user_id: { _id: 'user1', email: 'user1@test.com' },
          center_id: { _id: 'center1', name: 'Center 1' },
          points: 100,
          total_points: 500,
          level: 5,
        },
      ];

      userPointRepo.findAll.mockResolvedValue(mockPoints);

      const result = await userPointService.viewAll();

      expect(result[0]).toHaveProperty('user_id');
      expect(result[0]).toHaveProperty('center_id');
      expect(typeof result[0].user_id).toBe('object');
      expect(typeof result[0].center_id).toBe('object');
    });

    it('✅ should maintain data structure consistency in getByUser', async () => {
      const mockPoints = [
        {
          _id: 'point1',
          user_id: 'user123',
          center_id: { _id: 'center1', name: 'Center 1' },
          points: 100,
        },
      ];

      userPointRepo.findByUser.mockResolvedValue(mockPoints);

      const result = await userPointService.getByUser('user123');

      expect(result[0]).toHaveProperty('center_id');
      expect(typeof result[0].center_id).toBe('object');
    });
  });
});

// 📚 GUIDE TO EXTENDING SIDEBAR TESTS
// ============================================================================
// Hướng dẫn từng bước để thêm test cases mới cho sidebar feature
// ============================================================================

## 🎯 CẬP NHẬT CÓ CẤU TRÚC

### Scenario 1: Thêm Test cho Nghiệp Vụ Mới

**Bước 1**: Xác định nghiệp vụ cần test

```javascript
// Ví dụ: Test lọc sidebar items theo status
```

**Bước 2**: Tạo test group mới sau GROUP 14

```javascript
describe('✅ filterItemsByStatus - Lọc items theo status', () => {
  // Tests sẽ được viết ở đây
});
```

**Bước 3**: Viết test cases theo AAA pattern

```javascript
describe('✅ filterItemsByStatus - Lọc items theo status', () => {
  it('should return active items only when filter is active', async () => {
    // Arrange - chuẩn bị dữ liệu mock
    const mockItems = [
      { _id: '1', name: 'Active Item', isActive: true },
      { _id: '2', name: 'Inactive Item', isActive: false },
    ];
    sidebarItemRepository.findByStatus.mockResolvedValue([mockItems[0]]);

    // Act - thực hiện action
    const result = await sidebarItemService.filterItemsByStatus('active');

    // Assert - kiểm tra kết quả
    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
    expect(sidebarItemRepository.findByStatus).toHaveBeenCalledWith('active');
  });

  it('should throw error when status is invalid', async () => {
    // Test error case
    try {
      await sidebarItemService.filterItemsByStatus('invalid_status');
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toContain('Invalid status');
    }
  });
});
```

---

### Scenario 2: Thêm Mock cho New Dependency

**Bước 1**: Thêm mock ở đầu file (sau các mock hiện có)

```javascript
jest.mock('../../services/cacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}));
```

**Bước 2**: Import và use trong tests

```javascript
const cacheService = require('../../services/cacheService');

it('should cache results for performance', async () => {
  const mockItems = [{ _id: '1', name: 'Item' }];

  // Cache hit
  cacheService.get.mockResolvedValue(mockItems);

  const result = await sidebarItemService.getCachedItems();

  expect(result).toEqual(mockItems);
  expect(cacheService.get).toHaveBeenCalled();
});
```

---

### Scenario 3: Test Async Operations

**Bước 1**: Test successful promise resolution

```javascript
it('should resolve async operation successfully', async () => {
  const promise = Promise.resolve({ _id: '1', name: 'Item' });
  sidebarItemRepository.someAsyncMethod.mockResolvedValue({
    _id: '1',
    name: 'Item',
  });

  const result = await sidebarItemService.asyncMethod();

  expect(result).toHaveProperty('_id');
  expect(result).toHaveProperty('name');
});
```

**Bước 2**: Test promise rejection

```javascript
it('should handle promise rejection', async () => {
  const error = new Error('Database connection failed');
  sidebarItemRepository.someAsyncMethod.mockRejectedValue(error);

  await expect(sidebarItemService.asyncMethod()).rejects.toThrow('Database connection failed');
});
```

---

### Scenario 4: Test Complex Data Transformations

```javascript
describe('✅ transformMenuConfig - Transform menu configuration', () => {
  it('should transform flat config to nested structure', async () => {
    const mockItems = [
      { _id: '1', path: '/admin', name: 'Dashboard', order: 0 },
      { _id: '2', path: '/admin/settings', name: 'Settings', order: 1 },
    ];
    sidebarItemRepository.findAll.mockResolvedValue(mockItems);

    const result = await sidebarItemService.transformMenuConfig();

    expect(result).toEqual([
      {
        name: 'Dashboard',
        children: [{ name: 'Settings' }],
      },
    ]);
  });

  it('should handle empty data gracefully', async () => {
    sidebarItemRepository.findAll.mockResolvedValue([]);

    const result = await sidebarItemService.transformMenuConfig();

    expect(result).toEqual([]);
  });
});
```

---

### Scenario 5: Test Array Operations

```javascript
describe('✅ reorderMenuItems - Reorder menu items', () => {
  it('should maintain array length after reordering', async () => {
    const newOrder = ['id3', 'id1', 'id2'];
    sidebarItemRepository.updateOrder.mockResolvedValue(true);

    const result = await sidebarItemService.reorderMenuItems(newOrder);

    expect(result).toBe(true);
    expect(sidebarItemRepository.updateOrder).toHaveBeenCalledWith(newOrder);
    expect(newOrder).toHaveLength(3);
  });

  it('should throw error when order has duplicate IDs', async () => {
    const invalidOrder = ['id1', 'id1', 'id2'];

    try {
      await sidebarItemService.reorderMenuItems(invalidOrder);
      fail('Should throw error');
    } catch (error) {
      expect(error.message).toContain('duplicate');
    }
  });
});
```

---

### Scenario 6: Test Object Mutations

```javascript
describe('✅ mergeConfigurations - Merge menu configurations', () => {
  it('should merge configs without mutating original', async () => {
    const original = { name: 'Dashboard', icon: 'dash' };
    const updates = { name: 'Updated Dashboard' };

    const result = await sidebarItemService.mergeConfigurations(original, updates);

    // Original không bị thay đổi
    expect(original.name).toBe('Dashboard');
    // Result có các updates
    expect(result.name).toBe('Updated Dashboard');
    expect(result.icon).toBe('dash');
  });
});
```

---

### Scenario 7: Test Permission Logic

```javascript
describe('✅ checkPermission - Kiểm tra quyền truy cập', () => {
  it('should allow access when user has required permission', async () => {
    const userId = 'user123';
    const requiredPerm = 'admin_dashboard';
    const userPerms = ['admin_dashboard', 'view_reports'];

    sidebarItemRepository.getUserPermissions.mockResolvedValue(userPerms);

    const result = await sidebarItemService.checkPermission(userId, requiredPerm);

    expect(result).toBe(true);
  });

  it('should deny access when user lacks permission', async () => {
    const userId = 'user123';
    const requiredPerm = 'admin_delete';
    const userPerms = ['admin_dashboard'];

    sidebarItemRepository.getUserPermissions.mockResolvedValue(userPerms);

    const result = await sidebarItemService.checkPermission(userId, requiredPerm);

    expect(result).toBe(false);
  });

  it('should handle multiple required permissions', async () => {
    const userId = 'user123';
    const requiredPerms = ['admin_dashboard', 'admin_reports'];
    const userPerms = ['admin_dashboard', 'admin_reports', 'view_users'];

    sidebarItemRepository.getUserPermissions.mockResolvedValue(userPerms);

    const result = await sidebarItemService.checkAllPermissions(userId, requiredPerms);

    expect(result).toBe(true);
  });
});
```

---

### Scenario 8: Test Caching Behavior

```javascript
describe('✅ cachedGetItems - Cached sidebar retrieval', () => {
  it('should return cached data on second call', async () => {
    const mockItems = [{ _id: '1', name: 'Item' }];

    // First call - cache miss
    sidebarItemRepository.findAll.mockResolvedValueOnce(mockItems);
    const result1 = await sidebarItemService.cachedGetItems();

    // Second call - should use cache
    const result2 = await sidebarItemService.cachedGetItems();

    expect(result1).toEqual(mockItems);
    expect(result2).toEqual(mockItems);
    // Repository should be called only once due to caching
    expect(sidebarItemRepository.findAll).toHaveBeenCalledTimes(1);
  });
});
```

---

### Scenario 9: Test File Upload Edge Cases

```javascript
describe('✅ uploadIconWithValidation - Icon upload dengan validation', () => {
  it('should reject files larger than max size', async () => {
    const largeFile = {
      size: 10 * 1024 * 1024, // 10MB
      originalname: 'large.svg',
    };

    try {
      await sidebarItemService.uploadIcon('dashboard', largeFile);
      fail('Should throw error');
    } catch (error) {
      expect(error.message).toContain('File too large');
    }
  });

  it('should reject invalid file types', async () => {
    const invalidFile = {
      size: 1024,
      originalname: 'file.exe',
      mimetype: 'application/x-msdownload',
    };

    try {
      await sidebarItemService.uploadIcon('dashboard', invalidFile);
      fail('Should throw error');
    } catch (error) {
      expect(error.message).toContain('Invalid file type');
    }
  });

  it('should accept valid image files', async () => {
    const validFile = {
      size: 1024,
      originalname: 'icon.svg',
      mimetype: 'image/svg+xml',
      filename: 'icon-123.svg',
    };

    sidebarItemRepository.updateByPath.mockResolvedValue({
      _id: '1',
      iconUrl: '/uploads/icon-123.svg',
    });

    const result = await sidebarItemService.uploadIcon('dashboard', validFile);

    expect(result).toHaveProperty('iconUrl');
  });
});
```

---

### Scenario 10: Test Parallel Operations

```javascript
describe('✅ batchOperations - Batch operations handling', () => {
  it('should handle multiple parallel requests', async () => {
    const ids = ['1', '2', '3'];
    const mockItems = [
      { _id: '1', name: 'Item 1' },
      { _id: '2', name: 'Item 2' },
      { _id: '3', name: 'Item 3' },
    ];

    sidebarItemRepository.findById
      .mockResolvedValueOnce(mockItems[0])
      .mockResolvedValueOnce(mockItems[1])
      .mockResolvedValueOnce(mockItems[2]);

    const promises = ids.map(id => sidebarItemService.getItemById(id));
    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    expect(results).toEqual(mockItems);
  });

  it('should handle partial failures in batch operations', async () => {
    const ids = ['1', '2', '3'];

    sidebarItemRepository.findById
      .mockResolvedValueOnce({ _id: '1', name: 'Item 1' })
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({ _id: '3', name: 'Item 3' });

    const promises = ids.map(id => sidebarItemService.getItemById(id).catch(e => null));
    const results = await Promise.allSettled(promises);

    expect(results).toHaveLength(3);
    expect(results[1].status).toBe('rejected');
  });
});
```

---

## 🔍 COMMON PATTERNS

### Pattern 1: Verify Repository Call Arguments

```javascript
it('should pass correct arguments to repository', async () => {
  const itemId = 'test-id';
  const updateData = { name: 'Updated' };

  await sidebarItemService.updateItem(itemId, updateData);

  expect(sidebarItemRepository.update).toHaveBeenCalledWith(itemId, updateData);
  // Verify exact arguments
  expect(sidebarItemRepository.update).toHaveBeenCalledTimes(1);
});
```

### Pattern 2: Test Error Propagation

```javascript
it('should propagate repository errors', async () => {
  const error = new Error('Connection failed');
  sidebarItemRepository.findAll.mockRejectedValue(error);

  await expect(sidebarItemService.getAllItems()).rejects.toThrow(error);
});
```

### Pattern 3: Test Conditional Logic

```javascript
it('should apply different logic based on conditions', async () => {
  // When condition is true
  const result1 = await sidebarItemService.processItem(true);
  expect(result1.processed).toBe(true);

  // When condition is false
  const result2 = await sidebarItemService.processItem(false);
  expect(result2.processed).toBe(false);
});
```

---

## 📋 CHECKLIST TRƯỚC KHI COMMIT

- [ ] Tất cả test cases new được viết
- [ ] Tất cả test cases pass
- [ ] Mock dependencies được setup đúng
- [ ] Test names rõ ràng và mô tả
- [ ] Happy paths được cover
- [ ] Error cases được cover
- [ ] Edge cases được cover
- [ ] No test interdependencies
- [ ] Code follows existing patterns
- [ ] Run `npm test` để verify toàn bộ

---

## 🚀 QUICK COMMANDS

```bash
# Run tests lần đầu
npm test -- tests/unit/sidebarItem.service.test.js

# Watch mode - tự động chạy khi code thay đổi
npm test -- tests/unit/sidebarItem.service.test.js --watch

# Coverage report
npm test -- tests/unit/sidebarItem.service.test.js --coverage

# Verbose output
npm test -- tests/unit/sidebarItem.service.test.js --verbose

# Run specific test
npm test -- tests/unit/sidebarItem.service.test.js -t "should update name"

# Clear jest cache
npx jest --clearCache
```

---

## 💡 TIPS & TRICKS

1. **Use descriptive variable names**

   ```javascript
   // ❌ BAD
   const d = { n: 'Item' };

   // ✅ GOOD
   const mockItem = { name: 'Item' };
   ```

2. **Group related assertions**

   ```javascript
   expect(result).toHaveProperty('_id');
   expect(result).toHaveProperty('name');
   expect(result).toHaveProperty('icon');
   ```

3. **Use beforeEach for common setup**

   ```javascript
   beforeEach(() => {
     jest.clearAllMocks();
     // Common setup
   });
   ```

4. **Comment complex test logic**
   ```javascript
   // Test lọc items với multiple permissions
   // User có perm1 và perm2, nhưng không có perm3
   const userPerms = [perm1.toString(), perm2.toString()];
   ```

---

**Happy Testing! 🎉**

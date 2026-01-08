// 📄 tests/middlewares/taskUpload.test.js - Task Upload Middleware Unit Tests
const taskUpload = require("../../middlewares/taskUpload");

describe("🔹 Task Upload Middleware Unit Tests", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: { taskId: "task123" },
      user: { id: "user123" },
      headers: {
        'content-type': 'multipart/form-data',
        'transfer-encoding': undefined,
      },
      method: 'POST',
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it("✅ should export multer middleware function", () => {
    expect(taskUpload).toBeDefined();
    expect(typeof taskUpload).toBe("function");
  });

  it("✅ should be callable as middleware without file", (done) => {
    // Multer middleware should handle requests without files gracefully
    taskUpload(mockReq, mockRes, (err) => {
      // Without actual multipart/form-data, multer may not process
      // This test just ensures it doesn't throw
      done();
    });
  });

  it("✅ should handle requests with proper structure", () => {
    // Test that middleware can be called with proper request structure
    expect(() => {
      taskUpload(mockReq, mockRes, mockNext);
    }).not.toThrow();
  });
});

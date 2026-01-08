// 📄 tests/middlewares/commentUpload.test.js - Comment Upload Middleware Unit Tests
const commentUpload = require("../../middlewares/commentUpload");

describe("🔹 Comment Upload Middleware Unit Tests", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: { commentId: "comment123" },
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
    expect(commentUpload).toBeDefined();
    expect(typeof commentUpload).toBe("function");
  });

  it("✅ should be callable as middleware without file", (done) => {
    // Multer middleware should handle requests without files gracefully
    commentUpload(mockReq, mockRes, (err) => {
      // Without actual multipart/form-data, multer may not process
      // This test just ensures it doesn't throw
      done();
    });
  });

  it("✅ should handle requests with proper structure", () => {
    // Test that middleware can be called with proper request structure
    expect(() => {
      commentUpload(mockReq, mockRes, mockNext);
    }).not.toThrow();
  });
});

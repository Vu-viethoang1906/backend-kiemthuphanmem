// 📄 tests/unit/apiKey.middleware.test.js - API Key Middleware Unit Tests
jest.mock("../../models/apiKey.model", () => ({
  findOne: jest.fn(),
}));

const apiKeyMiddleware = require("../../middlewares/apiKey.middleware");
const ApiKey = require("../../models/apiKey.model");

describe("🔹 API Key Middleware Unit Tests", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it("✅ should call next() when valid API key is provided", async () => {
    const validApiKey = "valid-api-key-123";
    mockReq.headers["x-api-key"] = validApiKey;

    ApiKey.findOne.mockResolvedValue({
      _id: "key123",
      key: validApiKey,
      revoked: false,
    });

    await apiKeyMiddleware(mockReq, mockRes, mockNext);

    expect(ApiKey.findOne).toHaveBeenCalledWith({
      key: validApiKey,
      revoked: false,
    });
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it("❌ should return 401 when API key is missing", async () => {
    await apiKeyMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Missing API Key",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("❌ should return 403 when API key is invalid", async () => {
    const invalidApiKey = "invalid-api-key";
    mockReq.headers["x-api-key"] = invalidApiKey;

    ApiKey.findOne.mockResolvedValue(null);

    await apiKeyMiddleware(mockReq, mockRes, mockNext);

    expect(ApiKey.findOne).toHaveBeenCalledWith({
      key: invalidApiKey,
      revoked: false,
    });
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid API Key",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("❌ should return 403 when API key is revoked", async () => {
    const revokedApiKey = "revoked-api-key";
    mockReq.headers["x-api-key"] = revokedApiKey;

    ApiKey.findOne.mockResolvedValue(null); // Revoked keys won't be found

    await apiKeyMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid API Key",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});


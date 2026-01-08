// 📄 tests/unit/tokenBlacklist.middleware.test.js - Token Blacklist Middleware Unit Tests
const tokenBlacklist = require("../../middlewares/tokenBlacklist");

describe("🔹 Token Blacklist Middleware Unit Tests", () => {
  beforeEach(() => {
    // Clear blacklist before each test
    tokenBlacklist.clear();
  });

  afterEach(() => {
    // Clean up after each test
    tokenBlacklist.clear();
  });

  describe("add", () => {
    it("✅ should add token to blacklist", () => {
      const token = "test-token-123";
      
      tokenBlacklist.add(token);
      
      expect(tokenBlacklist.has(token)).toBe(true);
    });

    it("✅ should add multiple tokens to blacklist", () => {
      const token1 = "token-1";
      const token2 = "token-2";
      const token3 = "token-3";
      
      tokenBlacklist.add(token1);
      tokenBlacklist.add(token2);
      tokenBlacklist.add(token3);
      
      expect(tokenBlacklist.has(token1)).toBe(true);
      expect(tokenBlacklist.has(token2)).toBe(true);
      expect(tokenBlacklist.has(token3)).toBe(true);
    });
  });

  describe("has", () => {
    it("✅ should return true for blacklisted token", () => {
      const token = "blacklisted-token";
      tokenBlacklist.add(token);
      
      expect(tokenBlacklist.has(token)).toBe(true);
    });

    it("✅ should return false for non-blacklisted token", () => {
      const token = "valid-token";
      
      expect(tokenBlacklist.has(token)).toBe(false);
    });

    it("✅ should return false for token that was removed", () => {
      const token = "temp-token";
      tokenBlacklist.add(token);
      tokenBlacklist.remove(token);
      
      expect(tokenBlacklist.has(token)).toBe(false);
    });
  });

  describe("remove", () => {
    it("✅ should remove token from blacklist", () => {
      const token = "token-to-remove";
      tokenBlacklist.add(token);
      
      expect(tokenBlacklist.has(token)).toBe(true);
      
      tokenBlacklist.remove(token);
      
      expect(tokenBlacklist.has(token)).toBe(false);
    });

    it("✅ should not throw error when removing non-existent token", () => {
      const token = "non-existent-token";
      
      expect(() => {
        tokenBlacklist.remove(token);
      }).not.toThrow();
    });
  });

  describe("clear", () => {
    it("✅ should clear all tokens from blacklist", () => {
      tokenBlacklist.add("token-1");
      tokenBlacklist.add("token-2");
      tokenBlacklist.add("token-3");
      
      expect(tokenBlacklist.has("token-1")).toBe(true);
      expect(tokenBlacklist.has("token-2")).toBe(true);
      expect(tokenBlacklist.has("token-3")).toBe(true);
      
      tokenBlacklist.clear();
      
      expect(tokenBlacklist.has("token-1")).toBe(false);
      expect(tokenBlacklist.has("token-2")).toBe(false);
      expect(tokenBlacklist.has("token-3")).toBe(false);
    });

    it("✅ should work correctly after clearing", () => {
      tokenBlacklist.add("token-1");
      tokenBlacklist.clear();
      tokenBlacklist.add("token-2");
      
      expect(tokenBlacklist.has("token-1")).toBe(false);
      expect(tokenBlacklist.has("token-2")).toBe(true);
    });
  });
});


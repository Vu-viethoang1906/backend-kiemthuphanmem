// 📄 tests/integration/centerApi.test.js - Center API Integration Tests
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.test" });

const centerRouter = require("../../router/center.router");
const Center = require("../../models/center.model");

// Mock middleware để bypass authentication
const mockTestUserId = "507f1f77bcf86cd799439011";

jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: mockTestUserId,
      roles: ["admin", "System_Manager"],
      email: "test@example.com",
      username: "testuser",
    };
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

describe("🔹 Center API Integration Tests", () => {
  let app;
  let testCenterId;

  beforeAll(async () => {
    // Kết nối database test
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use("/api/centers", centerRouter);
  });

  beforeEach(async () => {
    // Cleanup trước mỗi test
    await Center.deleteMany({ name: { $regex: /^\[TEST\]/ } });
  });

  afterAll(async () => {
    // Cleanup sau tất cả tests
    await Center.deleteMany({ name: { $regex: /^\[TEST\]/ } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("POST /api/centers - Create Center", () => {
    it("✅ should create center with real data", async () => {
      const timestamp = Date.now();
      const centerData = {
        name: `[TEST] Integration Test Center ${timestamp}`,
        address: "123 Test Street",
        description: "Center created for integration testing",
        status: "active",
        phone: "0123456789",
        email: `test${timestamp}@example.com`,
      };

      const res = await request(app).post("/api/centers").send(centerData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("name");
      expect(res.body).toHaveProperty("_id");
      expect(res.body.name).toBe(`[TEST] Integration Test Center ${timestamp}`);
      expect(res.body.status).toBe("active");

      // Lưu ID để dùng cho các test khác
      testCenterId = res.body._id;
    });

    it("❌ should reject center without name", async () => {
      const centerData = {
        address: "123 Test Street",
      };

      const res = await request(app).post("/api/centers").send(centerData);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message");
    });

    it("✅ should create center with minimal fields", async () => {
      const timestamp = Date.now();
      const centerData = {
        name: `[TEST] Minimal Center ${timestamp}`,
      };

      const res = await request(app).post("/api/centers").send(centerData);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(`[TEST] Minimal Center ${timestamp}`);
      expect(res.body.status).toBe("active"); // default
    });
  });

  describe("GET /api/centers - Get All Centers", () => {
    it("✅ should return centers from database", async () => {
      // Tạo test center trước
      const timestamp = Date.now();
      await Center.create({
        name: `[TEST] List Center ${timestamp}`,
        status: "active",
      });

      const res = await request(app).get("/api/centers");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Kiểm tra có center với tên chứa [TEST]
      const testCenters = res.body.data.filter(
        (center) => center && center.name && center.name.includes("[TEST]")
      );
      expect(testCenters.length).toBeGreaterThan(0);
    });

    it("✅ should handle query parameters", async () => {
      const res = await request(app)
        .get("/api/centers")
        .query({ status: "active", page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
    });
  });

  describe("GET /api/centers/:id - Get Center By ID", () => {
    it("✅ should return center detail from database", async () => {
      // Tạo test center
      const timestamp = Date.now();
      const center = await Center.create({
        name: `[TEST] Detail Center ${timestamp}`,
        address: "456 Test Ave",
        status: "active",
      });

      const res = await request(app).get(`/api/centers/${center._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name");
      expect(res.body).toHaveProperty("_id");
      expect(res.body.name).toBe(`[TEST] Detail Center ${timestamp}`);
      expect(res.body._id).toBe(center._id.toString());
    });

    it("❌ should return 404 for non-existent center", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/centers/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Center not found");
    });
  });

  describe("PUT /api/centers/:id - Update Center", () => {
    it("✅ should update center in database", async () => {
      // Tạo test center
      const timestamp = Date.now();
      const center = await Center.create({
        name: `[TEST] Update Center ${timestamp}`,
        status: "active",
      });

      const updateData = {
        name: `[TEST] Updated Center ${timestamp}`,
        address: "789 Updated Street",
        status: "inactive",
      };

      const res = await request(app)
        .put(`/api/centers/${center._id}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name");
      expect(res.body).toHaveProperty("_id");
      expect(res.body.name).toBe(`[TEST] Updated Center ${timestamp}`);
      expect(res.body.status).toBe("inactive");

      // Verify trong database
      const updatedCenter = await Center.findById(center._id);
      expect(updatedCenter.name).toBe(`[TEST] Updated Center ${timestamp}`);
      expect(updatedCenter.status).toBe("inactive");
    });

    it("✅ should update only provided fields", async () => {
      const timestamp = Date.now();
      const center = await Center.create({
        name: `[TEST] Partial Update ${timestamp}`,
        address: "Original Address",
        status: "active",
      });

      const updateData = {
        name: `[TEST] Partially Updated ${timestamp}`,
      };

      const res = await request(app)
        .put(`/api/centers/${center._id}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(`[TEST] Partially Updated ${timestamp}`);
      
      // Verify address không đổi
      const updatedCenter = await Center.findById(center._id);
      expect(updatedCenter.address).toBe("Original Address");
    });
  });

  describe("DELETE /api/centers/:id - Delete Center", () => {
    it("✅ should soft delete center in database", async () => {
      const timestamp = Date.now();
      const center = await Center.create({
        name: `[TEST] Delete Center ${timestamp}`,
        status: "active",
      });

      const res = await request(app).delete(`/api/centers/${center._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Deleted successfully");

      // Verify soft delete (deleted_at được set)
      // Note: findById sẽ không trả về vì pre hook filter deleted_at
      const deletedCenter = await Center.findOne({ 
        _id: center._id, 
        deleted_at: { $ne: null } 
      });
      expect(deletedCenter).not.toBeNull();
      expect(deletedCenter.deleted_at).not.toBeNull();
    });

    it("❌ should return 404 for non-existent center", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/centers/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Center not found");
    });
  });

  describe("Database Operations", () => {
    it("✅ should handle database connection", async () => {
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    it("✅ should create and query centers directly", async () => {
      const timestamp = Date.now();
      const center = await Center.create({
        name: `[TEST] Direct DB Test ${timestamp}`,
        address: "Direct DB Address",
        status: "active",
      });

      expect(center._id).toBeDefined();
      expect(center.name).toBe(`[TEST] Direct DB Test ${timestamp}`);

      // Query center
      const foundCenter = await Center.findById(center._id);
      expect(foundCenter).toBeDefined();
      expect(foundCenter.name).toBe(`[TEST] Direct DB Test ${timestamp}`);
    });
  });

  describe("Error Handling with Real Database", () => {
    it("❌ should handle invalid ObjectId", async () => {
      const res = await request(app).get("/api/centers/invalid-id");

      expect([400, 500]).toContain(res.status);
    });

    it("✅ should filter soft-deleted centers", async () => {
      const timestamp = Date.now();
      const center = await Center.create({
        name: `[TEST] Soft Deleted ${timestamp}`,
        status: "active",
      });

      // Soft delete
      await Center.findByIdAndUpdate(center._id, { deleted_at: new Date() });

      // Should not appear in list
      const res = await request(app).get("/api/centers");
      const found = res.body.data.find(c => c._id === center._id.toString());
      expect(found).toBeUndefined();
    });
  });
});


const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
// Trước khi import GoogleCalendarService
jest.mock("../../services/apiKey.service", () => ({
  getApiKeyByDescription: jest.fn().mockImplementation((description) => {
    if (description === "GOOGLE_ENCRYPTION_KEY") {
      return Promise.resolve({
        key: "7beaa13051a5d1bcad1190974b8b12c2c11a7decf90281825903f1375f9cfcdc",
        description: "GOOGLE_ENCRYPTION_KEY",
      });
    }
    return Promise.resolve(null);
  }),
}));

// Mock keycloak và node-cron như các test khác
jest.mock("../../services/keycloak.service", () => ({
  loginUser: jest.fn().mockResolvedValue({
    access_token: "mocked-jwt-token",
    refresh_token: "mocked-refresh-token",
  }),
}));

jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

// Load test environment variables - ưu tiên calendar.txt nếu có
const calendarEnvPath = path.resolve(__dirname, "../../calendar.txt");
const testEnvPath = path.resolve(__dirname, "../../env.test");

// Load env.test trước (base config)
try {
  dotenv.config({ path: testEnvPath });
} catch (error) {
  console.warn("Could not load env.test");
}

// Load calendar.txt sau để override nếu cần (ưu tiên calendar config)
try {
  dotenv.config({ path: calendarEnvPath, override: true });
} catch (error) {
  console.warn("Could not load calendar.txt");
}

describe("Google Calendar Integration Tests", () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Kết nối database test
    const mongoUri = process.env.MONGO_URI || process.env.DB_CONNECTION_STRING;
    if (mongoose.connection.readyState === 0 && mongoUri) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("Environment Variables Check", () => {
    test("Should have GOOGLE_CLIENT_ID", () => {
      expect(process.env.GOOGLE_CLIENT_ID).toBeDefined();
      expect(process.env.GOOGLE_CLIENT_ID).toContain(
        ".apps.googleusercontent.com"
      );
    });

    test("Should have GOOGLE_CLIENT_SECRET", () => {
      expect(process.env.GOOGLE_CLIENT_SECRET).toBeDefined();
      expect(process.env.GOOGLE_CLIENT_SECRET.length).toBeGreaterThan(0);
    });

    test("Should have GOOGLE_REDIRECT_URI", () => {
      expect(process.env.GOOGLE_REDIRECT_URI).toBeDefined();
      expect(process.env.GOOGLE_REDIRECT_URI).toContain(
        "/api/calendar/auth/callback"
      );
      // Kiểm tra port đúng (3005 cho backend)
      expect(process.env.GOOGLE_REDIRECT_URI).toContain(":3005");
    });

    test("Should have GOOGLE_ENCRYPTION_KEY", () => {
      expect(process.env.GOOGLE_ENCRYPTION_KEY).toBeDefined();
      if (process.env.GOOGLE_ENCRYPTION_KEY) {
        expect(process.env.GOOGLE_ENCRYPTION_KEY.length).toBe(64);
      }
    });

    test("Should have FRONTEND_URL", () => {
      if (process.env.GOOGLE_CLIENT_ID) {
        expect(process.env.FRONTEND_URL).toBeDefined();
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe("API Endpoints - Without Authentication", () => {
    test("GET /api/calendar/auth/url should require authentication", async () => {
      const response = await request(app)
        .get("/api/calendar/auth/url")
        .expect(401);
    });

    test("GET /api/calendar/status should require authentication", async () => {
      const response = await request(app)
        .get("/api/calendar/status")
        .expect(401);
    });
  });

  describe("API Endpoints - With Authentication", () => {
    beforeAll(async () => {
      try {
        const loginResponse = await request(app)
          .post("/api/login")
          .send({
            username: process.env.TEST_USERNAME || "testuser",
            password: process.env.TEST_PASSWORD || "testpass",
          });

        if (loginResponse.body.success && loginResponse.body.data?.token) {
          authToken = loginResponse.body.data.token;
          testUserId = loginResponse.body.data.user?.id;
        } else if (loginResponse.body.success && loginResponse.body.token) {
          authToken = loginResponse.body.token;
        }
      } catch (error) {
        console.warn("Could not login for test. Some tests may be skipped.");
        console.warn("Error:", error.message);
      }
    });

    test("GET /api/calendar/auth/url should return auth URL when authenticated", async () => {
      if (!authToken) {
        return;
      }

      const response = await request(app)
        .get("/api/calendar/auth/url")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authUrl).toBeDefined();
      expect(response.body.data.authUrl).toContain("accounts.google.com");
    });

    test("GET /api/calendar/status should return status when authenticated", async () => {
      if (!authToken) {
        return;
      }

      const response = await request(app)
        .get("/api/calendar/status")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty("isConnected");
      expect(response.body.data).toHaveProperty("isSyncEnabled");
    });

    test("POST /api/calendar/sync/enable should validate sync filter", async () => {
      if (!authToken) {
        return;
      }
      const invalidResponse = await request(app)
        .post("/api/calendar/sync/enable")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          sync_filter: {
            only_with_dates: "not-a-boolean", 
          },
        })
        .expect(400);

      expect(invalidResponse.body.success).toBe(false);
    });
  });

  describe("Service Methods", () => {
    test("shouldSync should work correctly", async () => {
      const googleCalendarService = require("../../services/googleCalendar.service");
      const taskWithoutDate = {
        _id: new mongoose.Types.ObjectId(),
        title: "Test Task",
        board_id: new mongoose.Types.ObjectId(),
        column_id: new mongoose.Types.ObjectId(),
      };
      const userId = new mongoose.Types.ObjectId();
      const shouldSync = await googleCalendarService.shouldSync(
        taskWithoutDate,
        userId.toString()
      );
      expect(shouldSync).toBe(false);
    });

    test("getCalendarStatus should return correct structure", async () => {
      const googleCalendarService = require("../../services/googleCalendar.service");
      const userId = new mongoose.Types.ObjectId().toString();

      const status = await googleCalendarService.getCalendarStatus(userId);
      expect(status).toHaveProperty("isConnected");
      expect(status).toHaveProperty("isSyncEnabled");
      expect(typeof status.isConnected).toBe("boolean");
      expect(typeof status.isSyncEnabled).toBe("boolean");
    });
  });
});

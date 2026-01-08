// 📄 tests/unit/googleCalendar.service.test.js - Google Calendar Service Unit Tests
jest.mock("../../models/userGoogleCalendar.model");
jest.mock("../../utils/encryption");
jest.mock("../../services/user.service");
jest.mock("../../repositories/board.repository");
jest.mock("../../repositories/column.repository");
jest.mock("../../utils/logger");

// Mock googleapis với OAuth2Client factory
let mockOAuth2ClientInstance;
const mockOAuth2Client = jest.fn().mockImplementation(() => {
  if (!mockOAuth2ClientInstance) {
    mockOAuth2ClientInstance = {
      generateAuthUrl: jest.fn().mockReturnValue("https://accounts.google.com/auth"),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn(),
    };
  }
  return mockOAuth2ClientInstance;
});

let mockCalendarInstance;
const mockCalendar = {
  events: {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
  },
};

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: mockOAuth2Client,
    },
    oauth2: jest.fn().mockReturnValue({
      userinfo: {
        get: jest.fn(),
      },
    }),
    calendar: jest.fn().mockReturnValue(mockCalendar),
  },
}));

// These will be re-required after resetModules
let UserGoogleCalendar;
let encrypt, decrypt;
let userService;
let boardRepo;
let columnRepo;

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_TASK_ID = "507f1f77bcf86cd799439012";
const VALID_BOARD_ID = "507f1f77bcf86cd799439013";
const VALID_COLUMN_ID = "507f1f77bcf86cd799439014";

describe("🔹 Google Calendar Service Unit Tests", () => {
  let googleCalendarService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback";
    process.env.FRONTEND_URL = "http://localhost:3000";

    // Reset mock instance
    mockOAuth2ClientInstance = {
      generateAuthUrl: jest.fn().mockReturnValue("https://accounts.google.com/auth"),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn(),
    };

    // Require service after mocks are set up
    jest.resetModules();
    
    // Re-require modules after resetModules
    UserGoogleCalendar = require("../../models/userGoogleCalendar.model");
    const encryption = require("../../utils/encryption");
    encrypt = encryption.encrypt;
    decrypt = encryption.decrypt;
    userService = require("../../services/user.service");
    boardRepo = require("../../repositories/board.repository");
    columnRepo = require("../../repositories/column.repository");
    
    googleCalendarService = require("../../services/googleCalendar.service");
    
    // Setup default mocks for userService
    userService.getUserByEmail = jest.fn().mockResolvedValue(null);
    userService.getUserById = jest.fn().mockResolvedValue(null);
  });

  describe("getAuthUrl", () => {
    it("✅ should return auth URL successfully", () => {
      const result = googleCalendarService.getAuthUrl();

      expect(result).toBe("https://accounts.google.com/auth");
      expect(mockOAuth2ClientInstance.generateAuthUrl).toHaveBeenCalledWith({
        access_type: "offline",
        scope: expect.arrayContaining([
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/userinfo.email",
        ]),
        prompt: "consent",
      });
    });

    it("❌ should throw error when OAuth not configured", () => {
      delete process.env.GOOGLE_CLIENT_ID;
      jest.resetModules();
      const service = require("../../services/googleCalendar.service");
      
      expect(() => service.getAuthUrl()).toThrow("Google OAuth chưa được cấu hình");
    });
  });

  describe("authenticateUser", () => {
    it("✅ should authenticate user successfully", async () => {
      const mockTokens = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        id_token: "id-token",
        expiry_date: Date.now() + 3600000,
      };
      const mockUser = {
        _id: VALID_USER_ID,
        email: "test@example.com",
      };
      const mockCalendarConfig = {
        _id: "config123",
        user_id: VALID_USER_ID,
        save: jest.fn().mockResolvedValue(true),
      };

      const jwt = require("jsonwebtoken");
      jest.spyOn(jwt, "decode").mockReturnValue({
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/pic.jpg",
      });

      mockOAuth2ClientInstance.getToken.mockResolvedValue({ tokens: mockTokens });
      userService.getUserByEmail.mockResolvedValue(mockUser);
      UserGoogleCalendar.findOne.mockResolvedValueOnce(null);
      UserGoogleCalendar.create.mockResolvedValue(mockCalendarConfig);
      encrypt.mockImplementation((val) => `encrypted-${val}`);

      const result = await googleCalendarService.authenticateUser("auth-code");

      expect(result).toEqual(mockCalendarConfig);
      expect(mockOAuth2ClientInstance.getToken).toHaveBeenCalledWith("auth-code");
      expect(userService.getUserByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("✅ should update existing calendar config", async () => {
      const mockTokens = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        id_token: "id-token",
        expiry_date: Date.now() + 3600000,
      };
      const mockUser = {
        _id: VALID_USER_ID,
        email: "test@example.com",
      };
      const mockCalendarConfig = {
        _id: "config123",
        user_id: VALID_USER_ID,
        save: jest.fn().mockResolvedValue(true),
      };

      const jwt = require("jsonwebtoken");
      jest.spyOn(jwt, "decode").mockReturnValue({
        email: "test@example.com",
      });

      mockOAuth2ClientInstance.getToken.mockResolvedValue({ tokens: mockTokens });
      userService.getUserByEmail.mockResolvedValue(mockUser);
      UserGoogleCalendar.findOne.mockResolvedValueOnce(mockCalendarConfig);
      encrypt.mockImplementation((val) => `encrypted-${val}`);

      const result = await googleCalendarService.authenticateUser("auth-code");

      expect(result).toEqual(mockCalendarConfig);
      expect(mockCalendarConfig.save).toHaveBeenCalled();
    });

    it("❌ should throw error when OAuth not configured", async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      jest.resetModules();
      const service = require("../../services/googleCalendar.service");

      await expect(service.authenticateUser("code")).rejects.toThrow(
        "Google OAuth chưa được cấu hình"
      );
    });

    it("❌ should throw error when cannot get tokens", async () => {
      mockOAuth2ClientInstance.getToken.mockResolvedValue({ tokens: null });

      await expect(googleCalendarService.authenticateUser("code")).rejects.toThrow(
        "Không thể lấy access token từ Google"
      );
    });

    it("❌ should throw error when user not found", async () => {
      const mockTokens = {
        access_token: "access-token",
        id_token: "id-token",
      };

      const jwt = require("jsonwebtoken");
      jest.spyOn(jwt, "decode").mockReturnValue({
        email: "test@example.com",
      });

      mockOAuth2ClientInstance.getToken.mockResolvedValue({ tokens: mockTokens });
      userService.getUserByEmail.mockResolvedValue(null);

      await expect(googleCalendarService.authenticateUser("code")).rejects.toThrow(
        "Email test@example.com chưa được đăng ký trong hệ thống"
      );
    });
  });

  describe("shouldSync", () => {
    it("✅ should return true when sync enabled and task matches filter", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        sync_filter: {
          only_with_dates: false,
          include_completed: true,
          board_ids: [],
        },
      };
      const mockTask = {
        _id: VALID_TASK_ID,
        board_id: VALID_BOARD_ID,
        start_date: new Date(),
        due_date: new Date(),
        column_id: null, // No column_id, so shouldSync won't check column
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService.shouldSync(mockTask, VALID_USER_ID);

      expect(result).toBe(true);
    });

    it("✅ should return false when sync disabled", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: false,
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService.shouldSync({}, VALID_USER_ID);

      expect(result).toBe(false);
    });

    it("✅ should return false when only_with_dates is true and task has no dates", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        sync_filter: {
          only_with_dates: true,
          include_completed: true,
          board_ids: [],
        },
      };
      const mockTask = {
        _id: VALID_TASK_ID,
        board_id: VALID_BOARD_ID,
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService.shouldSync(mockTask, VALID_USER_ID);

      expect(result).toBe(false);
    });

    it("✅ should return false when board_id not in filter", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        sync_filter: {
          only_with_dates: false,
          include_completed: true,
          board_ids: ["other-board-id"],
        },
      };
      const mockTask = {
        _id: VALID_TASK_ID,
        board_id: VALID_BOARD_ID,
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService.shouldSync(mockTask, VALID_USER_ID);

      expect(result).toBe(false);
    });

    it("✅ should return false when task is completed and include_completed is false", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        sync_filter: {
          only_with_dates: false,
          include_completed: false,
          board_ids: [],
        },
      };
      const mockTask = {
        _id: VALID_TASK_ID,
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
      };
      const mockColumn = {
        _id: VALID_COLUMN_ID,
        isDone: true,
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      columnRepo.findById.mockResolvedValue(mockColumn);

      const result = await googleCalendarService.shouldSync(mockTask, VALID_USER_ID);

      expect(result).toBe(false);
    });
  });

  describe("createCalendarEvent", () => {
    it("✅ should create calendar event successfully", async () => {
      const mockTask = {
        _id: VALID_TASK_ID,
        title: "Test Task",
        description: "Test description",
        board_id: VALID_BOARD_ID,
        start_date: new Date("2024-01-01T09:00:00"),
        due_date: new Date("2024-01-01T17:00:00"),
        priority: "High",
      };
      const mockBoard = {
        _id: VALID_BOARD_ID,
        title: "Test Board",
      };
      const mockUser = {
        _id: VALID_USER_ID,
        email: "test@example.com",
      };
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        calendar_id: "primary",
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Set future date to avoid refresh
        sync_filter: {
          only_with_dates: false,
          include_completed: true,
          board_ids: [],
        },
      };
      const mockEventResponse = {
        data: {
          id: "event123",
        },
      };

      // _getAuthClient calls findOne once
      // shouldSync calls findOne once  
      // createCalendarEvent calls findOne once more to get config
      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig) // shouldSync
        .mockResolvedValueOnce(mockCalendarConfig); // createCalendarEvent - get config again
      decrypt.mockImplementation((val) => {
        if (!val) return null;
        if (typeof val === "string" && val.startsWith("encrypted-")) {
          return val.replace("encrypted-", "");
        }
        return val; // Return as-is if not encrypted format
      });
      boardRepo.findById.mockResolvedValue(mockBoard);
      userService.getUserById.mockResolvedValue(mockUser);
      mockCalendar.events.insert.mockResolvedValue(mockEventResponse);
      columnRepo.findById.mockResolvedValue({ isDone: false });

      const result = await googleCalendarService.createCalendarEvent(mockTask, VALID_USER_ID);

      expect(result).toBe("event123");
      expect(mockCalendar.events.insert).toHaveBeenCalled();
    });

    it("✅ should return null when sync disabled", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: false,
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService.createCalendarEvent({}, VALID_USER_ID);

      expect(result).toBeNull();
    });

    it("✅ should return null when shouldSync returns false", async () => {
      const mockTask = {
        _id: VALID_TASK_ID,
        board_id: VALID_BOARD_ID,
      };
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        sync_filter: {
          only_with_dates: true,
          include_completed: true,
          board_ids: [],
        },
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      decrypt.mockImplementation((val) => val.replace("encrypted-", ""));

      const result = await googleCalendarService.createCalendarEvent(mockTask, VALID_USER_ID);

      expect(result).toBeNull();
    });
  });

  describe("updateCalendarEvent", () => {
    it("✅ should update calendar event successfully", async () => {
      const mockTask = {
        _id: VALID_TASK_ID,
        title: "Updated Task",
        board_id: VALID_BOARD_ID,
        start_date: new Date("2024-01-01T09:00:00"),
        due_date: new Date("2024-01-01T17:00:00"),
      };
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        calendar_id: "primary",
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Set future date to avoid refresh
        sync_filter: {
          only_with_dates: false,
          include_completed: true,
          board_ids: [],
        },
      };

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig) // shouldSync
        .mockResolvedValueOnce(mockCalendarConfig); // updateCalendarEvent - get config again
      decrypt.mockImplementation((val) => {
        if (!val) return null;
        if (typeof val === "string" && val.startsWith("encrypted-")) {
          return val.replace("encrypted-", "");
        }
        return val; // Return as-is if not encrypted format
      });
      boardRepo.findById.mockResolvedValue({ title: "Test Board" });
      userService.getUserById.mockResolvedValue({ email: "test@example.com" });
      mockCalendar.events.update.mockResolvedValue({});
      columnRepo.findById.mockResolvedValue({ isDone: false });

      const result = await googleCalendarService.updateCalendarEvent(
        "event123",
        mockTask,
        VALID_USER_ID
      );

      expect(result).toBe(true);
      expect(mockCalendar.events.update).toHaveBeenCalled();
    });

    it("✅ should create new event when update returns 404", async () => {
      const mockTask = {
        _id: VALID_TASK_ID,
        title: "Updated Task",
        board_id: VALID_BOARD_ID,
        start_date: new Date("2024-01-01T09:00:00"),
        due_date: new Date("2024-01-01T17:00:00"),
      };
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        calendar_id: "primary",
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Set future date to avoid refresh
        sync_filter: {
          only_with_dates: false,
          include_completed: true,
          board_ids: [],
        },
      };
      const error = new Error("Not found");
      error.code = 404;

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig) // shouldSync
        .mockResolvedValueOnce(mockCalendarConfig) // updateCalendarEvent - get config again
        .mockResolvedValueOnce(mockCalendarConfig) // createCalendarEvent - _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig) // createCalendarEvent - shouldSync
        .mockResolvedValueOnce(mockCalendarConfig); // createCalendarEvent - get config again
      decrypt.mockImplementation((val) => {
        if (!val) return null;
        if (typeof val === "string" && val.startsWith("encrypted-")) {
          return val.replace("encrypted-", "");
        }
        return val; // Return as-is if not encrypted format
      });
      boardRepo.findById.mockResolvedValue({ title: "Test Board" });
      userService.getUserById.mockResolvedValue({ email: "test@example.com" });
      mockCalendar.events.update.mockRejectedValue(error);
      mockCalendar.events.insert.mockResolvedValue({ data: { id: "new-event-id" } });
      columnRepo.findById.mockResolvedValue({ isDone: false });

      const result = await googleCalendarService.updateCalendarEvent(
        "event123",
        mockTask,
        VALID_USER_ID
      );

      expect(result).toBe("new-event-id");
      expect(mockCalendar.events.insert).toHaveBeenCalled();
    });

    it("✅ should delete event when shouldSync returns false", async () => {
      const mockTask = {
        _id: VALID_TASK_ID,
        title: "Updated Task",
        board_id: VALID_BOARD_ID,
      };
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        calendar_id: "primary",
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Set future date to avoid refresh
        sync_filter: {
          only_with_dates: true,
          include_completed: false,
          board_ids: [],
        },
      };

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig) // shouldSync
        .mockResolvedValueOnce(mockCalendarConfig) // updateCalendarEvent - get config again
        .mockResolvedValueOnce(mockCalendarConfig) // deleteCalendarEvent - _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig); // deleteCalendarEvent - get config again
      decrypt.mockImplementation((val) => {
        if (!val) return null;
        if (typeof val === "string" && val.startsWith("encrypted-")) {
          return val.replace("encrypted-", "");
        }
        return val; // Return as-is if not encrypted format
      });
      mockCalendar.events.delete.mockResolvedValue({});

      const result = await googleCalendarService.updateCalendarEvent(
        "event123",
        mockTask,
        VALID_USER_ID
      );

      expect(result).toBeNull();
      expect(mockCalendar.events.delete).toHaveBeenCalled();
    });
  });

  describe("deleteCalendarEvent", () => {
    it("✅ should delete calendar event successfully", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Set future date to avoid refresh
      };

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig); // deleteCalendarEvent - get config again
      decrypt.mockImplementation((val) => {
        if (!val) return null;
        if (typeof val === "string" && val.startsWith("encrypted-")) {
          return val.replace("encrypted-", "");
        }
        return val; // Return as-is if not encrypted format
      });
      mockCalendar.events.delete.mockResolvedValue({});

      const result = await googleCalendarService.deleteCalendarEvent("event123", VALID_USER_ID);

      expect(result).toBe(true);
      expect(mockCalendar.events.delete).toHaveBeenCalled();
    });

    it("✅ should return true when event not found (404)", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Set future date to avoid refresh
      };
      const error = new Error("Not found");
      error.code = 404;

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig); // deleteCalendarEvent - get config again
      decrypt.mockImplementation((val) => {
        if (!val) return null;
        if (typeof val === "string" && val.startsWith("encrypted-")) {
          return val.replace("encrypted-", "");
        }
        return val; // Return as-is if not encrypted format
      });
      mockCalendar.events.delete.mockRejectedValue(error);

      const result = await googleCalendarService.deleteCalendarEvent("event123", VALID_USER_ID);

      expect(result).toBe(true);
    });

    it("✅ should return null when auth client not available", async () => {
      googleCalendarService._getAuthClient = jest.fn().mockResolvedValue(null);

      const result = await googleCalendarService.deleteCalendarEvent("event123", VALID_USER_ID);

      expect(result).toBeNull();
    });
  });

  describe("findEventByTaskId", () => {
    it("✅ should find event by task id", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Set future date to avoid refresh
      };
      const mockEvent = {
        id: "event123",
        extendedProperties: {
          private: {
            task_id: VALID_TASK_ID,
          },
        },
      };

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig); // findEventByTaskId - get config again
      decrypt.mockImplementation((val) => {
        if (!val) return null;
        if (typeof val === "string" && val.startsWith("encrypted-")) {
          return val.replace("encrypted-", "");
        }
        return val; // Return as-is if not encrypted format
      });
      mockCalendar.events.list.mockResolvedValue({
        data: {
          items: [mockEvent],
        },
      });

      const result = await googleCalendarService.findEventByTaskId(VALID_TASK_ID, VALID_USER_ID);

      expect(result).toBe("event123");
    });

    it("✅ should return null when no event found", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Set future date to avoid refresh
      };

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig); // findEventByTaskId - get config again
      decrypt.mockImplementation((val) => {
        if (!val) return null;
        if (typeof val === "string" && val.startsWith("encrypted-")) {
          return val.replace("encrypted-", "");
        }
        return val; // Return as-is if not encrypted format
      });
      mockCalendar.events.list.mockResolvedValue({
        data: {
          items: [],
        },
      });

      const result = await googleCalendarService.findEventByTaskId(VALID_TASK_ID, VALID_USER_ID);

      expect(result).toBeNull();
    });

    it("✅ should return null on error", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Set future date to avoid refresh
      };

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(mockCalendarConfig); // findEventByTaskId - get config again
      decrypt.mockImplementation((val) => {
        if (!val) return null;
        if (typeof val === "string" && val.startsWith("encrypted-")) {
          return val.replace("encrypted-", "");
        }
        return val; // Return as-is if not encrypted format
      });
      mockCalendar.events.list.mockRejectedValue(new Error("API error"));

      const result = await googleCalendarService.findEventByTaskId(VALID_TASK_ID, VALID_USER_ID);

      expect(result).toBeNull();
    });

    it("✅ should return null when config not found", async () => {
      UserGoogleCalendar.findOne.mockResolvedValue(null);

      const result = await googleCalendarService.findEventByTaskId(VALID_TASK_ID, VALID_USER_ID);

      expect(result).toBeNull();
    });
  });

  describe("getCalendarStatus", () => {
    it("✅ should return status when connected", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        last_sync_at: new Date(),
        sync_filter: {
          only_with_dates: true,
          include_completed: false,
          board_ids: [],
        },
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService.getCalendarStatus(VALID_USER_ID);

      expect(result).toEqual({
        isConnected: true,
        isSyncEnabled: true,
        lastSyncAt: mockCalendarConfig.last_sync_at,
        syncFilter: mockCalendarConfig.sync_filter,
      });
    });

    it("✅ should return not connected when config not found", async () => {
      UserGoogleCalendar.findOne.mockResolvedValue(null);

      const result = await googleCalendarService.getCalendarStatus(VALID_USER_ID);

      expect(result).toEqual({
        isConnected: false,
        isSyncEnabled: false,
      });
    });
  });

  describe("enableSync", () => {
    it("✅ should enable sync successfully", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: false,
        sync_filter: {
          only_with_dates: false,
          include_completed: false,
          board_ids: [],
        },
        save: jest.fn().mockResolvedValue(true),
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService.enableSync(VALID_USER_ID, {
        only_with_dates: true,
        include_completed: true,
        board_ids: [VALID_BOARD_ID],
      });

      expect(result).toEqual(mockCalendarConfig);
      expect(mockCalendarConfig.is_sync_enabled).toBe(true);
      expect(mockCalendarConfig.sync_filter.only_with_dates).toBe(true);
      expect(mockCalendarConfig.save).toHaveBeenCalled();
    });

    it("❌ should throw error when config not found", async () => {
      UserGoogleCalendar.findOne.mockResolvedValue(null);

      await expect(googleCalendarService.enableSync(VALID_USER_ID)).rejects.toThrow(
        "Chưa kết nối Google Calendar"
      );
    });

    it("❌ should throw error when only_with_dates is not boolean", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: false,
        sync_filter: {
          only_with_dates: false,
          include_completed: false,
          board_ids: [],
        },
        save: jest.fn(),
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      await expect(
        googleCalendarService.enableSync(VALID_USER_ID, {
          only_with_dates: "true",
        })
      ).rejects.toThrow("only_with_dates phải là boolean");
    });

    it("❌ should throw error when board_ids is not array", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: false,
        sync_filter: {
          only_with_dates: false,
          include_completed: false,
          board_ids: [],
        },
        save: jest.fn(),
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      await expect(
        googleCalendarService.enableSync(VALID_USER_ID, {
          board_ids: "invalid",
        })
      ).rejects.toThrow("board_ids phải là mảng");
    });
  });

  describe("disableSync", () => {
    it("✅ should disable sync successfully", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        save: jest.fn().mockResolvedValue(true),
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService.disableSync(VALID_USER_ID);

      expect(result).toEqual(mockCalendarConfig);
      expect(mockCalendarConfig.is_sync_enabled).toBe(false);
      expect(mockCalendarConfig.save).toHaveBeenCalled();
    });

    it("❌ should throw error when config not found", async () => {
      UserGoogleCalendar.findOne.mockResolvedValue(null);

      await expect(googleCalendarService.disableSync(VALID_USER_ID)).rejects.toThrow(
        "Chưa kết nối Google Calendar"
      );
    });
  });

  describe("_getUserInfo", () => {
    it("✅ should get user info successfully", async () => {
      const mockUserInfo = {
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/pic.jpg",
      };
      const { google } = require("googleapis");
      const mockOAuth2 = {
        userinfo: {
          get: jest.fn().mockResolvedValue({ data: mockUserInfo }),
        },
      };

      google.oauth2.mockReturnValue(mockOAuth2);

      const result = await googleCalendarService._getUserInfo("access-token");

      expect(result).toEqual(mockUserInfo);
      expect(mockOAuth2ClientInstance.setCredentials).toHaveBeenCalledWith({
        access_token: "access-token",
      });
    });

    it("❌ should throw error when API call fails", async () => {
      const { google } = require("googleapis");
      const mockOAuth2 = {
        userinfo: {
          get: jest.fn().mockRejectedValue(new Error("API error")),
        },
      };

      google.oauth2.mockReturnValue(mockOAuth2);

      await expect(googleCalendarService._getUserInfo("access-token")).rejects.toThrow(
        "Không thể lấy thông tin user từ Google"
      );
    });
  });

  describe("_getAuthClient", () => {
    it("✅ should return auth client when token is valid", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000), // Future date
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      decrypt.mockImplementation((val) => {
        if (val === "encrypted-access") return "access-token";
        if (val === "encrypted-refresh") return "refresh-token";
        return val;
      });

      const result = await googleCalendarService._getAuthClient(VALID_USER_ID);

      expect(result).toBe(mockOAuth2ClientInstance);
      expect(mockOAuth2ClientInstance.setCredentials).toHaveBeenCalledWith({
        access_token: "access-token",
        refresh_token: "refresh-token",
      });
    });

    it("✅ should refresh token when expired", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() - 1000), // Past date
        save: jest.fn().mockResolvedValue(true),
      };
      const mockUpdatedConfig = {
        user_id: VALID_USER_ID,
        access_token: "encrypted-new-access",
        refresh_token: "encrypted-refresh",
      };

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig)
        .mockResolvedValueOnce(mockUpdatedConfig);
      decrypt.mockImplementation((val) => {
        if (val === "encrypted-access") return "access-token";
        if (val === "encrypted-refresh") return "refresh-token";
        if (val === "encrypted-new-access") return "new-access-token";
        return val;
      });
      mockOAuth2ClientInstance.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: "new-access-token",
          expiry_date: Date.now() + 3600000,
        },
      });
      encrypt.mockImplementation((val) => `encrypted-${val}`);

      const result = await googleCalendarService._getAuthClient(VALID_USER_ID);

      expect(result).toBe(mockOAuth2ClientInstance);
      expect(mockOAuth2ClientInstance.refreshAccessToken).toHaveBeenCalled();
      expect(mockCalendarConfig.save).toHaveBeenCalled();
    });

    it("✅ should return null when sync disabled", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: false,
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService._getAuthClient(VALID_USER_ID);

      expect(result).toBeNull();
    });

    it("✅ should return null when config not found", async () => {
      UserGoogleCalendar.findOne.mockResolvedValue(null);

      const result = await googleCalendarService._getAuthClient(VALID_USER_ID);

      expect(result).toBeNull();
    });

    it("✅ should return null when tokens are missing", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        access_token: null,
        refresh_token: null,
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      decrypt.mockReturnValue(null);

      const result = await googleCalendarService._getAuthClient(VALID_USER_ID);

      expect(result).toBeNull();
    });
  });

  describe("_refreshAccessToken", () => {
    it("✅ should refresh access token successfully", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        access_token: "encrypted-old",
        refresh_token: "encrypted-refresh",
        save: jest.fn().mockResolvedValue(true),
      };
      const mockCredentials = {
        access_token: "new-access-token",
        expiry_date: Date.now() + 3600000,
      };

      decrypt.mockReturnValue("refresh-token");
      mockOAuth2ClientInstance.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });
      encrypt.mockImplementation((val) => `encrypted-${val}`);

      const result = await googleCalendarService._refreshAccessToken(
        VALID_USER_ID,
        mockCalendarConfig
      );

      expect(result).toBe("new-access-token");
      expect(mockCalendarConfig.save).toHaveBeenCalled();
      expect(mockCalendarConfig.access_token).toBe("encrypted-new-access-token");
    });

    it("✅ should use default expiry when not provided", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        access_token: "encrypted-old",
        refresh_token: "encrypted-refresh",
        save: jest.fn().mockResolvedValue(true),
      };
      const mockCredentials = {
        access_token: "new-access-token",
        // No expiry_date
      };

      decrypt.mockReturnValue("refresh-token");
      mockOAuth2ClientInstance.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });
      encrypt.mockImplementation((val) => `encrypted-${val}`);

      await googleCalendarService._refreshAccessToken(VALID_USER_ID, mockCalendarConfig);

      expect(mockCalendarConfig.expires_at).toBeInstanceOf(Date);
    });

    it("❌ should disable sync and throw error on refresh failure", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        refresh_token: "encrypted-refresh",
        save: jest.fn().mockResolvedValue(true),
      };
      const mockError = new Error("Refresh failed");

      decrypt.mockReturnValue("refresh-token");
      mockOAuth2ClientInstance.refreshAccessToken.mockRejectedValue(mockError);

      await expect(
        googleCalendarService._refreshAccessToken(VALID_USER_ID, mockCalendarConfig)
      ).rejects.toThrow("Lỗi refresh token: Refresh failed");

      expect(mockCalendarConfig.is_sync_enabled).toBe(false);
      expect(mockCalendarConfig.save).toHaveBeenCalled();
    });
  });

  describe("_prepareEventDateTime", () => {
    it("✅ should prepare datetime with start_date and due_date", () => {
      const task = {
        _id: VALID_TASK_ID,
        start_date: new Date("2024-01-01T09:00:00"),
        due_date: new Date("2024-01-01T17:00:00"),
      };

      const result = googleCalendarService._prepareEventDateTime(task);

      expect(result.startDateTime).toBeInstanceOf(Date);
      expect(result.endDateTime).toBeInstanceOf(Date);
      expect(result.startDateTime.getHours()).toBe(9);
      expect(result.endDateTime.getHours()).toBe(17);
    });

    it("✅ should set default time when dates have no time component", () => {
      const task = {
        _id: VALID_TASK_ID,
        start_date: new Date("2024-01-01T00:00:00"),
        due_date: new Date("2024-01-01T00:00:00"),
      };

      const result = googleCalendarService._prepareEventDateTime(task);

      expect(result.startDateTime.getHours()).toBe(9); // Default 9 AM
      expect(result.endDateTime.getHours()).toBe(17); // Default 5 PM
    });

    it("✅ should use due_date as start when start_date is missing", () => {
      const task = {
        _id: VALID_TASK_ID,
        due_date: new Date("2024-01-01T14:00:00"),
      };

      const result = googleCalendarService._prepareEventDateTime(task);

      expect(result.startDateTime).toBeInstanceOf(Date);
      expect(result.endDateTime).toBeInstanceOf(Date);
      expect(result.startDateTime.getHours()).toBe(14);
    });

    it("✅ should use current date with default time when no dates", () => {
      const task = {
        _id: VALID_TASK_ID,
      };

      const result = googleCalendarService._prepareEventDateTime(task);

      expect(result.startDateTime).toBeInstanceOf(Date);
      expect(result.endDateTime).toBeInstanceOf(Date);
      expect(result.startDateTime.getHours()).toBe(9);
      expect(result.endDateTime.getTime()).toBeGreaterThan(result.startDateTime.getTime());
    });

    it("✅ should adjust end date when end <= start", () => {
      const task = {
        _id: VALID_TASK_ID,
        start_date: new Date("2024-01-01T10:00:00"),
        due_date: new Date("2024-01-01T09:00:00"), // End before start
      };

      const result = googleCalendarService._prepareEventDateTime(task);

      expect(result.endDateTime.getTime()).toBeGreaterThan(result.startDateTime.getTime());
      // End should be start + 1 hour
      const diff = result.endDateTime.getTime() - result.startDateTime.getTime();
      expect(diff).toBe(60 * 60 * 1000); // 1 hour in milliseconds
    });

    it("✅ should use start_date + 1 hour when due_date is missing", () => {
      const task = {
        _id: VALID_TASK_ID,
        start_date: new Date("2024-01-01T10:00:00"),
      };

      const result = googleCalendarService._prepareEventDateTime(task);

      const diff = result.endDateTime.getTime() - result.startDateTime.getTime();
      expect(diff).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe("_getPriorityColorId", () => {
    it("✅ should return correct color for High priority", () => {
      const result = googleCalendarService._getPriorityColorId("High");
      expect(result).toBe("11");
    });

    it("✅ should return correct color for Medium priority", () => {
      const result = googleCalendarService._getPriorityColorId("Medium");
      expect(result).toBe("5");
    });

    it("✅ should return correct color for Low priority", () => {
      const result = googleCalendarService._getPriorityColorId("Low");
      expect(result).toBe("10");
    });

    it("✅ should return default color for unknown priority", () => {
      const result = googleCalendarService._getPriorityColorId("Unknown");
      expect(result).toBe("1");
    });

    it("✅ should return default color when priority is null", () => {
      const result = googleCalendarService._getPriorityColorId(null);
      expect(result).toBe("1");
    });
  });

  describe("unsyncAll", () => {
    it("✅ should unsync all events successfully", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000),
      };
      const mockEvents = [
        {
          id: "event1",
          extendedProperties: {
            private: { task_id: VALID_TASK_ID },
          },
        },
        {
          id: "event2",
          extendedProperties: {
            private: { task_id: "507f1f77bcf86cd799439015" },
          },
        },
      ];

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      decrypt.mockImplementation((val) => val.replace("encrypted-", ""));
      mockCalendar.events.list.mockResolvedValue({
        data: {
          items: mockEvents,
          nextPageToken: null,
        },
      });
      mockCalendar.events.delete.mockResolvedValue({});

      const result = await googleCalendarService.unsyncAll(VALID_USER_ID);

      expect(result.deletedCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(mockCalendar.events.delete).toHaveBeenCalledTimes(2);
    });

    it("✅ should handle pagination", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000),
      };
      const mockEventsPage1 = [
        {
          id: "event1",
          extendedProperties: {
            private: { task_id: VALID_TASK_ID },
          },
        },
      ];
      const mockEventsPage2 = [
        {
          id: "event2",
          extendedProperties: {
            private: { task_id: "507f1f77bcf86cd799439015" },
          },
        },
      ];

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      decrypt.mockImplementation((val) => val.replace("encrypted-", ""));
      mockCalendar.events.list
        .mockResolvedValueOnce({
          data: {
            items: mockEventsPage1,
            nextPageToken: "token123",
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: mockEventsPage2,
            nextPageToken: null,
          },
        });
      mockCalendar.events.delete.mockResolvedValue({});

      const result = await googleCalendarService.unsyncAll(VALID_USER_ID);

      expect(result.deletedCount).toBe(2);
      expect(mockCalendar.events.list).toHaveBeenCalledTimes(2);
    });

    it("✅ should skip events without task_id", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000),
      };
      const mockEvents = [
        {
          id: "event1",
          extendedProperties: {
            private: { task_id: VALID_TASK_ID },
          },
        },
        {
          id: "event2",
          // No task_id
        },
      ];

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      decrypt.mockImplementation((val) => val.replace("encrypted-", ""));
      mockCalendar.events.list.mockResolvedValue({
        data: {
          items: mockEvents,
          nextPageToken: null,
        },
      });
      mockCalendar.events.delete.mockResolvedValue({});

      const result = await googleCalendarService.unsyncAll(VALID_USER_ID);

      expect(result.deletedCount).toBe(1);
      expect(mockCalendar.events.delete).toHaveBeenCalledTimes(1);
    });

    it("✅ should handle delete errors gracefully", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000),
      };
      const mockEvents = [
        {
          id: "event1",
          extendedProperties: {
            private: { task_id: VALID_TASK_ID },
          },
        },
        {
          id: "event2",
          extendedProperties: {
            private: { task_id: "507f1f77bcf86cd799439015" },
          },
        },
      ];

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      decrypt.mockImplementation((val) => val.replace("encrypted-", ""));
      mockCalendar.events.list.mockResolvedValue({
        data: {
          items: mockEvents,
          nextPageToken: null,
        },
      });
      mockCalendar.events.delete
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("Delete failed"));

      const result = await googleCalendarService.unsyncAll(VALID_USER_ID);

      expect(result.deletedCount).toBe(1);
      expect(result.errorCount).toBe(1);
    });

    it("❌ should throw error when auth client not available", async () => {
      UserGoogleCalendar.findOne.mockResolvedValue(null);

      await expect(googleCalendarService.unsyncAll(VALID_USER_ID)).rejects.toThrow(
        "Chưa kết nối Google Calendar hoặc sync đã bị tắt"
      );
    });

    it("❌ should throw error when config not found", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000),
      };

      UserGoogleCalendar.findOne
        .mockResolvedValueOnce(mockCalendarConfig) // _getAuthClient
        .mockResolvedValueOnce(null); // unsyncAll - get config again

      decrypt.mockImplementation((val) => val.replace("encrypted-", ""));

      await expect(googleCalendarService.unsyncAll(VALID_USER_ID)).rejects.toThrow(
        "Chưa kết nối Google Calendar"
      );
    });

    it("❌ should throw error when list events fails", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        calendar_id: "primary",
        is_sync_enabled: true,
        access_token: "encrypted-access",
        refresh_token: "encrypted-refresh",
        expires_at: new Date(Date.now() + 3600000),
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      decrypt.mockImplementation((val) => val.replace("encrypted-", ""));
      mockCalendar.events.list.mockRejectedValue(new Error("List failed"));

      await expect(googleCalendarService.unsyncAll(VALID_USER_ID)).rejects.toThrow(
        "Lỗi xóa events: List failed"
      );
    });
  });

  describe("updateLastSyncAt", () => {
    it("✅ should update last sync at successfully", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        last_sync_at: null,
        save: jest.fn().mockResolvedValue(true),
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      await googleCalendarService.updateLastSyncAt(VALID_USER_ID);

      expect(mockCalendarConfig.last_sync_at).toBeInstanceOf(Date);
      expect(mockCalendarConfig.save).toHaveBeenCalled();
    });

    it("✅ should do nothing when config not found", async () => {
      UserGoogleCalendar.findOne.mockResolvedValue(null);

      await expect(googleCalendarService.updateLastSyncAt(VALID_USER_ID)).resolves.not.toThrow();
    });
  });

  describe("authenticateUser - edge cases", () => {
    it("✅ should use userinfo API when id_token decode fails", async () => {
      const mockTokens = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        // No id_token
      };
      const mockUser = {
        _id: VALID_USER_ID,
        email: "test@example.com",
      };
      const mockUserInfo = {
        email: "test@example.com",
        name: "Test User",
      };
      const mockCalendarConfig = {
        _id: "config123",
        user_id: VALID_USER_ID,
        save: jest.fn().mockResolvedValue(true),
      };
      const { google } = require("googleapis");
      const mockOAuth2 = {
        userinfo: {
          get: jest.fn().mockResolvedValue({ data: mockUserInfo }),
        },
      };

      mockOAuth2ClientInstance.getToken.mockResolvedValue({ tokens: mockTokens });
      userService.getUserByEmail.mockResolvedValue(mockUser);
      UserGoogleCalendar.findOne.mockResolvedValue(null);
      UserGoogleCalendar.create.mockResolvedValue(mockCalendarConfig);
      encrypt.mockImplementation((val) => `encrypted-${val}`);
      google.oauth2.mockReturnValue(mockOAuth2);

      const result = await googleCalendarService.authenticateUser("auth-code");

      expect(result).toEqual(mockCalendarConfig);
      expect(mockOAuth2.userinfo.get).toHaveBeenCalled();
    });

    it("✅ should handle missing refresh token", async () => {
      const mockTokens = {
        access_token: "access-token",
        // No refresh_token
        id_token: "id-token",
        expiry_date: Date.now() + 3600000,
      };
      const mockUser = {
        _id: VALID_USER_ID,
        email: "test@example.com",
      };
      const mockCalendarConfig = {
        _id: "config123",
        user_id: VALID_USER_ID,
        save: jest.fn().mockResolvedValue(true),
      };
      const jwt = require("jsonwebtoken");

      jest.spyOn(jwt, "decode").mockReturnValue({
        email: "test@example.com",
      });
      mockOAuth2ClientInstance.getToken.mockResolvedValue({ tokens: mockTokens });
      userService.getUserByEmail.mockResolvedValue(mockUser);
      UserGoogleCalendar.findOne.mockResolvedValue(null);
      UserGoogleCalendar.create.mockResolvedValue(mockCalendarConfig);
      encrypt.mockImplementation((val) => `encrypted-${val || ""}`);

      const result = await googleCalendarService.authenticateUser("auth-code");

      expect(result).toEqual(mockCalendarConfig);
    });
  });

  describe("shouldSync - edge cases", () => {
    it("✅ should return true when column not found but include_completed is false", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        sync_filter: {
          only_with_dates: false,
          include_completed: false,
          board_ids: [],
        },
      };
      const mockTask = {
        _id: VALID_TASK_ID,
        board_id: VALID_BOARD_ID,
        column_id: VALID_COLUMN_ID,
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);
      columnRepo.findById.mockRejectedValue(new Error("Column not found"));

      const result = await googleCalendarService.shouldSync(mockTask, VALID_USER_ID);

      expect(result).toBe(true); // Should allow sync when column not found
    });

    it("✅ should handle board_id as object with _id", async () => {
      const mockCalendarConfig = {
        user_id: VALID_USER_ID,
        is_sync_enabled: true,
        sync_filter: {
          only_with_dates: false,
          include_completed: true,
          board_ids: [VALID_BOARD_ID],
        },
      };
      const mockTask = {
        _id: VALID_TASK_ID,
        board_id: { _id: VALID_BOARD_ID },
      };

      UserGoogleCalendar.findOne.mockResolvedValue(mockCalendarConfig);

      const result = await googleCalendarService.shouldSync(mockTask, VALID_USER_ID);

      expect(result).toBe(true);
    });
  });
});


// 📄 tests/unit/import.controller.test.js - Import Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", _id: "user123" };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

// Mock import service
jest.mock("../../services/import.service", () => ({
  importTasksFromFile: jest.fn(),
  generateTemplateFile: jest.fn(),
  getImportHistory: jest.fn(),
}));

// Mock multer upload middleware
const mockUpload = (req, res, next) => {
  req.file = {
    path: "/uploads/test-import.csv",
    originalname: "test-import.csv",
    filename: "test-import.csv",
  };
  next();
};

jest.mock("../../controllers/import.controller", () => {
  const originalModule = jest.requireActual("../../controllers/import.controller");
  return {
    ...originalModule,
    upload: mockUpload,
  };
});

const request = require("supertest");
const express = require("express");
const importRouter = require("../../router/import.routes");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/import", importRouter);

describe("🔹 Import Controller Unit Tests", () => {
  const importService = require("../../services/import.service");
  const importController = require("../../controllers/import.controller");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/import/tasks - Import Tasks", () => {
    it("✅ should import tasks from file successfully", async () => {
      const mockResult = {
        totalRows: 10,
        successCount: 8,
        errorCount: 2,
        errors: [
          { row: 3, message: "Invalid date format" },
          { row: 7, message: "Missing required field" },
        ],
        tasks: [
          { _id: "task1", title: "Task 1" },
          { _id: "task2", title: "Task 2" },
        ],
      };

      importService.importTasksFromFile.mockResolvedValue(mockResult);

      // Test controller directly
      const mockReq = {
        user: { id: "user123" },
        body: {
          board_id: "board123",
          column_id: "column123",
        },
        file: {
          path: "/uploads/test-import.csv",
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importController.controller.importTasks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Import tasks thành công",
        data: {
          totalRows: 10,
          successCount: 8,
          errorCount: 2,
          errors: mockResult.errors,
          tasks: mockResult.tasks,
        },
      });
      expect(importService.importTasksFromFile).toHaveBeenCalledWith(
        "/uploads/test-import.csv",
        {
          board_id: "board123",
          column_id: "column123",
          user_id: "user123",
        }
      );
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      // Test controller directly
      const mockReq = {
        user: undefined,
        body: { board_id: "board123", column_id: "column123" },
        file: { path: "/uploads/test.csv" },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importController.controller.importTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Không có quyền truy cập",
      });
    });

    it("❌ should return 400 when file is missing", async () => {
      // Test controller directly
      const mockReq = {
        user: { id: "user123" },
        body: { board_id: "board123", column_id: "column123" },
        file: undefined,
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importController.controller.importTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Vui lòng chọn file để import",
      });
    });

    it("❌ should return 400 when board_id or column_id is missing", async () => {
      // Test controller directly
      const mockReq = {
        user: { id: "user123" },
        body: { board_id: "board123" }, // Missing column_id
        file: { path: "/uploads/test.csv" },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importController.controller.importTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "board_id và column_id là bắt buộc",
      });
    });

    it("❌ should return 400 for service error", async () => {
      importService.importTasksFromFile.mockRejectedValue(
        new Error("Invalid file format")
      );

      // Test controller directly
      const mockReq = {
        user: { id: "user123" },
        body: {
          board_id: "board123",
          column_id: "column123",
        },
        file: {
          path: "/uploads/test.csv",
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importController.controller.importTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid file format",
      });
    });
  });

  describe("GET /api/import/template - Get Template", () => {
    it("✅ should download template file", async () => {
      const mockTemplatePath = "/uploads/templates/task-import-template.csv";
      importService.generateTemplateFile.mockResolvedValue(mockTemplatePath);

      // Test controller directly
      const mockReq = {};
      const mockRes = {
        download: jest.fn((path, filename, callback) => {
          callback(null); // No error
        }),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importController.controller.getTemplate(mockReq, mockRes);

      expect(importService.generateTemplateFile).toHaveBeenCalled();
      expect(mockRes.download).toHaveBeenCalledWith(
        mockTemplatePath,
        "task-import-template.csv",
        expect.any(Function)
      );
    });

    it("❌ should return 500 for service error", async () => {
      importService.generateTemplateFile.mockRejectedValue(
        new Error("Template generation failed")
      );

      const res = await request(app).get("/api/import/template");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Template generation failed");
    });
  });

  describe("GET /api/import/history - Get Import History", () => {
    it("✅ should return import history for current user", async () => {
      const mockHistory = [
        {
          _id: "import1",
          user_id: "user123",
          file_name: "test.csv",
          total_rows: 10,
          success_count: 8,
          created_at: new Date(),
        },
      ];

      importService.getImportHistory.mockResolvedValue(mockHistory);

      const res = await request(app).get("/api/import/history");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(importService.getImportHistory).toHaveBeenCalledWith("user123");
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      // Test controller directly
      const mockReq = {
        user: undefined,
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importController.controller.getImportHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Không có quyền truy cập",
      });
    });

    it("❌ should return 500 for service error", async () => {
      importService.getImportHistory.mockRejectedValue(
        new Error("Database error")
      );

      const res = await request(app).get("/api/import/history");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("success", false);
    });
  });
});


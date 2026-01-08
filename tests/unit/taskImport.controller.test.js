// 📄 tests/unit/taskImport.controller.test.js - Task Import Controller Unit Tests
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = { id: "user123", _id: "user123" };
    next();
  },
  authorizeAny: (requiredRoles) => (req, res, next) => next(),
  adminAny: (req, res, next) => next(),
}));

jest.mock("../../config/multer", () => ({
  uploadFile: {
    single: jest.fn((fieldName) => (req, res, next) => {
      req.file = {
        path: "/uploads/test-import.csv",
        originalname: "test-import.csv",
        filename: "test-import.csv",
      };
      next();
    }),
  },
}));

// Mock utils
jest.mock("../../utils/fileReader", () => ({
  readFileData: jest.fn(),
}));

jest.mock("../../utils/mapper", () => ({
  mapNamesToIds: jest.fn(),
}));

// Mock Task model
jest.mock("../../models/task.model", () => ({
  insertMany: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const taskImportRouter = require("../../router/taskImport.routes");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/taskImport", taskImportRouter);

describe("🔹 Task Import Controller Unit Tests", () => {
  const { readFileData } = require("../../utils/fileReader");
  const { mapNamesToIds } = require("../../utils/mapper");
  const Task = require("../../models/task.model");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/taskImport/import - Import Tasks", () => {
    it("✅ should import tasks successfully", async () => {
      const mockFileData = [
        { title: "Task 1", column: "To Do", board: "Board 1" },
        { title: "Task 2", column: "In Progress", board: "Board 1" },
      ];

      const mockMappedTasks = [
        { title: "Task 1", column_id: "col1", board_id: "board1", created_by: "user123" },
        { title: "Task 2", column_id: "col2", board_id: "board1", created_by: "user123" },
      ];

      readFileData.mockResolvedValue(mockFileData);
      mapNamesToIds
        .mockResolvedValueOnce(mockMappedTasks[0])
        .mockResolvedValueOnce(mockMappedTasks[1]);
      Task.insertMany.mockResolvedValue(mockMappedTasks);

      const res = await request(app)
        .post("/api/taskImport/import")
        .attach("file", Buffer.from("test,data"), "test.csv");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Import thành công!");
      expect(res.body).toHaveProperty("count", 2);
      expect(res.body).toHaveProperty("skippedRows", 0);
      expect(Task.insertMany).toHaveBeenCalledWith(mockMappedTasks);
    });

    it("✅ should return preview data when preview=true", async () => {
      const mockFileData = [
        { title: "Task 1", column: "To Do" },
        { title: "Task 2", column: "In Progress" },
      ];

      readFileData.mockResolvedValue(mockFileData);

      const res = await request(app)
        .post("/api/taskImport/import?preview=true")
        .attach("file", Buffer.from("test,data"), "test.csv");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Xem trước dữ liệu gốc thành công");
      expect(res.body).toHaveProperty("preview");
      expect(res.body).toHaveProperty("totalRows", 2);
      expect(Array.isArray(res.body.preview)).toBe(true);
      expect(res.body.preview.length).toBeLessThanOrEqual(20);
    });

    it("✅ should return mapped preview when previewMapped=true", async () => {
      const mockFileData = [
        { title: "Task 1", column: "To Do" },
      ];

      const mockMappedTask = {
        title: "Task 1",
        column_id: "col1",
        board_id: "board1",
        created_by: "user123",
      };

      readFileData.mockResolvedValue(mockFileData);
      mapNamesToIds.mockResolvedValue(mockMappedTask);

      const res = await request(app)
        .post("/api/taskImport/import?previewMapped=true")
        .attach("file", Buffer.from("test,data"), "test.csv");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Xem trước dữ liệu sau khi map thành công");
      expect(res.body).toHaveProperty("mappedPreview");
      expect(res.body).toHaveProperty("totalMappedRows", 1);
      expect(res.body).toHaveProperty("skippedRows", 0);
    });

    it("❌ should return 400 when file is missing", async () => {
      // Test controller directly
      const { importTasks } = require("../../controllers/taskImport.controller");
      const mockReq = {
        file: undefined,
        user: { id: "user123" },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Chưa có file upload!",
      });
    });

    it("❌ should return 400 when file has no data", async () => {
      readFileData.mockResolvedValue([]);

      // Test controller directly
      const { importTasks } = require("../../controllers/taskImport.controller");
      const mockReq = {
        file: { path: "/uploads/test.csv" },
        user: { id: "user123" },
        query: {},
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "File không có dữ liệu hợp lệ!",
      });
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      readFileData.mockResolvedValue([
        { title: "Task 1", column: "To Do" },
      ]);

      // Test controller directly
      const { importTasks } = require("../../controllers/taskImport.controller");
      const mockReq = {
        file: { path: "/uploads/test.csv" },
        user: undefined,
        query: {},
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Không xác định được người dùng từ token",
      });
    });

    it("❌ should return 400 when no valid tasks after mapping", async () => {
      const mockFileData = [
        { title: "Task 1", column: "To Do" },
      ];

      readFileData.mockResolvedValue(mockFileData);
      mapNamesToIds.mockResolvedValue(null); // Invalid mapping

      // Test controller directly
      const { importTasks } = require("../../controllers/taskImport.controller");
      const mockReq = {
        file: { path: "/uploads/test.csv" },
        user: { id: "user123" },
        query: {},
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Không có dòng hợp lệ để import!",
      });
    });

    it("✅ should handle skipped rows correctly", async () => {
      const mockFileData = [
        { title: "Task 1", column: "To Do" },
        { title: "Task 2", column: "Invalid" },
      ];

      const mockMappedTask = {
        title: "Task 1",
        column_id: "col1",
        board_id: "board1",
        created_by: "user123",
      };

      readFileData.mockResolvedValue(mockFileData);
      mapNamesToIds
        .mockResolvedValueOnce(mockMappedTask)
        .mockResolvedValueOnce(null); // Second task invalid
      Task.insertMany.mockResolvedValue([mockMappedTask]);

      // Test controller directly
      const { importTasks } = require("../../controllers/taskImport.controller");
      const mockReq = {
        file: { path: "/uploads/test.csv" },
        user: { id: "user123" },
        query: {},
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importTasks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Import thành công!",
        count: 1,
        skippedRows: 1,
      });
    });

    it("❌ should return 500 for service errors", async () => {
      readFileData.mockRejectedValue(new Error("File read error"));

      // Test controller directly
      const { importTasks } = require("../../controllers/taskImport.controller");
      const mockReq = {
        file: { path: "/uploads/test.csv" },
        user: { id: "user123" },
        query: {},
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await importTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Import thất bại!",
        error: "File read error",
      });
    });
  });
});


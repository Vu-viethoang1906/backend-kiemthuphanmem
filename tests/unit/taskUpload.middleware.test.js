// 📄 tests/unit/taskUpload.middleware.test.js - Task Upload Middleware Unit Tests

const path = require("path");

describe("🔹 Task Upload Middleware Unit Tests", () => {
  let uploadTaskAttachment;
  let getDestination, getFilename, fileFilter, ensureDir;
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Require middleware
    uploadTaskAttachment = require("../../middlewares/taskUpload");
    getDestination = uploadTaskAttachment.getDestination;
    getFilename = uploadTaskAttachment.getFilename;
    fileFilter = uploadTaskAttachment.fileFilter;
    ensureDir = uploadTaskAttachment.ensureDir;

    mockReq = {
      params: { taskId: "task123" },
      user: { id: "user123" },
      headers: {
        "content-type": "multipart/form-data",
        "transfer-encoding": undefined,
      },
      method: "POST",
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe("Module Export", () => {
    it("✅ should export multer middleware function", () => {
      expect(uploadTaskAttachment).toBeDefined();
      expect(typeof uploadTaskAttachment).toBe("function");
    });

    it("✅ should export helper functions in test mode", () => {
      expect(getDestination).toBeDefined();
      expect(getFilename).toBeDefined();
      expect(fileFilter).toBeDefined();
      expect(ensureDir).toBeDefined();
    });
  });

  describe("ensureDir Function", () => {
    it("✅ should be a function", () => {
      expect(typeof ensureDir).toBe("function");
    });

    it("✅ should handle directory creation", () => {
      // Test that function exists and can be called
      // Actual directory creation is tested through getDestination
      expect(() => {
        ensureDir("/tmp/test-dir-" + Date.now());
      }).not.toThrow();
    });
  });

  describe("getDestination Function", () => {
    it("✅ should create destination directory based on taskId and userId", () => {
      const mockFile = { originalname: "test.pdf" };
      const mockCb = jest.fn();

      getDestination(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, expect.any(String));
      const dir = mockCb.mock.calls[0][1];
      expect(dir).toContain("task123");
      expect(dir).toContain("user123");
    });

    it("✅ should use 'unknown' when taskId is missing", () => {
      const reqWithoutTaskId = {
        ...mockReq,
        params: {},
      };
      const mockFile = { originalname: "test.pdf" };
      const mockCb = jest.fn();

      getDestination(reqWithoutTaskId, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, expect.any(String));
      const dir = mockCb.mock.calls[0][1];
      expect(dir).toContain("unknown");
    });

    it("✅ should use 'guest' when userId is missing", () => {
      const reqWithoutUser = {
        ...mockReq,
        user: undefined,
      };
      const mockFile = { originalname: "test.pdf" };
      const mockCb = jest.fn();

      getDestination(reqWithoutUser, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, expect.any(String));
      const dir = mockCb.mock.calls[0][1];
      expect(dir).toContain("guest");
    });

    it("✅ should use 'guest' when user is null", () => {
      const reqWithNullUser = {
        ...mockReq,
        user: null,
      };
      const mockFile = { originalname: "test.pdf" };
      const mockCb = jest.fn();

      getDestination(reqWithNullUser, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, expect.any(String));
      const dir = mockCb.mock.calls[0][1];
      expect(dir).toContain("guest");
    });

    it("✅ should handle numeric taskId", () => {
      const reqWithNumericId = {
        ...mockReq,
        params: { taskId: 12345 },
      };
      const mockFile = { originalname: "test.pdf" };
      const mockCb = jest.fn();

      getDestination(reqWithNumericId, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, expect.any(String));
      const dir = mockCb.mock.calls[0][1];
      expect(dir).toContain("12345");
    });

    it("✅ should handle numeric userId", () => {
      const reqWithNumericUserId = {
        ...mockReq,
        user: { id: 12345 },
      };
      const mockFile = { originalname: "test.pdf" };
      const mockCb = jest.fn();

      getDestination(reqWithNumericUserId, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, expect.any(String));
      const dir = mockCb.mock.calls[0][1];
      expect(dir).toContain("12345");
    });
  });

  describe("getFilename Function", () => {
    it("✅ should generate unique filename with timestamp and random number", () => {
      const mockFile = { originalname: "document.pdf" };
      const mockCb = jest.fn();

      getFilename(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/^\d+_\d+\.pdf$/)
      );
    });

    it("✅ should preserve file extension", () => {
      const mockFile = { originalname: "image.jpg" };
      const mockCb = jest.fn();

      getFilename(mockReq, mockFile, mockCb);

      const filename = mockCb.mock.calls[0][1];
      expect(filename).toMatch(/\.jpg$/);
    });

    it("✅ should handle files without extension", () => {
      const mockFile = { originalname: "file_without_ext" };
      const mockCb = jest.fn();

      getFilename(mockReq, mockFile, mockCb);

      const filename = mockCb.mock.calls[0][1];
      // Should still have timestamp and random, but no extension
      expect(filename).toMatch(/^\d+_\d+$/);
    });
  });

  describe("fileFilter Function", () => {
    it("✅ should accept valid image files (jpg)", () => {
      const mockFile = { originalname: "image.jpg" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    it("✅ should accept valid image files (png)", () => {
      const mockFile = { originalname: "image.png" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    it("✅ should accept PDF files", () => {
      const mockFile = { originalname: "document.pdf" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    it("✅ should accept Word documents (docx)", () => {
      const mockFile = { originalname: "document.docx" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    it("✅ should accept Excel files (xlsx)", () => {
      const mockFile = { originalname: "spreadsheet.xlsx" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    it("✅ should accept text files", () => {
      const mockFile = { originalname: "readme.txt" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    it("✅ should accept zip files", () => {
      const mockFile = { originalname: "archive.zip" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    it("✅ should accept rar files", () => {
      const mockFile = { originalname: "archive.rar" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    it("✅ should handle case-insensitive file extensions", () => {
      const mockFile = { originalname: "IMAGE.JPG" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    it("❌ should reject invalid file types", () => {
      const mockFile = { originalname: "script.exe" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "File không hợp lệ! Loại file không được hỗ trợ.",
        })
      );
    });

    it("❌ should reject files without extension", () => {
      const mockFile = { originalname: "file_without_ext" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "File không hợp lệ! Loại file không được hỗ trợ.",
        })
      );
    });

    it("❌ should reject unsupported file types (mp4)", () => {
      const mockFile = { originalname: "video.mp4" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "File không hợp lệ! Loại file không được hỗ trợ.",
        })
      );
    });

    it("❌ should reject unsupported file types (js)", () => {
      const mockFile = { originalname: "script.js" };
      const mockCb = jest.fn();

      fileFilter(mockReq, mockFile, mockCb);

      expect(mockCb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "File không hợp lệ! Loại file không được hỗ trợ.",
        })
      );
    });
  });

  describe("Middleware Function", () => {
    it("✅ should be callable as middleware", () => {
      expect(() => {
        uploadTaskAttachment(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });

    it("✅ should handle requests without file gracefully", (done) => {
      uploadTaskAttachment(mockReq, mockRes, (err) => {
        done();
      });
    });
  });
});

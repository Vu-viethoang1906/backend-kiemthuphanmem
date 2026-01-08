// 📄 tests/middlewares/boardAccess.test.js - Board Access Middleware Unit Tests
const boardMemberRepo = require("../../repositories/boardMember.repository");
const boardRepo = require("../../repositories/board.repository");
const mongoose = require("mongoose");
const { checkBoardAccess, checkBoardEditAccess } = require("../../middlewares/boardAccess");

// Mock repositories
jest.mock("../../repositories/boardMember.repository", () => ({
  findMember: jest.fn(),
}));

jest.mock("../../repositories/board.repository", () => ({
  getBoardById: jest.fn(),
}));

describe("🔹 Board Access Middleware Unit Tests", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: {},
      query: {},
      user: { id: "user123", roles: [] },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe("checkBoardAccess", () => {
    it("✅ should allow access when user is board member", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;

      const mockBoard = { _id: boardId, name: "Test Board" };
      const mockMembership = {
        _id: "member123",
        user_id: "user123",
        board_id: boardId,
        role_in_board: "Thành viên",
      };

      boardRepo.getBoardById.mockResolvedValue(mockBoard);
      boardMemberRepo.findMember.mockResolvedValue(mockMembership);

      await checkBoardAccess(mockReq, mockRes, mockNext);

      expect(boardRepo.getBoardById).toHaveBeenCalledWith(boardId);
      expect(boardMemberRepo.findMember).toHaveBeenCalledWith("user123", boardId);
      expect(mockReq.board).toEqual(mockBoard);
      expect(mockReq.boardMembership).toEqual(mockMembership);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("✅ should allow access when user is admin even if not member", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;
      mockReq.user.roles = ["admin"];

      const mockBoard = { _id: boardId, name: "Test Board" };

      boardRepo.getBoardById.mockResolvedValue(mockBoard);
      boardMemberRepo.findMember.mockResolvedValue(null); // Not a member

      await checkBoardAccess(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("✅ should allow access when user is System_Manager even if not member", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;
      mockReq.user.roles = ["System_Manager"];

      const mockBoard = { _id: boardId, name: "Test Board" };

      boardRepo.getBoardById.mockResolvedValue(mockBoard);
      boardMemberRepo.findMember.mockResolvedValue(null);

      await checkBoardAccess(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("❌ should return 400 when board_id is missing", async () => {
      await checkBoardAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "board_id là bắt buộc",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("❌ should return 400 when board_id is invalid ObjectId", async () => {
      mockReq.params.board_id = "invalid-id";

      await checkBoardAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "board_id không hợp lệ",
      });
    });

    it("❌ should return 404 when board does not exist", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;

      boardRepo.getBoardById.mockResolvedValue(null);

      await checkBoardAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Board không tồn tại",
      });
    });

    it("❌ should return 401 when user is not authenticated", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;
      mockReq.user = undefined;

      const mockBoard = { _id: boardId, name: "Test Board" };
      boardRepo.getBoardById.mockResolvedValue(mockBoard);

      await checkBoardAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Chưa xác thực",
      });
    });

    it("❌ should return 403 when user is not member and not admin", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;
      mockReq.user.roles = []; // Not admin

      const mockBoard = { _id: boardId, name: "Test Board" };

      boardRepo.getBoardById.mockResolvedValue(mockBoard);
      boardMemberRepo.findMember.mockResolvedValue(null);

      await checkBoardAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Bạn không có quyền truy cập board này. Chỉ thành viên của board mới có thể xem analytics.",
      });
    });

    it("✅ should get board_id from query if not in params", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.query.board_id = boardId;

      const mockBoard = { _id: boardId, name: "Test Board" };
      const mockMembership = { _id: "member123", user_id: "user123", board_id: boardId };

      boardRepo.getBoardById.mockResolvedValue(mockBoard);
      boardMemberRepo.findMember.mockResolvedValue(mockMembership);

      await checkBoardAccess(mockReq, mockRes, mockNext);

      expect(boardRepo.getBoardById).toHaveBeenCalledWith(boardId);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("checkBoardEditAccess", () => {
    it("✅ should allow edit when user is Người tạo", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;

      const mockMembership = {
        _id: "member123",
        user_id: "user123",
        board_id: boardId,
        role_in_board: "Người tạo",
      };

      boardMemberRepo.findMember.mockResolvedValue(mockMembership);

      await checkBoardEditAccess(mockReq, mockRes, mockNext);

      expect(mockReq.boardMembership).toEqual(mockMembership);
      expect(mockNext).toHaveBeenCalled();
    });

    it("✅ should allow edit when user is Thành viên", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;

      const mockMembership = {
        _id: "member123",
        user_id: "user123",
        board_id: boardId,
        role_in_board: "Thành viên",
      };

      boardMemberRepo.findMember.mockResolvedValue(mockMembership);

      await checkBoardEditAccess(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("❌ should return 400 when board_id or user_id is missing", async () => {
      mockReq.user = undefined;

      await checkBoardEditAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Thiếu thông tin board_id hoặc user",
      });
    });

    it("❌ should return 403 when user is not a member", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;

      boardMemberRepo.findMember.mockResolvedValue(null);

      await checkBoardEditAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Bạn không phải thành viên của board này",
      });
    });

    it("❌ should return 403 when user role is not allowed", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.params.board_id = boardId;

      const mockMembership = {
        _id: "member123",
        user_id: "user123",
        board_id: boardId,
        role_in_board: "Người xem", // Not allowed
      };

      boardMemberRepo.findMember.mockResolvedValue(mockMembership);

      await checkBoardEditAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Chỉ Người tạo và Thành viên mới có quyền chỉnh sửa board",
      });
    });

    it("✅ should get board_id from query if not in params", async () => {
      const boardId = new mongoose.Types.ObjectId().toString();
      mockReq.query.board_id = boardId;

      const mockMembership = {
        _id: "member123",
        user_id: "user123",
        board_id: boardId,
        role_in_board: "Thành viên",
      };

      boardMemberRepo.findMember.mockResolvedValue(mockMembership);

      await checkBoardEditAccess(mockReq, mockRes, mockNext);

      expect(boardMemberRepo.findMember).toHaveBeenCalledWith("user123", boardId);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});


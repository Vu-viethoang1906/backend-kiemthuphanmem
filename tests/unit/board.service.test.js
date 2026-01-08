// 📄 tests/unit/board.service.test.js - Board Service Unit Tests
jest.mock("../../repositories/board.repository");
jest.mock("../../repositories/boardMember.repository");
jest.mock("../../repositories/column.repository");
jest.mock("../../repositories/swimlane.repository");
jest.mock("../../services/template.service");
jest.mock("../../services/templateColumn.service");
jest.mock("../../services/templateSwimlane.service");

const boardService = require("../../services/board.service");
const boardRepo = require("../../repositories/board.repository");
const boardMemberRepo = require("../../repositories/boardMember.repository");
const columnRepo = require("../../repositories/column.repository");
const swimlaneRepo = require("../../repositories/swimlane.repository");
const templateService = require("../../services/template.service");
const templateColumnService = require("../../services/templateColumn.service");
const templateSwimlaneService = require("../../services/templateSwimlane.service");
const mongoose = require("mongoose");

describe("🔹 Board Service Unit Tests", () => {
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    // Mock startSession
    mongoose.startSession = jest.fn().mockResolvedValue(mockSession);
  });

  describe("selectedAll", () => {
    it("✅ should return all boards when no options", async () => {
      const mockBoards = [
        { _id: "board1", title: "Board 1" },
        { _id: "board2", title: "Board 2" },
      ];

      boardRepo.selectedAll.mockResolvedValue(mockBoards);

      const result = await boardService.selectedAll();

      expect(result.boards).toEqual(mockBoards);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
    });

    it("✅ should filter by search", async () => {
      const mockBoards = [
        { _id: "board1", title: "Test Board", description: "Test" },
        { _id: "board2", title: "Other Board", description: "Other" },
      ];

      boardRepo.selectedAll.mockResolvedValue(mockBoards);

      const result = await boardService.selectedAll({
        search: "Test",
        page: 1,
        limit: 10,
      });

      expect(result.boards).toHaveLength(1);
      expect(result.boards[0].title).toBe("Test Board");
    });

    it("✅ should filter by is_template", async () => {
      const mockBoards = [
        { _id: "board1", title: "Board 1", is_template: true },
        { _id: "board2", title: "Board 2", is_template: false },
      ];

      boardRepo.selectedAll.mockResolvedValue(mockBoards);

      const result = await boardService.selectedAll({
        filter: { is_template: true },
        page: 1,
        limit: 10,
      });

      expect(result.boards).toHaveLength(1);
      expect(result.boards[0].is_template).toBe(true);
    });

    it("✅ should paginate results", async () => {
      const mockBoards = Array.from({ length: 25 }, (_, i) => ({
        _id: `board${i}`,
        title: `Board ${i}`,
      }));

      boardRepo.selectedAll.mockResolvedValue(mockBoards);

      const result = await boardService.selectedAll({
        page: 2,
        limit: 10,
      });

      expect(result.boards).toHaveLength(10);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.pages).toBe(3);
    });
  });

  describe("listBoardsForUser", () => {
    it("✅ should return empty when user has no boards", async () => {
      boardRepo.findMembersByUser.mockResolvedValue([]);
      boardRepo.findByCreator.mockResolvedValue([]);

      const result = await boardService.listBoardsForUser("user123");

      expect(result.boards).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("✅ should return boards from memberships and created", async () => {
      const mockMemberships = [
        { board_id: "board1" },
        { board_id: "board2" },
      ];
      const mockCreated = [{ _id: "board3" }];
      const mockBoards = [
        { _id: "board1", title: "Board 1" },
        { _id: "board2", title: "Board 2" },
        { _id: "board3", title: "Board 3" },
      ];

      boardRepo.findMembersByUser.mockResolvedValue(mockMemberships);
      boardRepo.findByCreator.mockResolvedValue(mockCreated);
      boardRepo.findByIds.mockResolvedValue(mockBoards);

      const result = await boardService.listBoardsForUser("user123");

      expect(result.boards).toHaveLength(3);
      expect(boardRepo.findByIds).toHaveBeenCalled();
    });

    it("✅ should filter by search", async () => {
      const mockMemberships = [{ board_id: "board1" }];
      const mockBoards = [
        { _id: "board1", title: "Test Board", description: "Test" },
        { _id: "board2", title: "Other Board", description: "Other" },
      ];

      boardRepo.findMembersByUser.mockResolvedValue(mockMemberships);
      boardRepo.findByCreator.mockResolvedValue([]);
      boardRepo.findByIds.mockResolvedValue(mockBoards);

      const result = await boardService.listBoardsForUser("user123", {
        search: "Test",
      });

      expect(result.boards).toHaveLength(1);
      expect(result.boards[0].title).toBe("Test Board");
    });

    it("✅ should paginate results", async () => {
      const mockMemberships = [{ board_id: "board1" }];
      const mockBoards = Array.from({ length: 15 }, (_, i) => ({
        _id: `board${i}`,
        title: `Board ${i}`,
      }));

      boardRepo.findMembersByUser.mockResolvedValue(mockMemberships);
      boardRepo.findByCreator.mockResolvedValue([]);
      boardRepo.findByIds.mockResolvedValue(mockBoards);

      const result = await boardService.listBoardsForUser("user123", {
        page: 2,
        limit: 5,
      });

      expect(result.boards).toHaveLength(5);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.total).toBe(15);
    });
  });

  describe("createBoard", () => {
    it("✅ should create board successfully", async () => {
      const mockBoard = {
        _id: "board123",
        title: "New Board",
        description: "Description",
        created_by: "user123",
      };

      boardRepo.findByTitleAndUser.mockResolvedValue(null);
      boardRepo.createWithSession.mockResolvedValue(mockBoard);
      boardMemberRepo.addMember.mockResolvedValue({});

      const result = await boardService.createBoard({
        title: "New Board",
        description: "Description",
        userId: "user123",
        is_template: false,
      });

      expect(result).toEqual(mockBoard);
      expect(boardRepo.createWithSession).toHaveBeenCalled();
      expect(boardMemberRepo.addMember).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it("❌ should throw error when title is missing", async () => {
      await expect(
        boardService.createBoard({
          description: "Description",
          userId: "user123",
        })
      ).rejects.toThrow("title và userId là bắt buộc");
    });

    it("❌ should throw error when userId is missing", async () => {
      await expect(
        boardService.createBoard({
          title: "New Board",
          description: "Description",
        })
      ).rejects.toThrow("title và userId là bắt buộc");
    });

    it("❌ should throw error when board with same title exists", async () => {
      boardRepo.findByTitleAndUser.mockResolvedValue({
        _id: "existing123",
        title: "New Board",
      });

      await expect(
        boardService.createBoard({
          title: "New Board",
          userId: "user123",
        })
      ).rejects.toThrow("Bạn đã có board với tên này rồi!");
    });

    it("❌ should abort transaction on error", async () => {
      boardRepo.findByTitleAndUser.mockResolvedValue(null);
      boardRepo.createWithSession.mockRejectedValue(new Error("Database error"));

      await expect(
        boardService.createBoard({
          title: "New Board",
          userId: "user123",
        })
      ).rejects.toThrow();

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe("getBoardIfPermitted", () => {
    it("✅ should return board when user is member", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);

      const result = await boardService.getBoardIfPermitted(
        "board123",
        "user123"
      );

      expect(result).toEqual(mockBoard);
    });

    it("✅ should return 'forbidden' when user is not member", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(false);

      const result = await boardService.getBoardIfPermitted(
        "board123",
        "user123"
      );

      expect(result).toBe("forbidden");
    });

    it("✅ should return null when board not found", async () => {
      boardRepo.findById.mockResolvedValue(null);

      const result = await boardService.getBoardIfPermitted(
        "nonexistent",
        "user123"
      );

      expect(result).toBeNull();
    });
  });

  describe("getBoardById", () => {
    it("✅ should return board by id", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };

      boardRepo.findById.mockResolvedValue(mockBoard);

      const result = await boardService.getBoardById("board123");

      expect(result).toEqual(mockBoard);
      expect(boardRepo.findById).toHaveBeenCalledWith("board123");
    });
  });

  describe("updateBoard", () => {
    it("✅ should update board successfully", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };
      const updatedBoard = {
        _id: "board123",
        title: "Updated Board",
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      boardRepo.updateById.mockResolvedValue(updatedBoard);

      const result = await boardService.updateBoard(
        "board123",
        { title: "Updated Board" },
        "user123"
      );

      expect(result).toEqual(updatedBoard);
      expect(boardRepo.updateById).toHaveBeenCalledWith("board123", {
        title: "Updated Board",
      });
    });

    it("❌ should return null when board not found", async () => {
      boardRepo.findById.mockResolvedValue(null);

      const result = await boardService.updateBoard(
        "nonexistent",
        { title: "Updated" },
        "user123"
      );

      expect(result).toBeNull();
    });

    it("❌ should throw error when user has no permission", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        boardService.updateBoard("board123", { title: "Updated" }, "user123")
      ).rejects.toThrow("FORBIDDEN");
    });

    it("✅ should only update allowed fields", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      boardRepo.updateById.mockResolvedValue(mockBoard);

      await boardService.updateBoard(
        "board123",
        {
          title: "Updated",
          description: "New description",
          center_id: "center123",
          invalidField: "should be ignored",
        },
        "user123"
      );

      expect(boardRepo.updateById).toHaveBeenCalledWith("board123", {
        title: "Updated",
        description: "New description",
        center_id: "center123",
      });
    });
  });

  describe("deleteBoard", () => {
    it("✅ should delete board successfully", async () => {
      boardRepo.isCreatorFromMember.mockResolvedValue(true);
      boardRepo.softDelete.mockResolvedValue(true);

      const result = await boardService.deleteBoard("board123", "user123");

      expect(result).toBe(true);
      expect(boardRepo.softDelete).toHaveBeenCalledWith("board123");
    });

    it("❌ should throw error when user is not creator", async () => {
      boardRepo.isCreatorFromMember.mockResolvedValue(false);

      await expect(
        boardService.deleteBoard("board123", "user123")
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("cloneBoard", () => {
    it("✅ should clone board successfully", async () => {
      const mockTemplate = { _id: "template123" };
      const mockColumns = [
        { name: "To Do", order_index: 1 },
        { name: "Done", order_index: 2 },
      ];
      const mockSwimlanes = [{ name: "Swimlane 1", order_index: 1 }];
      const mockNewBoard = {
        _id: "newboard123",
        title: "Cloned Board",
        created_by: "user123",
      };
      const mockNewColumns = [
        { _id: "col1", name: "To Do" },
        { _id: "col2", name: "Done" },
      ];
      const mockNewSwimlanes = [{ _id: "swim1", name: "Swimlane 1" }];

      templateService.getTemplateById.mockResolvedValue(mockTemplate);
      boardRepo.findOne.mockResolvedValue(null);
      templateColumnService.list.mockResolvedValue(mockColumns);
      templateSwimlaneService.list.mockResolvedValue(mockSwimlanes);
      boardRepo.createWithSession.mockResolvedValue(mockNewBoard);
      boardMemberRepo.addMember.mockResolvedValue({});
      columnRepo.insertMany.mockResolvedValue(mockNewColumns);
      swimlaneRepo.insertMany.mockResolvedValue(mockNewSwimlanes);

      const result = await boardService.cloneBoard("template123", {
        title: "Cloned Board",
        description: "Cloned",
        userId: "user123",
      });

      expect(result.board).toEqual(mockNewBoard);
      expect(result.columns).toEqual(mockNewColumns);
      expect(result.swimlanes).toEqual(mockNewSwimlanes);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it("❌ should throw error when id_template is missing", async () => {
      await expect(
        boardService.cloneBoard(null, {
          title: "Cloned Board",
          userId: "user123",
        })
      ).rejects.toThrow("Thiếu id_template");
    });

    it("❌ should throw error when title is empty", async () => {
      await expect(
        boardService.cloneBoard("template123", {
          title: "   ",
          userId: "user123",
        })
      ).rejects.toThrow("Tên board không được để trống");
    });

    it("❌ should throw error when board with same title exists", async () => {
      templateService.getTemplateById.mockResolvedValue({ _id: "template123" });
      boardRepo.findOne.mockResolvedValue({
        _id: "existing123",
        title: "Cloned Board",
      });

      await expect(
        boardService.cloneBoard("template123", {
          title: "Cloned Board",
          userId: "user123",
        })
      ).rejects.toThrow('Bạn đã có board với tên "Cloned Board" rồi.');
    });

    it("❌ should abort transaction on error", async () => {
      templateService.getTemplateById.mockResolvedValue({ _id: "template123" });
      boardRepo.findOne.mockResolvedValue(null);
      templateColumnService.list.mockResolvedValue([]);
      templateSwimlaneService.list.mockResolvedValue([]);
      boardRepo.createWithSession.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        boardService.cloneBoard("template123", {
          title: "Cloned Board",
          userId: "user123",
        })
      ).rejects.toThrow();

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe("configureBoardSettings", () => {
    it("✅ should configure columns and swimlanes", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
      };
      const mockColumns = [
        { _id: "col1", name: "To Do", order: 0 },
        { _id: "col2", name: "Done", order: 1 },
      ];
      const mockSwimlanes = [{ _id: "swim1", name: "Swimlane 1", order: 0 }];

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.softDeleteManyByBoard.mockResolvedValue(true);
      columnRepo.insertMany.mockResolvedValue(mockColumns);
      swimlaneRepo.softDeleteManyByBoard.mockResolvedValue(true);
      swimlaneRepo.insertMany.mockResolvedValue(mockSwimlanes);

      const result = await boardService.configureBoardSettings(
        "board123",
        {
          columns: [
            { name: "To Do" },
            { name: "Done" },
          ],
          swimlanes: [{ name: "Swimlane 1" }],
        },
        "user123"
      );

      expect(result.board).toEqual(mockBoard);
      expect(result.columns).toEqual(mockColumns);
      expect(result.swimlanes).toEqual(mockSwimlanes);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it("✅ should configure only columns", async () => {
      const mockBoard = { _id: "board123" };
      const mockColumns = [{ _id: "col1", name: "To Do" }];

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.softDeleteManyByBoard.mockResolvedValue(true);
      columnRepo.insertMany.mockResolvedValue(mockColumns);

      const result = await boardService.configureBoardSettings(
        "board123",
        {
          columns: [{ name: "To Do" }],
        },
        "user123"
      );

      expect(result.columns).toEqual(mockColumns);
      expect(swimlaneRepo.insertMany).not.toHaveBeenCalled();
    });

    it("❌ should throw error when board not found", async () => {
      boardRepo.findById.mockResolvedValue(null);

      await expect(
        boardService.configureBoardSettings(
          "nonexistent",
          { columns: [] },
          "user123"
        )
      ).rejects.toThrow("Board không tồn tại");
    });

    it("❌ should throw error when user has no permission", async () => {
      const mockBoard = { _id: "board123" };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        boardService.configureBoardSettings(
          "board123",
          { columns: [] },
          "user123"
        )
      ).rejects.toThrow("Không có quyền cấu hình board này");
    });

    it("❌ should abort transaction on error", async () => {
      const mockBoard = { _id: "board123" };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.softDeleteManyByBoard.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        boardService.configureBoardSettings(
          "board123",
          { columns: [] },
          "user123"
        )
      ).rejects.toThrow();

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe("toggleSwimlaneCollapse", () => {
    it("✅ should toggle swimlane collapse", async () => {
      const mockBoard = { _id: "board123" };
      const mockSwimlane = {
        _id: "swim123",
        board_id: "board123",
        collapsed: false,
      };
      const updatedSwimlane = {
        _id: "swim123",
        board_id: "board123",
        collapsed: true,
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      swimlaneRepo.findById.mockResolvedValue(mockSwimlane);
      swimlaneRepo.update.mockResolvedValue(updatedSwimlane);

      const result = await boardService.toggleSwimlaneCollapse(
        "board123",
        "swim123",
        true,
        "user123"
      );

      expect(result).toEqual(updatedSwimlane);
      expect(swimlaneRepo.update).toHaveBeenCalledWith("swim123", {
        collapsed: true,
      });
    });

    it("❌ should throw error when board not found", async () => {
      boardRepo.findById.mockResolvedValue(null);

      await expect(
        boardService.toggleSwimlaneCollapse(
          "nonexistent",
          "swim123",
          true,
          "user123"
        )
      ).rejects.toThrow("Board không tồn tại");
    });

    it("❌ should throw error when user has no permission", async () => {
      const mockBoard = { _id: "board123" };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        boardService.toggleSwimlaneCollapse(
          "board123",
          "swim123",
          true,
          "user123"
        )
      ).rejects.toThrow("Không có quyền thao tác trên board này");
    });

    it("❌ should throw error when swimlane not found", async () => {
      const mockBoard = { _id: "board123" };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      swimlaneRepo.findById.mockResolvedValue(null);

      await expect(
        boardService.toggleSwimlaneCollapse(
          "board123",
          "nonexistent",
          true,
          "user123"
        )
      ).rejects.toThrow("Swimlane không tồn tại hoặc không thuộc board này");
    });

    it("❌ should throw error when swimlane belongs to different board", async () => {
      const mockBoard = { _id: "board123" };
      const mockSwimlane = {
        _id: "swim123",
        board_id: "otherboard",
      };

      boardRepo.findById.mockResolvedValue(mockBoard);
      boardRepo.isMember.mockResolvedValue(true);
      swimlaneRepo.findById.mockResolvedValue(mockSwimlane);

      await expect(
        boardService.toggleSwimlaneCollapse(
          "board123",
          "swim123",
          true,
          "user123"
        )
      ).rejects.toThrow("Swimlane không tồn tại hoặc không thuộc board này");
    });
  });
});


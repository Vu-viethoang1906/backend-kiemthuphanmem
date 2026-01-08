// 📄 tests/unit/column.service.test.js - Column Service Unit Tests
jest.mock("../../repositories/column.repository");
jest.mock("../../repositories/board.repository");

const columnService = require("../../services/column.service");
const columnRepo = require("../../repositories/column.repository");
const boardRepo = require("../../repositories/board.repository");

describe("🔹 Column Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createColumn", () => {
    it("✅ should create column successfully", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
        name: "To Do",
        order: 1,
        isdone: false,
      };

      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.create.mockResolvedValue(mockColumn);

      const result = await columnService.createColumn({
        board_id: "board123",
        name: "To Do",
        order: 1,
        userId: "user123",
        isdone: false,
      });

      expect(result).toEqual(mockColumn);
      expect(boardRepo.isMember).toHaveBeenCalledWith("user123", "board123");
      expect(columnRepo.create).toHaveBeenCalledWith({
        board_id: "board123",
        name: "To Do",
        order: 1,
        isdone: false,
      });
    });

    it("❌ should throw error when userId is missing", async () => {
      await expect(
        columnService.createColumn({
          board_id: "board123",
          name: "To Do",
        })
      ).rejects.toThrow("Không xác thực");
    });

    it("❌ should throw error when user is not board member", async () => {
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        columnService.createColumn({
          board_id: "board123",
          name: "To Do",
          userId: "user123",
        })
      ).rejects.toThrow("Bạn không có quyền thao tác trên board này");
    });
  });

  describe("getColumn", () => {
    it("✅ should return column when user has permission", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
        name: "To Do",
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isMember.mockResolvedValue(true);

      const result = await columnService.getColumn("col123", "user123");

      expect(result).toEqual(mockColumn);
      expect(columnRepo.findById).toHaveBeenCalledWith("col123");
      expect(boardRepo.isMember).toHaveBeenCalledWith("user123", "board123");
    });

    it("❌ should return null when column not found", async () => {
      columnRepo.findById.mockResolvedValue(null);

      const result = await columnService.getColumn("nonexistent", "user123");

      expect(result).toBeNull();
    });

    it("❌ should throw error when user is not board member", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
        name: "To Do",
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        columnService.getColumn("col123", "user123")
      ).rejects.toThrow("Bạn không có quyền xem cột này");
    });
  });

  describe("getColumnsByBoard", () => {
    it("✅ should return columns for admin", async () => {
      const mockColumns = [
        { _id: "col1", name: "To Do" },
        { _id: "col2", name: "In Progress" },
      ];

      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.findAllByBoard.mockResolvedValue(mockColumns);

      const result = await columnService.getColumnsByBoard(
        "board123",
        "user123",
        ["admin"]
      );

      expect(result).toEqual(mockColumns);
      expect(columnRepo.findAllByBoard).toHaveBeenCalledWith("board123");
    });

    it("✅ should return columns for System_Manager", async () => {
      const mockColumns = [{ _id: "col1", name: "To Do" }];

      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.findAllByBoard.mockResolvedValue(mockColumns);

      const result = await columnService.getColumnsByBoard(
        "board123",
        "user123",
        ["System_Manager"]
      );

      expect(result).toEqual(mockColumns);
    });

    it("✅ should return columns for regular member", async () => {
      const mockColumns = [{ _id: "col1", name: "To Do" }];

      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.findAllByBoard.mockResolvedValue(mockColumns);

      const result = await columnService.getColumnsByBoard(
        "board123",
        "user123",
        []
      );

      expect(result).toEqual(mockColumns);
    });

    it("❌ should throw error when user is not board member", async () => {
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        columnService.getColumnsByBoard("board123", "user123", [])
      ).rejects.toThrow("Bạn không có quyền xem board này");
    });
  });

  describe("updateColumn", () => {
    it("✅ should update column successfully", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
        name: "To Do",
      };
      const updatedColumn = {
        _id: "col123",
        board_id: "board123",
        name: "Updated",
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.update.mockResolvedValue(updatedColumn);

      const result = await columnService.updateColumn(
        "col123",
        { name: "Updated" },
        "user123"
      );

      expect(result).toEqual(updatedColumn);
      expect(columnRepo.update).toHaveBeenCalledWith("col123", { name: "Updated" });
    });

    it("❌ should return null when column not found", async () => {
      columnRepo.findById.mockResolvedValue(null);

      const result = await columnService.updateColumn(
        "nonexistent",
        { name: "Updated" },
        "user123"
      );

      expect(result).toBeNull();
    });

    it("❌ should throw error when user is not board member", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        columnService.updateColumn("col123", { name: "Updated" }, "user123")
      ).rejects.toThrow("Bạn không có quyền thao tác trên board này");
    });
  });

  describe("deleteColumn", () => {
    it("✅ should delete column successfully", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
        isDoneColumn: false,
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.softDelete.mockResolvedValue(true);

      const result = await columnService.deleteColumn("col123", "user123");

      expect(result).toBe(true);
      expect(columnRepo.softDelete).toHaveBeenCalledWith("col123");
    });

    it("❌ should throw error when trying to delete Done column", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
        isDoneColumn: true,
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isMember.mockResolvedValue(true);

      await expect(
        columnService.deleteColumn("col123", "user123")
      ).rejects.toThrow(
        "Không thể xóa cột Done. Vui lòng chọn cột Done khác trước khi xóa cột này."
      );
    });

    it("❌ should return null when column not found", async () => {
      columnRepo.findById.mockResolvedValue(null);

      const result = await columnService.deleteColumn("nonexistent", "user123");

      expect(result).toBeNull();
    });

    it("❌ should throw error when user is not board member", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
        isDoneColumn: false,
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        columnService.deleteColumn("col123", "user123")
      ).rejects.toThrow("Bạn không có quyền thao tác trên board này");
    });
  });

  describe("setDoneColumn", () => {
    it("✅ should set done column successfully", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
        name: "Done",
      };
      const updatedColumn = {
        _id: "col123",
        board_id: "board123",
        name: "Done",
        isDone: true,
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.setDoneColumn.mockResolvedValue(updatedColumn);

      const result = await columnService.setDoneColumn("col123", "user123");

      expect(result).toEqual(updatedColumn);
      expect(columnRepo.setDoneColumn).toHaveBeenCalledWith(
        "col123",
        "board123"
      );
    });

    it("❌ should throw error when column not found", async () => {
      columnRepo.findById.mockResolvedValue(null);

      await expect(
        columnService.setDoneColumn("nonexistent", "user123")
      ).rejects.toThrow("Cột không tồn tại");
    });

    it("❌ should throw error when user is not board member", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        columnService.setDoneColumn("col123", "user123")
      ).rejects.toThrow("Bạn không có quyền thao tác trên board này");
    });
  });

  describe("getDoneColumn", () => {
    it("✅ should return done column", async () => {
      const mockDoneColumn = {
        _id: "col123",
        board_id: "board123",
        name: "Done",
        isDone: true,
      };

      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.getDoneColumnByBoard.mockResolvedValue(mockDoneColumn);

      const result = await columnService.getDoneColumn("board123", "user123");

      expect(result).toEqual(mockDoneColumn);
      expect(columnRepo.getDoneColumnByBoard).toHaveBeenCalledWith("board123");
    });

    it("❌ should throw error when user is not board member", async () => {
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        columnService.getDoneColumn("board123", "user123")
      ).rejects.toThrow("Bạn không có quyền xem board này");
    });
  });

  describe("reorderColumns", () => {
    it("✅ should reorder columns successfully", async () => {
      const mockResults = [
        { _id: "col1", order: 1 },
        { _id: "col2", order: 2 },
      ];

      boardRepo.isMember.mockResolvedValue(true);
      columnRepo.update.mockResolvedValue(mockResults[0]);

      const mongoose = require("mongoose");
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };
      mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

      const result = await columnService.reorderColumns(
        "board123",
        [
          { id: "col1", order: 1 },
          { id: "col2", order: 2 },
        ],
        "user123"
      );

      expect(result).toHaveLength(2);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it("❌ should throw error when user is not board member", async () => {
      boardRepo.isMember.mockResolvedValue(false);

      await expect(
        columnService.reorderColumns(
          "board123",
          [{ id: "col1", order: 1 }],
          "user123"
        )
      ).rejects.toThrow("Bạn không có quyền thao tác trên board này");
    });
  });

  describe("moveService", () => {
    it("✅ should move columns successfully", async () => {
      columnRepo.update.mockResolvedValue(true);

      const result = await columnService.moveService("user123", "board123", [
        "col1",
        "col2",
        "col3",
      ]);

      expect(result.success).toBe(true);
      expect(columnRepo.update).toHaveBeenCalledTimes(3);
    });

    it("✅ should handle array in data.ids", async () => {
      columnRepo.update.mockResolvedValue(true);

      const result = await columnService.moveService("user123", "board123", {
        ids: ["col1", "col2"],
      });

      expect(result.success).toBe(true);
      expect(columnRepo.update).toHaveBeenCalledTimes(2);
    });

    it("❌ should return error when idUser or idBoard is missing", async () => {
      const result = await columnService.moveService(null, "board123", []);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Thiếu thông tin");
    });

    it("❌ should return error when no data provided", async () => {
      const result = await columnService.moveService("user123", "board123", []);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Không có dữ liệu");
    });
  });

  describe("updateIsDone", () => {
    it("✅ should update isDone successfully", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
      };
      const updatedColumn = {
        _id: "col123",
        board_id: "board123",
        isDone: true,
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isCreatorFromMember.mockResolvedValue(true);
      columnRepo.updateMany.mockResolvedValue({ modifiedCount: 2 });
      columnRepo.update.mockResolvedValue(updatedColumn);

      const result = await columnService.updateIsDone(
        "col123",
        "board123",
        "user123"
      );

      expect(result).toEqual(updatedColumn);
      expect(columnRepo.updateMany).toHaveBeenCalled();
      expect(columnRepo.update).toHaveBeenCalledWith("col123", { isDone: true });
    });

    it("❌ should throw error when column not found", async () => {
      columnRepo.findById.mockResolvedValue(null);

      await expect(
        columnService.updateIsDone("nonexistent", "board123", "user123")
      ).rejects.toThrow("Không tìm thấy column");
    });

    it("❌ should return undefined when user is not creator", async () => {
      const mockColumn = {
        _id: "col123",
        board_id: "board123",
      };

      columnRepo.findById.mockResolvedValue(mockColumn);
      boardRepo.isCreatorFromMember.mockResolvedValue(false);

      const result = await columnService.updateIsDone(
        "col123",
        "board123",
        "user123"
      );

      expect(result).toBeUndefined();
    });
  });

  describe("findById", () => {
    it("✅ should return column by id", async () => {
      const mockColumn = {
        _id: "col123",
        name: "To Do",
      };

      columnRepo.findById.mockResolvedValue(mockColumn);

      const result = await columnService.findById("col123");

      expect(result).toEqual(mockColumn);
      expect(columnRepo.findById).toHaveBeenCalledWith("col123");
    });

    it("❌ should throw error on failure", async () => {
      columnRepo.findById.mockRejectedValue(new Error("Database error"));

      await expect(columnService.findById("col123")).rejects.toThrow();
    });
  });

  describe("countTask", () => {
    it("✅ should call findTasks", async () => {
      // countTask doesn't return anything, just calls findTasks
      columnRepo.findTasks = jest.fn().mockResolvedValue([]);

      await columnService.countTask("col123", "board123");

      expect(columnRepo.findTasks).toHaveBeenCalledWith("col123", "board123");
    });

    it("❌ should throw error on failure", async () => {
      columnRepo.findTasks = jest.fn().mockRejectedValue(new Error("Database error"));

      await expect(
        columnService.countTask("col123", "board123")
      ).rejects.toThrow();
    });
  });

  describe("findIsDone", () => {
    it("✅ should return done columns", async () => {
      const mockColumns = [
        { _id: "col1", isDone: true },
        { _id: "col2", isDone: false },
        { _id: "col3", isDone: true },
      ];
      const doneColumns = [
        { _id: "col1", isDone: true },
        { _id: "col3", isDone: true },
      ];

      columnRepo.findBoardColumn.mockResolvedValue(mockColumns);

      const result = await columnService.findIsDone("board123");

      expect(result).toEqual(doneColumns);
      expect(columnRepo.findBoardColumn).toHaveBeenCalledWith("board123");
    });

    it("❌ should throw error on failure", async () => {
      columnRepo.findBoardColumn.mockRejectedValue(new Error("Database error"));

      await expect(columnService.findIsDone("board123")).rejects.toThrow();
    });
  });
});


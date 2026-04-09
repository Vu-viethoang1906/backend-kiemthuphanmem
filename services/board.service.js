const boardRepo = require("../repositories/board.repository");
const boardMemberRepo = require("../repositories/boardMember.repository");
const templateService = require("./template.service");
const columnRepo = require("../repositories/column.repository");
const swimlaneRepo = require("../repositories/swimlane.repository");
const mongoose = require("mongoose");

class BoardService {
  async selectedAll(options = {}) {
    try {
      const { filter, search, ...paginationOptions } = options;

      // Get all boards first
      const allBoards = await boardRepo.selectedAll();

      // If no options, return all
      if (Object.keys(options).length === 0) {
        return {
          boards: allBoards,
          pagination: {
            page: 1,
            limit: allBoards.length,
            total: allBoards.length,
            pages: 1,
          },
        };
      }

      // Apply filters and pagination
      let filtered = allBoards;

      // Apply search
      if (search) {
        filtered = filtered.filter(
          (b) =>
            b.title?.toLowerCase().includes(search.toLowerCase()) ||
            b.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply filters
      if (filter && filter.is_template !== undefined) {
        filtered = filtered.filter((b) => b.is_template === filter.is_template);
      }

      const total = filtered.length;
      const page = paginationOptions.page || 1;
      const limit = paginationOptions.limit || 10;
      const skip = (page - 1) * limit;

      const boards = filtered.slice(skip, skip + limit);

      return {
        boards,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async listBoardsForUser(userId, options = {}) {
    try {
      const { filter, search, ...paginationOptions } = options;

      const memberships = await boardRepo.findMembersByUser(userId);
      const memberBoardIds = memberships.map((m) => m.board_id);
      const createdBoards = await boardRepo.findByCreator(userId);
      const allBoardIds = new Set([
        ...memberBoardIds.map((id) => String(id)),
        ...createdBoards.map((b) => String(b._id)),
      ]);

      if (allBoardIds.size === 0) {
        return {
          boards: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
          },
        };
      }

      let boards = await boardRepo.findByIds(Array.from(allBoardIds));

      // Apply search
      if (search) {
        boards = boards.filter(
          (b) =>
            b.title?.toLowerCase().includes(search.toLowerCase()) ||
            b.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply filters
      if (filter && filter.is_template !== undefined) {
        boards = boards.filter((b) => b.is_template === filter.is_template);
      }

      // Apply sorting before pagination so first page is deterministic
      const sortBy = paginationOptions.sortBy || "created_at";
      const sortOrder = paginationOptions.sortOrder === "asc" ? 1 : -1;
      boards = boards.sort((a, b) => {
        const aValue = a?.[sortBy];
        const bValue = b?.[sortBy];

        // Keep stable behavior when a field is missing
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Date fields
        if (sortBy === "created_at" || sortBy === "updated_at") {
          const aTime = new Date(aValue).getTime();
          const bTime = new Date(bValue).getTime();
          return (aTime - bTime) * sortOrder;
        }

        // String fields
        if (typeof aValue === "string" && typeof bValue === "string") {
          return aValue.localeCompare(bValue) * sortOrder;
        }

        // Numeric/other comparable fields
        if (aValue > bValue) return 1 * sortOrder;
        if (aValue < bValue) return -1 * sortOrder;
        return 0;
      });

      const total = boards.length;
      const page = paginationOptions.page || 1;
      const limit = paginationOptions.limit || 10;
      const skip = (page - 1) * limit;

      const paginatedBoards = boards.slice(skip, skip + limit);

      return {
        boards: paginatedBoards,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async createBoard({ title, description, userId, is_template }) {
    if (!title || !userId) {
      throw new Error("title và userId là bắt buộc");
    }

    const existingBoard = await boardRepo.findByTitleAndUser(title, userId);
    if (existingBoard) {
      throw new Error("Bạn đã có board với tên này rồi!");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const board = await boardRepo.createWithSession(
        { title, description, is_template, created_by: userId },
        session
      );

      await boardMemberRepo.addMember(
        {
          board_id: board._id,
          user_id: userId,
          role_in_board: "Người tạo",
          Creator: true,
        },
        session
      );

      await session.commitTransaction();
      session.endSession();

      return board;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async getBoardIfPermitted(boardId, userId) {
    const board = await boardRepo.findById(boardId);
    if (!board) return null;

    const permitted = await boardRepo.isMember(userId, boardId);

    return permitted ? board : "forbidden";
  }

  async getBoardById(id) {
    return await boardRepo.findById(id);
  }

  async updateBoard(boardId, updateData, userId) {
    const board = await this.getBoardIfPermitted(boardId, userId);
    if (board === null) return null;
    if (board === "forbidden") throw new Error("FORBIDDEN");
    const allowed = {};
    if (typeof updateData.title === "string") allowed.title = updateData.title;
    if (typeof updateData.description === "string")
      allowed.description = updateData.description;
    if (updateData.center_id) allowed.center_id = updateData.center_id;
    return boardRepo.updateById(boardId, allowed);
  }

  async deleteBoard(boardId, userId) {
    const isCreator = await boardRepo.isCreatorFromMember(userId, boardId);
    if (!isCreator) throw new Error("FORBIDDEN");

    await boardRepo.softDelete(boardId);
    return true;
  }

  async cloneBoard(id_template, { title, description, userId }) {
    try {
      if (!id_template) throw new Error("Thiếu id_template");
      if (!title || title.trim() === "")
        throw new Error("Tên board không được để trống");
      if (!userId) throw new Error("Thiếu userId");

      const cleanTitle = title.trim();

      await require("./template.service").getTemplateById(id_template);

      const existingBoard = await boardRepo.findOne({
        created_by: userId,
        title: { $regex: new RegExp(`^${cleanTitle}$`, "i") }, // không phân biệt hoa thường
      });

      if (existingBoard) {
        throw new Error(`Bạn đã có board với tên "${cleanTitle}" rồi.`);
      }

      const templateColumnService = require("./templateColumn.service");
      const templateSwimlaneService = require("./templateSwimlane.service");
      const columns = (await templateColumnService.list(id_template)) || [];
      const swimlanes = (await templateSwimlaneService.list(id_template)) || [];

      if (!Array.isArray(columns) || !Array.isArray(swimlanes)) {
        throw new Error("Template không hợp lệ: dữ liệu không phải mảng");
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      let newBoard,
        newColumns = [],
        newSwimlanes = [];

      try {
        newBoard = await boardRepo.createWithSession(
          {
            title: cleanTitle,
            description,
            is_template: false,
            created_by: userId,
          },
          session
        );

        await boardMemberRepo.addMember(
          {
            board_id: newBoard._id,
            user_id: userId,
            role_in_board: "Người tạo",
            Creator: true,
          },
          session
        );

        if (columns.length > 0) {
          newColumns = await columnRepo.insertMany(
            columns.map((col) => ({
              board_id: newBoard._id,
              name: col.name,
              order: col.order_index,
            })),
            session
          );
        }

        if (swimlanes.length > 0) {
          newSwimlanes = await swimlaneRepo.insertMany(
            swimlanes.map((lane) => ({
              board_id: newBoard._id,
              name: lane.name,
              order: lane.order_index,
            })),
            session
          );
        }

        await session.commitTransaction();
        session.endSession();
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }

      return {
        board: newBoard,
        columns: newColumns,
        swimlanes: newSwimlanes,
      };
    } catch (error) {
      throw new Error(`Clone board failed: ${error.message}`);
    }
  }

  async configureBoardSettings(boardId, { columns, swimlanes }, userId) {
    try {
      // Kiểm tra quyền truy cập
      const board = await this.getBoardIfPermitted(boardId, userId);
      if (board === null) throw new Error("Board không tồn tại");
      if (board === "forbidden")
        throw new Error("Không có quyền cấu hình board này");

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        let result = { board: board };

        // Cấu hình columns nếu có
        if (columns && Array.isArray(columns)) {
          // Soft delete columns cũ
          await columnRepo.softDeleteManyByBoard(boardId, session);

          // Tạo columns mới
          if (columns.length > 0) {
            const newColumns = await columnRepo.insertMany(
              columns.map((col, index) => ({
                board_id: boardId,
                name: col.name,
                order: col.order || index,
              })),
              session
            );
            result.columns = newColumns;
          }
        }

        // Cấu hình swimlanes nếu có
        if (swimlanes && Array.isArray(swimlanes)) {
          await swimlaneRepo.softDeleteManyByBoard(boardId, session);

          // Tạo swimlanes mới
          if (swimlanes.length > 0) {
            const newSwimlanes = await swimlaneRepo.insertMany(
              swimlanes.map((lane, index) => ({
                board_id: boardId,
                name: lane.name,
                order: lane.order || index,
              })),
              session
            );
            result.swimlanes = newSwimlanes;
          }
        }

        await session.commitTransaction();
        session.endSession();

        return result;
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }
    } catch (error) {
      throw error;
    }
  }

  async toggleSwimlaneCollapse(boardId, swimlaneId, collapsed, userId) {
    try {
      const board = await this.getBoardIfPermitted(boardId, userId);
      if (board === null) throw new Error("Board không tồn tại");
      if (board === "forbidden")
        throw new Error("Không có quyền thao tác trên board này");

      const swimlane = await swimlaneRepo.findById(swimlaneId);
      if (!swimlane || swimlane.board_id.toString() !== boardId) {
        throw new Error("Swimlane không tồn tại hoặc không thuộc board này");
      }

      const updatedSwimlane = await swimlaneRepo.update(swimlaneId, {
        collapsed: collapsed,
      });

      return updatedSwimlane;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new BoardService();

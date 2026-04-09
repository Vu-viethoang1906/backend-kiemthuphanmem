const mongoose = require('mongoose');
const BacklogItem = require('../models/backlogItem.model');
const columnRepo = require('../repositories/column.repository');
const boardService = require('../services/board.service');
const Sprint = require('../models/sprint.model');
const taskService = require('../services/task.service');

function startOfISOWeek(date) {
  const d = new Date(date);
  // normalize to local midnight
  d.setHours(0, 0, 0, 0);
  // getDay(): 0 (Sun) - 6 (Sat). ISO week starts Monday.
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfISOWeek(date) {
  const start = startOfISOWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatDateYYYYMMDD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

class BacklogItemService {
  async listForUser(userId, query = {}) {
    const filter = { created_by: userId, deleted_at: null };

    if (query.priority) filter.priority = query.priority;
    if (query.assigned_to) filter.assigned_to = query.assigned_to;
    if (query.search) filter.title = { $regex: query.search, $options: 'i' };

    return await BacklogItem.find(filter)
      .sort({ backlog_position: 1, created_at: -1 })
      .populate('assigned_to', 'username avatar_url email full_name')
      .lean();
  }

  async createForUser(userId, data) {
    if (!data?.title || !String(data.title).trim()) throw new Error('title là bắt buộc');

    const last = await BacklogItem.findOne({ created_by: userId, deleted_at: null })
      .sort({ backlog_position: -1 })
      .select('backlog_position')
      .lean();

    const backlog_position =
      typeof data.backlog_position === 'number'
        ? data.backlog_position
        : (last?.backlog_position || 0) + 10;

    const payload = {
      title: String(data.title).trim(),
      description: data.description || '',
      priority: data.priority || 'Medium',
      story_points: data.story_points ?? null,
      backlog_position,
      created_by: userId,
      assigned_to: data.assigned_to || null,
    };

    return await BacklogItem.create(payload);
  }

  async updateForUser(userId, itemId, data) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) throw new Error('Backlog item ID không hợp lệ');

    const item = await BacklogItem.findOne({ _id: itemId, created_by: userId, deleted_at: null });
    if (!item) throw new Error('Backlog item không tồn tại');

    if (data.title !== undefined) item.title = String(data.title).trim();
    if (data.description !== undefined) item.description = data.description || '';
    if (data.priority !== undefined) item.priority = data.priority;
    if (data.story_points !== undefined) item.story_points = data.story_points;
    if (data.assigned_to !== undefined) item.assigned_to = data.assigned_to || null;
    if (data.backlog_position !== undefined) item.backlog_position = data.backlog_position;

    await item.save();
    return item;
  }

  async softDeleteForUser(userId, itemId) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) throw new Error('Backlog item ID không hợp lệ');
    const item = await BacklogItem.findOne({ _id: itemId, created_by: userId, deleted_at: null });
    if (!item) throw new Error('Backlog item không tồn tại');

    item.deleted_at = new Date();
    await item.save();
    return true;
  }

  async reorderForUser(userId, items) {
    if (!Array.isArray(items) || items.length === 0) return;

    const bulkOps = items
      .filter((i) => i?.itemId && typeof i.position === 'number')
      .map((i) => ({
        updateOne: {
          filter: { _id: i.itemId, created_by: userId, deleted_at: null },
          update: { $set: { backlog_position: i.position } },
        },
      }));

    if (bulkOps.length === 0) return;
    await BacklogItem.bulkWrite(bulkOps);
  }

  async ensureBoardHasDefaultColumns(boardId) {
    const cols = await columnRepo.findAllByBoard(boardId);
    if (Array.isArray(cols) && cols.length > 0) return cols;

    const defaultCols = [
      { name: 'To Do', order: 0, isDoneColumn: false },
      { name: 'In Progress', order: 1, isDoneColumn: false },
      { name: 'Done', order: 2, isDoneColumn: true, isDone: true },
    ];

    const created = await columnRepo.insertMany(
      defaultCols.map((c) => ({
        board_id: boardId,
        name: c.name,
        order: c.order,
        isDoneColumn: !!c.isDoneColumn,
        isDone: !!c.isDone,
      }))
    );

    return created;
  }

  async createWeeklyBoardForUser(userId, { baseTitle, startDate, title, description }) {
    const start = startOfISOWeek(startDate || new Date());
    const end = endOfISOWeek(start);

    const titlePrefix = baseTitle && String(baseTitle).trim() ? String(baseTitle).trim() : 'Sprint';
    const generatedTitle = `${titlePrefix} ${formatDateYYYYMMDD(start)} → ${formatDateYYYYMMDD(end)}`;
    const requestedTitle = String(title || '').trim();
    const finalTitle = requestedTitle || generatedTitle;
    const finalDescription =
      String(description || '').trim() ||
      `Weekly board (${formatDateYYYYMMDD(start)} to ${formatDateYYYYMMDD(end)})`;

    let board = null;
    let lastError = null;
    const maxRetries = 8;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const candidateTitle =
        attempt === 0 ? finalTitle : `${finalTitle} (${attempt + 1})`;
      try {
        board = await boardService.createBoard({
          title: candidateTitle,
          description: finalDescription,
          userId,
          is_template: false,
        });
        break;
      } catch (error) {
        lastError = error;
        const isDuplicateName = String(error?.message || '').includes('board với tên này');
        if (!isDuplicateName) {
          throw error;
        }
      }
    }

    if (!board) {
      throw lastError || new Error('Không thể tạo board mới');
    }

    const columns = await this.ensureBoardHasDefaultColumns(board._id);

    const sprint = await Sprint.create({
      board_id: board._id,
      name: board.title,
      start_date: start,
      end_date: end,
      sprint_duration_days: 7,
      status: 'active',
    });

    return { board, columns, sprint };
  }

  async convertItemsToBoardTasks(userId, { itemIds, boardId, createWeeklyBoard, weekly }) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new Error('itemIds là bắt buộc');
    }

    let targetBoardId = boardId;
    let sprintId = null;
    let createdBoard = null;
    let createdColumns = null;

    if (!targetBoardId) {
      if (!createWeeklyBoard) throw new Error('boardId là bắt buộc nếu không tạo board mới');
      const created = await this.createWeeklyBoardForUser(userId, {
        baseTitle: weekly?.baseTitle,
        startDate: weekly?.startDate,
        title: weekly?.title,
        description: weekly?.description,
      });
      createdBoard = created.board;
      createdColumns = created.columns;
      sprintId = created.sprint?._id?.toString?.() || created.sprint?._id || null;
      targetBoardId = createdBoard._id.toString();
    }

    // Ensure board has columns and pick first column as destination
    const cols = createdColumns || (await this.ensureBoardHasDefaultColumns(targetBoardId));
    const firstColumn = Array.isArray(cols) && cols.length > 0 ? cols[0] : null;
    if (!firstColumn) throw new Error('Board không có column để tạo task');

    // Fetch items owned by user
    const items = await BacklogItem.find({
      _id: { $in: itemIds },
      created_by: userId,
      deleted_at: null,
    }).lean();

    if (!items || items.length === 0) throw new Error('Không tìm thấy backlog items hợp lệ');

    // Create tasks one by one using existing taskService (permissions + validation)
    const createdTasks = [];
    for (const item of items) {
      const payload = {
        board_id: targetBoardId,
        column_id: firstColumn._id.toString(),
        title: item.title,
        description: item.description,
        priority: item.priority,
        story_points: item.story_points,
        assigned_to: item.assigned_to || null,
        sprint_id: sprintId,
      };

      const task = await taskService.createTask(payload, userId);
      createdTasks.push(task);
    }

    // Optionally delete items after converting
    await BacklogItem.updateMany(
      { _id: { $in: items.map((i) => i._id) }, created_by: userId },
      { $set: { deleted_at: new Date() } }
    );

    return {
      board: createdBoard,
      board_id: targetBoardId,
      sprint_id: sprintId,
      tasks: createdTasks,
      converted_count: createdTasks.length,
    };
  }
}

module.exports = new BacklogItemService();


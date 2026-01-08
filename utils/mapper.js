const Board = require("../models/board.model");
const Column = require("../models/column.model");
const Swimlane = require("../models/swimlane.model");
const User = require("../models/usersModel");
const BoardMember = require("../models/boardMember.model");
const Task = require("../models/task.model"); // ✅ cần để tính position

const cache = {
  boards: new Map(), // key = boardName
  columns: new Map(), // key = `${boardName}:${columnName}`
  swimlanes: new Map(), // key = `${boardName}:${swimlaneName}`
};

// 🔹 Hàm parse định dạng ngày: "20/10/2025" -> new Date("2025-10-20")
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const parts = String(value).split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(`${year}-${month}-${day}`);
  }
  return new Date(value);
}

async function mapNamesToIds(taskData, userIdFromToken) {
  const boardName = String(taskData.BoardName || "").trim();
  const columnName = String(taskData.ColumnName || "").trim();
  const swimlaneName = String(taskData.SwimlaneName || "").trim();
  const taskTitle = String(taskData.Title || "").trim();

  if (!boardName || !columnName || !taskTitle) {
    return null;
  }

  // ---- 🔸 BOARD ----
  let board = cache.boards.get(boardName);
  if (!board) {
    const userBoards = await BoardMember.find({
      user_id: userIdFromToken,
    }).select("board_id");
    const boardIds = userBoards.map((b) => b.board_id);

    const boardFilter = {
      title: { $regex: new RegExp(`^${boardName}$`, "i") },
      deleted_at: null,
      $or: [{ _id: { $in: boardIds } }, { created_by: userIdFromToken }],
    };

    board = await Board.findOne(boardFilter);

    // Nếu findOne = null → thử upsert
    board = await Board.findOneAndUpdate(
      {
        title: { $regex: new RegExp(`^${boardName}$`, "i") },
        deleted_at: null,
      },
      {
        $setOnInsert: {
          title: boardName,
          description: String(taskData.Description || "").trim(),
          created_by: userIdFromToken,
          is_template: false,
        },
      },
      { new: true, upsert: true }
    );

    if (!board) {
      return null;
    }

    cache.boards.set(boardName, board);

    await BoardMember.updateOne(
      { board_id: board._id, user_id: userIdFromToken },
      { $setOnInsert: { role_in_board: "Người tạo", Creator: true } },
      { upsert: true }
    );
  }

  // ---- 🔸 COLUMN ----
  const columnKey = `${boardName}:${columnName}`;
  let column = cache.columns.get(columnKey);
  if (!column) {
    column = await Column.findOneAndUpdate(
      {
        board_id: board._id,
        name: { $regex: new RegExp(`^${columnName}$`, "i") },
      },
      {
        $setOnInsert: {
          board_id: board._id,
          name: columnName.trim(),
          order: 0,
        },
      },
      { new: true, upsert: true }
    );

    cache.columns.set(columnKey, column);
  }

  // ---- 🔸 SWIMLANE ----
  let swimlane = null;
  if (swimlaneName) {
    const swimlaneKey = `${boardName}:${swimlaneName}`;
    swimlane = cache.swimlanes.get(swimlaneKey);

    if (!swimlane) {
      swimlane = await Swimlane.findOneAndUpdate(
        {
          board_id: board._id,
          name: { $regex: new RegExp(`^${swimlaneName}$`, "i") },
        },
        {
          $setOnInsert: {
            board_id: board._id,
            name: swimlaneName.trim(),
            order: 0,
          },
        },
        { new: true, upsert: true }
      );

      cache.swimlanes.set(swimlaneKey, swimlane);
    }
  }

  // ---- 🔹 Tạo Task ----

  const createdBy = await User.findOne({
    $or: [
      { username: { $regex: new RegExp(`^${taskData.CreatedBy}$`, "i") } },
      { email: { $regex: new RegExp(`^${taskData.CreatedBy}$`, "i") } },
    ],
  });

  const assignedTo = taskData.AssignedTo
    ? await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${taskData.AssignedTo}$`, "i") } },
          { email: { $regex: new RegExp(`^${taskData.AssignedTo}$`, "i") } },
        ],
      })
    : null;

  const lastTask = await Task.findOne({
    column_id: column._id,
    swimlane_id: swimlane?._id || null,
  })
    .sort({ position: -1 })
    .select("position");
  const newPosition = lastTask ? lastTask.position + 10 : 10;
  return {
    board_id: board._id,
    column_id: column._id,
    swimlane_id: swimlane?._id || null,
    title: taskTitle,
    description: String(taskData.Description || "").trim(),
    status: String(taskData.Status || "").trim(),
    priority: ["High", "Medium", "Low"].includes(
      String(taskData.Priority).trim()
    )
      ? String(taskData.Priority).trim()
      : "Low",
    start_date: parseDate(taskData.StartDate),
    due_date: parseDate(taskData.DueDate),
    estimate_hours: Number(taskData.EstimateHours) || null,
    created_by: createdBy?._id || userIdFromToken,
    assigned_to: assignedTo?._id || null,
    position: newPosition,
  };
}

module.exports = { mapNamesToIds };

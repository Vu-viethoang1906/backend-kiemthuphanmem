const mongoose = require('mongoose');

module.exports = async function buildTaskQuery(filters = {}, models, userId = null) {
  const { Board, Column, Swimlane, User } = models;
  const query = { deleted_at: null }; // Chỉ lấy tasks chưa xóa

  // ---------------------------------------------
  // 1. KEYWORD FUZZY (title / description)
  // ---------------------------------------------
  if (filters.keyword) {
    query.$or = [
      { title: { $regex: filters.keyword, $options: 'i' } },
      { description: { $regex: filters.keyword, $options: 'i' } },
    ];
  }
  if (filters.status) {
    if (filters.status === 'Done') {
      query.done_at = { $ne: null };
    }
  }

  // ---------------------------------------------
  // 2. ASSIGNEE (name → user_id hoặc "me" → userId)
  // ---------------------------------------------
  if (filters.assignee) {
    if (filters.assignee === 'me' && userId) {
      // "tasks của tôi" → dùng userId từ request
      if (mongoose.Types.ObjectId.isValid(userId)) {
        query.assigned_to = new mongoose.Types.ObjectId(userId);
      } else {
        query.assigned_to = userId;
      }
    } else {
      // Tìm user theo username
    const user = await User.findOne({
      username: { $regex: `^${filters.assignee}$`, $options: 'i' },
    });

    if (user) {
      query.assigned_to = user._id;
    } else {
      // Không tìm thấy user → trả về rỗng ngay
      query.assigned_to = null;
      }
    }
  }

  // ---------------------------------------------
  // 3. OVERDUE = true → due_date < now AND done_at == null
  //    overdue_days = X → due_date < (now - X days)
  // ---------------------------------------------
  if (filters.overdue === true) {
    query.done_at = null;
    const now = new Date();
    if (filters.overdue_days && typeof filters.overdue_days === 'number') {
      // "quá hạn X ngày" → due_date < (now - X days)
      const daysAgo = new Date(now.getTime() - filters.overdue_days * 24 * 60 * 60 * 1000);
      query.due_date = { $lte: daysAgo };
    } else {
      // "quá hạn" → due_date < now
      query.due_date = { $lte: now };
    }
  }

  // ---------------------------------------------
  // 4. BOARD
  // "tất cả" → bỏ qua board
  // board_id (direct ID) → dùng trực tiếp
  // board (name) → tìm theo tên
  // ---------------------------------------------
  if (filters.board_id) {
    // Nếu có board_id trực tiếp (từ request), dùng luôn
    if (mongoose.Types.ObjectId.isValid(filters.board_id)) {
      query.board_id = new mongoose.Types.ObjectId(filters.board_id);
    } else {
      query.board_id = filters.board_id;
    }
  } else if (filters.board && filters.board !== 'tất cả') {
    // Tìm board theo tên
    const board = await Board.findOne({
      title: { $regex: filters.board, $options: 'i' },
      deleted_at: null,
    });

    if (board) query.board_id = board._id;
    else query.board_id = null;
  }

  // ---------------------------------------------
  // 5. COLUMN (map column name → _id)
  // ---------------------------------------------
  if (filters.column) {
    const col = await Column.findOne({
      name: { $regex: filters.column, $options: 'i' },
    });

    if (col) query.column_id = col._id;
    else query.column_id = null;
  }

  // ---------------------------------------------
  // 6. SWIMLANE
  // ---------------------------------------------
  if (filters.swimlane) {
    const swim = await Swimlane.findOne({
      name: { $regex: filters.swimlane, $options: 'i' },
    });

    if (swim) query.swimlane_id = swim._id;
    else query.swimlane_id = null;
  }

  // Helper function to validate and create Date
  const createValidDate = (dateValue) => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date value: ${dateValue}`);
      return null;
    }
    return date;
  };

  // ---------------------------------------------
  // 7. DEADLINE RANGE & DUE_IN_DAYS
  // ---------------------------------------------
  if (filters.due_in_days && typeof filters.due_in_days === 'number') {
    // "còn X ngày nữa hết hạn" → due_date trong khoảng [now, now + X days]
    const now = new Date();
    const futureDate = new Date(now.getTime() + filters.due_in_days * 24 * 60 * 60 * 1000);
    query.due_date = {
      $gte: now,
      $lte: futureDate,
    };
    query.done_at = null; // Chỉ lấy tasks chưa done
  } else if (filters.deadline) {
    query.due_date = {};

    if (filters.deadline.$lte) {
      const date = createValidDate(filters.deadline.$lte);
      if (date) query.due_date.$lte = date;
    }
    if (filters.deadline.$gte) {
      const date = createValidDate(filters.deadline.$gte);
      if (date) query.due_date.$gte = date;
    }

    if (Object.keys(query.due_date).length === 0) {
      delete query.due_date;
    }
  }

  // ---------------------------------------------
  // 8. DATE_RANGE (from, to)
  // ---------------------------------------------
  if (filters.date_range) {
    if (filters.date_range.from || filters.date_range.to) {
      query.due_date = query.due_date || {};
      if (filters.date_range.from) {
        const date = createValidDate(filters.date_range.from);
        if (date) query.due_date.$gte = date;
      }
      if (filters.date_range.to) {
        const date = createValidDate(filters.date_range.to);
        if (date) query.due_date.$lte = date;
      }
      
      // Nếu không có date hợp lệ nào, xóa due_date
      if (Object.keys(query.due_date).length === 0) {
        delete query.due_date;
      }
    }
  }

  // ---------------------------------------------
  // 9. PRIORITY
  // ---------------------------------------------
  if (filters.priority) {
    query.priority = filters.priority; // High, Medium, Low
  }

  // ---------------------------------------------
  // 10. TAG
  // ---------------------------------------------
  if (filters.tag) {
    // Tìm tag theo name và lấy _id
    const Tag = require('../models/tag.model');
    const tag = await Tag.findOne({
      name: { $regex: filters.tag, $options: 'i' },
    });
    if (tag) {
      query.tags = { $in: [tag._id] };
    } else {
      // Không tìm thấy tag → trả về rỗng
      query.tags = { $in: [] };
    }
  }

  // ---------------------------------------------
  // 11. SPRINT
  // ---------------------------------------------
  if (filters.sprint) {
    const Sprint = require('../models/sprint.model');
    const sprint = await Sprint.findOne({
      name: { $regex: filters.sprint, $options: 'i' },
    });
    if (sprint) {
      query.sprint_id = sprint._id;
    } else {
      // Không tìm thấy sprint → trả về rỗng
      query.sprint_id = null;
    }
  }

  return query;
};

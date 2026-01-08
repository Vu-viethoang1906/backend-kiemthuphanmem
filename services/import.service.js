const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const taskRepo = require('../repositories/task.repository');
const boardRepo = require('../repositories/board.repository');
const columnRepo = require('../repositories/column.repository');
const boardMemberRepo = require('../repositories/boardMember.repository');
const mongoose = require('mongoose');

class ImportService {
  // Import tasks từ file
  async importTasksFromFile(filePath, { board_id, column_id, user_id }) {
    try {
      // Validate input (only if provided). If rows contain `board_name`/`column_name`,
      // they will be resolved per-row later.
      if (board_id) {
        if (!mongoose.Types.ObjectId.isValid(board_id)) {
          throw new Error('board_id không hợp lệ');
        }

        // Kiểm tra board tồn tại
        const board = await boardRepo.findById(board_id);
        if (!board) {
          throw new Error('Board không tồn tại');
        }
      }

      if (column_id) {
        if (!mongoose.Types.ObjectId.isValid(column_id)) {
          throw new Error('column_id không hợp lệ');
        }

        // Kiểm tra column tồn tại nếu column_id được cung cấp
        const column = await columnRepo.findById(column_id);
        if (!column) {
          throw new Error('Column không tồn tại');
        }
        // Nếu cung cấp cả board_id, ensure column thuộc board đó
        if (board_id && column.board_id.toString() !== board_id) {
          throw new Error('Column không tồn tại hoặc không thuộc board này');
        }
      }

      // Đọc file dựa trên extension
      const fileExt = path.extname(filePath).toLowerCase();
      let tasks = [];

      if (fileExt === '.csv') {
        tasks = await this.parseCSVFile(filePath);
      } else if (fileExt === '.xlsx' || fileExt === '.xls') {
        tasks = await this.parseExcelFile(filePath);
      } else {
        throw new Error('Định dạng file không được hỗ trợ');
      }

      // If rows include board/column names, resolve them to ids (find or create) so that
      // multiple rows with the same board_name map to the same board (and not create
      // duplicate boards because of differing column names).
      await this._resolveBoardsAndColumnsForRows(tasks, { board_id, column_id, user_id });

      // Validate và tạo tasks
      const result = await this.createTasksFromData(tasks, {
        board_id,
        column_id,
        user_id,
      });

      // Cleanup file
      fs.unlinkSync(filePath);

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Parse CSV file
  async parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      let rowCount = 0;
      const maxRows = 10000;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', data => {
          rowCount++;
          if (rowCount > maxRows) {
            reject(new Error(`File quá lớn. Tối đa ${maxRows} dòng.`));
            return;
          }
          results.push(data);
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  // Parse Excel file
  async parseExcelFile(filePath) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      if (jsonData.length > 10000) {
        throw new Error('File quá lớn. Tối đa 10000 dòng.');
      }

      return jsonData;
    } catch (error) {
      throw new Error('Không thể đọc file Excel: ' + error.message);
    }
  }

  // Resolve board and column ids for rows that provide `board_name` or `column_name`.
  // This ensures multiple rows with the same board name use the same board (no duplicates).
  async _resolveBoardsAndColumnsForRows(tasksData, { board_id, column_id, user_id }) {
    const ColumnModel = require('../models/column.model');

    const boardCache = new Map(); // normalized board name -> board id
    const columnCache = new Map(); // `${boardId}:${normalized column name}` -> column id

    const sanitize = s =>
      s
        .toString()
        .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '') // remove zero-width/invisible
        .replace(/\u00A0/g, ' ') // NBSP -> space
        .replace(/\s+/g, ' ') // collapse whitespace
        .trim()
        .normalize('NFC');

    const getField = (row, candidates) => {
      for (const k of candidates) {
        if (Object.prototype.hasOwnProperty.call(row, k) && row[k] != null && row[k] !== '')
          return row[k];
      }
      return undefined;
    };

    for (const [index, row] of tasksData.entries()) {
      if (process.env.IMPORT_DEBUG) {
      }
      // Resolve board id
      const rawBoardName = getField(row, [
        'board_name',
        'BoardName',
        'Board Name',
        'board name',
        'board',
        'Board',
      ]);
      if (rawBoardName) {
        let boardName = rawBoardName;
        boardName = sanitize(boardName);
        const bKey = boardName.toLowerCase();
        if (process.env.IMPORT_DEBUG) {
        }
        if (!boardCache.has(bKey)) {
          // Try to find an existing board the user is a member of
          let existing = await boardRepo.findByTitleAndUser(boardName, user_id);
          if (existing) {
            // If the board was soft-deleted, restore it so imported tasks are visible
            if (existing.deleted_at) {
              try {
                existing = await boardRepo.updateById(existing._id, { deleted_at: null });
              } catch (err) {
                // If restore fails, continue with existing id (best-effort)
              }
            }
            boardCache.set(bKey, existing._id.toString());
          } else {
            // If user is not a member, there still could be an existing board with the same title
            const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existingAny = await boardRepo.findOne({
              title: new RegExp(`^${escapeRegExp(boardName)}$`, 'iu'),
            });
            if (existingAny) {
              // Restore soft-deleted board if necessary
              if (existingAny.deleted_at) {
                try {
                  await boardRepo.updateById(existingAny._id, { deleted_at: null });
                } catch (err) {}
              }

              // Ensure the importing user is a member of the board so it shows in their list
              try {
                const member = await boardMemberRepo.findMember(user_id, existingAny._id);
                if (!member) {
                  await boardMemberRepo.addMember({
                    user_id,
                    board_id: existingAny._id,
                    role_in_board: 'Thành viên',
                    Creator: false,
                  });
                }
              } catch (err) {}

              boardCache.set(bKey, existingAny._id.toString());
            } else {
              // Create a new board and make the importing user its creator/member
              const created = await boardRepo.create({ title: boardName, created_by: user_id });
              try {
                await boardMemberRepo.addMember({
                  user_id,
                  board_id: created._id,
                  role_in_board: 'Người tạo',
                  Creator: true,
                });
              } catch (err) {}
              boardCache.set(bKey, created._id.toString());
            }
          }
        }
        row._board_id = boardCache.get(bKey);
      } else if (board_id) {
        // No board_name in row, use provided board_id
        row._board_id = board_id;
      }

      // Resolve column id
      const rawColName = getField(row, [
        'column_name',
        'ColumnName',
        'Column Name',
        'column name',
        'column',
        'Column',
      ]);
      if (rawColName) {
        let colName = sanitize(rawColName);
        if (process.env.IMPORT_DEBUG) {
        }
        const boardForCol = row._board_id || board_id;
        if (!boardForCol) {
          // We don't have a board context for this column; skip and let validation catch it
          continue;
        }

        const cKey = `${boardForCol}:${colName.toLowerCase()}`;
        if (!columnCache.has(cKey)) {
          // Try to find existing column
          let existingCol = await ColumnModel.findOne({ name: colName, board_id: boardForCol });
          if (existingCol) {
            // Restore soft-deleted column if needed
            if (existingCol.deleted_at) {
              try {
                await columnRepo.update(existingCol._id, { deleted_at: null });
              } catch (err) {}
            }
            columnCache.set(cKey, existingCol._id.toString());
          } else {
            const createdCol = await columnRepo.create({ name: colName, board_id: boardForCol });
            columnCache.set(cKey, createdCol._id.toString());
          }
        }
        row._column_id = columnCache.get(cKey);
      } else if (column_id) {
        row._column_id = column_id;
      }
    }
  }

  // Tạo tasks từ data
  async createTasksFromData(tasksData, { board_id, column_id, user_id }) {
    const result = {
      totalRows: tasksData.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      tasks: [],
    };

    for (let i = 0; i < tasksData.length; i++) {
      try {
        const row = tasksData[i];
        // Allow per-row resolved board/column ids (set by _resolveBoardsAndColumnsForRows)
        const effectiveBoardId = row._board_id || board_id;
        const effectiveColumnId = row._column_id || column_id;

        const taskData = this.validateAndMapTaskData(row, {
          board_id: effectiveBoardId,
          column_id: effectiveColumnId,
          user_id,
        });

        const task = await taskRepo.create(taskData);
        result.tasks.push(task);
        result.successCount++;
      } catch (error) {
        result.errorCount++;
        result.errors.push({
          row: i + 1,
          error: error.message,
          data: tasksData[i],
        });
      }
    }

    return result;
  }

  // Validate và map task data
  validateAndMapTaskData(row, { board_id, column_id, user_id }) {
    const requiredFields = ['title'];
    const taskData = {
      board_id,
      column_id,
      created_by: user_id,
    };

    // Validate required fields
    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === '') {
        throw new Error(`Trường ${field} là bắt buộc`);
      }
    }

    // Map fields
    taskData.title = row.title.toString().trim();
    taskData.description = row.description ? row.description.toString().trim() : '';
    taskData.priority = row.priority ? row.priority.toString().trim() : 'medium';
    taskData.assigned_to = row.assigned_to ? row.assigned_to.toString().trim() : null;

    // Parse dates
    if (row.start_date) {
      const startDate = new Date(row.start_date);
      if (!isNaN(startDate.getTime())) {
        taskData.start_date = startDate;
      }
    }

    if (row.due_date) {
      const dueDate = new Date(row.due_date);
      if (!isNaN(dueDate.getTime())) {
        taskData.due_date = dueDate;
      }
    }

    // Parse estimate hours
    if (row.estimate_hours) {
      const hours = parseFloat(row.estimate_hours);
      if (!isNaN(hours) && hours >= 0) {
        taskData.estimate_hours = hours;
      }
    }

    return taskData;
  }

  // Tạo template file mẫu
  async generateTemplateFile() {
    try {
      const templateData = [
        {
          title: 'Task 1',
          description: 'Mô tả task 1',
          priority: 'high',
          start_date: '2024-01-01',
          due_date: '2024-01-15',
          estimate_hours: '8',
          assigned_to: 'user@example.com',
        },
        {
          title: 'Task 2',
          description: 'Mô tả task 2',
          priority: 'medium',
          start_date: '2024-01-02',
          due_date: '2024-01-20',
          estimate_hours: '16',
          assigned_to: 'user2@example.com',
        },
      ];

      const csvContent = this.convertToCSV(templateData);
      const templatePath = path.join(__dirname, '../uploads/template.csv');

      // Đảm bảo thư mục tồn tại
      const uploadDir = path.dirname(templatePath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      fs.writeFileSync(templatePath, csvContent);
      return templatePath;
    } catch (error) {
      throw error;
    }
  }

  // Convert data to CSV
  convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  // Lấy lịch sử import
  async getImportHistory(userId) {
    try {
      // Tìm các task được tạo bởi user trong 30 ngày qua
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const tasks = await taskRepo.findByUserAndDateRange(userId, thirtyDaysAgo);

      // Group by date
      const history = {};
      tasks.forEach(task => {
        const date = task.created_at.toISOString().split('T')[0];
        if (!history[date]) {
          history[date] = [];
        }
        history[date].push(task);
      });

      return history;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ImportService();

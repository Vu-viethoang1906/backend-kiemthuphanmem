const nlpService = require('../services/nlp.service');
const Task = require('../models/task.model');
const Board = require('../models/board.model');
const Column = require('../models/column.model');
const Swimlane = require('../models/swimlane.model');
const User = require('../models/usersModel');
const buildTaskQuery = require('../services/taskQueryBuilder.service');
const Fuse = require('fuse.js');

class NLPController {
  async parse(req, res) {
    try {
      const { query, board_id } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      // Lấy userId từ request (sau khi authenticate)
      const userId = req.user?.id || null;

      // NLP → { intent, filters }
      const result = await nlpService.parseNaturalQuery(query);

      // Nếu có board_id từ request, thêm vào filters để filter theo board hiện tại
      if (board_id && !result.filters.board) {
        result.filters.board_id = board_id;
      }

      // Build query từ NLP (pass userId để xử lý "tasks của tôi")
      let mongoQuery = await buildTaskQuery(result.filters, {
        Board,
        Column,
        Swimlane,
        User,
      }, userId);

      // Nếu có board_id từ request nhưng không có trong mongoQuery, thêm vào
      if (board_id && !mongoQuery.board_id) {
        mongoQuery.board_id = board_id;
      }

      // Xử lý done_at nếu có trong filters
      // Nếu status = "Done", filter tasks đã done
      // Nếu không có status filter, mặc định chỉ lấy tasks chưa done (trừ khi query rõ ràng yêu cầu done)
      if (result.filters.status === 'Done') {
        // Tìm cột Done của board
        const targetBoardId = mongoQuery.board_id || board_id;
        if (targetBoardId) {
        const doneColumn = await Column.findOne({
            board_id: targetBoardId,
          isDone: true,
        });
          if (doneColumn) {
            mongoQuery.column_id = doneColumn._id;
          }
        }
        mongoQuery.done_at = { $ne: null };
      } else if (!result.filters.status) {
        // Mặc định: chỉ lấy tasks chưa done (nếu không có status filter)
        const targetBoardId = mongoQuery.board_id || board_id;
        if (targetBoardId) {
        const doneColumn = await Column.findOne({
            board_id: targetBoardId,
          isDone: true,
        });
          if (doneColumn) {
            // Đảm bảo không conflict với column_id đã có
            if (!mongoQuery.column_id) {
              mongoQuery.column_id = { $ne: doneColumn._id };
            }
          }
        }
      }

      // Query DB
      delete mongoQuery.done_at; // Xóa done_at vì đã xử lý bằng column_id
      let tasks = await Task.find(mongoQuery)
        .populate('assigned_to', 'username full_name avatar_url')
        .populate('column_id', 'name order')
        .populate('swimlane_id', 'name order')
        .lean();
      
      // Populate tags cho tất cả tasks (optimize: query một lần thay vì loop)
      const TaskTag = require('../models/taskTag.model');
      if (tasks.length > 0) {
        const taskIds = tasks.map(t => t._id);
        const taskTags = await TaskTag.find({ task_id: { $in: taskIds } })
          .populate('tag_id', 'name color')
          .lean();
        
        // Tạo map: task_id -> tags
        const tagsMap = {};
        taskTags.forEach(tt => {
          if (!tagsMap[tt.task_id.toString()]) {
            tagsMap[tt.task_id.toString()] = [];
          }
          if (tt.tag_id) {
            tagsMap[tt.task_id.toString()].push({
              _id: tt.tag_id._id,
              name: tt.tag_id.name,
              color: tt.tag_id.color,
            });
          }
        });
        
        // Gán tags vào từng task
        tasks.forEach(task => {
          task.tags = tagsMap[task._id.toString()] || [];
        });
      }

      // Tăng độ chính xác tìm kiếm bằng fuzzy
      if (result.filters.keyword) {
        const fuse = new Fuse(tasks, {
          keys: ['title', 'description'],
          threshold: 0.35,
        });

        tasks = fuse.search(result.filters.keyword).map(r => r.item);
      }

      return res.json({
        status: 'success',
        tasks,
      });
    } catch (err) {
      console.error('NLP Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
  async propose(req, res) {
    try {
      const { title, boardId } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const result = await nlpService.generateTaskDescription(title, boardId);

      return res.json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      console.error('NLP Propose Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async recommend(req, res) {
    try {
      const { idTask, useDatabase = true } = req.body;
      const TaskTag = require('../models/taskTag.model');
      const Tag = require('../models/tag.model');

      const task = await Task.findById(idTask)
        .populate('assigned_to', 'username full_name')
        .lean();

      if (!task || !task.title) {
        return res.status(400).json({ error: 'Task with title is required' });
      }

      // Get task tags
      const taskTags = await TaskTag.find({ task_id: task._id })
        .populate('tag_id', 'name')
        .lean();

      task.tags = taskTags.map(tt => tt.tag_id).filter(Boolean);

      const result = await nlpService.recommendLearningResources(task, useDatabase);

      return res.json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      console.error('NLP Recommend Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async summarize(req, res) {
    try {
      const { taskId } = req.body;
      const commentService = require('../services/comment.service');
      const Task = require('../models/task.model');

      if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
      }

      // Lấy thông tin task
      const task = await Task.findById(taskId)
        .populate('assigned_to', 'username full_name')
        .lean();

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Lấy tất cả comments của task
      const comments = await commentService.getCommentsByTask(taskId);

      if (!comments || comments.length === 0) {
        return res.json({
          status: 'success',
          data: {
            success: false,
            message: 'Không có comments để tóm tắt',
            totalComments: 0,
          },
        });
      }

      // Tóm tắt bằng AI
      const result = await nlpService.summarizeComments(comments, {
        id: task._id,
        title: task.title,
        description: task.description || '',
      });

      return res.json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      console.error('NLP Summarize Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new NLPController();

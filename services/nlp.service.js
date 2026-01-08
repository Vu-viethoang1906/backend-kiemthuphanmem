const Groq = require('groq-sdk');
const Task = require('../models/task.model');
const Board = require('../models/board.model');

class NLPService {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // 🔥 Model mới nhất Groq (không bị decommission)
    this.model = 'llama-3.3-70b-versatile';
  }

  // ==================================================================
  // 1) PARSE NATURAL QUERY
  // ==================================================================

  async parseNaturalQuery(text) {
    const prompt = `
Bạn là NLP Parser cho hệ thống quản lý task.
Chỉ trả về **JSON THUẦN**, không thêm chữ, không giải thích.

Intent hợp lệ:
- QUERY_TASKS (tìm kiếm tasks)
- CREATE_TASK (tạo task mới)
- UPDATE_TASK (cập nhật task)
- DELETE_TASK (xóa task)
- UNKNOWN (không xác định)

Filters gồm:
- assignee: "me" hoặc username (VD: "me", "john")
- status: "Done", "In Progress", "Todo", etc.
- priority: "High", "Medium", "Low"
- due_in_days: số ngày (VD: 3 → còn 3 ngày nữa hết hạn)
- overdue: true/false (task quá hạn)
- overdue_days: số ngày quá hạn (VD: 5 → quá hạn 5 ngày)
- board: tên board
- sprint: tên sprint
- tag: tên tag
- keyword: từ khóa tìm kiếm trong title/description
- date_range: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
- column: tên column
- swimlane: tên swimlane

Quy tắc đặc biệt:
- "task của tôi", "tasks của tôi", "công việc của tôi" => assignee = "me"
- "còn X ngày nữa hết hạn", "hết hạn sau X ngày", "deadline trong X ngày" => due_in_days = X
- "quá hạn X ngày", "trễ X ngày", "overdue X ngày" => overdue = true, overdue_days = X
- "quá hạn", "overdue", "trễ hạn" => overdue = true
- "task hôm nay", "deadline hôm nay" => date_range = { from: today, to: today }
- "task tuần này", "deadline tuần này" => date_range = { from: startOfWeek, to: endOfWeek }
- "task tháng này", "deadline tháng này" => date_range = { from: startOfMonth, to: endOfMonth }
- "task đã xong", "task done", "task hoàn thành" => status = "Done"
- "task chưa xong", "task chưa hoàn thành" => status != "Done" (không set status)
- "task priority cao", "task quan trọng" => priority = "High"
- "task priority thấp" => priority = "Low"
- "task priority trung bình" => priority = "Medium"

Ví dụ:
- "tasks của tôi còn 3 ngày nữa hết hạn" => { intent: "QUERY_TASKS", filters: { assignee: "me", due_in_days: 3 } }
- "tìm task quá hạn 5 ngày" => { intent: "QUERY_TASKS", filters: { overdue: true, overdue_days: 5 } }
- "task priority cao của tôi" => { intent: "QUERY_TASKS", filters: { assignee: "me", priority: "High" } }

Output JSON:
{
  "intent": "",
  "filters": {}
}

Câu cần xử lý: "${text}"
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      let raw = response.choices[0].message.content.trim();

      // Xóa markdown nếu có
      raw = raw.replace(/```json|```/g, '').trim();

      return JSON.parse(raw);
    } catch (err) {
      return {
        intent: 'UNKNOWN',
        filters: {},
        error: true,
        message: 'JSON parse failed',
      };
    }
  }

  // ==================================================================
  // 2) GENERATE TASK DESCRIPTION
  // ==================================================================

  async generateTaskDescription(title, boardId = null) {
    try {
      let similarTasks = [];
      let boardContext = null;

      if (boardId) {
        // Lấy thông tin board để làm context
        const board = await Board.findById(boardId).select('title description');
        if (board) {
          boardContext = {
            title: board.title,
            description: board.description || '',
          };
        }

        // Tìm similar tasks: tìm theo từ khóa trong title (nhiều từ, không chỉ từ đầu)
        const titleKeywords = title
          .split(' ')
          .filter(word => word.length > 2) // Bỏ từ ngắn
          .slice(0, 3); // Lấy 3 từ đầu tiên

        // Tìm tasks có chứa ít nhất 1 từ khóa
        const regexPattern =
          titleKeywords.length > 0
            ? titleKeywords.map(k => `(?=.*${k})`).join('')
            : title.split(' ')[0];

        similarTasks = await Task.find({
          board_id: boardId,
          deleted_at: null,
          title: { $regex: regexPattern, $options: 'i' },
        })
          .limit(5)
          .select('title description')
          .sort({ created_at: -1 }); // Lấy tasks mới nhất
      }

      const context = similarTasks.map(t => ({
        title: t.title,
        description: t.description || '',
      }));

      const prompt = `
Bạn là AI chuyên viết mô tả task theo chuẩn Agile/Scrum.

Nhiệm vụ:
- Viết mô tả chi tiết cho task dựa trên tiêu đề.
- Viết Acceptance Criteria dạng bullet list (ưu tiên format Given-When-Then nếu phù hợp).
- Đề xuất subtasks dạng checklist (3-5 subtasks).
- Dựa vào title + board context + similar tasks để tăng độ chính xác và phù hợp với ngữ cảnh.

Chỉ trả về JSON thuần, không thêm markdown, không giải thích.

Input:
- Title: "${title}"
${boardContext ? `- Board Context: ${JSON.stringify(boardContext, null, 2)}` : ''}
- Similar Tasks (để tham khảo): ${JSON.stringify(context, null, 2)}

Output JSON (bắt buộc):
{
  "description": "Mô tả chi tiết task bằng tiếng Việt, giải thích rõ mục đích, phạm vi và yêu cầu chính",
  "acceptanceCriteria": ["Tiêu chí 1", "Tiêu chí 2", ...],
  "subtasks": ["Subtask 1", "Subtask 2", ...]
}

Lưu ý:
- Description: 2-4 câu, rõ ràng, dễ hiểu
- AcceptanceCriteria: 3-6 tiêu chí, cụ thể, có thể test được
- Subtasks: 3-5 subtasks, ngắn gọn, actionable
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });

      let raw = response.choices[0].message.content.trim();
      raw = raw.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(raw);

      return {
        success: true,
        title,
        ...parsed,
      };
    } catch (error) {
      return {
        success: false,
        message: 'AI generate failed',
        error: error.message,
      };
    }
  }

  // ==================================================================
  // 3) RECOMMEND LEARNING RESOURCES
  // ==================================================================

  async recommendLearningResources(task, useDatabase = true) {
    try {
      const { title, description = '', tags = [] } = task;
      const learningResourceService = require('./learningResource.service');

      // First, try to get recommendations from database
      let dbRecommendations = null;
      let totalDbResults = 0;
      if (useDatabase) {
        try {
          dbRecommendations = await learningResourceService.recommendResourcesForTask(task, 5);

          // If we have enough results from database, return them
          totalDbResults =
            (dbRecommendations.tutorials?.length || 0) +
            (dbRecommendations.videos?.length || 0) +
            (dbRecommendations.codeExamples?.length || 0);

          if (totalDbResults >= 5) {
            return {
              success: true,
              taskTitle: title,
              source: 'database',
              ...dbRecommendations,
            };
          }
        } catch (dbError) {}
      }

      // Fallback to AI if database doesn't have enough results
      const prompt = `
      Bạn là Content Recommendation Engine.
      Nhiệm vụ: Dựa vào thông tin Input task, gợi ý tài liệu học tập phù hợp.

      Chỉ trả về JSON thuần, không thêm chữ.

      Input Task:
      - Title: "${title}"
      - Description: "${description}"
      - Tags: ${JSON.stringify(tags)}

      Output JSON mẫu:
      {
        "tutorials": [
          {
            "title": "",
            "url": "",
            "type": "article | docs | blog"
          }
        ],
        "videos": [
          {
            "title": "",
            "url": ""
          }
        ],
        "codeExamples": [
          {
            "title": "",
            "language": "",
            "snippet": ""
          }
        ]
      }

      Yêu cầu:
      - Chỉ chọn tài liệu phù hợp với nội dung task.
      - Ưu tiên tài liệu dễ hiểu, thực hành ngay.
      - Code sample phải ngắn gọn, chính xác.
      - URLs phải là các nguồn uy tín (MDN, W3Schools, Stack Overflow, YouTube, etc.)
      - Tài liệu mới nhất với ngày hiện tại, cập nhật trong 2 năm gần đây nếu có thể.
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });

      let raw = response.choices[0].message.content.trim();
      raw = raw.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(raw);

      // Merge database and AI results if available
      if (dbRecommendations && totalDbResults > 0) {
        return {
          success: true,
          taskTitle: title,
          source: 'hybrid',
          tutorials: [
            ...(dbRecommendations.tutorials || []),
            ...(parsed.tutorials || []).slice(0, 3),
          ].slice(0, 5),
          videos: [...(dbRecommendations.videos || []), ...(parsed.videos || []).slice(0, 3)].slice(
            0,
            5
          ),
          codeExamples: [
            ...(dbRecommendations.codeExamples || []),
            ...(parsed.codeExamples || []).slice(0, 3),
          ].slice(0, 5),
        };
      }

      return {
        success: true,
        taskTitle: title,
        source: 'ai',
        ...parsed,
      };
    } catch (err) {
      return {
        success: false,
        message: 'AI recommend failed',
        error: err.message,
      };
    }
  }

  // ==================================================================
  // 4) SUMMARIZE COMMENTS
  // ==================================================================

  /**
   * Tóm tắt các comments của một task bằng AI
   * @param {Array} comments - Mảng các comments cần tóm tắt
   * @param {Object} taskInfo - Thông tin task (title, description)
   * @returns {Object} Tóm tắt với các điểm chính, quyết định, hành động, vấn đề
   */
  async summarizeComments(comments, taskInfo = {}) {
    try {
      if (!comments || comments.length === 0) {
        return {
          success: false,
          message: 'Không có comments để tóm tắt',
        };
      }

      // Chuẩn bị dữ liệu comments
      const commentsData = comments.map((c, index) => {
        const user = c.user_id;
        const userName =
          typeof user === 'object' ? user.full_name || user.username || 'Unknown' : 'Unknown';

        return {
          index: index + 1,
          author: userName,
          content: c.content || '',
          created_at: c.created_at || c.createdAt,
          hasAttachments: c.attachments && c.attachments.length > 0,
        };
      });

      const prompt = `
Bạn là AI chuyên tóm tắt cuộc thảo luận trong comments của task.

Nhiệm vụ:
- Tóm tắt các cuộc thảo luận dài thành các điểm chính
- Trích xuất các quyết định đã được đưa ra
- Liệt kê các hành động cần thực hiện
- Xác định các vấn đề chưa giải quyết
- Nổi bật các thông tin quan trọng

Chỉ trả về JSON thuần, không thêm markdown, không giải thích.

Input:
- Task Title: "${taskInfo.title || 'N/A'}"
- Task Description: "${(taskInfo.description || '').substring(0, 200)}"
- Số lượng comments: ${comments.length}

Comments:
${JSON.stringify(commentsData, null, 2)}

Output JSON (bắt buộc):
{
  "summary": "Tóm tắt ngắn gọn toàn bộ cuộc thảo luận (2-4 câu)",
  "keyPoints": [
    "Điểm chính 1",
    "Điểm chính 2",
    ...
  ],
  "decisions": [
    "Quyết định đã được đưa ra 1",
    "Quyết định đã được đưa ra 2",
    ...
  ],
  "actionItems": [
    "Hành động cần thực hiện 1",
    "Hành động cần thực hiện 2",
    ...
  ],
  "unresolvedIssues": [
    "Vấn đề chưa giải quyết 1",
    "Vấn đề chưa giải quyết 2",
    ...
  ],
  "participants": [
    "Tên người tham gia 1",
    "Tên người tham gia 2",
    ...
  ],
  "totalComments": ${comments.length}
}

Lưu ý:
- Summary: 2-4 câu, ngắn gọn, dễ hiểu
- KeyPoints: 3-7 điểm chính, sắp xếp theo mức độ quan trọng
- Decisions: Chỉ liệt kê các quyết định rõ ràng đã được đưa ra
- ActionItems: Các hành động cụ thể cần làm (có thể từ comments hoặc suy luận)
- UnresolvedIssues: Các vấn đề còn tranh cãi hoặc chưa có kết luận
- Participants: Danh sách người tham gia thảo luận (không trùng lặp)
- Nếu không có thông tin cho một mục, trả về mảng rỗng []
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3, // Thấp hơn để tóm tắt chính xác hơn
      });

      let raw = response.choices[0].message.content.trim();
      raw = raw.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(raw);

      return {
        success: true,
        taskTitle: taskInfo.title || 'N/A',
        taskId: taskInfo.id || taskInfo._id || null,
        ...parsed,
      };
    } catch (err) {
      return {
        success: false,
        message: 'AI tóm tắt thất bại',
        error: err.message,
      };
    }
  }
}

module.exports = new NLPService();

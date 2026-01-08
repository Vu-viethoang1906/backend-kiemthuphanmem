const groq = require('../config/groq');
const Task = require('../models/task.model');
const UserSkill = require('../models/userSkill.model');
const BoardMember = require('../models/boardMember.model');
const Column = require('../models/column.model');
const Skill = require('../models/skill.model');
const TaskTag = require('../models/taskTag.model');
const Tag = require('../models/tag.model');
const UserLeave = require('../models/userLeave.model');
const mongoose = require('mongoose');

class TaskMatchingAIService {
  constructor() {
    this.model = process.env.AI_MODEL_NAME || 'llama-3.1-8b-instant';

    // Weights for scoring algorithm
    this.weights = {
      skillMatch: 0.4, // 40% - Skill proficiency match
      workload: 0.3, // 30% - Current workload/availability
      performance: 0.3, // 30% - Past performance history
    };
  }

  /**
   * Extract required skills from task using AI
   * @param {Object} task - Task object with title, description, etc.
   * @returns {Promise<Array>} Array of skill names
   */
  async extractRequiredSkills(task) {
    const taskInfo = {
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || '',
      estimate_hours: task.estimate_hours || 0,
    };

    // Get task tags if available
    const taskTags = await TaskTag.find({ task_id: task._id }).populate('tag_id', 'name').lean();

    if (taskTags && taskTags.length > 0) {
      taskInfo.tags = taskTags.map(tt => tt.tag_id?.name).filter(Boolean);
    }

    const prompt = `Phân tích task và xác định các kỹ năng (skills) cần thiết để hoàn thành task này.

Task Information:
${JSON.stringify(taskInfo, null, 2)}

Hãy trích xuất tối đa 5 kỹ năng quan trọng nhất. Trả về JSON với format:
{
  "required_skills": [
    {
      "name": "JavaScript",
      "importance": "high", // high, medium, low
      "estimated_proficiency_needed": 60 // 0-100
    }
  ],
  "complexity_level": 3 // 1-5
}

Chỉ trả về JSON, không thêm text.`;

    try {
      const response = await groq.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });

      let raw = response.choices[0].message.content.trim();
      raw = raw.replace(/```json|```/g, '').trim();

      const result = JSON.parse(raw);
      return result.required_skills || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get user workload metrics
   * @param {String} userId - User ID
   * @param {String} boardId - Board ID
   * @returns {Promise<Object>} Workload metrics
   */
  async getUserWorkload(userId, boardId) {
    const now = new Date();

    // Get done column
    const doneColumn = await Column.findOne({ board_id: boardId, isDone: true });
    const doneColumnId = doneColumn?._id;

    // Get all assigned tasks (excluding done)
    const assignedTasks = await Task.find({
      assigned_to: userId,
      board_id: boardId,
      deleted_at: null,
      ...(doneColumnId ? { column_id: { $ne: doneColumnId } } : {}),
    }).lean();

    // Calculate workload metrics
    const totalTasks = assignedTasks.length;
    const totalEstimateHours = assignedTasks.reduce(
      (sum, task) => sum + (task.estimate_hours || 0),
      0
    );

    // Count overdue tasks
    const overdueTasks = assignedTasks.filter(
      task => task.due_date && new Date(task.due_date) < now
    ).length;

    // Calculate average tasks per user in board (for normalization)
    const boardMembers = await BoardMember.find({ board_id: boardId });
    const allTasks = await Task.find({
      board_id: boardId,
      deleted_at: null,
      assigned_to: { $ne: null },
      ...(doneColumnId ? { column_id: { $ne: doneColumnId } } : {}),
    }).lean();

    const avgTasksPerUser = boardMembers.length > 0 ? allTasks.length / boardMembers.length : 1;

    // Normalize workload (0-1, where 1 = very high workload)
    const workloadScore = Math.min(totalTasks / (avgTasksPerUser * 2), 1);

    return {
      totalTasks,
      totalEstimateHours,
      overdueTasks,
      workloadScore,
      avgTasksPerUser,
    };
  }

  /**
   * Get user performance history
   * @param {String} userId - User ID
   * @param {String} boardId - Board ID
   * @returns {Promise<Object>} Performance metrics
   */
  async getUserPerformance(userId, boardId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get done column
    const doneColumn = await Column.findOne({ board_id: boardId, isDone: true });
    const doneColumnId = doneColumn?._id;

    if (!doneColumnId) {
      return {
        completionRate: 0.5,
        onTimeRate: 0.5,
        avgCompletionTime: 0,
        totalCompleted: 0,
        performanceScore: 0.5,
      };
    }

    // Get all user tasks (completed and in-progress)
    const allUserTasks = await Task.find({
      assigned_to: userId,
      board_id: boardId,
      deleted_at: null,
      created_at: { $gte: thirtyDaysAgo },
    }).lean();

    // Completed tasks
    const doneColumnIdStr = doneColumnId.toString();
    const completedTasks = allUserTasks.filter(task => {
      if (task.done_at) return true;
      const taskColumnId = task.column_id?._id?.toString() || task.column_id?.toString();
      return taskColumnId === doneColumnIdStr;
    });

    // Calculate completion rate
    const totalTasks = allUserTasks.length;
    const completionRate = totalTasks > 0 ? completedTasks.length / totalTasks : 0.5;

    // Calculate on-time delivery rate
    const onTimeTasks = completedTasks.filter(task => {
      if (!task.due_date) return true; // No deadline = on time
      const completedDate = task.done_at || task.updated_at;
      return completedDate && new Date(completedDate) <= new Date(task.due_date);
    });
    const onTimeRate = completedTasks.length > 0 ? onTimeTasks.length / completedTasks.length : 0.5;

    // Calculate average completion time (in hours)
    let avgCompletionTime = 0;
    if (completedTasks.length > 0) {
      const completionTimes = completedTasks
        .filter(task => task.created_at && (task.done_at || task.updated_at))
        .map(task => {
          const created = new Date(task.created_at);
          const completed = new Date(task.done_at || task.updated_at);
          return (completed - created) / (1000 * 60 * 60); // hours
        })
        .filter(time => time > 0 && time < 720); // Filter outliers (< 30 days)

      if (completionTimes.length > 0) {
        avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
      }
    }

    // Normalize performance score (0-1, where 1 = excellent)
    // Higher completion rate, higher on-time rate, lower completion time = better
    const performanceScore = Math.min(
      completionRate * 0.4 + onTimeRate * 0.4 + (1 - Math.min(avgCompletionTime / 48, 1)) * 0.2,
      1
    );

    return {
      completionRate,
      onTimeRate,
      avgCompletionTime,
      totalCompleted: completedTasks.length,
      performanceScore,
    };
  }

  /**
   * Analyze task complexity and skills using AI
   * @param {Object} task
   * @returns {Promise<{required_skills: Array, complexity_level: number|null}>}
   */
  async analyzeTaskComplexity(task) {
    const taskInfo = {
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || '',
      estimate_hours: task.estimate_hours || 0,
    };

    const taskTags = await TaskTag.find({ task_id: task._id }).populate('tag_id', 'name').lean();
    if (taskTags && taskTags.length > 0) {
      taskInfo.tags = taskTags.map(tt => tt.tag_id?.name).filter(Boolean);
    }

    const prompt = `Phân tích độ phức tạp của task và kỹ năng cần thiết.

Task:
${JSON.stringify(taskInfo, null, 2)}

Trả về JSON:
{
  "required_skills": [
    {
      "name": "React",
      "importance": "high",
      "estimated_proficiency_needed": 70
    }
  ],
  "complexity_level": 3
}

Chỉ trả về JSON.`;

    try {
      const response = await groq.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });

      let raw = response.choices[0].message.content.trim();
      raw = raw.replace(/```json|```/g, '').trim();
      const result = JSON.parse(raw);

      return {
        required_skills: Array.isArray(result.required_skills) ? result.required_skills : [],
        complexity_level:
          typeof result.complexity_level === 'number' ? result.complexity_level : null,
      };
    } catch (error) {
      return { required_skills: [], complexity_level: null };
    }
  }

  /**
   * Calculate skill match score
   * @param {String} userId - User ID
   * @param {String} centerId - Center ID
   * @param {Array} requiredSkills - Array of required skills from AI
   * @returns {Promise<Object>} Skill match metrics
   */
  async calculateSkillMatch(userId, centerId, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) {
      return {
        matchScore: 0.5, // Neutral score if no skills specified
        matchedSkills: [],
        missingSkills: [],
      };
    }

    // Get all user skills
    const userSkills = await UserSkill.find({
      user_id: userId,
      center_id: centerId,
      deleted_at: null,
    })
      .populate('skill_id', 'name category')
      .lean();

    // Create skill name map for quick lookup
    const userSkillMap = new Map();
    userSkills.forEach(us => {
      const skillName = us.skill_id?.name?.toLowerCase() || '';
      if (skillName) {
        userSkillMap.set(skillName, {
          proficiency: us.proficiency_level || 0,
          confidence: us.confidence_score || 0,
        });
      }
    });

    // Match required skills with user skills
    const matchedSkills = [];
    const missingSkills = [];
    let totalMatchScore = 0;
    let totalWeight = 0;

    for (const reqSkill of requiredSkills) {
      const skillName = reqSkill.name?.toLowerCase() || '';
      const importance = reqSkill.importance || 'medium';
      const requiredProficiency = reqSkill.estimated_proficiency_needed || 50;

      // Calculate weight based on importance
      const weight = importance === 'high' ? 3 : importance === 'medium' ? 2 : 1;
      totalWeight += weight;

      // Try to find matching skill (exact or partial match)
      let matched = false;
      let matchProficiency = 0;

      // Exact match
      if (userSkillMap.has(skillName)) {
        const userSkill = userSkillMap.get(skillName);
        matchProficiency = userSkill.proficiency;
        matched = true;
      } else {
        // Partial match - check if any user skill contains the required skill name
        for (const [userSkillName, userSkill] of userSkillMap.entries()) {
          if (userSkillName.includes(skillName) || skillName.includes(userSkillName)) {
            matchProficiency = userSkill.proficiency;
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        // Calculate match quality (0-1)
        const proficiencyMatch = Math.min(matchProficiency / Math.max(requiredProficiency, 1), 1);
        const skillScore = proficiencyMatch * weight;
        totalMatchScore += skillScore;

        matchedSkills.push({
          name: reqSkill.name,
          required_proficiency: requiredProficiency,
          user_proficiency: matchProficiency,
          match_quality: proficiencyMatch,
          importance,
        });
      } else {
        missingSkills.push({
          name: reqSkill.name,
          required_proficiency: requiredProficiency,
          importance,
        });
        // Penalty for missing skills
        totalMatchScore += 0;
      }
    }

    // Normalize score (0-1)
    const matchScore = totalWeight > 0 ? totalMatchScore / totalWeight : 0.5;

    return {
      matchScore,
      matchedSkills,
      missingSkills,
    };
  }

  /**
   * Get user center ID from board members
   * @param {String} boardId - Board ID
   * @returns {Promise<String|null>} Center ID
   */
  async getBoardCenterId(boardId) {
    // Get center_id from first board member
    const boardMembers = await BoardMember.find({ board_id: boardId })
      .populate('user_id', 'center_id')
      .limit(1)
      .lean();

    if (boardMembers.length > 0 && boardMembers[0]?.user_id?.center_id) {
      return boardMembers[0].user_id.center_id.toString();
    }
    return null;
  }

  /**
   * Get historical cycle time (median hours) for a board or a specific user
   */
  async getHistoricalCycleTime(boardId, userId = null, days = 60) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const doneColumn = await Column.findOne({ board_id: boardId, isDone: true });
    if (!doneColumn) return null;

    const query = {
      board_id: boardId,
      deleted_at: null,
      done_at: { $ne: null, $gte: since },
      column_id: doneColumn._id,
    };

    if (userId) {
      query.assigned_to = userId;
    }

    const tasks = await Task.find(query).select('created_at done_at estimate_hours').lean();
    if (!tasks || tasks.length === 0) return null;

    const durations = tasks
      .map(t => {
        if (!t.done_at || !t.created_at) return null;
        const hours = (new Date(t.done_at) - new Date(t.created_at)) / (1000 * 60 * 60);
        return hours > 0 && hours < 24 * 60 ? hours : null; // cap 60 days
      })
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (durations.length === 0) return null;

    const mid = Math.floor(durations.length / 2);
    return durations.length % 2 !== 0 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2;
  }

  /**
   * Holiday set (VN + weekends handled elsewhere)
   */
  getHolidaySet() {
    const base = [
      '2024-01-01',
      '2024-02-10',
      '2024-02-11',
      '2024-02-12',
      '2024-02-13',
      '2024-02-14',
      '2024-04-18',
      '2024-04-30',
      '2024-05-01',
      '2024-09-02',
      '2025-01-01',
      '2025-01-29',
      '2025-01-30',
      '2025-01-31',
      '2025-02-01',
      '2025-02-02',
      '2025-04-18',
      '2025-04-30',
      '2025-05-01',
      '2025-09-02',
    ];
    return new Set(base);
  }

  /**
   * Add working days while skipping weekends, holidays, and user leaves
   */
  async addWorkingDays(startDate, requiredWorkingDays, userId = null, boardId = null) {
    const holidays = this.getHolidaySet();

    const leaveRanges =
      userId && boardId
        ? await UserLeave.find({
            user_id: userId,
            $or: [{ board_id }, { board_id: null }],
            leave_end: { $gte: startDate },
          })
            .select('leave_start leave_end')
            .lean()
        : [];

    const isOnLeave = date => {
      if (!leaveRanges.length) return false;
      return leaveRanges.some(
        lr => date >= new Date(lr.leave_start) && date <= new Date(lr.leave_end)
      );
    };

    let daysAdded = 0;
    let current = new Date(startDate);

    while (daysAdded < requiredWorkingDays) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      const yyyyMMdd = current.toISOString().slice(0, 10);

      const isWeekend = day === 0 || day === 6;
      const isHoliday = holidays.has(yyyyMMdd);

      if (isWeekend || isHoliday || isOnLeave(current)) {
        continue;
      }

      daysAdded += 1;
    }

    return current;
  }

  /**
   * Suggest best users for task assignment
   * @param {String} taskId - Task ID
   * @param {String} boardId - Board ID
   * @param {Number} limit - Number of suggestions (default: 5)
   * @returns {Promise<Object>} Suggestions with ranked users
   */
  async suggestAssignments(taskId, boardId, limit = 5) {
    try {
      // 1. Get task
      const task = await Task.findById(taskId).lean();
      if (!task) {
        throw new Error('Task không tồn tại');
      }

      if (task.board_id?.toString() !== boardId) {
        throw new Error('Task không thuộc board này');
      }

      // 2. Extract required skills from task
      const requiredSkills = await this.extractRequiredSkills(task);

      // 3. Get board members
      const boardMembers = await BoardMember.find({
        board_id: boardId,
      })
        .populate('user_id', 'full_name username email center_id')
        .lean();

      if (boardMembers.length === 0) {
        return {
          task_id: taskId,
          required_skills: requiredSkills,
          suggestions: [],
          message: 'Không có thành viên nào trong board',
        };
      }

      // 4. Get center ID (assuming all members are from same center)
      const centerId = boardMembers[0]?.user_id?.center_id
        ? boardMembers[0].user_id.center_id.toString()
        : await this.getBoardCenterId(boardId);

      if (!centerId) {
        return {
          task_id: taskId,
          required_skills: requiredSkills,
          suggestions: [],
          message: 'Không tìm thấy center_id',
        };
      }

      // 5. Calculate scores for each member
      const userScores = [];

      for (const member of boardMembers) {
        const userId = member.user_id?._id || member.user_id;
        if (!userId) continue;

        const userIdStr = userId.toString();

        // Skip if task is already assigned to this user
        if (task.assigned_to?.toString() === userIdStr) {
          continue;
        }

        // Get user profile data
        const [skillMatch, workload, performance] = await Promise.all([
          this.calculateSkillMatch(userIdStr, centerId, requiredSkills),
          this.getUserWorkload(userIdStr, boardId),
          this.getUserPerformance(userIdStr, boardId),
        ]);

        // Calculate final score
        const finalScore =
          skillMatch.matchScore * this.weights.skillMatch +
          (1 - workload.workloadScore) * this.weights.workload + // Lower workload = higher score
          performance.performanceScore * this.weights.performance;

        userScores.push({
          user_id: userIdStr,
          user_info: {
            full_name: member.user_id?.full_name || '',
            username: member.user_id?.username || '',
            email: member.user_id?.email || '',
          },
          scores: {
            final: finalScore,
            skill_match: skillMatch.matchScore,
            workload: 1 - workload.workloadScore, // Invert for display (higher = better)
            performance: performance.performanceScore,
          },
          details: {
            skill_match: skillMatch,
            workload: workload,
            performance: performance,
          },
          recommendation_reason: this.generateRecommendationReason(
            skillMatch,
            workload,
            performance,
            requiredSkills
          ),
        });
      }

      // 6. Sort by final score (descending)
      userScores.sort((a, b) => b.scores.final - a.scores.final);

      // 7. Return top suggestions
      const suggestions = userScores.slice(0, limit).map((item, index) => ({
        rank: index + 1,
        ...item,
      }));

      return {
        task_id: taskId,
        task_title: task.title,
        required_skills: requiredSkills,
        suggestions,
        algorithm_weights: this.weights,
        total_candidates: userScores.length,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate human-readable recommendation reason
   */
  generateRecommendationReason(skillMatch, workload, performance, requiredSkills) {
    const reasons = [];

    if (skillMatch.matchScore > 0.7) {
      reasons.push(
        `Có ${skillMatch.matchedSkills.length}/${requiredSkills.length} kỹ năng phù hợp với mức độ cao`
      );
    } else if (skillMatch.matchScore > 0.4) {
      reasons.push(
        `Có một số kỹ năng phù hợp (${skillMatch.matchedSkills.length}/${requiredSkills.length})`
      );
    } else if (requiredSkills.length > 0) {
      reasons.push('Thiếu một số kỹ năng cần thiết');
    }

    if (workload.workloadScore < 0.3) {
      reasons.push('Có khả năng sẵn sàng nhận thêm task');
    } else if (workload.workloadScore > 0.7) {
      reasons.push('Đang có workload cao, cần cân nhắc');
    }

    if (performance.performanceScore > 0.7) {
      reasons.push('Có hiệu suất làm việc tốt trong 30 ngày qua');
    }

    return reasons.length > 0 ? reasons.join('. ') : 'Phù hợp dựa trên nhiều yếu tố';
  }

  /**
   * Auto-assign task to best matching user
   * @param {String} taskId - Task ID
   * @param {String} boardId - Board ID
   * @returns {Promise<Object>} Assignment result
   */
  async autoAssignTask(taskId, boardId) {
    try {
      const suggestions = await this.suggestAssignments(taskId, boardId, 1);

      if (!suggestions.suggestions || suggestions.suggestions.length === 0) {
        throw new Error('Không tìm thấy người phù hợp để assign');
      }

      const bestMatch = suggestions.suggestions[0];
      const userId = bestMatch.user_id;

      // Update task assignment
      const task = await Task.findByIdAndUpdate(
        taskId,
        { assigned_to: userId },
        { new: true }
      ).lean();

      return {
        success: true,
        task_id: taskId,
        assigned_to: userId,
        assigned_user: bestMatch.user_info,
        match_score: bestMatch.scores.final,
        recommendation_reason: bestMatch.recommendation_reason,
        suggestions_data: suggestions,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Suggest due date based on complexity, capacity, and history
   */
  async suggestDueDate(taskId, boardId) {
    const task = await Task.findById(taskId).lean();
    if (!task) throw new Error('Task không tồn tại');
    if (task.board_id?.toString() !== boardId) throw new Error('Task không thuộc board này');

    const assignedUserId = task.assigned_to ? task.assigned_to.toString() : null;
    const startDate = task.start_date ? new Date(task.start_date) : new Date();

    // 1) Analyze complexity & skills
    const complexityResult = await this.analyzeTaskComplexity(task);
    const requiredSkills = complexityResult.required_skills || [];
    const complexityLevel = complexityResult.complexity_level || 3;

    // 2) Historical cycle time (prefer per-user, fallback board)
    const historicalUser = assignedUserId
      ? await this.getHistoricalCycleTime(boardId, assignedUserId, 90)
      : null;
    const historicalBoard = await this.getHistoricalCycleTime(boardId, null, 90);
    const historicalCycleHours = historicalUser || historicalBoard || null;

    // 3) Base hours from estimate or complexity
    const complexityHoursMap = { 1: 4, 2: 8, 3: 16, 4: 24, 5: 40 };
    const complexityHours = complexityHoursMap[complexityLevel] || 16;
    const estimateHours = task.estimate_hours || null;
    const baseHours =
      Math.max(estimateHours || 0, complexityHours, historicalCycleHours || 0) || 12;

    // 4) Capacity factors
    let workloadScore = 0.5;
    let performanceScore = 0.5;
    if (assignedUserId) {
      const [workload, performance] = await Promise.all([
        this.getUserWorkload(assignedUserId, boardId),
        this.getUserPerformance(assignedUserId, boardId),
      ]);
      workloadScore = workload.workloadScore ?? 0.5;
      performanceScore = performance.performanceScore ?? 0.5;
    }

    // More workload -> more buffer; better performance -> less buffer
    const capacityMultiplier = 1 + workloadScore * 0.4 - (performanceScore - 0.5) * 0.2;
    const adjustedHours = baseHours * Math.max(capacityMultiplier, 0.7);

    // 5) Convert to working days (6h/day)
    const hoursPerDay = 6;
    const requiredWorkingDays = Math.ceil(adjustedHours / hoursPerDay);

    // 6) Add buffer for uncertainty
    const bufferDays = Math.max(1, Math.ceil(requiredWorkingDays * 0.2));
    const totalWorkingDays = requiredWorkingDays + bufferDays;

    // 7) Compute due date skipping weekends/holidays/leaves
    const dueDate = await this.addWorkingDays(startDate, totalWorkingDays, assignedUserId, boardId);

    return {
      task_id: taskId,
      board_id: boardId,
      assigned_to: assignedUserId,
      recommended_due_date: dueDate,
      base_hours: baseHours,
      adjusted_hours: adjustedHours,
      required_working_days: requiredWorkingDays,
      buffer_days: bufferDays,
      complexity_level: complexityLevel,
      historical_cycle_hours: historicalCycleHours,
      workload_score: workloadScore,
      performance_score: performanceScore,
      required_skills: requiredSkills,
    };
  }

  /**
   * Suggest tags for a task using AI (classification)
   */
  async suggestTags(taskId, boardId, limit = 5) {
    const task = await Task.findById(taskId).lean();
    if (!task) throw new Error('Task không tồn tại');
    if (task.board_id?.toString() !== boardId) throw new Error('Task không thuộc board này');

    const boardTags = await Tag.find({ board_id: boardId, deleted_at: null })
      .select('name category')
      .lean();

    const prompt = `Bạn là model gợi ý tag cho task.
Phân tích title, description để đề xuất tag và category phù hợp.
Ưu tiên dùng các tag có sẵn trong board nếu khớp ngữ nghĩa.

Task:
Title: ${task.title || ''}
Description: ${task.description || ''}
Priority: ${task.priority || 'N/A'}

Tags hiện có trong board:
${boardTags.map(t => `- ${t.name}${t.category ? ` (category: ${t.category})` : ''}`).join('\n') || 'Chưa có'}

Trả về JSON:
{
  "suggestions": [
    {
      "name": "Frontend",
      "category": "UI",
      "confidence": 0.82
    }
  ]
}

Chỉ trả về JSON, tối đa ${limit} suggestions.`;

    const response = await groq.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    let raw = response.choices[0].message.content.trim();
    raw = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);

    const suggestions = Array.isArray(result.suggestions) ? result.suggestions.slice(0, limit) : [];

    return {
      task_id: taskId,
      board_id: boardId,
      suggestions,
      existing_tags: boardTags,
    };
  }

  /**
   * Auto-apply suggested tags to a task (non-destructive; keeps existing tags)
   */
  async autoApplyTags(taskId, boardId, limit = 5) {
    const suggestionResult = await this.suggestTags(taskId, boardId, limit);
    const suggestions = suggestionResult.suggestions || [];
    if (suggestions.length === 0) {
      return { ...suggestionResult, applied: [] };
    }

    const applied = [];
    for (const s of suggestions) {
      const name = (s.name || '').trim();
      if (!name) continue;

      let tag = await Tag.findOne({ board_id: boardId, name, deleted_at: null });
      if (!tag) {
        tag = await Tag.create({
          name,
          board_id: boardId,
          category: s.category || null,
          color: '#007bff',
        });
      } else if (s.category && !tag.category) {
        tag.category = s.category;
        await tag.save();
      }

      const exists = await TaskTag.findOne({ task_id: taskId, tag_id: tag._id });
      if (!exists) {
        await TaskTag.create({ task_id: taskId, tag_id: tag._id });
      }

      applied.push({
        tag_id: tag._id,
        name: tag.name,
        category: tag.category || null,
      });
    }

    return {
      ...suggestionResult,
      applied,
    };
  }
}

module.exports = new TaskMatchingAIService();

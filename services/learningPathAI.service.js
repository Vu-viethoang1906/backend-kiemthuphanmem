const groq = require('../config/groq');

class LearningPathAIService {
  constructor() {
    this.model = process.env.AI_MODEL_NAME || 'llama-3.1-8b-instant';
  }

  async extractSkillsFromTasks(tasks) {
    if (!tasks || tasks.length === 0) {
      return { skills: [], confidence: 0 };
    }

    const tasksData = tasks.map((t) => ({
      title: t.title,
      description: t.description || '',
      tags: t.tags || [],
    }));

    const prompt = `Phân tích các tasks đã hoàn thành và trích xuất kỹ năng (skills) mà user đã học được.

Tasks:
${JSON.stringify(tasksData, null, 2)}

Trả về JSON với format:
{
  "skills": [
    {
      "name": "JavaScript",
      "category": "Frontend",
      "proficiency_level": 60,
      "confidence": 80,
      "evidence": ["Task 1", "Task 2"]
    }
  ],
  "overall_confidence": 75
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

      return JSON.parse(raw);
    } catch (error) {
      return { skills: [], confidence: 0, error: error.message };
    }
  }

  async analyzeSkillGaps(userSkills, targetSkills) {
    const userSkillNames = userSkills.map((s) => s.name || s.skill_id?.name).filter(Boolean);
    const targetSkillNames = targetSkills.map((s) => s.name).filter(Boolean);

    const prompt = `Phân tích khoảng trống kỹ năng (skill gaps).

Kỹ năng hiện có của user:
${JSON.stringify(userSkillNames, null, 2)}

Kỹ năng mục tiêu (target skills):
${JSON.stringify(targetSkillNames, null, 2)}

Trả về JSON:
{
  "missing_skills": ["Skill 1", "Skill 2"],
  "weak_skills": [{"name": "Skill", "current_level": 30, "target_level": 70}],
  "recommendations": [
    {
      "skill_name": "React",
      "priority": 9,
      "reason": "Cần thiết cho Frontend development",
      "prerequisites_met": true
    }
  ]
}`;

    try {
      const response = await groq.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      let raw = response.choices[0].message.content.trim();
      raw = raw.replace(/```json|```/g, '').trim();

      return JSON.parse(raw);
    } catch (error) {
      return { missing_skills: [], weak_skills: [], recommendations: [] };
    }
  }

  async generateLearningPath(userSkills, skillGaps, userProfile = {}) {
    const prompt = `Tạo lộ trình học tập cá nhân hóa (learning path) dựa trên:

Kỹ năng hiện có:
${JSON.stringify(userSkills.map((s) => ({ name: s.name || s.skill_id?.name, level: s.proficiency_level })), null, 2)}

Khoảng trống kỹ năng:
${JSON.stringify(skillGaps, null, 2)}

Trả về JSON với learning path có stages:
{
  "path_name": "Full-stack Developer Path",
  "stages": [
    {
      "stage_number": 1,
      "title": "Foundation",
      "description": "Học các kỹ năng cơ bản",
      "skills": ["JavaScript", "HTML", "CSS"],
      "difficulty_level": 1,
      "estimated_duration_days": 30
    }
  ]
}

Sắp xếp stages theo độ khó tăng dần. Chỉ trả về JSON.`;

    try {
      const response = await groq.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      });

      let raw = response.choices[0].message.content.trim();
      raw = raw.replace(/```json|```/g, '').trim();

      return JSON.parse(raw);
    } catch (error) {
      return {
        path_name: 'Learning Path',
        stages: [],
        error: error.message,
      };
    }
  }

  async recommendNextSkills(userSkills, completedTasks, limit = 5, availableSkills = []) {
    const userSkillSummary = userSkills.map((s) => ({
      name: s.name || s.skill_id?.name,
      proficiency: s.proficiency_level || 0,
    }));

    const availableSkillNames = availableSkills.map((s) => s.name).filter(Boolean);

    const prompt = `Đề xuất kỹ năng tiếp theo nên học dựa trên:

Kỹ năng hiện có của user:
${userSkillSummary.length > 0 ? JSON.stringify(userSkillSummary, null, 2) : 'Chưa có kỹ năng nào'}

Tasks đã hoàn thành: ${completedTasks} tasks

${availableSkillNames.length > 0 ? `Kỹ năng có sẵn trong hệ thống (chỉ đề xuất từ danh sách này):
${JSON.stringify(availableSkillNames.slice(0, 50), null, 2)}` : ''}

Trả về JSON:
{
  "recommendations": [
    {
      "skill_name": "React",
      "recommendation_type": "next_skill",
      "priority": 9,
      "reason": "Logic tiếp theo sau JavaScript",
      "confidence_score": 85,
      "prerequisites_met": true,
      "estimated_difficulty": 3
    }
  ]
}

${availableSkillNames.length > 0 ? 'CHỈ đề xuất skills có trong danh sách "Kỹ năng có sẵn trong hệ thống" ở trên.' : 'Đề xuất các kỹ năng phổ biến và phù hợp.'}
Chỉ trả về JSON, tối đa ${limit} recommendations.`;

    try {
      const response = await groq.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      let raw = response.choices[0].message.content.trim();
      raw = raw.replace(/```json|```/g, '').trim();

      const result = JSON.parse(raw);
      if (result.recommendations && result.recommendations.length > limit) {
        result.recommendations = result.recommendations.slice(0, limit);
      }

      return result;
    } catch (error) {
      return { recommendations: [] };
    }
  }
}

module.exports = new LearningPathAIService();


const groq = require('../config/groq');


class AdaptiveGamificationAIService {
  constructor() {
    this.defaultModel = process.env.AI_MODEL_NAME || 'llama-3.1-8b-instant';
    this.fastModel = process.env.AI_FAST_MODEL || process.env.AI_MODEL_NAME || 'llama-3.1-8b-instant';
  }

  /**
   * Phân tích hành vi người dùng và tạo Motivation Profile
   * @param {Object} behaviorData - Dữ liệu hành vi 30 ngày
   * @returns {Promise<Object>} Motivation Profile với scores
   */
  async analyzeBehaviorPatterns(behaviorData) {
    const apiKey = process.env.AI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      return {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 0,
        insights: ['AI_API_KEY chưa được cấu hình. Vui lòng thêm vào file .env'],
        recommendations: ['Cần cấu hình AI_API_KEY để sử dụng tính năng AI phân tích'],
        error: 'AI_API_KEY chưa được cấu hình trong file .env',
      };
    }

    const {
      leaderboard_views = 0,
      leaderboard_positions_focused = [],
      points_interactions = 0,
      points_value_changes = [],
      task_completions = 0,
      task_completion_times = [],
      collaboration_events = 0,
      team_task_count = 0,
      daily_activity = [],
      weekly_goals_achieved = 0,
      monthly_goals_achieved = 0,
      badge_reactions = [],
      notification_clicks = 0,
    } = behaviorData;

    const prompt = `
Bạn là chuyên gia phân tích hành vi người dùng trong hệ thống gamification học tập.
Nhiệm vụ: Phân tích dữ liệu hành vi và xác định Motivation Profile (0-100 điểm cho mỗi dimension).

Dữ liệu hành vi (30 ngày):
- Xem leaderboard: ${leaderboard_views} lần
- Vị trí quan tâm trên leaderboard: ${JSON.stringify(leaderboard_positions_focused)}
- Tương tác với points: ${points_interactions} lần
- Thay đổi điểm: ${JSON.stringify(points_value_changes)}
- Hoàn thành task: ${task_completions} tasks
- Thời gian hoàn thành: ${JSON.stringify(task_completion_times)}
- Sự kiện cộng tác: ${collaboration_events} lần
- Task nhóm: ${team_task_count} tasks
- Hoạt động hàng ngày: ${JSON.stringify(daily_activity)}
- Mục tiêu tuần đạt được: ${weekly_goals_achieved}
- Mục tiêu tháng đạt được: ${monthly_goals_achieved}
- Phản ứng với badges: ${JSON.stringify(badge_reactions)}
- Click notification: ${notification_clicks} lần

Phân tích và tính điểm (0-100) cho 4 dimensions:

1. **Competitive Score (Cạnh tranh)**: 
   - Cao nếu: Xem leaderboard nhiều, quan tâm top positions, phản ứng tích cực với ranking
   - Thấp nếu: Ít xem leaderboard, không quan tâm ranking

2. **Collaborative Score (Cộng tác)**:
   - Cao nếu: Nhiều collaboration events, nhiều team tasks, phản ứng tích cực với team achievements
   - Thấp nếu: Chủ yếu làm việc cá nhân

3. **Short-term Score (Mục tiêu ngắn hạn)**:
   - Cao nếu: Hoạt động đều đặn hàng ngày, phản ứng nhanh với rewards, daily goals cao
   - Thấp nếu: Hoạt động không đều, ít quan tâm daily progress

4. **Long-term Score (Mục tiêu dài hạn)**:
   - Cao nếu: Weekly/monthly goals cao, theo dõi progress dài hạn, milestone-focused
   - Thấp nếu: Chỉ quan tâm daily, không có mục tiêu dài hạn

5. **Confidence Score**: Độ tin cậy của phân tích (dựa trên số lượng dữ liệu)
   - 0-30: Ít dữ liệu (< 10 events)
   - 31-60: Dữ liệu trung bình (10-30 events)
   - 61-100: Dữ liệu đầy đủ (> 30 events)

Bạn CHỈ trả về JSON duy nhất, không thêm text, không giải thích:

{
  "competitive_score": 0-100,
  "collaborative_score": 0-100,
  "short_term_score": 0-100,
  "long_term_score": 0-100,
  "confidence": 0-100,
  "insights": [
    "insight 1 về competitive",
    "insight 2 về collaborative",
    "insight 3 về short-term",
    "insight 4 về long-term"
  ],
  "recommendations": [
    "recommendation 1",
    "recommendation 2"
  ]
}
`;

    try {
      const apiKey = process.env.AI_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('AI_API_KEY chưa được cấu hình trong .env');
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'Bạn là chuyên gia phân tích hành vi gamification. Luôn trả về JSON hợp lệ, không thêm text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: this.defaultModel,
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const result = JSON.parse(responseText);

      // Validate và normalize scores
      return {
        competitive_score: Math.max(0, Math.min(100, result.competitive_score || 50)),
        collaborative_score: Math.max(0, Math.min(100, result.collaborative_score || 50)),
        short_term_score: Math.max(0, Math.min(100, result.short_term_score || 50)),
        long_term_score: Math.max(0, Math.min(100, result.long_term_score || 50)),
        confidence: Math.max(0, Math.min(100, result.confidence || 0)),
        insights: result.insights || [],
        recommendations: result.recommendations || [],
      };
    } catch (error) {
      console.error('❌ Lỗi Groq AI analyzeBehaviorPatterns:', error);
      
      let errorMessage = error.message;
      if (error.message?.includes('Invalid API Key') || error.message?.includes('invalid_api_key')) {
        errorMessage = 'AI_API_KEY không hợp lệ. Vui lòng kiểm tra lại trong file .env';
      } else if (error.message?.includes('chưa được cấu hình')) {
        errorMessage = 'AI_API_KEY chưa được cấu hình trong file .env';
      }

      return {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 0,
        insights: ['Không đủ dữ liệu để phân tích'],
        recommendations: ['Cần thu thập thêm dữ liệu hành vi'],
        error: errorMessage,
      };
    }
  }

  /**
   * Phân tích sentiment từ text (comments, feedback)
   * @param {string} text - Text cần phân tích
   * @returns {Promise<Object>} Sentiment analysis result
   */
  async analyzeSentiment(text) {
    if (!text || text.trim().length === 0) {
      return {
        sentiment: 'neutral',
        score: 50,
        motivation_indicators: {},
        suggested_adjustments: [],
      };
    }

    const prompt = `
Phân tích sentiment và motivation indicators từ text sau:

"${text}"

Xác định:
1. Sentiment: "positive" | "neutral" | "negative" (score 0-100)
2. Motivation indicators:
   - competitive: có đề cập đến ranking, so sánh, cạnh tranh?
   - collaborative: có đề cập đến team, giúp đỡ, cộng tác?
   - achievement: có đề cập đến thành tích, mục tiêu?
   - feedback: có phản hồi về gamification elements?

Trả về JSON:
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": 0-100,
  "motivation_indicators": {
    "competitive": true/false,
    "collaborative": true/false,
    "achievement": true/false,
    "feedback": true/false
  },
  "suggested_adjustments": ["adjustment 1", "adjustment 2"]
}
`;

    try {
      const apiKey = process.env.AI_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('AI_API_KEY chưa được cấu hình trong .env');
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên gia phân tích sentiment. Trả về JSON hợp lệ.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: this.fastModel,
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(responseText);
    } catch (error) {
      console.error('❌ Lỗi Groq AI analyzeSentiment:', error);
      return {
        sentiment: 'neutral',
        score: 50,
        motivation_indicators: {},
        suggested_adjustments: [],
        error: error.message,
      };
    }
  }

  /**
   * Đề xuất cá nhân hóa gamification dựa trên Motivation Profile
   * @param {Object} motivationProfile - Motivation profile hiện tại
   * @param {Object} currentConfig - Cấu hình gamification hiện tại
   * @returns {Promise<Object>} Personalized recommendations
   */
  async generatePersonalization(motivationProfile, currentConfig = {}) {
    const apiKey = process.env.AI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      const {
        competitive_score = 50,
        collaborative_score = 50,
        short_term_score = 50,
        long_term_score = 50,
      } = motivationProfile;

      return {
        leaderboard_weight: competitive_score > 70 ? 0.8 : 0.5,
        badges_weight: collaborative_score > 70 || competitive_score > 70 ? 0.7 : 0.5,
        points_weight: 1.0,
        goals_weight: short_term_score > 70 || long_term_score > 70 ? 0.7 : 0.5,
        recommended_badge_categories: [
          ...(competitive_score > 70 ? ['competitive'] : []),
          ...(collaborative_score > 70 ? ['collaborative'] : []),
          ...(short_term_score > 70 ? ['achievement'] : []),
        ],
        reward_multipliers: {
          competitive: competitive_score > 70 ? 1.2 : 1.0,
          collaborative: collaborative_score > 70 ? 1.2 : 1.0,
          short_term: short_term_score > 70 ? 1.1 : 1.0,
          long_term: long_term_score > 70 ? 1.1 : 1.0,
        },
        personalized_messages: [],
        error: 'AI_API_KEY chưa được cấu hình. Đang dùng logic fallback đơn giản.',
      };
    }

    const {
      competitive_score = 50,
      collaborative_score = 50,
      short_term_score = 50,
      long_term_score = 50,
    } = motivationProfile;

    const prompt = `
Dựa trên Motivation Profile của user, đề xuất điều chỉnh gamification elements:

Motivation Profile:
- Competitive: ${competitive_score}/100
- Collaborative: ${collaborative_score}/100
- Short-term: ${short_term_score}/100
- Long-term: ${long_term_score}/100

Cấu hình hiện tại:
${JSON.stringify(currentConfig, null, 2)}

Đề xuất:
1. **Weights** (0-1) cho mỗi element:
   - leaderboard_weight: Cao nếu competitive > 70
   - badges_weight: Cao nếu collaborative > 70 hoặc competitive > 70
   - points_weight: Luôn cao (base element)
   - goals_weight: Cao nếu short_term > 70 hoặc long_term > 70

2. **Recommended badges** categories:
   - Nếu competitive cao → badges cạnh tranh (Top 10, First Place)
   - Nếu collaborative cao → badges cộng tác (Team Player, Helper)
   - Nếu short_term cao → daily badges, streaks
   - Nếu long_term cao → milestone badges

3. **Reward multipliers**:
   - Điều chỉnh điểm thưởng dựa trên profile

Trả về JSON:
{
  "leaderboard_weight": 0-1,
  "badges_weight": 0-1,
  "points_weight": 0-1,
  "goals_weight": 0-1,
  "recommended_badge_categories": ["category1", "category2"],
  "reward_multipliers": {
    "competitive": 1.0-2.0,
    "collaborative": 1.0-2.0,
    "short_term": 1.0-2.0,
    "long_term": 1.0-2.0
  },
  "personalized_messages": ["message1", "message2"]
}
`;

    try {
      const apiKey = process.env.AI_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('AI_API_KEY chưa được cấu hình trong .env');
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên gia gamification personalization. Trả về JSON hợp lệ.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: this.defaultModel,
        temperature: 0.4,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const result = JSON.parse(responseText);

      // Normalize weights
      return {
        leaderboard_weight: Math.max(0, Math.min(1, result.leaderboard_weight || 0.5)),
        badges_weight: Math.max(0, Math.min(1, result.badges_weight || 0.5)),
        points_weight: Math.max(0, Math.min(1, result.points_weight || 1.0)),
        goals_weight: Math.max(0, Math.min(1, result.goals_weight || 0.5)),
        recommended_badge_categories: result.recommended_badge_categories || [],
        reward_multipliers: result.reward_multipliers || {
          competitive: 1.0,
          collaborative: 1.0,
          short_term: 1.0,
          long_term: 1.0,
        },
        personalized_messages: result.personalized_messages || [],
      };
    } catch (error) {
      console.error('❌ Lỗi Groq AI generatePersonalization:', error);
      
      let errorMessage = error.message;
      if (error.message?.includes('Invalid API Key') || error.message?.includes('invalid_api_key')) {
        errorMessage = 'AI_API_KEY không hợp lệ. Vui lòng kiểm tra lại trong file .env';
      } else if (error.message?.includes('chưa được cấu hình')) {
        errorMessage = 'AI_API_KEY chưa được cấu hình trong file .env';
      }

      return {
        leaderboard_weight: 0.5,
        badges_weight: 0.5,
        points_weight: 1.0,
        goals_weight: 0.5,
        recommended_badge_categories: [],
        reward_multipliers: {
          competitive: 1.0,
          collaborative: 1.0,
          short_term: 1.0,
          long_term: 1.0,
        },
        personalized_messages: [],
        error: errorMessage,
      };
    }
  }
}

module.exports = new AdaptiveGamificationAIService();



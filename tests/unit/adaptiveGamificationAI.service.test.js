// 📄 tests/unit/adaptiveGamificationAI.service.test.js - Adaptive Gamification AI Service Unit Tests

const adaptiveGamificationAIService = require('../../services/adaptiveGamificationAI.service');

// Mock groq config before requiring service
jest.mock('../../config/groq', () => {
  const mockCompletions = {
    create: jest.fn(),
  };
  return {
    chat: {
      completions: mockCompletions,
    },
  };
});

// Get the mocked groq to access mock functions
const groq = require('../../config/groq');
const mockGroqChatCompletionsCreate = groq.chat.completions.create;

describe('🔹 Adaptive Gamification AI Service Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Reset to default model for tests
    delete process.env.AI_MODEL_NAME;
    delete process.env.AI_FAST_MODEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('analyzeBehaviorPatterns', () => {
    const mockBehaviorData = {
      leaderboard_views: 10,
      leaderboard_positions_focused: [1, 2, 3],
      points_interactions: 5,
      points_value_changes: [100, 150, 200],
      task_completions: 8,
      task_completion_times: [30, 45, 60],
      collaboration_events: 3,
      team_task_count: 5,
      daily_activity: [{ date: '2025-01-01', count: 5 }],
      weekly_goals_achieved: 2,
      monthly_goals_achieved: 1,
      badge_reactions: ['like', 'love'],
      notification_clicks: 10,
    };

    it('✅ should analyze behavior patterns successfully with API key', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';
      process.env.AI_MODEL_NAME = 'llama-3.1-8b-instant';

      const mockAIResponse = {
        competitive_score: 75,
        collaborative_score: 60,
        short_term_score: 70,
        long_term_score: 50,
        confidence: 65,
        insights: ['User is competitive', 'User prefers short-term goals'],
        recommendations: ['Focus on leaderboard', 'Provide daily challenges'],
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(mockGroqChatCompletionsCreate).toHaveBeenCalled();
      expect(result).toEqual(mockAIResponse);
      expect(result.competitive_score).toBe(75);
      expect(result.confidence).toBe(65);
    });

    it('✅ should return fallback when AI_API_KEY is not configured', async () => {
      delete process.env.AI_API_KEY;

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(mockGroqChatCompletionsCreate).not.toHaveBeenCalled();
      expect(result).toEqual({
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 0,
        insights: ['AI_API_KEY chưa được cấu hình. Vui lòng thêm vào file .env'],
        recommendations: ['Cần cấu hình AI_API_KEY để sử dụng tính năng AI phân tích'],
        error: 'AI_API_KEY chưa được cấu hình trong file .env',
      });
    });

    it('✅ should return fallback when AI_API_KEY is empty string', async () => {
      process.env.AI_API_KEY = '';

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(mockGroqChatCompletionsCreate).not.toHaveBeenCalled();
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('AI_API_KEY chưa được cấu hình');
    });

    it('✅ should normalize scores to 0-100 range', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        competitive_score: 150, // > 100
        collaborative_score: -10, // < 0
        short_term_score: 70,
        long_term_score: 50,
        confidence: 65,
        insights: [],
        recommendations: [],
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(result.competitive_score).toBe(100); // Clamped to 100
      expect(result.collaborative_score).toBe(0); // Clamped to 0
      expect(result.short_term_score).toBe(70);
    });

    it('✅ should handle missing scores with default values', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        // Missing some scores
        competitive_score: 75,
        insights: [],
        recommendations: [],
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(result.competitive_score).toBe(75);
      expect(result.collaborative_score).toBe(50); // Default
      expect(result.short_term_score).toBe(50); // Default
      expect(result.long_term_score).toBe(50); // Default
      expect(result.confidence).toBe(0); // Default
    });

    it('✅ should handle empty behavior data', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 0,
        insights: [],
        recommendations: [],
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns({});

      expect(mockGroqChatCompletionsCreate).toHaveBeenCalled();
      expect(result).toHaveProperty('competitive_score');
    });

    it('❌ should handle API error and return fallback', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const apiError = new Error('Invalid API Key');
      mockGroqChatCompletionsCreate.mockRejectedValue(apiError);

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(result).toEqual({
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 0,
        insights: ['Không đủ dữ liệu để phân tích'],
        recommendations: ['Cần thu thập thêm dữ liệu hành vi'],
        error: 'AI_API_KEY không hợp lệ. Vui lòng kiểm tra lại trong file .env',
      });
    });

    it('❌ should handle invalid API key error message', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const apiError = new Error('invalid_api_key');
      mockGroqChatCompletionsCreate.mockRejectedValue(apiError);

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(result.error).toBe('AI_API_KEY không hợp lệ. Vui lòng kiểm tra lại trong file .env');
    });

    it('❌ should handle JSON parse error and return fallback', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON',
            },
          },
        ],
      });

      // Service catches JSON parse error and returns fallback, doesn't throw
      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(result).toEqual({
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 0,
        insights: ['Không đủ dữ liệu để phân tích'],
        recommendations: ['Cần thu thập thêm dữ liệu hành vi'],
        error: expect.stringContaining('Invalid JSON'),
      });
    });

    it('✅ should handle empty response content', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '',
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(result.competitive_score).toBe(50); // Default
      expect(result.collaborative_score).toBe(50); // Default
    });
  });

  describe('analyzeSentiment', () => {
    it('✅ should analyze sentiment successfully', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';
      process.env.AI_FAST_MODEL = 'llama-3.1-8b-instant';

      const mockAIResponse = {
        sentiment: 'positive',
        score: 85,
        motivation_indicators: {
          competitive: true,
          collaborative: false,
          achievement: true,
          feedback: true,
        },
        suggested_adjustments: ['Increase leaderboard visibility'],
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.analyzeSentiment(
        'I love competing on the leaderboard!'
      );

      expect(mockGroqChatCompletionsCreate).toHaveBeenCalled();
      expect(result).toEqual(mockAIResponse);
    });

    it('✅ should return default when text is empty', async () => {
      const result = await adaptiveGamificationAIService.analyzeSentiment('');

      expect(mockGroqChatCompletionsCreate).not.toHaveBeenCalled();
      expect(result).toEqual({
        sentiment: 'neutral',
        score: 50,
        motivation_indicators: {},
        suggested_adjustments: [],
      });
    });

    it('✅ should return default when text is null', async () => {
      const result = await adaptiveGamificationAIService.analyzeSentiment(null);

      expect(mockGroqChatCompletionsCreate).not.toHaveBeenCalled();
      expect(result).toEqual({
        sentiment: 'neutral',
        score: 50,
        motivation_indicators: {},
        suggested_adjustments: [],
      });
    });

    it('✅ should return default when text is only whitespace', async () => {
      const result = await adaptiveGamificationAIService.analyzeSentiment('   ');

      expect(mockGroqChatCompletionsCreate).not.toHaveBeenCalled();
      expect(result).toEqual({
        sentiment: 'neutral',
        score: 50,
        motivation_indicators: {},
        suggested_adjustments: [],
      });
    });

    it('✅ should return fallback when AI_API_KEY is not configured', async () => {
      delete process.env.AI_API_KEY;

      const apiError = new Error('AI_API_KEY chưa được cấu hình trong .env');
      mockGroqChatCompletionsCreate.mockRejectedValue(apiError);

      const result = await adaptiveGamificationAIService.analyzeSentiment('Test text');

      expect(result).toEqual({
        sentiment: 'neutral',
        score: 50,
        motivation_indicators: {},
        suggested_adjustments: [],
        error: 'AI_API_KEY chưa được cấu hình trong .env',
      });
    });

    it('❌ should handle API error and return fallback', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const apiError = new Error('API Error');
      mockGroqChatCompletionsCreate.mockRejectedValue(apiError);

      const result = await adaptiveGamificationAIService.analyzeSentiment('Test text');

      expect(result).toEqual({
        sentiment: 'neutral',
        score: 50,
        motivation_indicators: {},
        suggested_adjustments: [],
        error: 'API Error',
      });
    });

    it('❌ should handle JSON parse error and return fallback', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON',
            },
          },
        ],
      });

      // Service catches JSON parse error and returns fallback, doesn't throw
      const result = await adaptiveGamificationAIService.analyzeSentiment('Test text');

      expect(result).toEqual({
        sentiment: 'neutral',
        score: 50,
        motivation_indicators: {},
        suggested_adjustments: [],
        error: expect.stringContaining('Invalid JSON'),
      });
    });
  });

  describe('generatePersonalization', () => {
    const mockMotivationProfile = {
      competitive_score: 75,
      collaborative_score: 60,
      short_term_score: 70,
      long_term_score: 50,
      confidence: 65,
    };

    it('✅ should generate personalization successfully', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        leaderboard_weight: 0.8,
        badges_weight: 0.7,
        points_weight: 1.0,
        goals_weight: 0.6,
        recommended_badge_categories: ['competitive', 'achievement'],
        reward_multipliers: {
          competitive: 1.2,
          collaborative: 1.0,
          short_term: 1.1,
          long_term: 1.0,
        },
        personalized_messages: ['You are doing great!'],
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      expect(mockGroqChatCompletionsCreate).toHaveBeenCalled();
      expect(result).toEqual(mockAIResponse);
    });

    it('✅ should return fallback when AI_API_KEY is not configured', async () => {
      delete process.env.AI_API_KEY;

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      expect(mockGroqChatCompletionsCreate).not.toHaveBeenCalled();
      // competitive_score=75 > 70, short_term_score=70 (NOT > 70), long_term_score=50 (NOT > 70)
      expect(result).toEqual({
        leaderboard_weight: 0.8, // competitive_score > 70
        badges_weight: 0.7, // competitive_score > 70
        points_weight: 1.0,
        goals_weight: 0.5, // short_term=70 (NOT > 70) and long_term=50 (NOT > 70)
        recommended_badge_categories: ['competitive'], // Only competitive > 70
        reward_multipliers: {
          competitive: 1.2, // competitive_score > 70
          collaborative: 1.0, // collaborative_score=60 (NOT > 70)
          short_term: 1.0, // short_term_score=70 (NOT > 70)
          long_term: 1.0, // long_term_score=50 (NOT > 70)
        },
        personalized_messages: [],
        error: 'AI_API_KEY chưa được cấu hình. Đang dùng logic fallback đơn giản.',
      });
    });

    it('✅ should return fallback when AI_API_KEY is empty', async () => {
      process.env.AI_API_KEY = '';

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      expect(mockGroqChatCompletionsCreate).not.toHaveBeenCalled();
      expect(result).toHaveProperty('error');
    });

    it('✅ should use fallback logic with low scores', async () => {
      delete process.env.AI_API_KEY;

      const lowScoreProfile = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
      };

      const result = await adaptiveGamificationAIService.generatePersonalization(
        lowScoreProfile,
        {}
      );

      expect(result.leaderboard_weight).toBe(0.5); // competitive_score <= 70
      expect(result.badges_weight).toBe(0.5); // No score > 70
      expect(result.goals_weight).toBe(0.5); // No score > 70
      expect(result.reward_multipliers.competitive).toBe(1.0);
      expect(result.reward_multipliers.short_term).toBe(1.0);
    });

    it('✅ should normalize weights to 0-1 range', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        leaderboard_weight: 1.5, // > 1
        badges_weight: -0.5, // < 0
        points_weight: 0.8,
        goals_weight: 0.6,
        recommended_badge_categories: [],
        reward_multipliers: {},
        personalized_messages: [],
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      expect(result.leaderboard_weight).toBe(1); // Clamped to 1
      expect(result.badges_weight).toBe(0); // Clamped to 0
      expect(result.points_weight).toBe(0.8);
    });

    it('✅ should handle missing weights with defaults', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        // Missing some weights
        leaderboard_weight: 0.8,
        recommended_badge_categories: [],
        reward_multipliers: {},
        personalized_messages: [],
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      expect(result.leaderboard_weight).toBe(0.8);
      expect(result.badges_weight).toBe(0.5); // Default
      expect(result.points_weight).toBe(1.0); // Default
      expect(result.goals_weight).toBe(0.5); // Default
    });

    it('✅ should handle missing reward_multipliers with defaults', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        leaderboard_weight: 0.8,
        badges_weight: 0.7,
        points_weight: 1.0,
        goals_weight: 0.6,
        recommended_badge_categories: [],
        personalized_messages: [],
        // Missing reward_multipliers
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      expect(result.reward_multipliers).toEqual({
        competitive: 1.0,
        collaborative: 1.0,
        short_term: 1.0,
        long_term: 1.0,
      });
    });

    it('❌ should handle API error and return fallback', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const apiError = new Error('Invalid API Key');
      mockGroqChatCompletionsCreate.mockRejectedValue(apiError);

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      expect(result).toEqual({
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
        error: 'AI_API_KEY không hợp lệ. Vui lòng kiểm tra lại trong file .env',
      });
    });

    it('❌ should handle invalid API key error message', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const apiError = new Error('invalid_api_key');
      mockGroqChatCompletionsCreate.mockRejectedValue(apiError);

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      expect(result.error).toBe('AI_API_KEY không hợp lệ. Vui lòng kiểm tra lại trong file .env');
    });

    it('✅ should include currentConfig in prompt', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const currentConfig = {
        leaderboard_enabled: true,
        badges_enabled: true,
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                leaderboard_weight: 0.8,
                badges_weight: 0.7,
                points_weight: 1.0,
                goals_weight: 0.5,
                recommended_badge_categories: [],
                reward_multipliers: {},
                personalized_messages: [],
              }),
            },
          },
        ],
      });

      await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        currentConfig
      );

      const callArgs = mockGroqChatCompletionsCreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find(m => m.role === 'user');
      expect(userMessage.content).toContain(JSON.stringify(currentConfig, null, 2));
    });

    it('✅ should use fallback with short_term_score > 70', async () => {
      delete process.env.AI_API_KEY;

      const profileWithHighShortTerm = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 75, // > 70
        long_term_score: 50,
      };

      const result = await adaptiveGamificationAIService.generatePersonalization(
        profileWithHighShortTerm,
        {}
      );

      expect(result.goals_weight).toBe(0.7); // short_term > 70
      expect(result.reward_multipliers.short_term).toBe(1.1); // short_term > 70
      expect(result.recommended_badge_categories).toContain('achievement'); // short_term > 70
    });

    it('✅ should use fallback with long_term_score > 70', async () => {
      delete process.env.AI_API_KEY;

      const profileWithHighLongTerm = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 75, // > 70
      };

      const result = await adaptiveGamificationAIService.generatePersonalization(
        profileWithHighLongTerm,
        {}
      );

      expect(result.goals_weight).toBe(0.7); // long_term > 70
      expect(result.reward_multipliers.long_term).toBe(1.1); // long_term > 70
    });

    it('✅ should use fallback with collaborative_score > 70', async () => {
      delete process.env.AI_API_KEY;

      const profileWithHighCollaborative = {
        competitive_score: 50,
        collaborative_score: 75, // > 70
        short_term_score: 50,
        long_term_score: 50,
      };

      const result = await adaptiveGamificationAIService.generatePersonalization(
        profileWithHighCollaborative,
        {}
      );

      expect(result.badges_weight).toBe(0.7); // collaborative > 70
      expect(result.reward_multipliers.collaborative).toBe(1.2); // collaborative > 70
      expect(result.recommended_badge_categories).toContain('collaborative'); // collaborative > 70
    });

    it('✅ should handle missing choices in API response', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [],
      });

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      // When choices is empty, service uses '{}' as default and parses it successfully
      // No error is thrown, just default values are returned
      expect(result).toEqual({
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
      });
    });

    it('✅ should handle null message content in API response', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.generatePersonalization(
        mockMotivationProfile,
        {}
      );

      // When content is null, service uses '{}' as default (completion.choices[0]?.message?.content || '{}')
      // No error is thrown, just default values are returned
      expect(result).toEqual({
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
      });
    });

    it('✅ should call API with correct model and parameters', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';
      process.env.AI_MODEL_NAME = 'llama-3.3-70b-versatile';

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                leaderboard_weight: 0.8,
                badges_weight: 0.7,
                points_weight: 1.0,
                goals_weight: 0.5,
                recommended_badge_categories: [],
                reward_multipliers: {},
                personalized_messages: [],
              }),
            },
          },
        ],
      });

      await adaptiveGamificationAIService.generatePersonalization(mockMotivationProfile, {});

      expect(mockGroqChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.4,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('✅ should handle missing motivationProfile properties', async () => {
      delete process.env.AI_API_KEY;

      const incompleteProfile = {
        competitive_score: 75,
        // Missing other scores
      };

      const result = await adaptiveGamificationAIService.generatePersonalization(
        incompleteProfile,
        {}
      );

      expect(result.leaderboard_weight).toBe(0.8); // competitive_score > 70
      expect(result.collaborative_score).toBeUndefined();
    });
  });

  describe('Constructor and Model Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Restore original env before each test
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('✅ should use default model when AI_MODEL_NAME is not set', () => {
      delete process.env.AI_MODEL_NAME;
      delete process.env.AI_FAST_MODEL;

      // Re-require service to test constructor
      jest.resetModules();
      const service = require('../../services/adaptiveGamificationAI.service');

      expect(service.defaultModel).toBe('llama-3.1-8b-instant');
      expect(service.fastModel).toBe('llama-3.1-8b-instant');
    });

    it('✅ should use AI_MODEL_NAME when set', () => {
      process.env.AI_MODEL_NAME = 'llama-3.3-70b-versatile';
      delete process.env.AI_FAST_MODEL;

      jest.resetModules();
      const service = require('../../services/adaptiveGamificationAI.service');

      expect(service.defaultModel).toBe('llama-3.3-70b-versatile');
      expect(service.fastModel).toBe('llama-3.3-70b-versatile');
    });

    it('✅ should use AI_FAST_MODEL when set', () => {
      process.env.AI_MODEL_NAME = 'llama-3.3-70b-versatile';
      process.env.AI_FAST_MODEL = 'llama-3.1-8b-instant';

      jest.resetModules();
      const service = require('../../services/adaptiveGamificationAI.service');

      expect(service.defaultModel).toBe('llama-3.3-70b-versatile');
      expect(service.fastModel).toBe('llama-3.1-8b-instant');
    });
  });

  describe('analyzeBehaviorPatterns - Additional Edge Cases', () => {
    it('✅ should handle undefined behaviorData properties', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        competitive_score: 50,
        collaborative_score: 50,
        short_term_score: 50,
        long_term_score: 50,
        confidence: 0,
        insights: [],
        recommendations: [],
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns({});

      expect(mockGroqChatCompletionsCreate).toHaveBeenCalled();
      expect(result).toHaveProperty('competitive_score');
    });

    it('✅ should call API with correct response_format', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockBehaviorData = {
        leaderboard_views: 10,
        task_completions: 5,
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                competitive_score: 50,
                collaborative_score: 50,
                short_term_score: 50,
                long_term_score: 50,
                confidence: 50,
                insights: [],
                recommendations: [],
              }),
            },
          },
        ],
      });

      await adaptiveGamificationAIService.analyzeBehaviorPatterns(mockBehaviorData);

      expect(mockGroqChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
        })
      );
    });

    it('✅ should handle missing insights and recommendations', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        competitive_score: 75,
        collaborative_score: 60,
        short_term_score: 70,
        long_term_score: 50,
        confidence: 65,
        // Missing insights and recommendations
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.analyzeBehaviorPatterns({});

      expect(result.insights).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });
  });

  describe('analyzeSentiment - Additional Edge Cases', () => {
    it('✅ should call API with fastModel', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';
      // Note: Service is already instantiated, so we need to check actual model used
      // The service uses this.fastModel which is set in constructor
      // Since service is singleton, it uses the model from when it was first required
      // We'll verify the call was made and check the model in the actual call

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'positive',
                score: 80,
                motivation_indicators: {},
                suggested_adjustments: [],
              }),
            },
          },
        ],
      });

      await adaptiveGamificationAIService.analyzeSentiment('Test text');

      expect(mockGroqChatCompletionsCreate).toHaveBeenCalled();
      const callArgs = mockGroqChatCompletionsCreate.mock.calls[0][0];
      // Verify it uses fastModel (which may be defaultModel if AI_FAST_MODEL not set)
      expect(callArgs.model).toBeDefined();
      expect(callArgs.temperature).toBe(0.2);
      expect(callArgs.max_tokens).toBe(500);
      expect(callArgs.response_format).toEqual({ type: 'json_object' });
    });

    it('✅ should handle missing motivation_indicators', async () => {
      process.env.AI_API_KEY = 'gsk_test_key';

      const mockAIResponse = {
        sentiment: 'positive',
        score: 80,
        suggested_adjustments: [],
        // Missing motivation_indicators
      };

      mockGroqChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await adaptiveGamificationAIService.analyzeSentiment('Test text');

      expect(result.sentiment).toBe('positive');
      expect(result.score).toBe(80);
    });

    it('✅ should handle undefined text', async () => {
      const result = await adaptiveGamificationAIService.analyzeSentiment(undefined);

      expect(mockGroqChatCompletionsCreate).not.toHaveBeenCalled();
      expect(result).toEqual({
        sentiment: 'neutral',
        score: 50,
        motivation_indicators: {},
        suggested_adjustments: [],
      });
    });
  });
});

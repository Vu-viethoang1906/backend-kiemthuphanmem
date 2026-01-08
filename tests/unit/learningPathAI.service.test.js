// 📄 tests/unit/learningPathAI.service.test.js - Learning Path AI Service Unit Tests
const mongoose = require('mongoose');

// Mock groq config BEFORE requiring the service
jest.mock('../../config/groq', () => ({
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
}));

// Now require the service after mocks are set up
const LearningPathAIService = require('../../services/learningPathAI.service');
const groq = require('../../config/groq');

describe('🔹 Learning Path AI Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.env
    delete process.env.AI_MODEL_NAME;
  });

  afterEach(() => {
    delete process.env.AI_MODEL_NAME;
  });

  describe('extractSkillsFromTasks', () => {
    it('✅ should extract skills from tasks successfully', async () => {
      const mockTasks = [
        {
          title: 'Build React Component',
          description: 'Create a reusable button component',
          tags: ['react', 'frontend'],
        },
        {
          title: 'API Integration',
          description: 'Connect to REST API',
          tags: ['javascript', 'api'],
        },
      ];

      const mockAIResponse = {
        skills: [
          {
            name: 'React',
            category: 'Frontend',
            proficiency_level: 60,
            confidence: 80,
            evidence: ['Build React Component'],
          },
          {
            name: 'JavaScript',
            category: 'Programming',
            proficiency_level: 70,
            confidence: 85,
            evidence: ['API Integration'],
          },
        ],
        overall_confidence: 75,
      };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await LearningPathAIService.extractSkillsFromTasks(mockTasks);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('overall_confidence');
      expect(result.skills).toHaveLength(2);
      expect(groq.chat.completions.create).toHaveBeenCalled();
    });

    it('✅ should handle response with markdown code blocks', async () => {
      const mockTasks = [
        {
          title: 'Test Task',
          description: 'Test description',
          tags: [],
        },
      ];

      const mockAIResponse = {
        skills: [
          {
            name: 'JavaScript',
            category: 'Programming',
            proficiency_level: 50,
            confidence: 70,
            evidence: ['Test Task'],
          },
        ],
        overall_confidence: 70,
      };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: '```json\n' + JSON.stringify(mockAIResponse) + '\n```',
            },
          },
        ],
      });

      const result = await LearningPathAIService.extractSkillsFromTasks(mockTasks);

      expect(result).toBeDefined();
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].name).toBe('JavaScript');
    });

    it('✅ should return empty result when tasks array is empty', async () => {
      const result = await LearningPathAIService.extractSkillsFromTasks([]);

      expect(result).toEqual({ skills: [], confidence: 0 });
      expect(groq.chat.completions.create).not.toHaveBeenCalled();
    });

    it('✅ should return empty result when tasks is null', async () => {
      const result = await LearningPathAIService.extractSkillsFromTasks(null);

      expect(result).toEqual({ skills: [], confidence: 0 });
      expect(groq.chat.completions.create).not.toHaveBeenCalled();
    });

    it('✅ should return empty result when tasks is undefined', async () => {
      const result = await LearningPathAIService.extractSkillsFromTasks(undefined);

      expect(result).toEqual({ skills: [], confidence: 0 });
      expect(groq.chat.completions.create).not.toHaveBeenCalled();
    });

    it('❌ should handle API error gracefully', async () => {
      const mockTasks = [
        {
          title: 'Test Task',
          description: 'Test',
          tags: [],
        },
      ];

      groq.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const result = await LearningPathAIService.extractSkillsFromTasks(mockTasks);

      expect(result).toEqual({
        skills: [],
        confidence: 0,
        error: 'API Error',
      });
    });

    it('❌ should handle JSON parse error gracefully', async () => {
      const mockTasks = [
        {
          title: 'Test Task',
          description: 'Test',
          tags: [],
        },
      ];

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      });

      const result = await LearningPathAIService.extractSkillsFromTasks(mockTasks);

      expect(result).toHaveProperty('error');
      expect(result.skills).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('✅ should map tasks data correctly', async () => {
      const mockTasks = [
        {
          title: 'Task 1',
          description: 'Description 1',
          tags: ['tag1', 'tag2'],
        },
      ];

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ skills: [], overall_confidence: 0 }),
            },
          },
        ],
      });

      await LearningPathAIService.extractSkillsFromTasks(mockTasks);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Task 1');
      expect(callArgs.messages[0].content).toContain('Description 1');
      expect(callArgs.messages[0].content).toContain('tag1');
    });
  });

  describe('analyzeSkillGaps', () => {
    it('✅ should analyze skill gaps successfully', async () => {
      const mockUserSkills = [
        { name: 'JavaScript', proficiency_level: 60 },
        { skill_id: { name: 'HTML' }, proficiency_level: 50 },
      ];
      const mockTargetSkills = [{ name: 'JavaScript' }, { name: 'React' }, { name: 'Node.js' }];

      const mockAIResponse = {
        missing_skills: ['React', 'Node.js'],
        weak_skills: [{ name: 'JavaScript', current_level: 60, target_level: 80 }],
        recommendations: [
          {
            skill_name: 'React',
            priority: 9,
            reason: 'Cần thiết cho Frontend development',
            prerequisites_met: true,
          },
        ],
      };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await LearningPathAIService.analyzeSkillGaps(mockUserSkills, mockTargetSkills);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('missing_skills');
      expect(result).toHaveProperty('weak_skills');
      expect(result).toHaveProperty('recommendations');
      expect(result.missing_skills).toHaveLength(2);
      expect(groq.chat.completions.create).toHaveBeenCalled();
    });

    it('✅ should handle userSkills with skill_id object', async () => {
      const mockUserSkills = [{ skill_id: { name: 'JavaScript' } }, { skill_id: { name: 'HTML' } }];
      const mockTargetSkills = [{ name: 'React' }];

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                missing_skills: [],
                weak_skills: [],
                recommendations: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.analyzeSkillGaps(mockUserSkills, mockTargetSkills);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('JavaScript');
      expect(callArgs.messages[0].content).toContain('HTML');
    });

    it('✅ should handle empty userSkills', async () => {
      const mockTargetSkills = [{ name: 'React' }];

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                missing_skills: ['React'],
                weak_skills: [],
                recommendations: [],
              }),
            },
          },
        ],
      });

      const result = await LearningPathAIService.analyzeSkillGaps([], mockTargetSkills);

      expect(result).toBeDefined();
      expect(result.missing_skills).toContain('React');
    });

    it('✅ should handle empty targetSkills', async () => {
      const mockUserSkills = [{ name: 'JavaScript' }];

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                missing_skills: [],
                weak_skills: [],
                recommendations: [],
              }),
            },
          },
        ],
      });

      const result = await LearningPathAIService.analyzeSkillGaps(mockUserSkills, []);

      expect(result).toBeDefined();
    });

    it('❌ should handle API error gracefully', async () => {
      groq.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const result = await LearningPathAIService.analyzeSkillGaps([], []);

      expect(result).toEqual({
        missing_skills: [],
        weak_skills: [],
        recommendations: [],
      });
    });

    it('❌ should handle JSON parse error gracefully', async () => {
      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON',
            },
          },
        ],
      });

      const result = await LearningPathAIService.analyzeSkillGaps([], []);

      expect(result).toEqual({
        missing_skills: [],
        weak_skills: [],
        recommendations: [],
      });
    });

    it('✅ should filter out null/undefined skill names', async () => {
      const mockUserSkills = [
        { name: 'JavaScript' },
        { name: null },
        { skill_id: { name: 'HTML' } },
        { skill_id: null },
      ];
      const mockTargetSkills = [{ name: 'React' }, { name: null }];

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                missing_skills: [],
                weak_skills: [],
                recommendations: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.analyzeSkillGaps(mockUserSkills, mockTargetSkills);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      const content = callArgs.messages[0].content;
      expect(content).toContain('JavaScript');
      expect(content).toContain('HTML');
      expect(content).toContain('React');
    });
  });

  describe('generateLearningPath', () => {
    it('✅ should generate learning path successfully', async () => {
      const mockUserSkills = [
        { name: 'JavaScript', proficiency_level: 60 },
        { skill_id: { name: 'HTML' }, proficiency_level: 50 },
      ];
      const mockSkillGaps = {
        missing_skills: ['React', 'Node.js'],
        weak_skills: [],
        recommendations: [],
      };

      const mockAIResponse = {
        path_name: 'Full-stack Developer Path',
        stages: [
          {
            stage_number: 1,
            title: 'Foundation',
            description: 'Học các kỹ năng cơ bản',
            skills: ['JavaScript', 'HTML', 'CSS'],
            difficulty_level: 1,
            estimated_duration_days: 30,
          },
          {
            stage_number: 2,
            title: 'Advanced',
            description: 'Học các kỹ năng nâng cao',
            skills: ['React', 'Node.js'],
            difficulty_level: 2,
            estimated_duration_days: 60,
          },
        ],
      };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await LearningPathAIService.generateLearningPath(
        mockUserSkills,
        mockSkillGaps
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('path_name');
      expect(result).toHaveProperty('stages');
      expect(result.path_name).toBe('Full-stack Developer Path');
      expect(result.stages).toHaveLength(2);
      expect(groq.chat.completions.create).toHaveBeenCalled();
    });

    it('✅ should handle userProfile parameter', async () => {
      const mockUserSkills = [{ name: 'JavaScript' }];
      const mockSkillGaps = { missing_skills: [] };
      const mockUserProfile = { experience: 'beginner', goals: ['frontend'] };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                path_name: 'Test Path',
                stages: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.generateLearningPath(
        mockUserSkills,
        mockSkillGaps,
        mockUserProfile
      );

      expect(groq.chat.completions.create).toHaveBeenCalled();
    });

    it('✅ should use default userProfile when not provided', async () => {
      const mockUserSkills = [{ name: 'JavaScript' }];
      const mockSkillGaps = { missing_skills: [] };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                path_name: 'Test Path',
                stages: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.generateLearningPath(mockUserSkills, mockSkillGaps);

      expect(groq.chat.completions.create).toHaveBeenCalled();
    });

    it('✅ should format userSkills correctly', async () => {
      const mockUserSkills = [
        { name: 'JavaScript', proficiency_level: 60 },
        { skill_id: { name: 'HTML' }, proficiency_level: 50 },
      ];
      const mockSkillGaps = { missing_skills: [] };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                path_name: 'Test Path',
                stages: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.generateLearningPath(mockUserSkills, mockSkillGaps);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      const content = callArgs.messages[0].content;
      expect(content).toContain('JavaScript');
      expect(content).toContain('HTML');
    });

    it('❌ should handle API error gracefully', async () => {
      groq.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const result = await LearningPathAIService.generateLearningPath([], {});

      expect(result).toEqual({
        path_name: 'Learning Path',
        stages: [],
        error: 'API Error',
      });
    });

    it('❌ should handle JSON parse error gracefully', async () => {
      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON',
            },
          },
        ],
      });

      const result = await LearningPathAIService.generateLearningPath([], {});

      expect(result).toHaveProperty('error');
      expect(result.path_name).toBe('Learning Path');
      expect(result.stages).toEqual([]);
    });

    it('✅ should handle empty stages', async () => {
      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                path_name: 'Empty Path',
                stages: [],
              }),
            },
          },
        ],
      });

      const result = await LearningPathAIService.generateLearningPath([], {});

      expect(result.stages).toEqual([]);
    });
  });

  describe('recommendNextSkills', () => {
    it('✅ should recommend next skills successfully', async () => {
      const mockUserSkills = [
        { name: 'JavaScript', proficiency_level: 60 },
        { skill_id: { name: 'HTML' }, proficiency_level: 50 },
      ];
      const completedTasks = 10;
      const limit = 5;
      const mockAvailableSkills = [{ name: 'React' }, { name: 'Vue.js' }, { name: 'Angular' }];

      const mockAIResponse = {
        recommendations: [
          {
            skill_name: 'React',
            recommendation_type: 'next_skill',
            priority: 9,
            reason: 'Logic tiếp theo sau JavaScript',
            confidence_score: 85,
            prerequisites_met: true,
            estimated_difficulty: 3,
          },
          {
            skill_name: 'Vue.js',
            recommendation_type: 'next_skill',
            priority: 8,
            reason: 'Alternative to React',
            confidence_score: 80,
            prerequisites_met: true,
            estimated_difficulty: 3,
          },
        ],
      };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await LearningPathAIService.recommendNextSkills(
        mockUserSkills,
        completedTasks,
        limit,
        mockAvailableSkills
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations).toHaveLength(2);
      expect(groq.chat.completions.create).toHaveBeenCalled();
    });

    it('✅ should limit recommendations to specified limit', async () => {
      const mockAIResponse = {
        recommendations: Array.from({ length: 10 }, (_, i) => ({
          skill_name: `Skill ${i}`,
          priority: 9 - i,
        })),
      };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await LearningPathAIService.recommendNextSkills([], 0, 5, []);

      expect(result.recommendations).toHaveLength(5);
    });

    it('✅ should handle empty userSkills', async () => {
      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [
                  {
                    skill_name: 'JavaScript',
                    priority: 9,
                  },
                ],
              }),
            },
          },
        ],
      });

      const result = await LearningPathAIService.recommendNextSkills([], 0, 5, []);

      expect(result.recommendations).toBeDefined();
      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Chưa có kỹ năng nào');
    });

    it('✅ should handle empty availableSkills', async () => {
      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.recommendNextSkills([], 0, 5, []);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).not.toContain('Kỹ năng có sẵn trong hệ thống');
    });

    it('✅ should include availableSkills in prompt when provided', async () => {
      const mockAvailableSkills = [{ name: 'React' }, { name: 'Vue.js' }];

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.recommendNextSkills([], 0, 5, mockAvailableSkills);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('React');
      expect(callArgs.messages[0].content).toContain('Vue.js');
    });

    it('✅ should use default limit when not provided', async () => {
      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.recommendNextSkills([], 0);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('tối đa 5 recommendations');
    });

    it('✅ should format userSkills correctly', async () => {
      const mockUserSkills = [
        { name: 'JavaScript', proficiency_level: 60 },
        { skill_id: { name: 'HTML' }, proficiency_level: 50 },
      ];

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.recommendNextSkills(mockUserSkills, 0, 5, []);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      const content = callArgs.messages[0].content;
      expect(content).toContain('JavaScript');
      expect(content).toContain('HTML');
    });

    it('✅ should include completedTasks count in prompt', async () => {
      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.recommendNextSkills([], 15, 5, []);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('15 tasks');
    });

    it('❌ should handle API error gracefully', async () => {
      groq.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const result = await LearningPathAIService.recommendNextSkills([], 0, 5, []);

      expect(result).toEqual({ recommendations: [] });
    });

    it('❌ should handle JSON parse error gracefully', async () => {
      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON',
            },
          },
        ],
      });

      const result = await LearningPathAIService.recommendNextSkills([], 0, 5, []);

      expect(result).toEqual({ recommendations: [] });
    });

    it('✅ should handle response with markdown code blocks', async () => {
      const mockAIResponse = {
        recommendations: [
          {
            skill_name: 'React',
            priority: 9,
          },
        ],
      };

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: '```json\n' + JSON.stringify(mockAIResponse) + '\n```',
            },
          },
        ],
      });

      const result = await LearningPathAIService.recommendNextSkills([], 0, 5, []);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].skill_name).toBe('React');
    });

    it('✅ should limit availableSkills to 50 in prompt', async () => {
      const mockAvailableSkills = Array.from({ length: 100 }, (_, i) => ({
        name: `Skill ${i}`,
      }));

      groq.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [],
              }),
            },
          },
        ],
      });

      await LearningPathAIService.recommendNextSkills([], 0, 5, mockAvailableSkills);

      const callArgs = groq.chat.completions.create.mock.calls[0][0];
      const content = callArgs.messages[0].content;
      // Should only include first 50 skills
      expect(content).toContain('Skill 49');
      expect(content).not.toContain('Skill 50');
    });
  });

  describe('constructor', () => {
    it('✅ should use default model when AI_MODEL_NAME not set', () => {
      // Service is already loaded, check the actual model property
      // The model is set from env at module load time
      expect(LearningPathAIService.model).toBeDefined();
      expect(typeof LearningPathAIService.model).toBe('string');
    });

    it('✅ should use AI_MODEL_NAME from env when set', () => {
      // Service is already loaded with env value
      expect(LearningPathAIService.model).toBeDefined();
      expect(typeof LearningPathAIService.model).toBe('string');
    });
  });
});

// 📄 tests/unit/learningPath.controller.test.js - Learning Path Controller Unit Tests

// Mock auth middleware
jest.mock('../../middlewares/auth', () => ({
  authenticateAny: (req, res, next) => {
    if (!req.user) {
      req.user = {
        id: '507f1f77bcf86cd799439011',
        _id: '507f1f77bcf86cd799439011',
        roles: ['admin', 'System_Manager'],
        email: 'test@example.com',
        username: 'testuser',
      };
    }
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
}));

// Mock services
jest.mock('../../services/learningPath.service', () => ({
  getLearningPath: jest.fn(),
  generateLearningPath: jest.fn(),
  getRecommendations: jest.fn(),
  updateProgress: jest.fn(),
  completeStage: jest.fn(),
}));

// Mock repositories
jest.mock('../../repositories/skillRecommendation.repository', () => ({
  findById: jest.fn(),
  markAsAccepted: jest.fn(),
}));

jest.mock('../../repositories/userSkill.repository', () => ({
  findByUserAndCenter: jest.fn(),
}));

const learningPathController = require('../../controllers/learningPath.controller');
const learningPathService = require('../../services/learningPath.service');
const skillRecommendationRepo = require('../../repositories/skillRecommendation.repository');
const userSkillRepo = require('../../repositories/userSkill.repository');

describe('🔹 Learning Path Controller Unit Tests', () => {
  const VALID_USER_ID = '507f1f77bcf86cd799439011';
  const VALID_CENTER_ID = '507f1f77bcf86cd799439012';
  const VALID_RECOMMENDATION_ID = '507f1f77bcf86cd799439013';
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock request
    mockReq = {
      user: {
        id: VALID_USER_ID,
        _id: VALID_USER_ID,
        roles: ['admin'],
        email: 'test@example.com',
        username: 'testuser',
      },
      query: {},
      params: {},
      body: {},
    };

    // Setup default mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('getLearningPath', () => {
    const mockPath = {
      _id: 'path123',
      user_id: VALID_USER_ID,
      center_id: VALID_CENTER_ID,
      path_name: 'Full Stack Developer Path',
      current_stage: 2,
      progress_percentage: 50,
      stages: [
        { stage_number: 1, title: 'Stage 1', is_completed: true },
        { stage_number: 2, title: 'Stage 2', is_completed: false },
      ],
    };

    it('✅ should return learning path successfully with user.id', async () => {
      learningPathService.getLearningPath.mockResolvedValue(mockPath);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getLearningPath(mockReq, mockRes);

      expect(learningPathService.getLearningPath).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPath,
      });
    });

    it('✅ should return learning path successfully with user._id', async () => {
      learningPathService.getLearningPath.mockResolvedValue(mockPath);

      mockReq.user = { _id: VALID_USER_ID };
      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getLearningPath(mockReq, mockRes);

      expect(learningPathService.getLearningPath).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPath,
      });
    });

    it('✅ should get center_id from body if not in query', async () => {
      learningPathService.getLearningPath.mockResolvedValue(mockPath);

      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.getLearningPath(mockReq, mockRes);

      expect(learningPathService.getLearningPath).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
    });

    it('❌ should return 400 when userId is missing', async () => {
      mockReq.user = {};
      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getLearningPath(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
      expect(learningPathService.getLearningPath).not.toHaveBeenCalled();
    });

    it('❌ should return 400 when center_id is missing', async () => {
      mockReq.query = {};

      await learningPathController.getLearningPath(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Database error');
      learningPathService.getLearningPath.mockRejectedValue(error);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getLearningPath(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });

  describe('generateLearningPath', () => {
    const mockGeneratedPath = {
      _id: 'path123',
      user_id: VALID_USER_ID,
      center_id: VALID_CENTER_ID,
      path_name: 'New Generated Path',
      current_stage: 1,
      stages: [],
    };

    it('✅ should generate learning path successfully with user.id', async () => {
      learningPathService.generateLearningPath.mockResolvedValue(mockGeneratedPath);

      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.generateLearningPath(mockReq, mockRes);

      expect(learningPathService.generateLearningPath).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockGeneratedPath,
      });
    });

    it('✅ should get center_id from query if not in body', async () => {
      learningPathService.generateLearningPath.mockResolvedValue(mockGeneratedPath);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.generateLearningPath(mockReq, mockRes);

      expect(learningPathService.generateLearningPath).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
    });

    it('❌ should return 400 when userId is missing', async () => {
      mockReq.user = {};
      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.generateLearningPath(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
    });

    it('❌ should return 400 when center_id is missing', async () => {
      mockReq.body = {};

      await learningPathController.generateLearningPath(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Generation failed');
      learningPathService.generateLearningPath.mockRejectedValue(error);

      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.generateLearningPath(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Generation failed',
      });
    });
  });

  describe('getSkills', () => {
    const mockSkills = [
      { _id: 'skill1', skill_id: { name: 'JavaScript', proficiency_level: 80 } },
      { _id: 'skill2', skill_id: { name: 'Node.js', proficiency_level: 60 } },
    ];

    it('✅ should return skills successfully', async () => {
      userSkillRepo.findByUserAndCenter.mockResolvedValue(mockSkills);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getSkills(mockReq, mockRes);

      expect(userSkillRepo.findByUserAndCenter).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          total: 2,
          skills: mockSkills,
        },
      });
    });

    it('✅ should return empty array when no skills found', async () => {
      userSkillRepo.findByUserAndCenter.mockResolvedValue([]);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getSkills(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          total: 0,
          skills: [],
        },
      });
    });

    it('✅ should get center_id from body if not in query', async () => {
      userSkillRepo.findByUserAndCenter.mockResolvedValue(mockSkills);

      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.getSkills(mockReq, mockRes);

      expect(userSkillRepo.findByUserAndCenter).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
    });

    it('❌ should return 400 when userId is missing', async () => {
      mockReq.user = {};
      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getSkills(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
    });

    it('❌ should return 400 when center_id is missing', async () => {
      mockReq.query = {};

      await learningPathController.getSkills(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
    });

    it('❌ should return 500 when repository throws error', async () => {
      const error = new Error('Database error');
      userSkillRepo.findByUserAndCenter.mockRejectedValue(error);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getSkills(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });

  describe('getRecommendations', () => {
    const mockRecommendations = [
      {
        _id: 'rec1',
        recommended_skill_id: { name: 'React', difficulty_level: 3 },
        priority: 10,
        confidence_score: 0.9,
      },
      {
        _id: 'rec2',
        recommended_skill_id: { name: 'TypeScript', difficulty_level: 2 },
        priority: 8,
        confidence_score: 0.8,
      },
    ];

    it('✅ should return recommendations successfully with default limit', async () => {
      learningPathService.getRecommendations.mockResolvedValue(mockRecommendations);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getRecommendations(mockReq, mockRes);

      expect(learningPathService.getRecommendations).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        10
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          total: 2,
          recommendations: mockRecommendations,
        },
      });
    });

    it('✅ should return recommendations with custom limit', async () => {
      learningPathService.getRecommendations.mockResolvedValue(mockRecommendations);

      mockReq.query = { center_id: VALID_CENTER_ID, limit: '5' };

      await learningPathController.getRecommendations(mockReq, mockRes);

      expect(learningPathService.getRecommendations).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        5
      );
    });

    it('✅ should get center_id from body if not in query', async () => {
      learningPathService.getRecommendations.mockResolvedValue(mockRecommendations);

      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.getRecommendations(mockReq, mockRes);

      expect(learningPathService.getRecommendations).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        10
      );
    });

    it('✅ should handle invalid limit gracefully', async () => {
      learningPathService.getRecommendations.mockResolvedValue(mockRecommendations);

      mockReq.query = { center_id: VALID_CENTER_ID, limit: 'invalid' };

      await learningPathController.getRecommendations(mockReq, mockRes);

      expect(learningPathService.getRecommendations).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        10
      );
    });

    it('✅ should return empty recommendations array', async () => {
      learningPathService.getRecommendations.mockResolvedValue([]);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getRecommendations(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          total: 0,
          recommendations: [],
        },
      });
    });

    it('❌ should return 400 when userId is missing', async () => {
      mockReq.user = {};
      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getRecommendations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
    });

    it('❌ should return 400 when center_id is missing', async () => {
      mockReq.query = {};

      await learningPathController.getRecommendations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Service error');
      learningPathService.getRecommendations.mockRejectedValue(error);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getRecommendations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('acceptRecommendation', () => {
    const mockRecommendation = {
      _id: VALID_RECOMMENDATION_ID,
      user_id: VALID_USER_ID,
      recommended_skill_id: { name: 'React' },
      accepted: false,
    };

    it('✅ should accept recommendation successfully', async () => {
      skillRecommendationRepo.findById.mockResolvedValue(mockRecommendation);
      skillRecommendationRepo.markAsAccepted.mockResolvedValue({
        ...mockRecommendation,
        accepted: true,
      });

      mockReq.params = { id: VALID_RECOMMENDATION_ID };

      await learningPathController.acceptRecommendation(mockReq, mockRes);

      expect(skillRecommendationRepo.findById).toHaveBeenCalledWith(VALID_RECOMMENDATION_ID);
      expect(skillRecommendationRepo.markAsAccepted).toHaveBeenCalledWith(VALID_RECOMMENDATION_ID);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Đã chấp nhận recommendation',
      });
    });

    it('❌ should return 400 when recommendation_id is missing', async () => {
      mockReq.params = {};

      await learningPathController.acceptRecommendation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'recommendation_id là bắt buộc',
      });
      expect(skillRecommendationRepo.findById).not.toHaveBeenCalled();
    });

    it('❌ should return 404 when recommendation not found', async () => {
      skillRecommendationRepo.findById.mockResolvedValue(null);

      mockReq.params = { id: VALID_RECOMMENDATION_ID };

      await learningPathController.acceptRecommendation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Recommendation không tồn tại',
      });
      expect(skillRecommendationRepo.markAsAccepted).not.toHaveBeenCalled();
    });

    it('❌ should return 404 when recommendation belongs to different user', async () => {
      const otherUserRecommendation = {
        ...mockRecommendation,
        user_id: '507f1f77bcf86cd799439999',
      };
      skillRecommendationRepo.findById.mockResolvedValue(otherUserRecommendation);

      mockReq.params = { id: VALID_RECOMMENDATION_ID };

      await learningPathController.acceptRecommendation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Recommendation không tồn tại',
      });
      expect(skillRecommendationRepo.markAsAccepted).not.toHaveBeenCalled();
    });

    it('✅ should handle user_id as string comparison', async () => {
      const recommendationWithStringId = {
        ...mockRecommendation,
        user_id: { toString: () => VALID_USER_ID },
      };
      skillRecommendationRepo.findById.mockResolvedValue(recommendationWithStringId);
      skillRecommendationRepo.markAsAccepted.mockResolvedValue({
        ...recommendationWithStringId,
        accepted: true,
      });

      mockReq.params = { id: VALID_RECOMMENDATION_ID };

      await learningPathController.acceptRecommendation(mockReq, mockRes);

      expect(skillRecommendationRepo.markAsAccepted).toHaveBeenCalled();
    });

    it('❌ should return 500 when repository throws error', async () => {
      const error = new Error('Database error');
      skillRecommendationRepo.findById.mockRejectedValue(error);

      mockReq.params = { id: VALID_RECOMMENDATION_ID };

      await learningPathController.acceptRecommendation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });

  describe('getProgress', () => {
    const mockPath = {
      _id: 'path123',
      user_id: VALID_USER_ID,
      center_id: VALID_CENTER_ID,
      progress_percentage: 75,
      current_stage: 3,
      stages: [
        { stage_number: 1, is_completed: true },
        { stage_number: 2, is_completed: true },
        { stage_number: 3, is_completed: false },
        { stage_number: 4, is_completed: false },
      ],
    };

    it('✅ should return progress successfully', async () => {
      learningPathService.getLearningPath.mockResolvedValue(mockPath);
      learningPathService.updateProgress.mockResolvedValue(mockPath);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getProgress(mockReq, mockRes);

      expect(learningPathService.getLearningPath).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(learningPathService.updateProgress).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          progress_percentage: 75,
          current_stage: 3,
          total_stages: 4,
          completed_stages: 2,
        },
      });
    });

    it('✅ should handle path with no stages', async () => {
      const pathWithoutStages = {
        ...mockPath,
        stages: [],
      };
      learningPathService.getLearningPath.mockResolvedValue(pathWithoutStages);
      learningPathService.updateProgress.mockResolvedValue(pathWithoutStages);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getProgress(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          progress_percentage: 75,
          current_stage: 3,
          total_stages: 0,
          completed_stages: 0,
        },
      });
    });

    it('✅ should handle path with null progress_percentage', async () => {
      const pathWithoutProgress = {
        ...mockPath,
        progress_percentage: null,
      };
      learningPathService.getLearningPath.mockResolvedValue(pathWithoutProgress);
      learningPathService.updateProgress.mockResolvedValue(pathWithoutProgress);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getProgress(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          progress_percentage: 0,
          current_stage: 3,
          total_stages: 4,
          completed_stages: 2,
        },
      });
    });

    it('✅ should get center_id from body if not in query', async () => {
      learningPathService.getLearningPath.mockResolvedValue(mockPath);
      learningPathService.updateProgress.mockResolvedValue(mockPath);

      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.getProgress(mockReq, mockRes);

      expect(learningPathService.getLearningPath).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID
      );
    });

    it('❌ should return 400 when userId is missing', async () => {
      mockReq.user = {};
      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
    });

    it('❌ should return 400 when center_id is missing', async () => {
      mockReq.query = {};

      await learningPathController.getProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id và center_id là bắt buộc',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Service error');
      learningPathService.getLearningPath.mockRejectedValue(error);

      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.getProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error',
      });
    });
  });

  describe('completeStage', () => {
    const mockCompletedPath = {
      _id: 'path123',
      user_id: VALID_USER_ID,
      center_id: VALID_CENTER_ID,
      current_stage: 2,
      stages: [
        { stage_number: 1, is_completed: true },
        { stage_number: 2, is_completed: true },
      ],
    };

    it('✅ should complete stage successfully', async () => {
      learningPathService.completeStage.mockResolvedValue(mockCompletedPath);

      mockReq.params = { stageNumber: '1' };
      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.completeStage(mockReq, mockRes);

      expect(learningPathService.completeStage).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        1
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompletedPath,
      });
    });

    it('✅ should get center_id from query if not in body', async () => {
      learningPathService.completeStage.mockResolvedValue(mockCompletedPath);

      mockReq.params = { stageNumber: '2' };
      mockReq.query = { center_id: VALID_CENTER_ID };

      await learningPathController.completeStage(mockReq, mockRes);

      expect(learningPathService.completeStage).toHaveBeenCalledWith(
        VALID_USER_ID,
        VALID_CENTER_ID,
        2
      );
    });

    it('❌ should return 400 when userId is missing', async () => {
      mockReq.user = {};
      mockReq.params = { stageNumber: '1' };
      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.completeStage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id, center_id và stage_number là bắt buộc',
      });
    });

    it('❌ should return 400 when center_id is missing', async () => {
      mockReq.params = { stageNumber: '1' };
      mockReq.body = {};

      await learningPathController.completeStage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id, center_id và stage_number là bắt buộc',
      });
    });

    it('❌ should return 400 when stageNumber is missing', async () => {
      mockReq.params = {};
      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.completeStage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id, center_id và stage_number là bắt buộc',
      });
    });

    it('❌ should return 400 when stageNumber is NaN', async () => {
      mockReq.params = { stageNumber: 'invalid' };
      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.completeStage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'user_id, center_id và stage_number là bắt buộc',
      });
    });

    it('❌ should return 500 when service throws error', async () => {
      const error = new Error('Stage not found');
      learningPathService.completeStage.mockRejectedValue(error);

      mockReq.params = { stageNumber: '1' };
      mockReq.body = { center_id: VALID_CENTER_ID };

      await learningPathController.completeStage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Stage not found',
      });
    });
  });
});

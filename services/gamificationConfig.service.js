const gamificationConfigRepo = require("../repositories/gamificationConfig.repository");

class GamificationConfigService {
  // Lấy cấu hình gamification
  async getConfig() {
    try {
      const config = await gamificationConfigRepo.getConfig();
      return {
        is_enabled: config.is_enabled,
        points_per_task: config.points_per_task,
        points_deduction: config.points_deduction,
        description: config.description,
        updated_by: config.updated_by,
        updated_at: config.updated_at,
      };
    } catch (error) {
      throw new Error(`Lỗi lấy cấu hình gamification: ${error.message}`);
    }
  }

  // Kiểm tra gamification có được bật không
  async isEnabled() {
    try {
      const config = await gamificationConfigRepo.getConfig();
      return config.is_enabled === true;
    } catch (error) {
      // Nếu có lỗi, mặc định trả về false để an toàn
      console.error("❌ Lỗi kiểm tra gamification:", error);
      return false;
    }
  }

  // Bật gamification
  async enable(userId) {
    try {
      const config = await gamificationConfigRepo.toggle(true, userId);
      return {
        is_enabled: config.is_enabled,
        points_per_task: config.points_per_task,
        points_deduction: config.points_deduction,
        updated_by: config.updated_by,
        updated_at: config.updated_at,
      };
    } catch (error) {
      throw new Error(`Lỗi bật gamification: ${error.message}`);
    }
  }

  // Tắt gamification
  async disable(userId) {
    try {
      const config = await gamificationConfigRepo.toggle(false, userId);
      return {
        is_enabled: config.is_enabled,
        points_per_task: config.points_per_task,
        points_deduction: config.points_deduction,
        updated_by: config.updated_by,
        updated_at: config.updated_at,
      };
    } catch (error) {
      throw new Error(`Lỗi tắt gamification: ${error.message}`);
    }
  }

  // Toggle (bật nếu đang tắt, tắt nếu đang bật)
  async toggle(userId) {
    try {
      const config = await gamificationConfigRepo.getConfig();
      const newStatus = !config.is_enabled;
      const updatedConfig = await gamificationConfigRepo.toggle(
        newStatus,
        userId
      );
      return {
        is_enabled: updatedConfig.is_enabled,
        points_per_task: updatedConfig.points_per_task,
        points_deduction: updatedConfig.points_deduction,
        updated_by: updatedConfig.updated_by,
        updated_at: updatedConfig.updated_at,
      };
    } catch (error) {
      throw new Error(`Lỗi toggle gamification: ${error.message}`);
    }
  }

  // Cập nhật điểm thưởng
  async updatePoints(pointsPerTask, pointsDeduction, userId) {
    try {
      if (pointsPerTask < 0 || pointsDeduction < 0) {
        throw new Error("Điểm thưởng và điểm trừ phải >= 0");
      }

      const config = await gamificationConfigRepo.updatePoints(
        pointsPerTask,
        pointsDeduction,
        userId
      );
      return {
        is_enabled: config.is_enabled,
        points_per_task: config.points_per_task,
        points_deduction: config.points_deduction,
        updated_by: config.updated_by,
        updated_at: config.updated_at,
      };
    } catch (error) {
      throw new Error(`Lỗi cập nhật điểm: ${error.message}`);
    }
  }

  // Lấy điểm thưởng hiện tại
  async getPointsPerTask() {
    try {
      const config = await gamificationConfigRepo.getConfig();
      return config.points_per_task || 10;
    } catch (error) {
      return 10; // Default
    }
  }

  // Lấy điểm trừ hiện tại
  async getPointsDeduction() {
    try {
      const config = await gamificationConfigRepo.getConfig();
      return config.points_deduction || 10;
    } catch (error) {
      return 10; // Default
    }
  }
}

module.exports = new GamificationConfigService();


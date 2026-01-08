const GamificationConfig = require("../models/gamificationConfig.model");

class GamificationConfigRepository {
  // Lấy config (tự động tạo nếu chưa có)
  async getConfig() {
    return await GamificationConfig.getConfig();
  }

  // Cập nhật config
  async updateConfig(updateData) {
    let config = await GamificationConfig.findOne();
    
    if (!config) {
      // Tạo mới nếu chưa có
      config = await GamificationConfig.create({
        is_enabled: true,
        points_per_task: 10,
        points_deduction: 10,
        ...updateData,
      });
    } else {
      // Cập nhật
      Object.assign(config, updateData);
      await config.save();
    }
    
    return config;
  }

  // Toggle enabled/disabled
  async toggle(isEnabled, updatedBy = null) {
    const updateData = { is_enabled: isEnabled };
    if (updatedBy) {
      updateData.updated_by = updatedBy;
    }
    return await this.updateConfig(updateData);
  }

  // Cập nhật điểm thưởng
  async updatePoints(pointsPerTask, pointsDeduction, updatedBy = null) {
    const updateData = {
      points_per_task: pointsPerTask,
      points_deduction: pointsDeduction,
    };
    if (updatedBy) {
      updateData.updated_by = updatedBy;
    }
    return await this.updateConfig(updateData);
  }
}

module.exports = new GamificationConfigRepository();


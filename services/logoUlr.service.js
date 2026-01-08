const logoUlrRepo = require("../repositories/logoUlr.repository");

class LogoUlrService {
  async createLogoUlr(data) {
    // Nếu logo mới được đánh dấu là active, bỏ active ở các logo khác
    if (data.is_active) {
      await logoUlrRepo.unsetAllActive();
    }
    return logoUlrRepo.create(data);
  }

  async getLogoUlrById(id) {
    return logoUlrRepo.findById(id);
  }

  async getAllLogoUlrs(filter = {}, options = {}) {
    // default sort: newest first
    if (!options.sort) options.sort = { createdAt: -1 };
    return logoUlrRepo.find(filter, options);
  }

  async updateLogoUlr(id, data) {
    const updated = await logoUlrRepo.update(id, data);
    if (updated && data.is_active) {
      // Đảm bảo chỉ một logo được active
      await logoUlrRepo.unsetAllActive(updated._id);
    }
    return updated;
  }

  async deleteLogoUlr(id) {
    return logoUlrRepo.delete(id);
  }

  /**
   * Lấy logo hiện đang được sử dụng:
   * - Ưu tiên logo is_active = true (mới nhất)
   * - Nếu không có, lấy logo mới nhất trong DB
   */
  async getCurrentLogoUlr() {
    let logo = await logoUlrRepo.findOne(
      { is_active: true },
      { sort: { createdAt: -1 } }
    );
    if (!logo) {
      logo = await logoUlrRepo.findOne({}, { sort: { createdAt: -1 } });
    }
    return logo;
  }
}

module.exports = new LogoUlrService();

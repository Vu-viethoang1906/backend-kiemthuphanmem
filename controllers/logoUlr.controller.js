const logoUlrService = require("../services/logoUlr.service");

class LogoUlrController {
  /**
   * Tạo logo mới
   * body: { url: string, description?: string, is_active?: boolean }
   */
  async create(req, res) {
    try {
      const { url, description, is_active } = req.body;

      if (!url || typeof url !== "string") {
        return res.status(400).json({
          success: false,
          message: "Trường 'url' là bắt buộc và phải là chuỗi",
        });
      }

      const logo = await logoUlrService.createLogoUlr({
        url,
        description,
        is_active: Boolean(is_active),
      });

      res.json({ success: true, data: logo });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Upload file logo và tạo bản ghi logo mới
   * POST /api/logoUlr/upload
   * form-data: file (required), description?, is_active?
   */
  async uploadAndCreate(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File logo là bắt buộc",
        });
      }

      const filePath = `/api/uploads/logos/${req.file.filename}`;
      const { description, is_active } = req.body;

      const logo = await logoUlrService.createLogoUlr({
        url: filePath,
        description,
        is_active: is_active === "true" || is_active === true,
      });

      res.json({ success: true, data: logo });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const logo = await logoUlrService.getLogoUlrById(id);
      if (!logo) {
        return res
          .status(404)
          .json({ success: false, message: "Logo không tồn tại" });
      }
      res.json({ success: true, data: logo });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Lấy danh sách tất cả logo (mới nhất trước)
   */
  async getAll(req, res) {
    try {
      const logos = await logoUlrService.getAllLogoUlrs();
      res.json({ success: true, data: logos });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Lấy logo đang được sử dụng (hoặc logo mới nhất nếu chưa set active)
   * GET /api/logoUlr/current
   */
  async getCurrent(req, res) {
    try {
      const logo = await logoUlrService.getCurrentLogoUlr();
      if (!logo) {
        return res.json({ success: true, data: null });
      }
      res.json({ success: true, data: logo });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Cập nhật logo theo id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { url, description, is_active } = req.body;

      const data = {};
      if (url !== undefined) data.url = url;
      if (description !== undefined) data.description = description;
      if (is_active !== undefined) data.is_active = Boolean(is_active);

      const updatedLogo = await logoUlrService.updateLogoUlr(id, data);
      res.json({ success: true, data: updatedLogo });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Đặt logo là active (và bỏ active ở các logo khác)
   * POST /api/logoUlr/:id/activate
   */
  async activate(req, res) {
    try {
      const { id } = req.params;
      const updatedLogo = await logoUlrService.updateLogoUlr(id, {
        is_active: true,
      });
      res.json({
        success: true,
        message: "Đã chọn logo làm logo hiện tại",
        data: updatedLogo,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await logoUlrService.deleteLogoUlr(id);
      res.json({ success: true, message: "Xóa logo thành công" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new LogoUlrController();

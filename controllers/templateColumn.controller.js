const service = require('../services/templateColumn.service');

class TemplateColumnController {
  async list(req, res) {
    try {
      const rows = await service.findAll();
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async create(req, res) {
    try {
      const { template_id } = req.body;
      const user = req.user;
    
      const row = await service.create(template_id, req.body, user);
      res.status(201).json({ success: true, data: row });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const rows = await service.findAll();
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const row = await service.findById(req.params.id);
      res.json({ success: true, data: row });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async getByTemplate(req, res) {
    try {
      const rows = await service.findByTemplate(req.params.templateId);
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async update(req, res) {
    try {
      const user = req.user; // lấy từ middleware JWT
      const row = await service.update(req.params.id, req.body, user);
      res.json({ success: true, data: row });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      const user = req.user; // lấy từ middleware JWT
      await service.remove(req.params.id, user);
      res.json({ success: true, message: 'Xóa TemplateColumn thành công' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new TemplateColumnController();

const apiKeyService = require("../services/apiKey.service");

class ApiKeyController {
  async create(req, res) {
    try {
      const data = await apiKeyService.createApiKey(req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const data = await apiKeyService.getAllApiKeys();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const data = await apiKeyService.getApiKey(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  }
  async getByDescription(req, res) {
    try {
      const data = await apiKeyService.getApiKeyByDescription(
        req.body.description
      );
      res.json({ success: true, data });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  }
  async update(req, res) {
    try {
      const data = await apiKeyService.updateApiKey(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      await apiKeyService.deleteApiKey(req.params.id);
      res.json({ success: true, message: "Đã xoá API Key" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ApiKeyController();

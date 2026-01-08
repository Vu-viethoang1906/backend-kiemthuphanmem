const apiKeyRepo = require("../repositories/apiKey.repository");

class ApiKeyService {
  // Tạo API Key
  async createApiKey({ key, description }) {
    const saved = await apiKeyRepo.create({
      key,
      description,
    });

    return {
      id: saved._id,
      key, // trả thẳng key thật
      description,
    };
  }

  // Lấy danh sách API Key (trả full key)
  async getAllApiKeys() {
    const keys = await apiKeyRepo.findAll();
    return keys.map((k) => ({
      ...k.toObject(),
      key: k.key, // trả key thật
    }));
  }

  // Lấy chi tiết 1 API Key
  async getApiKey(id) {
    const key = await apiKeyRepo.findById(id);
    if (!key) throw new Error("Không tìm thấy API Key");

    return {
      ...key.toObject(),
      key: key.key,
    };
  }

  // Lấy key theo mô tả
  async getApiKeyByDescription(description) {
    const key = await apiKeyRepo.findByDescription(description);
    if (!key)
      throw new Error(
        `Không tìm thấy API Key với description '${description}'`
      );
    return key.key;
  }

  // Cập nhật description hoặc key
  async updateApiKey(id, data) {
    const updated = await apiKeyRepo.update(id, data);
    if (!updated) throw new Error("Không tìm thấy API Key");

    return {
      ...updated.toObject(),
      key: updated.key,
    };
  }

  // Xóa API Key
  async deleteApiKey(id) {
    const deleted = await apiKeyRepo.delete(id);
    if (!deleted) throw new Error("Không tìm thấy API Key");
    return deleted;
  }
}

module.exports = new ApiKeyService();

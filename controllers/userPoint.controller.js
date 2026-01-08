const userPointService = require('../services/userPoint.service');

// Lấy tất cả UserPoints
exports.getAllUserPoints = async (req, res) => {
  try {
    const points = await userPointService.viewAll();
    res.json({ success: true, count: points.length, data: points });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy điểm của 1 user
exports.getByUser = async (req, res) => {
  try {
    const points = await userPointService.getByUser(req.params.userId);
    res.json(points);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy điểm theo user và center
exports.getByUserAndCenter = async (req, res) => {
  try {
    const record = await userPointService.getByUserAndCenter(req.params.userId, req.params.centerId);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Tạo mới
exports.createUserPoint = async (req, res) => {
  try {
    const newRecord = await userPointService.create(req.body);
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Cập nhật
exports.updateUserPoint = async (req, res) => {
  try {
    const updated = await userPointService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Record not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Xóa
exports.deleteUserPoint = async (req, res) => {
  try {
    const deleted = await userPointService.delete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

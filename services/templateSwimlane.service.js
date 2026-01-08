const mongoose = require('mongoose');
const TemplateSwimlane = require('../models/templateSwimlane.model');
const Template = require('../models/template.model');
const templateSwimlaneRepo = require('../repositories/templateSwimlane.repository');

class TemplateSwimlaneService {
  // Lấy tất cả swimlane của template
  async list(template_id) {
    if (!mongoose.Types.ObjectId.isValid(template_id)) throw new Error('template_id không hợp lệ');
    return TemplateSwimlane.find({ template_id }).sort({ order_index: 1 }).lean();
  }

  // Kiểm tra quyền: creator, Admin, System_Manager
  checkPermission(template, user) {
    const allowedRoles = ['admin', 'System_Manager'];
    const isCreator = template.created_by.toString() === user.id.toString();
    const hasRole = user.roles.some(r => allowedRoles.includes(r));
    if (!isCreator && !hasRole) {
      throw new Error('Không có quyền thực hiện thao tác này');
    }
  }

  // Tạo swimlane
  async create(template_id, { name, order_index }, user) {
    if (!mongoose.Types.ObjectId.isValid(template_id)) throw new Error('template_id không hợp lệ');
    if (!name || !name.trim()) throw new Error('name là bắt buộc');

    const template = await Template.findById(template_id).lean();
    if (!template) throw new Error('Template không tồn tại');

    this.checkPermission(template, user);

    const doc = await TemplateSwimlane.create({
      template_id,
      name: name.trim(),
      order_index: Number(order_index) || 0,
    });
    return doc;
  }

  // Cập nhật swimlane
  async update(id, data, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('id không hợp lệ');

    const swimlane = await TemplateSwimlane.findById(id).lean();
    if (!swimlane) throw new Error('Không tìm thấy TemplateSwimlane');

    const template = await Template.findById(swimlane.template_id).lean();
    if (!template) throw new Error('Template không tồn tại');

    this.checkPermission(template, user);

    const update = {};
    if (typeof data.name === 'string') update.name = data.name.trim();
    if (data.order_index !== undefined) update.order_index = Number(data.order_index) || 0;

    const doc = await TemplateSwimlane.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!doc) throw new Error('Cập nhật thất bại');
    return doc;
  }

  // Xóa swimlane (soft delete)
  async remove(id, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('id không hợp lệ');

    const swimlane = await TemplateSwimlane.findById(id).lean();
    if (!swimlane) throw new Error('Không tìm thấy TemplateSwimlane');

    const template = await Template.findById(swimlane.template_id).lean();
    if (!template) throw new Error('Template không tồn tại');

    this.checkPermission(template, user);

    const res = await templateSwimlaneRepo.softDelete(id);
    if (!res) throw new Error('Xóa thất bại');
    return true;
  }

  // Các phương thức đọc dữ liệu
  async findAll() {
    return TemplateSwimlane.find().sort({ order_index: 1 }).lean();
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('id không hợp lệ');
    const doc = await TemplateSwimlane.findById(id).lean();
    if (!doc) throw new Error('Không tìm thấy TemplateSwimlane');
    return doc;
  }

  async findByTemplate(templateId) {
    if (!mongoose.Types.ObjectId.isValid(templateId)) throw new Error('templateId không hợp lệ');
    return TemplateSwimlane.find({ template_id: templateId }).sort({ order_index: 1 }).lean();
  }
}

module.exports = new TemplateSwimlaneService();

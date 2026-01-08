const mongoose = require('mongoose');
const TemplateColumn = require('../models/templateColumn.model');
const Template = require('../models/template.model');
const templateColumnRepo = require('../repositories/templateColumn.repository');

class TemplateColumnService {
  async list(template_id) {
    if (!mongoose.Types.ObjectId.isValid(template_id)) throw new Error('template_id không hợp lệ');
    return TemplateColumn.find({ template_id }).sort({ order_index: 1 }).lean();
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

  // Tạo column
  async create(template_id, { name, order_index }, user) {
    if (!mongoose.Types.ObjectId.isValid(template_id)) throw new Error('template_id không hợp lệ');
    if (!name || !name.trim()) throw new Error('name là bắt buộc');

    const template = await Template.findById(template_id).lean();
    if (!template) throw new Error('Template không tồn tại');

    this.checkPermission(template, user);

    const doc = await TemplateColumn.create({
      template_id,
      name: name.trim(),
      order_index: Number(order_index) || 0,
    });

    return doc;
  }

  // Cập nhật column
  async update(id, data, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('id không hợp lệ');

    const column = await TemplateColumn.findById(id).lean();
    if (!column) throw new Error('Không tìm thấy TemplateColumn');

    const template = await Template.findById(column.template_id).lean();
    if (!template) throw new Error('Template không tồn tại');

    this.checkPermission(template, user);

    const update = {};
    if (typeof data.name === 'string') update.name = data.name.trim();
    if (data.order_index !== undefined) update.order_index = Number(data.order_index) || 0;

    const doc = await TemplateColumn.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!doc) throw new Error('Cập nhật thất bại');
    return doc;
  }

  // Xóa column (soft delete)
  async remove(id, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('id không hợp lệ');

    const column = await TemplateColumn.findById(id).lean();
    if (!column) throw new Error('Không tìm thấy TemplateColumn');

    const template = await Template.findById(column.template_id).lean();
    if (!template) throw new Error('Template không tồn tại');

    this.checkPermission(template, user);

    const res = await templateColumnRepo.softDelete(id);
    if (!res) throw new Error('Xóa thất bại');
    return true;
  }

  // Lấy tất cả column
  async findAll() {
    return TemplateColumn.find().sort({ order_index: 1 }).lean();
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('id không hợp lệ');
    const doc = await TemplateColumn.findById(id).lean();
    if (!doc) throw new Error('Không tìm thấy TemplateColumn');
    return doc;
  }

  async findByTemplate(templateId) {
    if (!mongoose.Types.ObjectId.isValid(templateId)) throw new Error('templateId không hợp lệ');
    return TemplateColumn.find({ template_id: templateId }).sort({ order_index: 1 }).lean();
  }
}

module.exports = new TemplateColumnService();

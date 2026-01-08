const swimlaneService = require('../services/swimlane.service');

class SwimlaneController {
  async create(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }
      const { board_id, name, order } = req.body;
      const swimlane = await swimlaneService.createSwimlane({ board_id, name, order, userId });
      res.status(201).json({ success: true, data: swimlane });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getOne(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }
      const swimlane = await swimlaneService.getSwimlane(req.params.id, userId);
      if (!swimlane) return res.status(404).json({ success: false, message: 'Swimlane không tồn tại' });
      res.json({ success: true, data: swimlane });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getByBoard(req, res) {
    try {
      const userId = req.user?.id;
          const roles = req.user?.roles || [];
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }
      const swimlanes = await swimlaneService.getSwimlanesByBoard(req.params.boardId, userId,roles);
      res.json({ success: true, data: swimlanes });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }
      const swimlane = await swimlaneService.updateSwimlane(req.params.id, req.body, userId);
      if (!swimlane) return res.status(404).json({ success: false, message: 'Swimlane không tồn tại' });
      res.json({ success: true, data: swimlane });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }
      const swimlane = await swimlaneService.deleteSwimlane(req.params.id, userId);
      if (!swimlane) return res.status(404).json({ success: false, message: 'Swimlane không tồn tại' });
      res.json({ success: true, message: 'Xóa swimlane thành công' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Thu gọn/mở rộng Swimlane - Story 26
  async toggleCollapse(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }
      
      const { id } = req.params;
      const { collapsed } = req.body;
      
      if (typeof collapsed !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          message: 'collapsed phải là boolean (true/false)' 
        });
      }

      const swimlane = await swimlaneService.toggleCollapse(id, collapsed, userId);
      if (!swimlane) return res.status(404).json({ success: false, message: 'Swimlane không tồn tại' });
      
      res.json({ 
        success: true, 
        message: `Swimlane đã được ${collapsed ? 'thu gọn' : 'mở rộng'}`,
        data: swimlane 
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Reorder Swimlanes
 // Reorder Swimlanes
// controllers/swimlane.controller.js
async reorder(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
    }

    const { boardId } = req.params;
    const { ids } = req.body; // 👈 Frontend gửi { ids: [...] }

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu gửi lên phải có dạng { ids: [array các swimlaneId] }',
      });
    }

    const result = await swimlaneService.reorderSwimlanes(boardId, ids, userId);

    res.json({
      success: true,
      message: 'Sắp xếp lại Swimlanes thành công',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

}
module.exports = new SwimlaneController();

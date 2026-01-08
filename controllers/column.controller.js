const columnService = require('../services/column.service');

class ColumnController {
  async create(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }
      const { board_id, name, order , isdone} = req.body;
      const column = await columnService.createColumn({ board_id, name, order, userId, isdone });
      res.status(201).json({ success: true, data: column });
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
      const column = await columnService.getColumn(req.params.id, userId);
      if (!column) return res.status(404).json({ success: false, message: 'Column không tồn tại' });
      res.json({ success: true, data: column });
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
      const columns = await columnService.getColumnsByBoard(req.params.boardId, userId ,roles);
      res.json({ success: true, data: columns });
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
      const column = await columnService.updateColumn(req.params.id, req.body, userId);
      if (!column) return res.status(404).json({ success: false, message: 'Column không tồn tại' });
      res.json({ success: true, data: column });
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
      const column = await columnService.deleteColumn(req.params.id, userId);
      if (!column) return res.status(404).json({ success: false, message: 'Column không tồn tại' });
      res.json({ success: true, message: 'Xóa column thành công' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Reorder Columns
  async reorder(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
      }
      
      const { boardId } = req.params;
      const { columns } = req.body; // Array of {id, order}
      
      if (!Array.isArray(columns)) {
        return res.status(400).json({ 
          success: false, 
          message: 'columns phải là array' 
        });
      }

      const result = await columnService.reorderColumns(boardId, columns, userId);
      res.json({ 
        success: true, 
        message: 'Sắp xếp lại columns thành công',
        data: result 
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async move (req , res){
    try {
      const iduser = req.user.id;
      if(!iduser) return;

      const idboard  = req.params.id;
      const data = req.body;
      const result = await columnService.moveService(iduser , idboard ,data);
     res.json(
      {
        success: true,
        data : result
      }
     )
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async ColumnIsDone(req , res){
    try {
        const idColumn = req.params.idcolumn;
       const idBoard = req.params.idBoard;
        const iduser = req.user?.id || req.user?._id;
  // cập nhật nhưng board nào mà mình là người tạo 
       const result = columnService.updateIsDone(idColumn, idBoard ,iduser);
   res.json(
      {
        success: true,
        data : result
      }
     )
  
    } catch (error) {
            res.status(400).json({ success: false, message: error.message });
    };
  
  }
}



module.exports = new ColumnController();

const backlogItemService = require('../services/backlogItem.service');

class BacklogItemController {
  // GET /api/backlog/items
  async list(req, res) {
    try {
      const userId = req.user?.id;
      const { priority, assigned_to, search } = req.query;

      const items = await backlogItemService.listForUser(userId, {
        priority,
        assigned_to,
        search,
      });

      res.json({ success: true, data: items });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // POST /api/backlog/items
  async create(req, res) {
    try {
      const userId = req.user?.id;
      const item = await backlogItemService.createForUser(userId, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PUT /api/backlog/items/:id
  async update(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const item = await backlogItemService.updateForUser(userId, id, req.body);
      res.json({ success: true, data: item });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/backlog/items/:id
  async remove(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      await backlogItemService.softDeleteForUser(userId, id);
      res.json({ success: true, message: 'Deleted' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PATCH /api/backlog/items/reorder
  async reorder(req, res) {
    try {
      const userId = req.user?.id;
      const { items } = req.body;
      await backlogItemService.reorderForUser(userId, items);
      res.json({ success: true, message: 'Reordered' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // POST /api/backlog/items/convert
  async convert(req, res) {
    try {
      const userId = req.user?.id;
      const { itemIds, boardId, createWeeklyBoard, weekly } = req.body;

      const result = await backlogItemService.convertItemsToBoardTasks(userId, {
        itemIds,
        boardId,
        createWeeklyBoard,
        weekly,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new BacklogItemController();


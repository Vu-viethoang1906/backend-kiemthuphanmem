const express = require("express");
const router = express.Router();
const backlogController = require("../controllers/backlog.controller");
const backlogItemController = require("../controllers/backlogItem.controller");
const { authenticateAny } = require("../middlewares/auth");

// Apply auth middleware to all routes
router.use(authenticateAny);

// ==================== BACKLOG ITEMS (GLOBAL) ====================
// Product backlog items owned by current user
router.get("/items", backlogItemController.list);
router.post("/items", backlogItemController.create);
router.put("/items/:id", backlogItemController.update);
router.delete("/items/:id", backlogItemController.remove);
router.patch("/items/reorder", backlogItemController.reorder);
router.post("/items/convert", backlogItemController.convert);

// Get backlog tasks
router.get("/board/:boardId", backlogController.getBacklog);

// Reorder backlog items
router.patch("/reorder", backlogController.reorderBacklog);

// Update single task (points, priority, etc.)
router.patch("/task/:taskId", backlogController.updateTask);

// Move task to/from sprint
router.patch("/task/:taskId/sprint", backlogController.moveTaskToSprint);

module.exports = router;

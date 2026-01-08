const express = require("express");
const router = express.Router();
const historyTaskController = require("../controllers/historyTask.controller");
const { authenticateAny, authorizeAny } = require("../middlewares/auth");
// CRUD routes
router.post(
  "/",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_LOG_TASK "),
  historyTaskController.create.bind(historyTaskController)
);
router.get(
  "/",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_LOG_TASK"),
  historyTaskController.getAll.bind(historyTaskController)
);
router.get(
  "/:id",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_LOG_TASK"),
  historyTaskController.getById.bind(historyTaskController)
);
router.put(
  "/:id",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_LOG_TASK"),
  historyTaskController.update.bind(historyTaskController)
);
router.delete(
  "/:id",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_LOG_TASK"),
  historyTaskController.delete.bind(historyTaskController)
);
router.get(
  "/task/:taskId/history",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_LOG_TASK"),

  historyTaskController.getHistoryByTaskId.bind(historyTaskController)
);
router.get(
  "/board/:boardId/history",
  authenticateAny,
  authorizeAny("admin System_Manager VIEW_LOG_TASK"),

  historyTaskController.getHistoryByBoardTasks.bind(historyTaskController)
);

module.exports = router;

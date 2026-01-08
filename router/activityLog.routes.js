const express = require("express");
const router = express.Router();
const activityLogController = require("../controllers/activityLog.controller");
const { authenticateAny, authorizeAny } = require("../middlewares/auth");

// CRUD routes
router.post(
  "/",
  authenticateAny,
  activityLogController.create.bind(activityLogController)
);

router.get(
  "/",
  authenticateAny,
  activityLogController.getAll.bind(activityLogController)
);

// Filter routes - đặt trước route :id để tránh conflict
router.get(
  "/user/:userId",
  authenticateAny,
  activityLogController.getByUserId.bind(activityLogController)
);

router.get(
  "/date-range",
  authenticateAny,
  activityLogController.getByDateRange.bind(activityLogController)
);

router.get(
  "/:id",
  authenticateAny,
  activityLogController.getById.bind(activityLogController)
);

router.put(
  "/:id",
  authenticateAny,
  activityLogController.update.bind(activityLogController)
);

router.delete(
  "/:id",
  authenticateAny,
  activityLogController.delete.bind(activityLogController)
);

module.exports = router;

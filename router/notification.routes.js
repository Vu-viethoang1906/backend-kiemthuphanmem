// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");

// POST /api/notifications
router.post("/", notificationController.create);

// GET /api/notifications/:userId
router.get("/:userId", notificationController.getByUser);

// PUT /api/notifications/read/:id
router.put("/read/:id", notificationController.markAsRead);

// DELETE /api/notifications/:id
router.delete("/:id", notificationController.delete);

router.delete("/delete/:idUser", notificationController.deleteByUser);

module.exports = router;

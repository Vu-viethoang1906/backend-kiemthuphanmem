const express = require("express");
const centerController = require("../controllers/center.controller");

const router = express.Router();
const { authenticateAny, authorizeAny } = require("../middlewares/auth");
router.get("/", authenticateAny, centerController.getAllCenters);
router.get("/:id", authenticateAny, centerController.getCenterById);
router.post(
  "/",
  authenticateAny,
  authorizeAny("admin System_Manager"),
  centerController.createCenter
);
router.put(
  "/:id",
  authenticateAny,
  authorizeAny("admin System_Manager"),
  centerController.updateCenter
);
router.delete(
  "/:id",
  authenticateAny,
  authorizeAny("admin System_Manager"),
  centerController.deleteCenter
);

module.exports = router;

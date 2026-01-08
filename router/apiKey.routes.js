const express = require("express");
const router = express.Router();
const apiKeyController = require("../controllers/apiKey.controller");
const { authenticateAny, authorizeAny } = require("../middlewares/auth");
// CRUD API Key
router.post(
  "/",
  //   authenticateAny,
  //   authorizeAny("System_Manager"),
  apiKeyController.create
);
router.get(
  "/",
  authenticateAny,
  authorizeAny("System_Manager"),
  apiKeyController.getAll
);
router.get(
  "/:id",
  authenticateAny,
  authorizeAny("System_Manager"),
  apiKeyController.getById
);
router.post(
  "/description",
  //   authenticateAny,
  //   authorizeAny("System_Manager"),
  apiKeyController.getByDescription
);
router.put(
  "/:id",
  authenticateAny,
  authorizeAny("System_Manager"),
  apiKeyController.update
);
router.delete(
  "/:id",
  authenticateAny,
  authorizeAny("System_Manager"),
  apiKeyController.delete
);

module.exports = router;

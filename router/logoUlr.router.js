const express = require("express");
const router = express.Router();
const logoUlrController = require("../controllers/logoUlr.controller");
const {
  authenticateAny,
  adminAny,
  authorizeAny,
} = require("../middlewares/auth");
const { uploadLogo } = require("../config/multer");

// Public: lấy logo đang được sử dụng
router.get("/current", logoUlrController.getCurrent.bind(logoUlrController));

// Admin: quản lý logo
router.post(
  "/",
  authenticateAny,

  authorizeAny("System_Manager"),
  logoUlrController.create.bind(logoUlrController)
);
router.post(
  "/upload",
  authenticateAny,
  authorizeAny("System_Manager"),
  uploadLogo.single("file"),
  logoUlrController.uploadAndCreate.bind(logoUlrController)
);
router.get(
  "/",
  authenticateAny,
  authorizeAny("System_Manager"),
  logoUlrController.getAll.bind(logoUlrController)
);
router.get(
  "/:id",
  authenticateAny,
  authorizeAny("System_Manager"),
  logoUlrController.getById.bind(logoUlrController)
);
router.put(
  "/:id",
  authenticateAny,
  authorizeAny("System_Manager"),
  logoUlrController.update.bind(logoUlrController)
);
router.post(
  "/:id/activate",
  authenticateAny,
  authorizeAny("System_Manager"),
  logoUlrController.activate.bind(logoUlrController)
);
router.delete(
  "/:id",
  authenticateAny,
  authorizeAny("System_Manager"),
  logoUlrController.delete.bind(logoUlrController)
);

module.exports = router;

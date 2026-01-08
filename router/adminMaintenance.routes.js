const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const maintenanceFile = path.join(
  __dirname,
  "../middlewares/tmp/maintenance.enable"
);

// Bật chế độ bảo trì
router.post("/enable", (req, res) => {
  fs.writeFileSync(maintenanceFile, "MAINTENANCE MODE ON");
  res.json({ message: "Đã bật chế độ bảo trì" });
});

// Tắt chế độ bảo trì
router.post("/disable", (req, res) => {
  if (fs.existsSync(maintenanceFile)) {
    fs.unlinkSync(maintenanceFile);
  }
  res.json({ message: "Đã tắt chế độ bảo trì" });
});

// Lấy trạng thái
router.get("/status", (req, res) => {
  const isMaintenance = fs.existsSync(maintenanceFile);
  res.json({
    maintenance: isMaintenance,
  });
});

module.exports = router;

const fs = require("fs");
const pathModule = require("path");

// ví dụ folder tmp trong project
const path = pathModule.join(__dirname, "tmp", "maintenance.enable");

function maintenanceMiddleware(req, res, next) {
  if (fs.existsSync(path)) {
    return res.status(503).json({
      message: "Hệ thống đang bảo trì, vui lòng thử lại sau.",
    });
  }
  next();
}

module.exports = maintenanceMiddleware;

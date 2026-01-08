const path = require("node:path");
const fs = require("node:fs");
const multer = require("multer");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const UPLOADS_DIR = path.resolve(__dirname, "../uploads");
const IMPORTS_DIR = path.resolve(UPLOADS_DIR, "imports");
const ATTACH_TASK_DIR = path.resolve(UPLOADS_DIR, "attachments/tasks");
const ATTACH_COMMENT_DIR = path.resolve(UPLOADS_DIR, "attachments/comments");
const LOGO_DIR = path.resolve(UPLOADS_DIR, "logos");
const SIDEBAR_ICON_DIR = path.resolve(UPLOADS_DIR, "icons");

// Tạo các thư mục trước khi upload
ensureDir(UPLOADS_DIR);
ensureDir(IMPORTS_DIR);
ensureDir(ATTACH_TASK_DIR);
ensureDir(ATTACH_COMMENT_DIR);
ensureDir(LOGO_DIR);
ensureDir(SIDEBAR_ICON_DIR);

// ===== 1️⃣ Upload avatar người dùng =====
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${req.user?.id || "guest"}_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
    const allowedExts = [".jpeg", ".jpg", ".png"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép file ảnh JPG/PNG"));
    }
  },
});

// ===== 2️⃣ Upload file import Task =====
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMPORTS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/json",
    ];
    const allowedExts = [".xlsx", ".xls", ".csv", ".json"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép file .xlsx, .xls, .csv hoặc .json"));
    }
  },
});

const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // up file cho Task
    if (req.params.taskId) cb(null, ATTACH_TASK_DIR);
    // up file cho Comment
    else if (req.params.commentId) cb(null, ATTACH_COMMENT_DIR);
    else cb(new Error("Thiếu taskId hoặc commentId trong URL!"));
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/x-rar-compressed",
    ];
    const allowedExts = [
      ".jpeg",
      ".jpg",
      ".png",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".txt",
      ".zip",
      ".rar",
    ];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Loại file không được hỗ trợ!"));
    }
  },
});

// ===== 4️⃣ Upload logo ứng dụng =====
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LOGO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `logo_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/svg+xml",
    ];
    const allowedExts = [".jpeg", ".jpg", ".png", ".svg"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép file ảnh JPG/PNG/SVG cho logo"));
    }
  },
});
// ===== 5️⃣ Upload Sidebar Icon =====
const sidebarIconStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SIDEBAR_ICON_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `icon_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const uploadSidebarIcon = multer({
  storage: sidebarIconStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/svg+xml",
    ];
    const allowedExts = [".jpeg", ".jpg", ".png", ".svg"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép file ảnh JPG/PNG/SVG cho icon sidebar"));
    }
  },
});

module.exports = {
  uploadAvatar,
  uploadFile,
  uploadAttachment,
  uploadLogo,
  uploadSidebarIcon,
};

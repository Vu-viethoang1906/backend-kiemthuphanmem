const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Tạo thư mục nếu chưa tồn tại
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const COMMENTS_DIR = path.resolve(__dirname, "../uploads/comments");
ensureDir(COMMENTS_DIR);

// Export functions for testing
const getDestination = (req, file, cb) => {
    const commentId = String(req.params.commentId || "unknown");
    const userId = String(req.user?.id || "guest");

    const dir = path.join(COMMENTS_DIR, commentId, userId);
    ensureDir(dir);

    cb(null, dir);
};

const getFilename = (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
};

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error("File không hợp lệ!"));
};

const storage = multer.diskStorage({
  destination: getDestination,
  filename: getFilename,
});

const uploadCommentAttachment = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: fileFilter,
}).single("file");

// Export for testing
module.exports = uploadCommentAttachment;
if (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined) {
  module.exports.getDestination = getDestination;
  module.exports.getFilename = getFilename;
  module.exports.fileFilter = fileFilter;
  module.exports.ensureDir = ensureDir;
}

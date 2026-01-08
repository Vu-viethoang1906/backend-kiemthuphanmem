const express = require('express');
const router = express.Router();
const User = require('../models/usersModel');
const upload = require('../config/multer'); // file multer config
const fs = require('fs');
const path = require('path');
const { authenticateAny, authorizeAny, adminAny } = require('../middlewares/auth');
const { uploadAvatar, uploadFile } = require('../config/multer');
// Upload avatar
router.post('/users/:id/avatar', authenticateAny ,uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Nếu user cũ đã có avatar, xóa file cũ (optional)
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    if (!req.file) return res.status(400).json({ message: 'File is required' });

    if (user.avatar_url) {
      // We only want to delete files that are under the uploads directory
      const uploadsDir = path.resolve(__dirname, '..', 'uploads');
      const oldRelative = user.avatar_url.startsWith('/') ? user.avatar_url.slice(1) : user.avatar_url; // e.g. uploads/old.png
      const oldPath = path.resolve(process.cwd(), oldRelative);
      // Sanity check: ensure the file to be deleted is inside uploadsDir
      if (oldPath.indexOf(uploadsDir) === 0) {
        if (fs.existsSync(oldPath)) {
          try {
            await fs.promises.unlink(oldPath);
          } catch (e) {
            // Don't fail the whole request if we can't delete the old avatar
            console.error('Failed to remove old avatar', e);
          }
        }
      }
    }

    // Lưu đường dẫn mới vào DB
    const avatarPath = `/uploads/${req.file.filename}`;
    user.avatar_url = avatarPath;
    await user.save();

    res.json({ message: 'Cập nhật avatar thành công', avatar_url: avatarPath });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/users/:id/avatar', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('avatar_url');
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    if (!user.avatar_url) {
      return res.json({ avatar_url: '/uploads/default-avatar.png' });
    }

    res.json({ avatar_url: user.avatar_url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;

const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { importTasks } = require('../controllers/taskImport.controller');
const { uploadAvatar, uploadFile } = require('../config/multer');
const { authenticateAny, authorizeAny } = require('../middlewares/auth');
router.post('/import',authenticateAny , uploadFile.single('file'), importTasks);

module.exports = router;

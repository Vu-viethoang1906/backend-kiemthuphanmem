const express = require('express');
const userRoleController = require('../controllers/userRole.controller');

const router = express.Router();
const { authenticateAny, authorizeAny } = require('../middlewares/auth');

// Admin only for managing user-role assignments
router.get('/all', authenticateAny, authorizeAny('admin System_Manager ROLE_VIEW '), userRoleController.SelectAlluserRole);
router.get('/user/:userId', authenticateAny, authorizeAny('admin System_Manager ROLE_VIEW'), userRoleController.getRoleByUser);
router.post('/', authenticateAny, authorizeAny('admin System_Manager ROLE_CREATE '), userRoleController.createUserRole);
router.put('/:id', authenticateAny, authorizeAny('admin System_Manager ROLE_UPDATE'), userRoleController.updateUserRole);
router.delete('/:id', authenticateAny, authorizeAny('admin System_Manager ROLE_DELETE'), userRoleController.deleteUserRole);
router.delete('/user/:userId', authenticateAny, authorizeAny('admin System_Manager ROLE_DELETE'), userRoleController.deleteRolesByUser);

// lấy dánh sách permission theo id của user
router.get('/permissionUser',userRoleController.getpermission);




module.exports = router;

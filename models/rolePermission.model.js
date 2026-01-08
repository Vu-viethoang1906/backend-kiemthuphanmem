  const mongoose = require('mongoose');
  const { Schema } = mongoose;

const RolePermissionSchema = new mongoose.Schema({
  role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
  permission_id: { type: Schema.Types.ObjectId, ref: 'Permission', required: true, index: true },
 
}, { collection: 'RolePermissions', timestamps: true });


  module.exports = mongoose.model('RolePermission', RolePermissionSchema);

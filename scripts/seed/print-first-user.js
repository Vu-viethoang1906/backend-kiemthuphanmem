const mongoose = require("mongoose");
require("dotenv").config();

// Models (paths relative to this file: scripts/seed)
const Permission = require("../../models/Permission.model");
const Role = require("../../models/role.model");
const RolePermission = require("../../models/rolePermission.model");
const User = require("../../models/usersModel");
const UserRole = require("../../models/userRole.model");

function normalizeDoc(doc) {
  if (!doc) return doc;
  const obj = { ...doc };
  // convert _id to string
  if (obj._id) obj._id = obj._id.toString();
  return obj;
}

async function main() {
  const uri =
    process.env.MONGO_URI ||
    "mongodb://mongodb:27017/ken_db?replicaSet=rs0&retryWrites=true&w=majority";
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Find first user by created_at or fallback to any
  const firstUser = await User.findOne().sort({ created_at: 1 }).lean();
  if (!firstUser) {
    await mongoose.disconnect();
    process.exit(0);
  }

  // Find roles assigned to user
  const userRoles = await UserRole.find({ user_id: firstUser._id }).lean();
  if (!userRoles || userRoles.length === 0) {
  } else {
  }

  const roleIds = userRoles.map((r) => r.role_id);
  const roles = await Role.find({ _id: { $in: roleIds } }).lean();

  // Find role-permissions
  const rolePerms = await RolePermission.find({
    role_id: { $in: roleIds },
  }).lean();
  const permIds = rolePerms.map((rp) => rp.permission_id);
  const permissions = await Permission.find({ _id: { $in: permIds } }).lean();

  // Map permissions by id
  const permMap = {};
  permissions.forEach((p) => {
    permMap[p._id.toString()] = p;
  });

  // Build output
  const rolesWithPermissions = roles.map((r) => {
    const rps = rolePerms.filter(
      (rp) => rp.role_id.toString() === r._id.toString()
    );
    const perms = rps
      .map((rp) => permMap[rp.permission_id.toString()])
      .filter(Boolean);
    return {
      role: r,
      permissions: perms,
    };
  });
  const uniquePerms = {};
  permissions.forEach((p) => {
    uniquePerms[p.code || p.name || p._id] = p;
  });

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});

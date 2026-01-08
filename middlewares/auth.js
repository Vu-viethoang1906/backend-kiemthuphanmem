const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
require("dotenv").config();
const tokenBlacklist = require("./tokenBlacklist");
const userService = require("../services/user.service");
const userRoleService = require("../services/userRole.service");
const roleService = require("../services/role.service");
const rolePermissionService = require("../services/rolePermission.service");
const axios = require("axios");
const permissionService = require("../services/permission.service");

const authenticateAny = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ hoặc không cung cấp",
      });
    }

    const token = authHeader.split(" ")[1];

    // 🔒 Kiểm tra token có bị thu hồi chưa
    if (tokenBlacklist.has(token)) {
      return res
        .status(401)
        .json({ success: false, message: "Token đã bị đăng xuất" });
    }

    let user = null;

    // 1️⃣ Thử xác thực bằng Local JWT trước
    try {
      const decodedLocal = jwt.verify(token, process.env.JWT_SECRET);

      user = await userService.getUserById(decodedLocal.userId);
      const dbRoles = await userRoleService.getRoles(user._id);
      const roleNames =
        dbRoles?.map((r) => r.role_id?.name).filter(Boolean) || [];

      req.user = {
        id: user._id,
        email: user.email,
        username: user.username,
        roles: roleNames,
      };
      return next();
    } catch (errLocal) {
      // Nếu Local JWT thất bại → thử Keycloak
    }

    // 2️⃣ Xác thực bằng Keycloak (qua userinfo)
    try {
      const userInfoRes = await axios.get(
        `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userInfo = userInfoRes.data;

      if (!userInfo || !userInfo.preferred_username) {
        return res
          .status(400)
          .json({ message: "Không thể lấy thông tin người dùng từ Keycloak" });
      }

      // Kiểm tra user trong DB
      user = await userService.getUserByUsername(userInfo.preferred_username);

      if (!user) {
        user = await userService.createUserSSO({
          username: userInfo.preferred_username,
          email:
            userInfo.email || `${userInfo.preferred_username}@keycloak.local`,
          full_name: userInfo.name || userInfo.preferred_username,
          idSSO: userInfo.sub,
        });

        // Gán quyền mặc định "user"
        const roleId = await roleService.getIdByName("user");
        if (roleId) {
          const existing = await userRoleService.findByUserAndRole(
            user._id,
            roleId
          );
          if (!existing)
            await userRoleService.create({
              user_id: user._id,
              role_id: roleId,
            });
        }
      }

      const dbRoles = await userRoleService.getRoles(user._id);
      req.user = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        idSSO: user.idSSO,
        roles: dbRoles?.map((r) => r.role_id?.name).filter(Boolean) || [],
      };

      return next();
    } catch (errKC) {
      return res
        .status(401)
        .json({ success: false, message: "Token không hợp lệ hoặc hết hạn" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Middleware kiểm tra quyền
 */
const authorizeAny = (allowed) => async (req, res, next) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Chưa xác thực" });

    // Chuẩn hóa allowed thành mảng
    let allowedCodes = [];
    if (typeof allowed === "string") {
      allowedCodes = allowed.split(" ").map((s) => s.trim());
    } else if (Array.isArray(allowed)) {
      allowedCodes = allowed;
    }

    const { id, roles } = req.user;

    // 1️⃣ Kiểm tra role trực tiếp
    if (roles && roles.some((r) => allowedCodes.includes(r))) {
      return next();
    }

    const userRoles = await userRoleService.getRoles(id);
    const roleIds = userRoles.map((r) => r.role_id?._id).filter(Boolean);

    const rolePermissions = await rolePermissionService.getByRoleIds(roleIds);
    const permissionIds = rolePermissions
      .map((rp) => rp.permission_id?._id)
      .filter(Boolean);

    const permissions = await permissionService.getByIds(permissionIds);
    const codes = permissions.map((p) => p.code);

    if (codes.some((c) => allowedCodes.includes(c))) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Bạn không có quyền hoặc vai trò cần thiết (${allowedCodes.join(
        ", "
      )})`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Middleware admin only
 */
const adminAny = authorizeAny("admin");

module.exports = {
  authenticateAny,
  authorizeAny,
  adminAny,
};

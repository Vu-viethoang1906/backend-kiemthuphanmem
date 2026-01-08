const KcAdminClient = require("keycloak-admin").default;

const dotenv = require("dotenv");

dotenv.config();

const kcAdminClient = new KcAdminClient({
  baseUrl: process.env.KEYCLOAK_BASE_URL,
  realmName: process.env.KEYCLOAK_REALM,
});

// 🔑 INIT & AUTH
async function initKeycloak() {
  try {
    await kcAdminClient.auth({
      username: process.env.KEYCLOAK_ADMIN_USERNAME,
      password: process.env.KEYCLOAK_ADMIN_PASSWORD,
      grantType: "password",
      clientId: "admin-cli",
    });
  } catch (err) {
    throw err;
  }
}

// 🔄 Kiểm tra token expired
function isTokenExpired(token) {
  if (!token) return true;
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString()
  );
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + 10; // refresh trước 10s
}

// 🔄 Refresh token nếu cần
async function refreshTokenIfNeeded() {
  if (!kcAdminClient.accessToken || isTokenExpired(kcAdminClient.accessToken)) {
    await initKeycloak();
  }
}

// 🔁 Wrapper retry khi gặp 401
async function withRetry(fn) {
  try {
    await refreshTokenIfNeeded();
    return await fn();
  } catch (err) {
    // nếu lỗi 401, refresh token và retry 1 lần
    if (err.response && err.response.status === 401) {
      await refreshTokenIfNeeded();
      return await fn();
    }
    throw err;
  }
}

// 🟢 CREATE USER
async function createUser(userData) {
  return withRetry(() => kcAdminClient.users.create(userData));
}

// 🔵 GET USERS
async function getUsers(query = {}) {
  return withRetry(() => kcAdminClient.users.find(query));
}

// 🔵 GET USER BY ID
async function getUserById(userId) {
  return withRetry(() => kcAdminClient.users.findOne({ id: userId }));
}

// 🔵 GET USER BY USERNAME
async function getUserByUsername(username) {
  return withRetry(() => kcAdminClient.users.find({ username }));
}

// 🔵 GET USER BY EMAIL
async function getUserByEmail(email) {
  return withRetry(() => kcAdminClient.users.find({ email }));
}

// 🟠 UPDATE USER
async function updateUser(userId, updatedInfo) {
  return withRetry(() =>
    kcAdminClient.users.update({ id: userId }, updatedInfo)
  );
}

// 🔴 DELETE USER
async function deleteUser(userId) {
  return withRetry(() => kcAdminClient.users.del({ id: userId }));
}

async function testConnection() {
  const users = await getUsers({ max: 2 });
}

async function deactivateUserOnKeycloak(userId) {
  return withRetry(() =>
    kcAdminClient.users.update(
      { id: userId },
      { enabled: false } // 👈 chuyển trạng thái thành "vô hiệu hóa"
    )
  );
}
// keycloakService.js
async function createUserWithPassword(userData, password) {
  return withRetry(async () => {
    const createdUser = await kcAdminClient.users.create({
      username: userData.username,
      email: userData.email,
      firstName: userData.full_name?.split(" ")[0] || "",
      lastName: userData.full_name?.split(" ").slice(1).join(" ") || "",
      enabled: userData.status?.toLowerCase() === "active",
    });
    try {
      await kcAdminClient.users.resetPassword({
        id: createdUser.id,
        credential: {
          type: "password",
          value: password,
          temporary: false,
        },
      });
    } catch (err) {
      console.error("❌ Keycloak create error:", err.response?.data || err);
      throw err;
    }

    return createdUser;
  });
}

// 🟣 CHANGE USER PASSWORD
async function changeUserPassword(userId, newPassword) {
  return withRetry(async () => {
    await kcAdminClient.users.resetPassword({
      id: userId,
      credential: {
        type: "password",
        value: newPassword,
        temporary: false, // false = người dùng không cần đổi lại khi đăng nhập
      },
    });
    return true;
  });
}
// ✅ Khôi phục user trên Keycloak (bật lại tài khoản)
async function restoreUserOnKeycloak(userId) {
  return withRetry(() =>
    kcAdminClient.users.update(
      { id: userId },
      { enabled: true } // 👈 kích hoạt lại user
    )
  );
}

module.exports = {
  initKeycloak,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  testConnection,
  getUserByUsername,
  getUserByEmail,
  createUserWithPassword,
  changeUserPassword,
  deactivateUserOnKeycloak,
  restoreUserOnKeycloak,
};

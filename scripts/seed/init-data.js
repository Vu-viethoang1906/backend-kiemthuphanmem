/**
 * init-data.js
 * Khởi tạo dữ liệu mặc định:
 *  - Permissions
 *  - Role: System_Manager
 *  - RolePermissions
 *  - User: admin
 *  - UserRoles
 */

const mongoose = require('mongoose');
require('dotenv').config();

// ===== Import models =====
const Permission = require('../../models/Permission.model');
const Role = require('../../models/role.model');
const RolePermission = require('../../models/rolePermission.model');
const User = require('../../models/usersModel');
const UserRole = require('../../models/userRole.model');
const apiKey = require('../../models/apiKey.model');
const SidebarItem = require('../../models/SidebarItem.model');
// ===== MongoDB connect =====
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (err) {
    process.exit(1);
  }
}
// ===== Dữ liệu mẫu =====
const sidebarItems = [
  {
    key: 'introduction',
    path: '/admin/introduction',
    label: 'Introduction',
    defaultIcon: 'introduction',
    menuType: 'main',
    itemId: '691d2ef9733a5799acfd20e2',
    name: 'Introduction',
    icon: 'introduction',
    iconUrl: null,
    updatedAt: '2025-12-01T09:07:24.039Z',
  },
  {
    key: 'dashboard',
    path: '/admin',
    label: 'Dashboard',
    defaultIcon: 'dashboard',
    menuType: 'main',
    itemId: '691d23c4b9a323b1e70262a7',
    name: 'Dashboard',
    icon: 'dashboard',
    iconUrl: null,
    updatedAt: '2025-11-28T02:51:28.739Z',
  },
  {
    key: 'projects',
    path: '/admin/projects',
    label: 'Projects',
    defaultIcon: 'projects',
    menuType: 'main',
    itemId: '691d297789721b0dbe149582',
    name: 'Projects',
    icon: 'projects',
    iconUrl: null,
    updatedAt: '2025-12-01T08:09:04.346Z',
  },
  {
    key: 'reports',
    path: '/admin/reports',
    label: 'Reports',
    defaultIcon: 'reports',
    menuType: 'main',
    itemId: '691d299089721b0dbe1495e6',
    name: 'Reports',
    icon: 'reports',
    iconUrl: null,
    updatedAt: '2025-11-19T02:21:05.776Z',
  },
  {
    key: 'groups',
    path: '/admin/groups',
    label: 'Groups',
    defaultIcon: 'groups',
    menuType: 'main',
    itemId: null,
    name: 'Groups',
    icon: 'groups',
    iconUrl: null,
    updatedAt: null,
  },
  {
    key: 'profile',
    path: '/admin/profile',
    label: 'Profile',
    defaultIcon: 'Profile',
    menuType: 'personal',
    itemId: null,
    name: 'Profile',
    icon: 'Profile',
    iconUrl: null,
    updatedAt: null,
  },
  {
    key: 'settings',
    path: '/admin/settings',
    label: 'Settings',
    defaultIcon: 'Settings',
    menuType: 'personal',
    itemId: null,
    name: 'Settings',
    icon: 'Settings',
    iconUrl: null,
    updatedAt: null,
  },
  {
    key: 'usermanagement',
    path: '/admin/usermanagement',
    label: 'UserManagement',
    defaultIcon: 'UserManagement',
    menuType: 'admin',
    itemId: '691d2b542c3fa46f6715e4d0',
    name: 'UserManagement',
    icon: 'UserManagement',
    iconUrl: null,
    updatedAt: '2025-11-19T02:28:38.900Z',
  },
  {
    key: 'roleandpermission',
    path: '/admin/roleandpermission',
    label: 'RoleAndPermission',
    defaultIcon: 'RoleAndPermission',
    menuType: 'admin',
    itemId: null,
    name: 'RoleAndPermission',
    icon: 'RoleAndPermission',
    iconUrl: null,
    updatedAt: null,
  },
  {
    key: 'permissionmanagement',
    path: '/admin/permissionmanagement',
    label: 'PermissionManagement',
    defaultIcon: 'RoleAndPermission',
    menuType: 'admin',
    itemId: null,
    name: 'PermissionManagement',
    icon: 'RoleAndPermission',
    iconUrl: null,
    updatedAt: null,
  },
  {
    key: 'templates',
    path: '/admin/templates',
    label: 'Templates',
    defaultIcon: 'templates',
    menuType: 'admin',
    itemId: null,
    name: 'Templates',
    icon: 'templates',
    iconUrl: null,
    updatedAt: null,
  },
  {
    key: 'centers',
    path: '/admin/centers',
    label: 'Centers',
    defaultIcon: 'center',
    menuType: 'admin',
    itemId: '691d365b733a5799acfd2421',
    name: 'Centers',
    icon: 'center',
    iconUrl: null,
    updatedAt: '2025-11-19T03:15:39.536Z',
  },
  {
    key: 'userpoints',
    path: '/admin/userpoints',
    label: 'UserPoints',
    defaultIcon: 'point',
    menuType: 'admin',
    itemId: null,
    name: 'UserPoints',
    icon: 'point',
    iconUrl: null,
    updatedAt: null,
  },
];
// ===== Danh sách quyền =====
const permissionList = [
  // ==== USER ====
  'USER_CREATE',
  'USER_DELETE',
  'USER_UPDATE',
  'USER_VIEW',
  'USER_VIEW_ALL',
  'VIEW_ALL',
  'VIEW_USER',

  // ==== ROLE ====
  'ROLE_CREATE',
  'ROLE_DELETE',
  'ROLE_UPDATE',
  'ROLE_VIEW',

  // ==== BOARD ====
  'BOARD_CREATE',
  'BOARD_DELETE',
  'BOARD_UPDATE',
  'BOARD_MANAGE_MEMBERS',
  'BOARD_VIEW',
  'BOARD_VIEW_ALL',
  'VIEW_ALL_BOARD',
  'VIEW_BOARD',

  // ==== GROUP ====
  'GROUP_CREATE',
  'GROUP_DELETE',
  'GROUP_UPDATE',
  'GROUP_VIEW',
  'GROUP_VIEW_ALL',
  'CREATE_GROUP',
  'DELETE_GROUP',
  'UPDATE_GROUP',
  'VIEW_GROUP',
  'VIEW_GROUP_ALL',

  // ==== TEMPLATE ====
  'TEMPLATE_CREATE',
  'TEMPLATE_UPDATE',
  'TEMPLATE_DELETE',
  'TEMPLATE_VIEW',
  'TEMPLATE_VIEW_ALL',

  // ==== PERMISSION ====
  'PERMISSION_CREATE',
  'PERMISSION_DELETE',
  'PERMISSION_UPDATE',
  'PERMISSION_VIEW',
  'VIEW_ALL_PERMISSION',

  // ==== COLUMN ====
  'COLUMN_CREATE',
  'COLUMN_DELETE',
  'COLUMN_UPDATE',
  'COLUMN_VIEW',

  // ==== SWIMLANE ====
  'SWIMLANE_CREATE',
  'SWIMLANE_DELETE',
  'SWIMLANE_UPDATE',
  'SWIMLANE_VIEW',

  // ==== TASK ====
  'TASK_ASSIGN',
  'TASK_CREATE',
  'TASK_DELETE',
  'TASK_UPDATE',
  'TASK_VIEW',
  'TASK_VIEW_ALL',
  'VIEW_LOG_TASK',

  // ==== TAG ====
  'TAG_CREATE',
  'TAG_DELETE',
  'TAG_UPDATE',
  'TAG_VIEW',

  // ==== COMMENT ====
  'COMMENT_CREATE',
  'COMMENT_DELETE',
  'COMMENT_UPDATE',
  'COMMENT_VIEW',

  // ==== CENTER ====
  'CENTER_CREATE',
  'CENTER_DELETE',
  'CENTER_UPDATE',
  'CENTER_VIEW',
  'CENTER_VIEW_ALL',

  // ==== NOTIFICATION ====
  'NOTIFICATION_CREATE',
  'NOTIFICATION_DELETE',
  'NOTIFICATION_UPDATE',
  'NOTIFICATION_VIEW',

  // ==== ANALYTICS ====
  'ANALYTICS_VIEW',

  // ==== IMPORT / EXPORT ====
  'IMPORT_DATA',
  'EXPORT_DATA',

  // ==== SYSTEM ====
  'MANAGE_ALL',
];

// ===== Seed function =====
async function seedData() {
  await connectDB();

  try {
    const createdPermissions = [];
    for (const code of permissionList) {
      const existing = await Permission.findOne({ code });
      if (!existing) {
        const newPerm = await Permission.create({
          code,
          description: `Permission ${code}`,
          typePermission: 'SYSTEM',
        });
        createdPermissions.push(newPerm);
      }
    }
    // ===== 2️⃣ Role: System_Manager =====
    let systemRole = await Role.findOne({ name: 'System_Manager' });
    if (!systemRole) {
      systemRole = await Role.create({
        name: 'System_Manager',
        description: 'Super Administrator role with full permissions',
      });
    }

    // ===== 3️⃣ Gán tất cả quyền cho role System_Manager =====
    const allPermissions = await Permission.find();
    let countRolePerm = 0;

    for (const perm of allPermissions) {
      const exists = await RolePermission.findOne({
        role_id: systemRole._id,
        permission_id: perm._id,
      });
      if (!exists) {
        await RolePermission.create({
          role_id: systemRole._id,
          permission_id: perm._id,
        });
        countRolePerm++;
      }
    }

    // ===== 4️⃣ User admin =====
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@example.com',
        username: 'admin',
        password_hash: 'ZYk!MX7Etx!Hurs', // demo bcrypt hash giả
        full_name: 'Administrator',
        avatar_url: '',
        status: 'active',
        typeAccount: 'Local',
        idSSO: null,
        deleted_at: null,
      });
    }

    // ===== 5️⃣ Gán role System_Manager cho admin =====
    const existingUserRole = await UserRole.findOne({
      user_id: adminUser._id,
      role_id: systemRole._id,
    });

    if (!existingUserRole) {
      await UserRole.create({
        user_id: adminUser._id,
        role_id: systemRole._id,
        assigned_at: new Date(),
        assigned_by: adminUser._id,
        status: 'active',
      });
    }

    // ===== 6️⃣ Seed API Keys =====
    const apiKeyList = [
      {
        description: 'GOOGLE_CLIENT_ID',
        // Placeholder value – real client ID must be provided via environment or admin UI
        key: 'GOOGLE_CLIENT_ID_PLACEHOLDER',
      },
      {
        description: 'GOOGLE_CLIENT_SECRET',
        // Placeholder value – real client secret must be provided via environment or admin UI
        key: 'GOOGLE_CLIENT_SECRET_PLACEHOLDER',
      },
      {
        description: 'GOOGLE_REDIRECT_URI',
        // Example redirect URI – update via config in real deployments
        key: 'https://your-domain.example.com/api/calendar/auth/callback',
      },
      {
        description: 'GOOGLE_ENCRYPTION_KEY',
        // Placeholder encryption key – replace with a secure value in real deployments
        key: 'GOOGLE_ENCRYPTION_KEY_PLACEHOLDER',
      },
      { description: 'EMAIL_USER', key: 'your-email-user' },
      { description: 'EMAIL_PASS', key: 'your-email-password' },
      // ...

      // thêm các key khác nếu cần
    ];

    for (const item of apiKeyList) {
      const exists = await apiKey.findOne({ description: item.description });
      if (!exists) {
        await apiKey.create({
          description: item.description,
          key: item.key,
          created_at: new Date(),
        });
      }
    }

    // ===== 7️⃣ Seed SidebarItems =====
    // ===== 7️⃣ Seed SidebarItems =====
    // ===== 7️⃣ Seed SidebarItems =====
    for (let index = 0; index < sidebarItems.length; index++) {
      const item = sidebarItems[index];

      // Kiểm tra tồn tại theo key + menuType (ổn định nhất)
      const exists = await SidebarItem.findOne({
        key: item.key,
        menuType: item.menuType,
      });

      if (!exists) {
        // 🔹 Tạo mới
        const newItem = await SidebarItem.create({
          key: item.key,
          menuType: item.menuType,
          name: item.name,
          label: item.label,
          icon: item.icon,
          defaultIcon: item.defaultIcon,
          iconUrl: item.iconUrl || null,
          path: item.path,
          order: index,
          isActive: true,
          isExpanded: false,
          created_at: new Date(),
          updated_at: new Date(),
        });

        item.itemId = newItem._id;
      } else {
        // 🔹 Nếu đã có → update đầy đủ fields
        await SidebarItem.updateOne(
          { _id: exists._id },
          {
            $set: {
              key: item.key,
              name: item.name,
              label: item.label,
              icon: item.icon,
              defaultIcon: item.defaultIcon,
              iconUrl: item.iconUrl || exists.iconUrl,
              path: item.path,
              menuType: item.menuType,
              updated_at: new Date(),
              order: index, // cập nhật vị trí
            },
          }
        );

        item.itemId = exists._id;
      }
    }
  } catch (err) {
  } finally {
    await mongoose.disconnect();
  }
}

// ===== Run script =====
seedData();

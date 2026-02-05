const express = require('express');
const app = express();
require('dotenv').config();
const Keycloak = require('keycloak-connect');
const session = require('express-session');
const cors = require('cors');
const memoryStore = new session.MemoryStore();
const http = require('http');
const maintenanceMiddleware = require('./middlewares/maintenance');
// Import tất cả routes và config như bạn đã có
const userRouter = require('./router/auth.routes');
const user = require('./router/user.routes');
const userRole = require('./router/userRole.router');
const centerRouter = require('./router/center.router');
const userPointRouter = require('./router/userPoint.router');
const roleRouter = require('./router/role.router');
const boardRouter = require('./router/board.router');
const templateRouter = require('./router/template.router');
const boardMemberRouter = require('./router/boardMember.routes');
const groupRoutes = require('./router/group.routes');
const groupMemberRoutes = require('./router/groupMember.routes');
const templateColumn = require('./router/templateColumn.router');
const templateSwimlaneRouter = require('./router/templateSwimlane.router');
const columnRouter = require('./router/column.routes');
const swimlaneRoutes = require('./router/swimlane.routes');
const taskRoutes = require('./router/task.routes');
const tagRoutes = require('./router/tag.routes');
const commentRoutes = require('./router/comment.routes');
const checklistRoutes = require('./router/checklist.routes');
const importRoutes = require('./router/import.routes');
const permissionRoutes = require('./router/permission.routes');
const RolePermissionRoutes = require('./router/rolePermission.routes');
const taskTag = require('./router/taskTag.routes');
const uploadImg = require('./router/uploadimg.router');
const taskImportRoutes = require('./router/taskImport.routes');
const analyticsRoutes = require('./router/analytics.routes');
const CenterMember = require('./router/centerMember.route');
const notificationRouter = require('./router/notification.routes');
const googleCalendarRoutes = require('./router/googleCalendar.routes');
const { authenticateAny, authorizeAny } = require('./middlewares/auth');
const userController = require('./controllers/user.controller');
const historyTaskRouter = require('./router/historyTask.router');
const activityLogRouter = require('./router/activityLog.routes');
const sidebarItemRouter = require('./router/sidebarItem.router');

const { loggingMiddleware, errorLoggingMiddleware } = require('./middlewares/logMiddleware');
const {
  client,
  metricsMiddleware,
  metricsErrorHandler,
  mongoStatus,
} = require('./middlewares/metrics.middleware');
const gamificationConfigRouter = require('./router/gamificationConfig.routes');

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.use(metricsMiddleware);
require('./config/db');
require('./config/scheduler');

// Keycloak
const keycloakConfig = {
  realm: process.env.KEYCLOAK_REALM || 'myrealm',
  'auth-server-url': process.env.KEYCLOAK_AUTH_URL || 'http://localhost:9090/auth',
  'ssl-required': process.env.KEYCLOAK_SSL_REQUIRED || 'external',
  resource: process.env.KEYCLOAK_RESOURCE || 'my-app',
  'public-client': (process.env.KEYCLOAK_PUBLIC_CLIENT || 'true') === 'true',
  'confidential-port': Number(process.env.KEYCLOAK_CONFIDENTIAL_PORT || 0),
};
const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// các router ko bật bảo trì

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: memoryStore,
  })
);

app.use(keycloak.middleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      'http://51.79.134.45:3000',
      'http://localhost:3000',
      'https://ken.daily4g.com',
      'http://localhost:3001',
      'https://vannhat.online',
      'https://test.vannhat.online',
    ],
    credentials: true,
  })
);
app.use('/admin/maintenance', require('./router/adminMaintenance.routes'));
app.use(loggingMiddleware);
app.use('/api', userRouter(keycloak));
// Admin route
app.get(
  '/api/admin/deleted',
  authenticateAny,
  authorizeAny('admin System_Manager'),
  userController.getAllDeletedRecords
);
app.use('/api/user', user);
app.use('/api/userRole', userRole);
app.use('/api/img', uploadImg);
app.use('/api/uploads', express.static('uploads'));
app.use('/api/exports', express.static('exports'));
app.use('/api/role', roleRouter);
app.use(maintenanceMiddleware);

// Private routes
app.use('/api/sidebar-items', sidebarItemRouter);
app.use('/api/centers', centerRouter);
app.use('/api/userPoints', userPointRouter);

app.use('/api/boards', boardRouter);
app.use('/api/templates', templateRouter);
app.use('/api/boardMember', boardMemberRouter);
app.use('/api/groups', groupRoutes);
app.use('/api/groupMember', groupMemberRoutes);
app.use('/api/templateColumn', templateColumn);
app.use('/api/templateSwimlane', templateSwimlaneRouter);
app.use('/api/column', columnRouter);
app.use('/api/swimlanes', swimlaneRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/import', importRoutes);
app.use('/api/taskTag', taskTag);
app.use('/api/permission', permissionRoutes);
app.use('/api/RolePermission', RolePermissionRoutes);
app.use('/api/CenterMember', CenterMember);

app.use('/api/tasks', taskImportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', require('./router/export.routes'));
app.use('/api/apiKey', require('./router/apiKey.routes'));

app.use('/api/notification', notificationRouter);
app.use('/api/calendar', googleCalendarRoutes);
app.use('/api/user/slack', require('./router/userSlackConfig.routes'));
app.use('/api/boards/slack', require('./router/boardSlackConfig.routes'));
app.use('/api/logoUlr', require('./router/logoUlr.router'));
app.use('/api/historyTask', historyTaskRouter);
app.use('/api/activityLogs', activityLogRouter);
app.use('/api/gamification', gamificationConfigRouter);
app.use('/api/backup', require('./router/backup.routes'));
app.use('/api/deployments', require('./router/deployment.routes'));
app.use('/api/nlp', require('./router/nlp.routes'));
app.use('/api/learning-resources', require('./router/learningResource.routes'));
app.use('/api/at-risk', require('./router/atRiskDetection.routes'));
app.use('/api/sprint-forecast', require('./router/sprintForecast.routes'));
app.use('/api/ai', require('./router/AI.router'));
app.use('/api/adaptive-gamification', require('./router/adaptiveGamification.routes'));
app.use('/api/learning-path', require('./router/learningPath.routes'));
app.use('/api/scheduled-reports', require('./router/scheduledReport.routes'));
app.use('/api/notification-preferences', require('./router/notificationPreference.routes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.use(metricsErrorHandler);
module.exports = app;

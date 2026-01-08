const googleCalendarService = require('../services/googleCalendar.service');
const taskService = require('../services/task.service');
const taskRepo = require('../repositories/task.repository');

class GoogleCalendarController {
  async getAuthUrl(req, res) {
    try {
      const authUrl = googleCalendarService.getAuthUrl();

      // Parse để lấy redirect URI (cho debug)
      let redirectUri = null;
      try {
        const url = new URL(authUrl);
        redirectUri = url.searchParams.get('redirect_uri');
        if (redirectUri) {
          redirectUri = decodeURIComponent(redirectUri);
        }
      } catch (err) {
        // Ignore parse error
      }

      res.json({
        success: true,
        data: {
          authUrl,
          // Thêm redirectUri để debug (chỉ trong dev)
          ...(process.env.NODE_ENV !== 'production' && redirectUri
            ? {
                debug: { redirectUri },
              }
            : {}),
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async handleCallback(req, res) {
    try {
      const { code, error: oauthError } = req.query;

      // Nếu Google trả về lỗi
      if (oauthError) {
        const frontendUrl =
          process.env.FRONTEND_URL || process.env.ULR_FE || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/calendar?error=${encodeURIComponent(oauthError)}`);
      }

      if (!code) {
        const frontendUrl =
          process.env.FRONTEND_URL || process.env.ULR_FE || 'http://localhost:3000';
        return res.redirect(
          `${frontendUrl}/calendar?error=${encodeURIComponent('Code không được cung cấp')}`
        );
      }

      const calendarConfig = await googleCalendarService.authenticateUser(code);

      // Redirect về Frontend với thông báo thành công
      const frontendUrl = process.env.FRONTEND_URL || process.env.ULR_FE || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/calendar?connected=true&syncEnabled=${calendarConfig.is_sync_enabled}`;

      res.redirect(redirectUrl);
    } catch (error) {
      // Redirect về Frontend với thông báo lỗi
      const frontendUrl = process.env.FRONTEND_URL || process.env.ULR_FE || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/calendar?error=${encodeURIComponent(error.message)}`);
    }
  }

  async getStatus(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      const status = await googleCalendarService.getCalendarStatus(userId);
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async enableSync(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      const { sync_filter } = req.body;
      const calendarConfig = await googleCalendarService.enableSync(userId, sync_filter);

      res.json({
        success: true,
        message: 'Đã bật đồng bộ Google Calendar',
        data: {
          isSyncEnabled: calendarConfig.is_sync_enabled,
          syncFilter: calendarConfig.sync_filter,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async disableSync(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      await googleCalendarService.disableSync(userId);

      res.json({
        success: true,
        message: 'Đã tắt đồng bộ Google Calendar',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async syncTask(req, res) {
    try {
      const userId = req.user?.id;
      const { taskId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      const task = await taskRepo.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task không tồn tại',
        });
      }

      const taskAssignedTo = task.assigned_to?._id?.toString() || task.assigned_to?.toString();
      if (taskAssignedTo !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền đồng bộ task này',
        });
      }

      // Kiểm tra sync filter
      const shouldSync = await googleCalendarService.shouldSync(task, userId);
      if (!shouldSync) {
        return res.status(400).json({
          success: false,
          message: 'Task này không thỏa điều kiện sync filter',
        });
      }

      const eventId = await googleCalendarService.findEventByTaskId(taskId, userId);

      if (eventId) {
        await googleCalendarService.updateCalendarEvent(eventId, task, userId);
      } else {
        await googleCalendarService.createCalendarEvent(task, userId);
      }

      // Cập nhật last_sync_at
      await googleCalendarService.updateLastSyncAt(userId);

      res.json({
        success: true,
        message: 'Đồng bộ task thành công',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async syncAll(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      // Kiểm tra user đã kết nối Google Calendar chưa
      const status = await googleCalendarService.getCalendarStatus(userId);
      if (!status.isConnected || !status.isSyncEnabled) {
        return res.status(400).json({
          success: false,
          message: 'Chưa kết nối Google Calendar hoặc sync đã bị tắt',
        });
      }

      const tasks = await taskService.getTasksByUser(userId);
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      // Batch processing để tránh quá tải
      const batchSize = 10;
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async task => {
            try {
              const taskObj = task.toObject ? task.toObject() : task;

              // Kiểm tra sync filter trước
              const shouldSync = await googleCalendarService.shouldSync(taskObj, userId);
              if (!shouldSync) {
                skippedCount++;
                return;
              }

              const eventId = await googleCalendarService.findEventByTaskId(
                taskObj._id.toString(),
                userId
              );

              if (eventId) {
                await googleCalendarService.updateCalendarEvent(eventId, taskObj, userId);
              } else {
                await googleCalendarService.createCalendarEvent(taskObj, userId);
              }
              successCount++;
            } catch (error) {
              errorCount++;
              console.error(`Lỗi sync task ${task._id}:`, error.message);
            }
          })
        );
      }

      // Cập nhật last_sync_at
      await googleCalendarService.updateLastSyncAt(userId);

      res.json({
        success: true,
        message: `Đồng bộ hoàn tất: ${successCount} thành công, ${skippedCount} bỏ qua, ${errorCount} lỗi`,
        data: {
          successCount,
          skippedCount,
          errorCount,
          total: tasks.length,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async unsyncAll(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }
      const resultDelete = await googleCalendarService.delete(userId);
      const result = await googleCalendarService.unsyncAll(userId);

      res.json({
        success: true,
        message: `Đã xóa ${result.deletedCount} events, ${result.errorCount} lỗi`,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new GoogleCalendarController();

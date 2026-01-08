const { google } = require('googleapis');
const UserGoogleCalendar = require('../models/userGoogleCalendar.model');
const { encrypt, decrypt } = require('../utils/encryption');
const userService = require('./user.service');
const boardRepo = require('../repositories/board.repository');
const columnRepo = require('../repositories/column.repository');
const logger = require('../utils/logger');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this._initOAuth2Client();
  }

  _initOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

    if (!clientId || !clientSecret || !redirectUri) {
      logger.warn('Google OAuth: Thiếu cấu hình', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri,
      });
      return;
    }

    // Log để debug
    logger.info('Google OAuth: Khởi tạo OAuth2 client', {
      clientId: clientId.substring(0, 20) + '...',
      redirectUri: redirectUri,
    });

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl() {
    // Re-init OAuth2 client nếu chưa có (có thể do env vars được load sau)
    if (!this.oauth2Client) {
      this._initOAuth2Client();
    }

    if (!this.oauth2Client) {
      const missing = [];
      if (!process.env.GOOGLE_CLIENT_ID?.trim()) missing.push('GOOGLE_CLIENT_ID');
      if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) missing.push('GOOGLE_CLIENT_SECRET');
      if (!process.env.GOOGLE_REDIRECT_URI?.trim()) missing.push('GOOGLE_REDIRECT_URI');

      throw new Error(
        `Google OAuth chưa được cấu hình. Thiếu các biến môi trường: ${missing.join(', ')}. ` +
          `Vui lòng kiểm tra file .env và đảm bảo server đã được restart sau khi thêm biến.`
      );
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    // Log redirect URI để debug
    try {
      const url = new URL(authUrl);
      const redirectUriParam = url.searchParams.get('redirect_uri');
      logger.info('Google OAuth: Generated auth URL', {
        redirectUri: redirectUriParam ? decodeURIComponent(redirectUriParam) : 'N/A',
        clientId: url.searchParams.get('client_id')?.substring(0, 20) + '...',
      });
    } catch (err) {
      logger.warn('Google OAuth: Không thể parse auth URL để log', err.message);
    }

    return authUrl;
  }

  async authenticateUser(code) {
    // Re-init OAuth2 client nếu chưa có
    if (!this.oauth2Client) {
      this._initOAuth2Client();
    }

    if (!this.oauth2Client) {
      throw new Error('Google OAuth chưa được cấu hình. Vui lòng kiểm tra environment variables.');
    }

    try {
      // Lấy tokens từ Google
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens || !tokens.access_token) {
        throw new Error('Không thể lấy access token từ Google.');
      }

      // Set credentials để có thể gọi API
      this.oauth2Client.setCredentials(tokens);

      // Lấy user info từ Google - ưu tiên dùng id_token
      let userInfo;
      let email;

      // Ưu tiên 1: Decode id_token (nhanh hơn, không cần gọi API)
      if (tokens.id_token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(tokens.id_token);
          if (decoded && decoded.email) {
            email = decoded.email;
            userInfo = {
              email: decoded.email,
              name: decoded.name,
              picture: decoded.picture,
            };
            logger.info(`Google Calendar: Lấy email từ id_token: ${email}`);
          }
        } catch (decodeError) {
          logger.warn(`Google Calendar: Không thể decode id_token: ${decodeError.message}`);
        }
      }

      // Ưu tiên 2: Gọi userinfo API nếu không có id_token hoặc decode thất bại
      if (!email) {
        try {
          userInfo = await this._getUserInfo(tokens.access_token);
          email = userInfo.email;
          logger.info(`Google Calendar: Lấy email từ userinfo API: ${email}`);
        } catch (userInfoError) {
          logger.error(`Google Calendar: Lỗi lấy user info: ${userInfoError.message}`);
          throw new Error('Không thể lấy email từ Google account. Vui lòng thử lại.');
        }
      }

      if (!email) {
        throw new Error(
          'Không thể lấy email từ Google account. Vui lòng đảm bảo đã cấp quyền truy cập email.'
        );
      }

      // Tìm user trong hệ thống bằng email
      const user = await userService.getUserByEmail(email);
      if (!user) {
        throw new Error(
          `Email ${email} chưa được đăng ký trong hệ thống. Vui lòng đăng ký tài khoản trước.`
        );
      }

      const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      const calendarConfig = {
        user_id: user._id,
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token || ''),
        calendar_id: 'primary',
        is_sync_enabled: true,
        sync_filter: {
          only_with_dates: true,
          include_completed: false,
          board_ids: [],
        },
        expires_at: expiresAt,
      };

      // Kiểm tra refresh token
      if (!tokens.refresh_token) {
        logger.warn(
          `Google Calendar: Không có refresh token cho user ${user._id}. Token sẽ hết hạn sau 1 giờ.`
        );
      }

      const existing = await UserGoogleCalendar.findOne({ user_id: user._id });

      if (existing) {
        Object.assign(existing, calendarConfig);
        await existing.save();
        logger.info(`Google Calendar: Đã cập nhật kết nối cho user ${user._id}`);
        return existing;
      } else {
        const newConfig = await UserGoogleCalendar.create(calendarConfig);
        logger.info(`Google Calendar: Đã tạo kết nối mới cho user ${user._id}`);
        return newConfig;
      }
    } catch (error) {
      logger.error(`Google Calendar: Lỗi xác thực: ${error.message}`);
      throw new Error(`Lỗi xác thực Google: ${error.message}`);
    }
  }

  async _getUserInfo(accessToken) {
    try {
      // Sử dụng oauth2Client đã được khởi tạo
      if (!this.oauth2Client) {
        this._initOAuth2Client();
      }

      // Set credentials với access token
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      // Lấy user info từ Google
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      return userInfo.data;
    } catch (error) {
      logger.error(`Google Calendar: Lỗi khi lấy user info: ${error.message}`);
      throw new Error(`Không thể lấy thông tin user từ Google: ${error.message}`);
    }
  }

  async _getAuthClient(userId) {
    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (!calendarConfig || !calendarConfig.is_sync_enabled) {
      return null;
    }

    const accessToken = decrypt(calendarConfig.access_token);
    const refreshToken = decrypt(calendarConfig.refresh_token);

    if (!accessToken || !refreshToken) {
      return null;
    }

    if (!this.oauth2Client) {
      this._initOAuth2Client();
    }

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (calendarConfig.expires_at && new Date(calendarConfig.expires_at) <= new Date()) {
      await this._refreshAccessToken(userId, calendarConfig);
      const updated = await UserGoogleCalendar.findOne({ user_id: userId });
      this.oauth2Client.setCredentials({
        access_token: decrypt(updated.access_token),
        refresh_token: decrypt(updated.refresh_token),
      });
    }

    return this.oauth2Client;
  }

  async _refreshAccessToken(userId, calendarConfig) {
    try {
      if (!this.oauth2Client) {
        this._initOAuth2Client();
      }

      const refreshToken = decrypt(calendarConfig.refresh_token);
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      const expiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      calendarConfig.access_token = encrypt(credentials.access_token);
      calendarConfig.expires_at = expiresAt;
      await calendarConfig.save();

      return credentials.access_token;
    } catch (error) {
      calendarConfig.is_sync_enabled = false;
      await calendarConfig.save();
      throw new Error(`Lỗi refresh token: ${error.message}`);
    }
  }

  /**
   * Kiểm tra xem task có nên được sync hay không dựa trên sync filter
   */
  async shouldSync(task, userId) {
    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (!calendarConfig || !calendarConfig.is_sync_enabled) {
      return false;
    }

    const syncFilter = calendarConfig.sync_filter;

    // Check only_with_dates: nếu bật và task không có ngày thì không sync
    if (syncFilter.only_with_dates && !task.start_date && !task.due_date) {
      return false;
    }

    // Check board_ids: nếu có filter board_ids và task không nằm trong danh sách thì không sync
    if (syncFilter.board_ids && syncFilter.board_ids.length > 0) {
      const taskBoardId = task.board_id?._id?.toString() || task.board_id?.toString();
      const boardIds = syncFilter.board_ids.map(id => id.toString());
      if (!boardIds.includes(taskBoardId)) {
        return false;
      }
    }

    // Check include_completed: nếu tắt và task đã completed thì không sync
    if (!syncFilter.include_completed) {
      const columnId = task.column_id?._id || task.column_id;
      if (columnId) {
        try {
          const column = await columnRepo.findById(columnId);
          if (column && column.isDone) {
            return false;
          }
        } catch (error) {
          // Nếu không tìm thấy column, vẫn cho phép sync
        }
      }
    }

    return true;
  }

  async createCalendarEvent(task, userId) {
    const auth = await this._getAuthClient(userId);
    if (!auth) {
      logger.warn(
        `Google Calendar: Không thể tạo event cho task ${task._id} - User ${userId} chưa kết nối hoặc sync bị tắt`
      );
      return null;
    }

    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (!calendarConfig) {
      return null;
    }

    // Kiểm tra sync filter
    const shouldSync = await this.shouldSync(task, userId);
    if (!shouldSync) {
      logger.debug(`Google Calendar: Bỏ qua sync task ${task._id} do không thỏa sync filter`);
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const assignedUser = await userService.getUserById(userId);
    const boardInfo = await boardRepo.findById(task.board_id);

    // Xử lý start date và time
    const { startDateTime, endDateTime } = this._prepareEventDateTime(task);

    const colorId = this._getPriorityColorId(task.priority);

    const event = {
      summary: task.title,
      description: task.description
        ? `${task.description}\n\nLink task: ${process.env.FRONTEND_URL || ''}/tasks/${task._id}`
        : `Link task: ${process.env.FRONTEND_URL || ''}/tasks/${task._id}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      location: boardInfo?.title || '',
      colorId: colorId,
      attendees: assignedUser?.email ? [{ email: assignedUser.email }] : [],
      extendedProperties: {
        private: {
          task_id: task._id.toString(),
          board_id: task.board_id.toString(),
        },
      },
    };

    try {
      const response = await calendar.events.insert({
        calendarId: calendarConfig.calendar_id,
        resource: event,
      });

      logger.info(`Google Calendar: Đã tạo event ${response.data.id} cho task ${task._id}`);
      return response.data.id;
    } catch (error) {
      logger.error(`Google Calendar: Lỗi tạo event cho task ${task._id}: ${error.message}`);
      throw new Error(`Lỗi tạo event: ${error.message}`);
    }
  }

  async updateCalendarEvent(eventId, task, userId) {
    const auth = await this._getAuthClient(userId);
    if (!auth) {
      logger.warn(
        `Google Calendar: Không thể cập nhật event cho task ${task._id} - User ${userId} chưa kết nối hoặc sync bị tắt`
      );
      return null;
    }

    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (!calendarConfig) return null;

    // Kiểm tra sync filter - nếu không thỏa thì xóa event
    const shouldSync = await this.shouldSync(task, userId);
    if (!shouldSync) {
      logger.debug(
        `Google Calendar: Task ${task._id} không thỏa sync filter, xóa event ${eventId}`
      );
      try {
        await this.deleteCalendarEvent(eventId, userId);
      } catch (error) {
        // Ignore delete error
      }
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const assignedUser = await userService.getUserById(userId);
    const boardInfo = await boardRepo.findById(task.board_id);

    // Xử lý start date và time
    const { startDateTime, endDateTime } = this._prepareEventDateTime(task);

    const colorId = this._getPriorityColorId(task.priority);

    const event = {
      summary: task.title,
      description: task.description
        ? `${task.description}\n\nLink task: ${process.env.FRONTEND_URL || ''}/tasks/${task._id}`
        : `Link task: ${process.env.FRONTEND_URL || ''}/tasks/${task._id}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      location: boardInfo?.title || '',
      colorId: colorId,
      attendees: assignedUser?.email ? [{ email: assignedUser.email }] : [],
      extendedProperties: {
        private: {
          task_id: task._id.toString(),
          board_id: task.board_id.toString(),
        },
      },
    };

    try {
      await calendar.events.update({
        calendarId: calendarConfig.calendar_id,
        eventId: eventId,
        resource: event,
      });
      logger.info(`Google Calendar: Đã cập nhật event ${eventId} cho task ${task._id}`);
      return true;
    } catch (error) {
      if (error.code === 404) {
        logger.warn(
          `Google Calendar: Event ${eventId} không tồn tại, tạo mới cho task ${task._id}`
        );
        return await this.createCalendarEvent(task, userId);
      }
      logger.error(
        `Google Calendar: Lỗi cập nhật event ${eventId} cho task ${task._id}: ${error.message}`
      );
      throw new Error(`Lỗi cập nhật event: ${error.message}`);
    }
  }

  async deleteCalendarEvent(eventId, userId) {
    const auth = await this._getAuthClient(userId);
    if (!auth) return null;

    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (!calendarConfig) return null;

    const calendar = google.calendar({ version: 'v3', auth });

    try {
      await calendar.events.delete({
        calendarId: calendarConfig.calendar_id,
        eventId: eventId,
      });
      return true;
    } catch (error) {
      if (error.code === 404) {
        return true;
      }
      throw new Error(`Lỗi xóa event: ${error.message}`);
    }
  }

  async findEventByTaskId(taskId, userId) {
    const auth = await this._getAuthClient(userId);
    if (!auth) return null;

    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (!calendarConfig) return null;

    const calendar = google.calendar({ version: 'v3', auth });

    try {
      const response = await calendar.events.list({
        calendarId: calendarConfig.calendar_id,
        privateExtendedProperty: `task_id=${taskId}`,
        maxResults: 1,
      });

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].id;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  _getPriorityColorId(priority) {
    const colorMap = {
      High: '11',
      Medium: '5',
      Low: '10',
    };
    return colorMap[priority] || '1';
  }

  /**
   * Chuẩn bị start và end datetime cho calendar event
   *
   * Logic xử lý:
   * 1. Nếu task có start_date/due_date với time component (giờ/phút khác 00:00) → dùng time đó
   * 2. Nếu chỉ có date (time = 00:00:00) → set time mặc định:
   *    - Start: 9:00 AM (09:00)
   *    - End: 5:00 PM (17:00)
   * 3. Nếu không có date → dùng ngày hiện tại với time mặc định
   * 4. Đảm bảo end >= start (nếu không, tự động điều chỉnh)
   *
   * @param {Object} task - Task object có start_date và due_date
   * @returns {Object} { startDateTime, endDateTime } - Date objects với time đã được xử lý
   */
  _prepareEventDateTime(task) {
    const defaultStartTime = { hour: 9, minute: 0 }; // 9:00 AM
    const defaultEndTime = { hour: 17, minute: 0 }; // 5:00 PM
    const defaultDuration = 60 * 60 * 1000; // 1 giờ (fallback)

    let startDateTime;
    let endDateTime;

    // Helper: Kiểm tra xem Date có time component hay không
    // Nếu time = 00:00:00 (có thể do chỉ set date không set time) → coi như chỉ có date
    const hasTimeComponent = date => {
      if (!date) return false;
      const d = new Date(date);
      // Kiểm tra giờ và phút (bỏ qua giây và millisecond)
      return d.getHours() !== 0 || d.getMinutes() !== 0;
    };

    // Helper: Set time cho date (theo timezone Vietnam)
    const setTime = (date, hour, minute) => {
      const d = new Date(date);
      d.setHours(hour, minute, 0, 0);
      return d;
    };

    // ========== XỬ LÝ START DATE ==========
    if (task.start_date) {
      startDateTime = new Date(task.start_date);

      // Nếu không có time component, set time mặc định 9:00 AM
      if (!hasTimeComponent(task.start_date)) {
        startDateTime = setTime(startDateTime, defaultStartTime.hour, defaultStartTime.minute);
      }
    } else if (task.due_date) {
      // Không có start_date, dùng due_date làm start
      startDateTime = new Date(task.due_date);
      if (!hasTimeComponent(task.due_date)) {
        startDateTime = setTime(startDateTime, defaultStartTime.hour, defaultStartTime.minute);
      }
    } else {
      // Không có date nào, dùng ngày hiện tại
      startDateTime = new Date();
      startDateTime = setTime(startDateTime, defaultStartTime.hour, defaultStartTime.minute);
    }

    // ========== XỬ LÝ END DATE ==========
    if (task.due_date) {
      endDateTime = new Date(task.due_date);

      // Nếu không có time component, set time mặc định 5:00 PM
      if (!hasTimeComponent(task.due_date)) {
        endDateTime = setTime(endDateTime, defaultEndTime.hour, defaultEndTime.minute);
      }

      // Đảm bảo end >= start
      if (endDateTime <= startDateTime) {
        // Nếu end <= start, có 2 trường hợp:
        // 1. Cùng ngày nhưng end time <= start time → set end = start + 1 giờ
        // 2. End date < start date → set end = start + 1 giờ
        endDateTime = new Date(startDateTime.getTime() + defaultDuration);
        logger.warn(
          `Google Calendar: Task ${task._id} có end_date <= start_date, tự động điều chỉnh end = start + 1 giờ`
        );
      }
    } else if (task.start_date) {
      // Không có due_date, dùng start_date + 1 giờ
      endDateTime = new Date(startDateTime.getTime() + defaultDuration);
    } else {
      // Không có date nào, dùng start + 1 giờ
      endDateTime = new Date(startDateTime.getTime() + defaultDuration);
    }

    return { startDateTime, endDateTime };
  }

  async getCalendarStatus(userId) {
    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });

    if (!calendarConfig) {
      return {
        isConnected: false,
        isSyncEnabled: false,
      };
    }

    return {
      isConnected: true,
      isSyncEnabled: calendarConfig.is_sync_enabled,
      lastSyncAt: calendarConfig.last_sync_at,
      syncFilter: calendarConfig.sync_filter,
    };
  }

  async enableSync(userId, syncFilter = {}) {
    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (!calendarConfig) {
      throw new Error('Chưa kết nối Google Calendar.');
    }

    // Validate sync filter
    if (
      syncFilter.only_with_dates !== undefined &&
      typeof syncFilter.only_with_dates !== 'boolean'
    ) {
      throw new Error('only_with_dates phải là boolean');
    }
    if (
      syncFilter.include_completed !== undefined &&
      typeof syncFilter.include_completed !== 'boolean'
    ) {
      throw new Error('include_completed phải là boolean');
    }
    if (syncFilter.board_ids !== undefined) {
      if (!Array.isArray(syncFilter.board_ids)) {
        throw new Error('board_ids phải là mảng');
      }
      // Validate ObjectIds
      const mongoose = require('mongoose');
      for (const boardId of syncFilter.board_ids) {
        if (!mongoose.Types.ObjectId.isValid(boardId)) {
          throw new Error(`board_id không hợp lệ: ${boardId}`);
        }
      }
    }

    calendarConfig.is_sync_enabled = true;
    if (syncFilter.only_with_dates !== undefined) {
      calendarConfig.sync_filter.only_with_dates = syncFilter.only_with_dates;
    }
    if (syncFilter.include_completed !== undefined) {
      calendarConfig.sync_filter.include_completed = syncFilter.include_completed;
    }
    if (syncFilter.board_ids !== undefined) {
      calendarConfig.sync_filter.board_ids = syncFilter.board_ids;
    }

    await calendarConfig.save();
    logger.info(`Google Calendar: Đã bật sync cho user ${userId}`);
    return calendarConfig;
  }

  async disableSync(userId) {
    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (!calendarConfig) {
      throw new Error('Chưa kết nối Google Calendar.');
    }

    calendarConfig.is_sync_enabled = false;
    await calendarConfig.save();
    logger.info(`Google Calendar: Đã tắt sync cho user ${userId}`);
    return calendarConfig;
  }

  /**
   * Xóa tất cả events của user trong Google Calendar
   */
  async unsyncAll(userId) {
    const auth = await this._getAuthClient(userId);
    if (!auth) {
      throw new Error('Chưa kết nối Google Calendar hoặc sync đã bị tắt.');
    }

    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (!calendarConfig) {
      throw new Error('Chưa kết nối Google Calendar.');
    }

    const calendar = google.calendar({ version: 'v3', auth });
    let deletedCount = 0;
    let errorCount = 0;
    let nextPageToken = null;

    try {
      do {
        const response = await calendar.events.list({
          calendarId: calendarConfig.calendar_id,
          privateExtendedProperty: `board_id=*`,
          maxResults: 250,
          pageToken: nextPageToken,
        });

        const events = response.data.items || [];
        nextPageToken = response.data.nextPageToken;

        for (const event of events) {
          // Chỉ xóa events có task_id trong extended properties
          if (event.extendedProperties?.private?.task_id) {
            try {
              await calendar.events.delete({
                calendarId: calendarConfig.calendar_id,
                eventId: event.id,
              });
              deletedCount++;
            } catch (error) {
              errorCount++;
              logger.warn(`Google Calendar: Không thể xóa event ${event.id}: ${error.message}`);
            }
          }
        }
      } while (nextPageToken);

      logger.info(
        `Google Calendar: Đã xóa ${deletedCount} events cho user ${userId}, ${errorCount} lỗi`
      );
      return { deletedCount, errorCount };
    } catch (error) {
      logger.error(`Google Calendar: Lỗi khi unsync all cho user ${userId}: ${error.message}`);
      throw new Error(`Lỗi xóa events: ${error.message}`);
    }
  }

  /**
   * Cập nhật last_sync_at sau khi sync
   */
  async updateLastSyncAt(userId) {
    const calendarConfig = await UserGoogleCalendar.findOne({
      user_id: userId,
    });
    if (calendarConfig) {
      calendarConfig.last_sync_at = new Date();
      await calendarConfig.save();
    }
  }

  async delete(userId) {
    const result = await UserGoogleCalendar.deleteOne({ user_id: userId });
    logger.info(`Google Calendar: Đã xóa cấu hình Google Calendar cho user ${userId}`);
    return result;
  }
}

module.exports = new GoogleCalendarService();

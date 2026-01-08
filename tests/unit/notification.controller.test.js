// 📄 tests/unit/notification.controller.test.js - Notification Controller Unit Tests
// Mock notification service
jest.mock("../../services/notification.service", () => ({
  createNotification: jest.fn(),
  getNotificationsByUser: jest.fn(),
  markAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  deleteNotificationbyUser: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const notificationRouter = require("../../router/notification.routes");

const app = express();
app.use(express.json());
app.use("/api/notifications", notificationRouter);

describe("🔹 Notification Controller Unit Tests", () => {
  const notificationService = require("../../services/notification.service");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/notifications - Create Notification", () => {
    it("✅ should create notification successfully", async () => {
      const mockNotification = {
        _id: "notification123",
        user_id: "user123",
        title: "New Task Assigned",
        message: "You have been assigned to a new task",
        type: "task_assigned",
      };

      notificationService.createNotification.mockResolvedValue(mockNotification);

      const notificationData = {
        user_id: "user123",
        title: "New Task Assigned",
        message: "You have been assigned to a new task",
        type: "task_assigned",
      };

      const res = await request(app)
        .post("/api/notifications")
        .send(notificationData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("_id", "notification123");
      expect(res.body.data.title).toBe("New Task Assigned");
      expect(notificationService.createNotification).toHaveBeenCalledWith(notificationData);
    });

    it("❌ should return 400 for invalid data", async () => {
      notificationService.createNotification.mockRejectedValue(
        new Error("user_id is required")
      );

      const res = await request(app)
        .post("/api/notifications")
        .send({ title: "Test" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "user_id is required");
    });
  });

  describe("GET /api/notifications/:userId - Get Notifications By User", () => {
    it("✅ should return notifications for a user", async () => {
      const mockNotifications = [
        {
          _id: "notification1",
          user_id: "user123",
          title: "Notification 1",
          read: false,
        },
        {
          _id: "notification2",
          user_id: "user123",
          title: "Notification 2",
          read: true,
        },
      ];

      notificationService.getNotificationsByUser.mockResolvedValue(mockNotifications);

      const res = await request(app).get("/api/notifications/user123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(notificationService.getNotificationsByUser).toHaveBeenCalledWith("user123");
    });

    it("❌ should return 400 for service error", async () => {
      notificationService.getNotificationsByUser.mockRejectedValue(
        new Error("User không tồn tại")
      );

      const res = await request(app).get("/api/notifications/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("PUT /api/notifications/read/:id - Mark As Read", () => {
    it("✅ should mark notification as read successfully", async () => {
      const mockUpdated = {
        _id: "notification123",
        read: true,
        read_at: new Date(),
      };

      notificationService.markAsRead.mockResolvedValue(mockUpdated);

      const res = await request(app).put("/api/notifications/read/notification123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("read", true);
      expect(notificationService.markAsRead).toHaveBeenCalledWith("notification123");
    });

    it("❌ should return 400 for service error", async () => {
      notificationService.markAsRead.mockRejectedValue(
        new Error("Notification không tồn tại")
      );

      const res = await request(app).put("/api/notifications/read/nonexistent");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/notifications/:id - Delete Notification", () => {
    it("✅ should delete notification successfully", async () => {
      notificationService.deleteNotification.mockResolvedValue(true);

      const res = await request(app).delete("/api/notifications/notification123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã xóa thông báo");
      expect(notificationService.deleteNotification).toHaveBeenCalledWith("notification123");
    });

    it("❌ should return 400 for service error", async () => {
      notificationService.deleteNotification.mockRejectedValue(
        new Error("Notification không tồn tại")
      );

      const res = await request(app).delete("/api/notifications/nonexistent");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("DELETE /api/notifications/delete/:idUser - Delete Notifications By User", () => {
    it("✅ should delete all notifications for a user", async () => {
      notificationService.deleteNotificationbyUser.mockResolvedValue({ deletedCount: 5 });

      const res = await request(app).delete("/api/notifications/delete/user123");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Đã xóa thông báo");
      expect(notificationService.deleteNotificationbyUser).toHaveBeenCalledWith("user123");
    });

    it("❌ should return 400 for service error", async () => {
      notificationService.deleteNotificationbyUser.mockRejectedValue(
        new Error("User không tồn tại")
      );

      const res = await request(app).delete("/api/notifications/delete/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });
  });
});


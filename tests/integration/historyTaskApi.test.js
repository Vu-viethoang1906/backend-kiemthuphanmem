// 📄 tests/integration/historyTaskApi.test.js
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");

dotenv.config({ path: ".env.test" });

// Mock auth so integration test bypasses token issuer and sets req.user
jest.mock("../../middlewares/auth", () => ({
  authenticateAny: (req, res, next) => {
    req.user = {
      id: global.__MOCK_USER_ID__ || "68f04aa8a8d72d344f0b9151",
      roles: global.__MOCK_USER_ROLES__ || ["admin", "System_Manager", "VIEW_LOG_TASK"],
      email: "test_admin@example.com",
      username: "test_admin",
    };
    next();
  },
  authorizeAny: () => (req, res, next) => next(),
}));

const historyRouter = require("../../router/historyTask.router");

const usersModel = require("../../models/usersModel");
const BoardModel = require("../../models/board.model");
const TaskModel = require("../../models/task.model");
const HistoryModel = require("../../models/historyTask.model");

describe("🔹 Integration Tests: History Task API", () => {
  let app, server;
  const testUserId = "68f04aa8a8d72d344f0b9151";

  beforeAll(async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI must be set in .env.test");
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    app = express();
    app.use(express.json());
    app.use("/api/historyTasks", historyRouter);
    server = http.createServer(app);

    // Ensure test user exists
    const user = await usersModel.findById(testUserId);
    if (!user) {
      await usersModel.create({
        _id: new mongoose.Types.ObjectId(testUserId),
        email: "test_admin@example.com",
        username: "test_admin",
        full_name: "Test Admin",
      });
    }
  });

  afterEach(async () => {
    // clean DB
    await HistoryModel.deleteMany({});
    await TaskModel.deleteMany({});
    await BoardModel.deleteMany({});
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.close();
  });

  test("✅ POST /api/historyTasks - create history record", async () => {
    // create a board and task
    const board = await BoardModel.create({ title: "Board A", created_by: testUserId });
    const task = await TaskModel.create({ title: "Task 1", board_id: board._id, created_by: testUserId, column_id: new mongoose.Types.ObjectId() });

    const payload = { task_id: task._id.toString(), changed_by: testUserId, change_type: "created" };
    const res = await request(app).post("/api/historyTasks").send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.change_type).toBe("created");

    const found = await HistoryModel.findOne({ task_id: task._id }).lean();
    expect(found).toBeDefined();
    expect(found.change_type).toBe("created");
  });

  test("❌ POST /api/historyTasks - missing task_id returns 400", async () => {
    const payload = { changed_by: testUserId, change_type: "created" };
    const res = await request(app).post("/api/historyTasks").send(payload);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("✅ GET /api/historyTasks/:id - returns created history", async () => {
    const board = await BoardModel.create({ title: "Board B", created_by: testUserId });
    const task = await TaskModel.create({ title: "Task 2", board_id: board._id, created_by: testUserId, column_id: new mongoose.Types.ObjectId() });

    const history = await HistoryModel.create({ task_id: task._id, changed_by: testUserId, change_type: "changed" });

    const res = await request(app).get(`/api/historyTasks/${history._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body._id).toBe(history._id.toString());
  });

  test("❌ GET /api/historyTasks/:id - invalid id returns 400", async () => {
    const res = await request(app).get(`/api/historyTasks/invalid`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("✅ GET /api/historyTasks/ - list histories with filters (task_id)", async () => {
    const b = await BoardModel.create({ title: "Board C", created_by: testUserId });
    const t = await TaskModel.create({ title: "Task 3", board_id: b._id, created_by: testUserId, column_id: new mongoose.Types.ObjectId() });

    await HistoryModel.create({ task_id: t._id, changed_by: testUserId, change_type: "A" });
    await HistoryModel.create({ task_id: t._id, changed_by: testUserId, change_type: "B" });

    const res = await request(app).get("/api/historyTasks").query({ task_id: t._id.toString() });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test("✅ PUT /api/historyTasks/:id - update and 404 for not found", async () => {
    const b = await BoardModel.create({ title: "Board D", created_by: testUserId });
    const t = await TaskModel.create({ title: "Task 4", board_id: b._id, created_by: testUserId, column_id: new mongoose.Types.ObjectId() });
    const h = await HistoryModel.create({ task_id: t._id, changed_by: testUserId, change_type: "start" });

    const res = await request(app).put(`/api/historyTasks/${h._id}`).send({ change_type: "finish" });
    expect(res.status).toBe(200);
    expect(res.body.change_type).toBe("finish");

    const res2 = await request(app).put(`/api/historyTasks/507f1f77bcf86cd799439099`).send({ change_type: "x" });
    expect([400, 404].includes(res2.status)).toBeTruthy();
  });

  test("✅ DELETE /api/historyTasks/:id - delete and 404 for not found", async () => {
    const b = await BoardModel.create({ title: "Board E", created_by: testUserId });
    const t = await TaskModel.create({ title: "Task 5", board_id: b._id, created_by: testUserId, column_id: new mongoose.Types.ObjectId() });
    const h = await HistoryModel.create({ task_id: t._id, changed_by: testUserId, change_type: "done" });

    const res = await request(app).delete(`/api/historyTasks/${h._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");

    const res2 = await request(app).delete(`/api/historyTasks/507f1f77bcf86cd799439099`);
    expect([400, 404].includes(res2.status)).toBeTruthy();
  });

  test("✅ GET /api/historyTasks/task/:taskId/history - returns only this task's histories", async () => {
    const b = await BoardModel.create({ title: "Board F", created_by: testUserId });
    const t1 = await TaskModel.create({ title: "Task 6a", board_id: b._id, created_by: testUserId, column_id: new mongoose.Types.ObjectId() });
    const t2 = await TaskModel.create({ title: "Task 6b", board_id: b._id, created_by: testUserId, column_id: new mongoose.Types.ObjectId() });

    await HistoryModel.create({ task_id: t1._id, changed_by: testUserId, change_type: "A" });
    await HistoryModel.create({ task_id: t2._id, changed_by: testUserId, change_type: "B" });

    const res = await request(app).get(`/api/historyTasks/task/${t1._id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.every((r) => r.task_id._id.toString() === t1._id.toString())).toBeTruthy();
  });

  test("✅ GET /api/historyTasks/board/:boardId/history - returns board tasks history", async () => {
    const b = await BoardModel.create({ title: "Board G", created_by: testUserId });
    const t1 = await TaskModel.create({ title: "Task 7a", board_id: b._id, created_by: testUserId, column_id: new mongoose.Types.ObjectId() });
    const t2 = await TaskModel.create({ title: "Task 7b", board_id: b._id, created_by: testUserId, column_id: new mongoose.Types.ObjectId() });

    await HistoryModel.create({ task_id: t1._id, changed_by: testUserId, change_type: "A" });
    await HistoryModel.create({ task_id: t2._id, changed_by: testUserId, change_type: "B" });

    const res = await request(app).get(`/api/historyTasks/board/${b._id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(Array.isArray(res.body.data)).toBe(true);
    // ensure both tasks' history are included
    const taskIds = res.body.data.map((h) => h.task_id._id.toString());
    expect(taskIds).toContain(t1._id.toString());
    expect(taskIds).toContain(t2._id.toString());
  });

});

// 📄 tests/unit/slack.service.test.js - Slack Service Unit Tests

jest.mock("axios");
jest.mock("../../services/boardSlackConfig.service");

const axios = require("axios");
const boardSlackConfigService = require("../../services/boardSlackConfig.service");
const slackService = require("../../services/slack.service");

describe("🔹 Slack Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SLACK_WEBHOOK_URL;
  });

  describe("sendFormattedMessage", () => {
    it("✅ should post payload and return true when response.status === 200 using explicit webhookUrl", async () => {
      axios.post.mockResolvedValue({ status: 200 });
      const payload = { title: "Test", message: "Hello world" };
      const url = "https://hooks.slack.com/services/T/M/S";

      const res = await slackService.sendFormattedMessage(payload, url);

      expect(res).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(url, expect.any(Object), expect.objectContaining({ headers: { "Content-Type": "application/json" } }));
      // verify blocks structure
      const calledPayload = axios.post.mock.calls[0][1];
      expect(calledPayload.blocks[0].type).toBe('header');
      expect(calledPayload.blocks[1].type).toBe('section');
      expect(calledPayload.attachments[0].color).toBe('good');
    });

    it("✅ should use env var fallback when webhookUrl not passed", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T/X/Y";
      axios.post.mockResolvedValue({ status: 200 });

      const payload = { title: "Env test", message: "Hello env" };
      const res = await slackService.sendFormattedMessage(payload, null);

      expect(res).toBe(true);
      expect(axios.post).toHaveBeenCalled();
    });

    it("❌ should return false when no webhook available", async () => {
      axios.post.mockResolvedValue({ status: 200 });
      const res = await slackService.sendFormattedMessage({ title: 'x', message: 'y' }, null);
      expect(res).toBe(false);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("❌ should return false when axios returns non-200 status", async () => {
      axios.post.mockResolvedValue({ status: 500 });
      const res = await slackService.sendFormattedMessage({ title: 'x', message: 'y' }, 'https://hooks.slack.com/services/T/X/Y');
      expect(res).toBe(false);
    });

    it("❌ should return false when axios throws", async () => {
      axios.post.mockRejectedValue(new Error('network error'));
      const res = await slackService.sendFormattedMessage({ title: 'x', message: 'y' }, 'https://hooks.slack.com/services/T/X/Y');
      expect(res).toBe(false);
    });

    it("✅ should render fields when provided", async () => {
      axios.post.mockResolvedValue({ status: 200 });
      const payload = { title: 'Title', message: 'Message', fields: [{ title: 'A', value: '1' }, { title: 'B', value: '2' }] };
      await slackService.sendFormattedMessage(payload, 'https://hooks.slack.com/services/T/X/Y');
      const body = axios.post.mock.calls[0][1];
      // Check that fields section exists
      expect(body.blocks.some(b => b.type === 'section' && b.fields)).toBe(true);
      const fieldsBlock = body.blocks.find(b => b.fields);
      expect(fieldsBlock.fields).toHaveLength(2);
      expect(fieldsBlock.fields[0].text).toContain('*A:*');
    });

    it("✅ should default title to 'Thông báo từ KEN' and default color to 'good'", async () => {
      axios.post.mockResolvedValue({ status: 200 });
      await slackService.sendFormattedMessage({ message: 'm' }, 'https://hooks.slack.com/services/T/X/Y');
      const body = axios.post.mock.calls[0][1];
      expect(body.blocks[0].text.text).toBe('Thông báo từ KEN');
      expect(body.attachments[0].color).toBe('good');
    });
  });

  describe("sendWebhookMessage", () => {
    it("✅ returns true when webhook URL valid and axios returns 200", async () => {
      axios.post.mockResolvedValue({ status: 200 });
      const res = await slackService.sendWebhookMessage('hi', 'https://hooks.slack.com/services/T/X/Y');
      expect(res).toBe(true);
      expect(axios.post).toHaveBeenCalled();
    });

    it("❌ returns false when webhook url missing or invalid", async () => {
      expect(await slackService.sendWebhookMessage('m', '')).toBe(false);
      expect(await slackService.sendWebhookMessage('m', 'http://invalid.url')).toBe(false);
    });

    it("❌ throws informative error when axios returns non-200 status", async () => {
      axios.post.mockResolvedValue({ status: 400 });
      await expect(slackService.sendWebhookMessage('m', 'https://hooks.slack.com/services/T/X/Y'))
        .rejects.toThrow(/Slack trả về status code/);
    });

    it("❌ throws Slack API Error when error.response.data is a string", async () => {
      const err = new Error('err');
      err.response = { data: 'invalid_auth', status: 400 };
      axios.post.mockRejectedValue(err);
      await expect(slackService.sendWebhookMessage('m', 'https://hooks.slack.com/services/T/X/Y')).rejects.toThrow(/Slack API Error: invalid_auth/);
    });

    it("❌ throws Slack API Error when error.response.data.error present", async () => {
      const err = new Error('err');
      err.response = { data: { error: 'invalid_auth' }, status: 400 };
      axios.post.mockRejectedValue(err);
      await expect(slackService.sendWebhookMessage('m', 'https://hooks.slack.com/services/T/X/Y')).rejects.toThrow(/Slack API Error: invalid_auth/);
    });

    it("❌ throws network error when no response (error.request)", async () => {
      const err = new Error('err');
      err.request = {};
      axios.post.mockRejectedValue(err);
      await expect(slackService.sendWebhookMessage('m', 'https://hooks.slack.com/services/T/X/Y')).rejects.toThrow(/Không nhận được phản hồi/);
    });

    it("❌ throws generic send error when axios fails without response or request", async () => {
      const err = new Error('boom');
      axios.post.mockRejectedValue(err);
      await expect(slackService.sendWebhookMessage('m', 'https://hooks.slack.com/services/T/X/Y')).rejects.toThrow(/Lỗi khi gửi request: boom/);
    });
  });

  describe("sendTaskCreatedNotification", () => {
    const taskData = { title: 'T1', description: 'a'.repeat(120), assigned_to: true, assigned_to_name: 'Assignee', due_date: '2025-12-24T00:00:00.000Z' };
    const userData = { full_name: 'Creator' };
    const boardData = { title: 'Board 1' };

    it("✅ returns false when no boardId provided", async () => {
      const res = await slackService.sendTaskCreatedNotification(taskData, userData, boardData, null);
      expect(res).toBe(false);
    });

    it("❌ returns false when shouldNotify returns false", async () => {
      boardSlackConfigService.shouldNotify.mockResolvedValue(false);
      const res = await slackService.sendTaskCreatedNotification(taskData, userData, boardData, 'boardId');
      expect(boardSlackConfigService.shouldNotify).toHaveBeenCalledWith('boardId', 'task_created');
      expect(res).toBe(false);
    });

    it("✅ calls sendFormattedMessage when shouldNotify true and webhook returned", async () => {
      boardSlackConfigService.shouldNotify.mockResolvedValue(true);
      boardSlackConfigService.getBoardWebhookUrl.mockResolvedValue('https://hooks.slack.com/services/T/X/Y');
      // spy sendFormattedMessage to avoid calling axios twice
      const spy = jest.spyOn(slackService, 'sendFormattedMessage').mockResolvedValue(true);

      const res = await slackService.sendTaskCreatedNotification(taskData, userData, boardData, 'boardId');
      expect(spy).toHaveBeenCalled();
      expect(res).toBe(true);

      spy.mockRestore();
    });

    it("✅ message formatting includes truncated description and due date (vi-VN)", async () => {
      boardSlackConfigService.shouldNotify.mockResolvedValue(true);
      boardSlackConfigService.getBoardWebhookUrl.mockResolvedValue('https://hooks.slack.com/services/T/X/Y');

      const spy = jest.spyOn(slackService, 'sendFormattedMessage').mockImplementation(async (options, url) => {
        // Verify message contains '...' since description > 100
        expect(options.message.includes('...')).toBe(true);
        // verify due_date formatted in VN locale (check for year match or day-month format)
        expect(options.message.includes('2025')).toBe(true);
        return true;
      });

      await slackService.sendTaskCreatedNotification(taskData, userData, boardData, 'boardId');
      spy.mockRestore();
    });

    it("❌ returns false when getBoardWebhookUrl returns null", async () => {
      boardSlackConfigService.shouldNotify.mockResolvedValue(true);
      boardSlackConfigService.getBoardWebhookUrl.mockResolvedValue(null);
      const res = await slackService.sendTaskCreatedNotification(taskData, userData, boardData, 'boardId');
      expect(res).toBe(false);
    });

    it("❌ returns false when sendFormattedMessage returns false", async () => {
      boardSlackConfigService.shouldNotify.mockResolvedValue(true);
      boardSlackConfigService.getBoardWebhookUrl.mockResolvedValue('https://hooks.slack.com/services/T/X/Y');
      const spy = jest.spyOn(slackService, 'sendFormattedMessage').mockResolvedValue(false);
      const res = await slackService.sendTaskCreatedNotification(taskData, userData, boardData, 'boardId');
      expect(res).toBe(false);
      spy.mockRestore();
    });
  });

  describe("sendTaskAssignedNotification", () => {
    const task = { title: 'Task A', description: 'desc' };
    const assigned = { username: 'assignedUser' };
    const board = { title: 'Board' };
    const assigner = { full_name: 'Assigner' };

    it("✅ returns false when no boardId provided", async () => {
      expect(await slackService.sendTaskAssignedNotification(task, assigned, board, assigner, null)).toBe(false);
    });

    it("✅ calls sendFormattedMessage when shouldNotify true and webhook fetched", async () => {
      boardSlackConfigService.shouldNotify.mockResolvedValue(true);
      boardSlackConfigService.getBoardWebhookUrl.mockResolvedValue('https://hooks.slack.com/services/T/X/Y');
      const spy = jest.spyOn(slackService, 'sendFormattedMessage').mockResolvedValue(true);
      const res = await slackService.sendTaskAssignedNotification(task, assigned, board, assigner, 'boardId');
      expect(spy).toHaveBeenCalled();
      expect(res).toBe(true);
      spy.mockRestore();
    });
  });

  describe("sendTaskCompletedNotification", () => {
    it("✅ calls sendFormattedMessage when shouldNotify true and webhook fetched", async () => {
      const task = { title: 'Done' };
      const user = { username: 'doer' };
      const board = { title: 'Board' };
      boardSlackConfigService.shouldNotify.mockResolvedValue(true);
      boardSlackConfigService.getBoardWebhookUrl.mockResolvedValue('https://hooks.slack.com/services/T/X/Y');
      const spy = jest.spyOn(slackService, 'sendFormattedMessage').mockResolvedValue(true);
      const res = await slackService.sendTaskCompletedNotification(task, user, board, 'boardId');
      expect(spy).toHaveBeenCalled();
      expect(res).toBe(true);
      spy.mockRestore();
    });
  });

  describe("sendTaskMovedNotification", () => {
    it("✅ calls sendFormattedMessage when webhook returned", async () => {
      const task = { title: 'Move' };
      const user = { username: 'mover' };
      const board = { title: 'Board' };
      boardSlackConfigService.getBoardWebhookUrl.mockResolvedValue('https://hooks.slack.com/services/T/X/Y');
      const spy = jest.spyOn(slackService, 'sendFormattedMessage').mockResolvedValue(true);
      const res = await slackService.sendTaskMovedNotification(task, user, board, 'Backlog', 'In Progress', 'boardId');
      expect(spy).toHaveBeenCalled();
      expect(res).toBe(true);
      spy.mockRestore();
    });

    it("❌ returns false when no boardId provided", async () => {
      const task = { title: 'Move' };
      const user = { username: 'mover' };
      const board = { title: 'Board' };
      const res = await slackService.sendTaskMovedNotification(task, user, board, 'A','B', null);
      expect(res).toBe(false);
    });
  });
});

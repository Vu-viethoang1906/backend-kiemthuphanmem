// 📄 tests/unit/logoUlr.service.test.js - LogoUlr Service Unit Tests
jest.mock("../../repositories/logoUlr.repository");

const logoUlrService = require("../../services/logoUlr.service");
const logoUlrRepo = require("../../repositories/logoUlr.repository");

describe("🔹 LogoUlr Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createLogoUlr", () => {
    it("✅ should unset others and create if is_active=true", async () => {
      const payload = { url: "http://example.com/logo.png", is_active: true };
      const created = { _id: "id-1", ...payload };

      logoUlrRepo.unsetAllActive.mockResolvedValue({ modifiedCount: 1 });
      logoUlrRepo.create.mockResolvedValue(created);

      const res = await logoUlrService.createLogoUlr(payload);

      expect(logoUlrRepo.unsetAllActive).toHaveBeenCalledTimes(1);
      expect(logoUlrRepo.create).toHaveBeenCalledWith(payload);
      expect(res).toBe(created);
    });

    it("✅ should create without unsetting when is_active=false", async () => {
      const payload = { url: "http://example.com/logo2.png", is_active: false };
      const created = { _id: "id-2", ...payload };

      logoUlrRepo.create.mockResolvedValue(created);

      const res = await logoUlrService.createLogoUlr(payload);

      expect(logoUlrRepo.unsetAllActive).not.toHaveBeenCalled();
      expect(logoUlrRepo.create).toHaveBeenCalledWith(payload);
      expect(res).toBe(created);
    });

    it("❌ should propagate errors from repo.create", async () => {
      const payload = { url: "http://example.com/logo3.png", is_active: false };
      logoUlrRepo.create.mockRejectedValue(new Error("DB error"));

      await expect(logoUlrService.createLogoUlr(payload)).rejects.toThrow("DB error");
    });
  });

  describe("getLogoUlrById", () => {
    it("✅ should return logo by id", async () => {
      const id = "id-1";
      const found = { _id: id, url: "http://example.com/logo.png" };
      logoUlrRepo.findById.mockResolvedValue(found);

      const res = await logoUlrService.getLogoUlrById(id);
      expect(logoUlrRepo.findById).toHaveBeenCalledWith(id);
      expect(res).toBe(found);
    });

    it("❌ should propagate repo errors", async () => {
      logoUlrRepo.findById.mockRejectedValue(new Error("Not found"));
      await expect(logoUlrService.getLogoUlrById("id-404")).rejects.toThrow(
        "Not found"
      );
    });
  });

  describe("getAllLogoUlrs", () => {
    it("✅ should call repo.find with default sort when no options", async () => {
      const mockData = [{ _id: "1" }];
      logoUlrRepo.find.mockResolvedValue(mockData);

      const res = await logoUlrService.getAllLogoUlrs({}, {});
      expect(logoUlrRepo.find).toHaveBeenCalledWith({}, { sort: { createdAt: -1 } });
      expect(res).toBe(mockData);
    });

    it("✅ should pass custom options to repo.find", async () => {
      const mockData = [{ _id: "2" }];
      const options = { sort: { createdAt: 1 }, limit: 5, skip: 0 };
      logoUlrRepo.find.mockResolvedValue(mockData);

      const res = await logoUlrService.getAllLogoUlrs({}, options);
      expect(logoUlrRepo.find).toHaveBeenCalledWith({}, options);
      expect(res).toBe(mockData);
    });
  });

  describe("updateLogoUlr", () => {
    it("✅ should update and unset other active logos when is_active=true", async () => {
      const id = "upd-1";
      const data = { is_active: true };
      const updated = { _id: id, is_active: true };

      logoUlrRepo.update.mockResolvedValue(updated);
      logoUlrRepo.unsetAllActive.mockResolvedValue({ modifiedCount: 1 });

      const res = await logoUlrService.updateLogoUlr(id, data);

      expect(logoUlrRepo.update).toHaveBeenCalledWith(id, data);
      expect(logoUlrRepo.unsetAllActive).toHaveBeenCalledWith(id);
      expect(res).toBe(updated);
    });

    it("✅ should update without unsetting when is_active=false", async () => {
      const id = "upd-2";
      const data = { is_active: false };
      const updated = { _id: id, is_active: false };

      logoUlrRepo.update.mockResolvedValue(updated);

      const res = await logoUlrService.updateLogoUlr(id, data);

      expect(logoUlrRepo.update).toHaveBeenCalledWith(id, data);
      expect(logoUlrRepo.unsetAllActive).not.toHaveBeenCalled();
      expect(res).toBe(updated);
    });

    it("✅ should not call unsetAllActive when repo.update returns null", async () => {
      const id = "upd-null";
      const data = { is_active: true };
      logoUlrRepo.update.mockResolvedValue(null);

      const res = await logoUlrService.updateLogoUlr(id, data);

      expect(logoUlrRepo.update).toHaveBeenCalledWith(id, data);
      expect(logoUlrRepo.unsetAllActive).not.toHaveBeenCalled();
      expect(res).toBe(null);
    });

    it("❌ should propagate repo.update errors", async () => {
      logoUlrRepo.update.mockRejectedValue(new Error("Update failed"));
      await expect(logoUlrService.updateLogoUlr("id-err", { is_active: false })).rejects.toThrow("Update failed");
    });
  });

  describe("deleteLogoUlr", () => {
    it("✅ should call repo.delete and return result", async () => {
      const id = "del-1";
      const deleted = { _id: id, url: "http://example.com/del.png" };
      logoUlrRepo.delete.mockResolvedValue(deleted);

      const res = await logoUlrService.deleteLogoUlr(id);

      expect(logoUlrRepo.delete).toHaveBeenCalledWith(id);
      expect(res).toBe(deleted);
    });

    it("❌ should propagate repo.delete errors", async () => {
      logoUlrRepo.delete.mockRejectedValue(new Error("Delete error"));
      await expect(logoUlrService.deleteLogoUlr("id-err")).rejects.toThrow("Delete error");
    });
  });

  describe("getCurrentLogoUlr", () => {
    it("✅ should return active logo when found", async () => {
      const active = { _id: "active-1", is_active: true };
      logoUlrRepo.findOne.mockResolvedValueOnce(active);

      const res = await logoUlrService.getCurrentLogoUlr();
      expect(logoUlrRepo.findOne).toHaveBeenCalledWith({ is_active: true }, { sort: { createdAt: -1 } });
      expect(res).toBe(active);
    });

    it("✅ should return newest logo when no active", async () => {
      const newest = { _id: "new-1" };
      logoUlrRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(newest);

      const res = await logoUlrService.getCurrentLogoUlr();
      expect(logoUlrRepo.findOne).toHaveBeenNthCalledWith(1, { is_active: true }, { sort: { createdAt: -1 } });
      expect(logoUlrRepo.findOne).toHaveBeenNthCalledWith(2, {}, { sort: { createdAt: -1 } });
      expect(res).toBe(newest);
    });

    it("✅ should return null when no logo found", async () => {
      logoUlrRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const res = await logoUlrService.getCurrentLogoUlr();
      expect(res).toBeNull();
    });

    it("❌ should propagate repo.findOne error", async () => {
      logoUlrRepo.findOne.mockRejectedValue(new Error("DB error"));
      await expect(logoUlrService.getCurrentLogoUlr()).rejects.toThrow("DB error");
    });
  });
});

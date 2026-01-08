const { exec } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const { promisify } = require("util");
const execAsync = promisify(exec);
require("dotenv").config();
const { sendSlackMessage } = require("../config/slackNotify");
class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, "..", "backups");
    this.maxBackups = parseInt(process.env.MAX_BACKUPS || "30"); // Giữ tối đa 30 backup
  }

  /**
   * Tạo thư mục backup nếu chưa tồn tại
   */
  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  /**
   * Parse MongoDB URI để lấy thông tin connection
   */
  parseMongoURI(mongoURI) {
    try {
      // Xử lý mongodb+srv:// format
      let uri = mongoURI;
      if (uri.startsWith("mongodb+srv://")) {
        // Với mongodb+srv, sử dụng trực tiếp URI
        const url = new URL(uri.replace("mongodb+srv://", "https://"));
        const dbName = url.pathname.replace("/", "") || "test";
        return {
          uri: mongoURI, // Trả về URI gốc để dùng với --uri
          database: dbName,
          isSrv: true,
        };
      } else {
        // Xử lý mongodb:// format
        const url = new URL(uri.replace("mongodb://", "http://"));
        const dbName = url.pathname.replace("/", "") || "test";
        return {
          host: url.hostname,
          port: url.port || 27017,
          database: dbName,
          username: url.username || null,
          password: url.password || null,
          authSource: url.searchParams.get("authSource") || "admin",
          replicaSet: url.searchParams.get("replicaSet") || null,
          isSrv: false,
        };
      }
    } catch (error) {
      throw new Error(`Invalid MongoDB URI: ${error.message}`);
    }
  }

  /**
   * Tạo backup MongoDB
   */
  async createBackup() {
    try {
      await this.ensureBackupDir();

      const mongoURI = process.env.MONGO_URI;
      if (!mongoURI) throw new Error("MONGO_URI chưa được định nghĩa");

      const mongoInfo = this.parseMongoURI(mongoURI);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      await fs.mkdir(backupPath, { recursive: true });

      let mongodumpCmd = "mongodump";
      if (
        mongoInfo.isSrv ||
        mongoInfo.username ||
        mongoInfo.password ||
        mongoInfo.replicaSet
      ) {
        mongodumpCmd += ` --uri="${mongoURI}"`;
      } else {
        mongodumpCmd += ` --host=${mongoInfo.host}`;
        if (mongoInfo.port) mongodumpCmd += `:${mongoInfo.port}`;
        mongodumpCmd += ` --db=${mongoInfo.database}`;
      }
      mongodumpCmd += ` --out="${backupPath}"`;
      const { stdout, stderr } = await execAsync(mongodumpCmd, {
        maxBuffer: 1024 * 1024 * 10,
      });

      if (stderr && !stderr.includes("writing"))
        console.warn("⚠️ Backup warning:", stderr);

      const backupInfo = {
        name: backupName,
        path: backupPath,
        createdAt: new Date(),
        size: await this.getBackupSize(backupPath),
      };

      const metadataPath = path.join(backupPath, "metadata.json");
      await fs.writeFile(metadataPath, JSON.stringify(backupInfo, null, 2));

      // ✅ Kiểm tra dữ liệu trong backup
      const dbFolders = await fs.readdir(backupPath);
      let hasData = false;
      for (const dbFolder of dbFolders) {
        const files = await fs.readdir(path.join(backupPath, dbFolder));
        if (files.some((f) => f.endsWith(".bson"))) {
          hasData = true;
          break;
        }
      }
      if (!hasData) {
        console.warn("⚠️ Backup có vẻ rỗng, hãy kiểm tra MongoDB!");
        await sendSlackMessage(
          `❌ Backup ${backupName} đã tạo nhưng không có dữ liệu!`
        );
      } else {
        await sendSlackMessage(
          `🎉 Backup ${backupName} thành công! Kích thước: ${this.formatBytes(
            backupInfo.size
          )}`
        );
      }

      await this.cleanOldBackups();

      return backupInfo;
    } catch (error) {
      console.error("❌ Lỗi khi tạo backup:", error);
      await sendSlackMessage(`🔥 Backup thất bại: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lấy danh sách tất cả backup
   */
  async listBackups() {
    try {
      await this.ensureBackupDir();
      const entries = await fs.readdir(this.backupDir, { withFileTypes: true });
      const backups = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith("backup-")) {
          const backupPath = path.join(this.backupDir, entry.name);
          const metadataPath = path.join(backupPath, "metadata.json");

          try {
            const metadataContent = await fs.readFile(metadataPath, "utf-8");
            const metadata = JSON.parse(metadataContent);
            metadata.size = await this.getBackupSize(backupPath);
            backups.push(metadata);
          } catch {
            // Nếu không có metadata, tạo từ thông tin thư mục
            const stats = await fs.stat(backupPath);
            backups.push({
              name: entry.name,
              path: backupPath,
              createdAt: stats.birthtime,
              size: await this.getBackupSize(backupPath),
            });
          }
        }
      }

      // Sắp xếp theo thời gian tạo (mới nhất trước)
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return backups;
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh sách backup:", error);
      throw error;
    }
  }

  /**
   * Xóa backup
   */
  async deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);

      // Kiểm tra backup có tồn tại không
      try {
        await fs.access(backupPath);
      } catch {
        throw new Error(`Backup ${backupName} không tồn tại`);
      }

      // Xóa thư mục backup
      await fs.rm(backupPath, { recursive: true, force: true });
      return { message: `Đã xóa backup ${backupName} thành công` };
    } catch (error) {
      console.error("❌ Lỗi khi xóa backup:", error);
      throw error;
    }
  }

  /**
   * Restore backup
   */
  async restoreBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);

      // Kiểm tra backup có tồn tại không
      try {
        await fs.access(backupPath);
      } catch {
        throw new Error(`Backup ${backupName} không tồn tại`);
      }

      const mongoURI = process.env.MONGO_URI;
      if (!mongoURI) {
        throw new Error("MONGO_URI is not defined in environment variables");
      }

      const mongoInfo = this.parseMongoURI(mongoURI);

      // Tìm thư mục database trong backup
      const dbBackupPath = path.join(backupPath, mongoInfo.database);

      // Kiểm tra thư mục database có tồn tại không
      try {
        await fs.access(dbBackupPath);
      } catch {
        throw new Error(`Không tìm thấy dữ liệu database trong backup`);
      }

      // Xây dựng lệnh mongorestore
      let mongorestoreCmd = "mongorestore";

      // Nếu là mongodb+srv, có auth, hoặc replicaSet → dùng --uri
      if (
        mongoInfo.isSrv ||
        mongoInfo.username ||
        mongoInfo.password ||
        mongoInfo.replicaSet
      ) {
        mongorestoreCmd += ` --uri="${mongoURI}"`;
      } else {
        // Chỉ dùng host/port/db nếu không có auth hoặc replicaSet
        mongorestoreCmd += ` --host=${mongoInfo.host}`;
        if (mongoInfo.port) mongorestoreCmd += `:${mongoInfo.port}`;
        mongorestoreCmd += ` --db=${mongoInfo.database}`;
      }

      mongorestoreCmd += ` --drop`; // Xóa dữ liệu cũ trước khi restore
      mongorestoreCmd += ` "${dbBackupPath}"`; // Chỉ định đường dẫn đến thư mục database

      // Thực thi restore
      const { stdout, stderr } = await execAsync(mongorestoreCmd, {
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      if (stderr && !stderr.includes("restoring")) {
        console.warn("⚠️ Restore warning:", stderr);
      }
      return { message: `Restore backup ${backupName} thành công` };
    } catch (error) {
      console.error("❌ Lỗi khi restore backup:", error);
      throw error;
    }
  }

  async getBackupSize(backupPath) {
    try {
      let totalSize = 0;
      const files = await this.getAllFiles(backupPath);

      for (const file of files) {
        const stats = await fs.stat(file);
        totalSize += stats.size;
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Lấy tất cả files trong thư mục (recursive)
   */
  async getAllFiles(dirPath, arrayOfFiles = []) {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        arrayOfFiles = await this.getAllFiles(filePath, arrayOfFiles);
      } else {
        arrayOfFiles.push(filePath);
      }
    }

    return arrayOfFiles;
  }

  /**
   * Format bytes thành human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Xóa các backup cũ nếu vượt quá giới hạn
   */
  async cleanOldBackups() {
    try {
      const backups = await this.listBackups();

      if (backups.length > this.maxBackups) {
        const backupsToDelete = backups.slice(this.maxBackups);

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.name);
        }
      }
    } catch (error) {
    }
  }
}

module.exports = new BackupService();

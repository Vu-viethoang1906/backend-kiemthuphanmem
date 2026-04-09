const { readFileData } = require("../utils/fileReader");
const { mapNamesToIds } = require("../utils/mapper");
const Task = require("../models/task.model");
const Board = require("../models/board.model");
const path = require("path");

exports.importTasks = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Chưa có file upload!" });
    }

    const filePath = req.file.path;

    const data = await readFileData(filePath);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "File không có dữ liệu hợp lệ!" });
    }

    if (req.query.preview === "true") {
      return res.json({
        message: "Xem trước dữ liệu gốc thành công",
        preview: data.slice(0, 20),
        totalRows: data.length,
      });
    }

    // 🔹 Lấy userId từ token (middleware đã decode trước đó)
    const userIdFromToken = req.user?.id || req.user?._id;

    if (!userIdFromToken) {
      return res
        .status(401)
        .json({ message: "Không xác định được người dùng từ token" });
    }

    const createNewBoardMode = String(req.query.createNewBoard || "false") === "true";
    const requestedBoardName = String(req.query.boardName || "").trim();
    const fileBaseName = path.basename(
      req.file.originalname || req.file.filename || "Imported Board",
      path.extname(req.file.originalname || req.file.filename || ""),
    );
    const baseBoardName = (requestedBoardName || fileBaseName || "Imported Board")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const importSuffix = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const importBoardName = `${baseBoardName} - import-${importSuffix}`.slice(0, 120);

    const preparedData = createNewBoardMode
      ? data.map((row) => ({
          ...row,
          BoardName: importBoardName,
          ColumnName:
            String(
              row?.ColumnName ||
                row?.column_name ||
                row?.column ||
                row?.Column ||
                "",
            ).trim() || "To Do",
        }))
      : data;

    const mappedTasks = await Promise.all(
      preparedData.map((task) => mapNamesToIds(task, userIdFromToken))
    );

    const validTasks = mappedTasks.filter((task) => task !== null);
    const invalidCount = mappedTasks.length - validTasks.length;

    if (req.query.previewMapped === "true") {
      return res.json({
        message: "Xem trước dữ liệu sau khi map thành công",
        mappedPreview: validTasks.slice(0, 20),
        totalMappedRows: validTasks.length,
        skippedRows: invalidCount,
      });
    }

    if (validTasks.length === 0) {
      return res
        .status(400)
        .json({ message: "Không có dòng hợp lệ để import!" });
    }

    await Task.insertMany(validTasks);

    const importedBoardIds = Array.from(
      new Set(
        validTasks
          .map((task) => task?.board_id?.toString?.() || String(task?.board_id || ""))
          .filter(Boolean),
      ),
    );

    const importedBoards = importedBoardIds.length
      ? await Board.find({ _id: { $in: importedBoardIds } })
          .select("_id title")
          .lean()
      : [];

    res.json({
      message: "Import thành công!",
      count: validTasks.length,
      skippedRows: invalidCount,
      importedBoards: importedBoards.map((board) => ({
        id: board._id.toString(),
        title: board.title || "",
      })),
    });
  } catch (err) {
    res.status(500).json({
      message: "Import thất bại!",
      error: err.message,
    });
  }
};

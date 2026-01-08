const mongoose = require("mongoose");
const { Schema } = mongoose;

const HistoryTaskSchema = new Schema(
  {
    task_id: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    changed_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    change_type: { type: String, required: true },
  },
  { collection: "HistoryTasks", timestamps: true }
);

module.exports = mongoose.model("HistoryTask", HistoryTaskSchema);

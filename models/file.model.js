const mongoose = require("mongoose");
const { Schema } = mongoose;

const FileSchema = new Schema(
  {
    original_name: {
      type: String,
      required: true,
      maxlength: 500,
    },
    stored_name: {
      type: String,
      required: true,
    },
    stored_path: {
      type: String,
      required: true,
    },
    file_type: {
      type: String,
      enum: ["task_attachment", "comment_attachment", "import", "avatar"],
      required: true,
    },
    related_type: {
      type: String,
      enum: ["task", "comment", "board", "user", null],
      default: null,
    },
    related_id: {
      type: Schema.Types.ObjectId,
      refPath: "related_type",
      default: null,
    },
    uploaded_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    mime_type: {
      type: String,
      required: true,
    },
    download_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_public: {
      type: Boolean,
      default: false,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "Files",
    timestamps: { createdAt: "uploaded_at", updatedAt: "updated_at" },
  }
);

// Indexes
FileSchema.index({ file_type: 1 });
FileSchema.index({ related_type: 1, related_id: 1 });
FileSchema.index({ uploaded_by: 1 });
FileSchema.index({ deleted_at: 1 });
FileSchema.index({ uploaded_at: -1 });

// Middleware to filter soft-deleted records
FileSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty("deleted_at") && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model("File", FileSchema);


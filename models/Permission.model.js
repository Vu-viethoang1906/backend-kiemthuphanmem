const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    typePermission: { type: String, required: true },
  },
  {
    collection: "Permissions",
    timestamps: true,
  }
);

module.exports = mongoose.model("Permission", PermissionSchema);

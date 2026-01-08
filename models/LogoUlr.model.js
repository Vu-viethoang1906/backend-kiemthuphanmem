const mongoose = require("mongoose");
const { Schema } = mongoose;

const LogoUlrSchema = new Schema(
  {
    url: { type: String, required: true },
    description: { type: String },
    // Logo đang được sử dụng trong hệ thống
    is_active: { type: Boolean, default: false, index: true },
  },
  { collection: "LogoUlrs", timestamps: true }
);

module.exports = mongoose.model("LogoUlr", LogoUlrSchema);

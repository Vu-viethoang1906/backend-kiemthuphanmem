const mongoose = require("mongoose");
const { Schema } = mongoose;

const BoardMemberSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // KHÔNG UNIQUE

    description: { type: String, required: true, unique: true, index: true },
    revoked: { type: Boolean, default: false },
  },
  { collection: "api_keys", timestamps: true }
);

module.exports = mongoose.model("ApiKey", BoardMemberSchema);

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    username: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
    },

    password_hash: {
      type: String,
    },

    full_name: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    avatar_url: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending"],
      default: "active",
    },

    // Timestamps
    created_at: {
      type: Date,
      default: Date.now,
    },

    updated_at: {
      type: Date,
      default: Date.now,
    },

    typeAccount: {
      type: String,
      enum: ["Local", "SSO"],
    },

    idSSO: {
      type: String,
    },

    center_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      default: null,
    },

    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "users",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

UserSchema.index({ status: 1 });
UserSchema.index({ deleted_at: 1 });

UserSchema.pre(/^find/, function (next) {
  const query = this.getQuery();
  if (!query.hasOwnProperty("deleted_at") && !query.$or) {
    this.where({ deleted_at: null });
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);

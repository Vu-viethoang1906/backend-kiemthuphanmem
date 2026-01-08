const mongoose = require('mongoose');
const { Schema } = mongoose;

const SidebarItemSchema = new Schema(
  {
    // Menu type: 'main', 'personal', or 'admin'
    menuType: {
      type: String,
      required: true,
      enum: ['main', 'personal', 'admin'],
      index: true,
    },
    // Display name
    name: { type: String, required: true },
    // Icon filename (without extension)
    icon: { type: String, required: true },
    // Uploaded icon URL (optional)
    iconUrl: { type: String },
    // Navigation path
    path: { type: String, required: true },
    // Optional badge count
    badge: { type: Number },
    // Required permissions (array of permission IDs)
    requiredPermissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    // Display order
    order: { type: Number, default: 0 },
    // Whether this item is active/visible
    isActive: { type: Boolean, default: true },
    // For admin menu items, whether to show in expanded state by default
    isExpanded: { type: Boolean, default: false },

    key: { type: String, unique: true, sparse: true },
  },
  { collection: 'SidebarItems', timestamps: true }
);

// Compound index for menu type and order
SidebarItemSchema.index({ menuType: 1, order: 1 });

module.exports = mongoose.model('SidebarItem', SidebarItemSchema);

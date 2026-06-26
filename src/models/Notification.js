import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';
import outletPlugin from '../utils/outletPlugin.js';

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['expired_stock', 'low_stock', 'ingredient_request'], required: true },
    message: { type: String, required: true },
    roles: { type: [String], default: ['owner', 'pos_manager'] },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.plugin(tenantPlugin);
notificationSchema.plugin(outletPlugin);

export default mongoose.model('Notification', notificationSchema);

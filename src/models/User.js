import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['owner', 'pos_manager', 'kitchen_staff'],
      default: 'pos_manager',
    },
    mobile: String,
    // Owner-controlled override; falls back to the business's
    // settings.cashierCanRefundByDefault when null.
    permissions: {
      canRefund: { type: Boolean, default: null },
      canMarkProductUnavailable: { type: Boolean, default: true },
    },
    active: { type: Boolean, default: true },
    refreshToken: String,
  },
  { timestamps: true }
);

userSchema.plugin(tenantPlugin);
userSchema.index({ businessId: 1, email: 1 }, { unique: true });

export default mongoose.model('User', userSchema);

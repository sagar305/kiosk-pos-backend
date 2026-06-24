import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'value'], required: true },
    value: { type: Number, required: true },
    minOrderValue: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiresAt: Date,
  },
  { timestamps: true }
);

couponSchema.plugin(tenantPlugin);
couponSchema.index({ businessId: 1, code: 1 }, { unique: true });

export default mongoose.model('Coupon', couponSchema);

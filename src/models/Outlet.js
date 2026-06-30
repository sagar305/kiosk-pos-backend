import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';

const outletSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Short code shown on tokens/receipts and used in the public Ready Pickup
    // screen URL (?outletId=01), so it should be human-friendly.
    code: { type: String, required: true, trim: true },
    address: String,
    active: { type: Boolean, default: true },
    settings: {
      // When unset, the business-level language/currency setting applies.
      language: { type: String, default: null },
      currency: { type: String, default: null },
    },
  },
  { timestamps: true }
);

outletSchema.plugin(tenantPlugin);
outletSchema.index({ businessId: 1, code: 1 }, { unique: true });

export default mongoose.model('Outlet', outletSchema);

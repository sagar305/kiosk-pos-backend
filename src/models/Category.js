import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';
import outletPlugin from '../utils/outletPlugin.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.plugin(tenantPlugin);
categorySchema.plugin(outletPlugin);
categorySchema.index({ businessId: 1, outlet: 1, name: 1 }, { unique: true });

export default mongoose.model('Category', categorySchema);
